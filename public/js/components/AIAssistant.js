// Google Gemini AI Writing Assistant Drawer Component

import { store } from '../state.js';
import { socketService } from '../services/socket.js';
import { ICONS } from '../icons.js';

export class AIAssistant {
    constructor(container, editorInstance) {
        this.container = container;
        this.editor = editorInstance;
        this.currentSuggestion = '';
        this.isStreaming = false;
        this.errorMessage = null;
        this.cleanups = [];
    }

    mount() {
        this._attachSocketListeners();
        this.render();

        const unSub = store.subscribe('isAiDrawerOpen', () => this.render());
        this.cleanups.push(unSub);
    }

    unmount() {
        for (const cleanup of this.cleanups) cleanup();
        this.cleanups = [];
    }

    _attachSocketListeners() {
        // Incoming streaming chunks
        const unChunk = socketService.on('suggestion-chunk', (chunk) => {
            this.isStreaming = true;
            this.currentSuggestion += chunk;
            this.errorMessage = null;
            this.render();
            this._scrollToBottom();
        });

        // Streaming complete
        const unDone = socketService.on('suggestion-done', () => {
            this.isStreaming = false;
            this.render();
        });

        // Error handler
        const unErr = socketService.on('suggestion-error', ({ message }) => {
            this.isStreaming = false;
            this.errorMessage = message || 'AI Suggestion failed';
            this.render();
        });

        this.cleanups.push(unChunk, unDone, unErr);
    }

    render() {
        const isOpen = store.get('isAiDrawerOpen');
        if (!isOpen) {
            this.container.innerHTML = '';
            return;
        }

        this.container.innerHTML = `
            <aside class="ai-drawer" aria-label="Gemini AI Assistant">
                <div class="ai-header">
                    <div class="ai-brand">
                        <span style="color:var(--color-accent-purple);">${ICONS.sparkle}</span>
                        <span>Gemini Assistant</span>
                        <span class="ai-badge">2.0 Flash</span>
                    </div>
                    <button class="btn-icon" id="ai-close-btn" title="Close AI Panel">${ICONS.close}</button>
                </div>

                <div class="ai-content">
                    <!-- Quick action prompts -->
                    <div class="ai-prompts">
                        <button class="ai-prompt-btn" id="ai-btn-typos">
                            <span style="color:var(--color-primary);">${ICONS.check}</span>
                            <span>Fix Typos & Grammar</span>
                        </button>
                        <button class="ai-prompt-btn" id="ai-btn-refine">
                            <span style="color:var(--color-accent-purple);">${ICONS.sparkle}</span>
                            <span>Refine Clarity & Tone</span>
                        </button>
                    </div>

                    <!-- Streaming / Generated Suggestion Box -->
                    ${this.currentSuggestion || this.isStreaming ? `
                        <div class="ai-suggestion-box ${this.isStreaming ? 'streaming' : ''}">
                            <div class="suggestion-header">
                                <span>${this.isStreaming ? 'Generating improvement...' : 'AI Suggestion'}</span>
                                ${this.isStreaming ? '<span class="ai-badge">Streaming</span>' : ''}
                            </div>
                            <div class="suggestion-text" id="ai-suggestion-text">
                                ${this._escapeHtml(this.currentSuggestion)}${this.isStreaming ? '<span class="ai-cursor"></span>' : ''}
                            </div>
                            <div class="suggestion-actions">
                                <button class="btn btn-primary btn-sm" id="ai-accept-btn" ${this.isStreaming ? 'disabled' : ''}>
                                    ${ICONS.check}
                                    <span>Apply to Document</span>
                                </button>
                                <button class="btn btn-secondary btn-sm" id="ai-dismiss-btn">
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    ` : `
                        <div style="font-size:13px;color:var(--text-muted);text-align:center;padding:24px 12px;background:var(--surface-bg);border-radius:var(--radius-md);border:1px dashed var(--border-color);">
                            <p style="margin-bottom:8px;">💡 <strong>Proactive Writing Assistant</strong></p>
                            <p>Type into the document or click an action above. Gemini automatically analyzes text after a typing pause and offers non-intrusive improvements.</p>
                        </div>
                    `}

                    <!-- Error Alert -->
                    ${this.errorMessage ? `
                        <div style="font-size:12px;color:#991b1b;background:#fef2f2;border:1px solid #fecaca;border-radius:var(--radius-sm);padding:10px 12px;line-height:1.5;">
                            <strong>Note:</strong> ${this._escapeHtml(this.errorMessage)}
                        </div>
                    ` : ''}
                </div>
            </aside>
        `;

        this._attachEvents();
    }

    _attachEvents() {
        const closeBtn = this.container.querySelector('#ai-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => store.set('isAiDrawerOpen', false));
        }

        const typosBtn = this.container.querySelector('#ai-btn-typos');
        if (typosBtn) {
            typosBtn.addEventListener('click', () => this._requestTextSuggestion());
        }

        const refineBtn = this.container.querySelector('#ai-btn-refine');
        if (refineBtn) {
            refineBtn.addEventListener('click', () => this._requestTextSuggestion());
        }

        const acceptBtn = this.container.querySelector('#ai-accept-btn');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                if (this.currentSuggestion && this.editor) {
                    this.editor.applyAiSuggestion(this.currentSuggestion);
                    this.currentSuggestion = '';
                    this.render();
                }
            });
        }

        const dismissBtn = this.container.querySelector('#ai-dismiss-btn');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                this.currentSuggestion = '';
                this.errorMessage = null;
                this.render();
            });
        }
    }

    _requestTextSuggestion() {
        const canvas = document.querySelector('#editor-canvas');
        if (canvas && canvas.value.trim().length > 0) {
            this.currentSuggestion = '';
            this.isStreaming = true;
            this.errorMessage = null;
            this.render();
            socketService.requestSuggestion(canvas.value);
        } else {
            this.errorMessage = 'Document is empty. Type some content first.';
            this.render();
        }
    }

    _scrollToBottom() {
        const box = this.container.querySelector('#ai-suggestion-text');
        if (box) box.scrollTop = box.scrollHeight;
    }

    _escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }
}
