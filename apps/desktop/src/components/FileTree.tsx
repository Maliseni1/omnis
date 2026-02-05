import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderOpen, 
  File, 
  FileText, 
  Image as ImageIcon, 
  FileType, 
  ChevronRight, 
  ChevronDown, 
  Loader2,
  FolderInput
} from 'lucide-react';

export interface FileSystemItem {
  name: string;
  path: string;
  isDirectory: boolean;
  type?: string;
}

interface ReadDirectoryResult {
  items?: FileSystemItem[];
  error?: string;
}

interface FileTreeProps {
  rootPath: string;
  onOpenFile: (path: string) => void;
  onChangeFolder?: () => void;
  className?: string;
  theme?: 'dark' | 'light';
}

const FileIcon = ({ name, isDirectory, isOpen, theme }: { name: string; isDirectory: boolean; isOpen?: boolean; theme: 'dark' | 'light' }) => {
  const colorClass = theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600';
  
  if (isDirectory) {
    return isOpen ? 
      <FolderOpen size={16} className={colorClass} /> : 
      <Folder size={16} className={colorClass} />;
  }

  const ext = name.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'pdf': return <FileType size={16} className="text-rose-500" />;
    case 'png': 
    case 'jpg': 
    case 'jpeg': 
    case 'svg': 
    case 'webp': return <ImageIcon size={16} className="text-violet-500" />;
    case 'docx': 
    case 'doc': return <FileText size={16} className="text-blue-500" />;
    case 'txt': 
    case 'md': 
    case 'json': return <FileText size={16} className="text-slate-400" />;
    default: return <File size={16} className="text-slate-400" />;
  }
};

const FileTreeItem: React.FC<{ 
  item: FileSystemItem; 
  onOpenFile: (path: string) => void; 
  level: number;
  theme: 'dark' | 'light';
}> = ({ item, onOpenFile, level, theme }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<FileSystemItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const hoverClass = theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-200';
  const textClass = theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-black';

  const toggleExpand = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.isDirectory) {
      onOpenFile(item.path);
      return;
    }

    setIsExpanded(!isExpanded);

    if (!hasLoaded && !isExpanded) {
      setIsLoading(true);
      try {
        // @ts-ignore
        const result = (await window.ipcRenderer.invoke('file:readDirectory', item.path)) as ReadDirectoryResult;
        if (result && !result.error && result.items) {
          setChildren(result.items);
          setHasLoaded(true);
        }
      } catch (err) {
        console.error("Failed to read directory", err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div>
      <div 
        className={`flex items-center gap-1.5 py-1.5 px-2 cursor-pointer rounded-md select-none transition-colors text-sm group ${hoverClass} ${textClass}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={toggleExpand}
        title={item.path}
      >
        {item.isDirectory ? (
          <span className="opacity-70 shrink-0">
             {isLoading ? <Loader2 size={12} className="animate-spin" /> : 
              (isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
          </span>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        
        <div className="shrink-0">
          <FileIcon name={item.name} isDirectory={item.isDirectory} isOpen={isExpanded} theme={theme} />
        </div>
        <span className="truncate">{item.name}</span>
      </div>

      {isExpanded && (
        <div>
          {children.map((child) => (
            <FileTreeItem 
              key={child.path} 
              item={child} 
              onOpenFile={onOpenFile} 
              level={level + 1} 
              theme={theme}
            />
          ))}
          {children.length === 0 && !isLoading && (
            <div 
              className={`italic text-xs py-1 select-none opacity-50 ${textClass}`}
              style={{ paddingLeft: `${(level + 1) * 12 + 28}px` }}
            >
              Empty
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({ rootPath, onOpenFile, onChangeFolder, className, theme = 'dark' }) => {
  const [rootItems, setRootItems] = useState<FileSystemItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoot = async () => {
      setLoading(true);
      try {
        // @ts-ignore
        const result = (await window.ipcRenderer.invoke('file:readDirectory', rootPath)) as ReadDirectoryResult;
        if (result && !result.error && result.items) {
          setRootItems(result.items);
        }
      } catch (err) {
        console.error("Failed to load root directory", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (rootPath) {
      loadRoot();
    }
  }, [rootPath]);

  const bgHeader = theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200';
  const textHeader = theme === 'dark' ? 'text-slate-400' : 'text-slate-600';

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 text-slate-500 ${className}`}>
        <Loader2 className="animate-spin mr-2" size={16} /> <span className="text-xs">Loading files...</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
       <div className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex justify-between items-center border-b ${bgHeader} ${textHeader}`}>
         <span>Explorer</span>
         {onChangeFolder && (
           <button onClick={onChangeFolder} className="hover:text-indigo-500 transition-colors" title="Change Folder">
             <FolderInput size={14} />
           </button>
         )}
       </div>
       <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
         <div className="px-2 py-1 mb-2 text-xs opacity-50 truncate border-b border-dashed border-slate-700/50 pb-2">
            {rootPath}
         </div>
         {rootItems.map(item => (
           <FileTreeItem 
             key={item.path} 
             item={item} 
             onOpenFile={onOpenFile} 
             level={0} 
             theme={theme}
           />
         ))}
       </div>
    </div>
  );
};