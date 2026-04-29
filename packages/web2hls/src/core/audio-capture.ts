import { MonotonicClock } from '../utils/clock';

export interface AudioCaptureConfig {
  audioContext: AudioContext;
  sourceNode?: AudioNode;
  clock: MonotonicClock;
  onAudioData: (data: AudioData) => void;
  maxQueueSize?: number;
}

export class AudioCapture {
  private config: AudioCaptureConfig;
  private destinationNode: MediaStreamAudioDestinationNode;
  private trackProcessor: any | null = null;
  private reader: ReadableStreamDefaultReader<AudioData> | null = null;
  private stopped = false;
  private encoderQueueSize = 0;

  constructor(config: AudioCaptureConfig) {
    this.config = config;
    this.destinationNode = config.audioContext.createMediaStreamDestination();
    if (config.sourceNode) {
      config.sourceNode.connect(this.destinationNode);
    }
  }

  getDestinationNode(): MediaStreamAudioDestinationNode {
    return this.destinationNode;
  }

  setEncoderQueueSize(size: number): void {
    this.encoderQueueSize = size;
  }

  async start(): Promise<void> {
    this.stopped = false;

    const track = this.destinationNode.stream.getAudioTracks()[0];
    if (!track) {
      throw new Error('No audio track available from MediaStreamDestinationNode');
    }

    const TrackProcessor = (globalThis as any).MediaStreamTrackProcessor;
    if (!TrackProcessor) {
      throw new Error('MediaStreamTrackProcessor is not supported in this environment');
    }

    this.trackProcessor = new TrackProcessor({ track });
    this.reader = this.trackProcessor.readable.getReader();

    // Fire and forget the capture loop
    this.loop().catch(console.error);
  }

  stop(): void {
    this.stopped = true;
    if (this.reader) {
      this.reader.cancel().catch(console.error);
      this.reader = null;
    }
    this.trackProcessor = null;
  }

  private async loop(): Promise<void> {
    if (!this.reader) return;

    try {
      while (!this.stopped) {
        const { done, value } = await this.reader.read();
        
        if (done || !value) {
          break;
        }

        const maxQueue = this.config.maxQueueSize ?? 10;
        
        // If the encoder queue is backed up, drop the audio frame
        if (this.encoderQueueSize > maxQueue) {
          value.close();
          continue;
        }

        const now = this.config.clock.now();
        const format = value.format;
        const sampleRate = value.sampleRate;
        const numberOfFrames = value.numberOfFrames;
        const numberOfChannels = value.numberOfChannels;
        
        const bufferSize = value.allocationSize({ format });
        const buffer = new ArrayBuffer(bufferSize);
        value.copyTo(buffer, { format });
        
        // Create a new AudioData object with the timestamp synced to our monotonic clock
        const newData = new AudioData({
          format,
          sampleRate,
          numberOfFrames,
          numberOfChannels,
          timestamp: now,
          data: new Uint8Array(buffer),
        });
        
        value.close(); // Close the original frame to free memory
        
        this.config.onAudioData(newData);
      }
    } catch (e) {
      if (!this.stopped) {
        console.error('Error reading from audio track processor:', e);
      }
    } finally {
      if (this.reader) {
        this.reader.releaseLock();
      }
    }
  }
}
