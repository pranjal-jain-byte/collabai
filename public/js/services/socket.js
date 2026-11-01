// Real-Time Socket.IO Synchronization Manager

import { store } from '../state.js';
import { api } from './api.js';

class SocketManager {
    constructor() {
        this.socket = null;
        this.eventListeners = new Map();
        this.currentDocId = null;
    }

    async connect() {
        const token = store.get('accessToken');
        if (!token) {
            console.warn('[Socket] Cannot connect without access token');
            store.set('connectionStatus', 'disconnected');
            return null;
        }

        if (this.socket && this.socket.connected) {
            return this.socket;
        }

        store.set('connectionStatus', 'connecting');

        // Socket.IO client script is loaded from /socket.io/socket.io.js
        if (typeof io === 'undefined') {
            console.error('[Socket] Socket.io client library not loaded');
            store.set('connectionStatus', 'disconnected');
            return null;
        }

        this.socket = io({
            auth: { token },
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });

        this._setupBaseHandlers();
        return this.socket;
    }

    _setupBaseHandlers() {
        this.socket.on('connect', () => {
            console.log('[Socket] Connected to server with id:', this.socket.id);
            store.set('connectionStatus', 'connected');

            // Re-join active document if reconnecting
            const docId = store.get('currentDocId');
            if (docId) {
                this.joinDocument(docId);
            }
        });

        this.socket.on('connect_error', async (err) => {
            console.warn('[Socket] Connection rejected:', err.message);
            store.set('connectionStatus', 'disconnected');

            if (err.message === 'unauthorized') {
                console.log('[Socket] Token rejected/expired. Attempting refresh...');
                const refreshed = await api.refreshToken();
                if (refreshed && this.socket) {
                    this.socket.auth.token = store.get('accessToken');
                    this.socket.connect();
                } else {
                    store.set('activeModal', 'auth');
                }
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
            store.set('connectionStatus', 'disconnected');
        });

        // Forward server events to registered subscribers
        const serverEvents = [
            'load-doc',
            'operation',
            'operation-ack',
            'suggestion-chunk',
            'suggestion-done',
            'suggestion-error',
            'conflict-suggestion',
            'title-updated'
        ];

        for (const ev of serverEvents) {
            this.socket.on(ev, (data) => {
                this._dispatch(ev, data);
            });
        }
    }

    joinDocument(docId) {
        if (!this.socket || !this.socket.connected) {
            console.warn('[Socket] Cannot join document before connection is established');
            return;
        }
        this.currentDocId = docId;
        this.socket.emit('join-doc', docId);
        console.log(`[Socket] Emitted join-doc: ${docId}`);
    }

    sendOperation(docId, ops, baseVersion) {
        if (!this.socket || !this.socket.connected) {
            console.warn('[Socket] Cannot send operation while disconnected');
            return;
        }
        this.socket.emit('operation', { docId, ops, baseVersion });
    }

    requestSuggestion(text) {
        if (!this.socket || !this.socket.connected) return;
        this.socket.emit('request-suggestion', { text });
    }

    updateTitle(docId, title) {
        if (!this.socket || !this.socket.connected) return;
        this.socket.emit('update-title', { docId, title });
    }

    on(event, handler) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(handler);
        return () => this.eventListeners.get(event).delete(handler);
    }

    _dispatch(event, data) {
        if (this.eventListeners.has(event)) {
            for (const handler of this.eventListeners.get(event)) {
                try { handler(data); } catch (e) { console.error(`Handler error for ${event}:`, e); }
            }
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        store.set('connectionStatus', 'disconnected');
    }
}

export const socketService = new SocketManager();
