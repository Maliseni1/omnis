import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Settings, 
  X, 
  Plus, 
  Bot, 
  Save, 
  Printer, 
  Share2,
  Layers,
  PenTool,
  ScanLine,
  Wand2,
  Languages,
  FileInput,
  Edit3,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Baseline,
  CaseSensitive,
  Send,
  Sparkles,
  Trash2,
  ArrowRight,
  FileType as FileTypeIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo,
  Redo
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// DnD Imports
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  horizontalListSortingStrategy 
} from '@dnd-kit/sortable';

// Import Components
import { PdfViewer } from './components/PdfViewer';
import { DocxViewer } from './components/DocxViewer';
import { SortableTab } from './components/SortableTab';
import { HomeDashboard } from './components/HomeDashboard';
import { SettingsModal } from './components/SettingsModal';

// --- Types ---
type ViewerMode = 'view' | 'edit';
type FileCategory = 'image' | 'pdf' | 'text' | 'html' | 'binary' | 'unknown' | 'error';

interface OpenFile {
  id: string;
  name: string;
  type: FileCategory; 
  ext: string;       
  content: string;   
  path: string;
  lastSavedContent?: string; 
}

interface SaveResult {
  success: boolean;
  error?: string;
}

interface DialogSelection {
  path: string;
  name: string;
  ext: string;
}

interface ReadFileResult {
  content: string;
  type: FileCategory;
  ext: string;
  error?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const SAMPLE_FILES: OpenFile[] = [];
const LINES_PER_PAGE = 500; 
const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Tahoma', 'Trebuchet MS'];
const FONT_SIZES = ['1', '2', '3', '4', '5', '6', '7'];

// --- Components ---

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 3000); 
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-100 bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-700">
      <div className="flex flex-col items-center">
        {!imgError ? (
          <img 
            src="/logo.png" 
            alt="Omnis Logo" 
            className="w-28 h-28 mb-8 animate-pulse object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-28 h-28 bg-linear-to-br from-indigo-600 to-violet-600 rounded-3xl flex items-center justify-center font-bold text-6xl shadow-2xl shadow-indigo-500/30 mb-8 text-white animate-pulse">
            O
          </div>
        )}
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Omnis</h1>
        <p className="text-slate-400 text-sm tracking-wide">Universal File Ecosystem</p>
      </div>
      <div className="absolute bottom-12 flex flex-col items-center">
         <span className="text-slate-500 text-xs uppercase tracking-widest mb-1">From</span>
         <span className="text-slate-200 font-bold text-lg tracking-wider">CHIZA LABS</span>
      </div>
    </div>
  );
};

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>(SAMPLE_FILES);
  const [activeToolGroup, setActiveToolGroup] = useState<string>('Home');
  const [isAiPanelOpen, setIsAiPanelOpen] = useState<boolean>(false);
  const [viewerMode, setViewerMode] = useState<ViewerMode>('view');
  const [aiMode, setAiMode] = useState<'cloud' | 'local'>('cloud');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarLogoError, setSidebarLogoError] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; fileId: string } | null>(null);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  // AI Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([{
    id: 'intro',
    role: 'ai',
    text: "I'm ready to help. Open a file and ask me to summarize it, check grammar, or rewrite sections.",
    timestamp: new Date()
  }]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeFile = openFiles.find(f => f.id === activeTabId);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAiPanelOpen]);

  // Pagination
  const textPagination = useMemo(() => {
    if (!activeFile || activeFile.type !== 'text') return null;
    const content = activeFile.content || '';
    const lines = content.split('\n');
    const totalPages = Math.ceil(lines.length / LINES_PER_PAGE);
    return { allLines: lines, totalPages, count: lines.length };
  }, [activeFile]); 

  const currentPageContent = useMemo(() => {
    if (!textPagination) return '';
    const start = (currentPage - 1) * LINES_PER_PAGE;
    const end = start + LINES_PER_PAGE;
    return textPagination.allLines.slice(start, end).join('\n');
  }, [textPagination, currentPage]);

  // --- Handlers ---

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOpenFiles((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, fileId });
  };

  const closeContextMenu = () => setContextMenu(null);

  const closeTab = (e: React.MouseEvent | null, id: string) => {
    e?.stopPropagation();
    const newFiles = openFiles.filter(f => f.id !== id);
    setOpenFiles(newFiles);
    if (activeTabId === id) setActiveTabId(newFiles.length > 0 ? newFiles[newFiles.length - 1].id : null);
    closeContextMenu();
  };

  const closeOtherTabs = () => {
    if (!contextMenu) return;
    const fileToKeep = openFiles.find(f => f.id === contextMenu.fileId);
    if (fileToKeep) {
      setOpenFiles([fileToKeep]);
      setActiveTabId(fileToKeep.id);
    }
    closeContextMenu();
  };

  const closeAllTabs = () => {
    setOpenFiles([]);
    setActiveTabId(null);
    closeContextMenu();
  };

  // --- AI Actions ---
  const handleAiSubmit = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiThinking(true);
    if (!isAiPanelOpen) setIsAiPanelOpen(true);

    try {
      const result = (await window.ipcRenderer.invoke('ai:generate', {
        prompt: text,
        context: activeFile?.content || "", 
        mode: aiMode
      })) as { response: string };

      const aiMsg: ChatMessage = { id: crypto.randomUUID(), role: 'ai', text: result.response, timestamp: new Date() };
      setChatHistory(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { id: crypto.randomUUID(), role: 'ai', text: "Error processing request.", timestamp: new Date() }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleOpenFile = async () => {
    try {
      const selection = (await window.ipcRenderer.invoke('dialog:openFile')) as DialogSelection | null;
      if (selection) {
        setIsLoading(true);
        setLoadingFile(selection.name);
        const readResult = (await window.ipcRenderer.invoke('file:readFile', selection.path)) as ReadFileResult;
        if (readResult && !readResult.error) {
          const newFile: OpenFile = { 
              id: crypto.randomUUID(),
              name: selection.name,
              path: selection.path,
              ext: selection.ext,
              type: readResult.type,
              content: readResult.content,
              lastSavedContent: readResult.content 
          };
          setOpenFiles(prev => [...prev, newFile]);
          setActiveTabId(newFile.id);
          setViewerMode('view');
          setCurrentPage(1);
        } else {
          console.error("Read error:", readResult?.error);
        }
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    } finally {
      setIsLoading(false);
      setLoadingFile(null);
    }
  };

  const handleSaveFile = async () => {
    if (!activeFile) return;
    setIsLoading(true);
    try {
      const result = (await window.ipcRenderer.invoke('file:saveFile', { path: activeFile.path, content: activeFile.content })) as SaveResult;
      if (result.success) {
        setOpenFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, lastSavedContent: f.content } : f));
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFileContent = (newContent: string) => {
    if (!activeFile) return;
    setOpenFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, content: newContent } : f));
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    if (viewerMode !== 'edit' || activeFile?.type !== 'html') return;
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(command, false, value);
    const editor = document.getElementById('editor-container');
    if (editor) editor.focus();
  };

  const changeCase = () => {
    if (viewerMode !== 'edit' || activeFile?.type !== 'html') return;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const text = selection.toString();
      if (text) {
        let replacement = text.toLowerCase();
        if (text === text.toLowerCase()) replacement = text.replace(/\b\w/g, l => l.toUpperCase());
        else if (text === text.replace(/\b\w/g, l => l.toUpperCase())) replacement = text.toUpperCase();
        document.execCommand('insertText', false, replacement);
      }
    }
  };

  const goToPage = (page: number) => {
    if (textPagination && page >= 1 && page <= textPagination.totalPages) setCurrentPage(page);
  };

  const renderToolbar = () => {
    const showRichText = activeFile?.type === 'html' && viewerMode === 'edit';

    if (activeToolGroup === 'AI Assistant') {
      return (
        <div className="flex items-center gap-2 h-full">
           <div className="flex items-center gap-1 pr-4 border-r border-slate-700">
              <ToolButton icon={Wand2} label="Summarize" onClick={() => handleAiSubmit('Summarize this document')} tooltip="Summarize Document" />
              <ToolButton icon={Languages} label="Translate" onClick={() => handleAiSubmit('Translate this document to Spanish')} tooltip="Translate to Spanish" />
              <ToolButton icon={ScanLine} label="Fix Grammar" onClick={() => handleAiSubmit('Check for grammar errors in this text')} tooltip="Check Grammar" />
           </div>
           <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-400">Current Mode: <strong className={aiMode === 'cloud' ? 'text-indigo-400' : 'text-emerald-400'}>{aiMode.toUpperCase()}</strong></span>
           </div>
        </div>
      );
    }

    if (activeToolGroup === 'Home') {
      return (
        <div className="flex items-center gap-2 h-full">
          <div className="flex items-center gap-1 pr-4 border-r border-slate-700">
            <ToolButton icon={Save} label="Save" onClick={handleSaveFile} tooltip="Save File (Ctrl+S)" />
            <ToolButton icon={Printer} label="Print" tooltip="Print File" />
            <ToolButton icon={Share2} label="Share" tooltip="Share File" />
          </div>
          <div className="flex items-center gap-1 pr-4 border-r border-slate-700">
              <button onClick={() => setViewerMode(prev => prev === 'view' ? 'edit' : 'view')} className={`flex flex-col items-center justify-center w-16 h-14 rounded-lg group ${viewerMode === 'edit' ? 'bg-slate-700 text-indigo-300' : 'text-slate-400 hover:bg-slate-700'}`}>
                {viewerMode === 'view' ? <Edit3 size={20} className="mb-1" /> : <Eye size={20} className="mb-1" />}
                <span className="text-[10px] font-medium">{viewerMode === 'view' ? 'Edit Mode' : 'Read Mode'}</span>
              </button>
          </div>
          {showRichText && (
            <>
              {/* Typography Group */}
              <div className="flex flex-col gap-1 pr-4 border-r border-slate-700 px-2">
                 <div className="flex items-center gap-1">
                    <select onChange={(e) => execCmd('fontName', e.target.value)} className="h-6 w-32 bg-slate-900 border border-slate-700 rounded text-xs text-white px-1 outline-none" title="Font Family">
                      <option>Font...</option>
                      {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select onChange={(e) => execCmd('fontSize', e.target.value)} className="h-6 w-12 bg-slate-900 border border-slate-700 rounded text-xs text-white px-1 outline-none" title="Font Size">
                      <option>Sz</option>
                      {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <div className="flex items-center gap-0.5 justify-center">
                    <FormatBtn icon={Bold} cmd="bold" onClick={() => execCmd('bold')} tooltip="Bold (Ctrl+B)" />
                    <FormatBtn icon={Italic} cmd="italic" onClick={() => execCmd('italic')} tooltip="Italic (Ctrl+I)" />
                    <FormatBtn icon={Underline} cmd="underline" onClick={() => execCmd('underline')} tooltip="Underline (Ctrl+U)" />
                    <FormatBtn icon={Strikethrough} cmd="strikethrough" onClick={() => execCmd('strikethrough')} tooltip="Strikethrough" />
                    <FormatBtn icon={CaseSensitive} cmd="case" onClick={changeCase} tooltip="Change Case" />
                 </div>
              </div>

              {/* Alignment & Lists Group */}
              <div className="flex items-center gap-1 px-2 border-r border-slate-700">
                 <div className="grid grid-cols-4 gap-0.5">
                    <FormatBtn icon={AlignLeft} cmd="justifyLeft" onClick={() => execCmd('justifyLeft')} tooltip="Align Left" />
                    <FormatBtn icon={AlignCenter} cmd="justifyCenter" onClick={() => execCmd('justifyCenter')} tooltip="Align Center" />
                    <FormatBtn icon={AlignRight} cmd="justifyRight" onClick={() => execCmd('justifyRight')} tooltip="Align Right" />
                    <FormatBtn icon={AlignJustify} cmd="justifyFull" onClick={() => execCmd('justifyFull')} tooltip="Justify" />
                    <FormatBtn icon={List} cmd="insertUnorderedList" onClick={() => execCmd('insertUnorderedList')} tooltip="Bullet List" />
                    <FormatBtn icon={ListOrdered} cmd="insertOrderedList" onClick={() => execCmd('insertOrderedList')} tooltip="Numbered List" />
                 </div>
              </div>

              {/* Edit Actions Group */}
              <div className="flex items-center gap-1 px-2 border-r border-slate-700">
                 <div className="flex gap-1">
                   <FormatBtn icon={Undo} cmd="undo" onClick={() => execCmd('undo')} tooltip="Undo" />
                   <FormatBtn icon={Redo} cmd="redo" onClick={() => execCmd('redo')} tooltip="Redo" />
                 </div>
              </div>

              {/* Colors Group */}
              <div className="flex items-center gap-1 px-2 border-r border-slate-700">
                 <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-1">
                      <button className="w-8 h-6 bg-yellow-200 rounded flex items-center justify-center hover:ring-1 ring-white" onMouseDown={(e) => { e.preventDefault(); execCmd('hiliteColor', 'yellow'); }} title="Highlight Color">
                        <Highlighter size={14} className="text-slate-900" />
                      </button>
                      <button className="w-8 h-6 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 border-b-4 border-red-500" onMouseDown={(e) => { e.preventDefault(); execCmd('foreColor', 'red'); }} title="Font Color">
                        <Baseline size={14} className="text-white" />
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-400">Color</span>
                 </div>
              </div>
            </>
          )}
          {!showRichText && (
             <div className="flex items-center gap-1 px-4">
               {activeFile && getToolsForFile(activeFile).map((tool, idx) => (
                  <ToolButton key={idx} icon={tool.icon} label={tool.label} highlight />
               ))}
             </div>
          )}
        </div>
      );
    }

    return <div className="flex items-center h-full text-slate-500 text-sm px-4">Tools for {activeToolGroup} coming soon...</div>;
  };

  const getToolsForFile = (file: OpenFile) => {
    switch (file.type) {
      case 'pdf': return [{ icon: PenTool, label: 'Sign' }, { icon: ScanLine, label: 'OCR' }];
      case 'text': return [{ icon: Wand2, label: 'Rewrite' }, { icon: Languages, label: 'Translate' }];
      case 'image': return [{ icon: FileInput, label: 'To PDF' }, { icon: ScanLine, label: 'Extract Text' }];
      case 'html': return [{ icon: FileInput, label: 'To PDF' }];
      default: return [];
    }
  };

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      
      <div 
        className={`flex h-screen w-full bg-slate-900 text-slate-100 font-sans overflow-hidden transition-opacity duration-700 ${showSplash ? 'opacity-0' : 'opacity-100'}`}
        onClick={closeContextMenu} // Close context menu on click anywhere
      >
        
        {/* Sidebar */}
        <div className="w-20 bg-slate-950 flex flex-col items-center py-4 border-r border-slate-800 z-20 shadow-xl">
           <div className="mb-8 w-10 h-10 flex items-center justify-center">
             {!sidebarLogoError ? (
               <img src="/logo.png" alt="O" className="w-full h-full object-contain drop-shadow-lg" onError={() => setSidebarLogoError(true)} />
             ) : (
               <div className="w-10 h-10 bg-linear-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/20 text-white">O</div>
             )}
          </div>
          <nav className="flex flex-col gap-6 w-full items-center">
            <SidebarBtn icon={FileText} active={activeToolGroup === 'Home'} onClick={() => setActiveToolGroup('Home')} />
            <SidebarBtn icon={ScanLine} active={activeToolGroup === 'Convert'} onClick={() => setActiveToolGroup('Convert')} />
            <SidebarBtn icon={Layers} active={activeToolGroup === 'Merge'} onClick={() => setActiveToolGroup('Merge')} />
            <SidebarBtn icon={Bot} active={activeToolGroup === 'AI Assistant'} onClick={() => setActiveToolGroup('AI Assistant')} />
            <div className="h-px w-8 bg-slate-800 mx-auto"></div>
            <SidebarBtn icon={Settings} active={activeToolGroup === 'Settings'} onClick={() => { setIsSettingsOpen(true); setActiveToolGroup('Settings'); }} />
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Top Bar (Tabs with DnD) */}
          <div className="h-10 bg-slate-950 flex items-end px-2 gap-1 border-b border-slate-800 pt-1 drag-region overflow-x-auto no-scrollbar">
            {openFiles.length > 0 ? (
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={openFiles.map(f => f.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {openFiles.map(file => (
                    <SortableTab 
                      key={file.id} 
                      file={file} 
                      isActive={activeTabId === file.id}
                      onActivate={() => { setActiveTabId(file.id); setCurrentPage(1); }}
                      onClose={(e) => closeTab(e, file.id)}
                      onContextMenu={(e) => handleContextMenu(e, file.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
               <div className="flex-1"></div> // Spacer when no tabs
            )}
            
            <button onClick={handleOpenFile} className="p-2 text-slate-500 hover:text-indigo-400 transition-colors shrink-0" title="Open File"><Plus size={16} /></button>
          </div>

          {/* Context Menu */}
          {contextMenu && (
            <div 
              className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
              style={{ top: contextMenu.y, left: contextMenu.x }}
            >
              <button onClick={() => closeTab(null, contextMenu.fileId)} className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                <X size={12} /> Close Tab
              </button>
              <button onClick={closeOtherTabs} className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                <ArrowRight size={12} /> Close Others
              </button>
              <div className="h-px bg-slate-700 my-1"></div>
              <button onClick={closeAllTabs} className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-slate-700 hover:text-red-300 flex items-center gap-2">
                <Trash2 size={12} /> Close All
              </button>
            </div>
          )}

          {/* Toolbar */}
          <div className="h-28 bg-slate-800 border-b border-slate-700 shadow-lg flex flex-col z-10">
            <div className="flex px-4 text-xs font-medium gap-6 pt-2 text-slate-400 border-b border-slate-700/50">
              {['Home', 'Edit', 'View', 'AI Assistant', 'Convert'].map(group => (
                <button 
                  key={group} 
                  onClick={() => setActiveToolGroup(group)} 
                  className={`pb-2 border-b-2 transition-all ${activeToolGroup === group ? 'text-white border-indigo-500' : 'border-transparent hover:text-slate-200'}`}
                >
                  {group}
                </button>
              ))}
            </div>
            <div className="flex-1 flex items-center px-4 gap-2 overflow-x-auto no-scrollbar">
              {renderToolbar()}
              <div className="ml-auto flex items-center">
                 <button onClick={() => setIsAiPanelOpen(!isAiPanelOpen)} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl border ${isAiPanelOpen ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-transparent hover:bg-slate-700 text-slate-300'}`}>
                  <Bot size={20} />
                  <span className="text-[10px] mt-1 font-medium">AI</span>
                </button>
              </div>
            </div>
          </div>

          {/* Workspace */}
          <div className="flex-1 bg-slate-900 relative flex overflow-hidden">
            {openFiles.length === 0 ? (
               <HomeDashboard onOpenFile={handleOpenFile} onOpenSettings={() => setIsSettingsOpen(true)} />
            ) : (
              <div className="flex-1 p-8 flex justify-center items-start bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-size-[16px_16px] overflow-auto w-full h-full">
                
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center mt-32 text-indigo-400 animate-in fade-in duration-300">
                    <div className="relative">
                      <Loader2 size={48} className="animate-spin mb-4" />
                      <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full"></div>
                    </div>
                    <p className="text-slate-300 font-medium">Processing {loadingFile || 'file'}...</p>
                    <p className="text-slate-500 text-xs mt-2">Analyzing content & preparing view</p>
                  </div>
                ) : activeFile ? (
                  <div className={`w-full max-w-5xl bg-white min-h-[800px] shadow-2xl rounded-sm text-slate-800 animate-in fade-in zoom-in-95 duration-300 overflow-hidden flex flex-col ${viewerMode === 'edit' ? 'ring-4 ring-indigo-500/20' : ''}`}>
                    
                    <div className="px-12 py-8 border-b border-slate-100 bg-white flex justify-between items-start">
                      <div>
                        <h1 className="text-3xl font-bold text-slate-900">{activeFile.name}</h1>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">{activeFile.ext} • {viewerMode.toUpperCase()}</span>
                          {activeFile.content !== activeFile.lastSavedContent && (
                            <span className="text-xs text-indigo-500 font-medium bg-indigo-50 px-2 py-0.5 rounded">Unsaved Changes</span>
                          )}
                        </div>
                      </div>
                      {activeFile.type === 'text' && textPagination && (
                          <div className="text-right">
                            <p className="text-2xl font-bold text-slate-200">{textPagination.count.toLocaleString()}</p>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Lines</p>
                          </div>
                      )}
                    </div>
                    
                    <div className="flex-1 bg-white relative">
                        {/* Viewers */}
                        {activeFile.type === 'image' && (
                          <div className="flex items-center justify-center p-8 bg-slate-50 h-full min-h-[600px]">
                            <img src={activeFile.content} alt={activeFile.name} className="max-w-full max-h-full object-contain shadow-md rounded" />
                          </div>
                        )}
                        {activeFile.type === 'pdf' && <PdfViewer content={activeFile.content} />}
                        {activeFile.type === 'html' && (
                          <DocxViewer 
                            content={activeFile.content} 
                            isEditable={viewerMode === 'edit'}
                            onUpdate={updateFileContent} 
                          />
                        )}
                        {activeFile.type === 'text' && (
                          <div className="flex flex-col h-full">
                            <div className="flex-1 relative min-h-[600px]">
                              {viewerMode === 'edit' ? (
                                <textarea 
                                  className="w-full h-full p-12 font-mono text-sm leading-relaxed focus:outline-none resize-none text-slate-800 bg-white"
                                  value={activeFile.content}
                                  onChange={(e) => updateFileContent(e.target.value)}
                                  spellCheck={false}
                                />
                              ) : (
                                <pre className="w-full h-full p-12 font-mono text-sm leading-relaxed whitespace-pre-wrap overflow-auto text-slate-700 bg-white">
                                  {currentPageContent || "File is empty."}
                                </pre>
                              )}
                            </div>
                            {viewerMode === 'view' && textPagination && textPagination.totalPages > 1 && (
                              <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-between items-center sticky bottom-0">
                                  <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-600 text-sm font-medium transition-colors"><ChevronLeft size={16} /> Prev</button>
                                  <span className="text-xs font-mono text-slate-400">Page <span className="text-slate-700 font-bold">{currentPage}</span> of {textPagination.totalPages}</span>
                                  <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === textPagination.totalPages} className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-600 text-sm font-medium transition-colors">Next <ChevronRight size={16} /></button>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Fallback */}
                        {(activeFile.type === 'binary' || activeFile.type === 'unknown' || activeFile.type === 'error') && (
                          <div className="flex flex-col items-center justify-center h-[600px] text-slate-400">
                            <FileTypeIcon size={64} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium text-slate-600">Preview unavailable</p>
                            <p className="text-sm mt-2">This file type is binary or not supported for direct viewing.</p>
                          </div>
                        )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* AI Panel */}
            {isAiPanelOpen && (
              <div className="w-80 bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl z-30 transition-all duration-300">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur-sm">
                  <span className="font-semibold flex items-center gap-2 text-indigo-100"><Bot size={18} className="text-indigo-500" /> Omnis Copilot</span>
                  <button onClick={() => setIsAiPanelOpen(false)}><X size={16} className="text-slate-500 hover:text-white" /></button>
                </div>
                
                {/* AI Mode Toggle */}
                <div className="px-4 py-3 bg-slate-900 border-b border-slate-800">
                  <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button onClick={() => setAiMode('cloud')} className={`flex-1 text-[10px] uppercase font-bold tracking-wider py-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${aiMode === 'cloud' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                      <Wand2 size={12} /> Cloud
                    </button>
                    <button onClick={() => setAiMode('local')} className={`flex-1 text-[10px] uppercase font-bold tracking-wider py-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${aiMode === 'local' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                      <Sparkles size={12} /> Local
                    </button>
                  </div>
                </div>

                {/* Chat History */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar bg-slate-900/50">
                  {chatHistory.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                       <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${msg.role === 'ai' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                         {msg.role === 'ai' ? 'O' : 'Me'}
                       </div>
                       <div className={`rounded-2xl p-3 text-sm leading-relaxed shadow-sm max-w-[85%] ${msg.role === 'ai' ? 'bg-slate-800 text-slate-300 rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none'}`}>
                          {msg.role === 'ai' ? (
                            <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                          ) : (
                            msg.text
                          )}
                       </div>
                    </div>
                  ))}
                  {isAiThinking && (
                    <div className="flex gap-3">
                       <div className="w-8 h-8 rounded-full bg-indigo-600 shrink-0 flex items-center justify-center text-white text-xs font-bold">O</div>
                       <div className="bg-slate-800 rounded-2xl rounded-tl-none p-3 text-sm text-slate-400 shadow-sm flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin" /> Thinking...
                       </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-slate-800 bg-slate-900">
                  <div className="relative group">
                    <input 
                      type="text" 
                      placeholder={activeFile ? "Ask about this file..." : "Open a file to ask questions..."}
                      disabled={!activeFile || isAiThinking}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit(chatInput)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button 
                      onClick={() => handleAiSubmit(chatInput)}
                      disabled={!chatInput.trim() || !activeFile || isAiThinking}
                      className="absolute right-2 top-2 p-1.5 text-indigo-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}

const SidebarBtn = ({ icon: Icon, active, onClick }: { icon: LucideIcon, active?: boolean, onClick?: () => void }) => (
  <button onClick={onClick} className={`p-3 rounded-xl transition-all ${active ? 'bg-slate-800 text-indigo-400 shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
  </button>
);

const ToolButton = ({ icon: Icon, label, highlight, onClick, tooltip }: { icon: LucideIcon, label: string, highlight?: boolean, onClick?: () => void, tooltip?: string }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 h-14 rounded-lg group ${highlight ? 'text-indigo-300 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-700'}`} title={tooltip || label}>
    <Icon size={20} className="mb-1" />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const FormatBtn = ({ icon: Icon, cmd, onClick, tooltip }: { icon: LucideIcon, cmd: string, onClick: () => void, tooltip?: string }) => (
  <button 
    onMouseDown={(e) => { e.preventDefault(); onClick(); }} 
    className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
    title={tooltip || cmd}
  >
    <Icon size={16} />
  </button>
);

export default App;