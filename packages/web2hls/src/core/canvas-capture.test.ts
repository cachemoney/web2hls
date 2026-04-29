import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanvasCapture } from './canvas-capture';
import { MonotonicClock } from '../utils/clock';

// Mock VideoFrame
class MockVideoFrame {
  constructor(public source: any, public init: any) {}
  close() {}
}

vi.stubGlobal('VideoFrame', MockVideoFrame);

// Mock requestAnimationFrame
let rafCallback: FrameRequestCallback | null = null;
vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
  rafCallback = cb;
  return 1;
}));
vi.stubGlobal('cancelAnimationFrame', vi.fn());

// Mock performance.now
let currentTimeMs = 0;
vi.stubGlobal('performance', {
  now: () => currentTimeMs
});

describe('CanvasCapture', () => {
  let clock: MonotonicClock;
  let onFrame: any;
  let canvas: any;

  beforeEach(() => {
    currentTimeMs = 0;
    clock = new MonotonicClock();
    clock.start();
    
    onFrame = vi.fn();
    canvas = { width: 640, height: 480 };
    rafCallback = null;
    vi.clearAllMocks();
  });

  it('should capture frames at the specified FPS', () => {
    const capture = new CanvasCapture({
      canvas,
      fps: 30,
      clock,
      onFrame,
    });

    // t=0
    capture.start();
    expect(onFrame).toHaveBeenCalledTimes(1);
    
    // Advance time by 40ms -> t=40ms
    currentTimeMs = 40;
    if (rafCallback) rafCallback(currentTimeMs);
    expect(onFrame).toHaveBeenCalledTimes(2);

    // Advance time to 80ms -> t=80ms
    currentTimeMs = 80;
    if (rafCallback) rafCallback(currentTimeMs);
    expect(onFrame).toHaveBeenCalledTimes(3);
  });

  it('should drop frames on backpressure', () => {
    const capture = new CanvasCapture({
      canvas,
      fps: 30,
      clock,
      onFrame,
      maxQueueSize: 2,
    });

    // t=0
    capture.start();
    expect(onFrame).toHaveBeenCalledTimes(1);
    
    capture.setEncoderQueueSize(5);

    // Advance time to 40ms -> t=40ms
    currentTimeMs = 40;
    if (rafCallback) rafCallback(currentTimeMs);
    
    expect(onFrame).toHaveBeenCalledTimes(1); // Still 1 from t=0
    expect(capture.getStats().droppedFrames).toBe(1);
  });

  it('should report FPS correctly', () => {
    const capture = new CanvasCapture({
      canvas,
      fps: 30,
      clock,
      onFrame,
    });

    // t=0
    capture.start();
    
    // Manually increment frameCount to avoid timing issues in test
    (capture as any).frameCount = 30;

    // Move time forward by 1 second
    currentTimeMs = 1000;
    const stats = capture.getStats();
    
    expect(stats.captureFps).toBe(30);
  });

  it('should stop capturing when stop() is called', () => {
    const capture = new CanvasCapture({
      canvas,
      fps: 30,
      clock,
      onFrame,
    });

    capture.start();
    capture.stop();
    
    expect(cancelAnimationFrame).toHaveBeenCalled();
    
    vi.clearAllMocks();
    
    // Even if we manually call loop, it should return early
    (capture as any).loop();
    expect(onFrame).not.toHaveBeenCalled();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
});
