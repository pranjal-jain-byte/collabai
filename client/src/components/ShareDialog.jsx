// ShareDialog Component - Document Sharing Modal with Transparent Security Disclosures

import React, { useState } from 'react';
import { Share2, X, Copy, Check, Users } from 'lucide-react';

export default function ShareDialog({ isOpen, onClose, docId, title }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/doc/${docId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      // Fallback
      const input = document.getElementById('share-link-input');
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900 text-base">Share "{title || 'Untitled Document'}"</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Direct Collaboration Link
            </label>
            <div className="flex items-center gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded-lg">
              <input 
                id="share-link-input"
                type="text" 
                value={shareUrl}
                readOnly
                className="flex-1 bg-transparent border-none text-xs text-gray-700 px-2 outline-none font-mono"
              />
              <button
                onClick={handleCopy}
                className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Transparent Access Disclosure */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-gray-800">
              <Users className="w-4 h-4 text-gray-500" />
              <span>Access Control Disclosure</span>
            </div>
            <p>
              CollabAI uses an open document room model. Any collaborator with a valid session who holds this link can view and edit concurrently in real time. Private document invitations and granular ACLs are scheduled for future milestones.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-medium rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
