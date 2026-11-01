# CollabAI

A real-time collaborative document editor inspired by Google Docs and modern productivity SaaS products — built to understand and demonstrate the distributed systems that power concurrent editing: Operational Transformation (OT), WebSocket synchronization, dual-layer Redis/MongoDB persistence, JWT authentication with instant revocation, and Google Gemini AI conflict mediation.

---

## Highlights & Capabilities

- **Real-Time Operational Transformation (OT)**: Built from first principles to handle concurrent multi-character insertions and deletions without race conditions, duplicate-echo bugs, or document corruption.
- **Google Docs-Inspired Interface**: Clean, distraction-free document canvas mimicking an authentic 8.5" x 11" page with margins, elevation, live character/word counters, paragraph formatting, and status indicators.
- **Google Gemini 2.0 Flash AI Integration**:
  - **Proactive AI Writing Assistant**: Streams typo and grammar corrections directly into an interactive review drawer.
  - **Semantic Conflict Mediator**: Proximity-based heuristic (concurrent edits within 4 seconds and 30 characters) triggers Gemini to evaluate semantic collisions and recommend clean merges.
- **Dual Persistence Architecture**: In-memory Redis hot-path for low-latency keystroke reads and instant session revocations, with resilient in-memory fallback and periodic asynchronous flushes to MongoDB for durable checkpoints.
- **Interactive Document Dashboard**: Document search, template gallery (Blank Document, Project Proposal, Meeting Notes), and document management.
- **Demo-User Authentication**: Zero-barrier multi-user testing with switchable collaborator profiles (Alex Rivera, Sarah Chen, David Kim) issuing 15-minute JWT access tokens and 7-day refresh tokens.

---

## System Architecture

```
                    ┌─────────────────────────────────┐
                    │       Browser Client (SPA)      │
                    │   Google Docs Page Canvas       │
                    │   Prefix/Suffix Diff Engine     │
                    └───────────────┬─────────────────┘
                                    │ WebSockets (Socket.IO)
                                    ▼
                    ┌─────────────────────────────────┐
                    │      Node.js / Express Server   │
                    │  OT History Transform Engine    │
                    │  JWT Auth & Session Controller  │
                    └───────┬───────────────┬─────────┘
                            │               │
            ┌───────────────┴────┐     ┌────┴────────────────┐
            ▼                    ▼     ▼                     ▼
   ┌─────────────────┐ ┌─────────────┐ ┌─────────────────────────┐
   │  Redis Hot Path │ │  MongoDB    │ │  Google Gemini API      │
   │  (Active Docs,  │ │  (Durable   │ │  (Streaming Typo Fixes, │
   │  Refresh Tokens)│ │  Storage)   │ │  Semantic Conflict Med.)│
   └─────────────────┘ └─────────────┘ └─────────────────────────┘
```

### 1. Concurrency via Operational Transformation
Clients calculate minimal positional diffs (`type: 'insert' | 'delete', position, text/count`) using a common-prefix and common-suffix comparison algorithm. Incoming client edits are transformed against the server's operation history (`opHistory`) starting from the client's `baseVersion`. The sender receives an acknowledgment (`operation-ack`) while peers receive transformed operations (`operation`), preserving local cursor positions across incoming edits.

### 2. Dual-Layer Storage Split
Live document state is maintained synchronously in-memory on the server for correctness and mirrored to Redis on every keystroke. Every 10 operations, a background flush commits the document to MongoDB. If Redis or Docker is not active locally, CollabAI seamlessly engages a resilient in-memory store for sessions and hot path caching while continuing to persist to MongoDB.

### 3. Authentication & Instant Session Revocation
REST endpoints and Socket.IO handshakes are protected by 15-minute JWT access tokens. Refresh tokens (7-day validity) are stored in the server session cache, enabling instantaneous token revocation upon logout without database queries or waiting for expiration.

### 4. AI Writing Assistant & Conflict Mediation
- **Typo & Style Streaming**: Emits `request-suggestion` to Gemini 2.0 Flash; chunks stream via `suggestion-chunk` and can be accepted with one click (which emits a calculated OT diff to keep all collaborators in sync).
- **Conflict Mediator**: Detects when two distinct users edit overlapping text regions within 4 seconds. Gemini analyzes the collision snippet and emits a `conflict-suggestion` event with a merged suggestion.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended; tested on v22.18.0)
- [MongoDB](https://www.mongodb.com/) (running locally on port `27017` or via Docker)
- [Docker Desktop](https://www.docker.com/) (Optional: for containerized Redis and MongoDB)
- Google Gemini API key (Optional: get a free key from [Google AI Studio](https://aistudio.google.com/apikey))

### 1. Installation
```bash
git clone <repository-url>
cd collabai
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory (or copy from `.env.example`):
```env
PORT=3000
ACCESS_SECRET=your-random-access-secret-key
REFRESH_SECRET=your-random-refresh-secret-key
GEMINI_API_KEY=your-gemini-api-key
MONGO_URI=mongodb://127.0.0.1:27017/collabai
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

*(Note: If `GEMINI_API_KEY` is omitted, real-time collaboration and OT editing continue to work 100% normally; the AI panel will simply prompt you to add a key.)*

### 3. (Optional) Start Redis & MongoDB with Docker
```bash
docker-compose up -d
```
*(If you have MongoDB installed natively as a Windows/Linux service and do not run Redis, CollabAI will automatically use its built-in in-memory fallback for Redis and connect directly to your local MongoDB.)*

### 4. Run the Backend Server
```bash
npm start
```
Or for auto-reloading development:
```bash
npm run dev
```

The backend server is accessible at **`http://localhost:3000`**.

---

### 5. Run the React + Vite Frontend
The modular React frontend lives in `client/` and is styled with Tailwind CSS, Lucide React, and React Router:

```bash
# From the root directory:
npm run client

# Or directly in the client folder:
cd client
npm install
npm run dev
```

Visit **`http://localhost:5173`** to access the React application. The Vite development server automatically proxies API and Socket.IO requests to the backend at `http://localhost:3000`.

To build the React production bundle:
```bash
npm run client:build
```

---

## Verifying Multi-User Collaboration

1. Open `http://localhost:3000` in your primary browser.
2. Click **Start Writing** (or sign in as **Alex Rivera**).
3. Open a second browser window (or Incognito window) at `http://localhost:3000`.
4. Switch collaborator profile to **Sarah Chen**.
5. Open the same document (e.g. `test-doc` or any newly created document ID).
6. Type in both windows simultaneously: keystrokes broadcast and converge instantly without page refreshes.

---

## Testing & Quality Assurance

CollabAI includes an automated test suite verifying both unit-level OT transformations and live multi-client Socket.IO synchronization:

```bash
# Run both unit and integration tests
npm test

# Run OT transform unit tests
npm run test:ot

# Run dual-client Socket.IO integration test
npm run test:collab
```

---

## Honest Technical Disclosures & Known Limitations

1. **Plain-Text OT vs. Rich-Text ASTs**: CollabAI's OT algorithm operates strictly on positional character strings (`insert` and `delete`). True WYSIWYG rich-text styling (nested DOM trees / JSON schemas like ProseMirror or TipTap) requires tree-based transformation or CRDTs (e.g. Yjs / Automerge). Rich styling in this interface uses Markdown conventions and document layout styling to preserve 100% synchronization integrity without corrupting character offsets.
2. **Access Control & Permissions**: Document sharing uses an open room ID identifier model. Any user possessing the link and a valid session can view and edit. Granular user access lists (viewer, commenter, editor roles) and password-protected rooms are reserved for future work.
3. **Proximity-Based Conflict Trigger**: Semantic conflict detection uses a time-and-position heuristic (concurrent edits within 4000ms and 30 characters). Pathological conflicts occurring across widely separated lines or subtle semantic contradictions across paragraphs are not automatically flagged by this heuristic.
4. **OT Edge Cases**: This OT algorithm was built from scratch for learning and demonstration. While tested against concurrent multi-user edits, it has not undergone formal fuzzing against extreme network reordering edge cases that industrial engines (like ShareDB or Google Wave OT) handle.

---

## Future Roadmap

- [ ] Granular document access control (Owner, Editor, Viewer permissions).
- [ ] Live collaborator cursor presence (visual colored carousels showing other users' cursor positions).
- [ ] CRDT migration (evaluating Yjs / Automerge for peer-to-peer and offline-first support).
- [ ] Document revision history and rollback snapshots.