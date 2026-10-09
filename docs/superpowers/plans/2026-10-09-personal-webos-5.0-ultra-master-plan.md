# Personal Web OS 5.0 Ultra Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Personal Web OS into the 5.0 Sovereign Digital Workspace — an ultra-powerful, local-first virtual desktop operating system with a true multi-window manager, custom static & live video wallpaper engine, universal capture inbox, research evidence desk, multi-track audio studio, developer power lab (JWT, Diff, SQL studio), AI mission copilot, and zero-compromise security.

**Architecture:** A layered architecture with a central Virtual Desktop Window Manager on top of Next.js 16.4.0 (Turbopack) & React 19, backed by an embedded PGlite SQL engine, IndexedDB & Local Storage persistence, Web Audio procedural synthesis, HTML5 Canvas interactive shaders, and fail-closed security origins.

**Tech Stack:** Next.js 16.4.0, React 19, TypeScript 5.8, Tailwind CSS, Lucide Icons, Drizzle ORM, PGlite (WASM Postgres), Web Audio API, Web Crypto API, Vitest.

## Global Constraints
- **0 ESLint errors & 0 warnings** under Next.js 16 & React 19 compiler rules (`npm run lint`).
- **0 TypeScript errors** (`npm run typecheck` via `tsc --noEmit`).
- **100% test pass rate** (`npm test` via Vitest).
- **Fail-closed security:** All state-mutating endpoints (`POST`, `PUT`, `DELETE`) require `assertValidOrigin(req)` and `requireOwner(req)`.
- **Zero Mock UI:** No fake success messages, real persistence, real audio, real canvas shaders.
- **Language & Copy:** 100% professional Vietnamese UI copy.
- **Clean Git commits:** Atomic, focused commits pushed to `origin/main`.

---

## File Structure Map

```text
src/
  lib/
    db/
      schema.ts                 # Add inbox, wallpapers, research sources, claims, decisions tables
      index.ts                  # DDL migrations for PGlite tables
    types/
      index.ts                  # Types for WindowState, Wallpaper, Inbox, Research, Decision, AI
    desktop/
      window-manager-context.tsx # Window Manager Context & Hook (state, drag, resize, minimize, snap)
    audio/
      sound-fx.ts               # Procedural audio SFX
      ambient-synth.ts          # Procedural ambient multi-track synth
    events/
      event-bus.ts              # System-wide typed Event Hub
  components/
    desktop/
      virtual-desktop.tsx       # Desktop Canvas, Window Frame Renderer, Desktop Icons, Context Menu
      window-frame.tsx          # Draggable, Resizable, Minimizable, Snappable Window Frame
      desktop-dock.tsx          # macOS-style Dock with running indicators & minimize targets
      desktop-topbar.tsx        # System Top Bar with Clock, Telemetry, Mode Toggle, Quick Controls
      desktop-widgets.tsx       # Live Flip Clock, System Telemetry (Ping/FPS/Memory), Mini Pomodoro
      desktop-context-menu.tsx  # Right-click context menu on desktop
    wallpaper/
      custom-wallpaper-studio.tsx # Upload image/video, Paste URL, Library Vault, Post-Processing Rack
      canvas-shaders.tsx        # Matrix Rain, 3D Warp Starfield, Rain on Glass, Audio Waves
      screensaver-modal.tsx     # Fullscreen idle screensaver
    inbox/
      universal-inbox-modal.tsx # Quick capture: text, url, task, snippet, convert actions
    focus/
      multi-track-mixer.tsx     # Multi-track audio mixer (faders for Rain, Fire, Waves, Alpha, Fan)
      lofi-radio-player.tsx     # Lo-Fi stream player with Audio Visualizer
    dev-lab/
      jwt-inspector-modal.tsx   # JWT Decoder and Expiration checker
      diff-checker-modal.tsx    # 2-column visual Diff Checker
      color-palette-modal.tsx   # Color picker & Tailwind palette generator
      sql-studio-modal.tsx      # In-browser SQL query runner & CSV export
    ai/
      ai-copilot-dock.tsx       # Multi-model AI Chat, BYOK key store, Ask My Second Brain RAG
    research/
      evidence-board-modal.tsx  # Source Library, Claims & Contradiction Board
    kanban/
      kanban-board-dnd.tsx      # HTML5 Drag & Drop Kanban Board with tags & time tracking
```

---

## Implementation Tasks

### Task 1: Database Schema & Entity Definitions for Web OS 5.0
**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/db/index.ts`
- Modify: `src/lib/types/index.ts`
- Test: `tests/schema-5-0.test.ts`

**Interfaces:**
- Produces: Tables `inboxItems`, `customWallpapers`, `researchSources`, `claims`, `decisionRecords`.
- Types: `InboxItem`, `CustomWallpaper`, `ResearchSource`, `Claim`, `DecisionRecord`, `WindowState`.

- [ ] Step 1: Write the failing schema test in `tests/schema-5-0.test.ts`.
- [ ] Step 2: Add tables to `src/lib/db/schema.ts` and `src/lib/db/index.ts`.
- [ ] Step 3: Add type definitions to `src/lib/types/index.ts`.
- [ ] Step 4: Run test with `npx vitest run tests/schema-5-0.test.ts` and verify it passes.
- [ ] Step 5: Commit changes with message `feat(schema): add 5.0 schema for inbox, wallpapers, research and decisions`.

---

### Task 2: Backend APIs for Universal Inbox, Wallpapers, Research & Decisions
**Files:**
- Create: `src/app/api/admin/inbox/route.ts` & `[id]/route.ts`
- Create: `src/app/api/admin/wallpapers/route.ts` & `[id]/route.ts`
- Create: `src/app/api/admin/research/route.ts` & `claims/route.ts`
- Create: `src/app/api/admin/decisions/route.ts` & `[id]/route.ts`
- Test: `tests/webos-5-0-apis.test.ts`

**Interfaces:**
- Produces: CRUD endpoints guarded by `assertValidOrigin` and `requireOwner`.

- [ ] Step 1: Write integration tests in `tests/webos-5-0-apis.test.ts`.
- [ ] Step 2: Implement route handlers with origin checks and PGlite database operations.
- [ ] Step 3: Run test suite to verify all endpoints return expected payloads and status codes.
- [ ] Step 4: Commit changes with message `feat(api): implement 5.0 APIs for inbox, wallpapers, research and decisions`.

---

### Task 3: Virtual Window Manager Runtime & Desktop Infrastructure
**Files:**
- Create: `src/lib/desktop/window-manager-context.tsx`
- Create: `src/components/desktop/window-frame.tsx`
- Create: `src/components/desktop/virtual-desktop.tsx`
- Create: `src/components/desktop/desktop-dock.tsx`
- Create: `src/components/desktop/desktop-topbar.tsx`
- Create: `src/components/desktop/desktop-widgets.tsx`
- Create: `src/components/desktop/desktop-context-menu.tsx`
- Test: `tests/window-manager.test.ts`

**Interfaces:**
- Produces: `WindowManagerProvider`, `useWindowManager`, `WindowFrame`, `VirtualDesktop`.
- Features: Draggable titlebar, 8-directional resize, minimize to Dock, maximize/restore, snap left/right 50%, active z-index focus, localStorage layout memory, Dual mode (Desktop vs Workspace), Right-click context menu, Desktop icons, Live widgets (Flip clock, Ping/FPS/Memory, Mini pomodoro).

- [ ] Step 1: Write unit tests for window manager state logic in `tests/window-manager.test.ts`.
- [ ] Step 2: Implement `window-manager-context.tsx` with actions: `openWindow`, `closeWindow`, `minimizeWindow`, `maximizeWindow`, `focusWindow`, `moveWindow`, `resizeWindow`, `snapWindow`, `toggleDesktopMode`.
- [ ] Step 3: Implement `window-frame.tsx` supporting pointer drag, edge resize, titlebar buttons, snap indicators.
- [ ] Step 4: Implement `desktop-dock.tsx` with app launcher icons, active window indicators, and bounce/minimize targets.
- [ ] Step 5: Implement `desktop-topbar.tsx` with live time, network ping, memory, desktop/workspace mode toggle, and quick settings.
- [ ] Step 6: Implement `desktop-widgets.tsx` with Flip Clock and System Telemetry gauge.
- [ ] Step 7: Implement `desktop-context-menu.tsx` for desktop right-click interactions.
- [ ] Step 8: Run tests and verify window state transitions.
- [ ] Step 9: Commit changes with message `feat(desktop): implement virtual desktop window manager runtime and widgets`.

---

### Task 4: Ultimate Wallpaper Matrix & Live Video Engine
**Files:**
- Create: `src/components/wallpaper/custom-wallpaper-studio.tsx`
- Create: `src/components/wallpaper/canvas-shaders.tsx`
- Create: `src/components/wallpaper/screensaver-modal.tsx`
- Modify: `src/components/ui/wallpaper-engine.tsx`
- Test: `tests/wallpaper-matrix.test.ts`

**Interfaces:**
- Produces: `CustomWallpaperStudioModal`, `CanvasShaders`, `ScreensaverModal`.
- Features:
  - Local Image / Video upload (`.png`, `.jpg`, `.mp4`, `.webm`).
  - Online direct URL ingestion.
  - Video loop background with GPU CSS acceleration.
  - Wallpaper Library Vault (save, tag, delete, favorite, auto-rotate).
  - Post-Processing Controls: Dim Overlay (0-90%), Backdrop Blur (0-40px), Contrast, Saturation, Vignette, CRT scanlines.
  - 4 Canvas Shaders: Matrix Digital Rain, 3D Warp Starfield, Rain on Glass, Cosmic Audio Waves.
  - Desktop Wallpaper Exporter (download high-res image for Windows/macOS).
  - Idle Screensaver Mode (auto-activates after idle time).

- [ ] Step 1: Write unit tests for wallpaper post-processing state and shader parameter calculations in `tests/wallpaper-matrix.test.ts`.
- [ ] Step 2: Implement `canvas-shaders.tsx` with requestAnimationFrame loops, mouse listeners, and reduced-motion fallback.
- [ ] Step 3: Implement `custom-wallpaper-studio.tsx` with tabs: Thư viện (Library), Tải lên & URL (Upload & URL), Hậu kỳ & Hiệu ứng (Post-Processing & Shaders), Xuất hình nền (Export).
- [ ] Step 4: Implement `screensaver-modal.tsx` listening to user idle time.
- [ ] Step 5: Update `wallpaper-engine.tsx` to integrate with custom uploaded wallpapers, live video, and shaders.
- [ ] Step 6: Run tests and verify.
- [ ] Step 7: Commit changes with message `feat(wallpaper): implement custom live video wallpaper engine, canvas shaders and screensaver`.

---

### Task 5: Universal Capture Inbox & Kanban Drag & Drop
**Files:**
- Create: `src/components/inbox/universal-inbox-modal.tsx`
- Create: `src/app/admin/inbox/page.tsx`
- Modify: `src/app/admin/tasks/page.tsx`
- Test: `tests/universal-inbox.test.ts`

**Interfaces:**
- Produces: Universal Inbox component and HTML5 Drag & Drop Kanban enhancements.
- Features:
  - Fast capture: Quick text, URL, code, task.
  - 1-click convert: Convert to Task (prefills title/description), Convert to Note.
  - Kanban board HTML5 drag & drop between columns with sound effects.
  - Stopwatch timer for task time tracking.
  - Priority & Overdue visual glow.

- [ ] Step 1: Write unit tests for Inbox capture and conversion in `tests/universal-inbox.test.ts`.
- [ ] Step 2: Implement `universal-inbox-modal.tsx` and `/admin/inbox/page.tsx`.
- [ ] Step 3: Enhance `src/app/admin/tasks/page.tsx` with native HTML5 drag & drop (`onDragStart`, `onDragOver`, `onDrop`), stopwatch time tracker per task, and overdue highlight.
- [ ] Step 4: Run tests and verify.
- [ ] Step 5: Commit changes with message `feat(inbox & kanban): implement universal capture inbox and drag & drop kanban tasks`.

---

### Task 6: Multi-Track Sound Lab & Lo-Fi Radio Player
**Files:**
- Create: `src/components/focus/multi-track-mixer.tsx`
- Create: `src/components/focus/lofi-radio-player.tsx`
- Modify: `src/components/ui/focus-studio-modal.tsx`
- Test: `tests/multi-track-audio.test.ts`

**Interfaces:**
- Produces: `MultiTrackMixer`, `LofiRadioPlayer`.
- Features:
  - Multi-track procedural audio synthesizer: Individual faders for Rain, Ocean Waves, Campfire, Alpha 14Hz Beats, Fan noise, Wind.
  - Preset saving & loading (*"Đêm mưa code"*, *"Bình minh tập trung"*).
  - Lo-Fi & Synthwave 24/7 stream radio player with Audio Visualizer canvas (oscilloscope & frequency bars).
  - Full OS soundscape (Boot sound, window woosh, trash crumple).

- [ ] Step 1: Write unit tests for multi-track mixer gain nodes in `tests/multi-track-audio.test.ts`.
- [ ] Step 2: Implement `multi-track-mixer.tsx` and integrate with `ambient-synth.ts`.
- [ ] Step 3: Implement `lofi-radio-player.tsx` with web radio stream audio tag and canvas frequency visualizer.
- [ ] Step 4: Integrate into `focus-studio-modal.tsx` and desktop topbar quick controls.
- [ ] Step 5: Run tests and verify.
- [ ] Step 6: Commit changes with message `feat(audio): implement multi-track ambient mixer, lo-fi radio player and audio visualizer`.

---

### Task 7: Developer Power Lab (JWT, Diff Checker, Color Palette, SQL Studio)
**Files:**
- Create: `src/components/dev-lab/jwt-inspector-modal.tsx`
- Create: `src/components/dev-lab/diff-checker-modal.tsx`
- Create: `src/components/dev-lab/color-palette-modal.tsx`
- Create: `src/components/dev-lab/sql-studio-modal.tsx`
- Modify: `src/components/ui/dev-tools-modal.tsx`
- Modify: `src/app/admin/api-tester/page.tsx`
- Test: `tests/dev-lab.test.ts`

**Interfaces:**
- Produces: Modals for JWT Inspector, Diff Checker, Color Palette, and SQL Studio.
- Features:
  - JWT Inspector: Parse header & payload, check exp claims, relative expiration badge.
  - Diff Checker: 2-column visual diff with line numbers and color-coded insertions/deletions.
  - Color Palette: Color picker, HEX/RGB/HSL/OKLCH converter, Tailwind class generator.
  - SQL Studio: Run raw SELECT queries on PGlite internal database, view tables, export CSV/JSON.
  - API Tester Collections & History: Save requests, copy cURL, inspect headers.

- [ ] Step 1: Write unit tests for JWT parser, diff algorithm, and color converter in `tests/dev-lab.test.ts`.
- [ ] Step 2: Implement `jwt-inspector-modal.tsx` with instant payload formatting and expiration check.
- [ ] Step 3: Implement `diff-checker-modal.tsx` with line-by-line comparison algorithm.
- [ ] Step 4: Implement `color-palette-modal.tsx` with HEX/RGB/HSL conversion and color harmonies.
- [ ] Step 5: Implement `sql-studio-modal.tsx` executing queries via PGlite connection and rendering responsive table with CSV export.
- [ ] Step 6: Enhance `api-tester/page.tsx` with request history and cURL export.
- [ ] Step 7: Integrate all new dev tools into `dev-tools-modal.tsx` and Desktop Window Manager.
- [ ] Step 8: Run tests and verify.
- [ ] Step 9: Commit changes with message `feat(dev-lab): implement JWT inspector, diff checker, color palette, and SQL studio`.

---

### Task 8: AI Copilot Dock & Research Evidence Desk
**Files:**
- Create: `src/components/ai/ai-copilot-dock.tsx`
- Create: `src/components/research/evidence-board-modal.tsx`
- Create: `src/app/admin/research/page.tsx`
- Test: `tests/ai-research.test.ts`

**Interfaces:**
- Produces: `AiCopilotDock`, `EvidenceBoardModal`, `/admin/research`.
- Features:
  - Multi-model AI Copilot (OpenAI, Anthropic, Gemini, Groq, Ollama mock): BYOK key storage encrypted with AES-256-GCM.
  - "Ask My Second Brain" RAG retrieval across notes, snippets, tasks, projects.
  - Auto Daily Standup generator from completed tasks and focus sessions.
  - Approval Tiers UI (A0 Read, A1 Reversible Write, A2 External, A3 Destructive).
  - Research Evidence Desk: Source Library (URL, author, excerpt), Claims & Contradiction Board (Supported, Disputed, Refuted).

- [ ] Step 1: Write unit tests for RAG query scope parser and evidence claim model in `tests/ai-research.test.ts`.
- [ ] Step 2: Implement `ai-copilot-dock.tsx` with chat stream UI, model selector, context budget, and approval gate.
- [ ] Step 3: Implement `evidence-board-modal.tsx` and `/admin/research/page.tsx` with sources and claim verification.
- [ ] Step 4: Run tests and verify.
- [ ] Step 5: Commit changes with message `feat(ai & research): implement AI copilot dock, RAG brain and research evidence board`.

---

### Task 9: Desktop Integration, Shell Shell Assembly & Verification
**Files:**
- Modify: `src/components/layout/admin-shell.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/components/ui/command-menu.tsx`
- Test: Full Vitest suite, ESLint, TypeScript check, Production build.

**Interfaces:**
- Assembles: Virtual Desktop Window Manager inside `AdminShell`, command palette integration (`Cmd+K`), wallpaper engine sync, and responsive fallback.

- [ ] Step 1: Integrate `VirtualDesktop` and `WindowManagerProvider` into `AdminShell`.
- [ ] Step 2: Register all window apps in `command-menu.tsx` with quick keyboard shortcuts.
- [ ] Step 3: Run `npm run lint` and verify 0 errors, 0 warnings.
- [ ] Step 4: Run `npm run typecheck` and verify 0 errors.
- [ ] Step 5: Run `npm test` and verify all tests pass.
- [ ] Step 6: Run `npm run build` to verify complete production compilation.
- [ ] Step 7: Push all commits to `origin/main`.
- [ ] Step 8: Verify localhost:3000 and report back to user.
