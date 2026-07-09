# CollabAI

A real-time collaborative document editor — built from scratch to understand and demonstrate the systems that power tools like Google Docs: Operational Transformation, WebSocket synchronization, a Redis/MongoDB persistence split, JWT authentication, and an AI-powered conflict mediator.

## What it does

Multiple users can edit the same document simultaneously. Every keystroke syncs across all connected clients in real time, conflicting edits are resolved using a custom-built Operational Transformation (OT) algorithm, and an AI layer (Google Gemini) detects when two users may have edited overlapping text and suggests a clean merge.

## Why this project

Most CRUD projects don't force you to reason about concurrency, conflict resolution, or the tradeoffs between consistency and performance. This one does. Every core design decision below came from actually hitting the problem first — a race condition, a duplicate-echo bug, a corrupted document — and then fixing it properly rather than working around it.

## Architecture

### 1. Real-time sync — WebSockets (Socket.IO)
Clients don't poll for changes. Edits are pushed to the server over a persistent WebSocket connection and broadcast to every other client in the same document "room" the moment they're applied.

### 2. Conflict resolution — Operational Transformation, built from scratch
When two users edit the same region of a document at nearly the same time, naive last-write-wins would corrupt the document. This project implements OT from first principles:
- Supports both single-character and multi-character insert/delete operations (a full prefix/suffix diff, not just single-keystroke tracking)
- Transforms incoming operations against the server's operation history so edits from any number of concurrent users are applied consistently
- Handles overlapping deletes, position shifts from concurrent inserts, and operation cancellation (e.g. two users deleting the same character)

### 3. Persistence — Redis (hot path) + MongoDB (durable storage)
Live document state lives in an in-memory object on the server for correctness (OT requires synchronous, ordered operation application) and is mirrored to Redis on every operation for fast reads on reconnect. Every 10 operations, the document is flushed to MongoDB for durable, long-term storage — avoiding a database write on every keystroke while still guaranteeing persistence.

### 4. Authentication — JWT with Redis-backed refresh tokens
Short-lived access tokens (15 minutes) authenticate both REST endpoints and WebSocket connections. Refresh tokens (7 days) are stored in Redis, so logout invalidates a session instantly — no waiting for a token to expire, no per-request database lookup for revocation checks.

### 5. AI Conflict Mediator (Gemini API)
OT guarantees a document stays *structurally* valid when edits conflict — it has no understanding of *meaning*. Two users typing the same sentence differently, or duplicating content, is something OT will apply correctly but can't recognize as redundant.

This project adds a lightweight AI layer on top: when the server detects that two different users just edited overlapping or nearby text within a few seconds of each other, it sends that region to Gemini and asks whether it looks like a real semantic conflict. If so, both users see a dismissible suggestion with a clean merge — never an automatic edit. This check is fire-and-forget and never blocks the real-time sync path.

A separate, simpler suggestion layer also offers typo/garbled-text correction after a pause in typing, independent of the OT and conflict-detection systems.

## Bugs fixed along the way (and why they mattered)

- **Duplicate self-echo**: broadcasting operations to the whole room (including the sender) caused every local edit to apply twice. Fixed by separating `operation` (broadcast to others) from `operation-ack` (confirmation to the sender).
- **Redis race condition**: an early version read live document state from Redis on every keystroke, creating a window where two fast concurrent edits could read the same stale snapshot and silently overwrite each other. Fixed by keeping the authoritative document state synchronous and in-memory, with Redis/Mongo writes happening asynchronously behind it.
- **Single-character diff limitation**: the original diffing logic assumed exactly one character changed per keystroke, which broke on paste, multi-character replace, or fast typing — silently corrupting the shared document. Rewrote the diff to use a proper common-prefix/common-suffix comparison supporting operations of any length.
- **Stale socket rooms after reconnect**: clients only joined a document room once, on initial page load — a dropped and reconnected socket would silently stop receiving updates. Fixed by re-joining on every `connect` event, not just the first.

## Tech stack

Node.js, Express, Socket.IO, Redis, MongoDB (Mongoose), JWT (jsonwebtoken), Google Gemini API, vanilla JS frontend.

## Setup

### Prerequisites
- Node.js
- Docker Desktop (for Redis + MongoDB)
- A Gemini API key ([aistudio.google.com](https://aistudio.google.com/apikey))

### Install
```bash
npm install
```

### Configure environment
Create a `.env` file in the project root:
```
GEMINI_API_KEY=your-gemini-api-key
ACCESS_SECRET=a-long-random-string
REFRESH_SECRET=a-different-long-random-string
```

### Start Redis and MongoDB
```bash
docker-compose up -d
```

### Run the server
```bash
node server.js
```

### Use it
1. Open `http://localhost:3000/login.html`, enter a name to get a session
2. Open a second browser (or incognito window) with a different name to simulate a second user
3. Edit the shared document from both — changes sync in real time

## Known limitations

- The OT implementation is a from-scratch educational build, not a production-hardened library — it hasn't been tested against pathological edge cases the way something like ShareDB or Yjs has.
- The AI conflict detector uses simple proximity/timing heuristics (same document region, within a few seconds), not a guaranteed conflict detector.
- Single-document demo (`test-doc`) — no document creation/listing UI yet.
- Gemini's free tier has rate limits; heavy concurrent usage would need a paid tier or additional backoff handling.

## What I'd build next

- Multi-document support with a document list/creation UI
- Presence indicators (show who's currently viewing/editing)
- Rich text formatting (currently plain text only)
- A proper test suite for the OT transform function covering concurrent multi-user edit sequences