// AIReviewPanel.jsx — Deep AI Document Review across 7 core dimensions
// Validates text integrity and applies changes safely through Operational Transformation

import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  RefreshCw, 
  AlertTriangle, 
  Filter, 
  BookOpen, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api.js';

const CATEGORIES = [
  { id: 'all', label: 'All Issues' },
  { id: 'Clarity', label: 'Clarity', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'Grammar', label: 'Grammar', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'Structure', label: 'Structure', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'Contradictions', label: 'Contradictions', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { id: 'Missing information', label: 'Missing Info', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'Unsupported claims', label: 'Unsupported', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'Redundancy', label: 'Redundancy', color: 'bg-gray-100 text-gray-700 border-gray-200' }
];

export default function AIReviewPanel({ docId, currentDocText, onAcceptSuggestion }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [staleWarnings, setStaleWarnings] = useState({});
  const [acceptedIds, setAcceptedIds] = useState(new Set());
  const [hasRun, setHasRun] = useState(false);

  const handleRunReview = async () => {
    if (!currentDocText || currentDocText.trim().length === 0) {
      setError('Document is currently empty. Add content to run an AI review.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStaleWarnings({});

    try {
      const res = await api.reviewDocument(docId, {
        categoryFilter: selectedCategory
      });
      setSuggestions(res.suggestions || []);
      setHasRun(true);
    } catch (err) {
      console.error('AI Review failure:', err);
      setError(err.message || 'Failed to complete AI review. Verify backend and API configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = (item) => {
    // 1. Verify original text still exists in document (stale protection)
    if (!currentDocText.includes(item.originalText)) {
      setStaleWarnings((prev) => ({
        ...prev,
        [item.id]: 'Target text was modified by concurrent edits. Re-run review to analyze new content.'
      }));
      return;
    }

    // 2. Safely apply through OT editor bridge
    const success = onAcceptSuggestion(item.originalText, item.suggestedText);
    if (success !== false) {
      setAcceptedIds((prev) => new Set([...prev, item.id]));
      setSuggestions((prev) => prev.filter((s) => s.id !== item.id));
    }
  };

  const handleReject = (itemId) => {
    // Rejection leaves document completely untouched
    setSuggestions((prev) => prev.filter((s) => s.id !== itemId));
  };

  const filteredSuggestions = selectedCategory === 'all'
    ? suggestions
    : suggestions.filter((s) => s.category?.toLowerCase() === selectedCategory.toLowerCase());

  const getCategoryBadge = (cat) => {
    const matched = CATEGORIES.find((c) => c.id.toLowerCase() === (cat || '').toLowerCase());
    return matched ? matched.color : 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-800">
      {/* Category Pills & Run Trigger */}
      <div className="p-4 border-b border-gray-200 space-y-3 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Review Dimensions</span>
          </div>
          <button
            onClick={handleRunReview}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Analyzing...' : hasRun ? 'Re-run Review' : 'Run Full Review'}</span>
          </button>
        </div>

        {/* Categories scrollable pill row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{error}</p>
        </div>
      )}

      {/* Suggestion list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-medium text-gray-700">Evaluating 7 review dimensions...</p>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Scanning for grammar, clarity, structural gaps, and semantic contradictions.
            </p>
          </div>
        ) : filteredSuggestions.length > 0 ? (
          filteredSuggestions.map((item) => (
            <div
              key={item.id}
              className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-xs hover:border-indigo-300 transition-all space-y-2.5"
            >
              {/* Category & Title */}
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getCategoryBadge(item.category)}`}>
                  {item.category}
                </span>
                <span className="text-xs font-semibold text-gray-900 truncate flex-1 text-right">
                  {item.title}
                </span>
              </div>

              {/* Original text snippet */}
              {item.originalText && (
                <div className="p-2 rounded-md bg-rose-50/60 border border-rose-100 text-xs text-rose-900 font-mono break-words leading-relaxed">
                  <span className="font-bold text-[10px] uppercase text-rose-600 block mb-0.5">Original Snippet</span>
                  &ldquo;{item.originalText}&rdquo;
                </div>
              )}

              {/* Replacement suggestion */}
              {item.suggestedText ? (
                <div className="p-2 rounded-md bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-900 font-mono break-words leading-relaxed">
                  <span className="font-bold text-[10px] uppercase text-emerald-600 block mb-0.5">Suggested Improvement</span>
                  {item.suggestedText}
                </div>
              ) : null}

              {/* Explanation */}
              <p className="text-xs text-gray-600 leading-relaxed">
                {item.explanation}
              </p>

              {/* Stale Warning Notice */}
              {staleWarnings[item.id] && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 flex items-start gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{staleWarnings[item.id]}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                {item.suggestedText && (
                  <button
                    onClick={() => handleAccept(item)}
                    className="flex-1 py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept Fix</span>
                  </button>
                )}
                <button
                  onClick={() => handleReject(item.id)}
                  className="py-1 px-3 bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-md text-xs font-medium transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 inline mr-1" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          ))
        ) : hasRun ? (
          <div className="py-16 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-semibold text-gray-800">Clear & High Quality</h4>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              No issues detected in category &ldquo;{selectedCategory}&rdquo;. Your writing adheres to clarity and structural standards.
            </p>
          </div>
        ) : (
          <div className="py-16 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-indigo-400 mx-auto" />
            <h4 className="text-sm font-semibold text-gray-800">AI Review Mode</h4>
            <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
              Click &ldquo;Run Full Review&rdquo; to analyze clarity, grammar, contradictions, unsupported claims, and structural flow.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
