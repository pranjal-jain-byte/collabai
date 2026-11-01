// test-collaboration.js
// Automated verification of two concurrent collaborators synchronizing over Socket.IO and OT

const io = require('socket.io-client');

async function testCollaboration() {
    console.log('--- Testing Two Independent Collaborators ---');

    // 1. Authenticate User 1: Sarah Chen
    const res1 = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'sarah-chen' })
    });
    const auth1 = await res1.json();
    console.log('[Auth] Sarah Chen authenticated. Access token received:', !!auth1.accessToken);

    // 2. Authenticate User 2: David Kim
    const res2 = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'david-kim' })
    });
    const auth2 = await res2.json();
    console.log('[Auth] David Kim authenticated. Access token received:', !!auth2.accessToken);

    // 3. Connect Sockets
    const socket1 = io('http://localhost:3000', { auth: { token: auth1.accessToken } });
    const socket2 = io('http://localhost:3000', { auth: { token: auth2.accessToken } });

    await Promise.all([
        new Promise(res => socket1.on('connect', res)),
        new Promise(res => socket2.on('connect', res))
    ]);
    console.log('[Socket] Both collaborators connected simultaneously via WebSocket!');

    const docId = 'collab-sync-test-' + Date.now();

    let docState1 = '';
    let docState2 = '';
    let version1 = 0;
    let version2 = 0;

    socket1.emit('join-doc', docId);
    socket2.emit('join-doc', docId);

    await Promise.all([
        new Promise(res => socket1.on('load-doc', c => {
            docState1 = typeof c === 'string' ? c : (c && c.content !== undefined ? c.content : '');
            version1 = typeof c === 'object' && c ? (c.version || 0) : 0;
            res();
        })),
        new Promise(res => socket2.on('load-doc', c => {
            docState2 = typeof c === 'string' ? c : (c && c.content !== undefined ? c.content : '');
            version2 = typeof c === 'object' && c ? (c.version || 0) : 0;
            res();
        }))
    ]);
    console.log('[Join] Both joined document room:', docId);

    // Setup operation listeners
    let sarahReceivedDavidOp = false;
    let davidReceivedSarahOp = false;

    socket1.on('operation', ({ ops, version }) => {
        sarahReceivedDavidOp = true;
        version1 = version;
        for (const op of ops) {
            if (op.type === 'insert') {
                docState1 = docState1.slice(0, op.position) + op.text + docState1.slice(op.position);
            }
        }
        console.log('[Sync] Sarah received remote op from David! Current Sarah docState:', JSON.stringify(docState1));
    });

    socket2.on('operation', ({ ops, version }) => {
        davidReceivedSarahOp = true;
        version2 = version;
        for (const op of ops) {
            if (op.type === 'insert') {
                docState2 = docState2.slice(0, op.position) + op.text + docState2.slice(op.position);
            }
        }
        console.log('[Sync] David received remote op from Sarah! Current David docState:', JSON.stringify(docState2));
    });

    socket1.on('operation-ack', ({ version }) => {
        version1 = version;
    });
    socket2.on('operation-ack', ({ version }) => {
        version2 = version;
    });

    // 4. Sarah types 'Distributed Systems ' at pos 0
    const text1 = 'Distributed Systems ';
    socket1.emit('operation', {
        docId,
        ops: [{ type: 'insert', position: 0, text: text1 }],
        baseVersion: 0
    });
    docState1 = text1;

    // Wait for David to receive Sarah's edit
    await new Promise(r => setTimeout(r, 400));
    console.log('[Verify 1] David received Sarah edit:', davidReceivedSarahOp);

    // 5. David types 'with Operational Transformation' at the end
    const text2 = 'with Operational Transformation';
    socket2.emit('operation', {
        docId,
        ops: [{ type: 'insert', position: docState2.length, text: text2 }],
        baseVersion: version2
    });
    docState2 = docState2 + text2;

    // Wait for Sarah to receive David's edit
    await new Promise(r => setTimeout(r, 400));
    console.log('[Verify 2] Sarah received David edit:', sarahReceivedDavidOp);

    console.log('\n--- Final Convergence Verification ---');
    console.log('Sarah local view:', JSON.stringify(docState1));
    console.log('David local view:', JSON.stringify(docState2));
    console.log('States 100% Identical?:', docState1 === docState2);

    socket1.disconnect();
    socket2.disconnect();

    if (docState1 === docState2 && docState1.length > 0) {
        console.log('>>> SUCCESS: Real-time dual-collaborator OT test passed with 100% convergence!\n');
        process.exit(0);
    } else {
        console.error('>>> FAILURE: Documents did not converge.\n');
        process.exit(1);
    }
}

testCollaboration().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
