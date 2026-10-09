# Personal Web OS 3.0 — The Sovereign Executive Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and integrate all 4 major subsystems of Personal Web OS 3.0: Personal Kanban Tasks, Focus Studio with procedural Web Audio ambient soundscapes, Subscription/VPS Tracker, Bi-directional Wiki-links with Backlinks, Interactive 2D Canvas Knowledge Graph, Daily Journal with 365-day Activity Heatmap, Code Snippets Vault, Mini HTTP/API Tester, Offline-First Dev Utilities, Wallpaper Engine, Web Audio UI Sound FX, and macOS-style Floating Application Dock.

**Architecture:** Maintain strict single-owner sovereign design, backend isolation (private tools never expose data publicly), fail-closed Origin Guard CSRF defense on all mutating APIs, procedural zero-dependency Web Audio synthesizer, and pure HTML5 2D Canvas force simulation. 

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS, Drizzle ORM (PostgreSQL / SQLite compatibility), Web Audio API, HTML5 Canvas 2D, Vitest.

## Global Constraints
- Zero `any` types across all files.
- 0 ESLint errors and 0 warnings.
- 0 TypeScript compilation errors (`tsc --noEmit`).
- React 19 / Next.js 16 compiler compliance: No `react-hooks/set-state-in-effect`, pure render cycles.
- 100% Vietnamese user-facing copy.
- Fail-closed Origin Guard: all state-mutating handlers (`POST`, `PUT`, `DELETE`, `PATCH`) must call `await assertValidOrigin(req)`.
- Single-owner authentication: Protected via `requireOwner()`.

---

### Task 1: Database Schema & Type Definitions Extension

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/types/index.ts`
- Create: `tests/schema-super-suite.test.ts`

**Interfaces:**
- Produces: `kanbanTasks`, `subscriptions`, `codeSnippets`, `scratchpads`, `contentLinks` tables, and matching TypeScript interfaces.

- [ ] **Step 1: Write test for new schema definitions**
Create `tests/schema-super-suite.test.ts` verifying all new tables can be imported, instantiated, and have required fields.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/schema-super-suite.test.ts`
Expected: FAIL due to missing table exports.

- [ ] **Step 3: Implement new tables in `schema.ts` & types in `index.ts`**
Add Drizzle ORM table definitions:
- `kanbanTasks`: id, profileId, title, description, status, priority, dueDate, tags, subtasksJson, sortOrder, relatedItemId, createdAt, updatedAt
- `subscriptions`: id, profileId, name, category, cost, currency, billingCycle, nextBillingDate, status, url, notes, createdAt, updatedAt
- `codeSnippets`: id, profileId, title, description, language, code, tags, isFavorite, createdAt, updatedAt
- `scratchpads`: id, profileId, title, content, color, isPinned, sortOrder, createdAt, updatedAt
- `contentLinks`: id, sourceId, targetId, linkText, createdAt

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/schema-super-suite.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
`git add src/lib/db/schema.ts src/lib/types/index.ts tests/schema-super-suite.test.ts`
`git commit -m "feat(schema): add kanban tasks, subscriptions, snippets, scratchpads and content links tables"`

---

### Task 2: Work & Productivity APIs (Kanban, Subscriptions, Scratchpad)

**Files:**
- Create: `src/app/api/admin/tasks/route.ts`
- Create: `src/app/api/admin/tasks/[id]/route.ts`
- Create: `src/app/api/admin/subscriptions/route.ts`
- Create: `src/app/api/admin/subscriptions/[id]/route.ts`
- Create: `src/app/api/admin/scratchpads/route.ts`
- Create: `src/app/api/admin/scratchpads/[id]/route.ts`
- Create: `tests/productivity-api.test.ts`

**Interfaces:**
- `GET /api/admin/tasks` -> `{ tasks: KanbanTask[] }`
- `POST /api/admin/tasks` -> `{ task: KanbanTask }`
- `PUT /api/admin/tasks/[id]` -> `{ task: KanbanTask }`
- `DELETE /api/admin/tasks/[id]` -> `{ success: true }`
- Matching CRUD for subscriptions & scratchpads.

- [ ] **Step 1: Write integration tests for Productivity APIs**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement API routes with `requireOwner` and `assertValidOrigin`**
- [ ] **Step 4: Run test to verify passes**
- [ ] **Step 5: Commit**

---

### Task 3: Second Brain & Knowledge APIs (Wiki-links, Graph, Journal)

**Files:**
- Create: `src/lib/knowledge/wiki-links.ts`
- Create: `src/app/api/admin/graph/route.ts`
- Create: `src/app/api/admin/links/backlinks/route.ts`
- Create: `tests/knowledge-graph.test.ts`

**Interfaces:**
- `parseWikiLinks(markdown: string): string[]`
- `syncContentLinks(db, sourceId, markdown)`
- `GET /api/admin/graph` -> `{ nodes: GraphNode[], edges: GraphEdge[] }`
- `GET /api/admin/links/backlinks?targetId=xxx` -> `{ backlinks: BacklinkItem[] }`

- [ ] **Step 1: Write unit tests for `wiki-links.ts` and Graph endpoint**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement wiki-link parsing and graph builder endpoint**
- [ ] **Step 4: Run test to verify passes**
- [ ] **Step 5: Commit**

---

### Task 4: Developer Studio APIs & Utilities (Snippets & HTTP Tester)

**Files:**
- Create: `src/app/api/admin/snippets/route.ts`
- Create: `src/app/api/admin/snippets/[id]/route.ts`
- Create: `src/app/api/admin/http-proxy/route.ts`
- Create: `src/lib/dev-tools/converters.ts`
- Create: `tests/dev-tools.test.ts`

**Interfaces:**
- CRUD for code snippets.
- `POST /api/admin/http-proxy` -> proxy request to avoid CORS when testing external APIs.
- Client utility helpers for JSON formatting, UUID generation, Regex test, Crypto hash, Unix timestamp conversions.

- [ ] **Step 1: Write unit tests for dev-tools converters and snippet API**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement snippets API, http-proxy API, and converters**
- [ ] **Step 4: Run test to verify passes**
- [ ] **Step 5: Commit**

---

### Task 5: Web Audio Sound FX & Ambient Synthesizer Modules

**Files:**
- Create: `src/lib/audio/sound-fx.ts`
- Create: `src/lib/audio/ambient-synth.ts`
- Create: `tests/audio-synth.test.ts`

**Interfaces:**
- `playSound(type: 'thock' | 'chime' | 'lock')`
- `class AmbientSynthesizer` with methods `start(preset: 'rain' | 'ocean' | 'campfire' | 'noise')`, `stop()`, `setVolume(v: number)`

- [ ] **Step 1: Write test for audio synthesis parameter validation**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement Web Audio API procedural synthesizers**
- [ ] **Step 4: Run test to verify passes**
- [ ] **Step 5: Commit**

---

### Task 6: UI Component Implementation - Work & Productivity

**Files:**
- Create: `src/app/admin/tasks/page.tsx`
- Create: `src/components/ui/focus-studio-modal.tsx`
- Create: `src/app/admin/subscriptions/page.tsx`
- Create: `src/components/ui/scratchpad-desk.tsx`
- Modify: `src/app/admin/page.tsx` (embed Scratchpad desk and quick shortcuts)

- [ ] **Step 1: Implement Personal Kanban Board with drag-and-drop & subtasks**
- [ ] **Step 2: Implement Focus Studio Modal with Pomodoro timer & Ambient soundscapes**
- [ ] **Step 3: Implement Subscription & Tech Stack Tracker page**
- [ ] **Step 4: Implement Scratchpad sticky notes desk on Dashboard**
- [ ] **Step 5: Commit**

---

### Task 7: UI Component Implementation - Second Brain & Graph View

**Files:**
- Create: `src/app/admin/graph/page.tsx`
- Create: `src/app/admin/journal/page.tsx`
- Create: `src/components/ui/backlinks-view.tsx`
- Modify: `src/app/admin/content/page.tsx` (support journal type & wiki-links preview)

- [ ] **Step 1: Implement HTML5 Canvas Force-Directed Knowledge Graph View**
- [ ] **Step 2: Implement Daily Journal page with 365-day Activity Heatmap**
- [ ] **Step 3: Implement Backlinks viewer component**
- [ ] **Step 4: Commit**

---

### Task 8: UI Component Implementation - Dev Studio & Tools

**Files:**
- Create: `src/app/admin/snippets/page.tsx`
- Create: `src/app/admin/api-tester/page.tsx`
- Create: `src/components/ui/dev-tools-modal.tsx`
- Modify: `src/components/ui/command-menu.tsx` (add quick shortcuts to new tools)

- [ ] **Step 1: Implement Developer Code Snippets Vault page**
- [ ] **Step 2: Implement Mini HTTP / API Request Tester page**
- [ ] **Step 3: Implement Dev Tools Palette modal (JSON, UUID, Regex, Crypto, Timestamps)**
- [ ] **Step 4: Update Command Menu (Ctrl+K) with quick shortcuts**
- [ ] **Step 5: Commit**

---

### Task 9: UI Component Implementation - Ultra Theming & Application Dock

**Files:**
- Create: `src/components/ui/wallpaper-engine.tsx`
- Create: `src/components/ui/floating-dock.tsx`
- Modify: `src/components/layout/admin-shell.tsx`
- Modify: `src/components/layout/admin-header.tsx`
- Modify: `src/app/admin/settings/page.tsx`

- [ ] **Step 1: Implement Wallpaper Engine with preset animations & custom background**
- [ ] **Step 2: Implement macOS-style Floating Application Dock**
- [ ] **Step 3: Integrate Audio toggle and Dock into AdminShell**
- [ ] **Step 4: Update Settings with theme presets & sound preferences**
- [ ] **Step 5: Commit**

---

### Task 10: Verification, Full Testing, Quality Gates & GitHub Push

**Files:**
- Test suite: `tests/*.test.ts`
- Codebase check: `npm run typecheck`, `npx eslint src`, `npm test`, `npm run build`

- [ ] **Step 1: Run all unit and integration tests (`npm test`)**
- [ ] **Step 2: Run TypeScript typecheck (`npm run typecheck`) -> 0 errors**
- [ ] **Step 3: Run ESLint (`npx eslint src`) -> 0 errors, 0 warnings**
- [ ] **Step 4: Run Next.js production build (`npm run build`)**
- [ ] **Step 5: Git commit & push all changes to `origin/main`**
