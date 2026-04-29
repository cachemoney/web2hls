import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStreamPipeline } from './use-stream-pipeline';
import { StreamingPipeline } from 'web2hls';
import { renderHook, act } from '@testing-library/react';

vi.mock('web2hls', () => {
  let state = 'idle';
  return {
    StreamingPipeline: vi.fn().mockImplementation(() => ({
      start: vi.fn().mockImplementation(async () => { state = 'streaming'; }),
      stop: vi.fn().mockImplementation(async () => { state = 'stopped'; }),
      pause: vi.fn().mockImplementation(() => { state = 'ready'; }),
      getState: vi.fn().mockImplementation(() => state),
      getStats: vi.fn().mockReturnValue({ fps: 30 }),
    })),
  };
});

describe('useStreamPipeline', () => {
  const config = {
    canvas: {} as any,
    video: { width: 640, height: 480, fps: 30, bitrate: 1000000 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useStreamPipeline).toBeDefined();
  });

  it('should start the pipeline', async () => {
    const { result } = renderHook(() => useStreamPipeline(config));
    
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.state).toBe('streaming');
    expect(StreamingPipeline).toHaveBeenCalled();
  });

  it('should stop the pipeline', async () => {
    const { result } = renderHook(() => useStreamPipeline(config));
    
    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      await result.current.stop();
    });

    expect(result.current.state).toBe('stopped');
  });

  it('should pause the pipeline', async () => {
    const { result } = renderHook(() => useStreamPipeline(config));
    
    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.pause();
    });

    expect(result.current.state).toBe('ready');
  });
});
