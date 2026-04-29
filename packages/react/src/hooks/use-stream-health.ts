import { useSyncExternalStore, useMemo } from 'react';
import { StreamingPipeline, PipelineStats } from 'web2hls';

const INITIAL_STATS: PipelineStats = {
  bitrate: 0,
  fps: 0,
  droppedFrames: 0,
  segmentsUploaded: 0,
  totalBytesSent: 0,
};

export function useStreamHealth(pipeline: StreamingPipeline | null): PipelineStats {
  const subscribe = useMemo(() => {
    return (onStoreChange: () => void) => {
      if (!pipeline) return () => {};
      return pipeline.subscribe(() => {
        onStoreChange();
      });
    };
  }, [pipeline]);

  const getSnapshot = () => {
    if (!pipeline) return INITIAL_STATS;
    return pipeline.getStats();
  };

  return useSyncExternalStore(subscribe, getSnapshot, () => INITIAL_STATS);
}
