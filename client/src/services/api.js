// API Service for CollabAI Client

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(message, status = 0, data = null, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isNetworkError = isNetworkError;
  }
}

class ApiService {
  constructor() {
    this.refreshPromise = null;
  }

  getTokens() {
    return {
      accessToken: localStorage.getItem('collabai_access_token'),
      refreshToken: localStorage.getItem('collabai_refresh_token'),
    };
  }

  setTokens(accessToken, refreshToken) {
    if (accessToken) localStorage.setItem('collabai_access_token', accessToken);
    if (refreshToken) localStorage.setItem('collabai_refresh_token', refreshToken);
  }

  clearTokens() {
    localStorage.removeItem('collabai_access_token');
    localStorage.removeItem('collabai_refresh_token');
    localStorage.removeItem('collabai_user_id');
    localStorage.removeItem('collabai_user_name');
  }

  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const { accessToken } = this.getTokens();
    if (accessToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let res;
    try {
      res = await fetch(url, { ...options, headers });
    } catch (networkErr) {
      console.error(`[API Network Error] ${options.method || 'GET'} ${url}:`, networkErr.message);
      throw new ApiError(
        'Could not connect to the document API. Please verify the backend is running.',
        0,
        null,
        true
      );
    }

    // Auto-refresh token on 401 expiration
    if (res.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/refresh')) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        const { accessToken: newToken } = this.getTokens();
        headers['Authorization'] = `Bearer ${newToken}`;
        try {
          res = await fetch(url, { ...options, headers });
        } catch (retryNetworkErr) {
          throw new ApiError(
            'Connection lost while refreshing authentication session.',
            0,
            null,
            true
          );
        }
      }
    }

    if (!res.ok) {
      let errorData = null;
      try {
        errorData = await res.json();
      } catch {
        errorData = { error: res.statusText || 'Request failed' };
      }
      const message = errorData?.error || errorData?.message || `Request failed with status ${res.status}`;
      throw new ApiError(message, res.status, errorData, false);
    }

    return await res.json();
  }

  async login(userId) {
    const data = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });

    this.setTokens(data.accessToken, data.refreshToken);
    localStorage.setItem('collabai_user_id', userId);
    return data;
  }

  async refreshToken() {
    if (this.refreshPromise) return this.refreshPromise;

    const { refreshToken } = this.getTokens();
    if (!refreshToken) {
      this.clearTokens();
      return false;
    }

    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
          throw new Error('Refresh token revoked or expired');
        }

        const data = await res.json();
        this.setTokens(data.accessToken, null);
        return true;
      } catch (err) {
        console.warn('Session expired. Please log in again:', err.message);
        this.clearTokens();
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async logout() {
    const { accessToken } = this.getTokens();
    if (accessToken) {
      try {
        await fetch(`${BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      } catch (e) {
        console.warn('Logout request warning:', e.message);
      }
    }
    this.clearTokens();
  }

  async getDocuments() {
    const data = await this.request('/api/documents');
    return data.documents || [];
  }

  async createDocument(title = 'Untitled Document', content = '', docId = null) {
    const payload = { title, content };
    if (docId) payload.docId = docId;

    return await this.request('/api/documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getDocument(docId) {
    return await this.request(`/api/documents/${docId}`);
  }

  async updateDocumentTitle(docId, title) {
    return await this.request(`/api/documents/${docId}/title`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  async deleteDocument(docId) {
    return await this.request(`/api/documents/${docId}`, {
      method: 'DELETE',
    });
  }

  async getStatus() {
    try {
      return await this.request('/api/status');
    } catch {
      return { status: 'offline' };
    }
  }

  // Version History
  async getVersions(docId) {
    const data = await this.request(`/api/documents/${docId}/versions`);
    return data.versions || [];
  }

  async getVersion(docId, versionId) {
    const data = await this.request(`/api/documents/${docId}/versions/${versionId}`);
    return data.version;
  }

  async createVersion(docId, payload = {}) {
    return await this.request(`/api/documents/${docId}/versions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async restoreVersion(docId, versionId, payload = {}) {
    return await this.request(`/api/documents/${docId}/versions/${versionId}/restore`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Action Items
  async getActionItems(docId) {
    const data = await this.request(`/api/documents/${docId}/actions`);
    return data.actionItems || [];
  }

  async extractActionItems(docId) {
    const data = await this.request(`/api/documents/${docId}/actions/extract`, {
      method: 'POST',
    });
    return data.actionItems || [];
  }

  async createActionItem(docId, payload) {
    const data = await this.request(`/api/documents/${docId}/actions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.actionItem;
  }

  async updateActionItem(docId, actionId, payload) {
    const data = await this.request(`/api/documents/${docId}/actions/${actionId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return data.actionItem;
  }

  async deleteActionItem(docId, actionId) {
    return await this.request(`/api/documents/${docId}/actions/${actionId}`, {
      method: 'DELETE',
    });
  }

  // AI Review & Document Q&A
  async reviewDocument(docId, payload = {}) {
    return await this.request(`/api/documents/${docId}/ai/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async askDocument(docId, payload) {
    return await this.request(`/api/documents/${docId}/ai/ask`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiService();
