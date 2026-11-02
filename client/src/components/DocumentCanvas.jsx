// DocumentCanvas Component - Centered Google Docs Canvas with Real-Time Cursors

import React, { useMemo } from 'react';
import CollaboratorCursors from './CollaboratorCursors.jsx';

export default function DocumentCanvas({ 
  content, 
  onChange, 
  textareaRef, 
  fontFamily = 'Inter, sans-serif',
  textAlign = 'left',
  isBold = false,
  isItalic = false,
  isUnderline = false,
  isStrike = false,
  version = 0,
  collaborators = [],
  onKeyDown,
  onCursorMove,
}) {
  const { wordCount, charCount } = useMemo(() => {
    const text = content || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { wordCount: words, charCount: text.length };
  }, [content]);

  const textDecoration = useMemo(() => {
    const decs = [];
    if (isUnderline) decs.push('underline');
    if (isStrike) decs.push('line-through');
    return decs.length > 0 ? decs.join(' ') : 'none';
  }, [isUnderline, isStrike]);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-100/80 py-8 px-4 flex flex-col items-center cursor-text relative">
      {/* Centered Document Page */}
      <div 
        className="google-doc-page rounded-sm p-12 sm:p-16 flex flex-col transition-shadow cursor-text relative"
        onClick={() => textareaRef.current && textareaRef.current.focus()}
      >
        {/* Editor Container with Cursor Overlay */}
        <div className="relative w-full min-h-[900px]">
          <CollaboratorCursors 
            collaborators={collaborators} 
            textareaRef={textareaRef} 
            content={content} 
          />
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onSelect={onCursorMove}
            onKeyUp={onCursorMove}
            onClick={onCursorMove}
            placeholder="Start typing your document... Keystrokes synchronize collaboratively in real time using Operational Transformation."
            spellCheck="true"
            style={{ 
              fontFamily, 
              textAlign: textAlign || 'left',
              fontWeight: isBold ? '700' : 'normal',
              fontStyle: isItalic ? 'italic' : 'normal',
              textDecoration,
              direction: 'ltr' 
            }}
            className="w-full min-h-[900px] bg-transparent border-none outline-none resize-none text-[15px] leading-relaxed text-gray-800 placeholder-gray-400 whitespace-pre-wrap break-words relative z-10"
          />
        </div>
      </div>

      {/* Protocol Banner */}
      <div className="mt-4 mb-16 inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/90 backdrop-blur border border-gray-200 rounded-full shadow-sm text-xs text-gray-500">
        <span className="text-gray-400">Sync Protocol:</span>
        <strong className="text-blue-600 font-medium">Operational Transformation</strong>
        <span>•</span>
        <span className="font-mono text-gray-600">v{version}</span>
      </div>

      {/* Word / Character Floating Pill */}
      <div className="fixed bottom-4 left-6 z-30 inline-flex items-center gap-2 px-3 py-1 bg-white/95 border border-gray-200 rounded-md shadow-sm text-xs text-gray-600">
        <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
        <span>•</span>
        <span>{charCount} {charCount === 1 ? 'character' : 'characters'}</span>
      </div>
    </div>
  );
}
