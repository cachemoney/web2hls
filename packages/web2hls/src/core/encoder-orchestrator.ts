import { EncodedChunk } from '../types';

export interface EncoderOrchestratorConfig {
  workerUrl: string | URL;
  videoConfig?: VideoEncoderConfig;
  audioConfig?: AudioEncoderConfig;
  onVideoChunk: (chunk: EncodedChunk) => void;
  onAudioChunk: (chunk: EncodedChunk) => void;
  onMuxedChunk?: (chunk: Uint8Array) => void;
  onSegmentBoundary?: () => void;
  onError: (error: { source: string; message: string }) => void;
}

export class EncoderOrchestrator {
  private worker: Worker;
  private config: EncoderOrchestratorConfig;
  private port: MessagePort | null = null;

  constructor(config: EncoderOrchestratorConfig) {
    this.config = config;
    this.worker = new Worker(config.workerUrl, { type: 'module' });
    
    // Setup MessageChannel for low-latency communication
    const channel = new MessageChannel();
    this.port = channel.port1;
    this.port.onmessage = this.handleWorkerMessage;
    
    // Transfer port2 to the worker
    this.worker.postMessage({ type: 'INIT_PORT', payload: channel.port2 }, [channel.port2]);

    if (config.videoConfig) {
      this.configureVideo(config.videoConfig);
    }
    if (config.audioConfig) {
      this.configureAudio(config.audioConfig);
    }
  }

  configureVideo(config: VideoEncoderConfig): void {
    this.port?.postMessage({ type: 'CONFIGURE_VIDEO', payload: config });
  }

  configureAudio(config: AudioEncoderConfig): void {
    this.port?.postMessage({ type: 'CONFIGURE_AUDIO', payload: config });
  }

  forceKeyframe(): void {
    this.port?.postMessage({ type: 'FORCE_KEYFRAME' });
  }

  encodeVideo(frame: VideoFrame): void {
    // Transfer the frame to the worker
    if (this.port) {
      this.port.postMessage({ type: 'ENCODE_VIDEO', payload: frame }, [frame]);
    } else {
      frame.close();
    }
  }

  encodeAudio(data: AudioData): void {
    // Transfer the data to the worker
    if (this.port) {
      this.port.postMessage({ type: 'ENCODE_AUDIO', payload: data }, [data]);
    } else {
      data.close();
    }
  }

  async flush(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.port) {
        resolve();
        return;
      }

      const handler = (event: MessageEvent) => {
        if (event.data.type === 'FLUSHED') {
          this.port?.removeEventListener('message', handler);
          resolve();
        }
      };
      this.port.addEventListener('message', handler);
      this.port.start(); // Required when using addEventListener on a port
      this.port.postMessage({ type: 'FLUSH' });
    });
  }

  terminate(): void {
    this.port?.postMessage({ type: 'STOP' });
    this.port?.close();
    this.worker.terminate();
  }

  private handleWorkerMessage = (event: MessageEvent): void => {
    const { type, payload } = event.data;

    switch (type) {
      case 'MPEG_TS_CHUNK':
        if (this.config.onMuxedChunk) this.config.onMuxedChunk(payload);
        break;
      case 'SEGMENT_BOUNDARY':
        if (this.config.onSegmentBoundary) this.config.onSegmentBoundary();
        break;
      case 'VIDEO_CHUNK':
        this.config.onVideoChunk(payload);
        break;
      case 'AUDIO_CHUNK':
        this.config.onAudioChunk(payload);
        break;
      case 'ERROR':
        this.config.onError(payload);
        break;
    }
  };
}
