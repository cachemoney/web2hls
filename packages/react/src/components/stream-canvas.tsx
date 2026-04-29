import React, { useRef, useEffect, forwardRef } from 'react';

export interface StreamCanvasProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
  width: number;
  height: number;
}

export const StreamCanvas = forwardRef<HTMLCanvasElement, StreamCanvasProps>((
  { width, height, style, ...props },
  ref
) => {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalRef;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: 'block',
        maxWidth: '100%',
        height: 'auto',
        backgroundColor: '#000',
        ...style
      }}
      {...props}
    />
  );
});

StreamCanvas.displayName = 'StreamCanvas';
