// test-ot-tp1.js - Mathematical Verification of Transformation Property 1 (TP1)
const { transform, applyOperation } = require('./ot');

function verifyTP1(initial, opA, opB, label) {
    const opBPrime = transform(opA, opB);
    const opAPrime = transform(opB, opA);

    const s1 = applyOperation(applyOperation(initial, opA), opBPrime);
    const s2 = applyOperation(applyOperation(initial, opB), opAPrime);

    if (s1 === s2) {
        console.log(`[PASS] ${label}: "${initial}" -> "${s1}"`);
        return true;
    } else {
        console.error(`[FAIL] ${label}:`);
        console.error(`  Initial: "${initial}"`);
        console.error(`  OpA:`, opA);
        console.error(`  OpB:`, opB);
        console.error(`  Transformed B (opA, opB):`, opBPrime);
        console.error(`  Transformed A (opB, opA):`, opAPrime);
        console.error(`  Path 1 (opA then opB'): "${s1}"`);
        console.error(`  Path 2 (opB then opA'): "${s2}"`);
        return false;
    }
}

console.log('Testing current ot.js implementation:');
let passed = 0;
let total = 0;

function check(initial, opA, opB, label) {
    total++;
    if (verifyTP1(initial, opA, opB, label)) passed++;
}

// 1. Same-position insertions (Tie-breaking)
check('Hello', { type: 'insert', position: 5, text: 'X', userId: 'user-1' }, { type: 'insert', position: 5, text: 'Y', userId: 'user-2' }, 'Same-position Insert (user1 vs user2)');
check('Hello', { type: 'insert', position: 5, text: 'Y', userId: 'user-2' }, { type: 'insert', position: 5, text: 'X', userId: 'user-1' }, 'Same-position Insert (user2 vs user1)');

// 2. Different-position insertions
check('Hello', { type: 'insert', position: 1, text: 'A', userId: 'user-1' }, { type: 'insert', position: 3, text: 'B', userId: 'user-2' }, 'Different-position Insert');

// 3. Insert vs Delete (Disjoint)
check('abcdef', { type: 'insert', position: 0, text: 'X', userId: 'user-1' }, { type: 'delete', position: 3, count: 2, userId: 'user-2' }, 'Insert before Delete');
check('abcdef', { type: 'insert', position: 5, text: 'X', userId: 'user-1' }, { type: 'delete', position: 1, count: 2, userId: 'user-2' }, 'Insert after Delete');

// 4. Insert vs Delete (Insert inside Delete range)
check('abcdef', { type: 'delete', position: 1, count: 4, userId: 'user-1' }, { type: 'insert', position: 3, text: 'XYZ', userId: 'user-2' }, 'Insert inside Delete range');

// 5. Delete vs Delete (Disjoint)
check('abcdefghij', { type: 'delete', position: 1, count: 2, userId: 'user-1' }, { type: 'delete', position: 5, count: 3, userId: 'user-2' }, 'Disjoint Deletes');

// 6. Delete vs Delete (Overlapping - Partial)
check('abcdefghij', { type: 'delete', position: 2, count: 5, userId: 'user-1' }, { type: 'delete', position: 4, count: 4, userId: 'user-2' }, 'Overlapping Deletes (Partial)');

// 7. Delete vs Delete (Overlapping - One contains other)
check('abcdefghij', { type: 'delete', position: 1, count: 6, userId: 'user-1' }, { type: 'delete', position: 3, count: 2, userId: 'user-2' }, 'Contained Delete');

// 8. Delete vs Delete (Identical)
check('abcdefghij', { type: 'delete', position: 2, count: 4, userId: 'user-1' }, { type: 'delete', position: 2, count: 4, userId: 'user-2' }, 'Identical Deletes');

console.log(`\nResult: ${passed}/${total} passed`);
