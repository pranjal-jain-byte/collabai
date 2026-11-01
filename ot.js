// ot.js — Operational Transformation engine supporting multi-character insert and delete operations
// Satisfies Transformation Property 1 (TP1) across all overlap, containment, and tie-breaking edge cases.

function transform(opA, opB) {
    if (!opA || !opB) return opB;

    const getLen = (op) => {
        if (op.type === 'insert') {
            return (op.text ? op.text.length : (op.char ? op.char.length : 0));
        }
        if (op.type === 'delete') {
            return (op.count ?? (op.text ? op.text.length : 1));
        }
        return 0;
    };

    const aLen = getLen(opA);
    const bLen = getLen(opB);
    const posA = opA.position ?? 0;
    const posB = opB.position ?? 0;

    // 1. Insert vs Insert
    if (opA.type === 'insert' && opB.type === 'insert') {
        if (posA < posB) {
            return { ...opB, position: posB + aLen };
        }
        if (posA > posB) {
            return opB;
        }
        // Same position: deterministic tie-breaking by userId, then text
        const userA = String(opA.userId ?? '0');
        const userB = String(opB.userId ?? '0');
        if (userA < userB) {
            return { ...opB, position: posB + aLen };
        }
        if (userA > userB) {
            return opB;
        }
        const textA = opA.text ?? opA.char ?? '';
        const textB = opB.text ?? opB.char ?? '';
        if (textA < textB) {
            return { ...opB, position: posB + aLen };
        }
        return opB;
    }

    // 2. Insert (opA) vs Delete (opB)
    if (opA.type === 'insert' && opB.type === 'delete') {
        if (posA <= posB) {
            return { ...opB, position: posB + aLen };
        }
        if (posA >= posB + bLen) {
            return opB;
        }
        // Insert occurred strictly inside the delete range: expand delete to swallow inserted text
        return { ...opB, count: bLen + aLen };
    }

    // 3. Delete (opA) vs Insert (opB)
    if (opA.type === 'delete' && opB.type === 'insert') {
        if (posB <= posA) {
            return opB;
        }
        if (posB >= posA + aLen) {
            return { ...opB, position: posB - aLen };
        }
        // Insert occurred inside deleted region: absorbed by the prior delete
        return null;
    }

    // 4. Delete (opA) vs Delete (opB)
    if (opA.type === 'delete' && opB.type === 'delete') {
        const startA = posA;
        const endA = posA + aLen;
        const startB = posB;
        const endB = posB + bLen;

        // Disjoint: A before B
        if (endA <= startB) {
            return { ...opB, position: startB - aLen };
        }
        // Disjoint: B before A
        if (endB <= startA) {
            return opB;
        }
        // A completely covers B (including identical ranges)
        if (startA <= startB && endA >= endB) {
            return null;
        }
        // B strictly contains A
        if (startB < startA && endB > endA) {
            return { ...opB, position: startB, count: bLen - aLen };
        }
        // A overlaps left side of B
        if (startA <= startB && endA < endB) {
            return { ...opB, position: startA, count: endB - endA };
        }
        // B overlaps left side of A
        if (startB < startA && endB <= endA) {
            return { ...opB, position: startB, count: startA - startB };
        }
    }

    return opB;
}

function applyOperation(text, op) {
    if (!op) return text;
    const str = typeof text === 'string' ? text : '';
    if (op.type === 'insert') {
        const insertText = op.text ?? op.char ?? '';
        const pos = Math.max(0, Math.min(op.position ?? 0, str.length));
        return str.slice(0, pos) + insertText + str.slice(pos);
    }
    if (op.type === 'delete') {
        const count = Math.max(0, op.count ?? (op.text ? op.text.length : 1));
        const pos = Math.max(0, Math.min(op.position ?? 0, str.length));
        return str.slice(0, pos) + str.slice(pos + count);
    }
    return str;
}

function transformCursor(cursorPos, op) {
    if (!op || typeof cursorPos !== 'number') return cursorPos;

    if (op.type === 'insert') {
        const insertLen = op.text ? op.text.length : (op.char ? op.char.length : 0);
        if (op.position <= cursorPos) {
            return cursorPos + insertLen;
        }
    } else if (op.type === 'delete') {
        const delLen = op.count ?? (op.text ? op.text.length : 1);
        if (op.position + delLen <= cursorPos) {
            return cursorPos - delLen;
        } else if (op.position < cursorPos) {
            return op.position;
        }
    }
    return cursorPos;
}

module.exports = { transform, applyOperation, transformCursor };