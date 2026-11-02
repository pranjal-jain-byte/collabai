// ActionItemsPanel.jsx — Turn Documents into Structured Action Items
// Powered by Groq AI extraction with real-time persistent task tracking

import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Square, 
  Sparkles, 
  Plus, 
  Trash2, 
  User, 
  Calendar, 
  Link2, 
  HelpCircle, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  ListTodo
} from 'lucide-react';
import { api } from '../services/api.js';

export default function ActionItemsPanel({ docId, currentContent }) {
  const [actionItems, setActionItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchActionItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await api.getActionItems(docId);
      setActionItems(items);
    } catch (err) {
      console.error('Fetch actions error:', err);
      setError(err.message || 'Failed to load action items.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActionItems();
  }, [docId]);

  const handleExtract = async () => {
    if (!currentContent || currentContent.trim().length === 0) {
      setError('Document is currently empty. Add notes or specifications to extract tasks.');
      return;
    }

    setIsExtracting(true);
    setError(null);
    try {
      const extracted = await api.extractActionItems(docId);
      if (extracted.length === 0) {
        setError('No explicit tasks with assignees or deadlines were detected in this document.');
      } else {
        fetchActionItems();
      }
    } catch (err) {
      console.error('Action extraction failure:', err);
      setError(err.message || 'AI action extraction failed. Verify AI API configuration.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
    // Optimistic UI update
    setActionItems((prev) =>
      prev.map((a) => (a._id === item._id ? { ...a, status: nextStatus } : a))
    );

    try {
      await api.updateActionItem(docId, item._id, { status: nextStatus });
    } catch (err) {
      console.error('Update status error:', err);
      fetchActionItems(); // rollback
    }
  };

  const handleDelete = async (itemId) => {
    setActionItems((prev) => prev.filter((a) => a._id !== itemId));
    try {
      await api.deleteActionItem(docId, itemId);
    } catch (err) {
      console.error('Delete item error:', err);
      fetchActionItems();
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    try {
      const created = await api.createActionItem(docId, {
        task: newTaskText.trim(),
        assignee: newAssignee.trim(),
        dueDate: newDueDate.trim()
      });
      setActionItems((prev) => [created, ...prev]);
      setNewTaskText('');
      setNewAssignee('');
      setNewDueDate('');
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to create action item: ' + err.message);
    }
  };

  const completedCount = actionItems.filter((a) => a.status === 'completed').length;
  const progressPercent = actionItems.length > 0 ? Math.round((completedCount / actionItems.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-white text-gray-800">
      {/* Header */}
      <div className="p-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
          <ListTodo className="w-4 h-4 text-indigo-600" />
          <span>Action Items</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1 text-gray-500 hover:text-gray-700 rounded-md transition-colors cursor-pointer"
            title="Add task manually"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleExtract}
            disabled={isExtracting}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md text-xs font-medium shadow-xs transition-colors cursor-pointer"
            title="Extract tasks with AI"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isExtracting ? 'animate-spin' : ''}`} />
            <span>{isExtracting ? 'Extracting...' : 'AI Extract'}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {actionItems.length > 0 && (
        <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 flex items-center gap-3">
          <div className="flex-1 bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-gray-600">
            {completedCount}/{actionItems.length} ({progressPercent}%)
          </span>
        </div>
      )}

      {/* Manual Task Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddTask} className="p-3.5 bg-indigo-50/50 border-b border-indigo-100 space-y-2">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-500"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              placeholder="Assignee (e.g. Sarah)"
              className="px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-md outline-none"
            />
            <input
              type="text"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              placeholder="Due date (e.g. Friday)"
              className="px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-md outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTaskText.trim()}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded text-xs font-medium cursor-pointer"
            >
              Add Task
            </button>
          </div>
        </form>
      )}

      {/* Error alert */}
      {error && (
        <div className="m-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-1.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{error}</p>
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {isLoading && actionItems.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">Loading action items...</div>
        ) : actionItems.length > 0 ? (
          actionItems.map((item) => {
            const isDone = item.status === 'completed';
            return (
              <div
                key={item._id}
                className={`p-3 rounded-xl border transition-all space-y-2 ${
                  isDone
                    ? 'bg-gray-50/70 border-gray-200 opacity-70'
                    : 'bg-white border-gray-200 hover:border-gray-300 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <button
                    onClick={() => handleToggleStatus(item)}
                    className="mt-0.5 text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer shrink-0"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400 hover:text-indigo-600" />
                    )}
                  </button>

                  <div className="flex-1 text-xs leading-relaxed">
                    <p className={`font-medium ${isDone ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {item.task}
                    </p>

                    {/* Metadata pills */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {item.assignee && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <User className="w-2.5 h-2.5" />
                          <span>{item.assignee}</span>
                        </span>
                      )}
                      {item.dueDate && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{item.dueDate}</span>
                        </span>
                      )}
                    </div>

                    {/* Dependencies / Open questions if present */}
                    {item.dependencies && item.dependencies.length > 0 && (
                      <div className="mt-1.5 text-[10px] text-gray-500 flex items-center gap-1">
                        <Link2 className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>Depends on: {item.dependencies.join(', ')}</span>
                      </div>
                    )}
                    {item.openQuestions && item.openQuestions.length > 0 && (
                      <div className="mt-1 text-[10px] text-purple-600 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-purple-400 shrink-0" />
                        <span>Open question: {item.openQuestions.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(item._id)}
                    className="text-gray-300 hover:text-rose-500 p-1 transition-colors cursor-pointer shrink-0"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-16 text-center space-y-3">
            <CheckSquare className="w-10 h-10 text-indigo-400 mx-auto" />
            <h4 className="text-sm font-semibold text-gray-800">No Action Items Yet</h4>
            <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
              Click &ldquo;AI Extract&rdquo; to automatically identify tasks, assignees, and deadlines from this document, or add tasks manually above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
