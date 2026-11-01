// Reactive State Store for CollabAI SPA

import { CONFIG } from './config.js';

class StateStore {
    constructor() {
        this.listeners = new Map();
        
        // Load persisted credentials if available
        const savedUserId = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_ID);
        const savedUserName = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NAME) || savedUserId;
        const savedAccessToken = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        const savedRefreshToken = localStorage.getItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);

        const initialUser = savedUserId ? {
            id: savedUserId,
            name: savedUserName,
            color: this._getUserColor(savedUserId)
        } : null;

        this.state = {
            currentView: 'landing', // 'landing' | 'dashboard' | 'editor'
            user: initialUser,
            accessToken: savedAccessToken,
            refreshToken: savedRefreshToken,
            
            // Document State
            currentDocId: null,
            currentDocTitle: 'Untitled Document',
            docVersion: 0,
            saveStatus: 'saved', // 'saved' | 'saving' | 'offline'
            
            // Socket & Network State
            connectionStatus: 'disconnected', // 'connected' | 'connecting' | 'disconnected'
            
            // UI States
            activeModal: null, // 'auth' | 'share' | 'newDoc' | null
            isAiDrawerOpen: false,
            aiStreamingText: '',
            isAiStreaming: false,
            aiError: null,
            conflictData: null, // { original, suggestion } | null
            documentsList: []
        };
    }

    _getUserColor(userId) {
        const demo = CONFIG.DEMO_USERS.find(u => u.id === userId);
        if (demo) return demo.color;
        const colors = ['#1a73e8', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    get(key) {
        return this.state[key];
    }

    set(key, value) {
        const prev = this.state[key];
        this.state[key] = value;
        if (prev !== value) {
            this._notify(key, value, prev);
        }
    }

    update(partial) {
        for (const [key, val] of Object.entries(partial)) {
            this.set(key, val);
        }
    }

    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        // Invoke immediately with current value
        callback(this.state[key]);
        return () => this.listeners.get(key).delete(callback);
    }

    _notify(key, newVal, oldVal) {
        if (this.listeners.has(key)) {
            for (const cb of this.listeners.get(key)) {
                try { cb(newVal, oldVal); } catch (e) { console.error('State subscriber error:', e); }
            }
        }
        if (this.listeners.has('*')) {
            for (const cb of this.listeners.get('*')) {
                try { cb(key, newVal, oldVal); } catch (e) { console.error('Global subscriber error:', e); }
            }
        }
    }

    // Auth helpers
    setUserSession(userId, userName, accessToken, refreshToken) {
        const user = {
            id: userId,
            name: userName || userId,
            color: this._getUserColor(userId)
        };
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, userId);
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_NAME, user.name);
        if (accessToken) localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        if (refreshToken) localStorage.setItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

        this.update({
            user,
            accessToken,
            refreshToken
        });
    }

    clearUserSession() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_ID);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_NAME);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);

        this.update({
            user: null,
            accessToken: null,
            refreshToken: null
        });
    }
}

export const store = new StateStore();
