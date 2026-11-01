// Client-side Operational Transformation and Diff Engine

export function diffText(oldText, newText) {
    let prefix = 0;
    while (prefix < oldText.length && prefix < newText.length &&
           oldText[prefix] === newText[prefix]) {
        prefix++;
    }

    let oldEnd = oldText.length;
    let newEnd = newText.length;
    while (oldEnd > prefix && newEnd > prefix &&
           oldText[oldEnd - 1] === newText[newEnd - 1]) {
        oldEnd--;
        newEnd--;
    }

    const deletedCount = oldEnd - prefix;
    const insertedText = newText.slice(prefix, newEnd);

    const ops = [];
    if (deletedCount > 0) {
        ops.push({ type: 'delete', position: prefix, count: deletedCount });
    }
    if (insertedText.length > 0) {
        ops.push({ type: 'insert', position: prefix, text: insertedText });
    }
    return ops;
}

export function applyOperation(text, op) {
    if (!op) return text;
    if (op.type === 'insert') {
        const insertText = op.text ?? op.char ?? '';
        return text.slice(0, op.position) + insertText + text.slice(op.position);
    }
    if (op.type === 'delete') {
        const count = op.count ?? (op.text ? op.text.length : 1);
        return text.slice(0, op.position) + text.slice(op.position + count);
    }
    return text;
}

// Adjusts local cursor position when remote operations are inserted or deleted
export function transformCursor(cursorPos, op) {
    if (!op) return cursorPos;

    if (op.type === 'insert') {
        const insertLen = (op.text ? op.text.length : (op.char ? op.char.length : 0));
        if (op.position <= cursorPos) {
            return cursorPos + insertLen;
        }
    } else if (op.type === 'delete') {
        const delLen = op.count ?? 1;
        if (op.position + delLen <= cursorPos) {
            return cursorPos - delLen;
        } else if (op.position < cursorPos) {
            return op.position;
        }
    }
    return cursorPos;
}
