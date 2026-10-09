# Personal Web OS 3.0 — The Sovereign Executive Suite Design Spec

**Date:** 2026-10-09  
**Status:** Approved  
**Author:** Antigravity Architect  
**Workspace:** `e:\website-owner`  

---

## 1. Executive Summary & Goal
Transform the single-owner Personal Web OS from a pure publishing CMS into an all-in-one personal operating command center. This system combines 4 powerhouse subsystems:
1. **Work & Productivity Ops:** Personal Kanban Task Board, Focus Studio with Web Audio Ambient Synthesizer & Pomodoro, Subscription/VPS/Domain Cost Tracker, and Quick Scratchpad Sticky Desk.
2. **Second Brain & Knowledge Studio:** Bi-directional `[[wiki-links]]` with automatic Backlinks, Interactive Force-Directed 2D Knowledge Graph Canvas, and Daily Journal with 365-day Activity Heatmap.
3. **Developer Studio & Tools:** Developer Code Snippets Vault (30+ languages, copy feedback), Mini HTTP/API Client Request Tester, Markdown Lab (LaTeX KaTeX + Mermaid.js), and Offline-First Dev Utilities (JSON, UUID v4/v7, Regex, Crypto, Timestamps).
4. **Ultra Theming & Immersive Web OS:** Multi-mode Wallpaper Engine (Obsidian Ember, Digital Aurora, Cyber Matrix, Starfield, Custom Upload), Web Audio UI Sound FX Engine (Mechanical Thock, Soft Chime, Vault Lock), and Floating macOS-style Application Dock.

---

## 2. Global Constraints & Principles
- **Single-Owner Sovereignity:** All private tools (Tasks, Vault, Journal, Scratchpad, Subscriptions, API Tester) are private by default, strictly accessible only to the authenticated owner.
- **Backend Isolation:** Public queries never expose private data. Public APIs only query `PUBLISHED` + `PUBLIC` records.
- **Fail-Closed Origin Guard:** Every mutating route (`POST`, `PUT`, `DELETE`, `PATCH`) must call `await assertValidOrigin(req)`.
- **Zero-Dependency Lightweight Audio/Physics:** 
  - Ambient sounds & UI sound effects use Web Audio API (procedural synthesis, 0 extra audio files, offline-ready).
  - Knowledge Graph uses high-performance HTML5 2D Canvas Force-Directed physics (0 heavy D3/Cytoscape bloat).
- **Quality Gates:** 0 ESLint errors/warnings, 0 TypeScript errors, 100% Vietnamese user-facing UI, Next.js 16 / React 19 compliance (no effect setState loops, pure renders).

---

## 3. Data Architecture & Schema Additions

### 3.1 New Database Tables (`src/lib/db/schema.ts`)
1. **`kanban_tasks`**
   - `id`: text primary key
   - `profileId`: text references profiles(id)
   - `title`: text not null
   - `description`: text
   - `status`: text not null ('backlog' | 'todo' | 'in_progress' | 'review' | 'done')
   - `priority`: text not null ('urgent' | 'high' | 'medium' | 'low')
   - `dueDate`: text
   - `tags`: text array / json
   - `subtasksJson`: text (JSON array of `{ id: string, title: string, completed: boolean }`)
   - `sortOrder`: integer not null default 0
   - `relatedItemId`: text (link to project or content_item)
   - `createdAt`, `updatedAt`

2. **`subscriptions`**
   - `id`: text primary key
   - `profileId`: text references profiles(id)
   - `name`: text not null (e.g., 'Cloudflare Workers', 'VPS Hetzner', 'OpenAI API')
   - `category`: text not null ('infrastructure' | 'ai' | 'developer' | 'lifestyle')
   - `cost`: integer not null (e.g., 250000 or 10)
   - `currency`: text not null ('VND' | 'USD')
   - `billingCycle`: text not null ('monthly' | 'yearly')
   - `nextBillingDate`: text not null
   - `status`: text not null ('active' | 'paused' | 'canceled')
   - `url`: text
   - `notes`: text
   - `createdAt`, `updatedAt`

3. **`code_snippets`**
   - `id`: text primary key
   - `profileId`: text references profiles(id)
   - `title`: text not null
   - `description`: text
   - `language`: text not null ('typescript' | 'python' | 'rust' | 'go' | 'sql' | 'bash' | 'json' | 'yaml' | 'dockerfile' | 'css' | 'other')
   - `code`: text not null
   - `tags`: text array / json
   - `isFavorite`: boolean default false
   - `createdAt`, `updatedAt`

4. **`scratchpads`**
   - `id`: text primary key
   - `profileId`: text references profiles(id)
   - `title`: text
   - `content`: text not null
   - `color`: text not null ('amber' | 'emerald' | 'sky' | 'rose' | 'violet' | 'stone')
   - `isPinned`: boolean default false
   - `sortOrder`: integer default 0
   - `createdAt`, `updatedAt`

5. **`content_links` (Bi-directional Wiki-links)**
   - `id`: text primary key
   - `sourceId`: text references content_items(id)
   - `targetId`: text references content_items(id)
   - `linkText`: text not null
   - `createdAt`

6. **Extended `ContentItem.type`:**
   - Add `'journal'` to `('note' | 'article' | 'project' | 'resource' | 'link' | 'journal')`.

---

## 4. Subsystems Specifications

### 4.1 Subsystem 1: Work & Productivity Ops
- **Kanban Board:** Multi-column drag-and-drop or fast status switch, priority badges, subtask progress checklist, deadline countdown, fast add.
- **Focus Studio & Ambient Sound Synthesizer:**
  - Procedural sound generator using `AudioContext`, pink noise filter buffers, ocean wave low-frequency oscillators, campfire burst noise.
  - Pomodoro timer with countdown, notification chime on session complete.
  - Zen Mode modal covering viewport with minimal clock and quote.
- **Subscription Tracker:**
  - Aggregates monthly & yearly total costs in VND and USD.
  - Identifies renewals occurring within the next 7 days with warning pill.
- **Quick Scratchpad:**
  - Grid of sticky notes on Dashboard with real-time autosave.
  - One-click "Convert to Note/Article" button.

### 4.2 Subsystem 2: Second Brain & Knowledge Studio
- **Wiki-links Engine:**
  - Regex parser `\[\[(.*?)\]\]` converts bracketed titles into internal links.
  - On save, auto-populates `content_links` table.
  - Backlinks component renders inbound links.
- **Knowledge Graph 2D Canvas (`/admin/graph`):**
  - Custom HTML5 2D canvas simulation.
  - Node types: Note (blue), Article (emerald), Project (amber), Resource (purple), Journal (rose).
  - Hover highlights adjacent connections with label and summary preview.
  - Click drags node; double click navigates to entity.
- **Daily Journal & Activity Heatmap:**
  - Daily log interface creating/updating today's journal entry.
  - 52-week activity heatmap displaying daily contribution frequency.

### 4.3 Subsystem 3: Developer Studio & Tools
- **Snippets Manager (`/admin/snippets`):**
  - Searchable snippet repository, language selector with syntax highlight, one-click copy button.
- **Mini HTTP Request Tester (`/admin/api-tester`):**
  - Client-side fetch proxy or direct request sender.
  - Request headers, query params, JSON body editor.
  - Response status code, elapsed duration (ms), headers, formatted JSON output.
  - Saved requests list.
- **Dev Utilities Palette (`/admin/tools`):**
  - Tabs: JSON Formatter, UUID Generator (v4/v7), Regex Playground, Crypto/Hash (MD5, SHA-256, Base64), Timestamp Converter.
- **Markdown Lab:**
  - Live split preview supporting KaTeX math and Mermaid diagram generation.

### 4.4 Subsystem 4: Ultra Theming & Immersive Web OS
- **Wallpaper Engine:**
  - Preset options: Obsidian Ember, Digital Aurora, Cyber Matrix, Starfield, Custom URL/Upload.
  - Preserved in client storage and applied to background container.
- **Web Audio UI Sound FX Engine:**
  - Procedural click (`mechanical-thock`), chime (`soft-bell`), lock (`vault-snap`).
  - Global sound toggle button in Admin Shell status bar.
- **Floating Application Dock:**
  - Floating bottom dock with icons for Dashboard, Tasks, Notes, Snippets, Dev Tools, Vault, Graph, Settings.
  - Smooth magnification on pointer hover.

---

## 5. Security & Verification Strategy
- Every new API endpoint is protected by `requireOwner()` and `assertValidOrigin()`.
- Pure client-side execution for dev tools and audio synthesis guarantees 0 credential leaks and 0 server load.
- Verification plan:
  - Unit tests for DB operations, Wiki-link parsing, and API routes.
  - Full TypeScript typecheck passing with 0 errors.
  - Full ESLint passing with 0 errors and 0 warnings.
  - Turbopack production build passing.
  - Git commit & push to `origin/main`.
