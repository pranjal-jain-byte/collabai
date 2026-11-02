require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { transform, applyOperation, transformCursor } = require('./ot');
const { redisClient, Document, Revision, ActionItem, isRedisAvailable } = require('./db');
const { login, refresh, logout, authMiddleware } = require('./auth');
const { getSuggestion, checkForConflict, reviewDocument, askDocument, extractActionItems } = require('./suggestions');

const ALLOWED_ORIGINS = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
]);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: Array.from(ALLOWED_ORIGINS),
        methods: ['GET', 'POST']
    }
});

// CORS middleware for Express HTTP endpoints
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.has(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.use(express.static('public'));
app.use(express.json());

const docState = {};
const docTitles = {};
const docVersion = {};
const opHistory = {};
const opCounters = {};
const recentEdits = {}; // { docId: [{ userId, position, timestamp }] } — for conflict detection
const initPromises = new Map(); // docId -> Promise<{ content, version, title }>
const saveQueues = new Map();   // docId -> Promise (serialized per-document persistence)
const docCollaborators = new Map(); // docId -> Map<socketId, collaboratorInfo>

function getDisplayName(userId) {
    const KNOWN = {
        'alex-rivera': 'Alex Rivera',
        'sarah-chen': 'Sarah Chen',
        'david-kim': 'David Kim',
        'priya-sharma': 'Priya Sharma',
        'rahul-verma': 'Rahul Verma'
    };
    if (KNOWN[userId]) return KNOWN[userId];
    return String(userId)
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

const PREFERRED_USER_COLORS = {
    'alex-rivera': '#1a73e8', // Blue (matches specification example)
    'priya-sharma': '#9333ea', // Purple (matches specification example)
    'rahul-verma': '#059669', // Emerald Green (matches specification example)
    'sarah-chen': '#ea580c',  // Orange
    'david-kim': '#4f46e5'    // Indigo
};

const COLLABORATOR_COLORS = [
    '#1a73e8', // Google Blue
    '#9333ea', // Purple
    '#059669', // Emerald Green
    '#ea580c', // Orange
    '#4f46e5', // Indigo
    '#e11d48', // Rose
    '#0891b2', // Cyan
    '#d97706'  // Amber
];

function getUserColor(userId) {
    if (PREFERRED_USER_COLORS[userId]) {
        return PREFERRED_USER_COLORS[userId];
    }
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = (hash * 31 + userId.charCodeAt(i)) & 0xffffffff;
    }
    return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
}

async function loadDocument(docId) {
    // 1. If document is already loaded and active in server memory, return authoritative state
    if (docState[docId] !== undefined) {
        return {
            content: docState[docId],
            version: docVersion[docId] || 0,
            title: docTitles[docId] || 'Untitled Document'
        };
    }

    // 2. If initialization is already in flight for this document, share the existing promise
    if (initPromises.has(docId)) {
        return await initPromises.get(docId);
    }

    // 3. Create a unified initialization promise for all concurrent callers
    const initPromise = (async () => {
        // Step A: Check Redis hot cache
        try {
            const cachedContent = await redisClient.get(`doc:${docId}`);
            const cachedVersion = await redisClient.get(`version:${docId}`);
            const cachedTitle = await redisClient.get(`title:${docId}`);

            if (cachedContent !== null) {
                const parsedVersion = cachedVersion !== null ? parseInt(cachedVersion, 10) : 0;
                docState[docId] = cachedContent;
                docVersion[docId] = isNaN(parsedVersion) ? 0 : parsedVersion;
                docTitles[docId] = cachedTitle || docTitles[docId] || 'Untitled Document';
                opHistory[docId] = opHistory[docId] || [];
                opCounters[docId] = 0;
                return {
                    content: docState[docId],
                    version: docVersion[docId],
                    title: docTitles[docId]
                };
            }
        } catch (redisErr) {
            console.warn(`[CollabAI Storage] Redis read notice for ${docId}:`, redisErr.message);
        }

        // Step B: Query MongoDB primary store
        let doc;
        try {
            doc = await Document.findOne({ docId });
        } catch (mongoErr) {
            console.error(`[CollabAI Storage] MongoDB read failure for ${docId}:`, mongoErr.message);
            // Throw so initialization fails explicitly instead of corrupting state with empty string!
            throw new Error(`Database error while loading document ${docId}: ${mongoErr.message}`);
        }

        if (doc) {
            docState[docId] = doc.content || '';
            docVersion[docId] = doc.version || 0;
            docTitles[docId] = doc.title || 'Untitled Document';
            opHistory[docId] = opHistory[docId] || [];
            opCounters[docId] = 0;

            // Seed Redis cache
            try {
                await redisClient.set(`doc:${docId}`, docState[docId]);
                await redisClient.set(`version:${docId}`, String(docVersion[docId]));
                await redisClient.set(`title:${docId}`, docTitles[docId]);
            } catch (e) {}

            return {
                content: docState[docId],
                version: docVersion[docId],
                title: docTitles[docId]
            };
        }

        // Step C: Document not found in persistence layer — initialize clean empty state
        docState[docId] = '';
        docVersion[docId] = 0;
        docTitles[docId] = 'Untitled Document';
        opHistory[docId] = opHistory[docId] || [];
        opCounters[docId] = 0;

        return {
            content: '',
            version: 0,
            title: 'Untitled Document'
        };
    })();

    initPromises.set(docId, initPromise);

    try {
        return await initPromise;
    } finally {
        // Ensure cleanup after success or failure so retries are possible
        initPromises.delete(docId);
    }
}

// Ordered asynchronous persistence queue: guarantees writes complete in strict version order
function queueSave(docId, newContent, version, title) {
    const prev = saveQueues.get(docId) || Promise.resolve();

    const next = prev.then(async () => {
        try {
            await redisClient.set(`doc:${docId}`, newContent);
            await redisClient.set(`version:${docId}`, String(version));
            if (title) {
                await redisClient.set(`title:${docId}`, title);
            }

            opCounters[docId] = (opCounters[docId] || 0) + 1;

            // Checkpoint snapshot to MongoDB every 5 operations
            if (opCounters[docId] >= 5) {
                await Document.findOneAndUpdate(
                    { docId },
                    {
                        content: newContent,
                        version,
                        title: title || docTitles[docId] || 'Untitled Document',
                        updatedAt: new Date()
                    },
                    { upsert: true }
                );
                opCounters[docId] = 0;
                console.log(`[CollabAI Storage] Checkpointed ${docId} (v${version}) to MongoDB`);

                // Create durable Revision snapshot
                try {
                    const existingRev = await Revision.findOne({ docId, version });
                    if (!existingRev) {
                        await Revision.create({
                            docId,
                            version,
                            content: newContent,
                            title: title || docTitles[docId] || 'Untitled Document',
                            author: 'system',
                            authorName: 'Collaborative Edit',
                            label: `Version ${version} Checkpoint`,
                            summary: `Automatic snapshot after concurrent editing session (${newContent.length} chars)`,
                            createdAt: new Date()
                        });
                    }
                } catch (revErr) {
                    console.warn(`[CollabAI Revision] Snapshot note:`, revErr.message);
                }
            }
        } catch (err) {
            console.error(`[CollabAI Storage] Failed to persist ${docId} (v${version}):`, err.message);
        }
    }).catch(err => {
        console.error(`[CollabAI Storage] Persistence queue error for ${docId}:`, err.message);
    });

    saveQueues.set(docId, next);

    next.finally(() => {
        if (saveQueues.get(docId) === next) {
            saveQueues.delete(docId);
        }
    });

    return next;
}

async function saveOperation(docId, newContent, version = (docVersion[docId] || 0)) {
    return queueSave(docId, newContent, version, docTitles[docId]);
}

async function flushDocument(docId) {
    const q = saveQueues.get(docId);
    if (q) await q;
    if (docState[docId] !== undefined) {
        await Document.findOneAndUpdate(
            { docId },
            {
                content: docState[docId],
                version: docVersion[docId] || 0,
                title: docTitles[docId] || 'Untitled Document',
                updatedAt: new Date()
            },
            { upsert: true }
        );
        opCounters[docId] = 0;
    }
}

// ---- REST auth routes (Preserved & Enhanced) ----
app.post('/login', async (req, res) => {
    try {
        const { userId, name } = req.body;
        if (!userId || String(userId).trim() === '') {
            return res.status(400).json({ error: 'userId is required' });
        }
        const trimmedId = String(userId).trim();
        const trimmedName = name ? String(name).trim() : getDisplayName(trimmedId);
        const tokens = await login(trimmedId, trimmedName);
        res.json({
            ...tokens,
            userId: trimmedId,
            name: trimmedName
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/refresh', async (req, res) => {
    try {
        const accessToken = await refresh(req.body.refreshToken);
        res.json({ accessToken });
    } catch (e) {
        res.status(401).json({ error: e.message });
    }
});

app.post('/logout', authMiddleware, async (req, res) => {
    try {
        await logout(req.user.userId);
        res.json({ message: 'logged out' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/protected-example', authMiddleware, (req, res) => {
    res.json({ message: `hello user ${req.user.userId}` });
});

// ---- Document Management REST Endpoints ----
app.get('/api/documents', async (req, res) => {
    try {
        const docs = await Document.find({}).sort({ updatedAt: -1 }).lean();
        const formatted = docs.map(d => ({
            docId: d.docId,
            title: d.title || 'Untitled Document',
            snippet: (d.content || '').slice(0, 140),
            updatedAt: d.updatedAt
        }));
        res.json({ documents: formatted });
    } catch (err) {
        console.error('[CollabAI API] Error listing documents:', err.message);
        res.status(500).json({ error: 'Failed to retrieve documents from database: ' + err.message });
    }
});

app.post('/api/documents', async (req, res) => {
    try {
        const { title, content } = req.body || {};
        const docId = (req.body && req.body.docId) ? req.body.docId : `doc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
        const docTitle = title && title.trim() ? title.trim() : 'Untitled Document';
        const docContent = content !== undefined ? String(content) : '';

        // 1. Persist to MongoDB with initial version 0
        let savedDoc;
        try {
            savedDoc = await Document.findOneAndUpdate(
                { docId },
                { docId, title: docTitle, content: docContent, version: 0, updatedAt: new Date() },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        } catch (dbErr) {
            console.error('[CollabAI API] MongoDB persist error:', dbErr.message);
            return res.status(500).json({ error: 'Failed to persist document to MongoDB: ' + dbErr.message });
        }

        // 2. Initialize Redis cache consistently
        try {
            await redisClient.set(`doc:${docId}`, docContent);
            await redisClient.set(`version:${docId}`, '0');
            await redisClient.set(`title:${docId}`, docTitle);
        } catch (redisErr) {
            console.warn('[CollabAI API] Redis cache initialization note:', redisErr.message);
        }

        // 3. Initialize authoritative runtime memory state
        docState[docId] = docContent;
        docTitles[docId] = docTitle;
        docVersion[docId] = 0;
        opHistory[docId] = [];
        opCounters[docId] = 0;

        res.status(201).json({
            docId,
            title: docTitle,
            content: docContent,
            version: 0,
            updatedAt: savedDoc ? savedDoc.updatedAt : new Date()
        });
    } catch (err) {
        console.error('[CollabAI API] Document creation error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/documents/:docId', async (req, res) => {
    try {
        const { docId } = req.params;
        const existsInDb = await Document.exists({ docId });
        const existsInMemory = docState[docId] !== undefined;

        if (!existsInDb && !existsInMemory) {
            return res.status(404).json({ error: `Document '${docId}' not found` });
        }

        const docInfo = await loadDocument(docId);
        res.json({
            docId,
            title: docInfo.title || 'Untitled Document',
            content: docInfo.content || '',
            version: docInfo.version || 0,
            updatedAt: new Date()
        });
    } catch (err) {
        console.error('[CollabAI API] Error fetching document:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/documents/:docId', async (req, res) => {
    try {
        const { docId } = req.params;
        try {
            await Document.deleteOne({ docId });
            await Revision.deleteMany({ docId });
            await ActionItem.deleteMany({ docId });
        } catch (dbErr) {
            console.warn('[CollabAI API] MongoDB delete warning:', dbErr.message);
        }
        await redisClient.del(`doc:${docId}`);
        await redisClient.del(`version:${docId}`);
        await redisClient.del(`title:${docId}`);
        delete docState[docId];
        delete docTitles[docId];
        delete docVersion[docId];
        delete opHistory[docId];
        delete opCounters[docId];
        delete recentEdits[docId];
        saveQueues.delete(docId);
        initPromises.delete(docId);

        // Notify any open clients connected to this document
        io.to(docId).emit('document-deleted', { docId });

        res.json({ message: 'Document deleted successfully', docId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/documents/:docId/title', async (req, res) => {
    try {
        const { docId } = req.params;
        const { title } = req.body;
        const updatedTitle = title && title.trim() ? title.trim() : 'Untitled Document';

        docTitles[docId] = updatedTitle;
        try {
            await Document.findOneAndUpdate(
                { docId },
                { title: updatedTitle, updatedAt: new Date() },
                { upsert: true }
            );
        } catch (e) {}

        io.to(docId).emit('title-updated', { docId, title: updatedTitle });

        res.json({ docId, title: updatedTitle });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---- Feature Four: Version History Endpoints ----
app.get('/api/documents/:docId/versions', async (req, res) => {
    try {
        const { docId } = req.params;
        const docInfo = await loadDocument(docId);
        let revisions = await Revision.find({ docId }).sort({ version: -1, createdAt: -1 }).lean();

        // If no revisions exist yet, create baseline snapshot for current state
        if (revisions.length === 0) {
            const initialRev = await Revision.create({
                docId,
                version: docInfo.version,
                content: docInfo.content,
                title: docInfo.title,
                author: 'system',
                authorName: 'Initial Snapshot',
                label: 'Current Working Document',
                summary: `Initial document baseline (${docInfo.content.length} characters)`
            });
            revisions = [initialRev.toObject()];
        }
        res.json({ versions: revisions });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch version history: ' + err.message });
    }
});

app.get('/api/documents/:docId/versions/:versionId', async (req, res) => {
    try {
        const { docId, versionId } = req.params;
        const revision = await Revision.findOne({ docId, _id: versionId }).lean();
        if (!revision) {
            return res.status(404).json({ error: 'Revision not found' });
        }
        res.json({ version: revision });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/documents/:docId/versions', async (req, res) => {
    try {
        const { docId } = req.params;
        const { label, summary, author, authorName } = req.body || {};
        const docInfo = await loadDocument(docId);
        const revision = await Revision.create({
            docId,
            version: docInfo.version,
            content: docInfo.content,
            title: docInfo.title,
            author: author || 'manual',
            authorName: authorName || 'Collaborator',
            label: label || `Milestone (v${docInfo.version})`,
            summary: summary || `Manual snapshot checkpoint at version ${docInfo.version}`
        });
        res.status(201).json({ revision });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/documents/:docId/versions/:versionId/restore', async (req, res) => {
    try {
        const { docId, versionId } = req.params;
        const targetRev = await Revision.findOne({ docId, _id: versionId });
        if (!targetRev) {
            return res.status(404).json({ error: 'Revision not found' });
        }

        const currentInfo = await loadDocument(docId);
        const targetContent = targetRev.content || '';
        const currentContent = currentInfo.content || '';

        // Formulate replacement operations for OT transition
        const ops = [];
        if (currentContent.length > 0) {
            ops.push({ type: 'delete', position: 0, count: currentContent.length, text: currentContent });
        }
        if (targetContent.length > 0) {
            ops.push({ type: 'insert', position: 0, text: targetContent });
        }

        const history = opHistory[docId] || [];
        for (const op of ops) {
            history.push(op);
        }
        opHistory[docId] = history;
        docState[docId] = targetContent;
        docVersion[docId] = history.length;
        const newVersion = docVersion[docId];

        // Broadcast to all active clients in this room
        io.to(docId).emit('operation', { ops, version: newVersion });

        // Persist immediately and record a new restored revision milestone
        await queueSave(docId, targetContent, newVersion, currentInfo.title);
        const restoredRev = await Revision.create({
            docId,
            version: newVersion,
            content: targetContent,
            title: currentInfo.title,
            author: req.body?.author || 'system',
            authorName: req.body?.authorName || 'Collaborator',
            label: `Restored to v${targetRev.version}`,
            summary: `Restored content from ${targetRev.label} (v${targetRev.version}) as a new revision`,
            createdAt: new Date()
        });

        res.json({
            success: true,
            version: newVersion,
            content: targetContent,
            restoredRevision: restoredRev
        });
    } catch (err) {
        console.error('[CollabAI Restore] Error restoring version:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ---- Feature Five: Action Items Endpoints ----
app.post('/api/documents/:docId/actions/extract', async (req, res) => {
    try {
        const { docId } = req.params;
        const docInfo = await loadDocument(docId);
        if (!docInfo.content || docInfo.content.trim().length === 0) {
            return res.json({ actionItems: [], message: 'Document is empty. Enter notes or meeting content first.' });
        }

        const { actionItems } = await extractActionItems({ fullText: docInfo.content });

        const saved = [];
        for (const item of (actionItems || [])) {
            const doc = await ActionItem.create({
                docId,
                task: item.task,
                assignee: item.assignee || '',
                dueDate: item.dueDate || '',
                dependencies: Array.isArray(item.dependencies) ? item.dependencies : [],
                openQuestions: Array.isArray(item.openQuestions) ? item.openQuestions : [],
                status: 'pending',
                createdBy: req.body?.author || 'AI Extractor'
            });
            saved.push(doc);
        }

        res.json({ actionItems: saved });
    } catch (err) {
        console.error('[CollabAI Action Items] Extraction error:', err.message);
        res.status(500).json({ error: 'Failed to extract action items: ' + err.message });
    }
});

app.get('/api/documents/:docId/actions', async (req, res) => {
    try {
        const { docId } = req.params;
        const items = await ActionItem.find({ docId }).sort({ createdAt: -1 }).lean();
        res.json({ actionItems: items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/documents/:docId/actions', async (req, res) => {
    try {
        const { docId } = req.params;
        const { task, assignee, dueDate, dependencies, openQuestions } = req.body || {};
        if (!task || !task.trim()) {
            return res.status(400).json({ error: 'Task description is required' });
        }
        const created = await ActionItem.create({
            docId,
            task: task.trim(),
            assignee: assignee ? assignee.trim() : '',
            dueDate: dueDate ? dueDate.trim() : '',
            dependencies: Array.isArray(dependencies) ? dependencies : [],
            openQuestions: Array.isArray(openQuestions) ? openQuestions : [],
            status: 'pending',
            createdBy: req.body?.author || 'manual'
        });
        res.status(201).json({ actionItem: created });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/documents/:docId/actions/:actionId', async (req, res) => {
    try {
        const { docId, actionId } = req.params;
        const update = {};
        if (req.body.status) update.status = req.body.status;
        if (req.body.task) update.task = req.body.task;
        if (req.body.assignee !== undefined) update.assignee = req.body.assignee;
        if (req.body.dueDate !== undefined) update.dueDate = req.body.dueDate;
        update.updatedAt = new Date();

        const updated = await ActionItem.findOneAndUpdate(
            { _id: actionId, docId },
            update,
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ error: 'Action item not found' });
        }
        res.json({ actionItem: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/documents/:docId/actions/:actionId', async (req, res) => {
    try {
        const { docId, actionId } = req.params;
        await ActionItem.deleteOne({ _id: actionId, docId });
        res.json({ message: 'Action item removed', actionId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---- Feature Two & Three: AI Review & Document Q&A Endpoints ----
app.post('/api/documents/:docId/ai/review', async (req, res) => {
    try {
        const { docId } = req.params;
        const { targetText, categoryFilter } = req.body || {};
        const docInfo = await loadDocument(docId);
        const fullText = docInfo.content || '';

        const result = await reviewDocument({
            fullText,
            targetText,
            categoryFilter: categoryFilter || 'all'
        });
        res.json(result);
    } catch (err) {
        console.error('[CollabAI AI Review] Endpoint error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/documents/:docId/ai/ask', async (req, res) => {
    try {
        const { docId } = req.params;
        const { query, history } = req.body || {};
        if (!query || !query.trim()) {
            return res.status(400).json({ error: 'Query is required' });
        }
        const docInfo = await loadDocument(docId);
        const fullText = docInfo.content || '';

        const result = await askDocument({
            query,
            fullText,
            history: Array.isArray(history) ? history : []
        });
        res.json(result);
    } catch (err) {
        console.error('[CollabAI Ask Doc] Endpoint error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        service: 'CollabAI Real-Time Server',
        status: 'online',
        redis: isRedisAvailable() ? 'connected' : 'memory-fallback',
        groqConfigured: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_new_groq_api_key'),
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key'),
        activeDocuments: Object.keys(docState).length
    });
});

// ---- Socket auth middleware (Preserved) ----
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
        socket.user = jwt.verify(token, process.env.ACCESS_SECRET || 'dev-access-secret');
        next();
    } catch {
        next(new Error('unauthorized'));
    }
});

// ---- Sockets (Preserved & Enhanced) ----
io.on('connection', (socket) => {
    console.log(`[Socket] User ${socket.user.userId} connected as socket ${socket.id}`);

    socket.on('join-doc', async (docId) => {
        if (!docId || typeof docId !== 'string') {
            socket.emit('error', { message: 'Invalid docId provided' });
            return;
        }

        socket.join(docId);

        try {
            const docInfo = await loadDocument(docId);

            // Emit full document payload with authoritative content and version
            socket.emit('load-doc', {
                content: docInfo.content,
                version: docInfo.version,
                title: docInfo.title
            });

            // Send title update event if title is set
            if (docInfo.title) {
                socket.emit('title-updated', { docId, title: docInfo.title });
            }

            // Register collaborator presence for this document room
            if (!docCollaborators.has(docId)) {
                docCollaborators.set(docId, new Map());
            }
            const roomMap = docCollaborators.get(docId);
            const collaborator = {
                socketId: socket.id,
                userId: socket.user.userId,
                name: socket.user.name || getDisplayName(socket.user.userId),
                color: getUserColor(socket.user.userId),
                cursor: 0,
                selectionStart: 0,
                selectionEnd: 0,
                joinedAt: Date.now()
            };
            roomMap.set(socket.id, collaborator);
            socket.activeDocId = docId;

            // Deliver existing active collaborator list to the joining participant
            socket.emit('collaborators-list', Array.from(roomMap.values()));

            // Broadcast join notification to all other collaborators in this document room
            socket.to(docId).emit('collaborator-joined', collaborator);

            console.log(`[Socket] User ${socket.user.userId} joined document ${docId} (v${docInfo.version})`);
        } catch (err) {
            console.error(`[Socket] Error joining document ${docId}:`, err.message);
            socket.emit('load-doc-error', { docId, message: err.message });
        }
    });

    socket.on('operation', ({ docId, ops, baseVersion }) => {
        // 1. Strict validation of operation payload
        if (!docId || typeof docId !== 'string') {
            console.warn(`[Socket] Operation rejected: invalid docId from ${socket.user?.userId}`);
            return;
        }
        if (!Array.isArray(ops) || ops.length === 0) {
            console.warn(`[Socket] Operation rejected: ops is not a non-empty array from ${socket.user?.userId}`);
            return;
        }
        if (typeof baseVersion !== 'number' || baseVersion < 0 || !Number.isInteger(baseVersion)) {
            console.warn(`[Socket] Operation rejected: invalid baseVersion ${baseVersion} from ${socket.user?.userId}`);
            return;
        }

        // Ensure document is initialized in memory
        if (docState[docId] === undefined) {
            console.warn(`[Socket] Operation rejected: document ${docId} not loaded in memory`);
            return;
        }

        const history = opHistory[docId] || [];
        const historyLenAtStart = history.length;
        const currentVersion = docVersion[docId] || 0;

        // Base version cannot be ahead of current server version
        if (baseVersion > historyLenAtStart) {
            console.warn(`[Socket] Stale/future baseVersion ${baseVersion} > server version ${historyLenAtStart}`);
            return;
        }

        let newContent = docState[docId] || '';
        const appliedOps = [];

        // 2. Transform incoming ops against intervening server history
        for (let rawOp of ops) {
            if (!rawOp || typeof rawOp !== 'object') continue;
            if (rawOp.type !== 'insert' && rawOp.type !== 'delete') continue;
            if (typeof rawOp.position !== 'number' || rawOp.position < 0) continue;

            // Attach authenticated userId for deterministic tie-breaking
            let transformedOp = {
                ...rawOp,
                userId: socket.user.userId
            };

            for (let i = baseVersion; i < historyLenAtStart; i++) {
                transformedOp = transform(history[i], transformedOp);
                if (transformedOp === null) break;
            }

            if (transformedOp) {
                newContent = applyOperation(newContent, transformedOp);
                history.push(transformedOp);
                appliedOps.push(transformedOp);
            }
        }

        if (appliedOps.length > 0) {
            docState[docId] = newContent;
            opHistory[docId] = history;
            docVersion[docId] = history.length;
            const newVersion = docVersion[docId];

            // Adjust presence cursor positions for all active collaborators in this room using OT
            const roomMap = docCollaborators.get(docId);
            if (roomMap) {
                for (const col of roomMap.values()) {
                    for (const op of appliedOps) {
                        col.cursor = transformCursor(col.cursor, op);
                        col.selectionStart = transformCursor(col.selectionStart, op);
                        col.selectionEnd = transformCursor(col.selectionEnd, op);
                    }
                }
            }

            // Broadcast transformed operations with new authoritative version to room collaborators
            socket.to(docId).emit('operation', { ops: appliedOps, version: newVersion });
            // Confirm to sender with updated version
            socket.emit('operation-ack', { version: newVersion });

            // Enqueue ordered asynchronous persistence write
            queueSave(docId, newContent, newVersion, docTitles[docId]);

            // Conflict mediator check (AI)
            const now = Date.now();
            const editPosition = appliedOps[0].position;
            const recent = recentEdits[docId] || [];

            const nearbyConflict = recent.find(e =>
                e.userId !== socket.user.userId &&
                now - e.timestamp < 4000 &&
                Math.abs(e.position - editPosition) < 30
            );

            recentEdits[docId] = [
                ...recent.filter(e => now - e.timestamp < 4000),
                { userId: socket.user.userId, position: editPosition, timestamp: now }
            ];

            if (nearbyConflict) {
                const snippetStart = Math.max(0, editPosition - 40);
                const snippetEnd = Math.min(newContent.length, editPosition + 40);
                const snippet = newContent.slice(snippetStart, snippetEnd);
                checkForConflict(snippet, io, docId);
            }
        } else {
            // All operations were absorbed (e.g. concurrent overlapping delete)
            socket.emit('operation-ack', { version: historyLenAtStart });
        }
    });

    // ---- Real-time cursor & selection update socket event ----
    socket.on('cursor-update', ({ docId, cursor, selectionStart, selectionEnd }) => {
        // Enforce document room isolation: socket can only update its active document
        if (!docId || docId !== socket.activeDocId) return;
        if (typeof cursor !== 'number' || !Number.isFinite(cursor) || cursor < 0) return;

        // Ensure safe, valid integer ranges (prevent DoS with huge offsets)
        const safeCursor = Math.min(Math.floor(cursor), 500000);
        const safeSelStart = (typeof selectionStart === 'number' && Number.isFinite(selectionStart) && selectionStart >= 0)
            ? Math.min(Math.floor(selectionStart), 500000)
            : safeCursor;
        const safeSelEnd = (typeof selectionEnd === 'number' && Number.isFinite(selectionEnd) && selectionEnd >= 0)
            ? Math.min(Math.floor(selectionEnd), 500000)
            : safeCursor;

        const roomMap = docCollaborators.get(docId);
        if (roomMap && roomMap.has(socket.id)) {
            const col = roomMap.get(socket.id);
            col.cursor = safeCursor;
            col.selectionStart = safeSelStart;
            col.selectionEnd = safeSelEnd;
            col.updatedAt = Date.now();

            // Broadcast to other collaborators collaborating in the SAME document room only
            socket.to(docId).emit('cursor-update', {
                socketId: socket.id,
                userId: socket.user.userId,
                name: col.name,
                color: col.color,
                cursor: safeCursor,
                selectionStart: safeSelStart,
                selectionEnd: safeSelEnd
            });
        }
    });

    // Helper: Safely leave active document room
    function handleLeaveDoc() {
        const docId = socket.activeDocId;
        if (!docId) return;

        const roomMap = docCollaborators.get(docId);
        if (roomMap && roomMap.has(socket.id)) {
            roomMap.delete(socket.id);
            socket.to(docId).emit('collaborator-left', {
                socketId: socket.id,
                userId: socket.user?.userId
            });

            if (roomMap.size === 0) {
                docCollaborators.delete(docId);
            }
        }
        socket.leave(docId);
        socket.activeDocId = null;
    }

    socket.on('leave-doc', handleLeaveDoc);

    // ---- Title update socket event ----
    socket.on('update-title', async ({ docId, title }) => {
        docTitles[docId] = title;
        try {
            await Document.findOneAndUpdate(
                { docId },
                { title, updatedAt: new Date() },
                { upsert: true }
            );
        } catch (e) {}
        socket.to(docId).emit('title-updated', { docId, title });
    });

    // ---- AI suggestion (typo/garbled-text correction) ----
    let suggestionDebounce;
    socket.on('request-suggestion', ({ text }) => {
        clearTimeout(suggestionDebounce);
        suggestionDebounce = setTimeout(() => {
            console.log(`[CollabAI AI] Generating suggestion for ${socket.user.userId}`);
            getSuggestion(text, socket);
        }, 800);
    });

    socket.on('disconnect', () => {
        handleLeaveDoc();
        console.log(`[Socket] User ${socket.user?.userId} (${socket.id}) disconnected`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`CollabAI Server is running on http://localhost:${PORT}`);
});