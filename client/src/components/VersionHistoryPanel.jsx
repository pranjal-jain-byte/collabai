// VersionHistoryPanel.jsx — Durable Version History, Timeline & Revision Restoration
// Allows previewing past versions, visual diff comparison, and restoring via OT

import React, { useState, useEffect } from 'react';
import { 
  History, 
  RotateCcw, 
  BookmarkPlus, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  X, 
  ChevronRight,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api.js';

export default function VersionHistoryPanel({ docId, currentContent, currentVersion, onVersionRestored }) {
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCreatingCheckpoint, setIsCreatingCheckpoint] = useState(false);
  const [checkpointLabel, setCheckpointLabel] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const fetchVersions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await api.getVersions(docId);
      setVersions(list);
      if (list.length > 0 && !selectedVersion) {
        setSelectedVersion(list[0]);
      }
    } catch (err) {
      console.error('Fetch versions error:', err);
      setError(err.message || 'Failed to load version history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [docId, currentVersion]);

  const handleCreateCheckpoint = async (e) => {
    e.preventDefault();
    if (!checkpointLabel.trim()) return;

    try {
      await api.createVersion(docId, {
        label: checkpointLabel.trim(),
        summary: `Manual checkpoint milestone (${currentContent.length} chars)`,
        authorName: localStorage.getItem('collabai_user_name') || 'You'
      });
      setCheckpointLabel('');
      setIsCreatingCheckpoint(false);
      setToastMessage('Milestone checkpoint created successfully!');
      setTimeout(() => setToastMessage(null), 4000);
      fetchVersions();
    } catch (err) {
      setError('Failed to create checkpoint: ' + err.message);
    }
  };

  const handleRestore = async (version) => {
    if (!window.confirm(`Restore document to version ${version.version} ("${version.label}")?\n\nThis will apply changes as a new revision without erasing any subsequent edit history.`)) {
      return;
    }

    setIsRestoring(true);
    try {
      const res = await api.restoreVersion(docId, version._id, {
        authorName: localStorage.getItem('collabai_user_name') || 'Collaborator'
      });
      setToastMessage(`Restored to v${version.version}! Created new version ${res.version}.`);
      setTimeout(() => setToastMessage(null), 5000);
      if (onVersionRestored) {
        onVersionRestored(res.content);
      }
      fetchVersions();
    } catch (err) {
      setError('Restore failed: ' + err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  // Simple line diff calculation between selected version and current document
  const computeDiff = (oldText, newText) => {
    const oldLines = (oldText || '').split('\n');
    const newLines = (newText || '').split('\n');
    const result = [];

    const max = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < max; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === newLine) {
        if (oldLine !== undefined) result.push({ type: 'same', text: oldLine });
      } else {
        if (oldLine !== undefined) result.push({ type: 'removed', text: oldLine });
        if (newLine !== undefined) result.push({ type: 'added', text: newLine });
      }
    }
    return result;
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-800">
      {/* Header */}
      <div className="p-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
          <History className="w-4 h-4 text-indigo-600" />
          <span>Version History</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsCreatingCheckpoint(!isCreatingCheckpoint)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
            title="Create labeled checkpoint"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Checkpoint</span>
          </button>
          <button
            onClick={fetchVersions}
            disabled={isLoading}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors cursor-pointer"
            title="Refresh history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Checkpoint Creation Modal/Form */}
      {isCreatingCheckpoint && (
        <form onSubmit={handleCreateCheckpoint} className="p-3 bg-indigo-50/60 border-b border-indigo-100 space-y-2">
          <label className="block text-xs font-semibold text-indigo-900">
            Create Milestone Checkpoint
          </label>
          <input
            type="text"
            value={checkpointLabel}
            onChange={(e) => setCheckpointLabel(e.target.value)}
            placeholder="e.g., Final Client Review, Sprint 4 Specs..."
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-500"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreatingCheckpoint(false)}
              className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-800 rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!checkpointLabel.trim()}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded text-xs font-medium shadow-xs transition-colors cursor-pointer"
            >
              Save Milestone
            </button>
          </div>
        </form>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="mx-3 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mx-3 mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Timeline List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {isLoading && versions.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">Loading revisions...</div>
        ) : versions.length > 0 ? (
          versions.map((ver) => {
            const isSelected = selectedVersion?._id === ver._id;
            return (
              <div
                key={ver._id || ver.version}
                onClick={() => setSelectedVersion(ver)}
                className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/50 border-indigo-300 shadow-xs'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-gray-100 text-gray-700 border border-gray-200">
                      v{ver.version}
                    </span>
                    <span className="font-semibold text-gray-900 truncate">
                      {ver.label || `Revision ${ver.version}`}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {new Date(ver.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                  <span className="flex items-center gap-1 truncate">
                    <User className="w-3 h-3 text-gray-400" />
                    {ver.authorName || 'Collaborator'}
                  </span>
                  <span>{(ver.content || '').length} chars</span>
                </div>

                {ver.summary && (
                  <p className="text-[11px] text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {ver.summary}
                  </p>
                )}

                {/* Restore / Preview buttons when selected */}
                {isSelected && (
                  <div className="mt-3 pt-2 border-t border-indigo-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-indigo-600 font-medium">Selected for preview</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(ver);
                      }}
                      disabled={isRestoring}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded text-xs font-medium shadow-xs transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{isRestoring ? 'Restoring...' : 'Restore'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-xs text-gray-400">
            No revisions recorded yet. Revisions are created automatically as you write or when saving milestones.
          </div>
        )}
      </div>

      {/* Live Diff Preview Drawer at Bottom */}
      {selectedVersion && (
        <div className="border-t border-gray-200 bg-gray-50 p-3 max-h-52 overflow-y-auto">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-2">
            <span>Diff preview against current canvas:</span>
            <span className="font-mono text-[10px] text-gray-500">v{selectedVersion.version}</span>
          </div>
          <div className="font-mono text-[11px] space-y-0.5 bg-white p-2.5 rounded-lg border border-gray-200 leading-relaxed overflow-x-auto">
            {computeDiff(selectedVersion.content, currentContent).map((diff, idx) => (
              <div
                key={idx}
                className={
                  diff.type === 'added'
                    ? 'bg-emerald-50 text-emerald-800'
                    : diff.type === 'removed'
                    ? 'bg-rose-50 text-rose-800 line-through opacity-75'
                    : 'text-gray-600'
                }
              >
                {diff.type === 'added' ? '+ ' : diff.type === 'removed' ? '- ' : '  '}
                {diff.text || ' '}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
