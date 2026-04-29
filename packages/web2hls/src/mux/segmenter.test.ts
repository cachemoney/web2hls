import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HLSSegmenter } from './segmenter';

describe('HLSSegmenter', () => {
  it('should collect chunks and emit a segment on rotate', () => {
    const onSegment = vi.fn();
    const segmenter = new HLSSegmenter({ onSegment });
    
    segmenter.setStartTime(1000);
    segmenter.addChunk(new Uint8Array([1, 2]));
    segmenter.addChunk(new Uint8Array([3, 4]));
    
    segmenter.rotate(2000);
    
    expect(onSegment).toHaveBeenCalledTimes(1);
    const segment = onSegment.mock.calls[0][0];
    expect(segment.index).toBe(0);
    expect(segment.data).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(segment.duration).toBe(0.001); // (2000 - 1000) / 1,000,000
    expect(segment.timestamp).toBe(1000);
  });

  it('should increment index on subsequent rotations', () => {
    const onSegment = vi.fn();
    const segmenter = new HLSSegmenter({ onSegment });
    
    segmenter.setStartTime(0);
    segmenter.addChunk(new Uint8Array([1]));
    segmenter.rotate(1_000_000);
    
    segmenter.addChunk(new Uint8Array([2]));
    segmenter.rotate(2_000_000);
    
    expect(onSegment).toHaveBeenCalledTimes(2);
    expect(onSegment.mock.calls[1][0].index).toBe(1);
    expect(onSegment.mock.calls[1][0].duration).toBe(1);
  });

  it('should handle rotation with no chunks', () => {
    const onSegment = vi.fn();
    const segmenter = new HLSSegmenter({ onSegment });
    
    segmenter.setStartTime(0);
    segmenter.rotate(1_000_000);
    
    expect(onSegment).not.toHaveBeenCalled();
    // Start time should be updated to current time
    segmenter.addChunk(new Uint8Array([1]));
    segmenter.rotate(2_000_000);
    expect(onSegment.mock.calls[0][0].duration).toBe(1);
  });
});
