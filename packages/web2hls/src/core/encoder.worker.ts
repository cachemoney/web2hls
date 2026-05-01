/**
 * Encoder Web Worker
 * 
 * This worker handles the actual encoding process using WebCodecs.
 * It receives VideoFrame and AudioData objects, encodes them,
 * and muxes them into MPEG-TS chunks.
 */

import { VideoEncoderWrapper } from './video-encoder';
import { AudioEncoderWrapper } from './audio-encoder';
import { MuxerWrapper } from './muxer';

let videoEncoder: VideoEncoderWrapper | null = null;
let audioEncoder: AudioEncoderWrapper | null = null;
let muxer: MuxerWrapper | null = null;
let mainPort: MessagePort | null = null;
let pendingKeyframe = false;

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  if (type === 'INIT_PORT') {
    mainPort = payload;
    mainPort!.onmessage = handleMessage;
    return;
  }
};

async function handleMessage(event: MessageEvent) {
  const { type, payload } = event.data;

  switch (type) {
    case 'CONFIGURE_VIDEO':
      await setupVideoEncoder(payload);
      break;
    case 'CONFIGURE_AUDIO':
      await setupAudioEncoder(payload);
      break;
    case 'FORCE_KEYFRAME':
      pendingKeyframe = true;
      break;
    case 'ENCODE_VIDEO':
      encodeVideoFrame(payload);
      break;
    case 'ENCODE_AUDIO':
      encodeAudioData(payload);
      break;
    case 'FLUSH':
      await flushEncoders();
      break;
    case 'STOP':
      stopEncoders();
      break;
  }
}

async function rotateMuxer() {
  if (muxer) {
    await muxer.flush();
    muxer = null;
  }
}

function initMuxerIfNeeded(videoCodecStr: string, audioCodecStr: string) {
  if (!muxer && mainPort) {
    muxer = new MuxerWrapper((data) => {
      mainPort?.postMessage({
        type: 'MPEG_TS_CHUNK',
        payload: data
      }, [data.buffer]);
    }, videoCodecStr, audioCodecStr);
  }
}

async function setupVideoEncoder(config: any) {
  try {
    if (videoEncoder) {
      videoEncoder.close();
    }

    initMuxerIfNeeded(config.codec || 'avc', 'aac');

    videoEncoder = new VideoEncoderWrapper({
      codec: config.codec,
      width: config.width,
      height: config.height,
      fps: config.framerate,
      bitrate: config.bitrate,
      onOutput: async (chunk, metadata) => {
        if (chunk.type === 'key') {
          await rotateMuxer();
          mainPort?.postMessage({ type: 'SEGMENT_BOUNDARY' });
        }
        
        initMuxerIfNeeded(config.codec || 'avc', 'aac');

        muxer?.addVideoChunk(chunk, metadata).catch(e => {
          mainPort?.postMessage({ type: 'ERROR', payload: { source: 'muxer', message: e.message } });
        });

        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        mainPort?.postMessage({
          type: 'VIDEO_CHUNK',
          payload: {
            data,
            timestamp: chunk.timestamp,
            type: chunk.type,
            duration: chunk.duration,
            metadata
          }
        }, [data.buffer]);
      },
      onError: (e) => {
        mainPort?.postMessage({ type: 'ERROR', payload: { source: 'video', message: e.message } });
      }
    });

    await videoEncoder.start();
  } catch (e: any) {
    mainPort?.postMessage({ type: 'ERROR', payload: { source: 'video_init', message: e.message } });
  }
}

async function setupAudioEncoder(config: any) {
  try {
    if (audioEncoder) {
      audioEncoder.close();
    }

    initMuxerIfNeeded('avc', config.codec || 'aac');

    audioEncoder = new AudioEncoderWrapper({
      sampleRate: config.sampleRate,
      numberOfChannels: config.numberOfChannels,
      bitrate: config.bitrate,
      codec: config.codec,
      onOutput: (chunk, metadata) => {
        initMuxerIfNeeded('avc', config.codec || 'aac');
        muxer?.addAudioChunk(chunk, metadata).catch(e => {
          mainPort?.postMessage({ type: 'ERROR', payload: { source: 'muxer', message: e.message } });
        });

        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        mainPort?.postMessage({
          type: 'AUDIO_CHUNK',
          payload: {
            data,
            timestamp: chunk.timestamp,
            type: chunk.type,
            duration: chunk.duration,
            metadata
          }
        }, [data.buffer]);
      },
      onError: (e) => {
        mainPort?.postMessage({ type: 'ERROR', payload: { source: 'audio', message: e.message } });
      },
      onPressureChange: (state) => {
        mainPort?.postMessage({ type: 'TELEMETRY', payload: { source: 'pressure', state } });
      }
    });

    await audioEncoder.start();
  } catch (e: any) {
    mainPort?.postMessage({ type: 'ERROR', payload: { source: 'audio_init', message: e.message } });
  }
}

function encodeVideoFrame(frame: VideoFrame) {
  if (!videoEncoder) {
    frame.close();
    return;
  }

  try {
    videoEncoder.encode(frame, pendingKeyframe);
    pendingKeyframe = false;
  } finally {
    frame.close();
  }
}

function encodeAudioData(data: AudioData) {
  if (!audioEncoder) {
    data.close();
    return;
  }

  try {
    audioEncoder.encode(data);
  } finally {
    data.close();
  }
}

async function flushEncoders() {
  const promises: Promise<void>[] = [];
  if (videoEncoder) promises.push(videoEncoder.flush());
  if (audioEncoder) promises.push(audioEncoder.flush());
  
  await Promise.all(promises);

  if (muxer) {
    await muxer.flush();
    muxer = null;
  }

  mainPort?.postMessage({ type: 'FLUSHED' });
}

function stopEncoders() {
  if (videoEncoder) {
    videoEncoder.close();
    videoEncoder = null;
  }
  if (audioEncoder) {
    audioEncoder.close();
    audioEncoder = null;
  }
  if (muxer) {
    muxer.flush().catch(() => {});
    muxer = null;
  }
}
