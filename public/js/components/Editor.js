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
        this.undoStack = [];
        this.redoStack = [];
        this.isBold = false;
        this.isItalic = false;
        this.isUnderline = false;
        this.isStrike = false;
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
                canvas.value = docData.content;
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
                            <textarea 
                                class="document-canvas" 
                                id="editor-canvas" 
                                placeholder="Start typing your document... Every keystroke syncs in real time via Operational Transformation."
                                spellcheck="true"
                            ></textarea>
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
                canvas.value = content;
                this.previousValue = content;
                this.docVersion = version;
                this._updateCounters();
                this._updateVersionBadge();
            }
        });

        // 2. Incoming Remote Operations
        const unOp = socketService.on('operation', ({ ops, version }) => {
            if (!canvas) return;

            let cursorPos = canvas.selectionStart;
            this.applyingRemoteOp = true;

            let text = canvas.value;
            for (const op of ops) {
                // Adjust local cursor offset using OT transformation
                cursorPos = transformCursor(cursorPos, op);
                text = applyOperation(text, op);
            }

            canvas.value = text;
            this.previousValue = text;
            this.docVersion = version;
            this.applyingRemoteOp = false;

            // Restore transformed cursor position
            canvas.selectionStart = canvas.selectionEnd = cursorPos;
            this._updateCounters();
            this._updateVersionBadge();
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

        // Focus canvas when clicking anywhere on the document page
        const docPage = this.container.querySelector('#document-page');
        if (docPage) {
            docPage.addEventListener('click', () => canvas.focus());
        }

        // Handle typing: OT synchronization & AI suggestion trigger
        canvas.addEventListener('input', () => {
            if (this.applyingRemoteOp) return;

            const newValue = canvas.value;
            const ops = diffText(this.previousValue, newValue);
            this.previousValue = newValue;

            if (ops.length > 0) {
                store.set('saveStatus', 'saving');
                socketService.sendOperation(this.docId, ops, this.docVersion);
            }

            this._updateCounters();

            // Trigger debounced AI suggestion after typing pause (800ms)
            clearTimeout(this.typingDebounce);
            this.typingDebounce = setTimeout(() => {
                if (canvas.value.trim().length > 0) {
                    socketService.requestSuggestion(canvas.value);
                }
            }, 800);
        });

        // Keyboard Shortcuts (Visual formatting toggles without inserting markdown markers)
        canvas.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this._insertTextAtCursor('    ');
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

    toggleBold() {
        this.isBold = !this.isBold;
        const canvas = this.container.querySelector('#editor-canvas');
        if (canvas) canvas.style.fontWeight = this.isBold ? 'bold' : 'normal';
        const btn = this.container.querySelector('#tool-bold');
        if (btn) btn.classList.toggle('active', this.isBold);
    }

    toggleItalic() {
        this.isItalic = !this.isItalic;
        const canvas = this.container.querySelector('#editor-canvas');
        if (canvas) canvas.style.fontStyle = this.isItalic ? 'italic' : 'normal';
        const btn = this.container.querySelector('#tool-italic');
        if (btn) btn.classList.toggle('active', this.isItalic);
    }

    toggleUnderline() {
        this.isUnderline = !this.isUnderline;
        this._updateTextDecoration();
        const btn = this.container.querySelector('#tool-underline');
        if (btn) btn.classList.toggle('active', this.isUnderline);
    }

    toggleStrike() {
        this.isStrike = !this.isStrike;
        this._updateTextDecoration();
        const btn = this.container.querySelector('#tool-strike');
        if (btn) btn.classList.toggle('active', this.isStrike);
    }

    _updateTextDecoration() {
        const canvas = this.container.querySelector('#editor-canvas');
        if (!canvas) return;
        const decs = [];
        if (this.isUnderline) decs.push('underline');
        if (this.isStrike) decs.push('line-through');
        canvas.style.textDecoration = decs.length > 0 ? decs.join(' ') : 'none';
    }

    _attachToolbarListeners() {
        const canvas = this.container.querySelector('#editor-canvas');
        if (!canvas) return;

        // Formatting Buttons: Visual styling toggles
        this._bindBtn('#tool-bold', () => this.toggleBold());
        this._bindBtn('#tool-italic', () => this.toggleItalic());
        this._bindBtn('#tool-underline', () => this.toggleUnderline());
        this._bindBtn('#tool-strike', () => this.toggleStrike());

        // Headings Dropdown: Visual typography scale
        const headingSelect = this.container.querySelector('#tool-heading');
        if (headingSelect) {
            headingSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                const sizeMap = {
                    title: { size: '28px', weight: '700' },
                    h1: { size: '24px', weight: '700' },
                    h2: { size: '20px', weight: '600' },
                    h3: { size: '17px', weight: '600' },
                    normal: { size: '15px', weight: this.isBold ? 'bold' : 'normal' }
                };
                if (sizeMap[val]) {
                    canvas.style.fontSize = sizeMap[val].size;
                    canvas.style.fontWeight = sizeMap[val].weight;
                }
            });
        }

        // Font Family Selector
        const fontSelect = this.container.querySelector('#tool-font');
        if (fontSelect) {
            fontSelect.addEventListener('change', (e) => {
                canvas.style.fontFamily = e.target.value;
            });
        }

        // Alignment Buttons (Visual page text alignment)
        const alignLeft = this.container.querySelector('#tool-align-left');
        const alignCenter = this.container.querySelector('#tool-align-center');
        const alignRight = this.container.querySelector('#tool-align-right');

        const setAlign = (align, activeBtn) => {
            canvas.style.textAlign = align;
            [alignLeft, alignCenter, alignRight].forEach(b => b?.classList.remove('active'));
            activeBtn?.classList.add('active');
        };

        alignLeft?.addEventListener('click', () => setAlign('left', alignLeft));
        alignCenter?.addEventListener('click', () => setAlign('center', alignCenter));
        alignRight?.addEventListener('click', () => setAlign('right', alignRight));

        // Lists
        this._bindBtn('#tool-bullet-list', () => this._prependLinePrefix('- '));
        this._bindBtn('#tool-number-list', () => this._prependLinePrefix('1. '));

        // AI Prompt Button
        this._bindBtn('#tool-ai-prompt', () => {
            store.set('isAiDrawerOpen', true);
            if (canvas.value.trim().length > 0) {
                socketService.requestSuggestion(canvas.value);
            }
        });
    }

    _bindBtn(selector, action) {
        const btn = this.container.querySelector(selector);
        if (btn) btn.addEventListener('click', action);
    }

    _wrapSelection(before, after) {
        const canvas = this.container.querySelector('#editor-canvas');
        if (!canvas) return;

        const start = canvas.selectionStart;
        const end = canvas.selectionEnd;
        const text = canvas.value;
        const selected = text.slice(start, end);

        const wrapped = `${before}${selected}${after}`;
        canvas.setRangeText(wrapped, start, end, 'select');
        canvas.dispatchEvent(new Event('input'));
    }

    _prependLinePrefix(prefix) {
        const canvas = this.container.querySelector('#editor-canvas');
        if (!canvas) return;

        const start = canvas.selectionStart;
        const text = canvas.value;
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;

        const newText = text.slice(0, lineStart) + prefix + text.slice(lineStart);
        canvas.value = newText;
        canvas.dispatchEvent(new Event('input'));
        canvas.focus();
    }

    _insertTextAtCursor(textToInsert) {
        const canvas = this.container.querySelector('#editor-canvas');
        if (!canvas) return;
        const start = canvas.selectionStart;
        const end = canvas.selectionEnd;
        canvas.setRangeText(textToInsert, start, end, 'end');
        canvas.dispatchEvent(new Event('input'));
    }

    _updateCounters() {
        const canvas = this.container.querySelector('#editor-canvas');
        if (!canvas) return;
        const text = canvas.value;
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

        const oldValue = canvas.value;
        canvas.value = newFullText;
        const ops = diffText(oldValue, newFullText);
        if (ops.length > 0) {
            socketService.sendOperation(this.docId, ops, this.docVersion);
            store.set('saveStatus', 'saving');
        }
        this.previousValue = newFullText;
        this._updateCounters();
    }
}
