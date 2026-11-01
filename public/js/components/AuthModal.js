// Professional Authentication & Demo User Selector Modal

import { store } from '../state.js';
import { api } from '../services/api.js';
import { CONFIG } from '../config.js';
import { ICONS } from '../icons.js';

export class AuthModal {
    constructor(container) {
        this.container = container;
        this.selectedDemoUser = CONFIG.DEMO_USERS[0];
        this.isLoading = false;
        this.errorMsg = null;
    }

    render() {
        const isOpen = store.get('activeModal') === 'auth';
        if (!isOpen) {
            this.container.innerHTML = '';
            return;
        }

        this.container.innerHTML = `
            <div class="modal-backdrop" id="auth-modal-backdrop">
                <div class="modal-box">
                    <div class="modal-header">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div class="brand-icon" style="width:28px;height:28px;">${ICONS.logo}</div>
                            <h3 class="modal-title">Sign In to CollabAI</h3>
                        </div>
                        <button class="btn-icon" id="auth-close-btn">${ICONS.close}</button>
                    </div>

                    <div class="modal-body">
                        <div class="info-note">
                            <strong>Demo Authentication Flow:</strong> CollabAI uses JWT access tokens (15m) and Redis-backed refresh tokens (7d). Select a demo profile below or enter a custom name to test concurrent multi-user editing.
                        </div>

                        <div>
                            <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:8px;">
                                SELECT A COLLABORATOR PROFILE:
                            </label>
                            <div class="demo-users-grid">
                                ${CONFIG.DEMO_USERS.map(user => `
                                    <div class="demo-user-card ${this.selectedDemoUser?.id === user.id ? 'active' : ''}" data-user-id="${user.id}">
                                        <div class="demo-avatar" style="background-color: ${user.color}">
                                            ${user.name.charAt(0)}
                                        </div>
                                        <div class="demo-name">${user.name}</div>
                                        <div class="demo-role">${user.role}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div style="display:flex;align-items:center;gap:12px;margin:4px 0;">
                            <div style="flex:1;height:1px;background:var(--border-color);"></div>
                            <span style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">or custom name</span>
                            <div style="flex:1;height:1px;background:var(--border-color);"></div>
                        </div>

                        <div>
                            <label for="custom-userid-input" style="font-size:13px;font-weight:500;color:var(--text-primary);display:block;margin-bottom:6px;">
                                Custom User ID / Name:
                            </label>
                            <input 
                                type="text" 
                                id="custom-userid-input" 
                                class="docs-search-input" 
                                style="border-radius:var(--radius-sm);padding:8px 12px;width:100%;box-sizing:border-box;"
                                placeholder="e.g. emily-watson"
                                value="${this.selectedDemoUser ? this.selectedDemoUser.id : ''}"
                            />
                        </div>

                        ${this.errorMsg ? `
                            <div style="font-size:12px;color:var(--color-accent-red);background:#fef2f2;padding:8px 12px;border-radius:var(--radius-sm);border:1px solid #fecaca;">
                                ${this.errorMsg}
                            </div>
                        ` : ''}
                    </div>

                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="auth-cancel-btn">Cancel</button>
                        <button class="btn btn-primary" id="auth-submit-btn" ${this.isLoading ? 'disabled' : ''}>
                            ${this.isLoading ? 'Authenticating...' : 'Continue to Workspace'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        this._attachEvents();
    }

    _attachEvents() {
        const backdrop = this.container.querySelector('#auth-modal-backdrop');
        const closeBtn = this.container.querySelector('#auth-close-btn');
        const cancelBtn = this.container.querySelector('#auth-cancel-btn');
        const submitBtn = this.container.querySelector('#auth-submit-btn');
        const customInput = this.container.querySelector('#custom-userid-input');

        const closeModal = () => {
            store.set('activeModal', null);
            this.errorMsg = null;
            this.render();
        };

        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) closeModal();
            });
        }
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        const cards = this.container.querySelectorAll('.demo-user-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const userId = card.dataset.userId;
                this.selectedDemoUser = CONFIG.DEMO_USERS.find(u => u.id === userId);
                if (customInput) customInput.value = userId;
                this.render();
            });
        });

        if (customInput) {
            customInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                this.selectedDemoUser = CONFIG.DEMO_USERS.find(u => u.id === val) || null;
            });
            customInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this._handleSubmit();
            });
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', () => this._handleSubmit());
        }
    }

    async _handleSubmit() {
        const customInput = this.container.querySelector('#custom-userid-input');
        const userId = customInput ? customInput.value.trim() : (this.selectedDemoUser ? this.selectedDemoUser.id : '');

        if (!userId) {
            this.errorMsg = 'Please enter or select a User ID.';
            this.render();
            return;
        }

        this.isLoading = true;
        this.errorMsg = null;
        this.render();

        try {
            const data = await api.login(userId);
            const demoUser = CONFIG.DEMO_USERS.find(u => u.id === userId);
            const userName = demoUser ? demoUser.name : userId;

            store.setUserSession(userId, userName, data.accessToken, data.refreshToken);
            store.set('activeModal', null);

            // If we have an intended doc ID in hash, go to it; otherwise go to dashboard
            const hash = window.location.hash;
            if (!hash.includes('/doc/')) {
                window.location.hash = '#/dashboard';
            }
        } catch (err) {
            this.errorMsg = `Login failed: ${err.message}`;
            this.isLoading = false;
            this.render();
        }
    }
}
