---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - docs/_bmad-output/planning-artifacts/prd.md
  - docs/_bmad-output/planning-artifacts/architecture.md
  - docs/_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-28.md
---

# web2hls - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for web2hls, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The system can capture raw video frames from an HTML5 Canvas or OffscreenCanvas element.
FR2: The system can capture synchronized audio data from a browser AudioContext.
FR3: The system can maintain a shared monotonic clock to synchronize video and audio timestamps.
FR4: The system can detect and report browser-level backpressure (e.g., encoder queue size) to the capture loop.
FR5: The system can intelligently drop video frames during capture to prevent memory exhaustion and maintain synchronization.
FR6: The system can encode raw video frames into H.264 (AVC) NAL units using the WebCodecs API.
FR7: The system can encode raw audio frames into AAC bitstreams using the WebCodecs API.
FR8: The system can automatically fall back to alternative H.264 profiles (e.g., High to Main to Baseline) if the preferred profile is unsupported.
FR9: The system can mux encoded video and audio bitstreams into MPEG-TS (M2TS) packets.
FR10: The system can ensure that every MPEG-TS segment begins with the necessary Program Association Table (PAT) and Program Map Table (PMT) metadata.
FR11: The system can enforce video keyframe placement to align with configured HLS segment boundaries.
FR12: The system can buffer MPEG-TS packets into discrete HLS segments based on a configurable duration.
FR13: The system can deliver HLS segments sequentially to a remote endpoint via HTTP PUT.
FR14: The system can manage a rolling window of recent HLS segments to handle retry attempts.
FR15: The system can recover from transient network upload failures using an exponential backoff retry strategy.
FR16: The system can authenticate users with the YouTube API using the OAuth2 PKCE browser-based flow.
FR17: The system can create and configure YouTube Live "Stream" and "Broadcast" resources.
FR18: The system can bind a YouTube broadcast to a specific live stream.
FR19: The system can transition the state of a YouTube broadcast (e.g., from 'testing' to 'live' to 'complete').
FR20: The system can retrieve and monitor the real-time health status of a YouTube ingestion point.
FR21: Developers can initialize and control the streaming pipeline via a framework-agnostic TypeScript API.
FR22: React developers can manage the pipeline lifecycle using a specialized useStreamPipeline hook.
FR23: React developers can subscribe to real-time pipeline telemetry (e.g., bitrate, FPS, dropped frames) using a standard state synchronization hook.
FR24: Developers can provide custom React Actions to handle streaming lifecycle transitions (Start/Stop).
FR25: The system can provide a drop-in React component for OAuth2 authentication and broadcast setup.
FR26: The system can calculate and expose real-time bitrate metrics for audio and video streams.
FR27: The system can monitor and expose encoder performance metrics, including frame drop counts and encoding latency.
FR28: The system can detect and report browser thermal throttling events that may impact streaming performance.

### NonFunctional Requirements

NFR1: The video capture loop must execute in under 16ms (for 60fps) or 32ms (for 30fps) to avoid blocking the main browser thread.
NFR2: The time from VideoFrame creation to EncodedVideoChunk output must be less than 100ms on mid-range hardware.
NFR3: The system must successfully recover from a 5-second total network outage without dropping the HLS stream session.
NFR4: The core library must be under 30KB gzipped, and the React integration under 20KB gzipped.
NFR5: OAuth2 access and refresh tokens must never be stored in plaintext; implementation should default to sessionStorage or encrypted localStorage.
NFR6: The system must only request the minimum required YouTube OAuth scopes (youtube.readonly or .upload).
NFR7: The library must operate entirely client-side, ensuring that no user video or audio data ever passes through a web2hls-owned server.
NFR8: The shared clock must ensure that audio and video never drift more than ±50ms apart over a continuous 4-hour streaming session.
NFR9: The system must maintain a stable memory heap size (within ±10% of start) over long sessions by aggressively recycling media objects.
NFR10: In the event of a fatal encoding error, the system must provide a clean state reset within 2 seconds.
NFR11: All produced segments must be 100% compliant with the HTTP Live Streaming (HLS) specification.
NFR12: The library must be fully compatible with React 18 and 19 "Concurrent Mode" and "Server Components" patterns.

### Additional Requirements

- **Starter Template**: Custom PNPM Monorepo (Vite + TanStack). Initialization involves: `pnpm init`, `touch pnpm-workspace.yaml`, `mkdir packages apps`, `mkdir packages/web2hls packages/react apps/example-tanstack`.
- **Threading Strategy**: Dedicated Web Worker for Encoding/Muxing.
- **Sync Logic**: Shared monotonic clock (`shared-clock` package) for A/V timestamp alignment.
- **Data Persistence**: `sessionStorage` for OAuth2 tokens by default, via an abstract `TokenStorage` interface.
- **Communication Pattern**: MessageChannel/PostMessage for Main Thread ↔ Web Worker communication using `PipelineEvent` interface.
- **API Strategy**: Dual CJS/ESM distribution via `tsup`, targeting ES2022+.
- **YouTube Compliance**: Strict adherence to YouTube API Services TOS for OAuth2 scopes and ingest behavior.

### UX Design Requirements

UX-DR1: React 19 Native integration utilizing Actions, useActionState, and useSyncExternalStore.
UX-DR2: useStreamPipeline hook for managing the media pipeline lifecycle.
UX-DR3: useSyncExternalStore implementation for high-frequency telemetry/state synchronization.
UX-DR4: Drop-in React components: <OAuthButton /> for PKCE authentication and <StreamCanvas /> for canvas integration.
UX-DR5: Stream health/telemetry dashboard component for monitoring bitrate, FPS, and drops.

### FR Coverage Map

- **FR1:** Epic 2 - Canvas video capture
- **FR2:** Epic 2 - AudioContext capture
- **FR3:** Epic 1 - Shared monotonic clock
- **FR4:** Epic 2 - Backpressure detection
- **FR5:** Epic 2 - Intelligent frame dropping
- **FR6:** Epic 3 - H.264 WebCodecs encoding
- **FR7:** Epic 3 - AAC WebCodecs encoding
- **FR8:** Epic 3 - Profile fallback logic
- **FR9:** Epic 4 - MPEG-TS muxing
- **FR10:** Epic 4 - PAT/PMT metadata insertion
- **FR11:** Epic 4 - Keyframe alignment
- **FR12:** Epic 4 - HLS segment buffering
- **FR13:** Epic 6 - HLS HTTP PUT delivery
- **FR14:** Epic 6 - Rolling segment window
- **FR15:** Epic 6 - Exponential backoff retries
- **FR16:** Epic 5 - YouTube OAuth2 PKCE
- **FR17:** Epic 5 - YouTube Stream/Broadcast creation
- **FR18:** Epic 5 - YouTube resource binding
- **FR19:** Epic 5 - YouTube broadcast state transitions
- **FR20:** Epic 6 - YouTube health monitoring
- **FR21:** Epic 1 - Framework-agnostic API initialization
- **FR22:** Epic 7 - `useStreamPipeline` hook
- **FR23:** Epic 7 - Telemetry state sync (`useSyncExternalStore`)
- **FR24:** Epic 7 - React Actions for life-cycle
- **FR25:** Epic 7 - Drop-in components (`<OAuthButton />`, etc.)
- **FR26:** Epic 7 - Real-time bitrate metrics
- **FR27:** Epic 2 - Performance metrics monitoring
- **FR28:** Epic 3 - Thermal throttling reporting

## Epic List

### Epic 1: Project Scaffolding & Shared Foundations
Establish the monorepo structure and core utilities required for cross-package synchronization. This provides the "bones" of the system.
**User Outcome:** Developers have a clean, type-safe workspace with the shared monotonic clock needed for A/V sync.
**FRs covered:** FR3, FR21.

### Epic 2: Media Capture & Engine Orchestration
Implement the raw media capture loops for Canvas and AudioContext, managed by the framework-agnostic core pipeline.
**User Outcome:** Users can capture synchronized raw video/audio frames in the browser and monitor capture performance.
**FRs covered:** FR1, FR2, FR4, FR5, FR27.

### Epic 3: High-Performance WebCodecs Encoding
Integrate the WebCodecs API within a dedicated Web Worker to transform raw frames into H.264/AAC bitstreams.
**User Outcome:** Raw media is efficiently encoded in the background without blocking the UI thread, with automatic hardware fallback.
**FRs covered:** FR6, FR7, FR8, FR28.

### Epic 4: MPEG-TS Muxing & HLS Segmenting
Mux the encoded bitstreams into MPEG-TS packets and organize them into HLS-compliant segments.
**User Outcome:** The encoded media is formatted into standard streaming segments ready for delivery.
**FRs covered:** FR9, FR10, FR11, FR12.

### Epic 1: YouTube Platform Integration & Auth
Implement the OAuth2 PKCE flow and the YouTube Live API client to manage broadcasts and streams.
**User Outcome:** Users can securely authenticate and prepare their YouTube channel for a live broadcast.
**FRs covered:** FR16, FR17, FR18, FR19.

### Epic 6: Reliable HLS Delivery (Uploader)
Implement the sequential HTTP PUT uploader with exponential backoff and retry logic.
**User Outcome:** The stream is successfully transmitted to YouTube, maintaining stability even during transient network drops.
**FRs covered:** FR13, FR14, FR15, FR20.

### Epic 7: React 19 Integration & Developer Experience
Expose the pipeline through modern React 19 primitives, including hooks, actions, and telemetry synchronization.
**User Outcome:** Developers can add "Go Live" functionality to their React apps in under 10 lines of code with real-time health monitoring.
**FRs covered:** FR22, FR23, FR24, FR25, FR26.

## Epic 1: Project Scaffolding & Shared Foundations

Establish the monorepo structure and core utilities required for cross-package synchronization. This provides the "bones" of the system.

### Story 1.1: Initialize PNPM Monorepo & Build Tooling

As a developer,
I want a standardized monorepo structure with workspace support and build scripts,
So that I can develop the engine and React layers in parallel with type safety.

**Acceptance Criteria:**

**Given** a clean workspace
**When** I run the initialization scripts
**Then** the root `package.json` and `pnpm-workspace.yaml` are created
**And** the `packages/web2hls`, `packages/react`, and `apps/example-tanstack` directories are initialized
**And** `tsup` is configured for dual ESM/CJS distribution in the library packages.

### Story 1.2: Implement Shared Monotonic Clock Utility

As a system,
I want a shared monotonic clock package,
So that video and audio capture loops can use a consistent time reference to prevent drift.

**Acceptance Criteria:**

**Given** the `packages/web2hls/src/utils/clock.ts` module
**When** the clock is initialized
**Then** it provides high-resolution timestamps based on `performance.now()`
**And** it supports a consistent origin time shared across potential thread boundaries.

### Story 1.3: Define Framework-Agnostic Core API Types

As a developer,
I want a set of core TypeScript interfaces and the `PipelineEvent` communication protocol,
So that I can implement the engine components with strict type safety.

**Acceptance Criteria:**

**Given** the `packages/web2hls/src/types` directory
**When** I define the `PipelineEvent` and `StreamingConfig` interfaces
**Then** they correctly model the state transitions of the media pipeline
**And** they are exportable for use in both the core engine and React packages.

## Epic 2: Media Capture & Engine Orchestration

Implement the raw media capture loops for Canvas and AudioContext, managed by the framework-agnostic core pipeline.

### Story 2.1: Implement Canvas Frame Capture Loop

As a developer,
I want to capture raw `VideoFrame` objects from a `Canvas` or `OffscreenCanvas` at a steady frame rate,
So that they can be sent to the encoder.

**Acceptance Criteria:**

**Given** a reference to an HTML5 Canvas or OffscreenCanvas
**When** the capture loop starts
**Then** it produces `VideoFrame` objects at the requested FPS (e.g., 30 or 60)
**And** it intelligently drops frames if the encoder backpressure signal is high
**And** it calculates and reports the current capture FPS and drop count.

### Story 2.2: Implement Web Audio Capture Loop

As a developer,
I want to capture `AudioData` from a browser `AudioContext`,
So that the stream includes synchronized synthesized audio.

**Acceptance Criteria:**

**Given** an active `AudioContext`
**When** the audio capture starts
**Then** it captures raw PCM data as `AudioData` objects
**And** it assigns timestamps using the shared monotonic clock.

### Story 2.3: Implement Core StreamingPipeline Orchestrator

As a developer,
I want a framework-agnostic `StreamingPipeline` class that coordinates capture, encoding, and delivery,
So that I can control the stream lifecycle from any TypeScript application.

**Acceptance Criteria:**

**Given** the `web2hls` core package
**When** the `StreamingPipeline` is initialized with canvas and audio sources
**Then** it exposes `start()` and `stop()` methods
**And** it aggregates telemetry from all pipeline stages for real-time monitoring.

## Epic 3: High-Performance WebCodecs Encoding

Integrate the WebCodecs API within a dedicated Web Worker to transform raw frames into H.264/AAC bitstreams.

### Story 3.1: Implement Web Worker Encoder Orchestrator

As a developer,
I want all encoding tasks to run in a dedicated Web Worker,
So that the main UI thread remains responsive during high-bitrate streaming.

**Acceptance Criteria:**

**Given** the `packages/web2hls/src/workers/encoder.worker.ts` script
**When** the pipeline starts
**Then** the worker is spawned and establishes a `MessageChannel` with the main thread
**And** it can receive `VideoFrame` and `AudioData` objects via `postMessage`.

### Story 3.2: Implement VideoEncoder with H.264 Fallback

As a system,
I want to encode video frames into H.264 NAL units using the hardware encoder, with automatic fallback to more compatible profiles if needed.

**Acceptance Criteria:**

**Given** raw `VideoFrame` objects in the Web Worker
**When** the `VideoEncoder` is initialized
**Then** it produces `EncodedVideoChunk` objects using the preferred H.264 profile
**And** it automatically retries with 'Main' or 'Baseline' profiles if 'High' profile initialization fails.

### Story 3.3: Implement AudioEncoder (AAC) & Thermal Monitoring

As a system,
I want to encode audio into AAC bitstreams and monitor the browser's thermal state to adjust encoding quality.

**Acceptance Criteria:**

**Given** raw `AudioData` objects in the Web Worker
**When** the `AudioEncoder` is initialized
**Then** it produces `EncodedAudioChunk` objects in AAC format
**And** it detects and reports browser thermal throttling events to the orchestrator.

### Story 3.4: Implement Aggressive Media Resource Disposal

As a system,
I want to ensure every `VideoFrame` and `AudioData` object is closed immediately after use,
So that the browser tab doesn't crash from memory leaks.

**Acceptance Criteria:**

**Given** an encoding session in progress
**When** a frame or audio chunk is processed or skipped
**Then** `.close()` is explicitly called on the source object
**And** the memory heap remains stable within ±10% over a 30-minute test.

## Epic 4: MPEG-TS Muxing & HLS Segmenting

Mux the encoded bitstreams into MPEG-TS packets and organize them into HLS-compliant segments.

### Story 4.1: Integrate Mediabunny Muxer

As a system,
I want to wrap the `mediabunny` library within the Web Worker,
So that encoded chunks can be muxed into MPEG-TS packets.

**Acceptance Criteria:**

**Given** encoded video/audio chunks in the Web Worker
**When** the muxer is initialized
**Then** it produces a stream of MPEG-TS packets
**And** it correctly interleaves audio and video based on their timestamps.

### Story 4.2: Implement PAT/PMT & Keyframe Management

As a system,
I want to ensure every segment starts with a keyframe and valid HLS metadata,
So that the resulting stream is playable by standard HLS players.

**Acceptance Criteria:**

**Given** the MPEG-TS muxer
**When** a new segment is started
**Then** it forces a video keyframe via the `VideoEncoder`
**And** it prepends the mandatory PAT (Program Association Table) and PMT (Program Map Table) packets to the segment buffer.

### Story 4.3: Implement HLS Segmenter

As a system,
I want to buffer MPEG-TS packets into discrete HLS segments of a configurable duration,
So they can be uploaded to the streaming provider.

**Acceptance Criteria:**

**Given** a stream of MPEG-TS packets
**When** the configured segment duration (e.g., 2 seconds) is reached
**Then** the current buffer is finalized as an HLS segment (.ts file)
**And** the segment is passed to the uploader queue.

## Epic 5: YouTube Platform Integration & Auth

Implement the OAuth2 PKCE flow and the YouTube Live API client to manage broadcasts and streams.

### Story 5.1: Implement OAuth2 PKCE Flow & Token Management

As a user,
I want to securely log in to my YouTube account using the OAuth2 PKCE flow,
So that the application can manage my live streams without exposing a client secret.

**Acceptance Criteria:**

**Given** the `packages/web2hls/src/uploader/youtube-auth.ts` module
**When** the login process is initiated
**Then** it uses the PKCE flow (Proof Key for Code Exchange) to obtain an access token
**And** it requests only the minimum required scopes (`youtube.upload`, `youtube.readonly`)
**And** it stores tokens in `sessionStorage` by default via a customizable storage interface.

### Story 5.2: Implement YouTube Live Resource Client

As a developer,
I want to programmatically create and configure YouTube Live "Stream" and "Broadcast" resources,
So that I don't have to manually set them up in the YouTube Studio dashboard.

**Acceptance Criteria:**

**Given** a valid YouTube access token
**When** the `YouTubeClient` is asked to prepare a stream
**Then** it creates a new "liveBroadcast" and a "liveStream" resource via the YouTube Data API
**And** it binds the broadcast to the stream.

### Story 5.3: Implement Broadcast State Transitions

As a developer,
I want to transition the state of my YouTube broadcast (e.g., from 'testing' to 'live'),
So that I can control the public visibility of the stream from my application.

**Acceptance Criteria:**

**Given** an active YouTube broadcast
**When** the transition method is called (e.g., `transitionToLive()`)
**Then** it sends the correct API request to move the broadcast status
**And** it handles potential API errors (e.g., stream not yet active) gracefully.

## Epic 6: Reliable HLS Delivery (Uploader)

Implement the sequential HTTP PUT uploader with exponential backoff and retry logic.

### Story 6.1: Implement Sequential HLS PUT Uploader

As a system,
I want to upload HLS segments sequentially to a remote endpoint using HTTP PUT,
So that the live stream is correctly ingested by YouTube.

**Acceptance Criteria:**

**Given** a new HLS segment in the uploader queue
**When** the uploader is active
**Then** it performs an HTTP PUT request to the ingestion URL with the segment data
**And** it ensures segments are uploaded in the correct numerical order.

### Story 6.2: Implement Exponential Backoff & Segment Retries

As a system,
I want to automatically retry failed segment uploads with an exponential backoff strategy,
So that the stream can recover from transient network drops.

**Acceptance Criteria:**

**Given** a failed HTTP PUT request
**When** a retry is possible
**Then** it waits for an exponentially increasing delay before retrying the upload
**And** it maintains a rolling window of recent segments to ensure no data is lost during short outages.

### Story 6.3: Implement Ingestion Health Monitoring

As a developer,
I want to monitor the health status of the YouTube ingestion endpoint,
So that I can provide real-time feedback to the user about stream quality.

**Acceptance Criteria:**

**Given** an active streaming session
**When** the health check interval is reached
**Then** it queries the YouTube Live API for the ingestion point status (e.g., 'excellent', 'good', 'poor')
**And** it reports this status back to the main pipeline telemetry.

## Epic 7: React 19 Integration & Developer Experience

Expose the pipeline through modern React 19 primitives, including hooks, actions, and telemetry synchronization.

### Story 7.1: Implement useStreamPipeline Hook (React 19)

As a developer,
I want a high-level React hook that manages the stream lifecycle,
So that I can easily integrate streaming into my UI.

**Acceptance Criteria:**

**Given** the `@web2hls/react` package
**When** the `useStreamPipeline` hook is called with a canvas ref
**Then** it returns `start` and `stop` functions wrapped in React 19 `useActionState`
**And** it manages the 'idle' | 'testing' | 'live' | 'error' status transitions.

### Story 7.2: Implement useStreamHealth (useSyncExternalStore)

As a developer,
I want to subscribe to real-time pipeline telemetry (FPS, bitrate, drops) without causing unnecessary re-renders,
So that I can build high-performance dashboards.

**Acceptance Criteria:**

**Given** an active `useStreamPipeline`
**When** the `useStreamHealth` hook is used
**Then** it uses `useSyncExternalStore` to synchronize with the core engine's telemetry
**And** it provides a stable object with real-time metrics (e.g., current video bitrate, encoder frame drops).

### Story 7.3: Create Drop-in UI Components (<OAuthButton />, <StreamCanvas />)

As a developer,
I want pre-built React components for common tasks like YouTube login and canvas integration,
So that I can prototype a streaming app in minutes.

**Acceptance Criteria:**

**Given** the `@web2hls/react` component library
**When** the `<OAuthButton />` component is rendered
**Then** it handles the PKCE login flow and displays the user's YouTube status
**And** a `<StreamHealth />` dashboard component is provided to visualize the pipeline telemetry.

### Story 7.4: Final Polish, Documentation & Example App

As a developer,
I want a complete, high-quality example app and API documentation,
So that I can learn how to use the library effectively.

**Acceptance Criteria:**

**Given** the `apps/example-tanstack` project
**When** it is deployed
**Then** it demonstrates a fully functional "Canvas to YouTube" stream
**And** the library bundle size is verified to be under the 50KB gzipped limit.







