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
  Plus,
  PanelLeft,
  FileSearch,
  MessageSquare,
  History,
  ListTodo,
  Trash2
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
  onDeleteDocument,
  isAiOpen,
  onAiToggle,
  onUndo,
  onRedo,
  onExportTxt,
  onExportMd,
  onToggleSidebar,
  isSidebarOpen,
  activeRightTab,
  isRightPanelOpen,
  onOpenRightTab
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
      <header className="h-14 bg-white border-b border-gray-200 px-3 flex items-center justify-between sticky top-0 z-40 select-none">
        {/* Left: Sidebar Toggle + Brand + Title + Menus */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isSidebarOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
              title={isSidebarOpen ? 'Close sidebar' : 'Open documents sidebar'}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          <Link 
            to="/dashboard" 
            className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs hover:opacity-90 transition-opacity shrink-0"
            title="Return to Documents"
          >
            <FileText className="w-4 h-4" />
          </Link>

          <div className="flex flex-col min-w-0">
            {/* Editable Title */}
            <input 
              type="text" 
              value={title || ''}
              onChange={(e) => onTitleChange && onTitleChange(e.target.value)}
              className="text-sm font-semibold text-gray-900 bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-500 focus:bg-white rounded px-1.5 py-0.5 outline-none max-w-xs sm:max-w-sm truncate transition-colors"
              placeholder="Untitled Document"
              title="Click to rename"
            />

            {/* Menu Bar: File, Edit, Help */}
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              {/* File Menu */}
              <div className="relative">
                <button 
                  onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
                  className="px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  File
                </button>
                {activeMenu === 'file' && (
                  <div 
                    className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 text-xs"
                    onMouseLeave={() => setActiveMenu(null)}
                  >
                    <button 
                      onClick={() => { setActiveMenu(null); navigate('/dashboard'); }}
                      className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>New Document</span>
                      <Plus className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button 
                      onClick={() => { setActiveMenu(null); onExportTxt && onExportTxt(); }}
                      className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>Export as Plain Text</span>
                      <Download className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button 
                      onClick={() => { setActiveMenu(null); onExportMd && onExportMd(); }}
                      className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>Export as Markdown</span>
                      <Download className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <div className="h-px bg-gray-200 my-1"></div>
                    <button 
                      onClick={() => { setActiveMenu(null); window.print(); }}
                      className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>Print Document</span>
                      <Printer className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    {onDeleteDocument && (
                      <>
                        <div className="h-px bg-gray-200 my-1"></div>
                        <button 
                          onClick={() => { setActiveMenu(null); onDeleteDocument(); }}
                          className="w-full px-3 py-1.5 text-left hover:bg-red-50 text-red-600 flex items-center justify-between cursor-pointer font-medium"
                        >
                          <span>Delete Document</span>
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Edit Menu */}
              <div className="relative">
                <button 
                  onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
                  className="px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Edit
                </button>
                {activeMenu === 'edit' && (
                  <div 
                    className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 text-xs"
                    onMouseLeave={() => setActiveMenu(null)}
                  >
                    <button 
                      onClick={() => { setActiveMenu(null); onUndo && onUndo(); }}
                      className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>Undo</span>
                      <span className="text-gray-400 text-[10px]">Ctrl+Z</span>
                    </button>
                    <button 
                      onClick={() => { setActiveMenu(null); onRedo && onRedo(); }}
                      className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center justify-between"
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
                  className="px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Help
                </button>
                {activeMenu === 'help' && (
                  <div 
                    className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1.5 z-50 text-xs"
                    onMouseLeave={() => setActiveMenu(null)}
                  >
                    <div className="px-3 py-1.5 text-[11px] text-gray-500 border-b border-gray-100">
                      <strong>CollabAI:</strong> Real-time Operational Transformation with sub-second AI review and presence synchronization.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Workspace Feature Tabs + Live OT + Share + User */}
        <div className="flex items-center gap-2">
          {/* Cloud Save Status */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-500 mr-1">
            {saveStatus === 'saving' ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span className="text-indigo-600 text-[11px]">Syncing...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 text-[11px]">Saved</span>
              </>
            )}
          </div>

          {/* Connection Status */}
          <ConnectionStatus status={connectionStatus} />

          {/* Active Collaborators Avatars */}
          {collaborators && collaborators.length > 0 && (
            <div className="flex items-center -space-x-1.5 overflow-hidden px-1">
              {collaborators.map((c) => (
                <div
                  key={c.socketId || c.userId}
                  className="w-6 h-6 rounded-full text-white font-bold flex items-center justify-center text-[10px] shadow-xs ring-2 ring-white transition-transform hover:scale-110 hover:z-20 cursor-default"
                  style={{ backgroundColor: c.color || '#1a73e8' }}
                  title={`${c.name || c.userId} (Active Collaborator)`}
                >
                  {(c.name || c.userId).charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          )}

          {/* Workspace Feature Quick Buttons */}
          {onOpenRightTab && (
            <div className="hidden md:flex items-center gap-1 border-l border-gray-200 pl-2">
              <button
                onClick={() => onOpenRightTab('review')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  isRightPanelOpen && activeRightTab === 'review'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
                title="AI Document Review Mode"
              >
                <FileSearch className="w-3.5 h-3.5" />
                <span>Review</span>
              </button>

              <button
                onClick={() => onOpenRightTab('ask')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  isRightPanelOpen && activeRightTab === 'ask'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
                title="Ask Your Document"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ask Doc</span>
              </button>

              <button
                onClick={() => onOpenRightTab('actions')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  isRightPanelOpen && activeRightTab === 'actions'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
                title="Action Items"
              >
                <ListTodo className="w-3.5 h-3.5 text-emerald-600" />
                <span>Actions</span>
              </button>

              <button
                onClick={() => onOpenRightTab('history')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  isRightPanelOpen && activeRightTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
                title="Version History & Revisions"
              >
                <History className="w-3.5 h-3.5 text-gray-600" />
                <span>History</span>
              </button>
            </div>
          )}

          {/* Share Button */}
          <button 
            onClick={onShareClick}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-gray-600" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Delete Document Button */}
          {onDeleteDocument && (
            <button 
              onClick={onDeleteDocument}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors cursor-pointer"
              title="Delete this document"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden md:inline">Delete</span>
            </button>
          )}

          {/* User Profile Avatar */}
          {user && (
            <div 
              className="w-7 h-7 rounded-full text-white font-bold flex items-center justify-center text-xs shadow-xs ring-2 ring-white cursor-pointer"
              style={{ backgroundColor: user.color || '#4f46e5' }}
              title={`${user.name} (${user.id}) — Click to log out`}
              onClick={handleLogout}
            >
              {(user.name || user.id).charAt(0).toUpperCase()}
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
