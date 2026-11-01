// useDocument Hook - Core OT Concurrency & Document Lifecycle Engine

import { useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '../services/socket.js';
import { api } from '../services/api.js';
import { diffText, transform, applyOperation, transformCursor, cleanMalformedContent } from '../services/ot.js';

export function useDocument(docId) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Untitled Document');
  const [version, setVersion] = useState(0);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Undo / Redo stacks
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Active line formatting state synchronized with cursor
  const [activeFormatting, setActiveFormatting] = useState({
    heading: 'normal',
    isNumbered: false,
    isBulleted: false,
  });

  const [collaborators, setCollaborators] = useState([]);
  const collaboratorsRef = useRef([]);
  const contentRef = useRef('');
  const versionRef = useRef(0);
  const applyingRemoteOpRef = useRef(false);
  const pendingOpRef = useRef(null); // { ops, baseVersion } awaiting ack
  const bufferOpsRef = useRef([]);   // buffered local ops
  const textareaRef = useRef(null);
  const typingDebounceRef = useRef(null);
  const historyDebounceRef = useRef(null);
  const titleDebounceRef = useRef(null);
  const cursorThrottleRef = useRef(null);

  // Keep refs synchronized with state
  contentRef.current = content;
  versionRef.current = version;

  const updateHistoryState = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const pushUndoSnapshot = useCallback((prevText) => {
    if (prevText === undefined || prevText === null) return;
    const stack = undoStackRef.current;
    if (stack.length === 0 || stack[stack.length - 1] !== prevText) {
      stack.push(prevText);
      if (stack.length > 50) stack.shift(); // Limit history depth
      redoStackRef.current = [];
      updateHistoryState();
    }
  }, [updateHistoryState]);

  // Inspect current line under cursor to synchronize toolbar states
  const syncActiveFormatting = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = contentRef.current || '';
    const cursor = textarea.selectionStart || 0;
    const lineStart = text.lastIndexOf('\n', cursor - 1) + 1;
    const lineEnd = text.indexOf('\n', cursor);
    const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);

    let heading = 'normal';
    if (/^\s*####\s+/.test(line)) heading = 'h3';
    else if (/^\s*###\s+/.test(line)) heading = 'h2';
    else if (/^\s*##\s+/.test(line)) heading = 'h1';
    else if (/^\s*#\s+/.test(line)) heading = 'title';

    const isNumbered = /^\s*\d+\.\s+/.test(line);
    const isBulleted = /^\s*[-*]\s+/.test(line);

    setActiveFormatting({ heading, isNumbered, isBulleted });
  }, []);

  // Safe client-side operation dispatcher with OT buffer queue
  const dispatchLocalOps = useCallback((ops) => {
    if (!ops || ops.length === 0) return;
    setSaveStatus('saving');

    // Adjust stored collaborator cursors against optimistic local edits
    if (collaboratorsRef.current.length > 0) {
      const updated = collaboratorsRef.current.map(c => {
        let cur = c.cursor;
        let selStart = c.selectionStart;
        let selEnd = c.selectionEnd;
        for (const op of ops) {
          cur = transformCursor(cur, op);
          selStart = transformCursor(selStart, op);
          selEnd = transformCursor(selEnd, op);
        }
        return { ...c, cursor: cur, selectionStart: selStart, selectionEnd: selEnd };
      });
      collaboratorsRef.current = updated;
      setCollaborators(updated);
    }

    if (pendingOpRef.current === null) {
      pendingOpRef.current = { ops, baseVersion: versionRef.current };
      socketService.sendOperation(docId, ops, versionRef.current);
    } else {
      bufferOpsRef.current.push(...ops);
    }
  }, [docId]);

  // 1. Initial REST Load & Metadata Fetch
  const loadDocumentData = useCallback(async () => {
    if (!docId) return;
    setLoading(true);
    setError(null);

    try {
      const doc = await api.getDocument(docId);
      setTitle(doc.title || 'Untitled Document');
      const sanitized = cleanMalformedContent(doc.content || '');
      setContent(sanitized);
      contentRef.current = sanitized;
      setVersion(doc.version || 0);
      versionRef.current = doc.version || 0;
      undoStackRef.current = [];
      redoStackRef.current = [];
      pendingOpRef.current = null;
      bufferOpsRef.current = [];
      updateHistoryState();
      setLoading(false);
    } catch (err) {
      console.warn('[useDocument] REST fetch notice:', err.message);
      const msg = err.isNetworkError
        ? 'Could not connect to backend server. Please verify the server is running.'
        : (err.message || 'Failed to load document');
      setError(msg);
      setLoading(false);
    }
  }, [docId, updateHistoryState]);

  useEffect(() => {
    loadDocumentData();

    return () => {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    };
  }, [loadDocumentData]);

  // 2. Socket.IO Room Joining & Event Subscriptions
  // Note: Event listeners are attached BEFORE joinDocument to prevent missed events on fast replies
  useEffect(() => {
    if (!docId) return;

    socketService.connect();

    // Initial load-doc event from server
    const unsubLoadDoc = socketService.on('load-doc', (data) => {
      console.log(`[useDocument] Received load-doc for ${docId}`);
      let loadedContent = '';
      let loadedVersion = 0;
      let loadedTitle = null;

      if (typeof data === 'string') {
        loadedContent = data;
      } else if (data && typeof data === 'object') {
        loadedContent = data.content ?? '';
        loadedVersion = typeof data.version === 'number' ? data.version : 0;
        loadedTitle = data.title;
      }

      const sanitized = cleanMalformedContent(loadedContent);
      setContent(sanitized);
      contentRef.current = sanitized;
      setVersion(loadedVersion);
      versionRef.current = loadedVersion;
      pendingOpRef.current = null;
      bufferOpsRef.current = [];
      if (loadedTitle) setTitle(loadedTitle);
      setLoading(false);
    });

    // Remote operations from collaborators reconciled with client OT buffer
    const unsubOp = socketService.on('operation', ({ ops, version: newVersion }) => {
      const textarea = textareaRef.current;
      let cursorPos = textarea ? textarea.selectionStart : 0;
      let selectionEnd = textarea ? textarea.selectionEnd : 0;

      applyingRemoteOpRef.current = true;

      let transformedRemoteOps = Array.isArray(ops) ? [...ops] : [];

      // Reconcile incoming remote ops against pending in-flight local ops
      if (pendingOpRef.current && pendingOpRef.current.ops) {
        const nextPendingOps = [];
        for (let inOp of pendingOpRef.current.ops) {
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
          if (curIn) nextPendingOps.push(curIn);
        }
        pendingOpRef.current.ops = nextPendingOps;
      }

      // Reconcile incoming remote ops against buffered local ops
      if (bufferOpsRef.current.length > 0) {
        const nextBufferOps = [];
        for (let bufOp of bufferOpsRef.current) {
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
          if (curBuf) nextBufferOps.push(curBuf);
        }
        bufferOpsRef.current = nextBufferOps;
      }

      // Apply the transformed remote ops to the local document view
      let currentText = contentRef.current;
      for (const op of transformedRemoteOps) {
        cursorPos = transformCursor(cursorPos, op);
        selectionEnd = transformCursor(selectionEnd, op);
        currentText = applyOperation(currentText, op);
      }

      // Adjust remote collaborator cursors against transformed remote operations
      if (collaboratorsRef.current.length > 0) {
        const updated = collaboratorsRef.current.map(c => {
          let cur = c.cursor;
          let selStart = c.selectionStart;
          let selEnd = c.selectionEnd;
          for (const op of transformedRemoteOps) {
            cur = transformCursor(cur, op);
            selStart = transformCursor(selStart, op);
            selEnd = transformCursor(selEnd, op);
          }
          return { ...c, cursor: cur, selectionStart: selStart, selectionEnd: selEnd };
        });
        collaboratorsRef.current = updated;
        setCollaborators(updated);
      }

      contentRef.current = currentText;
      setContent(currentText);
      setVersion(newVersion);
      versionRef.current = newVersion;
      applyingRemoteOpRef.current = false;

      // Restore transformed cursor position
      if (textarea) {
        requestAnimationFrame(() => {
          textarea.selectionStart = cursorPos;
          textarea.selectionEnd = selectionEnd;
          syncActiveFormatting();
        });
      }
    });

    // Operation acknowledgment for sender
    const unsubAck = socketService.on('operation-ack', ({ version: ackVersion }) => {
      setVersion(ackVersion);
      versionRef.current = ackVersion;
      pendingOpRef.current = null;

      // If buffered operations accumulated, send next batch
      if (bufferOpsRef.current.length > 0) {
        const nextOps = [...bufferOpsRef.current];
        bufferOpsRef.current = [];
        pendingOpRef.current = { ops: nextOps, baseVersion: ackVersion };
        socketService.sendOperation(docId, nextOps, ackVersion);
        setSaveStatus('saving');
      } else {
        setSaveStatus('saved');
      }
    });

    // Remote title updates
    const unsubTitle = socketService.on('title-updated', ({ docId: updatedId, title: newTitle }) => {
      if (updatedId === docId) {
        setTitle(newTitle);
      }
    });

    // Collaborator presence: initial list
    const unsubColList = socketService.on('collaborators-list', (list) => {
      const myId = socketService.getSocketId();
      const others = (list || []).filter(c => c.socketId !== myId);
      collaboratorsRef.current = others;
      setCollaborators(others);
    });

    // Collaborator presence: new user joined
    const unsubColJoin = socketService.on('collaborator-joined', (col) => {
      const myId = socketService.getSocketId();
      if (!col || col.socketId === myId) return;
      const filtered = collaboratorsRef.current.filter(c => c.socketId !== col.socketId);
      const updated = [...filtered, col];
      collaboratorsRef.current = updated;
      setCollaborators(updated);
    });

    // Collaborator presence: user left
    const unsubColLeft = socketService.on('collaborator-left', ({ socketId }) => {
      const updated = collaboratorsRef.current.filter(c => c.socketId !== socketId);
      collaboratorsRef.current = updated;
      setCollaborators(updated);
    });

    // Remote cursor and selection updates
    const unsubCursor = socketService.on('cursor-update', (data) => {
      const myId = socketService.getSocketId();
      if (!data || data.socketId === myId) return;

      const idx = collaboratorsRef.current.findIndex(c => c.socketId === data.socketId);
      let updated;
      if (idx >= 0) {
        updated = [...collaboratorsRef.current];
        updated[idx] = { ...updated[idx], ...data };
      } else {
        updated = [...collaboratorsRef.current, data];
      }
      collaboratorsRef.current = updated;
      setCollaborators(updated);
    });

    // Subscribe to events BEFORE emitting join
    socketService.joinDocument(docId);

    return () => {
      socketService.leaveDocument(docId);
      unsubLoadDoc();
      unsubOp();
      unsubAck();
      unsubTitle();
      unsubColList();
      unsubColJoin();
      unsubColLeft();
      unsubCursor();
    };
  }, [docId, syncActiveFormatting]);

  // 3. Handle Local Typing
  const handleContentChange = useCallback((newText) => {
    if (applyingRemoteOpRef.current) return;

    const oldText = contentRef.current;
    if (oldText === newText) return;

    // Snapshot to undo stack on distinct edits
    if (!historyDebounceRef.current) {
      pushUndoSnapshot(oldText);
    }
    clearTimeout(historyDebounceRef.current);
    historyDebounceRef.current = setTimeout(() => {
      historyDebounceRef.current = null;
    }, 1000);

    const ops = diffText(oldText, newText);
    contentRef.current = newText;
    setContent(newText);

    if (ops.length > 0) {
      dispatchLocalOps(ops);
    }

    syncActiveFormatting();

    // Debounce Gemini AI suggestion request after pause in typing (800ms)
    clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      if (newText.trim().length > 0) {
        socketService.requestSuggestion(newText);
      }
    }, 800);
  }, [pushUndoSnapshot, dispatchLocalOps, syncActiveFormatting]);

  // 4. Undo and Redo Implementation
  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const currentText = contentRef.current;
    const targetText = undoStackRef.current.pop();

    redoStackRef.current.push(currentText);
    updateHistoryState();

    const ops = diffText(currentText, targetText);
    contentRef.current = targetText;
    setContent(targetText);

    if (ops.length > 0) {
      dispatchLocalOps(ops);
    }
    syncActiveFormatting();
  }, [updateHistoryState, dispatchLocalOps, syncActiveFormatting]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const currentText = contentRef.current;
    const targetText = redoStackRef.current.pop();

    undoStackRef.current.push(currentText);
    updateHistoryState();

    const ops = diffText(currentText, targetText);
    contentRef.current = targetText;
    setContent(targetText);

    if (ops.length > 0) {
      dispatchLocalOps(ops);
    }
    syncActiveFormatting();
  }, [updateHistoryState, dispatchLocalOps, syncActiveFormatting]);

  // 5. Smart List Toggle (Numbered & Bulleted)
  const handleToggleList = useCallback((listType) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentText = contentRef.current;
    const cursor = textarea.selectionStart;
    const lineStart = currentText.lastIndexOf('\n', cursor - 1) + 1;
    let lineEnd = currentText.indexOf('\n', cursor);
    if (lineEnd === -1) lineEnd = currentText.length;

    const line = currentText.slice(lineStart, lineEnd);
    let updatedLine = line;
    let cursorShift = 0;

    if (listType === 'numbered') {
      if (/^\s*\d+\.\s+/.test(line)) {
        // Toggle OFF
        updatedLine = line.replace(/^\s*\d+\.\s+/, '');
        cursorShift = updatedLine.length - line.length;
      } else if (/^\s*[-*]\s+/.test(line)) {
        // Switch from bullet to numbered
        updatedLine = line.replace(/^\s*[-*]\s+/, '1. ');
        cursorShift = updatedLine.length - line.length;
      } else {
        // Prepend numbered
        updatedLine = `1. ${line}`;
        cursorShift = 3;
      }
    } else if (listType === 'bulleted') {
      if (/^\s*[-*]\s+/.test(line)) {
        // Toggle OFF
        updatedLine = line.replace(/^\s*[-*]\s+/, '');
        cursorShift = updatedLine.length - line.length;
      } else if (/^\s*\d+\.\s+/.test(line)) {
        // Switch from numbered to bullet
        updatedLine = line.replace(/^\s*\d+\.\s+/, '- ');
        cursorShift = updatedLine.length - line.length;
      } else {
        // Prepend bullet
        updatedLine = `- ${line}`;
        cursorShift = 2;
      }
    }

    const newFullText = currentText.slice(0, lineStart) + updatedLine + currentText.slice(lineEnd);
    pushUndoSnapshot(currentText);
    handleContentChange(newFullText);

    requestAnimationFrame(() => {
      const newCursor = Math.max(lineStart, cursor + cursorShift);
      textarea.selectionStart = newCursor;
      textarea.selectionEnd = newCursor;
      textarea.focus();
      syncActiveFormatting();
    });
  }, [pushUndoSnapshot, handleContentChange, syncActiveFormatting]);

  // 6. Smart Heading Formatter
  const handleSetHeading = useCallback((level) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentText = contentRef.current;
    const cursor = textarea.selectionStart;
    const lineStart = currentText.lastIndexOf('\n', cursor - 1) + 1;
    let lineEnd = currentText.indexOf('\n', cursor);
    if (lineEnd === -1) lineEnd = currentText.length;

    const line = currentText.slice(lineStart, lineEnd);
    // Strip any existing heading markers
    const bareLine = line.replace(/^\s*#+\s*/, '');

    let prefix = '';
    if (level === 'title') prefix = '# ';
    else if (level === 'h1') prefix = '## ';
    else if (level === 'h2') prefix = '### ';
    else if (level === 'h3') prefix = '#### ';

    const updatedLine = `${prefix}${bareLine}`;
    const cursorShift = updatedLine.length - line.length;

    const newFullText = currentText.slice(0, lineStart) + updatedLine + currentText.slice(lineEnd);
    pushUndoSnapshot(currentText);
    handleContentChange(newFullText);

    requestAnimationFrame(() => {
      const newCursor = Math.max(lineStart, cursor + cursorShift);
      textarea.selectionStart = newCursor;
      textarea.selectionEnd = newCursor;
      textarea.focus();
      syncActiveFormatting();
    });
  }, [pushUndoSnapshot, handleContentChange, syncActiveFormatting]);

  // 7. Handle Keyboard Events (Enter key in lists, Tab indent, Shortcuts)
  const handleEditorKeyDown = useCallback((e) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Undo / Redo Shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }

    // Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      const currentText = contentRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newText = currentText.slice(0, start) + '    ' + currentText.slice(end);
      handleContentChange(newText);
      requestAnimationFrame(() => {
        textarea.selectionStart = start + 4;
        textarea.selectionEnd = start + 4;
      });
      return;
    }

    // Enter key auto-list continuation
    if (e.key === 'Enter') {
      const currentText = contentRef.current;
      const cursor = textarea.selectionStart;
      const lineStart = currentText.lastIndexOf('\n', cursor - 1) + 1;
      const currentLine = currentText.slice(lineStart, cursor);

      // 1) Empty numbered item -> exit list
      const emptyNumMatch = currentLine.match(/^(\s*)(\d+)\.\s*$/);
      if (emptyNumMatch) {
        e.preventDefault();
        const newText = currentText.slice(0, lineStart) + currentText.slice(cursor);
        handleContentChange(newText);
        requestAnimationFrame(() => {
          textarea.selectionStart = lineStart;
          textarea.selectionEnd = lineStart;
        });
        return;
      }

      // 2) Active numbered item -> continue next number
      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.+)$/);
      if (numMatch) {
        e.preventDefault();
        const nextNum = parseInt(numMatch[2], 10) + 1;
        const prefix = `\n${numMatch[1]}${nextNum}. `;
        const newText = currentText.slice(0, cursor) + prefix + currentText.slice(cursor);
        handleContentChange(newText);
        requestAnimationFrame(() => {
          textarea.selectionStart = cursor + prefix.length;
          textarea.selectionEnd = cursor + prefix.length;
        });
        return;
      }

      // 3) Empty bullet item -> exit list
      const emptyBulletMatch = currentLine.match(/^(\s*)[-*]\s*$/);
      if (emptyBulletMatch) {
        e.preventDefault();
        const newText = currentText.slice(0, lineStart) + currentText.slice(cursor);
        handleContentChange(newText);
        requestAnimationFrame(() => {
          textarea.selectionStart = lineStart;
          textarea.selectionEnd = lineStart;
        });
        return;
      }

      // 4) Active bullet item -> continue bullet
      const bulletMatch = currentLine.match(/^(\s*)([-*])\s+(.+)$/);
      if (bulletMatch) {
        e.preventDefault();
        const prefix = `\n${bulletMatch[1]}- `;
        const newText = currentText.slice(0, cursor) + prefix + currentText.slice(cursor);
        handleContentChange(newText);
        requestAnimationFrame(() => {
          textarea.selectionStart = cursor + prefix.length;
          textarea.selectionEnd = cursor + prefix.length;
        });
        return;
      }
    }
  }, [undo, redo, handleContentChange]);

  // 8. Handle Title Changes
  const handleTitleChange = useCallback((newTitle) => {
    setTitle(newTitle);
    setSaveStatus('saving');

    clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(async () => {
      try {
        await api.updateDocumentTitle(docId, newTitle);
        socketService.updateTitle(docId, newTitle);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to update title:', err);
      }
    }, 600);
  }, [docId]);

  // 9. Apply AI suggestions or conflict merges
  const applyFullText = useCallback((newFullText) => {
    const oldText = contentRef.current;
    pushUndoSnapshot(oldText);
    const ops = diffText(oldText, newFullText);

    contentRef.current = newFullText;
    setContent(newFullText);

    if (ops.length > 0) {
      dispatchLocalOps(ops);
    }
  }, [pushUndoSnapshot, dispatchLocalOps]);

  // 10. Real-time cursor & selection change handler
  const handleCursorActivity = useCallback(() => {
    syncActiveFormatting();
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;

    clearTimeout(cursorThrottleRef.current);
    cursorThrottleRef.current = setTimeout(() => {
      socketService.sendCursorUpdate(docId, start, start, end);
    }, 40);
  }, [docId, syncActiveFormatting]);

  return {
    content,
    title,
    version,
    saveStatus,
    loading,
    error,
    collaborators,
    retry: loadDocumentData,
    textareaRef,
    handleContentChange,
    handleTitleChange,
    handleCursorActivity,
    applyFullText,
    undo,
    redo,
    canUndo,
    canRedo,
    activeFormatting,
    syncActiveFormatting,
    handleToggleList,
    handleSetHeading,
    handleEditorKeyDown,
  };
}
