import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioCapture } from './audio-capture';
import { MonotonicClock } from '../utils/clock';

describe('AudioCapture', () => {
  let mockAudioContext: any;
  let mockSourceNode: any;
  let mockDestinationNode: any;
  let clock: MonotonicClock;

  beforeEach(() => {
    mockDestinationNode = {
      stream: {
        getAudioTracks: vi.fn().mockReturnValue([{}]), // Mock track
      },
    };

    mockAudioContext = {
      createMediaStreamDestination: vi.fn().mockReturnValue(mockDestinationNode),
    };

    mockSourceNode = {
      connect: vi.fn(),
    };

    clock = new MonotonicClock();
    clock.start();

    // Mock global dependencies
    globalThis.AudioData = vi.fn().mockImplementation((init) => ({
      ...init,
      close: vi.fn(),
      copyTo: vi.fn(),
      allocationSize: vi.fn().mockReturnValue(1024),
    })) as any;

    const mockReader = {
      read: vi.fn(),
      cancel: vi.fn().mockResolvedValue(undefined),
      releaseLock: vi.fn(),
    };

    globalThis.MediaStreamTrackProcessor = vi.fn().mockImplementation(() => ({
      readable: {
        getReader: vi.fn().mockReturnValue(mockReader),
      },
    })) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize and connect source node if provided', () => {
    const capture = new AudioCapture({
      audioContext: mockAudioContext,
      sourceNode: mockSourceNode,
      clock,
      onAudioData: vi.fn(),
    });

    expect(mockAudioContext.createMediaStreamDestination).toHaveBeenCalled();
    expect(mockSourceNode.connect).toHaveBeenCalledWith(mockDestinationNode);
    expect(capture.getDestinationNode()).toBe(mockDestinationNode);
  });

  it('should start and read from track processor', async () => {
    const onAudioData = vi.fn();
    const capture = new AudioCapture({
      audioContext: mockAudioContext,
      clock,
      onAudioData,
    });

    // We need to manipulate the mocked reader to yield one value and then done
    const mockValue = {
      format: 'f32',
      sampleRate: 48000,
      numberOfFrames: 1024,
      numberOfChannels: 2,
      allocationSize: vi.fn().mockReturnValue(1024 * 2 * 4),
      copyTo: vi.fn(),
      close: vi.fn(),
    };

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: mockValue })
        .mockResolvedValueOnce({ done: true }),
      cancel: vi.fn().mockResolvedValue(undefined),
      releaseLock: vi.fn(),
    };

    (globalThis.MediaStreamTrackProcessor as any).mockImplementation(() => ({
      readable: {
        getReader: vi.fn().mockReturnValue(mockReader),
      },
    }));

    await capture.start();

    // Wait a tick for the async loop to run
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(globalThis.MediaStreamTrackProcessor).toHaveBeenCalled();
    expect(mockReader.read).toHaveBeenCalled();
    expect(mockValue.copyTo).toHaveBeenCalled();
    expect(onAudioData).toHaveBeenCalled();
    expect(mockValue.close).toHaveBeenCalled();
    
    // Check that a new AudioData was constructed and passed
    const arg = onAudioData.mock.calls[0][0];
    expect(arg.format).toBe('f32');
    expect(arg.sampleRate).toBe(48000);
    expect(arg.numberOfFrames).toBe(1024);
    expect(arg.numberOfChannels).toBe(2);
    expect(typeof arg.timestamp).toBe('number');
  });
  
  it('should drop frames if queue is full', async () => {
    const onAudioData = vi.fn();
    const capture = new AudioCapture({
      audioContext: mockAudioContext,
      clock,
      onAudioData,
      maxQueueSize: 2,
    });

    capture.setEncoderQueueSize(5); // Simulate backed up queue

    const mockValue = {
      close: vi.fn(),
    };

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: mockValue })
        .mockResolvedValueOnce({ done: true }),
      cancel: vi.fn().mockResolvedValue(undefined),
      releaseLock: vi.fn(),
    };

    (globalThis.MediaStreamTrackProcessor as any).mockImplementation(() => ({
      readable: {
        getReader: vi.fn().mockReturnValue(mockReader),
      },
    }));

    await capture.start();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(onAudioData).not.toHaveBeenCalled();
    expect(mockValue.close).toHaveBeenCalled(); // Should still close the value to avoid memory leaks
  });

  it('should stop capture correctly', async () => {
    const capture = new AudioCapture({
      audioContext: mockAudioContext,
      clock,
      onAudioData: vi.fn(),
    });

    const mockReader = {
      read: vi.fn().mockReturnValue(new Promise(() => {})), // never resolves
      cancel: vi.fn().mockResolvedValue(undefined),
      releaseLock: vi.fn(),
    };

    (globalThis.MediaStreamTrackProcessor as any).mockImplementation(() => ({
      readable: {
        getReader: vi.fn().mockReturnValue(mockReader),
      },
    }));

    await capture.start();
    capture.stop();

    expect(mockReader.cancel).toHaveBeenCalled();
  });
});
