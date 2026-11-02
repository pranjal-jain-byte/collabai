// REST API Client with Automatic JWT Refresh

import { store } from '../state.js';

class ApiService {
    constructor() {
        this.refreshingPromise = null;
    }

    async request(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const token = store.get('accessToken');
        if (token && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            let res = await fetch(url, { ...options, headers });

            // If 401 Unauthorized and not already refreshing, attempt token renewal
            if (res.status === 401 && !url.includes('/login') && !url.includes('/refresh')) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    headers['Authorization'] = `Bearer ${store.get('accessToken')}`;
                    res = await fetch(url, { ...options, headers });
                }
            }

            return res;
        } catch (err) {
            console.error(`API Request to ${url} failed:`, err.message);
            throw err;
        }
    }

    async login(userId) {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Login failed' }));
            throw new Error(err.error || 'Login failed');
        }
        return await res.json();
    }

    async refreshToken() {
        if (this.refreshingPromise) return this.refreshingPromise;

        const refreshToken = store.get('refreshToken');
        if (!refreshToken) {
            store.clearUserSession();
            return false;
        }

        this.refreshingPromise = (async () => {
            try {
                const res = await fetch('/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken })
                });

                if (!res.ok) {
                    throw new Error('Refresh token revoked or expired');
                }

                const data = await res.json();
                store.set('accessToken', data.accessToken);
                return true;
            } catch (err) {
                console.warn('Session expired. Please log in again.');
                store.clearUserSession();
                return false;
            } finally {
                this.refreshingPromise = null;
            }
        })();

        return this.refreshingPromise;
    }

    async logout() {
        const token = store.get('accessToken');
        if (token) {
            try {
                await fetch('/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (e) {}
        }
        store.clearUserSession();
    }

    async getDocuments() {
        const res = await this.request('/api/documents');
        if (!res.ok) throw new Error('Failed to fetch documents');
        const data = await res.json();
        return data.documents || [];
    }

    async createDocument(title = 'Untitled Document', content = '', docId = null) {
        const payload = { title, content };
        if (docId) payload.docId = docId;

        const res = await this.request('/api/documents', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create document');
        return await res.json();
    }

    async getDocument(docId) {
        const res = await this.request(`/api/documents/${docId}`);
        if (!res.ok) throw new Error('Failed to load document');
        return await res.json();
    }

    async updateDocumentTitle(docId, title) {
        const res = await this.request(`/api/documents/${docId}/title`, {
            method: 'PATCH',
            body: JSON.stringify({ title })
        });
        if (!res.ok) throw new Error('Failed to update title');
        return await res.json();
    }

    async deleteDocument(docId) {
        const res = await this.request(`/api/documents/${docId}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete document');
        return await res.json();
    }

    async getStatus() {
        const res = await this.request('/api/status');
        if (!res.ok) return { status: 'unknown' };
        return await res.json();
    }
}

export const api = new ApiService();
