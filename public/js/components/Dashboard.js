// Document Dashboard Component - Google Docs / Drive inspired

import { store } from '../state.js';
import { api } from '../services/api.js';
import { ICONS } from '../icons.js';
import { CONFIG } from '../config.js';

export class Dashboard {
    constructor(container) {
        this.container = container;
        this.documents = [];
        this.searchQuery = '';
        this.isLoading = true;
        this.errorMsg = null;
    }

    async mount() {
        this.render();
        await this.loadDocuments();
    }

    unmount() {}

    async loadDocuments() {
        this.isLoading = true;
        this.errorMsg = null;
        this.render();

        try {
            this.documents = await api.getDocuments();
            store.set('documentsList', this.documents);
            this.isLoading = false;
            this.render();
        } catch (err) {
            console.error('Failed to load documents:', err);
            this.errorMsg = 'Could not load documents from server. Make sure the backend server is running.';
            this.isLoading = false;
            this.render();
        }
    }

    render() {
        const user = store.get('user');
        const filteredDocs = this.documents.filter(doc => 
            (doc.title || '').toLowerCase().includes(this.searchQuery.toLowerCase()) ||
            (doc.docId || '').toLowerCase().includes(this.searchQuery.toLowerCase())
        );

        this.container.innerHTML = `
            <div class="dashboard-container">
                <!-- Welcome Section -->
                <div class="dashboard-header">
                    <div class="dashboard-greeting">
                        <h1>Welcome back, ${user ? user.name : 'Writer'}</h1>
                        <p>Real-time collaborative workspaces synchronized with Operational Transformation.</p>
                    </div>
                    <button class="btn btn-primary" id="btn-create-doc">
                        ${ICONS.plus}
                        <span>New Blank Document</span>
                    </button>
                </div>

                <!-- Template Gallery -->
                <div class="template-section">
                    <div class="template-section-header">Start a new document</div>
                    <div class="templates-grid">
                        ${CONFIG.TEMPLATES.map(tmpl => `
                            <div class="template-card" data-template-id="${tmpl.id}">
                                <div class="template-thumbnail ${tmpl.id === 'blank' ? 'blank' : ''}">
                                    ${tmpl.id === 'blank' ? ICONS.plus : ICONS.logo}
                                </div>
                                <div class="template-info">
                                    <div class="template-name">${tmpl.name}</div>
                                    <div class="template-desc">${tmpl.description}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Documents Toolbar & Search -->
                <div class="docs-toolbar">
                    <div class="docs-search-wrapper">
                        <span class="docs-search-icon">${ICONS.search}</span>
                        <input 
                            type="text" 
                            id="dashboard-search-input" 
                            class="docs-search-input" 
                            placeholder="Search documents by title or ID..." 
                            value="${this._escapeHtml(this.searchQuery)}"
                        />
                    </div>
                    <div style="font-size:13px;color:var(--text-muted);">
                        ${filteredDocs.length} ${filteredDocs.length === 1 ? 'document' : 'documents'}
                    </div>
                </div>

                <!-- Document Grid / List / Empty State -->
                ${this.isLoading ? `
                    <div style="padding:40px;text-align:center;color:var(--text-muted);">
                        Loading documents from persistence layer...
                    </div>
                ` : this.errorMsg ? `
                    <div style="padding:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:var(--radius-md);color:#dc2626;">
                        ${this.errorMsg}
                    </div>
                ` : filteredDocs.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-state-icon">${ICONS.logo}</div>
                        <h3>No documents found</h3>
                        <p>Create a new document to start collaborating, or choose a template above.</p>
                        <button class="btn btn-primary" id="empty-create-btn">Create Document</button>
                    </div>
                ` : `
                    <div class="docs-grid">
                        ${filteredDocs.map(doc => `
                            <div class="doc-card" data-doc-id="${doc.docId}">
                                <div class="doc-card-header">
                                    <div class="doc-card-title">${this._escapeHtml(doc.title || 'Untitled Document')}</div>
                                    <div style="color:var(--color-primary);font-size:14px;">${ICONS.logo}</div>
                                </div>
                                <div class="doc-card-snippet">
                                    ${doc.snippet ? this._escapeHtml(doc.snippet) : '<em>Empty document</em>'}
                                </div>
                                <div class="doc-card-footer">
                                    <span>ID: <code>${doc.docId}</code></span>
                                    <span>${doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : 'Active'}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;

        this._attachEvents();
    }

    _attachEvents() {
        // Search filter
        const searchInput = this.container.querySelector('#dashboard-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                const filtered = this.documents.filter(doc => 
                    (doc.title || '').toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                    (doc.docId || '').toLowerCase().includes(this.searchQuery.toLowerCase())
                );
                // Re-render only grid
                this.render();
                const reSearch = this.container.querySelector('#dashboard-search-input');
                if (reSearch) {
                    reSearch.focus();
                    reSearch.setSelectionRange(this.searchQuery.length, this.searchQuery.length);
                }
            });
        }

        // Create new document button
        const createBtn = this.container.querySelector('#btn-create-doc');
        const emptyCreateBtn = this.container.querySelector('#empty-create-btn');
        const handleCreate = async () => {
            try {
                const newDoc = await api.createDocument('Untitled Document');
                window.location.hash = `#/doc/${newDoc.docId}`;
            } catch (err) {
                alert(`Error creating document: ${err.message}`);
            }
        };

        if (createBtn) createBtn.addEventListener('click', handleCreate);
        if (emptyCreateBtn) emptyCreateBtn.addEventListener('click', handleCreate);

        // Template cards
        const templateCards = this.container.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            card.addEventListener('click', async () => {
                const tmplId = card.dataset.templateId;
                const tmpl = CONFIG.TEMPLATES.find(t => t.id === tmplId);
                if (tmpl) {
                    try {
                        const newDoc = await api.createDocument(tmpl.name, tmpl.content);
                        window.location.hash = `#/doc/${newDoc.docId}`;
                    } catch (err) {
                        alert(`Error creating document from template: ${err.message}`);
                    }
                }
            });
        });

        // Document Cards click to open
        const docCards = this.container.querySelectorAll('.doc-card');
        docCards.forEach(card => {
            card.addEventListener('click', () => {
                const docId = card.dataset.docId;
                window.location.hash = `#/doc/${docId}`;
            });
        });
    }

    _escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }
}
