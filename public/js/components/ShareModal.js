// Professional Share Dialog Component with Transparent Access Model

import { store } from '../state.js';
import { ICONS } from '../icons.js';

export class ShareModal {
    constructor(container) {
        this.container = container;
        this.copied = false;
    }

    render() {
        const isOpen = store.get('activeModal') === 'share';
        if (!isOpen) {
            this.container.innerHTML = '';
            return;
        }

        const docId = store.get('currentDocId');
        const docTitle = store.get('currentDocTitle') || 'Untitled Document';
        const shareUrl = `${window.location.origin}${window.location.pathname}#/doc/${docId}`;

        this.container.innerHTML = `
            <div class="modal-backdrop" id="share-modal-backdrop">
                <div class="modal-box">
                    <div class="modal-header">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div class="brand-icon" style="width:28px;height:28px;">${ICONS.share}</div>
                            <h3 class="modal-title">Share "${this._escapeHtml(docTitle)}"</h3>
                        </div>
                        <button class="btn-icon" id="share-close-btn">${ICONS.close}</button>
                    </div>

                    <div class="modal-body">
                        <div>
                            <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">
                                DIRECT COLLABORATION LINK
                            </label>
                            <div class="share-link-wrapper">
                                <input type="text" class="share-link-input" id="share-link-input" value="${shareUrl}" readonly />
                                <button class="btn btn-primary btn-sm" id="share-copy-btn">
                                    ${this.copied ? `${ICONS.check} <span>Copied!</span>` : `${ICONS.copy} <span>Copy Link</span>`}
                                </button>
                            </div>
                        </div>

                        <!-- Honest Access Model Disclosure -->
                        <div class="info-note">
                            <strong>Access Model Notice:</strong> CollabAI currently operates on a shared document room identifier model. Any collaborator with a valid session who possesses this document link can view and concurrently edit. Fine-grained ACLs and invitation-only restrictions are slated for upcoming releases.
                        </div>

                        <div>
                            <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">
                                ACTIVE PROTOCOL
                            </div>
                            <div style="font-size:13px;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                                <span class="badge badge-live"><span class="dot"></span> Operational Transformation</span>
                                <span>• WebSocket sync over Socket.IO</span>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="share-done-btn">Done</button>
                    </div>
                </div>
            </div>
        `;

        this._attachEvents(shareUrl);
    }

    _attachEvents(shareUrl) {
        const backdrop = this.container.querySelector('#share-modal-backdrop');
        const closeBtn = this.container.querySelector('#share-close-btn');
        const doneBtn = this.container.querySelector('#share-done-btn');
        const copyBtn = this.container.querySelector('#share-copy-btn');
        const input = this.container.querySelector('#share-link-input');

        const closeModal = () => {
            store.set('activeModal', null);
            this.copied = false;
            this.render();
        };

        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) closeModal();
            });
        }
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (doneBtn) doneBtn.addEventListener('click', closeModal);

        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    this.copied = true;
                    this.render();
                    setTimeout(() => {
                        this.copied = false;
                        this.render();
                    }, 2500);
                } catch (err) {
                    if (input) {
                        input.select();
                        document.execCommand('copy');
                        this.copied = true;
                        this.render();
                    }
                }
            });
        }
    }

    _escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }
}
