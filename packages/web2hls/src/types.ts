/**
 * Public types and interfaces for the web2hls library.
 */

/** Video encoding configuration */
export interface VideoConfig {
  /** H.264 codec string. Default: 'avc1.640028' (High Profile, Level 4.0) */
  codec?: string;
  width: number;
  height: number;
  bitrate: number;
  fps: number;
}

/** Audio encoding configuration */
export interface AudioConfig {
  /** AAC codec string. Default: 'mp4a.40.2' (AAC-LC) */
  codec?: string;
  sampleRate?: number;
  numberOfChannels?: number;
  bitrate?: number;
}

/** Pipeline configuration */
export interface PipelineConfig {
  /** Canvas element or OffscreenCanvas to capture */
  canvas: HTMLCanvasElement | OffscreenCanvas;
  /** AudioContext for browser audio capture (Web Audio, Web MIDI, etc.) */
  audioContext?: AudioContext;
  video: VideoConfig;
  audio?: AudioConfig;
  /** HLS segment duration in seconds. Default: 4 */
  segmentDuration?: number;
  /** Callback fired when a new HLS segment is ready */
  onSegment?: (segment: HLSSegment) => void;
}

/** An HLS segment (MPEG-TS) */
export interface HLSSegment {
  index: number;
  data: Uint8Array;
  duration: number;
  timestamp: number;
}

/** Pipeline state */
export type PipelineState = 'idle' | 'configuring' | 'ready' | 'streaming' | 'stopping' | 'stopped' | 'error';

/** Pipeline statistics */
export interface PipelineStats {
  bitrate: number;
  fps: number;
  droppedFrames: number;
  segmentsUploaded: number;
  totalBytesSent: number;
}

/** YouTube stream resource from the API */
export interface YouTubeStreamResource {
  id: string;
  streamKey: string;
  hlsIngestionUrl: string;
  rtmpsIngestionUrl: string;
}

/** YouTube broadcast resource from the API */
export interface YouTubeBroadcastResource {
  id: string;
  title: string;
  status: string;
  boundStreamId?: string;
}

/** YouTube auth configuration */
export interface YouTubeAuthConfig {
  clientId: string;
  redirectUri?: string;
  scopes?: string[];
}

/** YouTube broadcast creation options */
export interface BroadcastOptions {
  title: string;
  description?: string;
  scheduledStartTime?: string;
  privacyStatus?: 'public' | 'unlisted' | 'private';
}

/** HLS uploader configuration */
export interface HLSUploaderConfig {
  ingestionUrl: string;
  retryAttempts?: number;
  retryBackoffMs?: number;
}

/** Callback for encoded video chunks */
export type VideoChunkCallback = (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) => void;

/** Callback for encoded audio chunks */
export type AudioChunkCallback = (chunk: EncodedAudioChunk, metadata?: EncodedAudioChunkMetadata) => void;

/** Callback for MPEG-TS packets */
export type TSPacketCallback = (packet: Uint8Array) => void;
