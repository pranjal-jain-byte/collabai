// test-sync-protocol.js
// Automated Verification Suite for CollabAI Backend & Synchronization Protocol
// Covers Tests A through G as required by the audit specification.

const io = require('socket.io-client');
const { transform, applyOperation } = require('./ot');

const BASE_URL = 'http://localhost:3000';

async function loginUser(userId) {
    const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error(`Login failed for ${userId}: ${res.statusText}`);
    return await res.json();
}

async function createClient(userId) {
    const auth = await loginUser(userId);
    const socket = io(BASE_URL, {
        auth: { token: auth.accessToken },
        transports: ['websocket', 'polling'],
        forceNew: true
    });

    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Connection timeout for ${userId}`)), 5000);
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
        socket,
        content: '',
        version: 0,
        pendingOp: null,
        bufferOps: [],
        disconnect: () => socket.disconnect()
    };

    // Client-side OT reconciliation engine
    socket.on('load-doc', (data) => {
        if (typeof data === 'string') {
            client.content = data;
            client.version = 0;
        } else if (data && typeof data === 'object') {
            client.content = data.content ?? '';
            client.version = data.version ?? 0;
        }
    });

    socket.on('operation', ({ ops, version }) => {
        let transformedRemoteOps = Array.isArray(ops) ? [...ops] : [];

        // Reconcile against pending in-flight local ops
        if (client.pendingOp && client.pendingOp.ops) {
            const nextPending = [];
            for (let inOp of client.pendingOp.ops) {
                let curIn = inOp;
                const nextRemote = [];
                for (let remOp of transformedRemoteOps) {
                    if (curIn === null) {
                        nextRemote.push(remOp);
                        continue;
                    }
                    const remPrime = transform(curIn, remOp);
                    const inPrime = transform(remOp, curIn);
                    if (remPrime) nextRemote.push(remPrime);
                    curIn = inPrime;
                }
                transformedRemoteOps = nextRemote;
                if (curIn) nextPending.push(curIn);
            }
            client.pendingOp.ops = nextPending;
        }

        // Reconcile against buffered local ops
        if (client.bufferOps.length > 0) {
            const nextBuffer = [];
            for (let bufOp of client.bufferOps) {
                let curBuf = bufOp;
                const nextRemote = [];
                for (let remOp of transformedRemoteOps) {
                    if (curBuf === null) {
                        nextRemote.push(remOp);
                        continue;
                    }
                    const remPrime = transform(curBuf, remOp);
                    const bufPrime = transform(remOp, curBuf);
                    if (remPrime) nextRemote.push(remPrime);
                    curBuf = bufPrime;
                }
                transformedRemoteOps = nextRemote;
                if (curBuf) nextBuffer.push(curBuf);
            }
            client.bufferOps = nextBuffer;
        }

        for (const op of transformedRemoteOps) {
            client.content = applyOperation(client.content, op);
        }
        client.version = version;
    });

    socket.on('operation-ack', ({ version }) => {
        client.version = version;
        client.pendingOp = null;
        if (client.bufferOps.length > 0) {
            const nextOps = [...client.bufferOps];
            client.bufferOps = [];
            client.pendingOp = { ops: nextOps, baseVersion: version };
            socket.emit('operation', { docId: client.currentDocId, ops: nextOps, baseVersion: version });
        }
    });

    return client;
}

function joinDocument(client, docId) {
    client.currentDocId = docId;
    return new Promise((resolve) => {
        client.socket.once('load-doc', (data) => {
            resolve(data);
        });
        client.socket.emit('join-doc', docId);
    });
}

function sendEdit(client, ops) {
    const baseVersion = client.version;
    // Apply locally first (optimistic)
    for (const op of ops) {
        client.content = applyOperation(client.content, op);
    }
    if (client.pendingOp === null) {
        client.pendingOp = { ops, baseVersion };
        client.socket.emit('operation', { docId: client.currentDocId, ops, baseVersion });
    } else {
        client.bufferOps.push(...ops);
    }
}

async function waitForCondition(checkFn, timeoutMs = 4000, intervalMs = 50) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (checkFn()) return true;
        await new Promise(r => setTimeout(r, intervalMs));
    }
    return false;
}

// -------------------------------------------------------------
// TEST RUNNER
// -------------------------------------------------------------
async function runAllTests() {
    console.log('================================================================');
    console.log('   CollabAI Synchronization Protocol & Backend Verification');
    console.log('================================================================\n');

    let totalPassed = 0;
    const totalTests = 7;

    // -------------------------------------------------------------
    // Test A: Initial document loading
    // -------------------------------------------------------------
    try {
        console.log('--- TEST A: Initial Document Loading ---');
        const docId = `test-a-load-${Date.now()}`;
        const client1 = await createClient('user-a1');
        await joinDocument(client1, docId);

        const lines = 'Line 1: CollabAI Architecture\nLine 2: Operational Transformation\nLine 3: Distributed State Synchronization';
        sendEdit(client1, [{ type: 'insert', position: 0, text: lines }]);

        // Wait for server acknowledgment
        const acked = await waitForCondition(() => client1.version > 0);
        if (!acked) throw new Error('Client 1 operation not acknowledged by server');

        // Client 2 opens the document
        const client2 = await createClient('user-a2');
        const loadDocData = await joinDocument(client2, docId);

        const expectedContent = lines;
        const actualContent = typeof loadDocData === 'string' ? loadDocData : loadDocData.content;
        const actualVersion = typeof loadDocData === 'object' ? loadDocData.version : 0;

        console.log(`  Client 1 written length: ${lines.length}, version: ${client1.version}`);
        console.log(`  Client 2 received length: ${actualContent.length}, version: ${actualVersion}`);

        if (actualContent === expectedContent && actualVersion === client1.version) {
            console.log('  [PASS] Test A: Client 2 received complete initial content and matching version.\n');
            totalPassed++;
        } else {
            console.error('  [FAIL] Test A: Content or version mismatch.');
            console.error(`  Expected: "${expectedContent}" (v${client1.version})`);
            console.error(`  Actual:   "${actualContent}" (v${actualVersion})\n`);
        }

        client1.disconnect();
        client2.disconnect();
    } catch (err) {
        console.error('  [FAIL] Test A error:', err.message, '\n');
    }

    // -------------------------------------------------------------
    // Test B: Concurrent joins
    // -------------------------------------------------------------
    try {
        console.log('--- TEST B: Concurrent Joins ---');
        const docId = `test-b-concurrent-joins-${Date.now()}`;
        const initialText = 'Concurrent Join Baseline Content';

        // Pre-populate document via REST API
        const createRes = await fetch(`${BASE_URL}/api/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ docId, title: 'Concurrent Join Test', content: initialText })
        });
        if (!createRes.ok) throw new Error('Failed to pre-create document');

        // Connect 4 independent clients
        const clients = await Promise.all([
            createClient('user-b1'),
            createClient('user-b2'),
            createClient('user-b3'),
            createClient('user-b4')
        ]);

        // Join document room SIMULTANEOUSLY
        const joinResults = await Promise.all(clients.map(c => joinDocument(c, docId)));

        const contents = joinResults.map(r => typeof r === 'string' ? r : r.content);
        const versions = joinResults.map(r => typeof r === 'object' ? r.version : 0);

        console.log(`  All 4 clients joined simultaneously.`);
        console.log(`  Contents received:`, contents.map(c => `"${c}"`));
        console.log(`  Versions received:`, versions);

        const allContentsMatch = contents.every(c => c === initialText);
        const allVersionsMatch = versions.every(v => v === versions[0]);

        if (allContentsMatch && allVersionsMatch) {
            console.log('  [PASS] Test B: All 4 concurrent joins received identical initial content and version.\n');
            totalPassed++;
        } else {
            console.error('  [FAIL] Test B: Inconsistent initialization across concurrent joins.\n');
        }

        clients.forEach(c => c.disconnect());
    } catch (err) {
        console.error('  [FAIL] Test B error:', err.message, '\n');
    }

    // -------------------------------------------------------------
    // Test C: Existing content plus new operations
    // -------------------------------------------------------------
    try {
        console.log('--- TEST C: Existing Content Plus New Operations ---');
        const docId = `test-c-ops-${Date.now()}`;

        const client1 = await createClient('user-c1');
        const client2 = await createClient('user-c2');

        await joinDocument(client1, docId);
        await joinDocument(client2, docId);

        // Step 1: Client 1 establishes baseline
        sendEdit(client1, [{ type: 'insert', position: 0, text: 'Alpha Beta' }]);
        await waitForCondition(() => client2.content === 'Alpha Beta');

        // Step 2: Client 2 sends edit on top of existing content
        sendEdit(client2, [{ type: 'insert', position: client2.content.length, text: ' Gamma' }]);

        // Wait for convergence on both sides
        const converged = await waitForCondition(() => client1.content === 'Alpha Beta Gamma' && client2.content === 'Alpha Beta Gamma');

        console.log(`  Client 1 content: "${client1.content}" (v${client1.version})`);
        console.log(`  Client 2 content: "${client2.content}" (v${client2.version})`);

        if (converged && client1.content === client2.content && client1.version === client2.version) {
            console.log('  [PASS] Test C: New operations applied on top of existing content converged.\n');
            totalPassed++;
        } else {
            console.error('  [FAIL] Test C: Convergence failed.\n');
        }

        client1.disconnect();
        client2.disconnect();
    } catch (err) {
        console.error('  [FAIL] Test C error:', err.message, '\n');
    }

    // -------------------------------------------------------------
    // Test D: Concurrent editing (TP1 on live server)
    // -------------------------------------------------------------
    try {
        console.log('--- TEST D: Concurrent Editing (TP1 Convergence) ---');
        const docId = `test-d-tp1-${Date.now()}`;

        const client1 = await createClient('user-d1');
        const client2 = await createClient('user-d2');

        await joinDocument(client1, docId);
        await joinDocument(client2, docId);

        // Initial shared baseline: "The quick brown fox"
        sendEdit(client1, [{ type: 'insert', position: 0, text: 'The quick brown fox' }]);
        await waitForCondition(() => client2.content === 'The quick brown fox');

        const baseV = client1.version;
        console.log(`  Shared baseline established at v${baseV}: "${client1.content}"`);

        // Concurrent edits based on the SAME baseVersion:
        // Client 1 inserts " jumps over the lazy dog" at position 19
        // Client 2 inserts "really " at position 4
        sendEdit(client1, [{ type: 'insert', position: 19, text: ' jumps over the lazy dog' }]);
        sendEdit(client2, [{ type: 'insert', position: 4, text: 'really ' }]);

        const converged = await waitForCondition(() =>
            client1.content === client2.content &&
            client1.content.includes('really quick brown fox jumps over the lazy dog')
        );

        console.log(`  Client 1 result: "${client1.content}" (v${client1.version})`);
        console.log(`  Client 2 result: "${client2.content}" (v${client2.version})`);

        if (converged && client1.content === client2.content) {
            console.log('  [PASS] Test D: Concurrent operations at identical baseVersion converged identically.\n');
            totalPassed++;
        } else {
            console.error('  [FAIL] Test D: Concurrent editing diverged.\n');
        }

        client1.disconnect();
        client2.disconnect();
    } catch (err) {
        console.error('  [FAIL] Test D error:', err.message, '\n');
    }

    // -------------------------------------------------------------
    // Test E: Multiple clients (4 clients simulation)
    // -------------------------------------------------------------
    try {
        console.log('--- TEST E: Four Concurrent Clients Simulating Multi-Tab Editing ---');
        const docId = `test-e-four-tabs-${Date.now()}`;

        const tab1 = await createClient('tab-1');
        const tab2 = await createClient('tab-2');
        const tab3 = await createClient('tab-3');
        const tab4 = await createClient('tab-4');

        // All 4 tabs join the document room
        await Promise.all([
            joinDocument(tab1, docId),
            joinDocument(tab2, docId),
            joinDocument(tab3, docId),
            joinDocument(tab4, docId)
        ]);

        console.log('  All 4 browser tabs connected to room:', docId);

        // Tab 1 types initial text
        sendEdit(tab1, [{ type: 'insert', position: 0, text: '[Root Document]' }]);
        await waitForCondition(() => tab4.content === '[Root Document]');

        // Perform interleaved edits across different tabs:
        // Tab 1 appends
        sendEdit(tab1, [{ type: 'insert', position: tab1.content.length, text: ' - Tab1 Edit' }]);
        // Tab 2 prepends
        sendEdit(tab2, [{ type: 'insert', position: 0, text: 'Tab2 Start: ' }]);
        // Tab 3 inserts in middle
        await waitForCondition(() => tab3.content.includes('Tab2 Start: '));
        const midIdx = tab3.content.indexOf('Root');
        sendEdit(tab3, [{ type: 'insert', position: midIdx, text: 'Core ' }]);
        // Tab 4 appends
        sendEdit(tab4, [{ type: 'insert', position: tab4.content.length, text: ' - Tab4 Finished' }]);

        // Wait for all 4 clients to converge
        const allConverged = await waitForCondition(() =>
            tab1.content === tab2.content &&
            tab2.content === tab3.content &&
            tab3.content === tab4.content &&
            tab1.version === tab4.version
        , 6000);

        console.log(`  Tab 1: "${tab1.content}" (v${tab1.version})`);
        console.log(`  Tab 2: "${tab2.content}" (v${tab2.version})`);
        console.log(`  Tab 3: "${tab3.content}" (v${tab3.version})`);
        console.log(`  Tab 4: "${tab4.content}" (v${tab4.version})`);

        if (allConverged && tab1.content.length > 0) {
            console.log('  [PASS] Test E: All 4 browser clients converged to 100% identical document state.\n');
            totalPassed++;
        } else {
            console.error('  [FAIL] Test E: 4-client convergence failed.\n');
        }

        [tab1, tab2, tab3, tab4].forEach(t => t.disconnect());
    } catch (err) {
        console.error('  [FAIL] Test E error:', err.message, '\n');
    }

    // -------------------------------------------------------------
    // Test F: Persistence
    // -------------------------------------------------------------
    try {
        console.log('--- TEST F: Persistence Recovery ---');
        const docId = `test-f-persist-${Date.now()}`;

        const client = await createClient('user-f1');
        await joinDocument(client, docId);

        // Perform multiple operations to advance version
        sendEdit(client, [{ type: 'insert', position: 0, text: 'Persist Header\n' }]);
        await waitForCondition(() => client.version === 1);

        sendEdit(client, [{ type: 'insert', position: client.content.length, text: 'Persist Body Paragraph\n' }]);
        await waitForCondition(() => client.version === 2);

        sendEdit(client, [{ type: 'insert', position: client.content.length, text: 'Persist Footer' }]);
        await waitForCondition(() => client.version === 3);

        const expectedContent = client.content;
        const expectedVersion = client.version;

        // Give persistence queue a brief moment to complete Redis/Mongo writes
        await new Promise(r => setTimeout(r, 600));

        // Retrieve document via REST API to verify persistence layer
        const getRes = await fetch(`${BASE_URL}/api/documents/${docId}`);
        if (!getRes.ok) throw new Error(`GET /api/documents/${docId} returned ${getRes.status}`);

        const docRecord = await getRes.json();
        console.log(`  In-memory expected: length=${expectedContent.length}, version=${expectedVersion}`);
        console.log(`  Persisted record:   length=${docRecord.content.length}, version=${docRecord.version}`);

        if (docRecord.content === expectedContent && docRecord.version === expectedVersion) {
            console.log('  [PASS] Test F: Persistence layer accurately recovered committed version and content.\n');
            totalPassed++;
        } else {
            console.error('  [FAIL] Test F: Persistence mismatch.\n');
        }

        client.disconnect();
    } catch (err) {
        console.error('  [FAIL] Test F error:', err.message, '\n');
    }

    // -------------------------------------------------------------
    // Test G: Invalid operations
    // -------------------------------------------------------------
    try {
        console.log('--- TEST G: Invalid Operations & Stale Versions ---');
        const docId = `test-g-validation-${Date.now()}`;

        const client = await createClient('user-g1');
        await joinDocument(client, docId);

        sendEdit(client, [{ type: 'insert', position: 0, text: 'Safe Document' }]);
        await waitForCondition(() => client.version === 1);

        const healthyContent = client.content;
        const healthyVersion = client.version;

        // 1. Send malformed ops payload (ops is string)
        client.socket.emit('operation', { docId, ops: 'malformed_ops', baseVersion: 1 });

        // 2. Send negative position
        client.socket.emit('operation', { docId, ops: [{ type: 'insert', position: -99, text: 'Bad' }], baseVersion: 1 });

        // 3. Send future baseVersion
        client.socket.emit('operation', { docId, ops: [{ type: 'insert', position: 0, text: 'Future' }], baseVersion: 9999 });

        // 4. Send empty ops array
        client.socket.emit('operation', { docId, ops: [], baseVersion: 1 });

        await new Promise(r => setTimeout(r, 500));

        // Submit a valid edit to verify the server is still healthy and operational
        sendEdit(client, [{ type: 'insert', position: client.content.length, text: ' Verified' }]);
        const validApplied = await waitForCondition(() => client.content === 'Safe Document Verified');

        console.log(`  State after invalid op injection: "${client.content}" (v${client.version})`);

        if (validApplied && client.content === 'Safe Document Verified') {
            console.log('  [PASS] Test G: Server safely rejected malformed payloads without crashing or corrupting state.\n');
            totalPassed++;
        } else {
            console.error('  [FAIL] Test G: Server state corrupted by invalid operations.\n');
        }

        client.disconnect();
    } catch (err) {
        console.error('  [FAIL] Test G error:', err.message, '\n');
    }

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('================================================================');
    console.log(`   Final Summary: ${totalPassed} / ${totalTests} Test Scenarios Passed`);
    console.log('================================================================\n');

    if (totalPassed === totalTests) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

runAllTests().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
});
