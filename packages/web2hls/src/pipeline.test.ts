import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamingPipeline } from './pipeline';
import { CanvasCapture } from './core/canvas-capture';
import { AudioCapture } from './core/audio-capture';
import { EncoderOrchestrator } from './core/encoder-orchestrator';

vi.mock('./core/canvas-capture', () => {
  return {
    CanvasCapture: vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      getStats: vi.fn().mockReturnValue({ captureFps: 30, droppedFrames: 0 }),
    })),
  };
});

vi.mock('./core/audio-capture', () => {
  return {
    AudioCapture: vi.fn().mockImplementation(() => ({
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    })),
  };
});

vi.mock('./core/encoder-orchestrator', () => {
  return {
    EncoderOrchestrator: vi.fn().mockImplementation((config) => ({
      config,
      encodeVideo: vi.fn(),
      encodeAudio: vi.fn(),
      forceKeyframe: vi.fn(),
      flush: vi.fn().mockResolvedValue(undefined),
      terminate: vi.fn(),
    })),
  };
});

describe('StreamingPipeline', () => {
  const mockCanvas = { width: 640, height: 480 } as any;
  const config = {
    canvas: mockCanvas,
    video: { width: 640, height: 480, fps: 30, bitrate: 1000000 },
    onSegment: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize and start the pipeline', async () => {
    const pipeline = new StreamingPipeline(config);
    await pipeline.start();

    expect(pipeline.getState()).toBe('streaming');
    expect(CanvasCapture).toHaveBeenCalled();
    expect(EncoderOrchestrator).toHaveBeenCalled();
  });

  it('should stop the pipeline and emit the last segment', async () => {
    const pipeline = new StreamingPipeline(config);
    await pipeline.start();
    
    // Simulate some data
    const encoders = vi.mocked(EncoderOrchestrator).mock.results[0].value;
    encoders.config.onMuxedChunk(new Uint8Array([1, 2, 3]));
    
    await pipeline.stop();

    expect(pipeline.getState()).toBe('stopped');
    expect(config.onSegment).toHaveBeenCalled();
    const segment = config.onSegment.mock.calls[0][0];
    expect(segment.data).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('should rotate segments based on duration and keyframes', async () => {
    const pipeline = new StreamingPipeline({
      ...config,
      segmentDuration: 2,
    });
    await pipeline.start();
    
    const encoders = vi.mocked(EncoderOrchestrator).mock.results[0].value;
    
    // Simulate data
    encoders.config.onMuxedChunk(new Uint8Array([1]));
    
    // Move time forward by 3 seconds
    const clock = (pipeline as any).clock;
    vi.spyOn(clock, 'now').mockReturnValue(3_000_000);
    
    // Send a keyframe
    encoders.config.onVideoChunk({ type: 'key', data: new Uint8Array(), timestamp: 3_000_000 });
    expect(encoders.forceKeyframe).toHaveBeenCalled();

    // Trigger boundary
    encoders.config.onSegmentBoundary();
    
    expect(config.onSegment).toHaveBeenCalledTimes(1);
    expect(config.onSegment.mock.calls[0][0].index).toBe(0);
  });

  it('should query health periodically', async () => {
    vi.useFakeTimers();
    const pipeline = new StreamingPipeline(config);
    const healthProvider = vi.fn().mockResolvedValue('excellent');
    pipeline.setHealthProvider(healthProvider);
    
    await pipeline.start();
    
    // 1st tick: counter=1, not 10
    await vi.advanceTimersByTimeAsync(1000);
    expect(healthProvider).not.toHaveBeenCalled();
    
    // 10th tick
    for (let i = 0; i < 9; i++) {
      await vi.advanceTimersByTimeAsync(1000);
    }
    
    expect(healthProvider).toHaveBeenCalledTimes(1);
    expect(pipeline.getStats().health).toBe('excellent');
    
    vi.useRealTimers();
  });
});
