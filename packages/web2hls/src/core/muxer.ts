import { 
  Output, 
  MpegTsOutputFormat, 
  EncodedVideoPacketSource, 
  EncodedAudioPacketSource, 
  StreamTarget, 
  EncodedPacket
} from 'mediabunny';
import { logger } from '../utils/logger';

export class MuxerWrapper {
  private output: Output<MpegTsOutputFormat, StreamTarget>;
  private videoSource: EncodedVideoPacketSource;
  private audioSource: EncodedAudioPacketSource;
  private started = false;

  constructor(
    onData: (chunk: Uint8Array) => void,
    videoCodecStr: string,
    audioCodecStr: string
  ) {
    const stream = new WritableStream({
      write(chunk) {
        // chunk.data is a Uint8Array
        const data = new Uint8Array(chunk.data.length);
        data.set(chunk.data);
        onData(data);
      }
    });

    const target = new StreamTarget(stream, { chunked: false });
    this.output = new Output({
      format: new MpegTsOutputFormat(),
      target
    });

    const videoCodec = videoCodecStr.startsWith('avc') ? 'avc' : (videoCodecStr as any);
    const audioCodec = audioCodecStr.startsWith('mp4a') ? 'aac' : (audioCodecStr as any);

    this.videoSource = new EncodedVideoPacketSource(videoCodec);
    this.audioSource = new EncodedAudioPacketSource(audioCodec);

    this.output.addVideoTrack(this.videoSource);
    this.output.addAudioTrack(this.audioSource);
  }

  async start() {
    if (!this.started) {
      await this.output.start();
      this.started = true;
      logger.info('Muxer started');
    }
  }

  async addVideoChunk(chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) {
    if (!this.started) await this.start();
    const packet = EncodedPacket.fromEncodedChunk(chunk);
    try {
      await this.videoSource.add(packet, metadata);
      logger.debug(`Added video packet to muxer: ${packet.byteLength} bytes, timestamp: ${packet.timestamp}`);
    } catch (e) {
      logger.error('Error adding video packet to muxer:', e);
    }
  }

  async addAudioChunk(chunk: EncodedAudioChunk, metadata?: EncodedAudioChunkMetadata) {
    if (!this.started) await this.start();
    const packet = EncodedPacket.fromEncodedChunk(chunk);
    try {
      await this.audioSource.add(packet, metadata);
      logger.debug(`Added audio packet to muxer: ${packet.byteLength} bytes, timestamp: ${packet.timestamp}`);
    } catch (e) {
      logger.error('Error adding audio packet to muxer:', e);
    }
  }

  async flush() {
    try {
      if (!this.started) {
        await this.start();
      }
      this.videoSource.close();
      this.audioSource.close();
      await this.output.finalize();
      logger.info('Muxer finalized');
    } catch (e) {
      logger.error('Error finalizing muxer:', e);
    }
  }
}
