// Main Application Orchestrator & Client-Side Router

import { store } from './state.js';
import { api } from './services/api.js';
import { Navbar } from './components/Navbar.js';
import { LandingPage } from './components/LandingPage.js';
import { Dashboard } from './components/Dashboard.js';
import { Editor } from './components/Editor.js';
import { AIAssistant } from './components/AIAssistant.js';
import { ConflictAlert } from './components/ConflictAlert.js';
import { AuthModal } from './components/AuthModal.js';
import { ShareModal } from './components/ShareModal.js';
import { CONFIG } from './config.js';

class CollabAIApp {
    constructor() {
        this.navbar = null;
        this.currentViewInstance = null;
        this.aiAssistant = null;
        this.conflictAlert = null;
        this.authModal = null;
        this.shareModal = null;
    }

    async init() {
        console.log('[CollabAI] Initializing SPA client...');

        // Mount persistent components
        this.navbar = new Navbar(document.querySelector('#navbar-root'));
        this.navbar.mount();

        this.conflictAlert = new ConflictAlert(document.querySelector('#conflict-root'));
        this.conflictAlert.mount();

        this.authModal = new AuthModal(document.querySelector('#modal-auth-root'));
        this.shareModal = new ShareModal(document.querySelector('#modal-share-root'));

        store.subscribe('activeModal', () => {
            this.authModal.render();
            this.shareModal.render();
        });

        // Ensure session exists or check tokens
        await this._ensureSession();

        // Listen for route changes
        window.addEventListener('hashchange', () => this._handleRoute());

        // Global hotkey listeners
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                store.set('saveStatus', 'saved');
            }
        });

        // Initial route resolution
        await this._handleRoute();
    }

    async _ensureSession() {
        const user = store.get('user');
        const accessToken = store.get('accessToken');

        if (!user || !accessToken) {
            // Auto-provision a default demo user for seamless zero-barrier testing
            try {
                const defaultUser = CONFIG.DEMO_USERS[0];
                const data = await api.login(defaultUser.id);
                store.setUserSession(defaultUser.id, defaultUser.name, data.accessToken, data.refreshToken);
                console.log(`[CollabAI] Auto-initialized session as demo user: ${defaultUser.name}`);
            } catch (err) {
                console.warn('[CollabAI] Auto-login note:', err.message);
            }
        }
    }

    async _handleRoute() {
        const hash = window.location.hash || '#/';
        const mainRoot = document.querySelector('#main-root');
        const aiRoot = document.querySelector('#ai-root');

        // Clean up previous view
        if (this.currentViewInstance && this.currentViewInstance.unmount) {
            this.currentViewInstance.unmount();
            this.currentViewInstance = null;
        }
        if (this.aiAssistant && this.aiAssistant.unmount) {
            this.aiAssistant.unmount();
            this.aiAssistant = null;
        }

        if (hash === '#/' || hash === '' || hash.startsWith('#features') || hash.startsWith('#architecture')) {
            store.set('currentView', 'landing');
            store.set('isAiDrawerOpen', false);
            this.currentViewInstance = new LandingPage(mainRoot);
            this.currentViewInstance.mount();
        } else if (hash.startsWith('#/dashboard')) {
            store.set('currentView', 'dashboard');
            store.set('isAiDrawerOpen', false);
            this.currentViewInstance = new Dashboard(mainRoot);
            await this.currentViewInstance.mount();
        } else if (hash.startsWith('#/doc/') || hash.startsWith('#doc=')) {
            let docId = hash.startsWith('#/doc/') ? hash.replace('#/doc/', '') : hash.replace('#doc=', '');
            docId = docId.split('?')[0];

            if (!docId) docId = 'test-doc';

            store.set('currentView', 'editor');
            this.currentViewInstance = new Editor(mainRoot);
            await this.currentViewInstance.mount(docId);

            // Mount AI Assistant attached to this editor instance
            const aiContainer = document.querySelector('#ai-drawer-container') || aiRoot;
            this.aiAssistant = new AIAssistant(aiContainer, this.currentViewInstance);
            this.aiAssistant.mount();
        } else {
            // Fallback to dashboard
            window.location.hash = '#/dashboard';
        }
    }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new CollabAIApp();
    app.init();
});
