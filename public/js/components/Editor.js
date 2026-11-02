// Main Collaborative Document Editor Component

import { store } from '../state.js';
import { socketService } from '../services/socket.js';
import { api } from '../services/api.js';
import { diffText, applyOperation, transformCursor } from '../services/ot.js';
import { ICONS } from '../icons.js';

export class Editor {
    constructor(container) {
        this.container = container;
        this.docId = null;
        this.previousValue = '';
        this.docVersion = 0;
        this.applyingRemoteOp = false;
        this.typingDebounce = null;
        this.cleanups = [];
    }

    async mount(docId) {
        this.docId = docId;
        store.set('currentDocId', docId);
        store.set('currentView', 'editor');

        this.render();

        // 1. Fetch metadata & content via REST
        try {
            const docData = await api.getDocument(docId);
            store.set('currentDocTitle', docData.title || 'Untitled Document');
            this.docVersion = docData.version || 0;
            const canvas = this.container.querySelector('#editor-canvas');
            if (canvas && docData.content) {
                canvas.innerHTML = docData.content;
                this.previousValue = docData.content;
                this._updateCounters();
            }
        } catch (err) {
            console.warn('[Editor] REST initial load note:', err.message);
        }

        // 2. Connect Socket and join room
        await socketService.connect();
        socketService.joinDocument(docId);

        // 3. Attach Socket Event Listeners
        this._attachSocketListeners();
    }

    unmount() {
        for (const cleanup of this.cleanups) {
            cleanup();
        }
        this.cleanups = [];
        if (this.typingDebounce) clearTimeout(this.typingDebounce);
    }

    render() {
        this.container.innerHTML = `
            <div class="editor-layout">
                <!-- Formatting Toolbar (Google Docs Authentic Bar) -->
                <div class="editor-toolbar" role="toolbar" aria-label="Formatting Toolbar">
                    <!-- Undo / Redo -->
                    <div class="toolbar-group">
                        <button class="tool-btn" id="tool-undo" title="Undo (Ctrl+Z)">${ICONS.undo}</button>
                        <button class="tool-btn" id="tool-redo" title="Redo (Ctrl+Y)">${ICONS.redo}</button>
                    </div>

                    <div class="toolbar-divider"></div>

                    <!-- Paragraph Style Dropdown -->
                    <div class="toolbar-group">
                        <select class="tool-select" id="tool-heading" title="Paragraph Styles">
                            <option value="normal">Normal text</option>
                            <option value="title">Title</option>
                            <option value="h1">Heading 1</option>
                            <option value="h2">Heading 2</option>
                            <option value="h3">Heading 3</option>
                        </select>
                    </div>

                    <div class="toolbar-divider"></div>

                    <!-- Font Family Dropdown -->
                    <div class="toolbar-group">
                        <select class="tool-select" id="tool-font" title="Font Family">
                            <option value="Inter, sans-serif">Inter</option>
                            <option value="Arial, sans-serif">Arial</option>
                            <option value="'Roboto', sans-serif">Roboto</option>
                            <option value="'Georgia', serif">Georgia</option>
                            <option value="'Fira Code', monospace">Monospace</option>
                        </select>
                    </div>

                    <div class="toolbar-divider"></div>

                    <!-- Text Styling -->
                    <div class="toolbar-group">
                        <button class="tool-btn" id="tool-bold" title="Bold (Ctrl+B)">${ICONS.bold}</button>
                        <button class="tool-btn" id="tool-italic" title="Italic (Ctrl+I)">${ICONS.italic}</button>
                        <button class="tool-btn" id="tool-underline" title="Underline (Ctrl+U)">${ICONS.underline}</button>
                        <button class="tool-btn" id="tool-strike" title="Strikethrough">${ICONS.strike}</button>
                    </div>

                    <div class="toolbar-divider"></div>

                    <!-- Alignment -->
                    <div class="toolbar-group">
                        <button class="tool-btn active" id="tool-align-left" title="Align Left">${ICONS.alignLeft}</button>
                        <button class="tool-btn" id="tool-align-center" title="Align Center">${ICONS.alignCenter}</button>
                        <button class="tool-btn" id="tool-align-right" title="Align Right">${ICONS.alignRight}</button>
                    </div>

                    <div class="toolbar-divider"></div>

                    <!-- Lists -->
                    <div class="toolbar-group">
                        <button class="tool-btn" id="tool-bullet-list" title="Bulleted List">${ICONS.bulletList}</button>
                        <button class="tool-btn" id="tool-number-list" title="Numbered List">${ICONS.numberList}</button>
                    </div>

                    <div class="toolbar-divider"></div>

                    <!-- AI Writing Trigger -->
                    <div class="toolbar-group">
                        <button class="btn btn-secondary btn-sm" id="tool-ai-prompt" title="Request Gemini Typo & Style Check">
                            ${ICONS.sparkle}
                            <span>AI Check</span>
                        </button>
                    </div>
                </div>

                <!-- Main Editor Workspace & Document Canvas -->
                <div class="editor-workspace">
                    <div class="editor-scroll-area" id="editor-scroll-area">
                        <!-- Centered Document Page -->
                        <div class="document-page" id="document-page">
                            <div 
                                class="document-canvas" 
                                id="editor-canvas" 
                                contenteditable="true"
                                spellcheck="true"
                                data-placeholder="Start typing your document... Every keystroke syncs in real time via Operational Transformation."
                            ></div>
                        </div>

                        <!-- Technical protocol badge -->
                        <div class="doc-protocol-banner">
                            <span>Operational Transformation:</span>
                            <strong>Multi-Character Diff Engine Active</strong>
                            <span>•</span>
                            <span id="version-display">v${this.docVersion}</span>
                        </div>
                    </div>

                    <!-- AI Assistant Drawer Container -->
                    <div id="ai-drawer-container"></div>
                </div>

                <!-- Word & Char Count Floating Bar -->
                <div class="editor-status-bar">
                    <span id="word-count">0 words</span>
                    <span>•</span>
                    <span id="char-count">0 characters</span>
                </div>
            </div>
        `;

        this._attachCanvasListeners();
        this._attachToolbarListeners();
    }

    _attachSocketListeners() {
        const canvas = this.container.querySelector('#editor-canvas');

        // 1. Initial Document Loading
        const unLoadDoc = socketService.on('load-doc', (data) => {
            console.log('[Editor] Received load-doc from server');
            let content = '';
            let version = 0;
            if (typeof data === 'string') {
                content = data;
            } else if (data && typeof data === 'object') {
                content = data.content ?? '';
                if (typeof data.version === 'number') version = data.version;
                if (data.title) store.set('currentDocTitle', data.title);
            }
            if (canvas) {
                canvas.innerHTML = content;
                this.previousValue = content;
                this.docVersion = version;
                this._updateCounters();
                this._updateVersionBadge();
                this._updateActiveToolbarStates();
            }
        });

        // 2. Incoming Remote Operations
        const unOp = socketService.on('operation', ({ ops, version }) => {
            if (!canvas) return;

            const savedSel = this._saveSelection(canvas);
            this.applyingRemoteOp = true;

            let text = canvas.innerHTML;
            for (const op of ops) {
                text = applyOperation(text, op);
            }

            canvas.innerHTML = text;
            this.previousValue = text;
            this.docVersion = version;
            this.applyingRemoteOp = false;

            if (savedSel) {
                this._restoreSelection(canvas, savedSel);
            }
            this._updateCounters();
            this._updateVersionBadge();
            this._updateActiveToolbarStates();
        });

        // 3. Operation Acknowledgment
        const unAck = socketService.on('operation-ack', ({ version }) => {
            this.docVersion = version;
            store.set('saveStatus', 'saved');
            this._updateVersionBadge();
        });

        // 4. Remote Title Update
        const unTitle = socketService.on('title-updated', ({ docId, title }) => {
            if (docId === this.docId) {
                store.set('currentDocTitle', title);
            }
        });

        this.cleanups.push(unLoadDoc, unOp, unAck, unTitle);
    }

    _attachCanvasListeners() {
        const canvas = this.container.querySelector('#editor-canvas');
        if (!canvas) return;

        // Provide compatibility properties for code that interacts with textarea-like interface
        try {
            Object.defineProperty(canvas, 'value', {
                get: () => canvas.innerHTML,
                set: (val) => { canvas.innerHTML = val; },
                configurable: true
            });

            Object.defineProperty(canvas, 'selectionStart', {
                get: () => {
                    const sel = this._saveSelection(canvas);
                    return sel ? sel.start : 0;
                },
                set: (pos) => {
                    this._setCaretPosition(canvas, pos, pos);
                },
                configurable: true
            });

            Object.defineProperty(canvas, 'selectionEnd', {
                get: () => {
                    const sel = this._saveSelection(canvas);
                    return sel ? sel.end : 0;
                },
                set: (pos) => {
                    const curStart = canvas.selectionStart;
                    this._setCaretPosition(canvas, curStart, pos);
                },
                configurable: true
            });
        } catch (e) {
            console.warn('[Editor] Property definition warning:', e.message);
        }

        // Focus canvas when clicking anywhere on the document page
        const docPage = this.container.querySelector('#document-page');
        if (docPage) {
            docPage.addEventListener('click', (e) => {
                if (e.target === docPage) {
                    canvas.focus();
                }
            });
        }

        // Handle typing: OT synchronization & AI suggestion trigger
        canvas.addEventListener('input', () => {
            this._handleCanvasInput();
        });

        // Sync toolbar buttons on mouse and keyboard selection changes
        canvas.addEventListener('mouseup', () => this._updateActiveToolbarStates());
        canvas.addEventListener('keyup', () => this._updateActiveToolbarStates());
        canvas.addEventListener('click', () => this._updateActiveToolbarStates());

        const handleSelChange = () => {
            const sel = window.getSelection();
            if (sel && sel.anchorNode && canvas.contains(sel.anchorNode)) {
                this._updateActiveToolbarStates();
            }
        };
        document.addEventListener('selectionchange', handleSelChange);
        this.cleanups.push(() => document.removeEventListener('selectionchange', handleSelChange));

        // Keyboard Shortcuts (Visual formatting toggles on selection)
        canvas.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                document.execCommand('insertText', false, '    ');
                this._handleCanvasInput();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                this.toggleBold();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                this.toggleItalic();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
                e.preventDefault();
                this.toggleUnderline();
            }
        });
    }

    _handleCanvasInput() {
        const canvas = this.container.querySelector('#editor-canvas');
        if (!canvas || this.applyingRemoteOp) return;

        const newValue = canvas.innerHTML;
        const ops = diffText(this.previousValue, newValue);
        this.previousValue = newValue;

        if (ops.length > 0) {
            store.set('saveStatus', 'saving');
            socketService.sendOperation(this.docId, ops, this.docVersion);
        }

        this._updateCounters();
        this._updateActiveToolbarStates();

        // Trigger debounced AI suggestion after typing pause (800ms)
        clearTimeout(this.typingDebounce);
        this.typingDebounce = setTimeout(() => {
            const textContent = canvas.innerText || canvas.textContent || '';
            if (textContent.trim().length > 0) {
                socketService.requestSuggestion(textContent);
            }
        }, 800);
    }

    // Formatting methods: native document.execCommand formats strictly the SELECTED text
    toggleBold() {
        const canvas = this.container.querySelector('#editor-canvas');
        if (!canvas) return;
        canvas.focus();
        document.execCommand('bold', false, null);
        this._handleCanvasInput();
    }

    toggleItalic() {
        const canvas = this.container.querySelector('#editor-canvas');
        if (!canvas) return;
        canvas.focus();
        document.execCommand('italic', false, null);
        this._handleCanvasInput();
    }

    toggleUnderline() {
        const canvas = this.container.querySelector('#editor-canvas');
        if (!canvas) return;
        canvas.focus();
        document.execCommand('underline', false, null);
        this._handleCanvasInput();
    }

    toggleStrike() {
        const canvas = this.container.querySelector('#editor-canvas');
        if (!canvas) return;
        canvas.focus();
        document.execCommand('strikeThrough', false, null);
        this._handleCanvasInput();
    }

    _updateActiveToolbarStates() {
        const btnBold = this.container.querySelector('#tool-bold');
        const btnItalic = this.container.querySelector('#tool-italic');
        const btnUnderline = this.container.querySelector('#tool-underline');
        const btnStrike = this.container.querySelector('#tool-strike');

        try {
            if (btnBold) btnBold.classList.toggle('active', document.queryCommandState('bold'));
            if (btnItalic) btnItalic.classList.toggle('active', document.queryCommandState('italic'));
            if (btnUnderline) btnUnderline.classList.toggle('active', document.queryCommandState('underline'));
            if (btnStrike) btnStrike.classList.toggle('active', document.queryCommandState('strikeThrough'));
        } catch (e) {
            // Ignore if queryCommandState is unavailable
        }
    }

    _attachToolbarListeners() {
        const canvas = this.container.querySelector('#editor-canvas');
        if (!canvas) return;

        // CRITICAL: Prevent toolbar buttons from stealing focus and losing selection in canvas
        const toolbarButtons = this.container.querySelectorAll('.editor-toolbar button');
        toolbarButtons.forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
            });
        });

        // Undo / Redo
        this._bindBtn('#tool-undo', () => {
            canvas.focus();
            document.execCommand('undo', false, null);
            this._handleCanvasInput();
        });
        this._bindBtn('#tool-redo', () => {
            canvas.focus();
            document.execCommand('redo', false, null);
            this._handleCanvasInput();
        });

        // Formatting Buttons: Native rich-text selection formatting
        this._bindBtn('#tool-bold', () => this.toggleBold());
        this._bindBtn('#tool-italic', () => this.toggleItalic());
        this._bindBtn('#tool-underline', () => this.toggleUnderline());
        this._bindBtn('#tool-strike', () => this.toggleStrike());

        // Headings Dropdown: Native formatBlock
        const headingSelect = this.container.querySelector('#tool-heading');
        if (headingSelect) {
            headingSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                const tagMap = {
                    title: '<h1>',
                    h1: '<h1>',
                    h2: '<h2>',
                    h3: '<h3>',
                    normal: '<p>'
                };
                canvas.focus();
                document.execCommand('formatBlock', false, tagMap[val] || '<p>');
                this._handleCanvasInput();
            });
        }

        // Font Family Selector
        const fontSelect = this.container.querySelector('#tool-font');
        if (fontSelect) {
            fontSelect.addEventListener('change', (e) => {
                canvas.focus();
                document.execCommand('fontName', false, e.target.value);
                this._handleCanvasInput();
            });
        }

        // Alignment Buttons
        const alignLeft = this.container.querySelector('#tool-align-left');
        const alignCenter = this.container.querySelector('#tool-align-center');
        const alignRight = this.container.querySelector('#tool-align-right');

        const setAlign = (cmd, activeBtn) => {
            canvas.focus();
            document.execCommand(cmd, false, null);
            [alignLeft, alignCenter, alignRight].forEach(b => b?.classList.remove('active'));
            activeBtn?.classList.add('active');
            this._handleCanvasInput();
        };

        alignLeft?.addEventListener('click', () => setAlign('justifyLeft', alignLeft));
        alignCenter?.addEventListener('click', () => setAlign('justifyCenter', alignCenter));
        alignRight?.addEventListener('click', () => setAlign('justifyRight', alignRight));

        // Lists
        this._bindBtn('#tool-bullet-list', () => {
            canvas.focus();
            document.execCommand('insertUnorderedList', false, null);
            this._handleCanvasInput();
        });
        this._bindBtn('#tool-number-list', () => {
            canvas.focus();
            document.execCommand('insertOrderedList', false, null);
            this._handleCanvasInput();
        });

        // AI Prompt Button
        this._bindBtn('#tool-ai-prompt', () => {
            store.set('isAiDrawerOpen', true);
            const textContent = canvas.innerText || canvas.textContent || '';
            if (textContent.trim().length > 0) {
                socketService.requestSuggestion(textContent);
            }
        });
    }

    _bindBtn(selector, action) {
        const btn = this.container.querySelector(selector);
        if (btn) btn.addEventListener('click', action);
    }

    _setCaretPosition(element, start, end) {
        if (!element) return;
        const sel = window.getSelection();
        if (!sel) return;

        let charIndex = 0;
        const range = document.createRange();
        range.setStart(element, 0);
        range.collapse(true);
        let nodeStack = [element];
        let node;
        let foundStart = false;
        let stop = false;

        while (!stop && (node = nodeStack.pop())) {
            if (node.nodeType === 3) {
                const nextCharIndex = charIndex + node.length;
                if (!foundStart && start >= charIndex && start <= nextCharIndex) {
                    range.setStart(node, start - charIndex);
                    foundStart = true;
                }
                if (foundStart && end >= charIndex && end <= nextCharIndex) {
                    range.setEnd(node, end - charIndex);
                    stop = true;
                }
                charIndex = nextCharIndex;
            } else {
                let i = node.childNodes.length;
                while (i--) {
                    nodeStack.push(node.childNodes[i]);
                }
            }
        }

        sel.removeAllRanges();
        sel.addRange(range);
    }

    _saveSelection(containerEl) {
        try {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return null;
            const range = sel.getRangeAt(0);
            if (!containerEl.contains(range.commonAncestorContainer)) return null;

            const preRange = range.cloneRange();
            preRange.selectNodeContents(containerEl);
            preRange.setEnd(range.startContainer, range.startOffset);
            const start = preRange.toString().length;

            return {
                start: start,
                end: start + range.toString().length
            };
        } catch (e) {
            return null;
        }
    }

    _restoreSelection(containerEl, savedSel) {
        if (!savedSel) return;
        this._setCaretPosition(containerEl, savedSel.start, savedSel.end);
    }

    _updateCounters() {
        const canvas = this.container.querySelector('#editor-canvas');
        if (!canvas) return;
        const text = canvas.innerText || canvas.textContent || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;

        const wordEl = this.container.querySelector('#word-count');
        const charEl = this.container.querySelector('#char-count');
        if (wordEl) wordEl.innerText = `${words} ${words === 1 ? 'word' : 'words'}`;
        if (charEl) charEl.innerText = `${chars} ${chars === 1 ? 'character' : 'characters'}`;
    }

    _updateVersionBadge() {
        const badge = this.container.querySelector('#version-display');
        if (badge) badge.innerText = `v${this.docVersion}`;
    }

    // External method called when AI suggestion is accepted
    applyAiSuggestion(newFullText) {
        const canvas = this.container.querySelector('#editor-canvas');
        if (!canvas) return;

        const oldValue = canvas.innerHTML;
        canvas.innerHTML = newFullText;
        const ops = diffText(oldValue, newFullText);
        if (ops.length > 0) {
            socketService.sendOperation(this.docId, ops, this.docVersion);
            store.set('saveStatus', 'saving');
        }
        this.previousValue = newFullText;
        this._updateCounters();
        this._updateActiveToolbarStates();
    }
}
