# web2hls

Record HTML canvas to HLS live streams using WebCodecs and MPEG-TS muxing.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 **High Performance**: Uses browser `WebCodecs` for hardware-accelerated encoding.
- 🎨 **Canvas Capture**: Record any `<canvas>` element (WebGL, 2D, Three.js, etc.).
- 🔊 **Audio Support**: Seamless integration with Web Audio API.
- 📺 **YouTube Ready**: Built-in support for YouTube Live API and health monitoring.
- ⚛️ **React 19 Hooks**: Modern React integration with `useSyncExternalStore`.
- 📦 **Zero Dependencies**: Core library is lightweight and dependency-free (aside from small utilities).

## Getting Started

### Installation

```bash
npm install web2hls @web2hls/react
```

### Basic Usage (React)

```tsx
import { useStreamPipeline, StreamCanvas, StreamHealth } from '@web2hls/react';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { start, stop, state, stats, pipeline } = useStreamPipeline({
    canvas: canvasRef.current!,
    video: {
      width: 1280,
      height: 720,
      fps: 30,
      bitrate: 2_500_000,
    },
    ingestionUrl: 'https://your-ingest-server/hls/'
  });

  return (
    <div>
      <StreamCanvas ref={canvasRef} width={1280} height={720} />
      <StreamHealth pipeline={pipeline} />
      
      <button onClick={start} disabled={state === 'streaming'}>
        Go Live
      </button>
      <button onClick={stop} disabled={state !== 'streaming'}>
        Stop
      </button>
    </div>
  );
}
```

### YouTube Integration

```tsx
import { YouTubeAuth, YouTubeClient } from 'web2hls';

const auth = new YouTubeAuth();
const client = new YouTubeClient(token);

// Set health provider to monitor YouTube ingestion quality
pipeline.setHealthProvider(() => client.getStreamHealth(streamId));
```

## Documentation

Full API documentation is available at [docs/api/index.html](./docs/api/index.html).

## Development

### Prerequisites

- Node.js 20+
- A modern browser with WebCodecs support (Chrome 86+, Edge 86+, Safari 14.1+)

### Setup

```bash
git clone https://github.com/your-repo/web2hls.git
cd web2hls
npm install
npm run build
```

### Running Tests

```bash
npm test
```

## License

MIT
