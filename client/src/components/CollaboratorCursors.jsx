// CollaboratorCursors Component - Real-Time Google Docs-Style Cursors & Labels
// Renders colored cursor markers, selection highlights, and collaborator name badges.

import React, { useState, useEffect, useRef } from 'react';
import { getCaretCoordinates, getSelectionRects } from '../utils/caretCoordinates.js';

export default function CollaboratorCursors({ collaborators = [], textareaRef, content }) {
  const [cursorLayouts, setCursorLayouts] = useState([]);
  const animFrameRef = useRef(null);

  // Recalculate pixel coordinates whenever content, collaborators, window, or scroll changes
  const updateLayouts = () => {
    const textarea = textareaRef?.current;
    if (!textarea || !collaborators || collaborators.length === 0) {
      setCursorLayouts([]);
      return;
    }

    const layouts = collaborators.map((col) => {
      const position = typeof col.cursor === 'number' ? col.cursor : 0;
      const coord = getCaretCoordinates(textarea, position);

      const hasSelection = typeof col.selectionStart === 'number' &&
                           typeof col.selectionEnd === 'number' &&
                           col.selectionStart !== col.selectionEnd;

      const selRects = hasSelection
        ? getSelectionRects(textarea, col.selectionStart, col.selectionEnd)
        : [];

      return {
        ...col,
        x: coord.left,
        y: coord.top,
        height: coord.height || 22,
        selectionRects: selRects
      };
    });

    setCursorLayouts(layouts);
  };

  useEffect(() => {
    updateLayouts();

    const handleUpdate = () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(updateLayouts);
    };

    const textarea = textareaRef?.current;
    if (textarea) {
      textarea.addEventListener('scroll', handleUpdate, { passive: true });
    }
    window.addEventListener('resize', handleUpdate);

    return () => {
      if (textarea) textarea.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [collaborators, content]);

  if (!cursorLayouts || cursorLayouts.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-20">
      {cursorLayouts.map((col) => {
        const color = col.color || '#1a73e8';
        const name = col.name || col.userId || 'Collaborator';

        return (
          <React.Fragment key={col.socketId || col.userId}>
            {/* 1. Selection Range Highlights */}
            {col.selectionRects?.map((rect, idx) => (
              <div
                key={`sel-${idx}`}
                style={{
                  position: 'absolute',
                  left: `${rect.left}px`,
                  top: `${rect.top}px`,
                  width: `${rect.width}px`,
                  height: `${rect.height}px`,
                  backgroundColor: color,
                  opacity: 0.22,
                  borderRadius: '2px',
                  pointerEvents: 'none'
                }}
              />
            ))}

            {/* 2. Vertical Colored Cursor Line */}
            <div
              style={{
                position: 'absolute',
                left: `${col.x}px`,
                top: `${col.y}px`,
                width: '2px',
                height: `${col.height}px`,
                backgroundColor: color,
                borderRadius: '1px',
                boxShadow: `0 0 2px ${color}80`,
                transition: 'left 0.06s ease-out, top 0.06s ease-out',
                pointerEvents: 'none'
              }}
            >
              {/* Top Accent Dot */}
              <div
                style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '-1.5px',
                  width: '5px',
                  height: '5px',
                  backgroundColor: color,
                  borderRadius: '50%'
                }}
              />
            </div>

            {/* 3. Small Colored Name Badge Label */}
            <div
              style={{
                position: 'absolute',
                left: `${col.x}px`,
                top: `${col.y - 20}px`,
                backgroundColor: color,
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 500,
                lineHeight: 1,
                padding: '2.5px 6px',
                borderRadius: '3px 3px 3px 0',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                transform: 'translateY(-1px)',
                transition: 'left 0.06s ease-out, top 0.06s ease-out',
                pointerEvents: 'none',
                userSelect: 'none'
              }}
              title={`${name} (${col.userId})`}
            >
              {name}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
