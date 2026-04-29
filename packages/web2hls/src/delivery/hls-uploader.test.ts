import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HLSUploader } from './hls-uploader';

describe('HLSUploader', () => {
  const config = { ingestionUrl: 'http://test/ingest' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upload segments sequentially', async () => {
    const uploader = new HLSUploader(config);
    
    const segment1 = { index: 0, data: new Uint8Array([1]), duration: 1, timestamp: 0 };
    const segment2 = { index: 1, data: new Uint8Array([2]), duration: 1, timestamp: 1000 };

    let resolve1: any;
    const promise1 = new Promise((r) => { resolve1 = r; });
    
    globalThis.fetch = vi.fn().mockImplementation(async (url) => {
      if (url.includes('0.ts')) {
        await promise1;
        return { ok: true };
      }
      return { ok: true };
    });

    uploader.enqueue(segment1);
    uploader.enqueue(segment2);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('http://test/ingest/0.ts', expect.any(Object));

    resolve1();
    
    // Need to wait for microtasks
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
    
    expect(fetch).toHaveBeenLastCalledWith('http://test/ingest/1.ts', expect.any(Object));
  });

  it('should halt on error', async () => {
    const uploader = new HLSUploader(config);
    
    const segment1 = { index: 0, data: new Uint8Array([1]), duration: 1, timestamp: 0 };
    const segment2 = { index: 1, data: new Uint8Array([2]), duration: 1, timestamp: 1000 };

    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' })
      .mockResolvedValue({ ok: true });

    uploader.enqueue(segment1);
    uploader.enqueue(segment2);

    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    
    // Should not call for segment 2 because 1 failed
    // Wait a bit to be sure
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure with exponential backoff', async () => {
    vi.useFakeTimers();
    const uploader = new HLSUploader({ ...config, retryAttempts: 2, retryBackoffMs: 100 });
    
    const segment = { index: 0, data: new Uint8Array([1]), duration: 1, timestamp: 0 };

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        return { ok: false, status: 500, statusText: 'Error' };
      }
      return { ok: true };
    });

    const promise = (uploader as any).uploadSegment(segment);
    
    // First attempt fails, waits 100ms
    await vi.advanceTimersByTimeAsync(100);
    // Second attempt fails, waits 200ms
    await vi.advanceTimersByTimeAsync(200);
    
    await promise;

    expect(callCount).toBe(3);
    vi.useRealTimers();
  });
});
