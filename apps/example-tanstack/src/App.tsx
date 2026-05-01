import { useState, useRef, useEffect, useMemo } from 'react'
import { useStreamPipeline, StreamCanvas, StreamHealth, OAuthButton, useYouTubeAuth } from '@web2hls/react'
import { HLSUploader } from 'web2hls'
import './App.css'

const YOUTUBE_CONFIG = {
  clientId: 'mock-client-id',
  redirectUri: window.location.origin,
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ingestionUrl, setIngestionUrl] = useState('http://localhost:8080/live/stream.m3u8')
  const [codec, setCodec] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('codec') || 'avc1.640028'
  })
  
  const { isAuthenticated } = useYouTubeAuth(YOUTUBE_CONFIG)

  // Animation state
  const requestRef = useRef<number>(null)
  const rotationRef = useRef(0)

  // Initialize uploader
  const uploader = useMemo(() => new HLSUploader({ ingestionUrl }), [ingestionUrl])

  // Configure pipeline
  const config = useMemo(() => ({
    canvas: canvasRef.current!,
    video: {
      width: 1280,
      height: 720,
      fps: 30,
      bitrate: 2_500_000,
      codec: codec,
    },
    segmentDuration: 4,
    onSegment: (segment: any) => {
      console.log('New segment generated:', segment.index, segment.duration, 'seconds');
      uploader.enqueue(segment);
    }
  }), [canvasRef.current, uploader, codec])

  const { start, stop, state, pipeline, error } = useStreamPipeline(config)

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = (time: number) => {
      rotationRef.current = (time / 1000) * 0.5
      
      // Clear
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw some animated shapes
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(rotationRef.current)
      
      // Pulsing circle
      const scale = 1 + Math.sin(time / 500) * 0.1
      ctx.beginPath()
      ctx.arc(0, 0, 150 * scale, 0, Math.PI * 2)
      const gradient = ctx.createLinearGradient(-150, -150, 150, 150)
      gradient.addColorStop(0, '#38bdf8')
      gradient.addColorStop(1, '#818cf8')
      ctx.fillStyle = gradient
      ctx.fill()
      
      // Floating particles
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + rotationRef.current * 2
        const r = 220 + Math.sin(time / 1000 + i) * 20
        const x = Math.cos(angle) * r
        const y = Math.sin(angle) * r
        
        ctx.beginPath()
        ctx.arc(x, y, 10, 0, Math.PI * 2)
        ctx.fillStyle = '#f472b6'
        ctx.fill()
      }
      
      ctx.restore()

      // Overlay text
      ctx.font = 'bold 48px Inter, system-ui, sans-serif'
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.fillText('web2hls LIVE', centerX, centerY + 15)
      
      ctx.font = '24px Inter, system-ui, sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.fillText(new Date().toLocaleTimeString(), centerX, centerY + 60)

      if (state === 'streaming') {
        ctx.beginPath()
        ctx.arc(centerX - 100, centerY - 150, 10, 0, Math.PI * 2)
        ctx.fillStyle = (Math.floor(time / 500) % 2 === 0) ? '#ef4444' : '#7f1d1d'
        ctx.fill()
        ctx.font = 'bold 20px Inter, system-ui, sans-serif'
        ctx.fillStyle = 'white'
        ctx.textAlign = 'left'
        ctx.fillText('REC', centerX - 80, centerY - 143)
      }

      requestRef.current = requestAnimationFrame(animate)
    }

    requestRef.current = requestAnimationFrame(animate)
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [state])

  return (
    <div className="example-container">
      <header>
        <h1>web2hls <span className="badge">React 19</span></h1>
        <p>High-performance HTML Canvas to HLS live streaming</p>
      </header>

      <main>
        <div className="canvas-wrapper">
          <StreamCanvas 
            ref={canvasRef} 
            width={1280} 
            height={720} 
            className="main-canvas"
          />
          {state === 'streaming' && (
            <div className="streaming-indicator">
              LIVE
            </div>
          )}
        </div>

        <aside className="controls">
          <section className="config-panel">
            <h3>Pipeline Config</h3>
            
            <div className="auth-section">
              <OAuthButton config={YOUTUBE_CONFIG} className="youtube-auth-btn" />
              {isAuthenticated && <span className="auth-status">✓ Authenticated</span>}
            </div>

            <div className="input-group">
              <label htmlFor="codec">Codec</label>
              <select 
                id="codec"
                value={codec}
                onChange={(e) => setCodec(e.target.value)}
                disabled={state !== 'idle' && state !== 'stopped'}
              >
                <option value="avc1.640028">H.264 High</option>
                <option value="avc1.4d401f">H.264 Main</option>
                <option value="avc1.42e01f">H.264 Baseline</option>
                <option value="mock">Mock Encoder (Testing)</option>
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="ingestion-url">Ingestion URL</label>
              <input 
                id="ingestion-url"
                type="text" 
                value={ingestionUrl}
                onChange={(e) => setIngestionUrl(e.target.value)}
                disabled={state !== 'idle' && state !== 'stopped'}
              />
            </div>
            
            <div className="button-group">
              {state !== 'streaming' ? (
                <button 
                  className="start-btn" 
                  onClick={start}
                  disabled={state === 'configuring'}
                >
                  {state === 'configuring' ? 'Starting...' : 'Start Streaming'}
                </button>
              ) : (
                <button className="stop-btn" onClick={stop}>
                  Stop Streaming
                </button>
              )}
            </div>

            {error && (
              <div className="error-message">
                Error: {error.message}
              </div>
            )}
          </section>

          <section className="stats-panel">
            <h3>Stream Health</h3>
            <StreamHealth pipeline={pipeline} className="health-monitor" />
          </section>
        </aside>
      </main>

      <footer>
        <p>Built with WebCodecs, MPEG-TS, and React 19</p>
      </footer>
    </div>
  )
}

export default App
