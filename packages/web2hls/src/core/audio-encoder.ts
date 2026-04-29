import { logger } from '../utils/logger';

export interface AudioEncoderWrapperConfig {
  sampleRate: number;
  numberOfChannels: number;
  bitrate: number;
  codec?: string;
  onOutput: (chunk: EncodedAudioChunk, metadata?: EncodedAudioChunkMetadata) => void;
  onError: (error: Error) => void;
  onPressureChange?: (state: 'nominal' | 'fair' | 'serious' | 'critical') => void;
}

export class AudioEncoderWrapper {
  private encoder: AudioEncoder | null = null;
  private config: AudioEncoderWrapperConfig;
  private pressureObserver: any = null;

  constructor(config: AudioEncoderWrapperConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    const codec = this.config.codec || 'mp4a.40.2'; // AAC-LC
    const config: AudioEncoderConfig = {
      codec,
      sampleRate: this.config.sampleRate,
      numberOfChannels: this.config.numberOfChannels,
      bitrate: this.config.bitrate,
    };

    try {
      const support = await AudioEncoder.isConfigSupported(config);
      if (!support.supported) {
        throw new Error(`Audio codec ${codec} not supported`);
      }

      this.encoder = new AudioEncoder({
        output: this.config.onOutput,
        error: (e) => {
          logger.error('AudioEncoder error:', e);
          this.config.onError(e);
        }
      });

      this.encoder.configure(config);
      logger.info(`AudioEncoder configured with codec: ${codec}`);

      this.setupPressureMonitoring();
    } catch (e) {
      logger.error('Failed to configure AudioEncoder:', e);
      throw e;
    }
  }

  private setupPressureMonitoring(): void {
    // Attempt to use Compute Pressure API if available
    if ('PressureObserver' in globalThis) {
      try {
        this.pressureObserver = new (globalThis as any).PressureObserver(
          (records: any[]) => {
            const lastRecord = records[records.length - 1];
            logger.info(`Compute pressure changed: ${lastRecord.state}`);
            this.config.onPressureChange?.(lastRecord.state);
          },
          { sampleInterval: 2000 }
        );
        this.pressureObserver.observe('cpu');
      } catch (e) {
        logger.warn('Failed to initialize PressureObserver:', e);
      }
    } else {
      logger.warn('Compute Pressure API not supported in this environment');
    }
  }

  encode(data: AudioData): void {
    if (!this.encoder || this.encoder.state !== 'configured') {
      data.close();
      return;
    }

    try {
      this.encoder.encode(data);
    } catch (e) {
      logger.error('AudioEncoder encode error:', e);
      data.close();
    }
  }

  async flush(): Promise<void> {
    if (this.encoder && this.encoder.state === 'configured') {
      await this.encoder.flush();
    }
  }

  close(): void {
    if (this.encoder) {
      this.encoder.close();
      this.encoder = null;
    }
    if (this.pressureObserver) {
      this.pressureObserver.disconnect();
      this.pressureObserver = null;
    }
  }
}
