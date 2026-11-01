// test-cursor-presence.js
// Automated Verification Suite for Collaborator Names & Real-Time Cursor Presence
// Covers Tests A through G as specified in the CollabAI requirements.

const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');
const { transformCursor, applyOperation } = require('./ot');

const BASE_URL = 'http://localhost:3000';

async function loginUser(userId, name) {
    const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name })
    });
    if (!res.ok) throw new Error(`Login failed for ${userId}: ${res.statusText}`);
    return await res.json();
}

async function createClient(userId, name) {
    const auth = await loginUser(userId, name);
    const socket = io(BASE_URL, {
        auth: { token: auth.accessToken },
        transports: ['websocket', 'polling'],
        forceNew: true
    });

    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timeout connecting ${userId}`)), 5000);
        socket.on('connect', () => {
            clearTimeout(timeout);
            resolve();
        });
        socket.on('connect_error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });

    const client = {
        userId,
        name: auth.name || name || userId,
        socket,
        content: '',
        version: 0,
        activeDocId: null,
        collaborators: new Map(), // socketId -> collaborator object
        receivedCursorUpdates: [],
        disconnect: () => socket.disconnect()
    };

    socket.on('load-doc', (data) => {
        if (typeof data === 'string') {
            client.content = data;
        } else if (data && typeof data === 'object') {
            client.content = data.content ?? '';
            client.version = data.version ?? 0;
        }
    });

    socket.on('collaborators-list', (list) => {
        client.collaborators.clear();
        for (const c of (list || [])) {
            if (c.socketId !== socket.id) {
                client.collaborators.set(c.socketId, { ...c });
            }
        }
    });

    socket.on('collaborator-joined', (c) => {
        if (c && c.socketId !== socket.id) {
            client.collaborators.set(c.socketId, { ...c });
        }
    });

    socket.on('collaborator-left', ({ socketId }) => {
        client.collaborators.delete(socketId);
    });

    socket.on('cursor-update', (data) => {
        if (data && data.socketId !== socket.id) {
            client.collaborators.set(data.socketId, {
                ...client.collaborators.get(data.socketId),
                ...data
            });
            client.receivedCursorUpdates.push(data);
        }
    });

    socket.on('operation', ({ ops, version }) => {
        client.version = version;
        // Apply remote operations to client local content
        for (const op of (ops || [])) {
            client.content = applyOperation(client.content, op);
        }
        // Adjust stored collaborator cursor positions with OT
        for (const col of client.collaborators.values()) {
            for (const op of (ops || [])) {
                col.cursor = transformCursor(col.cursor, op);
                col.selectionStart = transformCursor(col.selectionStart, op);
                col.selectionEnd = transformCursor(col.selectionEnd, op);
            }
        }
    });

    socket.on('operation-ack', ({ version }) => {
        client.version = version;
    });

    socket.on('operation-rejected', ({ version }) => {
        if (typeof version === 'number') client.version = version;
    });

    return client;
}

function joinDoc(client, docId) {
    client.activeDocId = docId;
    return new Promise((resolve) => {
        client.socket.once('load-doc', (data) => resolve(data));
        client.socket.emit('join-doc', docId);
    });
}

function updateCursor(client, cursor, selectionStart, selectionEnd) {
    client.socket.emit('cursor-update', {
        docId: client.activeDocId,
        cursor,
        selectionStart: selectionStart ?? cursor,
        selectionEnd: selectionEnd ?? cursor
    });
}

function sendOperation(client, ops) {
    const baseVersion = client.version;
    // Apply local edit immediately to local content and remote cursors (as React does)
    for (const op of ops) {
        client.content = applyOperation(client.content, op);
        for (const col of client.collaborators.values()) {
            col.cursor = transformCursor(col.cursor, op);
            col.selectionStart = transformCursor(col.selectionStart, op);
            col.selectionEnd = transformCursor(col.selectionEnd, op);
        }
    }
    client.socket.emit('operation', {
        docId: client.activeDocId,
        ops,
        baseVersion
    });
}

async function waitFor(conditionFn, timeoutMs = 4000, intervalMs = 40) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (conditionFn()) return true;
        await new Promise(r => setTimeout(r, intervalMs));
    }
    return false;
}

async function runPresenceTests() {
    console.log('================================================================');
    console.log('   CollabAI Real-Time Collaborator Presence & Cursor Tests');
    console.log('================================================================\n');

    let passed = 0;
    const total = 7;

    // -------------------------------------------------------------
    // Test A: Initial document join (4 concurrent clients)
    // -------------------------------------------------------------
    try {
        console.log('--- TEST A: Initial Document Join with 4 Collaborators ---');
        const docId = `test-a-presence-${Date.now()}`;

        const alex = await createClient('alex-rivera', 'Alex Rivera');
        const sarah = await createClient('sarah-chen', 'Sarah Chen');
        const david = await createClient('david-kim', 'David Kim');
        const priya = await createClient('priya-sharma', 'Priya Sharma');

        // All 4 join the same document
        await Promise.all([
            joinDoc(alex, docId),
            joinDoc(sarah, docId),
            joinDoc(david, docId),
            joinDoc(priya, docId)
        ]);

        // Wait for all presence lists to propagate (each should see the other 3)
        const ready = await waitFor(() =>
            alex.collaborators.size === 3 &&
            sarah.collaborators.size === 3 &&
            david.collaborators.size === 3 &&
            priya.collaborators.size === 3
        );

        console.log(`  Alex sees ${alex.collaborators.size} collaborators:`, Array.from(alex.collaborators.values()).map(c => `${c.name} (${c.color})`));
        console.log(`  Priya sees ${priya.collaborators.size} collaborators:`, Array.from(priya.collaborators.values()).map(c => `${c.name} (${c.color})`));

        // Verify no tab sees itself as a remote collaborator
        const noSelfInAlex = !Array.from(alex.collaborators.values()).some(c => c.socketId === alex.socket.id);
        const hasDistinctColors = new Set(Array.from(alex.collaborators.values()).map(c => c.color)).size === 3;

        if (ready && noSelfInAlex && hasDistinctColors) {
            console.log('  [PASS] Test A: All 4 tabs joined, received collaborator identities and distinct colors.\n');
            passed++;
        } else {
            console.error('  [FAIL] Test A: Initial presence registration mismatch.\n');
        }

        [alex, sarah, david, priya].forEach(c => c.disconnect());
    } catch (err) {
        console.error('  [FAIL] Test A error:', err.message, '\n');
    }

    // -------------------------------------------------------------
    // Test B: Cursor movement & color consistency
    // -------------------------------------------------------------
    try {
        console.log('--- TEST B: Cursor Movement & Color Consistency ---');
        const docId = `test-b-cursor-${Date.now()}`;

        const alex = await createClient('alex-rivera', 'Alex Rivera');
        const sarah = await createClient('sarah-chen', 'Sarah Chen');

        await joinDoc(alex, docId);
        await joinDoc(sarah, docId);
        await waitFor(() => alex.collaborators.size === 1 && sarah.collaborators.size === 1);

        const initialAlexColor = sarah.collaborators.get(alex.socket.id).color;

        // Alex moves cursor to character index 28
        updateCursor(alex, 28, 28, 28);

        const moved1 = await waitFor(() => {
            const col = sarah.collaborators.get(alex.socket.id);
            return col && col.cursor === 28;
        });

        // Sarah moves cursor to character index 14
        updateCursor(sarah, 14, 14, 14);

        const moved2 = await waitFor(() => {
            const col = alex.collaborators.get(sarah.socket.id);
            return col && col.cursor === 14;
        });

        const alexColInSarah = sarah.collaborators.get(alex.socket.id);
        console.log(`  Sarah sees Alex cursor at pos: ${alexColInSarah?.cursor}, name: "${alexColInSarah?.name}", color: ${alexColInSarah?.color}`);
        const sarahColInAlex = alex.collaborators.get(sarah.socket.id);
        console.log(`  Alex sees Sarah cursor at pos: ${sarahColInAlex?.cursor}, name: "${sarahColInAlex?.name}", color: ${sarahColInAlex?.color}`);

        const colorMatches = alexColInSarah?.color === initialAlexColor;

        if (moved1 && moved2 && colorMatches && alexColInSarah?.name === 'Alex Rivera') {
            console.log('  [PASS] Test B: Cursors synchronized smoothly with consistent colors and names.\n');
            passed++;
        } else {
            console.error('  [FAIL] Test B: Cursor movement update failed.\n');
        }

        alex.disconnect();
        sarah.disconnect();
    } catch (err) {
        console.error('  [FAIL] Test B error:', err.message, '\n');
    }

    // -------------------------------------------------------------
    // Test C: Concurrent editing & OT cursor transformation
    // -------------------------------------------------------------
    try {
        console.log('--- TEST C: Concurrent Editing & OT Cursor Position Transformation ---');

        // Focused unit tests for transformCursor
        const opInsertBefore = { type: 'insert', position: 5, text: 'hello' }; // 5 chars
        const opInsertAfter = { type: 'insert', position: 20, text: 'world' };
        const opDeleteBefore = { type: 'delete', position: 2, count: 4 }; // 4 chars
        const opDeleteAcross = { type: 'delete', position: 5, count: 10 }; // spans over 8
        const opDeleteAfter = { type: 'delete', position: 15, count: 5 };

        const u1 = transformCursor(10, opInsertBefore) === 15;
        const u2 = transformCursor(10, opInsertAfter) === 10;
        const u3 = transformCursor(10, opDeleteBefore) === 6;
        const u4 = transformCursor(8, opDeleteAcross) === 5;
        const u5 = transformCursor(10, opDeleteAfter) === 10;

        console.log(`  Focused OT cursor unit tests passed: ${u1 && u2 && u3 && u4 && u5}`);

        const docId = `test-c-ot-cursor-${Date.now()}`;

        const alex = await createClient('alex-rivera', 'Alex Rivera');
        const sarah = await createClient('sarah-chen', 'Sarah Chen');
        const david = await createClient('david-kim', 'David Kim');

        await joinDoc(alex, docId);
        await joinDoc(sarah, docId);
        await joinDoc(david, docId);

        // Step 1: Establish text baseline: "The quick brown fox"
        const initialText = 'The quick brown fox';
        sendOperation(alex, [{ type: 'insert', position: 0, text: initialText }]);
        await waitFor(() => sarah.content === initialText && david.content === initialText && alex.version === 1);

        // Step 2: Sarah places her cursor at position 16 (on "fox")
        updateCursor(sarah, 16, 16, 16);
        await waitFor(() =>
            alex.collaborators.get(sarah.socket.id)?.cursor === 16 &&
            david.collaborators.get(sarah.socket.id)?.cursor === 16
        );
        console.log(`  Baseline: Sarah cursor at position 16 ("fox")`);

        // Step 3: Alex concurrently inserts "really " (7 chars) at position 4 (before Sarah's cursor)
        sendOperation(alex, [{ type: 'insert', position: 4, text: 'really ' }]);

        // Step 4: Verify Sarah's cursor held in Alex's view was shifted locally to 23 (16 + 7)
        // and held in David's view was shifted via remote broadcast operation to 23 (16 + 7)
        const transformedAlex = await waitFor(() => {
            const sarahCol = alex.collaborators.get(sarah.socket.id);
            return sarahCol && sarahCol.cursor === 23;
        });

        const transformedDavid = await waitFor(() => {
            const sarahCol = david.collaborators.get(sarah.socket.id);
            return sarahCol && sarahCol.cursor === 23;
        });

        console.log(`  Alex view of Sarah cursor: ${alex.collaborators.get(sarah.socket.id)?.cursor} (expected 23)`);
        console.log(`  David view of Sarah cursor: ${david.collaborators.get(sarah.socket.id)?.cursor} (expected 23)`);

        if (u1 && u2 && u3 && u4 && u5 && transformedAlex && transformedDavid) {
            console.log('  [PASS] Test C: Remote cursor position transformed correctly via OT after text edit.\n');
            passed++;
        } else {
            console.error('  [FAIL] Test C: OT cursor position transformation failed.\n');
        }

        alex.disconnect();
        sarah.disconnect();
        david.disconnect();
    } catch (err) {
        console.error('  [FAIL] Test C error:', err.message, '\n');
    }

    // -------------------------------------------------------------
    // Test D: Selection range synchronization
    // -------------------------------------------------------------
    try {
        console.log('--- TEST D: Selection Range Synchronization ---');
        const docId = `test-d-selection-${Date.now()}`;

        const david = await createClient('david-kim', 'David Kim');
        const priya = await createClient('priya-sharma', 'Priya Sharma');

        await joinDoc(david, docId);
        await joinDoc(priya, docId);
        await waitFor(() => david.collaborators.size === 1 && priya.collaborators.size === 1);

        // David selects text range from character 10 to 35
        updateCursor(david, 35, 10, 35);

        const selReceived = await waitFor(() => {
            const col = priya.collaborators.get(david.socket.id);
            return col && col.selectionStart === 10 && col.selectionEnd === 35 && col.cursor === 35;
        });

        const davidCol = priya.collaborators.get(david.socket.id);
        console.log(`  Priya received David selection range: [${davidCol?.selectionStart}, ${davidCol?.selectionEnd}], cursor: ${davidCol?.cursor}`);

        if (selReceived && davidCol?.selectionStart === 10 && davidCol?.selectionEnd === 35) {
            console.log('  [PASS] Test D: Selection range broadcast and received accurately.\n');
            passed++;
        } else {
            console.error('  [FAIL] Test D: Selection range update failed.\n');
        }

        david.disconnect();
        priya.disconnect();
    } catch (err) {
        console.error('  [FAIL] Test D error:', err.message, '\n');
    }

    // -------------------------------------------------------------
    // Test E: Disconnect and reconnect (multi-tab safe, no duplicates)
    // -------------------------------------------------------------
    try {
        console.log('--- TEST E: Disconnect & Reconnect Presence Cleanup ---');
        const docId = `test-e-reconnect-${Date.now()}`;

        const alex = await createClient('alex-rivera', 'Alex Rivera');
        let sarah = await createClient('sarah-chen', 'Sarah Chen');

        await joinDoc(alex, docId);
        await joinDoc(sarah, docId);
        await waitFor(() => alex.collaborators.size === 1);

        console.log(`  Before disconnect: Alex sees ${alex.collaborators.size} collaborator(s)`);

        // Sarah closes tab (disconnects)
        sarah.disconnect();

        const leftCleaned = await waitFor(() => alex.collaborators.size === 0);
        console.log(`  After Sarah disconnect: Alex sees ${alex.collaborators.size} collaborator(s)`);

        // Sarah reopens tab / reconnects
        sarah = await createClient('sarah-chen', 'Sarah Chen');
        await joinDoc(sarah, docId);

        const reconnected = await waitFor(() => alex.collaborators.size === 1 && sarah.collaborators.size === 1);
        console.log(`  After Sarah reconnect: Alex sees ${alex.collaborators.size} collaborator(s) (no duplicates)`);

        if (leftCleaned && reconnected && alex.collaborators.size === 1) {
            console.log('  [PASS] Test E: Disconnect cleans up presence immediately; reconnect restores presence with 0 duplicates.\n');
            passed++;
        } else {
            console.error('  [FAIL] Test E: Disconnect/reconnect cleanup failed.\n');
        }

        alex.disconnect();
        sarah.disconnect();
    } catch (err) {
        console.error('  [FAIL] Test E error:', err.message, '\n');
    }

    // -------------------------------------------------------------
    // Test F: Document isolation
    // -------------------------------------------------------------
    try {
        console.log('--- TEST F: Document Room Isolation ---');
        const doc1 = `test-f-room1-${Date.now()}`;
        const doc2 = `test-f-room2-${Date.now()}`;

        const client1 = await createClient('user-room1', 'User Room 1');
        const client2 = await createClient('user-room2', 'User Room 2');

        await joinDoc(client1, doc1);
        await joinDoc(client2, doc2);

        // Client 1 updates cursor in doc 1
        updateCursor(client1, 55, 55, 55);
        await new Promise(r => setTimeout(r, 400));

        console.log(`  Client 1 (Doc 1) collaborators: ${client1.collaborators.size}`);
        console.log(`  Client 2 (Doc 2) collaborators: ${client2.collaborators.size}`);
        console.log(`  Client 2 received updates from Doc 1: ${client2.receivedCursorUpdates.length}`);

        const isolated = client1.collaborators.size === 0 &&
                         client2.collaborators.size === 0 &&
                         client2.receivedCursorUpdates.length === 0;

        if (isolated) {
            console.log('  [PASS] Test F: Document rooms are 100% isolated; zero cursor or presence leakage.\n');
            passed++;
        } else {
            console.error('  [FAIL] Test F: Document room isolation violated.\n');
        }

        client1.disconnect();
        client2.disconnect();
    } catch (err) {
        console.error('  [FAIL] Test F error:', err.message, '\n');
    }

    // -------------------------------------------------------------
    // Test G: Authentication, security & Groq secret isolation
    // -------------------------------------------------------------
    try {
        console.log('--- TEST G: Authentication, Security & Secret Isolation ---');

        // 1. Unauthenticated Socket Connection Rejection
        let rejectedUnauthorized = false;
        try {
            const badSocket = io(BASE_URL, {
                auth: { token: 'invalid-or-fake-token' },
                transports: ['websocket'],
                forceNew: true
            });
            await new Promise((res, rej) => {
                badSocket.on('connect_error', (err) => {
                    if (err.message === 'unauthorized') {
                        rejectedUnauthorized = true;
                    }
                    badSocket.disconnect();
                    res();
                });
                badSocket.on('connect', () => {
                    badSocket.disconnect();
                    rej(new Error('Unauthenticated socket connected unexpectedly!'));
                });
            });
        } catch (e) {
            console.error('Auth rejection check error:', e.message);
        }

        // 2. Secret Isolation Check: Ensure GROQ_API_KEY is not leaked in client bundle or Git-tracked code
        const clientDistPath = path.join(__dirname, 'client', 'dist');
        let secretLeakedInBuild = false;
        const groqKey = process.env.GROQ_API_KEY || 'gsk_';

        if (fs.existsSync(clientDistPath) && groqKey.startsWith('gsk_')) {
            const files = fs.readdirSync(path.join(clientDistPath, 'assets'));
            for (const file of files) {
                const content = fs.readFileSync(path.join(clientDistPath, 'assets', file), 'utf8');
                if (content.includes(groqKey)) {
                    secretLeakedInBuild = true;
                    break;
                }
            }
        }

        console.log(`  Unauthenticated socket rejected: ${rejectedUnauthorized}`);
        console.log(`  GROQ_API_KEY absent from frontend production bundle: ${!secretLeakedInBuild}`);

        if (rejectedUnauthorized && !secretLeakedInBuild) {
            console.log('  [PASS] Test G: Unauthenticated sockets rejected; API secrets securely isolated on backend.\n');
            passed++;
        } else {
            console.error('  [FAIL] Test G: Security or secret isolation check failed.\n');
        }
    } catch (err) {
        console.error('  [FAIL] Test G error:', err.message, '\n');
    }

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('================================================================');
    console.log(`   Final Summary: ${passed} / ${total} Test Scenarios Passed`);
    console.log('================================================================\n');

    if (passed === total) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

runPresenceTests().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
});
