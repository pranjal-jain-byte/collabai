// EditorPage Component - Complete Google Docs Experience with Real-Time OT

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import EditorToolbar from '../components/EditorToolbar.jsx';
import DocumentCanvas from '../components/DocumentCanvas.jsx';
import AIAssistant from '../components/AIAssistant.jsx';
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

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [textAlign, setTextAlign] = useState('left');

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
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden font-sans">
      {/* Top Application Bar */}
      <Navbar
        mode="editor"
        title={title}
        onTitleChange={handleTitleChange}
        saveStatus={saveStatus}
        connectionStatus={connectionStatus}
        collaborators={collaborators}
        onShareClick={() => setIsShareOpen(true)}
        isAiOpen={isAiOpen}
        onAiToggle={() => setIsAiOpen(!isAiOpen)}
        onUndo={undo}
        onRedo={redo}
        onExportTxt={() => handleExport('text/plain', 'txt')}
        onExportMd={() => handleExport('text/markdown', 'md')}
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
        onAiPromptClick={() => setIsAiOpen(true)}
      />

      {/* Connection / Load Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 flex items-center justify-between text-xs text-red-700 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
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

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden relative">
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

        {/* Collapsible Gemini AI Drawer */}
        <AIAssistant
          isOpen={isAiOpen}
          onClose={() => setIsAiOpen(false)}
          currentDocText={content}
          onApplySuggestion={(suggested) => applyFullText(suggested)}
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
  );
}
