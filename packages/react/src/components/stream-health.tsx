import React from 'react';
import { useStreamHealth } from '../hooks/use-stream-health';
import { StreamingPipeline } from 'web2hls';

export interface StreamHealthProps {
  pipeline: StreamingPipeline | null;
  className?: string;
}

export const StreamHealth: React.FC<StreamHealthProps> = ({ pipeline, className }) => {
  const stats = useStreamHealth(pipeline);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div 
      className={className}
      style={{
        padding: '16px',
        backgroundColor: '#1a1a1a',
        color: '#fff',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '16px',
      }}
    >
      <div>
        <div style={{ color: '#888', marginBottom: '4px' }}>FPS</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{stats.fps.toFixed(1)}</div>
      </div>
      <div>
        <div style={{ color: '#888', marginBottom: '4px' }}>Dropped</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: stats.droppedFrames > 0 ? '#ff4444' : '#fff' }}>
          {stats.droppedFrames}
        </div>
      </div>
      <div>
        <div style={{ color: '#888', marginBottom: '4px' }}>Data Sent</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{formatBytes(stats.totalBytesSent)}</div>
      </div>
      <div>
        <div style={{ color: '#888', marginBottom: '4px' }}>Segments</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{stats.segmentsUploaded}</div>
      </div>
    </div>
  );
};
