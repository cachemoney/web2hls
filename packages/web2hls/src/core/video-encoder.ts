import { logger } from '../utils/logger';

export interface VideoEncoderWrapperConfig {
  codec?: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  onOutput: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) => void;
  onError: (error: Error) => void;
}

export class VideoEncoderWrapper {
  private encoder: VideoEncoder | null = null;
  private config: VideoEncoderWrapperConfig;
  private currentProfileIndex = 0;
  private isMock = false;
  
  // H.264 fallback chain: High -> Main -> Baseline
  private readonly profiles = [
    'avc1.640028',
    'avc1.4d401f',
    'avc1.42e01f'
  ];

  constructor(config: VideoEncoderWrapperConfig) {
    this.config = config;
    if (config.codec === 'mock') {
      this.isMock = true;
      logger.info('VideoEncoderWrapper: Using MOCK encoder');
    }
  }

  async start(): Promise<void> {
    if (this.isMock) return;
    await this.tryConfigure();
  }

  private async tryConfigure(): Promise<void> {
    if (this.currentProfileIndex >= this.profiles.length) {
      // If all else fails and we are in a test-like environment (or just to be safe), 
      // we could fallback to mock here, but let's stick to explicit for now.
      throw new Error('No supported H.264 profile found');
    }

    const codec = this.config.codec || this.profiles[this.currentProfileIndex];
    const config: VideoEncoderConfig = {
      codec,
      width: this.config.width,
      height: this.config.height,
      bitrate: this.config.bitrate,
      framerate: this.config.fps,
      latencyMode: 'realtime',
      hardwareAcceleration: 'prefer-hardware',
      avc: { format: 'annexb' } // Annex B is preferred for MPEG-TS
    };

    try {
      const support = await VideoEncoder.isConfigSupported(config);
      if (!support.supported) {
        logger.warn(`Codec ${codec} not supported, trying next...`);
        this.currentProfileIndex++;
        return this.tryConfigure();
      }

      this.encoder = new VideoEncoder({
        output: this.config.onOutput,
        error: (e) => {
          logger.error('VideoEncoder error:', e);
          this.config.onError(e);
        }
      });

      this.encoder.configure(config);
      logger.info(`VideoEncoder configured with codec: ${codec}`);
    } catch (e) {
      logger.warn(`Failed to configure ${codec}:`, e);
      this.currentProfileIndex++;
      return this.tryConfigure();
    }
  }

  encode(frame: VideoFrame, keyFrame = false): void {
    if (this.isMock) {
      // In mock mode, we just emit a dummy chunk periodically (every 10th frame is a keyframe)
      // or whenever requested.
      const isKey = keyFrame || (frame.timestamp % 1000000 < 100000); // Simple heuristic
      
      // We need to wait a bit to simulate encoding time if we wanted to be very realistic,
      // but for E2E tests, immediate is usually fine.
      
      const chunk = {
        type: (isKey ? 'key' : 'delta') as EncodedVideoChunkType,
        timestamp: frame.timestamp,
        duration: frame.duration || 0,
        byteLength: 100,
        copyTo: (dest: Uint8Array) => {
          dest.fill(0);
        }
      } as EncodedVideoChunk;

      this.config.onOutput(chunk);
      frame.close();
      return;
    }

    if (!this.encoder || this.encoder.state !== 'configured') {
      frame.close();
      return;
    }

    try {
      this.encoder.encode(frame, { keyFrame });
    } catch (e) {
      logger.error('VideoEncoder encode error:', e);
      frame.close();
    }
  }

  async flush(): Promise<void> {
    if (this.isMock) return;
    if (this.encoder && this.encoder.state === 'configured') {
      await this.encoder.flush();
    }
  }

  close(): void {
    if (this.isMock) return;
    if (this.encoder) {
      this.encoder.close();
      this.encoder = null;
    }
  }
}
