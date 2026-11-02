// RightWorkspacePanel.jsx — Tabbed Multi-Mode Intelligence & Collaboration Panel
// Houses AI Review, Ask Document, Version History, Action Items, and Writing Assistant

import React from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  History, 
  ListTodo, 
  X, 
  FileSearch,
  Wand2
} from 'lucide-react';
import AIReviewPanel from './AIReviewPanel.jsx';
import AskDocPanel from './AskDocPanel.jsx';
import VersionHistoryPanel from './VersionHistoryPanel.jsx';
import ActionItemsPanel from './ActionItemsPanel.jsx';
import AIAssistant from './AIAssistant.jsx';

const TABS = [
  { id: 'review', label: 'AI Review', icon: FileSearch },
  { id: 'ask', label: 'Ask Doc', icon: MessageSquare },
  { id: 'history', label: 'History', icon: History },
  { id: 'actions', label: 'Action Items', icon: ListTodo },
  { id: 'assistant', label: 'Writing Assist', icon: Wand2 }
];

export default function RightWorkspacePanel({
  isOpen,
  activeTab = 'review',
  onTabChange,
  onClose,
  docId,
  currentContent,
  currentVersion,
  onAcceptReviewSuggestion,
  onVersionRestored
}) {
  if (!isOpen) return null;

  return (
    <aside className="w-96 bg-white border-l border-gray-200 flex flex-col z-30 shadow-xl h-full shrink-0 transition-all">
      {/* Top Tab Bar */}
      <div className="h-12 border-b border-gray-200 flex items-center justify-between px-2 bg-gray-50/70 select-none">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-xs border border-gray-200/80 font-bold'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                }`}
                title={tab.label}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors cursor-pointer shrink-0 ml-1"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content View */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'review' && (
          <AIReviewPanel
            docId={docId}
            currentDocText={currentContent}
            onAcceptSuggestion={onAcceptReviewSuggestion}
          />
        )}

        {activeTab === 'ask' && (
          <AskDocPanel
            docId={docId}
            currentDocText={currentContent}
          />
        )}

        {activeTab === 'history' && (
          <VersionHistoryPanel
            docId={docId}
            currentContent={currentContent}
            currentVersion={currentVersion}
            onVersionRestored={onVersionRestored}
          />
        )}

        {activeTab === 'actions' && (
          <ActionItemsPanel
            docId={docId}
            currentContent={currentContent}
          />
        )}

        {activeTab === 'assistant' && (
          <AIAssistant
            isOpen={true}
            onClose={onClose}
            currentDocText={currentContent}
            onApplySuggestion={onAcceptReviewSuggestion}
          />
        )}
      </div>
    </aside>
  );
}
