import { MonotonicClock } from '../utils/clock';
import { logger } from '../utils/logger';

export interface CanvasCaptureConfig {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  fps: number;
  clock: MonotonicClock;
  onFrame: (frame: VideoFrame) => void;
  maxQueueSize?: number;
}

export interface CaptureStats {
  captureFps: number;
  droppedFrames: number;
}

export class CanvasCapture {
  private config: CanvasCaptureConfig;
  private animationFrameId: number | null = null;
  private frameIntervalUs: number;
  private lastFrameTimestamp = -Infinity;
  private encoderQueueSize = 0;
  private stopped = false;

  // Stats
  private droppedFrames = 0;
  private frameCount = 0;
  private lastStatsTimestamp = 0;
  private currentFps = 0;

  constructor(config: CanvasCaptureConfig) {
    this.config = config;
    this.frameIntervalUs = 1_000_000 / config.fps;
    this.lastStatsTimestamp = 0;
  }

  setEncoderQueueSize(size: number): void {
    this.encoderQueueSize = size;
  }

  start(): void {
    this.stopped = false;
    this.lastFrameTimestamp = -Infinity;
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.lastStatsTimestamp = this.config.clock.now();
    this.loop();
  }

  stop(): void {
    this.stopped = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  getStats(): CaptureStats {
    this.updateFps();
    return {
      captureFps: this.currentFps,
      droppedFrames: this.droppedFrames,
    };
  }

  private updateFps(): void {
    const now = this.config.clock.now();
    const elapsedUs = now - this.lastStatsTimestamp;
    if (elapsedUs >= 1_000_000) { // Update every second
      this.currentFps = (this.frameCount * 1_000_000) / elapsedUs;
      this.frameCount = 0;
      this.lastStatsTimestamp = now;
    }
  }

  private loop = (): void => {
    if (this.stopped) return;

    const now = this.config.clock.now();
    
    // Check if it's time for a new frame
    if (now - this.lastFrameTimestamp >= this.frameIntervalUs) {
      const maxQueue = this.config.maxQueueSize ?? 2;
      
      if (this.encoderQueueSize > maxQueue) {
        this.droppedFrames++;
      } else {
        if (this.frameCount % 100 === 0) {
          logger.debug(`CanvasCapture: Captured ${this.frameCount} frames`);
        }
        const frame = new VideoFrame(this.config.canvas, { timestamp: now });
        this.lastFrameTimestamp = now;
        this.frameCount++;
        this.config.onFrame(frame);
      }
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
