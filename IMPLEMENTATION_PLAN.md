# CollabAI Transformation & Implementation Plan

## 1. System Architecture & Codebase Findings

- **Backend**: Express + Socket.IO server (`server.js`).
- **Data Persistence**:
  - Hot path: Redis key `doc:<docId>` and in-memory `docState` dictionary.
  - Long-term storage: MongoDB (`Document` model in `db.js`), flushed every 10 operations.
  - Concurrency/OT: Custom Operational Transformation in `ot.js` (`transform`, `applyOperation`), handling multi-character insert and delete operations with positional offsets.
- **Authentication**: JWT access token (15m expiration) + refresh token (7d stored in Redis) (`auth.js`).
- **AI Integrations**: Google Gemini 2.0 Flash (`suggestions.js`):
  - Typo/garbled text suggestion: streamed via `request-suggestion` -> `suggestion-chunk` -> `suggestion-done`.
  - Conflict mediator: proximity heuristic (edits within 4s and 30 characters) triggers semantic conflict analysis via `checkForConflict` -> emits `conflict-suggestion`.
- **Existing Frontend**: Minimal unstyled prototype in `public/index.html` with raw `<textarea>` and hardcoded test refresh token.

## 2. Identified Fixes & Backend Resilience Enhancements

1. **`ot.js` resilience**: Handle both `text` and legacy `char` property to ensure `node test-ot.js` passes and avoid any runtime `undefined` property errors.
2. **`db.js` resilience**: MongoDB is running locally; provide a robust in-memory fallback for Redis so that if Redis/Docker is not running, authentication and caching gracefully fall back to memory rather than crashing the server.
3. **Document Management Endpoints**:
   - `GET /api/documents`: List existing documents from MongoDB/memory.
   - `POST /api/documents`: Create a new document with customizable title.
   - `GET /api/documents/:id`: Fetch document metadata & content.
   - `PATCH /api/documents/:id/title`: Update document title with persistence to MongoDB.
4. **Environment Configuration**: Add `.env.example` with clear instructions for `GEMINI_API_KEY`, `ACCESS_SECRET`, `REFRESH_SECRET`, and port configurations.

## 3. Frontend Implementation Plan (Polished Google Docs Inspiration)

- **Design System & Visual Identity**:
  - Clean light surfaces (`#f8f9fa`, `#ffffff`, `#f1f3f4`), subtle Google Docs elevation (`0 1px 3px rgba(60,64,67,0.15)`).
  - High-end typography (Inter & Google Sans aesthetic), crisp icons, responsive layout.
  - Authentic centered document canvas mimicking an 8.5" x 11" page with realistic margins, padding, and subtle borders.
- **Pages & Views (Single Page Application in `public/`)**:
  1. **Landing Page**:
     - Modern SaaS hero section with live interactive preview.
     - Features showcase (Real-time OT Engine, AI Conflict Resolution, Cloud Sync).
     - Architecture breakdown diagram and interactive "Try Demo" CTA.
  2. **Auth & Demo User Switcher**:
     - Seamless demo-user selection (e.g. Alex Rivera, Sarah Chen, David Kim) or custom name.
     - Integrated JWT login with real backend `/login`, refresh token storage, and transparent auto-refresh on token expiry.
  3. **Document Dashboard**:
     - Clean Google Drive-style document browser with search, sort, and template presets (Blank, Project Brief, Meeting Notes).
     - Real document creation and opening via `/api/documents` and `#doc=<docId>`.
  4. **Full Document Editor**:
     - **Top App Bar**: Document title (inline editable with MongoDB sync), Cloud Sync status indicator ("Saved", "Saving...", "Offline"), Share button, Connection status indicator, User Avatar, Document Menu (File, Edit, View, Help).
     - **Formatting Toolbar**: Bold, Italic, Underline, Strikethrough, Heading styles, Text alignment, Bulleted list, Numbered list, Text/Highlight colors, Clear formatting, Undo/Redo.
     - **Document Canvas**: High-fidelity editable page with seamless OT diffing, selection retention, cursor preservation across remote operations.
     - **AI Writing Assistant (Gemini)**: Collapsible sidebar with real-time typo correction, tone adjustment, streaming suggestions, and one-click "Apply to Document" via OT operations.
     - **Intelligent Conflict Notification**: Elegant toast/modal alerting collaborators when the Gemini conflict mediator detects semantic overlapping edits, offering merge options.
     - **Share Dialog**: Document link copying with visual feedback, collaborator list, and transparent explanation of access model.

## 4. Verification & Testing

- Run unit test `node test-ot.js`.
- Start the server and verify API endpoints (`/login`, `/refresh`, `/api/documents`).
- Test two independent browser sessions side-by-side editing the same document in real time.
- Verify remote operation transformation, cursor preservation, and absence of echo loops.
- Verify AI assistant and conflict alerts.
