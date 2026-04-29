---
stepsCompleted: [1, 2]
inputDocuments: []
session_topic: 'web2hls - React library for canvas → YouTube live streaming via WebCodecs + MPEG-TS'
session_goals: 'Research feasibility, determine solution architecture, produce implementation plan for agent review'
selected_approach: 'AI-Recommended'
techniques_used: ['parallel-research', 'feasibility-analysis', 'gap-analysis']
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Mezmo
**Date:** 2026-04-21

## Session Overview

**Topic:** Building a React library (`web2hls`) that records HTML canvas using WebCodecs API, muxes to MPEG-TS, and streams live to YouTube.

**Goals:**
1. Research if WebCodecs + browser muxing can produce YouTube-compatible HLS streams
2. Determine the optimal architecture (pure browser vs browser + relay)
3. Produce a detailed implementation plan for agent execution after review

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Target mode | **Pure browser only** — no relay server | Simplicity, zero infrastructure, browser HTTP PUT to YouTube HLS |
| Audio source | **Browser audio APIs only** (Web Audio, Web MIDI, OscillatorNode, etc.) | No mic/getUserMedia — synthesized audio from games, instruments, TTS |
| Video codec | **H.264** (avc1) | YouTube HLS requirement; Annex B output for streaming |
| Segment duration | **Configurable** (default 4s) | User tunes latency vs quality per use case |
| React target | **React 19** with latest features | Actions, `use()` hook, `useOptimistic`, `useFormStatus`, startTransition |

## Research Findings

### WebCodecs Capabilities

- **Canvas capture**: `new VideoFrame(canvas, { timestamp })` — direct support
- **Video codecs**: H.264 (avc1), H.265 (hev1), VP8, VP9, AV1 — all supported for encoding
- **Output format**: Raw `EncodedVideoChunk` — Annex B (stream-friendly) or AVCC (file-friendly)
- **Muxing**: NONE — explicitly a non-goal per W3C spec
- **Audio**: `AudioEncoder` supports AAC, Opus, FLAC
- **Browser support**: Chrome 94+, Edge 94+, Firefox 130+, Safari 26+

### Muxing Solution: Mediabunny

**The only viable modern library for MPEG-TS muxing in the browser.**

- **Status**: Active (v1.40.1, March 2026, 513K weekly downloads)
- **MPEG-TS**: Native `MpegTsOutputFormat` class with `StreamTarget` for real-time output
- **Bundle**: 5-50 KB gzipped (tree-shakable)
- **Performance**: 862 ops/s (vs 12 ops/s for ffmpeg.wasm)
- **Dependencies**: Zero — pure TypeScript
- **Successor to**: mp4-muxer (deprecated), webm-muxer (deprecated)

### YouTube Live Ingestion

| Protocol | Format | Latency | Browser Possible |
|---|---|---|---|
| HLS ingest | M2TS (MPEG-2 TS) segments via HTTP PUT | 5-15s | ✅ Yes |
| RTMPS | FLV/TS via TCP | 2-5s | ❌ No (no RTMP in browsers) |

- YouTube API returns `hlsIngestionAddress` for HLS-type streams
- OAuth2 scope: `https://www.googleapis.com/auth/youtube`
- Key API calls: `liveStreams.insert`, `liveBroadcasts.insert`, `liveBroadcasts.bind`, `liveBroadcasts.transition`

### Existing Solutions (Gap Analysis)

| Project | Stars | Approach | Production? |
|---|---|---|---|
| streamana | 57 | webm-muxer + ffmpeg.wasm | Demo, has canvas issues |
| Wocket | 131 | MediaRecorder → WebSocket → RTMP | PoC only |
| SRS | Large | WebRTC → Server → RTMP | Server-side only |

**Gap**: No production library combines WebCodecs + Mediabunny MPEG-TS muxing + YouTube HLS ingest. This is a novel approach.

### Architecture

**Pure browser pipeline — zero server infrastructure:**

```
┌──────────────────────────────────────────────────────────────┐
│                        BROWSER                                │
│                                                               │
│  ┌────────────┐                                               │
│  │  Canvas /  │                                               │
│  │OffscreenCvs│                                               │
│  └─────┬──────┘                                               │
│        │ requestAnimationFrame                                 │
│        ▼                                                      │
│  ┌──────────────┐    ┌────────────────┐    ┌──────────────┐  │
│  │  VideoFrame  │───►│ WebCodecs      │───►│  Mediabunny  │  │
│  │  creation    │    │ VideoEncoder   │    │ MpegTsMuxer  │  │
│  └──────────────┘    │ (H.264 AnnexB) │    │ (M2TS output)│  │
│                      └────────────────┘    └──────┬───────┘  │
│  ┌──────────────┐    ┌────────────────┐           │          │
│  │  AudioContext│───►│ WebCodecs      │───►────────┘          │
│  │  Web MIDI    │    │ AudioEncoder   │  (muxed TS packets)  │
│  │  Oscillator  │    │ (AAC 48kHz)    │                      │
│  └──────────────┘    └────────────────┘           │          │
│                                                   ▼          │
│                                          ┌──────────────┐    │
│                                          │  Segmenter   │    │
│                                          │ (2-6s chunks)│    │
│                                          └──────┬───────┘    │
│                                                 │            │
│                                                 ▼            │
│  ┌───────────┐                          ┌──────────────┐    │
│  │  YouTube  │◄─── HTTP PUT segments ───│  HLSUploader │    │
│  │  Live API │                          └──────────────┘    │
│  └───────────┘                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan (For Agent Review)

### Packages

| Package | Purpose |
|---|---|
| `web2hls` | Core engine — framework-agnostic TypeScript library |
| `@web2hls/react` | React 19 integration — hooks, components, Actions |

---

### Phase 1: Core Engine (`web2hls`)

**Step 1.1: Project Scaffolding**
- Init TypeScript project with strict mode, targeting ES2022+
- Build: dual CJS/ESM via tsup
- Dependencies: `mediabunny` (muxing) — ZERO other runtime deps
- Dev deps: vitest, prettier, eslint, typedoc
- Monorepo: packages/web2hls + packages/react
- Structure:
  ```
  packages/web2hls/src/
    core/
      canvas-capture.ts        # Canvas/OffscreenCanvas → VideoFrame pipeline
      video-encoder.ts         # WebCodecs VideoEncoder wrapper
      audio-capture.ts         # Web Audio API → AudioData pipeline
      audio-encoder.ts         # WebCodecs AudioEncoder wrapper
      clock.ts                 # Shared monotonic clock for A/V sync
    mux/
      ts-muxer.ts              # Mediabunny MPEG-TS muxing bridge
      segmenter.ts             # TS packets → HLS segments
    delivery/
      hls-uploader.ts          # HTTP PUT segments to YouTube HLS endpoint
    youtube/
      auth.ts                  # OAuth2 PKCE browser flow
      api-client.ts            # YouTube Live Streaming REST API
    pipeline.ts                # Orchestrates capture → encode → mux → upload
    types.ts                   # Public types and interfaces
    index.ts                   # Public API exports
  ```

**Step 1.2: Shared Clock** (`clock.ts`)
- Single `MonotonicClock` class — source of truth for all timestamps
- `now(): number` returns microseconds since pipeline start
- Shared between video encoder, audio encoder, and segmenter
- Ensures A/V sync: both encoders use the same clock, not `performance.now()` independently
- Reset capability for pipeline restart

**Step 1.3: Canvas Capture** (`canvas-capture.ts`)
- Accept `HTMLCanvasElement` or `OffscreenCanvas`
- `requestAnimationFrame` loop at target FPS (default 30)
- Create `VideoFrame` from canvas each frame
- Timestamp from shared clock
- Backpressure: check `encoder.encodeQueueSize` — drop frames when queue > 2
- Configurable: `fps`, `width`, `height` (resolution scaling if canvas size differs)
- Clean start/stop with `AbortController`
- Emit `VideoFrame` via callback

**Step 1.4: Video Encoder** (`video-encoder.ts`)
- Wrap `VideoEncoder` with lifecycle:
  ```
  configure → encode(frame) → [output: EncodedVideoChunk] → close
  ```
- Default config:
  ```typescript
  {
    codec: 'avc1.640028',           // H.264 High Profile, Level 4.0
    width: 1920,
    height: 1080,
    bitrate: 5_000_000,             // 5 Mbps
    framerate: 30,
    latencyMode: 'realtime',        // Low-latency encoding
    avc: { format: 'annexb' }       // Stream-friendly NAL units
  }
  ```
- Codec string resolution: try High profile first, fall back to Main, then Baseline
  - `avc1.640028` (High 4.0) → `avc1.4D401F` (Main 3.1) → `avc1.42E01E` (Baseline 3.0)
- Keyframe control: force keyframe every `segmentDuration` seconds (aligned to segment boundaries)
- Emit `EncodedVideoChunk` + metadata via callback
- Error handling: `UnsupportedError` → try fallback codec; `EncodingError` → reconfigure

**Step 1.5: Audio Capture** (`audio-capture.ts`)
- NO microphone/getUserMedia — browser audio sources only
- Accept input from:
  - `AudioContext` (any node graph — oscillators, buffers, game audio)
  - `MediaStreamTrack` from `AudioContext.createMediaStreamDestination()`
  - Web MIDI → custom AudioNode rendering
  - `HTMLAudioElement` / `AudioBufferSourceNode`
- Use `AudioData` from `MediaStreamTrackProcessor` (Insertable Streams API)
- Fallback: `ScriptProcessorNode` / `AudioWorkletNode` → raw PCM → `AudioData`
- Resample to 48kHz via `OfflineAudioContext` if needed
- Timestamp from shared clock
- Emit `AudioData` frames via callback

**Step 1.6: Audio Encoder** (`audio-encoder.ts`)
- Wrap `AudioEncoder` with lifecycle
- Config:
  ```typescript
  {
    codec: 'mp4a.40.2',    // AAC-LC
    sampleRate: 48000,
    numberOfChannels: 2,
    bitrate: 128000         // 128 kbps
  }
  ```
- Accept `AudioData` from audio capture
- Emit `EncodedAudioChunk` via callback
- Sync timestamps via shared clock

**Step 1.7: MPEG-TS Muxer Bridge** (`ts-muxer.ts`)
- Integrate Mediabunny:
  ```typescript
  import { Output, MpegTsOutputFormat, StreamTarget } from 'mediabunny';
  ```
- Create output with `MpegTsOutputFormat` + `StreamTarget`
- Bridge WebCodecs → Mediabunny packet format:
  - `EncodedVideoChunk` → video packet (type: 'key' | 'delta')
  - `EncodedAudioChunk` → audio packet
- Stream callback receives 188-byte TS packets
- PAT/PMT handling: let Mediabunny manage automatically
- Self-initializing segments: ensure PAT/PMT at segment boundaries

**Step 1.8: HLS Segmenter** (`segmenter.ts`)
- Buffer incoming TS packets into segments
- **Segment boundary**: triggered by video keyframe aligned to `segmentDuration` interval
- Configurable `segmentDuration` (default 4s, range 1-10s)
- Each segment is self-contained:
  - Starts with PAT/PMT
  - Contains complete GOP (group of pictures)
- Emit segment events:
  ```typescript
  interface HLSSegment {
    index: number;
    data: Uint8Array;
    duration: number;       // seconds
    timestamp: number;      // microseconds from clock
  }
  ```
- Rolling window: keep last 3 segments in memory for potential re-upload
- Segment naming: sequential (`seg_0001.ts`)

**Step 1.9: Pipeline Orchestrator** (`pipeline.ts`)
- Wire together: capture → encoder → muxer → segmenter
- Lifecycle states: `idle` → `configuring` → `ready` → `streaming` → `stopping` → `stopped` → `error`
- Public API:
  ```typescript
  const pipeline = new StreamingPipeline({
    canvas: document.getElementById('my-canvas'),
    audioContext: myAudioContext,
    video: { width: 1920, height: 1080, bitrate: 5_000_000, fps: 30 },
    audio: { bitrate: 128000 },
    segmentDuration: 4,  // seconds
    onSegment: (segment) => { /* called per segment */ }
  });

  await pipeline.start();
  // pipeline.stop()
  // pipeline.state
  // pipeline.stats → { bitrate, fps, droppedFrames, segmentsUploaded }
  ```

---

### Phase 2: YouTube Integration

**Step 2.1: OAuth2 Auth** (`auth.ts`)
- PKCE flow for browser (no client secret)
- Google Identity Services library or manual PKCE
- Required scope: `https://www.googleapis.com/auth/youtube`
- Token storage: `localStorage` with refresh token handling
- Auto-refresh before expiry

**Step 2.2: YouTube API Client** (`api-client.ts`)
- Methods:
  ```typescript
  createStream(options: { ingestionType: 'hls', resolution: string, frameRate: string }): Promise<StreamResource>
  createBroadcast(options: { title: string, description?: string, scheduledStartTime: string, privacyStatus?: string }): Promise<BroadcastResource>
  bindBroadcast(broadcastId: string, streamId: string): Promise<void>
  transitionBroadcast(broadcastId: string, status: 'testing' | 'live' | 'complete'): Promise<void>
  getStreamStatus(streamId: string): Promise<StreamStatus>
  ```
- Returns: stream key, HLS ingestion URL (`cdn.ingestionInfo.hlsIngestionAddress`)
- Error handling: quota limits, auth failures, stream conflicts

**Step 2.3: HLS Uploader** (`hls-uploader.ts`)
- HTTP PUT each segment to YouTube's HLS ingestion URL
- Sequential ordered upload (HLS spec requires ordered segments)
- Retry with exponential backoff (max 3 retries per segment)
- Content-Type: `video/MP2TS`
- Upload timing: fire immediately when segment is complete
- Track upload status per segment
- Expose upload metrics: bytes sent, upload duration, failures

---

### Phase 3: React 19 Integration (`@web2hls/react`)

**Step 3.1: Package Setup**
- Separate package: `@web2hls/react`
- Peer deps: `react@^19.0.0`, `react-dom@^19.0.0`
- Dep: `web2hls` (workspace reference)

**Step 3.2: React 19 Hooks**

`useStreamPipeline(options)`:
- Creates and manages `StreamingPipeline` lifecycle
- Returns: `{ start, stop, state, stats, error }`
- Uses `useSyncExternalStore` for state subscription
- Cleanup: stops pipeline on unmount

`useCanvasStream(canvasRef, options)`:
- Binds pipeline to a canvas ref
- Auto-detects canvas resize
- Returns: `{ start, stop, state, stats }` + spreads canvas props

`useYouTubeAuth(clientId)`:
- Manages OAuth2 PKCE flow state
- Returns: `{ isAuthenticated, accessToken, login, logout }`
- Persists token in `localStorage`

`useYouTubeBroadcast(options)`:
- Wraps YouTube API client
- React 19 Action for broadcast lifecycle:
  ```typescript
  const { broadcast, createStream, goLive, endStream, state } = useYouTubeBroadcast();
  ```
- `useOptimistic` for immediate UI feedback on state transitions

`useStreamHealth()`:
- Read from pipeline stats
- Returns: `{ bitrate, fps, droppedFrames, segmentCount, uploadLatency }`

**Step 3.3: React 19 Components**

`<StreamCanvas>`:
```tsx
<StreamCanvas
  width={1920}
  height={1080}
  fps={30}
  segmentDuration={4}
  onDraw={(ctx, timestamp) => { /* user rendering */ }}
/>
```
- Renders canvas with streaming overlay
- Accepts `onDraw` callback for custom rendering (game loop, animation)
- Built-in FPS counter / bitrate overlay (togglable)

`<StreamControls>`:
- React 19 Actions pattern for start/stop
- `useFormStatus` for button loading states
- `startTransition` for non-blocking state updates
```tsx
function StreamControls() {
  const { start, stop, state } = useStreamPipeline();
  const { pending } = useFormStatus();

  return (
    <form action={state === 'streaming' ? stop : start}>
      <button type="submit" disabled={pending}>
        {pending ? '...' : state === 'streaming' ? 'Stop' : 'Go Live'}
      </button>
    </form>
  );
}
```

`<YouTubeSetup>`:
- OAuth login button + broadcast configuration form
- React 19 Actions for form submission
- `useActionState` for form state management:
```tsx
const [state, submitAction, isPending] = useActionState(async (prevState, formData) => {
  const title = formData.get('title');
  await createBroadcast({ title, scheduledStartTime: new Date().toISOString() });
  return { success: true };
}, { success: false });
```

`<StreamHealth>`:
- Real-time dashboard: bitrate graph, FPS, dropped frames, segment uploads
- Uses `useSyncExternalStore` for live stats

`<StreamProvider>`:
- Context provider wrapping all stream state
- Provides pipeline instance + YouTube client to children
- Manages cleanup on unmount

**Step 3.4: React 19 Patterns Used**

| Feature | Usage |
|---|---|
| **Actions** | Start/stop stream, create broadcast, OAuth login — all async transitions |
| **`useActionState`** | Form state for broadcast setup (title, description, privacy) |
| **`useOptimistic`** | Immediate "Going live..." before API confirms |
| **`useFormStatus`** | Button pending states during stream start/stop |
| **`startTransition`** | Non-blocking updates for stats/health displays |
| **`useSyncExternalStore`** | Subscribe to pipeline state + stats (external store) |
| **`use()`** | Load YouTube stream config from Promise during render |
| **`ref` as prop** | Canvas ref forwarding without `forwardRef` |

---

### Phase 4: Testing

**Step 4.1: Unit Tests**
- Clock: monotonic timestamp generation, reset
- Video encoder: codec string fallback, queue management
- Audio capture: resampling, timestamp sync
- Segmenter: segment boundary detection, PAT/PMT per segment
- HLS uploader: retry logic, backoff

**Step 4.2: Integration Tests**
- Full pipeline: mock canvas → VideoFrame → encoded chunk → TS packets → segments
- Verify segment structure: valid MPEG-TS headers, self-initializing
- A/V sync verification: timestamp alignment within tolerance

**Step 4.3: Browser Tests**
- Playwright test: load page, start pipeline, verify segments emit
- Cross-browser: Chrome, Firefox, Safari (WebCodecs support check)
- Memory: verify no leaks over 10-minute streaming session

**Step 4.4: Manual E2E**
- Stream to YouTube test channel
- Verify playback on YouTube
- Measure end-to-end latency

---

### Phase 5: Documentation & Publishing

**Step 5.1: Documentation**
- TypeDoc API reference
- Getting started guide with code examples
- Architecture diagram
- Audio integration guide (Web Audio, Web MIDI, game audio)
- YouTube API setup guide (OAuth, creating streams)

**Step 5.2: Example Apps**
- `examples/minimal/` — bare canvas streaming
- `examples/game-audio/` — canvas game + Web Audio API
- `examples/midi-instrument/` — Web MIDI + visual canvas

**Step 5.3: Publishing**
- `web2hls` — core engine
- `@web2hls/react` — React 19 integration

---

### Dependencies

| Package | Purpose | Size |
|---|---|---|
| `mediabunny` | MPEG-TS muxing | 5-50 KB |
| *(zero other runtime deps)* | | |

---

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Mediabunny MPEG-TS streaming API gaps | Medium | High | Test streaming API first in Phase 1.7; fallback: custom TS packetizer (PAT/PMT/PES from spec) |
| YouTube HLS ingest unreliability | Low | High | Test early with real YouTube stream; monitor YouTube API changelog |
| H.264 hardware encoder unavailable | Low | Medium | Codec string fallback chain (High → Main → Baseline); software encoder fallback via `latencyMode` |
| Audio-video sync drift | Medium | Medium | Shared `MonotonicClock`; periodic keyframe-aligned resync |
| Browser memory pressure | Medium | Medium | Frame pool recycling; `VideoFrame.close()` after encode; segment GC after upload |
| Web Audio `MediaStreamTrackProcessor` not available in Safari | Medium | High | Fallback to `AudioWorkletNode` → raw PCM → `AudioData` for Safari |
| YouTube OAuth PKCE flow complexity | Low | Low | Use Google Identity Services library; well-documented flow |

### Key Technical Risks to Validate Early

1. **Mediabunny `MpegTsOutputFormat` + `StreamTarget` API** — validate in Step 1.7 that real-time streaming output works correctly and produces valid M2TS
2. **YouTube HLS PUT endpoint** — validate in Step 2.3 that HTTP PUT of MPEG-TS segments to `hlsIngestionAddress` is accepted
3. **Safari `MediaStreamTrackProcessor`** — validate audio capture fallback works

---

### File Dependency Graph

```
clock.ts ←────────────────────┐
  ↑                           │
canvas-capture.ts ──► video-encoder.ts ──┐
                                        ├──► ts-muxer.ts ──► segmenter.ts ──► hls-uploader.ts
audio-capture.ts  ──► audio-encoder.ts ──┘
                                              │
youtube/auth.ts ──► youtube/api-client.ts ────┘
                                              │
                                    pipeline.ts (orchestrates all)
```

---

### Acceptance Criteria

- [ ] Can capture canvas at 30fps with < 5% frame drops
- [ ] Produces valid MPEG-TS segments playable in VLC
- [ ] Segments are self-initializing (each contains PAT/PMT)
- [ ] Audio and video are synchronized within ±50ms
- [ ] HTTP PUT of segments to YouTube HLS endpoint succeeds
- [ ] Live playback visible on YouTube with < 15s latency
- [ ] Memory usage stable over 30-minute stream (no leaks)
- [ ] React hooks follow React 19 patterns (Actions, useActionState, etc.)
- [ ] Bundle size < 60KB gzipped (core + React)
- [ ] Works in Chrome 94+, Firefox 130+, Safari 26+
