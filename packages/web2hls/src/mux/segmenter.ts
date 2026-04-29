import { HLSSegment } from '../types';

export interface HLSSegmenterConfig {
  onSegment: (segment: HLSSegment) => void;
}

export class HLSSegmenter {
  private segmentIndex = 0;
  private currentSegmentData: Uint8Array[] = [];
  private segmentStartTime = 0;
  private onSegment: (segment: HLSSegment) => void;

  constructor(config: HLSSegmenterConfig) {
    this.onSegment = config.onSegment;
  }

  setStartTime(timestamp: number) {
    this.segmentStartTime = timestamp;
  }

  addChunk(data: Uint8Array) {
    this.currentSegmentData.push(data);
  }

  rotate(now: number) {
    if (this.currentSegmentData.length === 0) {
      this.segmentStartTime = now;
      return;
    }

    const duration = (now - this.segmentStartTime) / 1_000_000;
    
    // Concatenate all chunks into a single segment
    const totalLength = this.currentSegmentData.reduce((acc, val) => acc + val.byteLength, 0);
    const segmentData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.currentSegmentData) {
      segmentData.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const segment: HLSSegment = {
      index: this.segmentIndex++,
      data: segmentData,
      duration: duration,
      timestamp: this.segmentStartTime,
    };

    this.onSegment(segment);

    this.currentSegmentData = [];
    this.segmentStartTime = now;
  }

  reset() {
    this.segmentIndex = 0;
    this.currentSegmentData = [];
    this.segmentStartTime = 0;
  }
}
