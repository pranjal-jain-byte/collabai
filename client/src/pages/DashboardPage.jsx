// DashboardPage Component - Google Docs / Drive Document Management

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  FileText, 
  Clock, 
  Sparkles, 
  Layers, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  X,
  Trash2,
  ExternalLink
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { api } from '../services/api.js';

const TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Document',
    desc: 'Start fresh with an empty canvas',
    content: '',
  },
  {
    id: 'proposal',
    name: 'Project Proposal',
    desc: 'Architecture & technical roadmap',
    content: `# Project Proposal: Distributed Collaboration Engine\n\n## 1. Executive Summary\nThis document outlines the architecture for real-time collaborative document editing with Operational Transformation.\n\n## 2. Key Objectives\n- Zero-collision concurrent document synchronization\n- Sub-50ms keystroke broadcast latency\n- Google Gemini AI semantic conflict resolution\n\n## 3. Architecture Overview\nClients connect via WebSockets to an Express/Socket.IO backend. Edits are transformed across operation histories before persistence in Redis and MongoDB.`,
  },
  {
    id: 'meeting',
    name: 'Engineering Sync Notes',
    desc: 'Team standup and action items',
    content: `# Weekly Engineering Sync\n\n**Date:** ${new Date().toLocaleDateString()}\n**Attendees:** Alex Rivera, Sarah Chen, David Kim\n\n## Agenda\n1. Review OT prefix/suffix diff benchmarks\n2. Dual persistence flush thresholds (Redis to MongoDB)\n3. Gemini 2.0 Flash conflict mediator integration\n\n## Action Items\n- [ ] Complete stress testing on concurrent deletions\n- [ ] Deploy staging Redis container\n- [ ] Verify JWT token refresh flow`,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [creatingTemplateId, setCreatingTemplateId] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev && prev.message === message ? null : prev));
    }, 5000);
  };

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      const errMsg = err.isNetworkError
        ? 'Could not connect to the document API. Please verify the backend is running at http://localhost:3000.'
        : (err.message || 'Failed to load documents.');
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleCreateDocument = async (title = 'Untitled Document', content = '', templateId = null) => {
    if (isCreating) return;
    setIsCreating(true);
    setCreatingTemplateId(templateId);
    setError(null);

    try {
      const newDoc = await api.createDocument(title, content);
      showToast(`Document "${newDoc.title}" created successfully!`, 'success');
      navigate(`/doc/${newDoc.docId}`);
    } catch (err) {
      console.error('Document creation failed:', err);
      const errMsg = err.isNetworkError
        ? 'Connection failed: Unable to reach the CollabAI server. Please check your backend.'
        : `Error creating document: ${err.message}`;
      showToast(errMsg, 'error');
    } finally {
      setIsCreating(false);
      setCreatingTemplateId(null);
    }
  };

  const handleDeleteDocument = async (e, docId, docTitle) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${docTitle || docId}"?`)) {
      return;
    }

    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.docId !== docId));
      showToast('Document deleted.', 'success');
    } catch (err) {
      showToast(`Failed to delete document: ${err.message}`, 'error');
    }
  };

  const filteredDocs = documents.filter((doc) =>
    (doc.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (doc.docId || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar mode="dashboard" />

      {/* Professional Toast Notification */}
      {toast && (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm transition-all animate-in fade-in slide-in-from-top-4 bg-white border-gray-200">
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          )}
          <span className={toast.type === 'success' ? 'text-gray-800' : 'text-red-700'}>
            {toast.message}
          </span>
          <button
            onClick={() => setToast(null)}
            className="text-gray-400 hover:text-gray-600 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className="max-w-6xl w-full mx-auto px-6 py-10 flex-1 flex flex-col">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-950">
              Welcome back, {user ? user.name : 'Collaborator'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Collaborative document workspaces synchronized with Operational Transformation.
            </p>
          </div>

          <button
            onClick={() => handleCreateDocument('Untitled Document', '', 'btn-blank')}
            disabled={isCreating}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {isCreating && creatingTemplateId === 'btn-blank' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{isCreating && creatingTemplateId === 'btn-blank' ? 'Creating...' : 'New Blank Document'}</span>
          </button>
        </div>

        {/* Template Gallery */}
        <section className="mb-12">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            Workspace Templates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => !isCreating && handleCreateDocument(tmpl.name, tmpl.content, tmpl.id)}
                className={`bg-white border border-gray-200/80 rounded-xl p-5 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between group ${
                  isCreating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  {isCreating && creatingTemplateId === tmpl.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : tmpl.id === 'blank' ? (
                    <Plus className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
                    {tmpl.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{tmpl.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Document Search & List */}
        <section className="flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents by title or ID..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
              </span>
              <button
                onClick={fetchDocuments}
                title="Refresh document list"
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Backend Connection Error Banner with Retry */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchDocuments}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* Document Content State */}
          {loading ? (
            <div className="py-20 text-center text-gray-400 text-sm flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
              <span>Loading documents from storage...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-20 text-center bg-white border border-dashed border-gray-200 rounded-xl p-8 shadow-xs">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800 text-base mb-1">
                {search ? 'No matching documents' : 'No documents found'}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mb-5 leading-relaxed">
                {search
                  ? `No documents match "${search}". Try searching for another keyword or clear the search field.`
                  : 'Your document workspace is currently empty. Create your first document to start collaborating in real time!'}
              </p>
              <button
                onClick={() => handleCreateDocument('Untitled Document', '', 'btn-empty')}
                disabled={isCreating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Document</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.docId}
                  onClick={() => navigate(`/doc/${doc.docId}`)}
                  className="bg-white border border-gray-200 hover:border-blue-400 rounded-xl p-5 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between h-44 group relative"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {doc.title || 'Untitled Document'}
                      </h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleDeleteDocument(e, doc.docId, doc.title)}
                          title="Delete document"
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer opacity-75 hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                      {doc.snippet ? doc.snippet : 'Empty document.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span className="font-mono text-gray-400">ID: {doc.docId}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
