---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-04-28'
inputDocuments:
  - docs/_bmad-output/planning-artifacts/prd.md
  - docs/_bmad-output/brainstorming/brainstorming-session-2026-04-21-170000.md
project_name: 'web2hls'
user_name: 'Mezmo'
date: '2026-04-28'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The architecture must support a multi-stage media pipeline: Capture (Canvas/AudioContext) -> Encode (WebCodecs) -> Mux (Mediabunny MPEG-TS) -> Segment -> Upload (YouTube HLS PUT). Architecturally, this requires a modular orchestrator that manages these decoupled stages while enforcing synchronization via a shared monotonic clock.

**Non-Functional Requirements:**
- **Performance:** Sub-16ms capture loops and sub-100ms encoding latency are the primary drivers for component selection and thread management.
- **Reliability:** The system must maintain A/V sync within ±50ms and recover from transient 5s network failures without dropping the session.
- **Security:** Pure client-side processing with secure OAuth2 token management.

**Scale & Complexity:**
The project is a complex media engineering task requiring deep integration with emerging browser standards (WebCodecs) and established streaming protocols (MPEG-TS/HLS).

- Primary domain: Web / Media Engineering
- Complexity level: High
- Estimated architectural components: ~8 (Capture, Video Encoder, Audio Encoder, Muxer, Segmenter, Uploader, API Client, React Hook layer)

### Technical Constraints & Dependencies

- **WebCodecs API:** Mandatory browser support (Chrome 94+, Firefox 130+, Safari 26+).
- **Mediabunny:** Dependency for MPEG-TS muxing logic.
- **YouTube API TOS:** Strict compliance for OAuth2 scopes and ingest behavior.
- **Browser Threading:** Main thread must remain unblocked; encoders may need to run in Web Workers if thermal throttling becomes an issue.

### Cross-Cutting Concerns Identified

- **A/V Sync (Shared Monotonic Clock):** Coordinates timestamps across all capture and encoding nodes.
- **Backpressure Management:** Intelligent frame dropping based on encoder and uploader queue sizes.
- **React 19 Lifecycle Integration:** Managing the pipeline state transitions through React's transition and action primitives.

## Starter Template Evaluation

### Primary Technology Domain

Developer Tool / Library (NPM Monorepo) based on project requirements analysis.

### Starter Options Considered

1. **TanStack Start:** The "new standard" for Vite-based full-stack apps. Integrated for high-quality examples.
2. **Vite Library Mode + tsup:** Industry standard for dual CJS/ESM TypeScript libraries.
3. **PNPM Workspaces:** For efficient monorepo management of core engine and React integration.

### Selected Starter: Custom PNPM Monorepo (Vite + TanStack)

**Rationale for Selection:**
A custom monorepo using PNPM Workspaces provides the best balance for a developer tool. It allows a clean separation between the zero-dependency core (`web2hls`) and the React 19 integration (`@web2hls/react`), while enabling rich, type-safe example apps using **TanStack Start**.

**Initialization Command:**

```bash
# Initialize root and packages
pnpm init
touch pnpm-workspace.yaml
mkdir packages apps
mkdir packages/web2hls packages/react apps/example-tanstack
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript 5.x (ES2022+) using PNPM Workspaces for dependency management.

**Styling Solution:**
Vanilla CSS/Tailwind (Example-dependent).

**Build Tooling:**
`tsup` for library packages (Dual ESM/CJS), `Vite` for example apps and benchmarking.

**Testing Framework:**
`Vitest` for fast, integrated unit and pipeline testing.

**Code Organization:**
Monorepo with dedicated packages for core logic and React integration, and apps for documentation/examples.

**Development Experience:**
Fast HMR via Vite, strict TypeScript validation across the workspace, and type-safe routing/data-fetching in examples via TanStack.

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- **Threading Strategy**: Dedicated Web Worker for Encoding/Muxing.
- **React Integration**: `useSyncExternalStore` for high-frequency telemetry.
- **Auth Persistence**: `sessionStorage` with optional `TokenStorage` interface.

**Important Decisions (Shape Architecture):**
- **Monorepo Manager**: PNPM Workspaces.
- **Build Tooling**: `tsup` for dual ESM/CJS library output.
- **Sync Logic**: Shared monotonic clock for A/V timestamp alignment.

**Deferred Decisions (Post-MVP):**
- **Custom HLS Tuning**: Dynamic segment duration adjustment.
- **Multi-Platform Ingest**: Support for Twitch/Custom RTMP.

### Data Architecture

**State Management & Persistence:**
- **Decision**: `sessionStorage` for OAuth2 tokens by default.
- **Rationale**: Highest security for a pure client-side architecture; tokens clear on tab close.
- **Customization**: Provide an abstract `TokenStorage` interface to allow developers to implement encrypted `localStorage` if persistent auth is required.

### Authentication & Security

**YouTube OAuth2 Integration:**
- **Method**: OAuth2 PKCE Flow.
- **Security**: No client secrets used in the browser. 
- **Scope**: Minimum required (`youtube.upload` and `youtube.readonly`).

### API & Communication Patterns

**Internal Pipeline Communication:**
- **Strategy**: MessageChannel/PostMessage for Main Thread ↔ Web Worker communication.
- **Pattern**: Event-driven architecture where the Capture loop pushes raw frames to the Worker, and the Worker pushes telemetry back to the UI.

### Frontend Architecture

**React 19 Integration:**
- **Hooks**: `useStreamPipeline` for lifecycle and `useSyncExternalStore` for state telemetry.
- **Actions**: Wrap start/stop transitions in React 19 `Actions` to handle loading and error states natively.

### Infrastructure & Deployment

**Build & Distribution:**
- **Library Output**: Dual CJS/ESM via `tsup`.
- **Target**: ES2022+ (to leverage modern browser features like private class members and top-level await).

### Decision Impact Analysis

**Implementation Sequence:**
1. Monorepo & Root Configuration.
2. Core `StreamingPipeline` (Main Thread Orchestrator).
3. Web Worker Encoder (WebCodecs integration).
4. Mediabunny Muxer wrapper.
5. React 19 Hook Layer.

**Cross-Component Dependencies:**
The `shared-clock` utility is a zero-dependency package required by both the Capture and Encoder modules to ensure drift-free A/V sync.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
5 areas where AI agents could make different choices.

### Naming Patterns

- **Files**: `kebab-case.ts` for logic/classes, `PascalCase.tsx` for React components.
- **Classes**: `PascalCase` (e.g., `HlsUploader`).
- **Functions/Variables**: `camelCase`.
- **Private Members**: Use native `#private` syntax.

### Structure Patterns

- **Tests**: Co-located `[name].test.ts` next to source files.
- **Workers**: `packages/web2hls/src/workers/[name].worker.ts`.
- **React Components**: `packages/react/src/components/[ComponentName]/index.tsx`.

### Format Patterns

- **Event Communication**: Standardized interface `{ type: PipelineEvent, payload: any, timestamp: number }`.
- **Event Types**: TypeScript Union type `START | STOP | FRAME_READY | TELEMETRY_UPDATE`.
- **Data Formats**: ISO 8601 strings for user-facing dates, monotonic high-res timestamps for internal clock.

### Communication Patterns

- **Main ↔ Worker**: Use `MessageChannel` for direct port communication between the capture loop and the encoder to minimize main thread overhead.
- **State Updates**: `useSyncExternalStore` for external telemetry synchronization.

### Process Patterns

- **Error Handling**: Use the "Result" pattern `{ success: boolean, data?: T, error?: PipelineError }` for critical pipeline path methods to avoid try/catch overhead in the 60fps loop.
- **Loading States**: Integrated with React 19 `Actions` (Pending states managed by the hook).

### Enforcement Guidelines

- **All AI Agents MUST**: Use the shared monotonic clock for all media timestamps.
- **All AI Agents MUST**: Close `VideoFrame` and `AudioData` objects immediately after processing.
- **All AI Agents MUST**: Provide unit tests for every new pipeline stage using `Vitest`.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
web2hls-monorepo/
├── package.json              # Monorepo root scripts
├── pnpm-workspace.yaml      # PNPM workspace definition
├── tsconfig.base.json        # Shared TS rules
├── .prettierrc               # Shared formatting
├── .github/
│   └── workflows/
│       └── release.yml       # NPM publish flow
├── packages/
│   ├── web2hls/              # Core Engine (Zero-dependency)
│   │   ├── package.json      # Dual CJS/ESM via tsup
│   │   ├── tsup.config.ts    
│   │   ├── tsconfig.json     # Extends root
│   │   ├── src/
│   │   │   ├── index.ts      # Main exports
│   │   │   ├── core/         # Orchestrator & Pipeline
│   │   │   ├── capture/      # Canvas/Audio capture
│   │   │   ├── encoder/      # WebCodecs wrappers
│   │   │   ├── muxer/        # Mediabunny TS muxer
│   │   │   ├── uploader/     # HLS PUT uploader
│   │   │   ├── utils/        # Monotonic clock, logging
│   │   │   └── workers/      # Encoder Web Worker scripts
│   │   └── tests/            # Co-located vitest files
│   └── react/                # React 19 Integration
│       ├── package.json      # Peer dep on React 19 + web2hls
│       ├── src/
│       │   ├── index.ts      # Hook exports
│       │   ├── hooks/        # useStreamPipeline, useSyncExternalStore
│       │   ├── components/   # <OAuthButton />, <StreamCanvas />
│       │   └── providers/    # Pipeline context
├── apps/
│   ├── example-tanstack/     # TanStack Start demo
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── src/              # Route-based examples
│   └── docs/                 # VitePress documentation
```

### Architectural Boundaries

- **The Worker Boundary**: All heavy CPU tasks (MPEG-TS muxing and WebCodecs encoding) are isolated within the Web Worker. Communication is restricted to the `PipelineEvent` message protocol.
- **The Core/React Boundary**: The core `web2hls` package must remain framework-agnostic. It should never import from `packages/react`.
- **The Platform Boundary**: All YouTube-specific API calls are isolated in the `uploader/youtube-client.ts` module to allow for future multi-platform support (Twitch/etc).

### Requirements to Structure Mapping

- **Media Capture (FR1-5)**: Lives in `packages/web2hls/src/capture/`.
- **Encoding & Muxing (FR6-11)**: Lives in `packages/web2hls/src/encoder/` and `muxer/` (Worker-side).
- **HLS Delivery (FR12-15)**: Lives in `packages/web2hls/src/uploader/`.
- **YouTube API (FR16-20)**: Lives in `packages/web2hls/src/uploader/youtube-client.ts`.
- **React Integration (FR21-25)**: Lives in `packages/react/src/`.
- **Telemetry (FR26-28)**: Managed by `core/` orchestrator, exposed via `packages/react/src/hooks/`.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible. PNPM Workspaces efficiently manage the shared TypeScript and Vitest configurations, while `tsup` ensures the library output meets modern standards (ESM/CJS).

**Pattern Consistency:**
Implementation patterns (naming, structure, communication) are tailored to a media engineering context, particularly the standardization of the `PipelineEvent` interface for thread communication.

**Structure Alignment:**
The monorepo structure explicitly separates the high-performance engine (`packages/web2hls`) from the developer-facing framework logic (`packages/react`), enforcing architectural boundaries.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**
Every capability area (Capture, Encode, Mux, Uploader, React) has a dedicated home in the project tree and a defined communication protocol.

**Non-Functional Requirements Coverage:**
Performance (Workers), Security (sessionStorage/PKCE), and Reliability (Shared Clock) are addressed as core architectural primitives.

### Implementation Readiness Validation ✅

**Decision Completeness:**
All critical path decisions (Threading, State Sync, Auth) are finalized.

**Structure Completeness:**
The project tree defines exact locations for logic, workers, tests, and examples.

**Pattern Completeness:**
Consistency rules cover naming, error handling, and threading—the three most common areas for AI agent conflict.

### Gap Analysis Results
- **Critical Gaps**: None.
- **Important Gaps**: Detailed WebCodecs fallback profile matrix (to be refined during implementation of the `Encoder` module).
- **Nice-to-Have**: Automated thermal benchmarking suite in the `apps/docs` workspace.

### Architecture Completeness Checklist

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Complete directory structure defined
- [x] Component boundaries established

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Clean separation of concerns via monorepo packages.
- Zero-jank performance via dedicated Web Worker encoding.
- Modern, type-safe React 19 integration.

### Implementation Handoff

**AI Agent Guidelines:**
- Follow the `PipelineEvent` protocol for all Main ↔ Worker communication.
- Ensure all media frames are closed via `.close()` to prevent memory leaks.
- Refer to the `shared-clock` utility for all timestamping.

**First Implementation Priority:**
Initialize the PNPM monorepo and create the `shared-clock` package.
