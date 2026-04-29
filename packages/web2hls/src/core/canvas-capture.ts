import { MonotonicClock } from './clock';

export interface CanvasCaptureConfig {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  fps: number;
  clock: MonotonicClock;
  onFrame: (frame: VideoFrame) => void;
  maxQueueSize?: number;
}

export class CanvasCapture {
  private config: CanvasCaptureConfig;
  private animationFrameId: number | null = null;
  private frameIntervalUs: number;
  private lastFrameTimestamp = -Infinity;
  private encoderQueueSize = 0;
  private stopped = false;

  constructor(config: CanvasCaptureConfig) {
    this.config = config;
    this.frameIntervalUs = 1_000_000 / config.fps;
  }

  setEncoderQueueSize(size: number): void {
    this.encoderQueueSize = size;
  }

  start(): void {
    this.stopped = false;
    this.lastFrameTimestamp = -Infinity;
    this.loop();
  }

  stop(): void {
    this.stopped = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (): void => {
    if (this.stopped) return;

    const maxQueue = this.config.maxQueueSize ?? 2;
    if (this.encoderQueueSize > maxQueue) {
      this.animationFrameId = requestAnimationFrame(this.loop);
      return;
    }

    const now = this.config.clock.now();
    if (now - this.lastFrameTimestamp >= this.frameIntervalUs) {
      const frame = new VideoFrame(this.config.canvas, { timestamp: now });
      this.lastFrameTimestamp = now;
      this.config.onFrame(frame);
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
