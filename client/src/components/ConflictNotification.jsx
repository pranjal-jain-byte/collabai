// ConflictNotification Component - Real-time Semantic Conflict Resolution Banner

import React, { useState, useEffect } from 'react';
import { Zap, Check, X } from 'lucide-react';
import { socketService } from '../services/socket.js';

export default function ConflictNotification({ onApplyMerge }) {
  const [conflict, setConflict] = useState(null);

  useEffect(() => {
    const unsub = socketService.on('conflict-suggestion', (data) => {
      console.log('[ConflictNotification] Received conflict:', data);
      setConflict(data);
    });

    return () => unsub();
  }, []);

  if (!conflict) return null;

  const handleMerge = () => {
    if (onApplyMerge && conflict.original && conflict.suggestion) {
      onApplyMerge(conflict.original, conflict.suggestion);
    }
    setConflict(null);
  };

  return (
    <div className="fixed top-20 right-6 z-50 w-96 bg-amber-50 border-l-4 border-amber-500 rounded-lg shadow-xl p-4 text-xs space-y-3 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-amber-900">
          <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
          <span>Concurrent Edit Conflict Detected</span>
        </div>
        <button 
          onClick={() => setConflict(null)}
          className="text-amber-500 hover:text-amber-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-amber-800 leading-relaxed">
        Two collaborators edited overlapping text concurrently. Gemini recommends this unified merge:
      </p>

      <div className="p-2 bg-white/80 rounded border border-amber-200 text-gray-500 italic">
        <strong>Original:</strong> "{conflict.original.trim()}"
      </div>

      <div className="p-2.5 bg-white rounded border border-gray-200 text-gray-900 font-medium leading-relaxed">
        <strong>Suggested Merge:</strong> {conflict.suggestion}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleMerge}
          className="flex-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded shadow-sm transition-colors flex items-center justify-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Apply Merged Version</span>
        </button>
        <button
          onClick={() => setConflict(null)}
          className="py-1.5 px-3 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-medium rounded transition-colors"
        >
          Keep Current
        </button>
      </div>
    </div>
  );
}
