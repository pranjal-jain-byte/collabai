// Real-Time Socket.IO Client Service

import { io } from 'socket.io-client';
import { api } from './api.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connectionListeners = new Set();
    this.currentDocId = null;
  }

  connect() {
    const { accessToken } = api.getTokens();
    if (!accessToken) {
      console.warn('[Socket] No access token found. Cannot connect.');
      this._notifyConnection('disconnected');
      return null;
    }

    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this._notifyConnection('connecting');

    this.socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected with ID:', this.socket.id);
      this._notifyConnection('connected');

      // Re-join active document on reconnect
      if (this.currentDocId) {
        this.joinDocument(this.currentDocId);
      }
    });

    this.socket.on('connect_error', async (err) => {
      console.warn('[Socket] Connection rejected:', err.message);
      this._notifyConnection('disconnected');

      if (err.message === 'unauthorized') {
        console.log('[Socket] Token expired. Attempting refresh...');
        const refreshed = await api.refreshToken();
        if (refreshed && this.socket) {
          const { accessToken: newToken } = api.getTokens();
          this.socket.auth.token = newToken;
          this.socket.connect();
        }
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this._notifyConnection('disconnected');
    });

    // Forward events to active subscribers
    const serverEvents = [
      'load-doc',
      'operation',
      'operation-ack',
      'suggestion-chunk',
      'suggestion-done',
      'suggestion-error',
      'conflict-suggestion',
      'title-updated',
      'collaborators-list',
      'collaborator-joined',
      'collaborator-left',
      'cursor-update',
    ];

    for (const event of serverEvents) {
      this.socket.on(event, (payload) => {
        this._dispatch(event, payload);
      });
    }

    return this.socket;
  }

  getSocketId() {
    return this.socket ? this.socket.id : null;
  }

  joinDocument(docId) {
    this.currentDocId = docId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join-doc', docId);
      console.log(`[Socket] Joined doc: ${docId}`);
    }
  }

  leaveDocument(docId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave-doc', docId);
    }
    if (this.currentDocId === docId) {
      this.currentDocId = null;
    }
  }

  sendCursorUpdate(docId, cursor, selectionStart, selectionEnd) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('cursor-update', {
        docId,
        cursor,
        selectionStart: selectionStart ?? cursor,
        selectionEnd: selectionEnd ?? cursor,
      });
    }
  }

  sendOperation(docId, ops, baseVersion) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('operation', { docId, ops, baseVersion });
    }
  }

  requestSuggestion(text) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('request-suggestion', { text });
    }
  }

  updateTitle(docId, title) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('update-title', { docId, title });
    }
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.listeners.get(event).delete(handler);
  }

  onConnectionChange(handler) {
    this.connectionListeners.add(handler);
    return () => this.connectionListeners.delete(handler);
  }

  _notifyConnection(status) {
    for (const handler of this.connectionListeners) {
      try { handler(status); } catch (e) { console.error('Connection listener error:', e); }
    }
  }

  _dispatch(event, payload) {
    if (this.listeners.has(event)) {
      for (const handler of this.listeners.get(event)) {
        try { handler(payload); } catch (e) { console.error(`Error in socket event [${event}]:`, e); }
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this._notifyConnection('disconnected');
  }
}

export const socketService = new SocketService();
