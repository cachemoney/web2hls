import { useState, useTransition, useEffect, useCallback, useMemo, useRef } from 'react';
import { StreamingPipeline, PipelineConfig, PipelineState, PipelineStats } from 'web2hls';

export interface UseStreamPipelineResult {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  pause: () => void;
  state: PipelineState;
  isPending: boolean;
  error: Error | null;
  stats: PipelineStats;
  pipeline: StreamingPipeline | null;
}

export function useStreamPipeline(config: PipelineConfig): UseStreamPipelineResult {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<PipelineState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState<PipelineStats>({
    bitrate: 0,
    fps: 0,
    droppedFrames: 0,
    segmentsUploaded: 0,
    totalBytesSent: 0,
  });

  const pipelineRef = useRef<StreamingPipeline | null>(null);

  // Initialize pipeline on config change
  const pipeline = useMemo(() => {
    if (pipelineRef.current) {
      pipelineRef.current.stop().catch(console.error);
    }
    const p = new StreamingPipeline(config);
    pipelineRef.current = p;
    return p;
  }, [config.canvas, config.video, config.audio]);

  const start = useCallback(async () => {
    setError(null);
    startTransition(async () => {
      try {
        await pipeline.start();
        setState(pipeline.getState());
      } catch (e: any) {
        setError(e);
        setState('error');
      }
    });
  }, [pipeline]);

  const stop = useCallback(async () => {
    startTransition(async () => {
      try {
        await pipeline.stop();
        setState(pipeline.getState());
      } catch (e: any) {
        setError(e);
        setState('error');
      }
    });
  }, [pipeline]);

  const pause = useCallback(() => {
    pipeline.pause();
    setState(pipeline.getState());
  }, [pipeline]);

  // Telemetry loop
  useEffect(() => {
    let interval: any;
    if (state === 'streaming') {
      interval = setInterval(() => {
        setStats(pipeline.getStats());
        const currentState = pipeline.getState();
        if (currentState !== state) {
          setState(currentState);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state, pipeline]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pipelineRef.current) {
        pipelineRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return {
    start,
    stop,
    pause,
    state,
    isPending,
    error,
    stats,
    pipeline,
  };
}
