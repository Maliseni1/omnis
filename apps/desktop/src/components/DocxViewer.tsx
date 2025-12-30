import React, { useRef, useEffect, useState } from 'react';

interface DocxViewerProps {
  content: string;
  isEditable: boolean;
  onUpdate: (html: string) => void;
}

export const DocxViewer: React.FC<DocxViewerProps> = ({ content, isEditable, onUpdate }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; url: string | null }>({ x: 0, y: 0, url: null });

  // Handle content updates while preserving cursor position
  useEffect(() => {
    if (contentRef.current) {
        // Only sync if not editable (view mode) or if editor is empty (initial load)
        if (!isEditable || contentRef.current.innerHTML === "") {
            contentRef.current.innerHTML = content;
        }
    }
  }, [content, isEditable]);

  const handleMouseOver = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      const url = target.getAttribute('href');
      if (url) {
        setTooltip({ x: e.clientX, y: e.clientY, url });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tooltip.url) {
      setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
    }
  };

  const handleMouseOut = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      setTooltip({ x: 0, y: 0, url: null });
    }
  };

  return (
    <div className="w-full h-full bg-slate-50 overflow-auto p-8 flex justify-center relative">
      {/* Styles are scoped to this viewer via the specific class structure */}
      <style>{`
        .docx-content { outline: none; }
        .docx-content h1 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; color: #1e293b; }
        .docx-content h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; margin-top: 1em; color: #334155; }
        .docx-content p { margin-bottom: 1em; line-height: 1.6; color: #475569; }
        .docx-content ul { list-style-type: disc; margin-left: 1.5em; margin-bottom: 1em; }
        .docx-content ol { list-style-type: decimal; margin-left: 1.5em; margin-bottom: 1em; }
        .docx-content strong { font-weight: bold; color: #0f172a; }
        .docx-content table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
        .docx-content td, .docx-content th { border: 1px solid #cbd5e1; padding: 0.5em; }
        /* Link Styling */
        .docx-content a { color: #2563eb; text-decoration: underline; cursor: pointer; }
        .docx-content a:hover { color: #1d4ed8; }
      `}</style>
      
      <div 
        ref={contentRef}
        id="editor-container" 
        className={`docx-content w-full max-w-[850px] min-h-[1100px] bg-white shadow-lg p-16 transition-shadow ${isEditable ? 'ring-2 ring-indigo-500/50 cursor-text' : ''}`}
        contentEditable={isEditable}
        onInput={(e) => onUpdate(e.currentTarget.innerHTML)}
        suppressContentEditableWarning={true}
        onMouseOver={handleMouseOver}
        onMouseMove={handleMouseMove}
        onMouseOut={handleMouseOut}
      />

      {tooltip.url && (
        <div 
          className="fixed z-50 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 rounded-md shadow-xl pointer-events-none whitespace-nowrap border border-slate-700 animate-in fade-in zoom-in-95 duration-150"
          style={{ top: tooltip.y + 20, left: tooltip.x + 15 }}
        >
          {tooltip.url}
        </div>
      )}
    </div>
  );
};