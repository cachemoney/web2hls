import { logger } from '../utils/logger';

export interface VideoEncoderWrapperConfig {
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
  
  // H.264 fallback chain: High -> Main -> Baseline
  // avc1.640028: High Profile, Level 4.0
  // avc1.4d401f: Main Profile, Level 3.1
  // avc1.42e01f: Baseline Profile, Level 3.1
  private readonly profiles = [
    'avc1.640028',
    'avc1.4d401f',
    'avc1.42e01f'
  ];

  constructor(config: VideoEncoderWrapperConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    await this.tryConfigure();
  }

  private async tryConfigure(): Promise<void> {
    if (this.currentProfileIndex >= this.profiles.length) {
      throw new Error('No supported H.264 profile found');
    }

    const codec = this.profiles[this.currentProfileIndex];
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
    if (!this.encoder || this.encoder.state !== 'configured') {
      return;
    }

    try {
      this.encoder.encode(frame, { keyFrame });
    } catch (e) {
      logger.error('VideoEncoder encode error:', e);
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
  }
}
