// EditorToolbar Component - Google Docs Formatting Bar

import React from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  List, 
  ListOrdered, 
  Undo2, 
  Redo2, 
  Sparkles,
  Info
} from 'lucide-react';

export default function EditorToolbar({ 
  onUndo, 
  onRedo, 
  canUndo = false,
  canRedo = false,
  onSetHeading,
  activeHeading = 'normal',
  onToggleList,
  isNumberedList = false,
  isBulletedList = false,
  onFontChange, 
  fontFamily = 'Inter, sans-serif',
  onAlignChange, 
  textAlign = 'left',
  onToggleBold,
  isBold = false,
  onToggleItalic,
  isItalic = false,
  onToggleUnderline,
  isUnderline = false,
  onToggleStrike,
  isStrike = false,
  onAiPromptClick 
}) {
  return (
    <div className="bg-gray-50/95 backdrop-blur border-b border-gray-200 px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto select-none sticky top-16 z-40">
      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button 
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-1.5 rounded transition-colors ${
            canUndo 
              ? 'hover:bg-gray-200 text-gray-700 cursor-pointer' 
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button 
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-1.5 rounded transition-colors ${
            canRedo 
              ? 'hover:bg-gray-200 text-gray-700 cursor-pointer' 
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-5 bg-gray-300 mx-1"></div>

      {/* Paragraph Style / Headings Dropdown */}
      <div className="flex items-center">
        <select 
          value={activeHeading || 'normal'}
          onChange={(e) => onSetHeading && onSetHeading(e.target.value)}
          className="text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded px-2.5 py-1 outline-none cursor-pointer transition-colors"
          title="Paragraph Style / Heading Level"
        >
          <option value="normal">Normal text</option>
          <option value="title">Title</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
      </div>

      <div className="w-px h-5 bg-gray-300 mx-1"></div>

      {/* Font Family Dropdown */}
      <div className="flex items-center">
        <select 
          value={fontFamily}
          onChange={(e) => onFontChange && onFontChange(e.target.value)}
          className="text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded px-2.5 py-1 outline-none cursor-pointer transition-colors"
          title="Font Family"
        >
          <option value="Inter, sans-serif">Inter</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="'Roboto', sans-serif">Roboto</option>
          <option value="'Georgia', serif">Georgia</option>
          <option value="'Fira Code', monospace">Monospace</option>
        </select>
      </div>

      <div className="w-px h-5 bg-gray-300 mx-1"></div>

      {/* Text Styles: Bold, Italic, Underline, Strikethrough */}
      <div className="flex items-center gap-0.5">
        <button 
          onClick={onToggleBold}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            isBold 
              ? 'bg-indigo-100 text-indigo-700 font-bold border border-indigo-200' 
              : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button 
          onClick={onToggleItalic}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            isItalic 
              ? 'bg-indigo-100 text-indigo-700 font-bold border border-indigo-200' 
              : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button 
          onClick={onToggleUnderline}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            isUnderline 
              ? 'bg-indigo-100 text-indigo-700 font-bold border border-indigo-200' 
              : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button 
          onClick={onToggleStrike}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            isStrike 
              ? 'bg-indigo-100 text-indigo-700 font-bold border border-indigo-200' 
              : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-5 bg-gray-300 mx-1"></div>

      {/* Text Alignment */}
      <div className="flex items-center gap-0.5">
        <button 
          onClick={() => onAlignChange && onAlignChange('left')}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            textAlign === 'left' ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Align Left (Default)"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onAlignChange && onAlignChange('center')}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            textAlign === 'center' ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onAlignChange && onAlignChange('right')}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            textAlign === 'right' ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-5 bg-gray-300 mx-1"></div>

      {/* Bulleted & Numbered Lists */}
      <div className="flex items-center gap-0.5">
        <button 
          onClick={() => onToggleList && onToggleList('bulleted')}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            isBulletedList ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Bulleted List"
        >
          <List className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onToggleList && onToggleList('numbered')}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            isNumberedList ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-200 text-gray-700'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-5 bg-gray-300 mx-1"></div>

      {/* AI Trigger */}
      <button 
        onClick={onAiPromptClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded transition-colors cursor-pointer"
        title="Check for typos & stylistic refinements with Gemini"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>AI Check</span>
      </button>

      {/* Format Mode Pill */}
      <div className="ml-auto flex items-center gap-1 text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
        <Info className="w-3 h-3 text-blue-500" />
        <span>Plain-Text OT Sync</span>
      </div>
    </div>
  );
}
