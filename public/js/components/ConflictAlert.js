// Semantic Conflict Notification & Merge Mediator Component

import { socketService } from '../services/socket.js';
import { ICONS } from '../icons.js';
import { diffText } from '../services/ot.js';
import { store } from '../state.js';

export class ConflictAlert {
    constructor(container) {
        this.container = container;
        this.conflict = null; // { original, suggestion }
        this.cleanups = [];
    }

    mount() {
        const unConflict = socketService.on('conflict-suggestion', (data) => {
            console.log('[Conflict Mediator] Received conflict suggestion:', data);
            this.conflict = data;
            this.render();
        });
        this.cleanups.push(unConflict);
        this.render();
    }

    unmount() {
        for (const cleanup of this.cleanups) cleanup();
        this.cleanups = [];
    }

    render() {
        if (!this.conflict) {
            this.container.innerHTML = '';
            return;
        }

        this.container.innerHTML = `
            <div style="position:fixed;top:76px;right:24px;width:380px;z-index:900;">
                <div class="conflict-card">
                    <div class="conflict-card-header">
                        <span style="color:var(--color-accent-amber);">${ICONS.zap}</span>
                        <span>Concurrent Edit Collision Detected</span>
                    </div>

                    <div style="font-size:12px;color:var(--text-secondary);">
                        Multiple collaborators edited overlapping text concurrently. Gemini recommends this unified merge:
                    </div>

                    <div class="conflict-card-original">
                        <strong>Original collision:</strong> "${this._escapeHtml(this.conflict.original.trim())}"
                    </div>

                    <div class="conflict-card-suggested">
                        <strong>AI Suggested merge:</strong> ${this._escapeHtml(this.conflict.suggestion)}
                    </div>

                    <div class="conflict-actions">
                        <button class="btn btn-primary btn-sm" id="conflict-merge-btn">
                            ${ICONS.check}
                            <span>Apply Merge</span>
                        </button>
                        <button class="btn btn-secondary btn-sm" id="conflict-dismiss-btn">
                            Keep Current
                        </button>
                    </div>
                </div>
            </div>
        `;

        this._attachEvents();
    }

    _attachEvents() {
        const mergeBtn = this.container.querySelector('#conflict-merge-btn');
        const dismissBtn = this.container.querySelector('#conflict-dismiss-btn');

        if (mergeBtn) {
            mergeBtn.addEventListener('click', () => {
                const canvas = document.querySelector('#editor-canvas');
                if (canvas && this.conflict) {
                    const text = canvas.value;
                    const orig = this.conflict.original;
                    const replacement = this.conflict.suggestion;

                    // If original snippet exists in text, replace it and emit OT diff
                    if (text.includes(orig)) {
                        const newText = text.replace(orig, replacement);
                        canvas.value = newText;
                        canvas.dispatchEvent(new Event('input'));
                    }
                }
                this.conflict = null;
                this.render();
            });
        }

        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                this.conflict = null;
                this.render();
            });
        }
    }

    _escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }
}
