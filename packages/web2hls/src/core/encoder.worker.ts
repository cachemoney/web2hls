/**
 * Encoder Web Worker
 * 
 * This worker handles the actual encoding process using WebCodecs.
 * It receives VideoFrame and AudioData objects and produces encoded chunks.
 */

import { VideoEncoderWrapper } from './video-encoder';
import { AudioEncoderWrapper } from './audio-encoder';

let videoEncoder: VideoEncoderWrapper | null = null;
let audioEncoder: AudioEncoderWrapper | null = null;
let mainPort: MessagePort | null = null;

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

async function setupVideoEncoder(config: any) {
  if (videoEncoder) {
    videoEncoder.close();
  }

  videoEncoder = new VideoEncoderWrapper({
    width: config.width,
    height: config.height,
    fps: config.framerate,
    bitrate: config.bitrate,
    onOutput: (chunk, metadata) => {
      // Transfer the chunk back to the main thread
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
}

async function setupAudioEncoder(config: any) {
  if (audioEncoder) {
    audioEncoder.close();
  }

  audioEncoder = new AudioEncoderWrapper({
    sampleRate: config.sampleRate,
    numberOfChannels: config.numberOfChannels,
    bitrate: config.bitrate,
    codec: config.codec,
    onOutput: (chunk, metadata) => {
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
}

function encodeVideoFrame(frame: VideoFrame) {
  if (!videoEncoder) {
    frame.close();
    return;
  }

  try {
    videoEncoder.encode(frame);
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
}
