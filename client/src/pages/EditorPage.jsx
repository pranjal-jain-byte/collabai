// EditorPage Component — Premium SaaS Collaborative Editor
// Integrates Left Sidebar, Central OT Canvas with Cursors, and Right AI/Version History/Actions Workspace Panel

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import EditorToolbar from '../components/EditorToolbar.jsx';
import DocumentCanvas from '../components/DocumentCanvas.jsx';
import Sidebar from '../components/Sidebar.jsx';
import RightWorkspacePanel from '../components/RightWorkspacePanel.jsx';
import ConflictNotification from '../components/ConflictNotification.jsx';
import ShareDialog from '../components/ShareDialog.jsx';
import { useDocument } from '../hooks/useDocument.js';
import { useSocket } from '../hooks/useSocket.js';
import { useAuth } from '../hooks/useAuth.jsx';

export default function EditorPage() {
  const { docId: paramDocId } = useParams();
  const docId = paramDocId || 'test-doc';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connectionStatus } = useSocket();

  const {
    content,
    title,
    version,
    saveStatus,
    loading,
    error,
    collaborators,
    retry,
    textareaRef,
    handleContentChange,
    handleTitleChange,
    handleCursorActivity,
    applyFullText,
    applySubText,
    undo,
    redo,
    canUndo,
    canRedo,
    activeFormatting,
    syncActiveFormatting,
    handleToggleList,
    handleSetHeading,
    handleEditorKeyDown,
  } = useDocument(docId);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState('review');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [textAlign, setTextAlign] = useState('left');

  const handleOpenRightTab = (tabId) => {
    if (isRightPanelOpen && activeRightTab === tabId) {
      setIsRightPanelOpen(false);
    } else {
      setActiveRightTab(tabId);
      setIsRightPanelOpen(true);
    }
  };

  // Export handlers
  const handleExport = (mimeType, ext) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'document').toLowerCase().replace(/[^a-z0-9]/gi, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Conflict merge handler
  const handleApplyConflictMerge = (original, replacement) => {
    if (content.includes(original)) {
      const updated = content.replace(original, replacement);
      applyFullText(updated);
    }
  };

  return (
    <div className="h-screen flex bg-slate-900 overflow-hidden font-sans">
      {/* Left Collapsible Workspace Sidebar */}
      <Sidebar
        currentDocId={docId}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main App Column */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-100 overflow-hidden">
        {/* Top Workspace Bar */}
        <Navbar
          mode="editor"
          title={title}
          onTitleChange={handleTitleChange}
          saveStatus={saveStatus}
          connectionStatus={connectionStatus}
          collaborators={collaborators}
          onShareClick={() => setIsShareOpen(true)}
          onUndo={undo}
          onRedo={redo}
          onExportTxt={() => handleExport('text/plain', 'txt')}
          onExportMd={() => handleExport('text/markdown', 'md')}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          activeRightTab={activeRightTab}
          isRightPanelOpen={isRightPanelOpen}
          onOpenRightTab={handleOpenRightTab}
        />

        {/* Formatting Toolbar */}
        <EditorToolbar
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onSetHeading={handleSetHeading}
          activeHeading={activeFormatting.heading}
          onToggleList={handleToggleList}
          isNumberedList={activeFormatting.isNumbered}
          isBulletedList={activeFormatting.isBulleted}
          onFontChange={setFontFamily}
          fontFamily={fontFamily}
          onAlignChange={setTextAlign}
          textAlign={textAlign}
          onAiPromptClick={() => handleOpenRightTab('assistant')}
        />

        {/* Connection / Load Error Banner */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-2 flex items-center justify-between text-xs text-red-700 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>
                {error} (Doc ID: <span className="font-mono font-medium">{docId}</span>)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={retry}
                className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Retry Loading
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-md font-medium transition-colors cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Editor & Multi-Panel Workspace Body */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Centered Google Docs Canvas with Colored Cursors */}
          <DocumentCanvas
            content={content}
            onChange={handleContentChange}
            textareaRef={textareaRef}
            fontFamily={fontFamily}
            textAlign={textAlign}
            version={version}
            collaborators={collaborators}
            onKeyDown={handleEditorKeyDown}
            onCursorMove={handleCursorActivity}
          />

          {/* Right Workspace Intelligence Panel */}
          <RightWorkspacePanel
            isOpen={isRightPanelOpen}
            activeTab={activeRightTab}
            onTabChange={setActiveRightTab}
            onClose={() => setIsRightPanelOpen(false)}
            docId={docId}
            currentContent={content}
            currentVersion={version}
            onAcceptReviewSuggestion={applySubText}
            onVersionRestored={(newText) => applyFullText(newText)}
          />
        </div>

        {/* Semantic Conflict Notification Toast */}
        <ConflictNotification onApplyMerge={handleApplyConflictMerge} />

        {/* Share Dialog */}
        <ShareDialog
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          docId={docId}
          title={title}
        />
      </div>
    </div>
  );
}
