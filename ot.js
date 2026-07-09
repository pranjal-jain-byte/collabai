// ot.js — supports multi-character insert/delete operations

function transform(opA, opB) {
    const aInsertLen = opA.type === 'insert' ? opA.text.length : 0;
    const aDeleteLen = opA.type === 'delete' ? opA.count : 0;

    if (opA.type === 'insert' && opB.type === 'insert') {
        if (opA.position < opB.position ||
           (opA.position === opB.position && (opA.userId ?? 0) < (opB.userId ?? 0))) {
            return { ...opB, position: opB.position + aInsertLen };
        }
        return opB;
    }

    if (opA.type === 'insert' && opB.type === 'delete') {
        if (opA.position <= opB.position) {
            return { ...opB, position: opB.position + aInsertLen };
        }
        return opB;
    }

    if (opA.type === 'delete' && opB.type === 'insert') {
        if (opA.position < opB.position) {
            const shift = Math.min(aDeleteLen, opB.position - opA.position);
            return { ...opB, position: opB.position - shift };
        }
        return opB;
    }

    if (opA.type === 'delete' && opB.type === 'delete') {
        if (opA.position + aDeleteLen <= opB.position) {
            return { ...opB, position: opB.position - aDeleteLen };
        }
        if (opB.position + opB.count <= opA.position) {
            return opB;
        }
        const newPosition = Math.max(opA.position, opB.position - aDeleteLen);
        const overlap = Math.min(aDeleteLen, opB.position + opB.count - opA.position);
        const newCount = Math.max(opB.count - Math.max(overlap, 0), 0);
        if (newCount === 0) return null;
        return { ...opB, position: newPosition, count: newCount };
    }
}

function applyOperation(text, op) {
    if (!op) return text;
    if (op.type === 'insert') {
        return text.slice(0, op.position) + op.text + text.slice(op.position);
    }
    if (op.type === 'delete') {
        return text.slice(0, op.position) + text.slice(op.position + op.count);
    }
    return text;
}

module.exports = { transform, applyOperation };