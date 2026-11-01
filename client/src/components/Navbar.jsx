// Navbar Component - Adaptive for Landing, Dashboard, and Google Docs Editor

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Sparkles, 
  Share2, 
  Cloud, 
  Check, 
  LogOut, 
  ChevronDown, 
  Printer, 
  Download, 
  HelpCircle,
  Undo2,
  Redo2,
  Plus
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import ConnectionStatus from './ConnectionStatus.jsx';

export default function Navbar({ 
  mode = 'landing', 
  title, 
  onTitleChange, 
  saveStatus = 'saved', 
  connectionStatus = 'connected',
  collaborators = [],
  onShareClick,
  isAiOpen,
  onAiToggle,
  onUndo,
  onRedo,
  onExportTxt,
  onExportMd
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (mode === 'editor') {
    return (
      <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between sticky top-0 z-50 select-none">
        {/* Left: Brand + Title + Menus */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link 
            to="/dashboard" 
            className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm hover:opacity-90 transition-opacity flex-shrink-0"
            title="Return to Documents"
          >
            <FileText className="w-5 h-5" />
          </Link>

          <div className="flex flex-col min-w-0">
            {/* Editable Title */}
            <input 
              type="text" 
              value={title || ''}
              onChange={(e) => onTitleChange && onTitleChange(e.target.value)}
              className="text-lg font-semibold text-gray-900 bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white rounded px-2 py-0.5 outline-none max-w-sm sm:max-w-md truncate transition-colors"
              placeholder="Untitled Document"
              title="Click to rename"
            />

            {/* Menu Bar: File, Edit, AI Assist, Help */}
            <div className="flex items-center gap-1 text-xs text-gray-600">
              {/* File Menu */}
              <div className="relative">
                <button 
                  onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
                  className="px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
                >
                  File
                </button>
                {activeMenu === 'file' && (
                  <div 
                    className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
                    onMouseLeave={() => setActiveMenu(null)}
                  >
                    <button 
                      onClick={() => { setActiveMenu(null); navigate('/dashboard'); }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>New Document</span>
                      <Plus className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button 
                      onClick={() => { setActiveMenu(null); onExportTxt && onExportTxt(); }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>Export as Plain Text</span>
                      <Download className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button 
                      onClick={() => { setActiveMenu(null); onExportMd && onExportMd(); }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>Export as Markdown</span>
                      <Download className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <div className="h-px bg-gray-200 my-1"></div>
                    <button 
                      onClick={() => { setActiveMenu(null); window.print(); }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>Print Document</span>
                      <Printer className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                )}
              </div>

              {/* Edit Menu */}
              <div className="relative">
                <button 
                  onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
                  className="px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
                >
                  Edit
                </button>
                {activeMenu === 'edit' && (
                  <div 
                    className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
                    onMouseLeave={() => setActiveMenu(null)}
                  >
                    <button 
                      onClick={() => { setActiveMenu(null); onUndo && onUndo(); }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>Undo</span>
                      <span className="text-gray-400 text-[10px]">Ctrl+Z</span>
                    </button>
                    <button 
                      onClick={() => { setActiveMenu(null); onRedo && onRedo(); }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>Redo</span>
                      <span className="text-gray-400 text-[10px]">Ctrl+Y</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Help Menu */}
              <div className="relative">
                <button 
                  onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
                  className="px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
                >
                  Help
                </button>
                {activeMenu === 'help' && (
                  <div 
                    className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
                    onMouseLeave={() => setActiveMenu(null)}
                  >
                    <div className="px-3 py-2 text-[11px] text-gray-500 border-b border-gray-100">
                      <strong>Operational Transformation:</strong> Real-time keystroke diffs transformed against server history.
                    </div>
                    <a 
                      href="https://github.com" 
                      target="_blank" 
                      rel="noreferrer"
                      className="block px-3 py-1.5 text-xs text-blue-600 hover:bg-gray-100"
                    >
                      Architecture Documentation
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Cloud Sync + Live OT + Share + AI + User */}
        <div className="flex items-center gap-3">
          {/* Cloud Save Status */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500">
            {saveStatus === 'saving' ? (
              <>
                <Cloud className="w-4 h-4 text-blue-500 animate-pulse" />
                <span className="text-blue-600">Syncing...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Saved</span>
              </>
            )}
          </div>

          {/* Connection Status */}
          <ConnectionStatus status={connectionStatus} />

          {/* Active Collaborators Avatars */}
          {collaborators && collaborators.length > 0 && (
            <div className="flex items-center -space-x-2 overflow-hidden px-1 py-0.5">
              {collaborators.map((c) => (
                <div
                  key={c.socketId || c.userId}
                  className="w-7 h-7 rounded-full text-white font-semibold flex items-center justify-center text-[10px] shadow-sm ring-2 ring-white cursor-default transition-transform hover:scale-110 hover:z-20"
                  style={{ backgroundColor: c.color || '#1a73e8' }}
                  title={`${c.name || c.userId} (Active Collaborator)`}
                >
                  {(c.name || c.userId).charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          )}

          {/* Share Button */}
          <button 
            onClick={onShareClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors"
          >
            <Share2 className="w-4 h-4 text-gray-600" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Gemini AI Toggle */}
          <button 
            onClick={onAiToggle}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all shadow-sm ${
              isAiOpen 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' 
                : 'bg-white hover:bg-purple-50 text-purple-700 border border-purple-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

          {/* User Profile Avatar */}
          {user && (
            <div 
              className="w-8 h-8 rounded-full text-white font-semibold flex items-center justify-center text-xs shadow-sm ring-2 ring-white cursor-pointer"
              style={{ backgroundColor: user.color }}
              title={`${user.name} (${user.id})`}
              onClick={handleLogout}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </header>
    );
  }

  // Landing / Dashboard Navigation Mode
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-50">
      <Link to="/" className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
          <FileText className="w-4 h-4" />
        </div>
        <span className="font-heading font-bold text-xl text-gray-900 tracking-tight">CollabAI</span>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          OT + Gemini
        </span>
      </Link>

      {mode === 'landing' ? (
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
          <a href="#architecture" className="hover:text-blue-600 transition-colors">Architecture</a>
          <a href="#protocol" className="hover:text-blue-600 transition-colors">OT Protocol</a>
        </nav>
      ) : (
        <div className="text-sm font-medium text-gray-500">
          Workspace Documents
        </div>
      )}

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Link 
              to="/dashboard" 
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Documents
            </Link>
            <div 
              className="w-8 h-8 rounded-full text-white font-semibold flex items-center justify-center text-xs shadow-sm ring-2 ring-white"
              style={{ backgroundColor: user.color }}
              title={`${user.name} (${user.id})`}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <Link 
              to="/login"
              className="px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/dashboard"
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors"
            >
              Start Writing
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
