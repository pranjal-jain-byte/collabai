// AskDocPanel.jsx — Document-Aware AI Conversation Panel
// Answers questions strictly grounded in document content with citations

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  User, 
  Trash2, 
  AlertCircle, 
  RefreshCw,
  Quote,
  HelpCircle
} from 'lucide-react';
import { api } from '../services/api.js';

const SUGGESTED_QUESTIONS = [
  "Summarize this document in 3 bullet points.",
  "What are the most important decisions or specifications?",
  "Which requirements appear incomplete or unstated?",
  "Find any contradictory statements or ambiguous terms.",
  "What should the team do next based on this document?"
];

export default function AskDocPanel({ docId, currentDocText }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'I am your document-aware AI collaborator. Ask me anything about this document, request summaries, or inspect key decisions.',
      timestamp: new Date()
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (queryToSend = inputQuery) => {
    const q = (queryToSend || '').trim();
    if (!q || isLoading) return;

    setError(null);
    setInputQuery('');

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.askDocument(docId, {
        query: q,
        history
      });

      const assistantMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.answer || 'No response generated.',
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Ask Doc error:', err);
      setError(err.message || 'Failed to process document query. Check backend connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Conversation cleared. What would you like to explore in this document?',
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-800">
      {/* Header with clear button */}
      <div className="p-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
          <Bot className="w-4 h-4 text-indigo-600" />
          <span>Ask Your Document</span>
        </div>
        <button
          onClick={handleClearHistory}
          className="text-xs text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
          title="Clear Conversation History"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-purple-100 text-purple-700 border border-purple-200'
              }`}
            >
              {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap break-words ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-xs'
                  : 'bg-gray-100 text-gray-800 border border-gray-200/80 rounded-bl-xs'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center text-xs shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-gray-100 border border-gray-200 p-3 rounded-xl rounded-bl-xs flex items-center gap-1.5 text-xs text-gray-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Analyzing document context...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Pills */}
      <div className="px-3.5 py-2 border-t border-gray-100 bg-gray-50/40">
        <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 mb-1.5">
          <HelpCircle className="w-3 h-3 text-indigo-500" />
          <span>Suggested prompts:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={isLoading}
              className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-gray-700 border border-gray-200 rounded-full text-[11px] whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-2 bg-gray-50 border border-gray-300 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 rounded-xl p-2 transition-all">
          <textarea
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this document..."
            rows={2}
            className="flex-1 bg-transparent border-none outline-none resize-none text-xs text-gray-800 placeholder-gray-400 leading-relaxed"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !inputQuery.trim()}
            className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer shrink-0"
            title="Send query"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1 px-1">
          <span>Answers grounded strictly in document content</span>
          <span>Press Enter to send</span>
        </div>
      </div>
    </div>
  );
}
