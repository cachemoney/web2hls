import { HLSSegment, HLSUploaderConfig } from '../types';
import { logger } from '../utils/logger';

export class HLSUploader {
  private queue: HLSSegment[] = [];
  private uploading = false;
  private config: HLSUploaderConfig;

  constructor(config: HLSUploaderConfig) {
    this.config = config;
  }

  enqueue(segment: HLSSegment) {
    this.queue.push(segment);
    this.processQueue();
  }

  private async processQueue() {
    if (this.uploading || this.queue.length === 0) return;
    this.uploading = true;

    try {
      while (this.queue.length > 0) {
        const segment = this.queue.shift()!;
        await this.uploadSegment(segment);
      }
    } catch (e) {
      logger.error('Sequential upload halted due to error', e);
      // In 6.1 we don't have retries yet, so we just stop the loop for this queue batch.
    } finally {
      this.uploading = false;
    }
  }

  private async uploadSegment(segment: HLSSegment) {
    const baseUrl = this.config.ingestionUrl.endsWith('/') 
      ? this.config.ingestionUrl 
      : `${this.config.ingestionUrl}/`;
    
    const url = `${baseUrl}${segment.index}.ts`;
    const maxRetries = this.config.retryAttempts ?? 3;
    const baseBackoff = this.config.retryBackoffMs ?? 1000;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        logger.debug(`Uploading segment ${segment.index} to ${url} (${segment.data.byteLength} bytes) (attempt ${i + 1})`);

        const response = await fetch(url, {
          method: 'PUT',
          body: segment.data,
          headers: {
            'Content-Type': 'video/mp2t',
          },
        });

        if (!response.ok) {
          throw new Error(`Upload failed for segment ${segment.index}: ${response.statusText} (${response.status})`);
        }

        logger.info(`Successfully uploaded segment ${segment.index}`);
        return;
      } catch (e) {
        if (i === maxRetries) {
          throw e;
        }
        const delay = baseBackoff * Math.pow(2, i);
        logger.warn(`Failed to upload segment ${segment.index}, retrying in ${delay}ms...`, e);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
