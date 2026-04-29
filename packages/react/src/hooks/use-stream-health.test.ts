import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStreamHealth } from './use-stream-health';
import { renderHook, act } from '@testing-library/react';

describe('useStreamHealth', () => {
  let mockPipeline: any;

  beforeEach(() => {
    let listener: any = null;
    mockPipeline = {
      getStats: vi.fn().mockReturnValue({ fps: 30, droppedFrames: 0 }),
      subscribe: vi.fn().mockImplementation((l) => {
        listener = l;
        return () => { listener = null; };
      }),
      // Helper to trigger listener in tests
      _trigger: () => { if (listener) listener(); }
    };
  });

  it('should return initial stats when pipeline is null', () => {
    const { result } = renderHook(() => useStreamHealth(null));
    expect(result.current.fps).toBe(0);
  });

  it('should return pipeline stats and update on changes', () => {
    const { result } = renderHook(() => useStreamHealth(mockPipeline));
    
    expect(result.current.fps).toBe(30);
    expect(mockPipeline.subscribe).toHaveBeenCalled();

    // Update stats and trigger listener
    mockPipeline.getStats.mockReturnValue({ fps: 25, droppedFrames: 5 });
    
    act(() => {
      mockPipeline._trigger();
    });

    expect(result.current.fps).toBe(25);
    expect(result.current.droppedFrames).toBe(5);
  });
});
