// Navigation Bar Component with Adaptive States

import { store } from '../state.js';
import { ICONS } from '../icons.js';
import { api } from '../services/api.js';
import { socketService } from '../services/socket.js';

export class Navbar {
    constructor(container) {
        this.container = container;
        this.unsubscribe = null;
    }

    mount() {
        this.unsubscribe = store.subscribe('*', () => this.render());
        this.render();
    }

    unmount() {
        if (this.unsubscribe) this.unsubscribe();
    }

    render() {
        const view = store.get('currentView');
        const user = store.get('user');
        const connectionStatus = store.get('connectionStatus');
        const saveStatus = store.get('saveStatus');
        const title = store.get('currentDocTitle') || 'Untitled Document';
        const isAiOpen = store.get('isAiDrawerOpen');

        if (view === 'editor') {
            this.container.innerHTML = `
                <div class="editor-topbar">
                    <div class="editor-title-group">
                        <a href="#/dashboard" class="brand" title="Return to Dashboard">
                            <div class="brand-icon">${ICONS.logo}</div>
                        </a>
                        <div class="doc-info">
                            <input 
                                type="text" 
                                class="doc-title-input" 
                                id="doc-title-input" 
                                value="${this._escapeHtml(title)}" 
                                spellcheck="false"
                                title="Click to rename document"
                            />
                            <div class="menu-bar">
                                <div class="menu-item" id="menu-file">
                                    File
                                    <div class="menu-dropdown">
                                        <div class="menu-action" id="menu-new-doc"><span>New Document</span><span class="shortcut">Ctrl+N</span></div>
                                        <div class="menu-action" id="menu-export-txt"><span>Export as Plain Text</span></div>
                                        <div class="menu-action" id="menu-export-md"><span>Export as Markdown</span></div>
                                        <div class="menu-divider"></div>
                                        <div class="menu-action" id="menu-print"><span>Print</span><span class="shortcut">Ctrl+P</span></div>
                                        <div class="menu-divider"></div>
                                        <div class="menu-action" id="menu-delete-doc"><span style="color:#ef4444;font-weight:500;">Delete Document</span></div>
                                    </div>
                                </div>
                                <div class="menu-item" id="menu-edit">
                                    Edit
                                    <div class="menu-dropdown">
                                        <div class="menu-action" id="menu-undo"><span>Undo</span><span class="shortcut">Ctrl+Z</span></div>
                                        <div class="menu-action" id="menu-redo"><span>Redo</span><span class="shortcut">Ctrl+Y</span></div>
                                    </div>
                                </div>
                                <div class="menu-item" id="menu-ai">
                                    AI Assist
                                    <div class="menu-dropdown">
                                        <div class="menu-action" id="menu-ai-typo"><span>Fix Typos & Grammar</span></div>
                                        <div class="menu-action" id="menu-ai-tone"><span>Polish & Refine</span></div>
                                    </div>
                                </div>
                                <div class="menu-item" id="menu-help">
                                    Help
                                    <div class="menu-dropdown">
                                        <div class="menu-action" id="menu-help-ot"><span>How OT Concurrency Works</span></div>
                                        <div class="menu-action" id="menu-help-shortcuts"><span>Keyboard Shortcuts</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="editor-status-group">
                        <div class="sync-status ${saveStatus}">
                            ${saveStatus === 'saving' ? `${ICONS.cloud} <span>Syncing...</span>` : `${ICONS.cloudCheck} <span>Saved</span>`}
                        </div>

                        <div class="badge ${connectionStatus === 'connected' ? 'badge-live' : 'badge-warning'}" title="WebSocket Connection: ${connectionStatus}">
                            <span class="dot"></span>
                            <span>${connectionStatus === 'connected' ? 'Live OT' : 'Reconnecting'}</span>
                        </div>

                        <button class="btn btn-secondary btn-sm" id="btn-share" title="Share document link">
                            ${ICONS.share}
                            <span>Share</span>
                        </button>

                        <button class="btn btn-secondary btn-sm" id="btn-delete-doc" title="Delete document" style="color:#ef4444;border-color:#fecaca;">
                            ${ICONS.trash}
                            <span>Delete</span>
                        </button>

                        <button class="btn ${isAiOpen ? 'btn-accent' : 'btn-secondary'} btn-sm" id="btn-ai-toggle" title="Toggle Google Gemini Assistant">
                            ${ICONS.sparkle}
                            <span>Gemini AI</span>
                        </button>

                        ${user ? `
                            <div class="avatar" style="background-color: ${user.color}" title="${user.name} (${user.id})">
                                ${user.name.charAt(0)}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            this._attachEditorListeners();
        } else {
            // Landing or Dashboard Navbar
            this.container.innerHTML = `
                <div class="app-navbar">
                    <a href="#/" class="brand">
                        <div class="brand-icon">${ICONS.logo}</div>
                        <span class="brand-text">CollabAI</span>
                        <span class="brand-badge">OT + Gemini</span>
                    </a>

                    ${view === 'landing' ? `
                        <ul class="nav-links">
                            <li><a href="#features" class="nav-link">Features</a></li>
                            <li><a href="#architecture" class="nav-link">Architecture</a></li>
                            <li><a href="#specs" class="nav-link">OT Protocol</a></li>
                        </ul>
                    ` : `
                        <div style="font-size: 14px; font-weight: 500; color: var(--text-secondary);">
                            Workspace Documents
                        </div>
                    `}

                    <div class="nav-actions">
                        ${user ? `
                            <a href="#/dashboard" class="btn btn-secondary btn-sm">Documents</a>
                            <div class="avatar" style="background-color: ${user.color}" title="${user.name}">
                                ${user.name.charAt(0)}
                            </div>
                            <button class="btn btn-ghost btn-sm" id="nav-logout" title="Sign out">Log out</button>
                        ` : `
                            <button class="btn btn-ghost btn-sm" id="nav-login">Sign In</button>
                            <a href="#/dashboard" class="btn btn-primary btn-sm">Start Writing</a>
                        `}
                    </div>
                </div>
            `;
            this._attachNavListeners();
        }
    }

    _attachNavListeners() {
        const loginBtn = this.container.querySelector('#nav-login');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => store.set('activeModal', 'auth'));
        }

        const logoutBtn = this.container.querySelector('#nav-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await api.logout();
                window.location.hash = '#/';
            });
        }
    }

    _attachEditorListeners() {
        // Document title editing with auto debounce and backend update
        const titleInput = this.container.querySelector('#doc-title-input');
        if (titleInput) {
            let debounceTimer;
            titleInput.addEventListener('input', (e) => {
                const newTitle = e.target.value.trim() || 'Untitled Document';
                store.set('currentDocTitle', newTitle);
                store.set('saveStatus', 'saving');

                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(async () => {
                    const docId = store.get('currentDocId');
                    if (docId) {
                        try {
                            await api.updateDocumentTitle(docId, newTitle);
                            socketService.updateTitle(docId, newTitle);
                            store.set('saveStatus', 'saved');
                        } catch (err) {
                            console.error('Failed to persist title:', err);
                        }
                    }
                }, 600);
            });
        }

        // Share button
        const shareBtn = this.container.querySelector('#btn-share');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => store.set('activeModal', 'share'));
        }

        // AI drawer toggle
        const aiToggle = this.container.querySelector('#btn-ai-toggle');
        if (aiToggle) {
            aiToggle.addEventListener('click', () => {
                store.set('isAiDrawerOpen', !store.get('isAiDrawerOpen'));
            });
        }

        // Menu items toggle
        const menuItems = this.container.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const wasActive = item.classList.contains('active');
                menuItems.forEach(i => i.classList.remove('active'));
                if (!wasActive) item.classList.add('active');
            });
        });

        document.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
        });

        // Menu actions
        const newDocAction = this.container.querySelector('#menu-new-doc');
        if (newDocAction) {
            newDocAction.addEventListener('click', () => store.set('activeModal', 'newDoc'));
        }

        const exportTxt = this.container.querySelector('#menu-export-txt');
        if (exportTxt) {
            exportTxt.addEventListener('click', () => this._exportDocument('text/plain', 'txt'));
        }

        const exportMd = this.container.querySelector('#menu-export-md');
        if (exportMd) {
            exportMd.addEventListener('click', () => this._exportDocument('text/markdown', 'md'));
        }

        const printBtn = this.container.querySelector('#menu-print');
        if (printBtn) {
            printBtn.addEventListener('click', () => window.print());
        }

        const aiTypoBtn = this.container.querySelector('#menu-ai-typo');
        if (aiTypoBtn) {
            aiTypoBtn.addEventListener('click', () => {
                store.set('isAiDrawerOpen', true);
                window.dispatchEvent(new CustomEvent('collabai:ai-request'));
            });
        }

        // Delete Document action & button
        const handleDeleteDoc = async () => {
            const docId = store.get('currentDocId');
            const title = store.get('currentDocTitle') || 'this document';
            if (!docId) return;

            const confirmed = window.confirm(`Are you sure you want to delete "${title}"?\n\nThis will permanently delete the document from the database.`);
            if (!confirmed) return;

            try {
                await api.deleteDocument(docId);
                window.location.hash = '#/dashboard';
            } catch (err) {
                alert(`Failed to delete document: ${err.message}`);
            }
        };

        const deleteDocBtn = this.container.querySelector('#btn-delete-doc');
        if (deleteDocBtn) deleteDocBtn.addEventListener('click', handleDeleteDoc);

        const deleteMenuAction = this.container.querySelector('#menu-delete-doc');
        if (deleteMenuAction) deleteMenuAction.addEventListener('click', handleDeleteDoc);
    }

    _exportDocument(mimeType, ext) {
        const title = store.get('currentDocTitle') || 'document';
        const canvas = document.querySelector('#editor-canvas');
        const content = canvas ? canvas.value : '';
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    }

    _escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }
}
