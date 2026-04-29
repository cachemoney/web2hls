import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YouTubeClient } from './api-client';

describe('YouTubeClient', () => {
  const accessToken = 'test-token';
  let client: YouTubeClient;

  beforeEach(() => {
    client = new YouTubeClient(accessToken);
    vi.clearAllMocks();
  });

  it('should list broadcasts', async () => {
    const mockData = {
      items: [
        {
          id: 'b1',
          snippet: { title: 'Broadcast 1' },
          status: { lifeCycleStatus: 'active' },
          contentDetails: { boundStreamId: 's1' },
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as any);

    const broadcasts = await client.listBroadcasts('active');

    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0].id).toBe('b1');
    expect(broadcasts[0].title).toBe('Broadcast 1');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('liveBroadcasts?part=id%2Csnippet%2Cstatus%2CcontentDetails&mine=true&maxResults=50&broadcastStatus=active'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('should list streams', async () => {
    const mockData = {
      items: [
        {
          id: 's1',
          cdn: {
            ingestionInfo: {
              streamName: 'key1',
              hlsIngestionUrl: 'http://hls',
              ingestionAddress: 'rtmps://rtmps',
            },
          },
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as any);

    const streams = await client.listStreams();

    expect(streams).toHaveLength(1);
    expect(streams[0].id).toBe('s1');
    expect(streams[0].streamKey).toBe('key1');
    expect(streams[0].hlsIngestionUrl).toBe('http://hls');
  });

  it('should create a broadcast', async () => {
    const mockData = {
      id: 'new-b',
      snippet: { title: 'New Broadcast' },
      status: { lifeCycleStatus: 'created' },
      contentDetails: { boundStreamId: null },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as any);

    const broadcast = await client.createBroadcast({ title: 'New Broadcast' });

    expect(broadcast.id).toBe('new-b');
    expect(broadcast.title).toBe('New Broadcast');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('liveBroadcasts?part=id,snippet,status,contentDetails'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"title":"New Broadcast"'),
      })
    );
  });

  it('should bind a stream to a broadcast', async () => {
    const mockData = {
      id: 'b1',
      snippet: { title: 'Broadcast 1' },
      status: { lifeCycleStatus: 'active' },
      contentDetails: { boundStreamId: 's1' },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as any);

    const broadcast = await client.bindStream('b1', 's1');

    expect(broadcast.boundStreamId).toBe('s1');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('liveBroadcasts/bind?id=b1&streamId=s1&part=id%2Csnippet%2Cstatus%2CcontentDetails'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should transition a broadcast', async () => {
    const mockData = {
      id: 'b1',
      snippet: { title: 'Broadcast 1' },
      status: { lifeCycleStatus: 'live' },
      contentDetails: { boundStreamId: 's1' },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as any);

    const broadcast = await client.transitionBroadcast('b1', 'live');

    expect(broadcast.status).toBe('live');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('liveBroadcasts/transition?id=b1&broadcastStatus=live&part=id%2Csnippet%2Cstatus%2CcontentDetails'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should retry on transition failure', async () => {
    vi.useFakeTimers();
    
    const mockData = {
      id: 'b1',
      snippet: { title: 'Broadcast 1' },
      status: { lifeCycleStatus: 'live' },
      contentDetails: { boundStreamId: 's1' },
    };

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 2) {
        return {
          ok: false,
          statusText: 'Conflict',
          json: async () => ({ error: { message: 'The broadcast is not ready' } }),
        };
      }
      return {
        ok: true,
        json: async () => mockData,
      };
    });

    const promise = client.transitionBroadcast('b1', 'live', 2);
    
    // First call fails, wait for timer
    await vi.runAllTimersAsync();
    
    const broadcast = await promise;

    expect(broadcast.status).toBe('live');
    expect(callCount).toBe(2);
    
    vi.useRealTimers();
  });

  it('should handle API errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Forbidden',
      json: async () => ({ error: { message: 'Quota exceeded' } }),
    } as any);

    await expect(client.listStreams()).rejects.toThrow('YouTube API error: Quota exceeded');
  });
});
