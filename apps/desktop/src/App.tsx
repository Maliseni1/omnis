import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Settings, 
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
  Redo,
  X,
  Subscript,
  Superscript,
  Eraser,
  Indent,
  Outdent,
  Link as LinkIcon,
  ImagePlus,
  FolderOpen
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
// Fix 1: Type-only import for RecentFile to satisfy verbatimModuleSyntax
import type { RecentFile } from './components/HomeDashboard';
import { SettingsModal } from './components/SettingsModal';
import { FileTree } from './components/FileTree';

// Import Hooks
import { useFileOperations } from './hooks/useFileOperations';

// --- Types ---
type ViewerMode = 'view' | 'edit';
type FileCategory = 'image' | 'pdf' | 'text' | 'html' | 'binary' | 'unknown' | 'error';
type Theme = 'dark' | 'light' | 'system';

interface OpenFile {
  id: string;
  name: string;
  type: string; 
  ext: string;       
  content: string;   
  path: string;
  lastSavedContent?: string; 
}

interface DialogSelection {
  path: string;
  name: string;
  ext: string;
}

// Fix 2: Define DirectorySelection interface clearly
interface DirectorySelection {
  path: string;
  name: string;
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
  const [theme, setTheme] = useState<Theme>('dark');
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>('dark');
  
  // File Explorer State
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [explorerPath, setExplorerPath] = useState<string | null>(null);

  // History State
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(() => {
    try {
      const saved = localStorage.getItem('omnis-recent-files');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse recent files", e);
      return [];
    }
  });

  // Update Notification State
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
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

  // --- Use Custom Hooks ---
  const { handleSaveFile, handleShareFile } = useFileOperations(activeFile, setOpenFiles, setIsLoading);

  // --- History Management ---
  const addToRecent = (file: OpenFile) => {
    if (!file.path) return;
    
    setRecentFiles(prev => {
      const filtered = prev.filter(f => f.path !== file.path);
      const newEntry = {
        id: file.id,
        name: file.name,
        type: file.type,
        path: file.path,
        lastOpened: new Date()
      };
      const updated = [newEntry, ...filtered].slice(0, 10);
      localStorage.setItem('omnis-recent-files', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (activeFile && activeFile.path) {
      addToRecent(activeFile);
    }
  }, [activeFile?.path]);

  // Determine effective theme based on system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const effectiveTheme = theme === 'system' ? systemTheme : theme;
  const isDark = effectiveTheme === 'dark';

  // --- Theme Constants ---
  const bgMain = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const textMain = isDark ? 'text-slate-100' : 'text-slate-900';
  const sidebarBg = isDark ? 'bg-slate-950' : 'bg-white';
  const borderMain = isDark ? 'border-slate-800' : 'border-slate-200';
  const toolbarBg = isDark ? 'bg-slate-800' : 'bg-white';

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAiPanelOpen]);

  // Listen for Update Signals from Backend
  useEffect(() => {
    // @ts-ignore
    if (window.ipcRenderer) {
      // @ts-ignore
      window.ipcRenderer.on('update-available', (event, info) => {
        console.log("Update available:", info);
        setUpdateAvailable(true);
      });
    }
  }, []);

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

  // --- File Actions ---

  const handleCreateFile = (type: 'docx' | 'pdf') => {
    const newFileId = crypto.randomUUID();
    let newFile: OpenFile;

    if (type === 'docx') {
      newFile = {
        id: newFileId,
        name: 'Untitled.docx',
        type: 'html', 
        ext: 'docx',
        content: '<p>Start typing your new document here...</p>', 
        path: '', 
        lastSavedContent: '' 
      };
    } else {
      // PDF creation is placeholder for now
      newFile = {
        id: newFileId,
        name: 'Untitled.pdf',
        type: 'pdf',
        ext: 'pdf',
        content: '', // Empty PDF content
        path: '',
        lastSavedContent: ''
      };
    }

    setOpenFiles(prev => [...prev, newFile]);
    setActiveTabId(newFile.id);
    setViewerMode('edit');
  };

  const handleOpenFile = async () => {
    try {
      // @ts-ignore
      const selection = (await window.ipcRenderer.invoke('dialog:openFile')) as DialogSelection | null;
      if (selection) {
        openFileFromPath(selection.path);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  // Open directory handler
  const handleOpenFolder = async () => {
    try {
      // @ts-ignore
      const selection = (await window.ipcRenderer.invoke('dialog:openDirectory')) as DirectorySelection | null;
      if (selection) {
        setExplorerPath(selection.path);
        setIsExplorerOpen(true);
        setActiveToolGroup('Explorer');
      }
    } catch (error) {
      console.error('Failed to open directory:', error);
    }
  };

  // Toggle Explorer visibility or open dialog if not set
  const toggleExplorer = () => {
    if (!explorerPath) {
      handleOpenFolder();
    } else {
      setIsExplorerOpen(!isExplorerOpen);
    }
  };

  // Open file from path (used by Recent Files and File Explorer)
  const openFileFromPath = async (filePath: string) => {
    const existing = openFiles.find(f => f.path === filePath);
    if (existing) {
       setActiveTabId(existing.id);
       return;
    }

    setIsLoading(true);
    setLoadingFile(filePath.split(/[\\/]/).pop() || 'File');
    try {
      const readResult = (await window.ipcRenderer.invoke('file:readFile', filePath)) as ReadFileResult;
      if (readResult && !readResult.error) {
        const name = filePath.split(/[\\/]/).pop() || 'Untitled';
        const ext = name.split('.').pop() || '';

        const newFile: OpenFile = { 
            id: crypto.randomUUID(),
            name: name,
            path: filePath,
            ext: ext,
            type: readResult.type, 
            content: readResult.content,
            lastSavedContent: readResult.content 
        };
        setOpenFiles(prev => [...prev, newFile]);
        setActiveTabId(newFile.id);
        setViewerMode('view');
        setCurrentPage(1);
        addToRecent(newFile);
      } else {
        console.error("Read error:", readResult?.error);
        alert(`Could not open file: ${readResult?.error || 'Unknown error'}`);
      }
    } catch (error) {
       console.error('Failed to open file path:', error);
       alert("Failed to open file. It may have been moved or deleted.");
    } finally {
       setIsLoading(false);
       setLoadingFile(null);
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

  // Extended Editing Functions
  const insertLink = () => {
    if (viewerMode !== 'edit' || activeFile?.type !== 'html') return;
    const url = window.prompt("Enter the URL:");
    if (url) {
      execCmd('createLink', url);
    }
  };

  const insertImage = async () => {
    if (viewerMode !== 'edit' || activeFile?.type !== 'html') return;
    try {
      // @ts-ignore
      const selection = (await window.ipcRenderer.invoke('dialog:openFile')) as DialogSelection | null;
      if (selection) {
        // @ts-ignore
        const readResult = (await window.ipcRenderer.invoke('file:readFile', selection.path)) as ReadFileResult;
        if (readResult && !readResult.error && readResult.type === 'image') {
           execCmd('insertImage', readResult.content);
        } else {
           alert("Please select a valid image file.");
        }
      }
    } catch (e) {
      console.error("Failed to insert image", e);
    }
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

  const getToolsForFile = (file: OpenFile) => {
    switch (file.type) {
      case 'pdf': return [{ icon: PenTool, label: 'Sign' }, { icon: ScanLine, label: 'OCR' }];
      case 'text': return [{ icon: Wand2, label: 'Rewrite' }, { icon: Languages, label: 'Translate' }];
      case 'image': return [{ icon: FileInput, label: 'To PDF' }, { icon: ScanLine, label: 'Extract Text' }];
      case 'html': return [{ icon: FileInput, label: 'To PDF' }];
      default: return [];
    }
  };

  const renderToolbar = () => {
    const showRichText = activeFile?.type === 'html' && viewerMode === 'edit';

    if (activeToolGroup === 'AI Assistant') {
      return (
        <div className="flex items-center gap-2 h-full">
           <div className={`flex items-center gap-1 pr-4 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <ToolButton icon={Wand2} label="Summarize" onClick={() => handleAiSubmit('Summarize this document')} tooltip="Summarize Document" isDark={isDark} />
              <ToolButton icon={Languages} label="Translate" onClick={() => handleAiSubmit('Translate this document to Spanish')} tooltip="Translate to Spanish" isDark={isDark} />
              <ToolButton icon={ScanLine} label="Fix Grammar" onClick={() => handleAiSubmit('Check for grammar errors in this text')} tooltip="Check Grammar" isDark={isDark} />
           </div>
           <div className="ml-auto flex items-center gap-2">
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Current Mode: <strong className={aiMode === 'cloud' ? 'text-indigo-400' : 'text-emerald-400'}>{aiMode.toUpperCase()}</strong></span>
           </div>
        </div>
      );
    }

    if (activeToolGroup === 'Home') {
      return (
        <div className="flex items-center gap-2 h-full">
          <div className={`flex items-center gap-1 pr-4 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <ToolButton icon={Save} label="Save" onClick={() => { handleSaveFile(); if (activeFile) addToRecent(activeFile); }} tooltip="Save File (Ctrl+S)" isDark={isDark} />
            <ToolButton icon={Printer} label="Print" tooltip="Print File" isDark={isDark} />
            <ToolButton icon={Share2} label="Share" onClick={handleShareFile} tooltip="Share File" isDark={isDark} />
          </div>
          <div className={`flex items-center gap-1 pr-4 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <button onClick={() => setViewerMode(prev => prev === 'view' ? 'edit' : 'view')} className={`flex flex-col items-center justify-center w-16 h-14 rounded-lg group ${viewerMode === 'edit' ? 'bg-slate-700 text-indigo-300' : (isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100')}`}>
                {viewerMode === 'view' ? <Edit3 size={20} className="mb-1" /> : <Eye size={20} className="mb-1" />}
                <span className="text-[10px] font-medium">{viewerMode === 'view' ? 'Edit Mode' : 'Read Mode'}</span>
              </button>
          </div>
          {showRichText && (
            <>
              {/* Typography Group */}
              <div className={`flex flex-col gap-1 pr-4 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'} px-2`}>
                 <div className="flex items-center gap-1">
                    <select onChange={(e) => execCmd('fontName', e.target.value)} className={`h-6 w-32 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'} border rounded text-xs px-1 outline-none`} title="Font Family">
                      <option>Font...</option>
                      {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select onChange={(e) => execCmd('fontSize', e.target.value)} className={`h-6 w-12 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'} border rounded text-xs px-1 outline-none`} title="Font Size">
                      <option>Sz</option>
                      {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <div className="flex items-center gap-0.5 justify-center">
                    <FormatBtn icon={Bold} cmd="bold" onClick={() => execCmd('bold')} tooltip="Bold (Ctrl+B)" isDark={isDark} />
                    <FormatBtn icon={Italic} cmd="italic" onClick={() => execCmd('italic')} tooltip="Italic (Ctrl+I)" isDark={isDark} />
                    <FormatBtn icon={Underline} cmd="underline" onClick={() => execCmd('underline')} tooltip="Underline (Ctrl+U)" isDark={isDark} />
                    <FormatBtn icon={Strikethrough} cmd="strikethrough" onClick={() => execCmd('strikethrough')} tooltip="Strikethrough" isDark={isDark} />
                    <FormatBtn icon={Subscript} cmd="subscript" onClick={() => execCmd('subscript')} tooltip="Subscript" isDark={isDark} />
                    <FormatBtn icon={Superscript} cmd="superscript" onClick={() => execCmd('superscript')} tooltip="Superscript" isDark={isDark} />
                    <FormatBtn icon={CaseSensitive} cmd="case" onClick={changeCase} tooltip="Change Case" isDark={isDark} />
                    <FormatBtn icon={Eraser} cmd="removeFormat" onClick={() => execCmd('removeFormat')} tooltip="Clear Formatting" isDark={isDark} />
                 </div>
              </div>

              {/* Alignment & Lists Group */}
              <div className={`flex items-center gap-1 px-2 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                 <div className="grid grid-cols-4 gap-0.5">
                    <FormatBtn icon={AlignLeft} cmd="justifyLeft" onClick={() => execCmd('justifyLeft')} tooltip="Align Left" isDark={isDark} />
                    <FormatBtn icon={AlignCenter} cmd="justifyCenter" onClick={() => execCmd('justifyCenter')} tooltip="Align Center" isDark={isDark} />
                    <FormatBtn icon={AlignRight} cmd="justifyRight" onClick={() => execCmd('justifyRight')} tooltip="Align Right" isDark={isDark} />
                    <FormatBtn icon={AlignJustify} cmd="justifyFull" onClick={() => execCmd('justifyFull')} tooltip="Justify" isDark={isDark} />
                    <FormatBtn icon={List} cmd="insertUnorderedList" onClick={() => execCmd('insertUnorderedList')} tooltip="Bullet List" isDark={isDark} />
                    <FormatBtn icon={ListOrdered} cmd="insertOrderedList" onClick={() => execCmd('insertOrderedList')} tooltip="Numbered List" isDark={isDark} />
                    <FormatBtn icon={Indent} cmd="indent" onClick={() => execCmd('indent')} tooltip="Indent" isDark={isDark} />
                    <FormatBtn icon={Outdent} cmd="outdent" onClick={() => execCmd('outdent')} tooltip="Outdent" isDark={isDark} />
                 </div>
              </div>

              {/* Insert & Actions */}
              <div className={`flex items-center gap-1 px-2 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                 <div className="flex flex-col gap-1">
                   <div className="flex gap-1">
                     <FormatBtn icon={LinkIcon} cmd="createLink" onClick={insertLink} tooltip="Insert Link" isDark={isDark} />
                     <FormatBtn icon={ImagePlus} cmd="insertImage" onClick={insertImage} tooltip="Insert Image" isDark={isDark} />
                   </div>
                   <div className="flex gap-1">
                     <FormatBtn icon={Undo} cmd="undo" onClick={() => execCmd('undo')} tooltip="Undo" isDark={isDark} />
                     <FormatBtn icon={Redo} cmd="redo" onClick={() => execCmd('redo')} tooltip="Redo" isDark={isDark} />
                   </div>
                 </div>
              </div>

              {/* Colors Group */}
              <div className={`flex items-center gap-1 px-2 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                 <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-1">
                      <button className="w-8 h-6 bg-yellow-200 rounded flex items-center justify-center hover:ring-1 ring-white" onMouseDown={(e) => { e.preventDefault(); execCmd('hiliteColor', 'yellow'); }} title="Highlight Color">
                        <Highlighter size={14} className="text-slate-900" />
                      </button>
                      <button className="w-8 h-6 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 border-b-4 border-red-500" onMouseDown={(e) => { e.preventDefault(); execCmd('foreColor', 'red'); }} title="Font Color">
                        <Baseline size={14} className="text-white" />
                      </button>
                    </div>
                    <span className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Color</span>
                 </div>
              </div>
            </>
          )}
          {!showRichText && (
             <div className="flex items-center gap-1 px-4">
               {activeFile && getToolsForFile(activeFile).map((tool, idx) => (
                  <ToolButton key={idx} icon={tool.icon} label={tool.label} highlight onClick={undefined} isDark={isDark} />
               ))}
             </div>
          )}
        </div>
      );
    }

    return <div className={`flex items-center h-full ${isDark ? 'text-slate-500' : 'text-slate-400'} text-sm px-4`}>Tools for {activeToolGroup} coming soon...</div>;
  };

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      
      <div 
        className={`flex h-screen w-full ${bgMain} ${textMain} font-sans overflow-hidden transition-colors duration-300 ${showSplash ? 'opacity-0' : 'opacity-100'}`}
        onClick={closeContextMenu} // Close context menu on click anywhere
      >
        
        {/* Sidebar */}
        <div className={`w-20 ${sidebarBg} flex flex-col items-center py-4 border-r ${borderMain} z-20 shadow-xl transition-colors duration-300`}>
           <div className="mb-8 w-10 h-10 flex items-center justify-center relative">
             {!sidebarLogoError ? (
               <img src="/logo.png" alt="O" className="w-full h-full object-contain drop-shadow-lg" onError={() => setSidebarLogoError(true)} />
             ) : (
               <div className="w-10 h-10 bg-linear-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/20 text-white">O</div>
             )}
             {/* Notification Dot for Updates */}
             {updateAvailable && (
               <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-slate-950 rounded-full animate-bounce"></div>
             )}
          </div>
          <nav className="flex flex-col gap-6 w-full items-center">
            {/* Folder/Explorer Button */}
            <SidebarBtn 
                icon={FolderOpen} 
                active={isExplorerOpen} 
                onClick={toggleExplorer} 
                isDark={isDark} 
                title="File Explorer"
            />
            
            <SidebarBtn icon={FileText} active={activeToolGroup === 'Home'} onClick={() => setActiveToolGroup('Home')} isDark={isDark} />
            <SidebarBtn icon={ScanLine} active={activeToolGroup === 'Convert'} onClick={() => setActiveToolGroup('Convert')} isDark={isDark} />
            <SidebarBtn icon={Layers} active={activeToolGroup === 'Merge'} onClick={() => setActiveToolGroup('Merge')} isDark={isDark} />
            <SidebarBtn icon={Bot} active={activeToolGroup === 'AI Assistant'} onClick={() => setActiveToolGroup('AI Assistant')} isDark={isDark} />
            <div className={`h-px w-8 ${isDark ? 'bg-slate-800' : 'bg-slate-200'} mx-auto`}></div>
            <SidebarBtn icon={Settings} active={activeToolGroup === 'Settings'} onClick={() => { setIsSettingsOpen(true); setActiveToolGroup('Settings'); }} isDark={isDark} />
          </nav>
        </div>

        {/* File Tree Panel (Conditional Render with CSS transition) */}
        <div className={`
          border-r ${borderMain} ${isDark ? 'bg-slate-900' : 'bg-slate-50'} flex flex-col transition-all duration-300 ease-in-out overflow-hidden
          ${isExplorerOpen && explorerPath ? 'w-64 opacity-100' : 'w-0 opacity-0'}
        `}>
            {explorerPath && (
                <FileTree 
                    rootPath={explorerPath} 
                    onOpenFile={openFileFromPath} 
                    onChangeFolder={handleOpenFolder}
                    className="flex-1"
                    theme={effectiveTheme}
                />
            )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Top Bar (Tabs with DnD) */}
          <div className={`h-10 ${sidebarBg} flex items-end px-2 gap-1 border-b ${borderMain} pt-1 drag-region overflow-x-auto no-scrollbar transition-colors duration-300`}>
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
            
            <button onClick={handleOpenFile} className={`p-2 ${isDark ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-600'} transition-colors shrink-0`} title="Open File"><Plus size={16} /></button>
          </div>

          {/* Context Menu */}
          {contextMenu && (
            <div 
              className={`fixed z-50 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg shadow-xl py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100`}
              style={{ top: contextMenu.y, left: contextMenu.x }}
            >
              <button onClick={() => closeTab(null, contextMenu.fileId)} className={`w-full text-left px-4 py-2 text-xs ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'} hover:text-white flex items-center gap-2`}>
                <X size={12} /> Close Tab
              </button>
              <button onClick={closeOtherTabs} className={`w-full text-left px-4 py-2 text-xs ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'} hover:text-white flex items-center gap-2`}>
                <ArrowRight size={12} /> Close Others
              </button>
              <div className={`h-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'} my-1`}></div>
              <button onClick={closeAllTabs} className={`w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-50 hover:text-red-500 flex items-center gap-2`}>
                <Trash2 size={12} /> Close All
              </button>
            </div>
          )}

          {/* Toolbar */}
          {openFiles.length > 0 && (
            <div className={`h-28 ${toolbarBg} border-b ${borderMain} shadow-lg flex flex-col z-10 transition-colors duration-300`}>
                <div className={`flex px-4 text-xs font-medium gap-6 pt-2 ${isDark ? 'text-slate-400 border-slate-700/50' : 'text-slate-500 border-slate-200'} border-b`}>
                {['Home', 'Edit', 'View', 'AI Assistant', 'Convert'].map(group => (
                    <button 
                    key={group} 
                    onClick={() => setActiveToolGroup(group)} 
                    className={`pb-2 border-b-2 transition-all ${activeToolGroup === group ? (isDark ? 'text-white border-indigo-500' : 'text-indigo-600 border-indigo-500') : 'border-transparent hover:text-slate-500'}`}
                    >
                    {group}
                    </button>
                ))}
                </div>
                <div className="flex-1 flex items-center px-4 gap-2 overflow-x-auto no-scrollbar">
                {renderToolbar()}
                <div className="ml-auto flex items-center">
                    <button onClick={() => setIsAiPanelOpen(!isAiPanelOpen)} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl border ${isAiPanelOpen ? (isDark ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-indigo-50 border-indigo-200 text-indigo-600') : 'border-transparent hover:bg-slate-100 text-slate-400'}`}>
                    <Bot size={20} />
                    <span className="text-[10px] mt-1 font-medium">AI</span>
                    </button>
                </div>
                </div>
            </div>
          )}

          {/* Workspace */}
          <div className={`flex-1 ${bgMain} relative flex overflow-hidden transition-colors duration-300`}>
            {openFiles.length === 0 ? (
               <HomeDashboard 
                  onOpenFile={handleOpenFile} 
                  onOpenSettings={() => setIsSettingsOpen(true)} 
                  onCreateFile={handleCreateFile}
                  theme={effectiveTheme}
                  recentFiles={recentFiles}
                  onOpenRecent={openFileFromPath}
               />
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
                  <div className={`w-full max-w-5xl ${isDark ? 'bg-white' : 'bg-white shadow-xl ring-1 ring-slate-200'} min-h-[800px] shadow-2xl rounded-sm text-slate-800 animate-in fade-in zoom-in-95 duration-300 overflow-hidden flex flex-col ${viewerMode === 'edit' ? 'ring-4 ring-indigo-500/20' : ''}`}>
                    
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
              <div className={`w-80 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} border-l flex flex-col shadow-2xl z-30 transition-all duration-300`}>
                <div className={`p-4 border-b ${isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white/90'} flex justify-between items-center backdrop-blur-sm`}>
                  <span className={`font-semibold flex items-center gap-2 ${isDark ? 'text-indigo-100' : 'text-indigo-600'}`}><Bot size={18} className="text-indigo-500" /> Omnis Copilot</span>
                  <button onClick={() => setIsAiPanelOpen(false)}><X size={16} className="text-slate-500 hover:text-slate-400" /></button>
                </div>
                
                {/* AI Mode Toggle */}
                <div className={`px-4 py-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} border-b`}>
                  <div className={`flex ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} p-1 rounded-lg border`}>
                    <button onClick={() => setAiMode('cloud')} className={`flex-1 text-[10px] uppercase font-bold tracking-wider py-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${aiMode === 'cloud' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                      <Wand2 size={12} /> Cloud
                    </button>
                    <button onClick={() => setAiMode('local')} className={`flex-1 text-[10px] uppercase font-bold tracking-wider py-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${aiMode === 'local' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                      <Sparkles size={12} /> Local
                    </button>
                  </div>
                </div>

                {/* Chat History */}
                <div className={`flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                  {chatHistory.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                       <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${msg.role === 'ai' ? 'bg-indigo-600 text-white' : 'bg-slate-400 text-white'}`}>
                         {msg.role === 'ai' ? 'O' : 'Me'}
                       </div>
                       <div className={`rounded-2xl p-3 text-sm leading-relaxed shadow-sm max-w-[85%] ${msg.role === 'ai' ? (isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-700 border border-slate-200') + ' rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none'}`}>
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
                       <div className={`rounded-2xl rounded-tl-none p-3 text-sm text-slate-400 shadow-sm flex items-center gap-2 ${isDark ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
                          <Loader2 size={14} className="animate-spin" /> Thinking...
                       </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className={`p-4 border-t ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                  <div className="relative group">
                    <input 
                      type="text" 
                      placeholder={activeFile ? "Ask about this file..." : "Open a file to ask questions..."}
                      disabled={!activeFile || isAiThinking}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit(chatInput)}
                      className={`w-full ${isDark ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'} border rounded-xl py-3 pl-4 pr-10 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
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
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        updateAvailable={updateAvailable} 
        currentTheme={theme}
        onThemeChange={setTheme}
        effectiveTheme={effectiveTheme}
      />
    </>
  );
}

const SidebarBtn = ({ icon: Icon, active, onClick, isDark, title }: { icon: LucideIcon, active?: boolean, onClick?: () => void, isDark?: boolean, title?: string }) => (
  <button onClick={onClick} title={title} className={`p-3 rounded-xl transition-all ${active ? (isDark ? 'bg-slate-800 text-indigo-400 shadow-lg shadow-indigo-900/20' : 'bg-indigo-50 text-indigo-600 shadow-sm') : (isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700')}`}>
    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
  </button>
);

const ToolButton = ({ icon: Icon, label, highlight, onClick, tooltip, isDark }: { icon: LucideIcon, label: string, highlight?: boolean, onClick?: () => void, tooltip?: string, isDark?: boolean }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 h-14 rounded-lg group ${highlight ? (isDark ? 'text-indigo-300 hover:bg-slate-700' : 'text-indigo-600 hover:bg-indigo-50') : (isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100')}`} title={tooltip || label}>
    <Icon size={20} className="mb-1" />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const FormatBtn = ({ icon: Icon, cmd, onClick, tooltip, isDark }: { icon: LucideIcon, cmd: string, onClick: () => void, tooltip?: string, isDark?: boolean }) => (
  <button 
    onMouseDown={(e) => { e.preventDefault(); onClick(); }} 
    className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'}`}
    title={tooltip || cmd}
  >
    <Icon size={16} />
  </button>
);

export default App;