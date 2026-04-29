import { describe, it, expect, vi } from 'vitest';
import { MuxerWrapper } from './muxer';

describe('MuxerWrapper', () => {
  it('should initialize and produce MPEG-TS packets when flushed', async () => {
    const onData = vi.fn();
    const muxer = new MuxerWrapper(onData, 'avc', 'aac');
    
    expect(muxer).toBeDefined();
    
    await muxer.start();
    
    // Finalizing the output should at least write some TS headers/tables
    await muxer.flush();
    
    expect(onData).toHaveBeenCalled();
    const firstCall = onData.mock.calls[0][0];
    expect(firstCall).toBeInstanceOf(Uint8Array);
    // TS sync byte is 0x47 (71 in decimal)
    expect(firstCall[0]).toBe(0x47);
  });
});
