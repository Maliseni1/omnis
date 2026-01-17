import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, FileText, Image as ImageIcon, FileType } from 'lucide-react';

interface OpenFile {
  id: string;
  name: string;
  type: string;
  content: string;
  lastSavedContent?: string;
}

interface SortableTabProps {
  file: OpenFile;
  isActive: boolean;
  onActivate: () => void;
  onClose: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const FileIcon = ({ type }: { type: string }) => {
  if (type === 'image') return <ImageIcon size={14} className="text-violet-400" />;
  if (type === 'text' || type === 'html') return <FileText size={14} className="text-emerald-400" />;
  if (type === 'pdf') return <FileText size={14} className="text-rose-400" />;
  return <FileType size={14} className="text-slate-400" />;
};

export const SortableTab: React.FC<SortableTabProps> = ({ file, isActive, onActivate, onClose, onContextMenu }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: file.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onActivate}
      onContextMenu={onContextMenu}
      className={`
        group relative px-4 py-1.5 text-xs font-medium max-w-[200px] min-w-[120px] truncate cursor-pointer rounded-t-lg select-none flex items-center gap-2 border-t border-x transition-colors
        ${isActive 
          ? 'bg-slate-800 text-indigo-100 border-slate-700 border-b-slate-800' 
          : 'bg-slate-900/40 text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300'
        }
      `}
    >
      <FileIcon type={file.type} />
      <span className="truncate flex-1">{file.name}</span>
      
      {/* Dirty Indicator */}
      {file.content !== file.lastSavedContent && (
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" title="Unsaved changes"></div>
      )}
      
      <button 
        onClick={onClose}
        className={`shrink-0 p-0.5 rounded hover:bg-slate-700 hover:text-red-400 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <X size={12} />
      </button>
    </div>
  );
};