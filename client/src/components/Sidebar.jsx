// Sidebar.jsx — Premium Collapsible Left Workspace Sidebar
// Document navigation, search, template starters, and workspace controls

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Search, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Sparkles, 
  Trash2, 
  LogOut,
  FolderOpen
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Sidebar({ currentDocId, isOpen, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const loadDocs = async () => {
      try {
        const docs = await api.getDocuments();
        setDocuments(docs);
      } catch (e) {
        // quiet error on sidebar load
      }
    };
    loadDocs();
  }, [currentDocId]);

  const handleCreateNew = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const newDoc = await api.createDocument('Untitled Document', '');
      navigate(`/doc/${newDoc.docId}`);
    } catch (err) {
      console.error('Failed to create document from sidebar:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredDocs = documents.filter((d) =>
    (d.title || 'Untitled Document').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteDoc = async (e, docId, title) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Are you sure you want to delete "${title || 'Untitled Document'}"?\n\nThis will permanently delete the document.`);
    if (!confirmed) return;

    try {
      await api.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.docId !== docId));
      if (currentDocId === docId) {
        navigate('/dashboard');
      }
    } catch (err) {
      alert(`Failed to delete document: ${err.message}`);
    }
  };

  return (
    <aside
      className={`bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col transition-all duration-300 relative z-30 shrink-0 ${
        isOpen ? 'w-64' : 'w-16'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 border-b border-slate-800 flex items-center justify-between px-3.5">
        {isOpen ? (
          <div 
            onClick={() => navigate('/dashboard')} 
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight">CollabAI</span>
              <span className="text-[10px] text-indigo-400 block -mt-0.5">Workspace</span>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => navigate('/dashboard')} 
            className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white mx-auto cursor-pointer"
            title="CollabAI Workspace"
          >
            <Sparkles className="w-4 h-4" />
          </div>
        )}

        <button
          onClick={onToggle}
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* New Document Button */}
      <div className="p-3">
        <button
          onClick={handleCreateNew}
          disabled={isCreating}
          className={`w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
            !isOpen ? 'px-0' : 'px-3'
          }`}
          title="Create New Document"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {isOpen && <span>New Document</span>}
        </button>
      </div>

      {/* Workspace Quick Links */}
      <div className="px-3 py-1 space-y-1 text-xs">
        <button
          onClick={() => navigate('/dashboard')}
          className={`w-full text-left py-2 px-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer ${
            location.pathname === '/dashboard' ? 'bg-slate-800 text-white font-semibold' : ''
          }`}
          title="Dashboard"
        >
          <Home className="w-4 h-4 shrink-0 text-slate-400" />
          {isOpen && <span>All Documents</span>}
        </button>
      </div>

      {/* Search Input when open */}
      {isOpen && (
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus-within:border-indigo-500">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter docs..."
              className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-400 w-full"
            />
          </div>
        </div>
      )}

      {/* Document List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {isOpen && (
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Recent Work
          </div>
        )}

        {filteredDocs.map((doc) => {
          const isActive = doc.docId === currentDocId;
          return (
            <div
              key={doc.docId}
              onClick={() => navigate(`/doc/${doc.docId}`)}
              className={`w-full text-left py-1.5 px-2.5 rounded-lg flex items-center justify-between gap-1.5 text-xs transition-colors cursor-pointer group ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-medium'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title={doc.title || 'Untitled Document'}
            >
              <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                {isOpen && <span className="truncate">{doc.title || 'Untitled Document'}</span>}
              </div>
              {isOpen && (
                <button
                  onClick={(e) => handleDeleteDoc(e, doc.docId, doc.title)}
                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700/60 rounded transition-all opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                  title="Delete document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {isOpen && filteredDocs.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-400">
            No matching documents
          </div>
        )}
      </div>

      {/* User footer */}
      <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs">
        {isOpen ? (
          <div className="flex items-center gap-2 truncate">
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 shrink-0 uppercase text-xs">
              {(user?.name || user?.userId || 'U')[0]}
            </div>
            <div className="truncate">
              <span className="font-medium text-white block truncate leading-tight">
                {user?.name || user?.userId || 'Collaborator'}
              </span>
              <span className="text-[10px] text-slate-400">Online</span>
            </div>
          </div>
        ) : (
          <div 
            className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 mx-auto uppercase text-xs"
            title={user?.name || user?.userId}
          >
            {(user?.name || user?.userId || 'U')[0]}
          </div>
        )}

        {isOpen && (
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-slate-400 hover:text-rose-400 p-1.5 rounded transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </aside>
  );
}
