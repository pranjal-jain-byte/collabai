// AIAssistant Component - Google Gemini Writing Assistant Drawer

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { socketService } from '../services/socket.js';

export default function AIAssistant({ isOpen, onClose, currentDocText, onApplySuggestion }) {
  const [suggestion, setSuggestion] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubChunk = socketService.on('suggestion-chunk', (chunk) => {
      setIsStreaming(true);
      setError(null);
      setSuggestion((prev) => prev + chunk);
    });

    const unsubDone = socketService.on('suggestion-done', () => {
      setIsStreaming(false);
    });

    const unsubErr = socketService.on('suggestion-error', ({ message }) => {
      setIsStreaming(false);
      setError(message || 'Suggestion failed');
    });

    return () => {
      unsubChunk();
      unsubDone();
      unsubErr();
    };
  }, []);

  const handleRequestSuggestion = () => {
    if (!currentDocText || currentDocText.trim().length === 0) {
      setError('Document is empty. Enter some text first.');
      return;
    }
    setSuggestion('');
    setError(null);
    setIsStreaming(true);
    socketService.requestSuggestion(currentDocText);
  };

  const handleApply = () => {
    if (suggestion) {
      onApplySuggestion(suggestion);
      setSuggestion('');
    }
  };

  const handleDismiss = () => {
    setSuggestion('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <aside className="w-88 bg-white border-l border-gray-200 flex flex-col z-40 shadow-xl h-full transition-all">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <span className="font-semibold text-gray-900 text-sm">AI Assistant</span>
          <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 rounded-full">
            Groq Llama
          </span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
          title="Close AI Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleRequestSuggestion}
            disabled={isStreaming}
            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors flex items-center gap-2.5 text-xs font-medium text-gray-800"
          >
            <Check className="w-4 h-4 text-blue-600" />
            <span>Fix Typos & Grammar</span>
          </button>
          <button
            onClick={handleRequestSuggestion}
            disabled={isStreaming}
            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors flex items-center gap-2.5 text-xs font-medium text-gray-800"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Polish & Refine Style</span>
          </button>
        </div>

        {/* Suggestion Result Box */}
        {(suggestion || isStreaming) && (
          <div className="p-3.5 bg-purple-50/40 border border-purple-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-purple-800">
              <span>{isStreaming ? 'Generating refinement...' : 'AI Suggestion'}</span>
              {isStreaming && (
                <span className="flex items-center gap-1 text-[11px] text-purple-600 font-normal">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Streaming
                </span>
              )}
            </div>

            <div className="text-xs text-gray-800 bg-white p-3 rounded-lg border border-purple-100 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {suggestion}
              {isStreaming && <span className="inline-block w-1.5 h-3.5 bg-purple-600 animate-pulse ml-0.5 align-middle"></span>}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleApply}
                disabled={isStreaming}
                className="flex-1 py-1.5 px-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-medium rounded-md shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply to Document</span>
              </button>
              <button
                onClick={handleDismiss}
                className="py-1.5 px-3 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-medium rounded-md transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong>AI Note:</strong> {error}
            </div>
          </div>
        )}

        {/* Proactive Helper Note */}
        {!suggestion && !isStreaming && !error && (
          <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-center space-y-2 text-xs text-gray-500">
            <Sparkles className="w-6 h-6 text-purple-400 mx-auto" />
            <p className="font-medium text-gray-700">Proactive Writing Assistance</p>
            <p className="leading-relaxed">
              CollabAI automatically checks for garbled text and typos after pauses in typing, or click an action above to review improvements.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
