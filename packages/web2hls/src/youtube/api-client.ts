import { 
  YouTubeBroadcastResource, 
  YouTubeStreamResource, 
  BroadcastOptions 
} from '../types';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

export class YouTubeClient {
  constructor(private accessToken: string) {}

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`YouTube API error: ${error.error?.message || response.statusText}`);
    }

    return response.json();
  }

  async listBroadcasts(status: 'all' | 'active' | 'completed' | 'upcoming' = 'all'): Promise<YouTubeBroadcastResource[]> {
    const params = new URLSearchParams({
      part: 'id,snippet,status,contentDetails',
      mine: 'true',
      maxResults: '50',
    });

    if (status !== 'all') {
      params.append('broadcastStatus', status);
    }

    const data: any = await this.request(`/liveBroadcasts?${params.toString()}`);
    return data.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      status: item.status.lifeCycleStatus,
      boundStreamId: item.contentDetails.boundStreamId,
    }));
  }

  async listStreams(): Promise<YouTubeStreamResource[]> {
    const params = new URLSearchParams({
      part: 'id,snippet,cdn,status',
      mine: 'true',
      maxResults: '50',
    });

    const data: any = await this.request(`/liveStreams?${params.toString()}`);
    return data.items.map((item: any) => ({
      id: item.id,
      streamKey: item.cdn.ingestionInfo.streamName,
      hlsIngestionUrl: item.cdn.ingestionInfo.hlsIngestionUrl,
      rtmpsIngestionUrl: item.cdn.ingestionInfo.ingestionAddress,
    }));
  }

  async getStreamHealth(id: string): Promise<string> {
    const params = new URLSearchParams({
      part: 'status',
      id: id,
    });

    const data: any = await this.request(`/liveStreams?${params.toString()}`);
    if (data.items.length === 0) {
      throw new Error(`Stream not found: ${id}`);
    }

    return data.items[0].status.healthStatus.status;
  }

  async createBroadcast(options: BroadcastOptions): Promise<YouTubeBroadcastResource> {
    const body = {
      snippet: {
        title: options.title,
        description: options.description || '',
        scheduledStartTime: options.scheduledStartTime || new Date().toISOString(),
      },
      status: {
        privacyStatus: options.privacyStatus || 'private',
        selfDeclaredMadeForKids: false,
      },
      contentDetails: {
        enableAutoStart: true,
        enableAutoStop: true,
      }
    };

    const data: any = await this.request('/liveBroadcasts?part=id,snippet,status,contentDetails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return {
      id: data.id,
      title: data.snippet.title,
      status: data.status.lifeCycleStatus,
      boundStreamId: data.contentDetails.boundStreamId,
    };
  }

  async bindStream(broadcastId: string, streamId: string): Promise<YouTubeBroadcastResource> {
    const params = new URLSearchParams({
      id: broadcastId,
      streamId: streamId,
      part: 'id,snippet,status,contentDetails',
    });

    const data: any = await this.request(`/liveBroadcasts/bind?${params.toString()}`, {
      method: 'POST',
    });

    return {
      id: data.id,
      title: data.snippet.title,
      status: data.status.lifeCycleStatus,
      boundStreamId: data.contentDetails.boundStreamId,
    };
  }

  async transitionBroadcast(
    id: string, 
    status: 'testing' | 'live' | 'complete',
    retries = 3
  ): Promise<YouTubeBroadcastResource> {
    const params = new URLSearchParams({
      id,
      broadcastStatus: status,
      part: 'id,snippet,status,contentDetails',
    });

    let lastError: any;
    for (let i = 0; i <= retries; i++) {
      try {
        const data: any = await this.request(`/liveBroadcasts/transition?${params.toString()}`, {
          method: 'POST',
        });

        return {
          id: data.id,
          title: data.snippet.title,
          status: data.status.lifeCycleStatus,
          boundStreamId: data.contentDetails.boundStreamId,
        };
      } catch (e) {
        lastError = e;
        if (i < retries) {
          // Wait before retry (1s, 2s, 4s...)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError;
  }
}
