// Operational Transformation and Diff Engine

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

export function transform(opA, opB) {
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
    return null;
  }

  // 4. Delete (opA) vs Delete (opB)
  if (opA.type === 'delete' && opB.type === 'delete') {
    const startA = posA;
    const endA = posA + aLen;
    const startB = posB;
    const endB = posB + bLen;

    if (endA <= startB) {
      return { ...opB, position: startB - aLen };
    }
    if (endB <= startA) {
      return opB;
    }
    if (startA <= startB && endA >= endB) {
      return null;
    }
    if (startB < startA && endB > endA) {
      return { ...opB, position: startB, count: bLen - aLen };
    }
    if (startA <= startB && endA < endB) {
      return { ...opB, position: startA, count: endB - endA };
    }
    if (startB < startA && endB <= endA) {
      return { ...opB, position: startB, count: startA - startB };
    }
  }

  return opB;
}

export function applyOperation(text, op) {
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

// Adjusts the local cursor position when remote operations arrive
export function transformCursor(cursorPos, op) {
  if (!op) return cursorPos;

  if (op.type === 'insert') {
    const insertLen = op.text ? op.text.length : (op.char ? op.char.length : 0);
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

// Safely cleans up malformed markers (e.g. repeated prefixes, empty bold/underline tags)
// without destroying legitimate user text.
export function cleanMalformedContent(text) {
  if (!text || typeof text !== 'string') return text || '';

  let cleaned = text
    .replace(/\*{4,}/g, '')
    .replace(/~{4,}/g, '')
    .replace(/<u>\s*~*\s*<\/u>/gi, '')
    .replace(/<u>/gi, '')
    .replace(/<\/u>/gi, '');

  // Collapse repeated prefix spam on the same line (e.g. "1. 1. 1. 1. - - ### - - ")
  cleaned = cleaned.replace(/^(\s*(?:1\.\s*|- \s*|###\s*)){2,}/gm, (match) => {
    if (match.includes('1.')) return '1. ';
    if (match.includes('-')) return '- ';
    if (match.includes('###')) return '### ';
    return '';
  });

  return cleaned;
}
