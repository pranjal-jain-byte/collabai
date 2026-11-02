# CollabAI — Premium AI-Native Collaborative Workspace Implementation Plan

**Positioning:** *Where teams think, write, and build together.*

---

## Architecture & Data Flow

```mermaid
graph TD
    Client[React 19 + Tailwind v4 + Vite Client] -->|WebSocket (Port 3000)| SocketServer[Socket.IO Server]
    Client -->|REST API (Port 3000)| RestAPI[Express.js API]
    SocketServer --> OT[Operational Transformation Engine]
    SocketServer --> Presence[Collaborator Presence & Cursors]
    SocketServer --> AIAssistant[Groq / Gemini AI Streamer]
    RestAPI --> Auth[JWT Authentication]
    RestAPI --> DocService[Document Service]
    RestAPI --> VersionService[Durable Version History Service]
    RestAPI --> ActionService[Action Items Extraction Service]
    RestAPI --> AIReviewService[AI Review & Q&A Service]
    DocService --> Redis[(Redis Hot Cache)]
    DocService --> Mongo[(MongoDB Primary Store)]
    VersionService --> Mongo
    ActionService --> Mongo
    AIReviewService --> GroqAPI[Groq Cloud API]
```

---

## Phase Breakdown

### Phase 1: Architecture, Data Models & Backend Services
- **Durable Version History (`Revision` model)**:
  - Stores `docId`, `version`, `content`, `title`, `author`, `authorName`, `label`, `summary`, `createdAt`.
  - Automatic snapshotting every 15 operations or on explicit manual label/checkpoint.
  - REST endpoints:
    - `GET /api/documents/:docId/versions`
    - `GET /api/documents/:docId/versions/:versionId`
    - `POST /api/documents/:docId/versions` (manual checkpoint)
    - `POST /api/documents/:docId/versions/:versionId/restore` (applies diff via OT as new revision)
- **Action Items Extraction (`ActionItem` model)**:
  - Stores `docId`, `task`, `assignee`, `dueDate`, `dependencies`, `openQuestions`, `status` (`pending` / `completed`), `createdAt`.
  - REST endpoints:
    - `POST /api/documents/:docId/actions/extract` (Groq AI structured extraction)
    - `GET /api/documents/:docId/actions`
    - `PATCH /api/documents/:docId/actions/:actionId`
    - `DELETE /api/documents/:docId/actions/:actionId`
- **AI Review Mode & Ask Your Document**:
  - Socket / REST endpoint `POST /api/documents/:docId/ai/review`:
    - Structured review across 7 categories: Clarity, Grammar, Structure, Contradictions, Missing Information, Unsupported Claims, Redundancy.
    - Returns structured suggestions: `{ id, category, title, originalText, suggestedText, explanation }`.
  - Socket / REST endpoint `POST /api/documents/:docId/ai/ask`:
    - Document-aware Q&A scoped to document context.
    - Streaming answers, suggested follow-ups, and source citation snippets.

### Phase 2: Design System & SaaS Layout Transformation
- Modern SaaS aesthetic inspired by Linear, Notion, and Raycast.
- Restrained, curated palette:
  - Primary: Deep Indigo (`#4f46e5`) & Electric Violet (`#7c3aed`).
  - Dark surfaces: Deep Slate / Charcoal (`#0f172a`, `#1e293b`).
  - Warm neutral canvas: `#f8fafc`.
  - Semantic status colors for review categories and task priorities.
- Unified 3-column / collapsible workspace layout:
  - **Left Sidebar**: Navigation, Workspace search, Recent documents, Quick actions, Collapse toggle.
  - **Top Navigation Bar**: Title edit, Save/Sync status indicator, Active collaborator avatars, Share modal, Right panel tabs switcher.
  - **Center Canvas**: Focused Google Docs-style document editor with collaborator colored cursors and selection highlights.
  - **Right Sidebar (Multi-Mode AI & Productivity Panel)**:
    - Tab 1: **AI Review** (Category filters, Suggestion cards with diffs, Safe Accept/Reject via OT).
    - Tab 2: **Ask Document** (Document-aware Q&A, Suggested prompts, Streaming chat).
    - Tab 3: **Version History** (Timeline of revisions, visual diff comparison, one-click restore).
    - Tab 4: **Action Items** (Extracted tasks, assignees, deadlines, status checkboxes).
    - Tab 5: **Writing Assistant** (High-speed typo, grammar, and style polish).

### Phase 3: 3D Motion Graphics & Premium Hero Visual
- **Landing Page Hero Visual**:
  - Interactive 3D perspective stage with CSS 3D transforms (`rotateX`, `rotateY`, `translateZ`, `perspective: 1200px`).
  - Multi-layered floating document preview with active collaborator cursors moving in real-time.
  - Layered translucent glassmorphism cards showcasing AI review and conflict mediation.
  - Ambient particle constellation and refined gradient lighting.
  - Full `prefers-reduced-motion` compliance.

### Phase 4: Stale-Proof OT Suggestion Application
- When user accepts an AI review suggestion:
  - Verify `originalText` matches current document substring.
  - If document has shifted concurrently, locate new offset or reject gracefully with explanation.
  - Apply edit via standard OT `operation` protocol so all collaborators receive it without overwriting intervening edits.

### Phase 5: Verification & Automated Test Suite
- Comprehensive automated tests covering:
  - Version history creation, retrieval, and restoration as a new revision.
  - Action item extraction, update, and persistence.
  - AI Review structured suggestions generation and OT application.
  - Document-grounded Q&A authorization and correctness.
  - Full regression test run with existing OT, presence, and sync protocol tests.
