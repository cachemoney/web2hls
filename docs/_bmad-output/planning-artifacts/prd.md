---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-01b-continue, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish]
inputDocuments:
  - docs/_bmad-output/brainstorming/brainstorming-session-2026-04-21-170000.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
classification:
  projectType: developer_tool
  domain: media_streaming
  complexity: medium
  projectContext: greenfield
---

# Product Requirements Document - web2hls

**Author:** Mezmo
**Date:** 2026-04-21

## Executive Summary

`web2hls` is a React-centric developer tool designed to bridge the gap between dynamic browser-based content—specifically HTML canvas and synthesized Web Audio—and live streaming platforms like YouTube. Traditional solutions often rely on heavyweight server-side relay infrastructure or inefficient client-side transcoding. `web2hls` provides a pure browser-based pipeline that leverages the WebCodecs API for high-performance encoding and the Mediabunny library for MPEG-TS muxing. By utilizing YouTube's HLS ingestion endpoint, it enables direct HTTP PUT streaming without a middleman, empowering developers to create low-latency, high-fidelity live experiences (games, instruments, creative tools) with zero backend overhead.

### What Makes This Special

Unlike existing PoCs that rely on `MediaRecorder` or `ffmpeg.wasm` (which suffer from performance bottlenecks and container compatibility issues), `web2hls` uses a modern, tree-shakable architecture:
- **Zero Server Infrastructure:** Direct browser-to-YouTube streaming via HLS PUT.
- **Synthesized Audio Focus:** Native support for Web Audio API and Web MIDI, bypassing the need for microphone permissions and enabling pixel-perfect A/V sync.
- **React 19 Native:** Built from the ground up to utilize React 19's `Actions`, `useActionState`, and `useSyncExternalStore`, making it the most ergonomic streaming library for modern web applications.
- **Performance:** Optimized WebCodecs integration with backpressure handling ensures smooth 30+ FPS capture on standard hardware.

## Project Classification

- **Type:** Developer Tool / Library
- **Domain:** Media Streaming / Web Graphics
- **Complexity:** Medium (Requires deep integration with browser APIs and OAuth2 flows)
- **Context:** Greenfield (New architecture leveraging emerging browser standards)

## Success Criteria

### User Success
- **"It Just Works":** A developer can initialize a stream and go live on YouTube in under 10 lines of code.
- **Visual Fidelity:** Viewers on YouTube experience a smooth, high-quality stream that matches the source canvas animations without stuttering.
- **Zero-Config Infrastructure:** Users feel the "magic" of not needing a backend relay or OBS to go live from their web app.

### Business Success
- **Developer Adoption:** Reaching 500+ stars on GitHub within 6 months of release, indicating strong interest in the "pure browser" niche.
- **Ecosystem Growth:** At least 3 high-quality community examples (games or creative tools) built using the library within the first quarter.
- **Low Support Overhead:** Documentation is clear enough that common issues (CORS, YouTube API setup) are solved by users independently.

### Technical Success
- **Frame Stability:** Maintain 30+ FPS capture on mid-range hardware with < 5% frame drops.
- **A/V Sync:** Audio and video remain synchronized within ±50ms over a 60-minute streaming session.
- **Bundle Efficiency:** The combined library footprint (core + React) remains under 60KB gzipped.
- **Reliability:** Successful recovery from transient network interruptions via exponential backoff for HLS PUT uploads.

### Measurable Outcomes
- **Time to First Stream:** < 15 minutes from `npm install` to seeing a live video on YouTube.
- **Latency:** End-to-end latency (canvas to YouTube player) under 15 seconds using HLS ingest.
- **Compatibility:** Pass automated tests on Chrome 94+, Firefox 130+, and Safari 26+.

## Product Scope

### MVP - Minimum Viable Product
- Core `web2hls` engine (WebCodecs + Mediabunny).
- Canvas/OffscreenCanvas video capture.
- Web Audio API synthesized audio capture.
- YouTube OAuth2 PKCE flow.
- YouTube Live API integration (Create/Bind/Stream).
- Basic React 19 hooks (`useStreamPipeline`).
- Single example app (Minimal Canvas).

### Growth Features (Post-MVP)
- Custom HLS segment duration tuning.
- Support for multiple audio sources (Mixing).
- Reusable React 19 UI components (`<StreamCanvas>`, `<StreamHealth>`).
- Advanced health dashboard/telemetry.
- Support for other HLS ingest providers (Twitch, custom RTMP/HLS relays).

### Vision (Future)
- Multi-track video (Picture-in-Picture).
- Real-time client-side overlays (Watermarks, dynamic text).
- "Browser-only" recording to file (MP4/MKV) using same pipeline.
- Integration with standard WebRTC sources for hybrid streaming.

## User Journeys

### Journey 1: Alex the Game Dev — "The Zero-Config Stream"

**Opening Scene:** Alex has built a beautiful generative art game in React. Players want to stream their sessions to YouTube, but Alex is dreading setting up an RTMP relay server and managing Docker containers.

**Rising Action:** Alex finds `web2hls`. They run `npm install web2hls`, add the `useStreamPipeline` hook to their game canvas, and use the built-in YouTube login component. There’s no backend to configure.

**Climax:** Alex hits "Go Live." Within seconds, the browser is encoding H.264 video and AAC audio directly. Alex checks their YouTube studio dashboard and see the "Excellent Connection" green light.

**Resolution:** Alex’s game now has a "Stream to YouTube" button that actually works. They didn't have to write a single line of backend code, and the A/V sync is perfect because it's all happening on the same clock.

---

### Journey 2: Sam the Viewer — "High-Fidelity Interaction"

**Opening Scene:** Sam is watching Alex's live stream. Usually, browser streams are laggy or look like low-res GIFs because of the relay lag.

**Rising Action:** Sam notices the stream quality is surprisingly sharp. The audio—generated by a Web MIDI synthesizer in the game—is crisp and perfectly aligned with the visual notes appearing on the canvas.

**Climax:** Sam uses the chat to interact with the game. Because Alex is using HLS ingest with optimized segment durations, Sam sees their interaction reflected on the stream with much lower latency than they expected for an HLS broadcast.

**Resolution:** Sam stays longer and interacts more because the stream feels "alive" and high-quality, vindicating Alex's choice of `web2hls`.

---

### Journey 3: Terry the Tech Lead — "The Feasibility Check"

**Opening Scene:** Terry needs to ensure `web2hls` won't crash the company's creative platform or leak memory during long sessions.

**Rising Action:** Terry integrates the `@web2hls/react` health dashboard into a staging environment. They monitor the `useStreamHealth` hook, watching for frame drops and memory spikes during a 2-hour stress test.

**Climax:** Terry deliberately throttles the network. They watch as the `hls-uploader` retries with exponential backoff and the `canvas-capture` logic drops frames to handle backpressure without crashing the browser tab.

**Resolution:** Terry approves the library for production. The small gzipped size and robust error handling satisfy the platform's strict performance and reliability requirements.

### Journey Requirements Summary

These journeys reveal several critical capability areas:
- **Simplified Auth:** Need for a "drop-in" OAuth2 PKCE component for developers (Alex).
- **Performance Telemetry:** A robust health/stats hook for monitoring (Terry).
- **Backpressure Management:** Intelligent frame-dropping logic to prevent browser crashes (Terry).
- **Low-Latency HLS:** Configurable segmenting to optimize the viewer experience (Sam).
- **Audio-Visual Sync:** A shared internal clock to ensure synthesized audio matches canvas video (Sam).

## Domain-Specific Requirements

### Compliance & Regulatory
- **YouTube API Services TOS:** Strict adherence to Google's terms, particularly regarding data privacy (OAuth2 scopes) and prohibited uses (no automated/bot streaming without explicit permission).
- **Data Privacy (GDPR/CCPA):** Although the engine is client-side, the handling of OAuth tokens must follow best practices for secure storage in `localStorage` or `sessionStorage`.
- **Copyright Compliance:** Integration should include standard disclaimers for developers to ensure they have rights to the audio/visual content being streamed.

### Technical Constraints
- **WebCodecs Browser Support:** The library must provide robust feature detection, as WebCodecs is a relatively new standard with varying levels of codec support (e.g., Safari's limited H.264 profile support).
- **Network Stability:** HLS ingestion requires ordered, sequential delivery of segments. The uploader must handle the "Lossy" nature of browser networking without corrupting the stream timeline.
- **CPU/Thermal Throttling:** Real-time video encoding is resource-intensive. The library must detect and respond to browser-level thermal throttling to prevent system hangs.

### Integration Requirements
- **OAuth2 PKCE:** Must use the PKCE flow for browser-based applications to avoid exposing client secrets.
- **MPEG-TS/HLS Standards:** Segments must strictly follow the ISO/IEC 13818-1 (MPEG-TS) and HLS (HTTP Live Streaming) specifications to ensure compatibility with YouTube's ingest servers.

### Risk Mitigations
- **A/V Drift:** Use a shared monotonic clock to re-sync audio and video timestamps at every keyframe boundary (Risk: Loss of sync over long sessions).
- **API Quota Exhaustion:** Implement intelligent caching of stream/broadcast resources to minimize unnecessary calls to the YouTube Data API (Risk: Stream failing to start due to Google API limits).
- **Memory Leaks:** Explicitly call `.close()` on all `VideoFrame` and `AudioData` objects immediately after encoding (Risk: Tab crash after 10-15 minutes of streaming).

## Innovation & Novel Patterns

### Detected Innovation Areas
- **Serverless Streaming Pipeline:** The core innovation is the removal of the traditional "Relay Server" (OBS/FFmpeg/RTMP relay) from the architecture. By performing muxing (Mediabunny) and HLS segmenting in the browser, `web2hls` creates a decentralized streaming model.
- **Pixel-Perfect A/V Synchronization:** Utilizing a shared monotonic clock across WebCodecs' `VideoEncoder` and `AudioEncoder` ensures that synthesized browser audio (Web MIDI/Web Audio) is perfectly aligned with canvas visuals, a historically difficult feat in web-based video production.
- **React 19 Integration Patterns:** Leveraging React 19's `Actions` and `useSyncExternalStore` for a media pipeline is a novel application of these new primitives, providing a blueprint for high-performance React-native developer tools.

### Market Context & Competitive Landscape
- **Current Alternatives:** Most solutions (e.g., `streamana`, `Wocket`) are either proofs-of-concept or rely on `ffmpeg.wasm`, which is too heavy and slow for real-time 30+ FPS encoding on most client hardware.
- **Differentiator:** `web2hls` is the first to use the **Mediabunny + HLS PUT** approach, which is significantly more lightweight and performant than WASM-based transcoding.

### Validation Approach
- **Latency Benchmarking:** Measure the end-to-end "glass-to-glass" latency against traditional RTMP-to-HLS relay setups.
- **Thermal Performance Testing:** Validate that long-running encoding sessions (30+ mins) don't trigger extreme CPU throttling on standard laptops.
- **Compatibility Matrix:** Test across the "big three" browser engines (Chromium, Gecko, WebKit) to verify WebCodecs feature parity.

### Risk Mitigation
- **Fallback Codec Chain:** If the preferred H.264 profile is unavailable, the library automatically falls back to Main or Baseline profiles.
- **Network Backpressure:** If the `hls-uploader` detects slow PUT responses, the `canvas-capture` logic will intelligently drop frames to prevent memory exhaustion.

## Developer Tool Specific Requirements

### Project-Type Overview
`web2hls` is a multi-package monorepo consisting of a core engine (`web2hls`) and a React integration layer (`@web2hls/react`). It targets modern browsers with WebCodecs support and provides a high-level API for media production.

### Technical Architecture Considerations
- **Language Support:** Pure TypeScript for both packages, targeting ES2022+ to leverage modern browser features and class syntax.
- **Package Managers:** Standard NPM/PNPM/Yarn support; dual CJS/ESM distribution via `tsup`.
- **API Surface:**
  - `web2hls`: Class-based orchestrator (`StreamingPipeline`) and functional capture/encode primitives.
  - `@web2hls/react`: Hook-based state management and React 19 Action wrappers.

### Required Matrix & Specs

#### Language & Environment Matrix
| Environment | Support Level | Notes |
|---|---|---|
| **Chrome / Edge** | Full (v94+) | Primary target; hardware H.264 support is standard. |
| **Firefox** | Full (v130+) | WebCodecs support recently stabilized. |
| **Safari** | Partial (v26+) | Requires fallback logic for specific H.264 profiles. |
| **React** | 19.0+ | Mandatory peer dependency for `@web2hls/react`. |

#### Installation Methods
- `npm install web2hls` (Core)
- `npm install @web2hls/react` (React 19 integration)

#### API Surface & Usage
The library will expose a "Layered API" approach:
1. **Low-Level:** Direct access to Encoders and Muxers for advanced users.
2. **Mid-Level:** `StreamingPipeline` class for framework-agnostic usage.
3. **High-Level:** React 19 Hooks and Components for rapid development.

#### Code Examples (Proposed)
```typescript
// React 19 Usage Example
import { useStreamPipeline } from '@web2hls/react';

function MyGame() {
  const { start, state } = useStreamPipeline({
    canvasRef,
    youtubeClientId: '...'
  });

  return <button action={start}>{state === 'idle' ? 'Go Live' : '...'}</button>;
}
```

### Implementation Considerations
- **Documentation:** Built with TypeDoc for API reference and VitePress for the user guide.
- **Examples:** A dedicated `examples/` directory in the monorepo showcasing Canvas, Web Audio, and MIDI integrations.
- **Migration Guide:** Since this is v1.0, the guide will focus on migrating from legacy `MediaRecorder` or `ffmpeg.wasm` approaches.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy
**MVP Approach:** Validated Learning. Focus on the core HLS PUT pipeline and React 19 integration to prove feasibility and performance.
**Resource Requirements:** 1-2 Senior Frontend/Media Engineers with expertise in WebCodecs and React 19.

### MVP Feature Set (Phase 1)
**Core User Journeys Supported:**
- **Journey 1 (Alex):** Setup, auth, and basic "Go Live" from a single canvas.
- **Journey 2 (Sam):** High-fidelity viewing on YouTube with stable A/V sync.

**Must-Have Capabilities:**
- Canvas/OffscreenCanvas capture @ 30fps.
- Synchronized Web Audio capture.
- WebCodecs (H.264/AAC) encoding with profile fallback.
- Mediabunny MPEG-TS muxing.
- YouTube OAuth2 PKCE Flow + Live API Client.
- HLS Segmenter + Ordered HTTP PUT uploader.
- Basic React 19 Hooks (`useStreamPipeline`).

### Post-MVP Features
**Phase 2 (Growth):**
- **Multi-Source Mixing:** Combine multiple audio nodes or canvas overlays.
- **React 19 Component Library:** Drop-in `<StreamCanvas>` and `<StreamHealth>` dashboard.
- **Custom HLS Tuning:** User-configurable segment durations for latency optimization.
- **Enhanced Telemetry:** Real-time bitrate/thermal monitoring via `useSyncExternalStore`.

**Phase 3 (Expansion):**
- **Multi-Platform Ingest:** Support for Twitch (RTMP/HLS) and custom relay endpoints.
- **Local Recording:** "Record to Disk" (MP4/MKV) using the same high-performance pipeline.
- **Client-Side Overlays:** Real-time watermarking and text injection.

### Risk Mitigation Strategy
**Technical Risks:** Thermal throttling and A/V drift are high risks. **Mitigation:** Shared monotonic clock and aggressive `VideoFrame.close()` garbage collection.
**Market Risks:** YouTube API changes or TOS restrictions. **Mitigation:** Modular API client design and clear TOS compliance documentation.
**Resource Risks:** Complexity of MPEG-TS spec. **Mitigation:** Dependency on `mediabunny` (v1.40+) to handle the heavy lifting of muxing.

## Functional Requirements

### Media Capture & Clock Management
- **FR1:** The system can capture raw video frames from an HTML5 `Canvas` or `OffscreenCanvas` element.
- **FR2:** The system can capture synchronized audio data from a browser `AudioContext`.
- **FR3:** The system can maintain a shared monotonic clock to synchronize video and audio timestamps.
- **FR4:** The system can detect and report browser-level backpressure (e.g., encoder queue size) to the capture loop.
- **FR5:** The system can intelligently drop video frames during capture to prevent memory exhaustion and maintain synchronization.

### Encoding & Muxing
- **FR6:** The system can encode raw video frames into H.264 (AVC) NAL units using the WebCodecs API.
- **FR7:** The system can encode raw audio frames into AAC bitstreams using the WebCodecs API.
- **FR8:** The system can automatically fall back to alternative H.264 profiles (e.g., High to Main to Baseline) if the preferred profile is unsupported.
- **FR9:** The system can mux encoded video and audio bitstreams into MPEG-TS (M2TS) packets.
- **FR10:** The system can ensure that every MPEG-TS segment begins with the necessary Program Association Table (PAT) and Program Map Table (PMT) metadata.
- **FR11:** The system can enforce video keyframe placement to align with configured HLS segment boundaries.

### HLS Segmenting & Delivery
- **FR12:** The system can buffer MPEG-TS packets into discrete HLS segments based on a configurable duration.
- **FR13:** The system can deliver HLS segments sequentially to a remote endpoint via HTTP PUT.
- **FR14:** The system can manage a rolling window of recent HLS segments to handle retry attempts.
- **FR15:** The system can recover from transient network upload failures using an exponential backoff retry strategy.

### Platform Integration (YouTube)
- **FR16:** The system can authenticate users with the YouTube API using the OAuth2 PKCE browser-based flow.
- **FR17:** The system can create and configure YouTube Live "Stream" and "Broadcast" resources.
- **FR18:** The system can bind a YouTube broadcast to a specific live stream.
- **FR19:** The system can transition the state of a YouTube broadcast (e.g., from 'testing' to 'live' to 'complete').
- **FR20:** The system can retrieve and monitor the real-time health status of a YouTube ingestion point.

### Developer & React Integration
- **FR21:** Developers can initialize and control the streaming pipeline via a framework-agnostic TypeScript API.
- **FR22:** React developers can manage the pipeline lifecycle using a specialized `useStreamPipeline` hook.
- **FR23:** React developers can subscribe to real-time pipeline telemetry (e.g., bitrate, FPS, dropped frames) using a standard state synchronization hook.
- **FR24:** Developers can provide custom React Actions to handle streaming lifecycle transitions (Start/Stop).
- **FR25:** The system can provide a drop-in React component for OAuth2 authentication and broadcast setup.

### Monitoring & Telemetry
- **FR26:** The system can calculate and expose real-time bitrate metrics for audio and video streams.
- **FR27:** The system can monitor and expose encoder performance metrics, including frame drop counts and encoding latency.
- **FR28:** The system can detect and report browser thermal throttling events that may impact streaming performance.

## Non-Functional Requirements

### Performance
- **Capture Efficiency:** The video capture loop must execute in under 16ms (for 60fps) or 32ms (for 30fps) to avoid blocking the main browser thread.
- **Encoding Latency:** The time from `VideoFrame` creation to `EncodedVideoChunk` output must be less than 100ms on mid-range hardware.
- **Upload Reliability:** The system must successfully recover from a 5-second total network outage without dropping the HLS stream session.
- **Bundle Size:** The core library must be under 30KB gzipped, and the React integration under 20KB gzipped, ensuring fast page loads for developers' users.

### Security
- **Credential Storage:** OAuth2 access and refresh tokens must never be stored in plaintext; implementation should default to `sessionStorage` or encrypted `localStorage`.
- **API Scope Minimization:** The system must only request the minimum required YouTube OAuth scopes (`https://www.googleapis.com/auth/youtube.readonly` or `.upload`) to minimize the security footprint.
- **Data Privacy:** The library must operate entirely client-side, ensuring that no user video or audio data ever passes through a `web2hls`-owned server.

### Reliability & Resilience
- **A/V Drift Tolerance:** The shared clock must ensure that audio and video never drift more than ±50ms apart over a continuous 4-hour streaming session.
- **Memory Management:** The system must maintain a stable memory heap size (within ±10% of start) over long sessions by aggressively recycling media objects.
- **Error Recovery:** In the event of a fatal encoding error, the system must provide a clean state reset within 2 seconds to allow for an immediate stream restart attempt.

### Integration
- **HLS Compliance:** All produced segments must be 100% compliant with the HTTP Live Streaming (HLS) specification to ensure cross-platform player compatibility.
- **React Compatibility:** The library must be fully compatible with React 18 and 19 "Concurrent Mode" and "Server Components" patterns.





