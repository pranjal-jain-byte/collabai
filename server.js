require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { transform, applyOperation } = require('./ot');
const { redisClient, Document } = require('./db');
const { login, refresh, logout, authMiddleware } = require('./auth');
const { getSuggestion, checkForConflict } = require('./suggestions');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

const docState = {};
const opHistory = {};
const opCounters = {};
const recentEdits = {}; // { docId: [{ userId, position, timestamp }] } — for conflict detection

async function loadDocument(docId) {
    let content = await redisClient.get(`doc:${docId}`);
    if (content === null) {
        const doc = await Document.findOne({ docId });
        content = doc ? doc.content : '';
        await redisClient.set(`doc:${docId}`, content);
    }
    return content;
}

async function saveOperation(docId, newContent) {
    try {
        await redisClient.set(`doc:${docId}`, newContent);
        opCounters[docId] = (opCounters[docId] || 0) + 1;

        if (opCounters[docId] >= 10) {
            await Document.findOneAndUpdate(
                { docId },
                { content: newContent, updatedAt: new Date() },
                { upsert: true }
            );
            opCounters[docId] = 0;
            console.log(`flushed ${docId} to MongoDB`);
        }
    } catch (err) {
        console.error(`Failed to save ${docId}:`, err.message);
    }
}

// ---- REST auth routes ----
app.post('/login', async (req, res) => {
    const { userId } = req.body;
    const tokens = await login(userId);
    res.json(tokens);
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
    await logout(req.user.userId);
    res.json({ message: 'logged out' });
});

app.get('/protected-example', authMiddleware, (req, res) => {
    res.json({ message: `hello user ${req.user.userId}` });
});

// ---- Socket auth middleware ----
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
        socket.user = jwt.verify(token, process.env.ACCESS_SECRET || 'dev-access-secret');
        next();
    } catch {
        next(new Error('unauthorized'));
    }
});

// ---- Sockets ----
io.on('connection', (socket) => {
    console.log(`User ${socket.user.userId} connected as socket ${socket.id}`);

    socket.on('join-doc', async (docId) => {
        socket.join(docId);
        if (docState[docId] === undefined) {
            docState[docId] = await loadDocument(docId);
        }
        socket.emit('load-doc', docState[docId]);
        console.log(`User ${socket.user.userId} joined document ${docId}`);
    });

    socket.on('operation', ({ docId, ops, baseVersion }) => {
        const history = opHistory[docId] || [];
        const historyLenAtStart = history.length;
        let newContent = docState[docId] || '';
        const appliedOps = [];

        for (let rawOp of ops) {
            let transformedOp = rawOp;
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
            const version = history.length;

            socket.to(docId).emit('operation', { ops: appliedOps, version });
            socket.emit('operation-ack', { version });

            saveOperation(docId, newContent);
            console.log(`Document ${docId} updated by user ${socket.user.userId}`);

            // ---- Conflict mediator ----
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
        }
    });

    // ---- AI suggestion (typo/garbled-text correction) ----
    let suggestionDebounce;
    socket.on('request-suggestion', ({ text }) => {
        clearTimeout(suggestionDebounce);
        suggestionDebounce = setTimeout(() => {
            console.log(`Generating suggestion for ${socket.user.userId}`);
            getSuggestion(text, socket);
        }, 800);
    });

    socket.on('disconnect', () => {
        console.log(`User ${socket.user.userId} disconnected`);
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});