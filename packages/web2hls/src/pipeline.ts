import { 
  PipelineConfig, 
  PipelineStats, 
  PipelineState, 
  HLSSegment,
  LogLevel,
  Logger
} from './types';
import { MonotonicClock } from './utils/clock';
import { logger } from './utils/logger';
import { CanvasCapture } from './core/canvas-capture';
import { AudioCapture } from './core/audio-capture';
import { EncoderOrchestrator } from './core/encoder-orchestrator';
import { HLSSegmenter } from './mux/segmenter';

export class StreamingPipeline {
  private config: PipelineConfig;
  private state: PipelineState = 'idle';
  private clock: MonotonicClock;
  private canvasCapture: CanvasCapture;
  private audioCapture?: AudioCapture;
  private encoders: EncoderOrchestrator;
  private segmenter: HLSSegmenter;
  
  private stats: PipelineStats = {
    bitrate: 0,
    fps: 0,
    droppedFrames: 0,
    segmentsUploaded: 0,
    totalBytesSent: 0,
  };

  private listeners: Set<(stats: PipelineStats) => void> = new Set();
  private telemetryInterval: any = null;
  private healthProvider: (() => Promise<string>) | null = null;
  private currentHealth: string = 'unknown';
  private healthCheckCounter = 0;
  private segmentStartTime = 0;

  constructor(config: PipelineConfig) {
    this.config = config;
    this.clock = new MonotonicClock();

    if (config.healthProvider) {
      this.healthProvider = config.healthProvider;
    }
    
    this.segmenter = new HLSSegmenter({
      onSegment: (segment) => {
        if (this.config.onSegment) this.config.onSegment(segment);
        this.stats.segmentsUploaded++;
      }
    });

    this.encoders = new EncoderOrchestrator({
      workerUrl: new URL('./core/encoder.worker.ts', import.meta.url),
      videoConfig: {
        width: config.video.width,
        height: config.video.height,
        bitrate: config.video.bitrate,
        framerate: config.video.fps,
        codec: config.video.codec || 'avc1.640028',
      },
      audioConfig: config.audio ? {
        sampleRate: config.audio.sampleRate || 44100,
        numberOfChannels: config.audio.numberOfChannels || 2,
        bitrate: config.audio.bitrate || 128000,
        codec: config.audio.codec || 'mp4a.40.2',
      } : undefined,
      onVideoChunk: (chunk) => {
        // Decide if we want to force a keyframe for the next segment
        const now = this.clock.now();
        const duration = (now - this.segmentStartTime) / 1_000_000;
        const targetDuration = this.config.segmentDuration || 4;

        if (duration >= targetDuration) {
          this.encoders.forceKeyframe();
        }
      },
      onAudioChunk: () => {},
      onMuxedChunk: (data) => {
        this.segmenter.addChunk(data);
        this.stats.totalBytesSent += data.byteLength;
      },
      onSegmentBoundary: () => {
        const now = this.clock.now();
        this.segmenter.rotate(now);
        this.segmentStartTime = now;
      },
      onError: (error) => {
        logger.error(`Pipeline error [${error.source}]: ${error.message}`);
        this.state = 'error';
      }
    });

    this.canvasCapture = new CanvasCapture({
      canvas: config.canvas,
      fps: config.video.fps,
      clock: this.clock,
      onFrame: (frame) => this.encoders.encodeVideo(frame),
    });

    if (config.audioContext) {
      this.audioCapture = new AudioCapture({
        audioContext: config.audioContext,
        clock: this.clock,
        onAudioData: (data) => this.encoders.encodeAudio(data),
      });
    }
  }

  async start(): Promise<void> {
    if (this.state === 'streaming') return;
    
    logger.info('Starting pipeline...');
    this.state = 'configuring';
    
    this.clock.start();
    const now = this.clock.now();
    this.segmenter.setStartTime(now);
    this.segmentStartTime = now;
    
    this.canvasCapture.start();
    if (this.audioCapture) {
      await this.audioCapture.start();
    }
    
    this.state = 'streaming';
    logger.info('Pipeline streaming');

    this.telemetryInterval = setInterval(async () => {
      this.healthCheckCounter++;
      if (this.healthProvider && this.healthCheckCounter >= 10) {
        this.healthCheckCounter = 0;
        try {
          this.currentHealth = await this.healthProvider();
        } catch (e) {
          logger.warn('Failed to fetch health status', e);
        }
      }
      this.notifyListeners();
    }, 1000);
  }

  async stop(): Promise<void> {
    if (this.state === 'stopped' || this.state === 'idle') return;
    
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }

    logger.info('Stopping pipeline...');
    this.state = 'stopping';
    
    this.canvasCapture.stop();
    if (this.audioCapture) {
      this.audioCapture.stop();
    }
    
    await this.encoders.flush();
    this.segmenter.rotate(this.clock.now());
    
    this.state = 'stopped';
    logger.info('Pipeline stopped');
  }

  pause(): void {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }

    // Basic pause: stop capture but keep encoders alive
    this.canvasCapture.stop();
    if (this.audioCapture) {
      this.audioCapture.stop();
    }
    this.state = 'ready';
    logger.info('Pipeline paused');
  }

  getStats(): PipelineStats {
    const captureStats = this.canvasCapture.getStats();
    return {
      ...this.stats,
      fps: captureStats.captureFps,
      droppedFrames: captureStats.droppedFrames,
      health: this.currentHealth,
    };
  }

  setHealthProvider(provider: () => Promise<string>): void {
    this.healthProvider = provider;
  }

  getState(): PipelineState {
    return this.state;
  }

  subscribe(listener: (stats: PipelineStats) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach(listener => listener(stats));
  }
}
