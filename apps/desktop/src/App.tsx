import React, { useState, useEffect, useMemo } from "react";
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
  Search,
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// --- Types ---
type ViewerMode = "view" | "edit";
type FileCategory =
  | "image"
  | "pdf"
  | "text"
  | "html"
  | "binary"
  | "unknown"
  | "error";

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

const SAMPLE_FILES: OpenFile[] = [];
const LINES_PER_PAGE = 500;

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
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
          Omnis
        </h1>
        <p className="text-slate-400 text-sm tracking-wide">
          Universal File Ecosystem
        </p>
      </div>
      <div className="absolute bottom-12 flex flex-col items-center">
        <span className="text-slate-500 text-xs uppercase tracking-widest mb-1">
          From
        </span>
        <span className="text-slate-200 font-bold text-lg tracking-wider">
          CHIZA LABS
        </span>
      </div>
    </div>
  );
};

// --- Sub-Viewers ---

const DocxViewer = ({ content }: { content: string }) => (
  // We use a style tag here to restore default document styling that Tailwind resets
  <div className="w-full h-full bg-white overflow-auto p-12">
    <style>{`
      .docx-content h1 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; color: #1e293b; }
      .docx-content h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; margin-top: 1em; color: #334155; }
      .docx-content p { margin-bottom: 1em; line-height: 1.6; color: #475569; }
      .docx-content ul { list-style-type: disc; margin-left: 1.5em; margin-bottom: 1em; }
      .docx-content ol { list-style-type: decimal; margin-left: 1.5em; margin-bottom: 1em; }
      .docx-content strong { font-weight: bold; color: #0f172a; }
      .docx-content table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
      .docx-content td, .docx-content th { border: 1px solid #cbd5e1; padding: 0.5em; }
    `}</style>
    <div
      className="docx-content max-w-4xl mx-auto"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  </div>
);

const PdfViewer = ({ content }: { content: string }) => (
  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
    <object data={content} type="application/pdf" className="w-full h-full">
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <p>Unable to display PDF directly.</p>
      </div>
    </object>
  </div>
);

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>(SAMPLE_FILES);
  const [activeToolGroup, setActiveToolGroup] = useState<string>("Home");
  const [isAiPanelOpen, setIsAiPanelOpen] = useState<boolean>(false);
  const [viewerMode, setViewerMode] = useState<ViewerMode>("view");
  const [aiMode, setAiMode] = useState<"cloud" | "local">("cloud");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarLogoError, setSidebarLogoError] = useState(false);

  const activeFile = openFiles.find((f) => f.id === activeTabId);

  // Pagination for large text files
  const textPagination = useMemo(() => {
    if (!activeFile || activeFile.type !== "text") return null;
    const content = activeFile.content || "";
    const lines = content.split("\n");
    const totalPages = Math.ceil(lines.length / LINES_PER_PAGE);
    return { allLines: lines, totalPages, count: lines.length };
  }, [activeFile]);

  const currentPageContent = useMemo(() => {
    if (!textPagination) return "";
    const start = (currentPage - 1) * LINES_PER_PAGE;
    const end = start + LINES_PER_PAGE;
    return textPagination.allLines.slice(start, end).join("\n");
  }, [textPagination, currentPage]);

  const handleOpenFile = async () => {
    try {
      const selection = (await window.ipcRenderer.invoke(
        "dialog:openFile"
      )) as DialogSelection | null;

      if (selection) {
        setIsLoading(true);
        setLoadingFile(selection.name);

        const readResult = (await window.ipcRenderer.invoke(
          "file:readFile",
          selection.path
        )) as ReadFileResult;

        if (readResult && !readResult.error) {
          const newFile: OpenFile = {
            id: crypto.randomUUID(),
            name: selection.name,
            path: selection.path,
            ext: selection.ext,
            type: readResult.type,
            content: readResult.content,
            lastSavedContent: readResult.content,
          };

          setOpenFiles((prev) => [...prev, newFile]);
          setActiveTabId(newFile.id);
          setViewerMode("view");
          setCurrentPage(1);
        } else {
          console.error("Read error:", readResult?.error);
        }
      }
    } catch (error) {
      console.error("Failed to open file:", error);
    } finally {
      setIsLoading(false);
      setLoadingFile(null);
    }
  };

  const handleSaveFile = async () => {
    if (!activeFile) return;
    setIsLoading(true);
    try {
      const result = (await window.ipcRenderer.invoke("file:saveFile", {
        path: activeFile.path,
        content: activeFile.content,
      })) as SaveResult;

      if (result.success) {
        setOpenFiles((prev) =>
          prev.map((f) =>
            f.id === activeFile.id ? { ...f, lastSavedContent: f.content } : f
          )
        );
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFileContent = (newContent: string) => {
    if (!activeFile) return;
    setOpenFiles((prev) =>
      prev.map((f) =>
        f.id === activeFile.id ? { ...f, content: newContent } : f
      )
    );
  };

  const getToolsForFile = (file: OpenFile) => {
    switch (file.type) {
      case "pdf":
        return [
          { icon: PenTool, label: "Sign" },
          { icon: ScanLine, label: "OCR" },
        ];
      case "text":
        return [
          { icon: Wand2, label: "Rewrite" },
          { icon: Languages, label: "Translate" },
          { icon: Search, label: "Grammar" },
        ];
      case "image":
        return [
          { icon: FileInput, label: "To PDF" },
          { icon: ScanLine, label: "Extract Text" },
        ];
      case "html":
        return [
          { icon: FileInput, label: "To PDF" },
          { icon: Printer, label: "Print" },
        ];
      default:
        return [];
    }
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newFiles = openFiles.filter((f) => f.id !== id);
    setOpenFiles(newFiles);
    if (activeTabId === id) {
      setActiveTabId(
        newFiles.length > 0 ? newFiles[newFiles.length - 1].id : null
      );
    }
  };

  const goToPage = (page: number) => {
    if (textPagination && page >= 1 && page <= textPagination.totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      <div
        className={`flex h-screen w-full bg-slate-900 text-slate-100 font-sans overflow-hidden transition-opacity duration-700 ${showSplash ? "opacity-0" : "opacity-100"}`}
      >
        {/* Sidebar */}
        <div className="w-20 bg-slate-950 flex flex-col items-center py-4 border-r border-slate-800 z-20 shadow-xl">
          <div className="mb-8 w-10 h-10 flex items-center justify-center">
            {!sidebarLogoError ? (
              <img
                src="/logo.png"
                alt="O"
                className="w-full h-full object-contain drop-shadow-lg"
                onError={() => setSidebarLogoError(true)}
              />
            ) : (
              <div className="w-10 h-10 bg-linear-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/20 text-white">
                O
              </div>
            )}
          </div>
          <nav className="flex flex-col gap-6 w-full items-center">
            <SidebarBtn icon={FileText} active />
            <SidebarBtn icon={ScanLine} />
            <SidebarBtn icon={Layers} />
            <div className="h-px w-8 bg-slate-800 mx-auto"></div>
            <SidebarBtn icon={Settings} />
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar (Tabs) */}
          <div className="h-10 bg-slate-950 flex items-end px-2 gap-1 border-b border-slate-800 pt-1 drag-region">
            {openFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => {
                  setActiveTabId(file.id);
                  setCurrentPage(1);
                }}
                className={`relative px-4 py-1.5 text-xs font-medium max-w-[200px] truncate cursor-pointer rounded-t-lg flex items-center gap-2 border-t border-x transition-colors
                  ${activeTabId === file.id ? "bg-slate-800 text-indigo-100 border-slate-700 border-b-slate-800" : "bg-slate-900/40 text-slate-500 border-transparent hover:bg-slate-900"}
                `}
              >
                <FileIconType type={file.type} />
                <span className="truncate">{file.name}</span>
                {file.content !== file.lastSavedContent && (
                  <div
                    className="w-2 h-2 rounded-full bg-indigo-500 ml-1"
                    title="Unsaved changes"
                  ></div>
                )}
                <button
                  onClick={(e) => closeTab(e, file.id)}
                  className="ml-2 hover:text-red-400"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={handleOpenFile}
              className="p-2 text-slate-500 hover:text-indigo-400 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Toolbar */}
          <div className="h-28 bg-slate-800 border-b border-slate-700 shadow-lg flex flex-col z-10">
            <div className="flex px-4 text-xs font-medium gap-6 pt-2 text-slate-400 border-b border-slate-700/50">
              {["Home", "Edit", "View", "AI Assistant"].map((group) => (
                <button
                  key={group}
                  onClick={() => setActiveToolGroup(group)}
                  className={`pb-2 border-b-2 transition-all ${activeToolGroup === group ? "text-white border-indigo-500" : "border-transparent hover:text-slate-200"}`}
                >
                  {group}
                </button>
              ))}
            </div>
            <div className="flex-1 flex items-center px-4 gap-2">
              <div className="flex items-center gap-1 pr-4 border-r border-slate-700">
                <ToolButton icon={Save} label="Save" onClick={handleSaveFile} />
                <ToolButton icon={Printer} label="Print" />
                <ToolButton icon={Share2} label="Share" />
              </div>
              <div className="flex items-center gap-1 pr-4 border-r border-slate-700">
                <button
                  onClick={() =>
                    setViewerMode((prev) => (prev === "view" ? "edit" : "view"))
                  }
                  className={`flex flex-col items-center justify-center w-16 h-14 rounded-lg group ${viewerMode === "edit" ? "bg-slate-700 text-indigo-300" : "text-slate-400 hover:bg-slate-700"}`}
                >
                  {viewerMode === "view" ? (
                    <Edit3 size={20} className="mb-1" />
                  ) : (
                    <Eye size={20} className="mb-1" />
                  )}
                  <span className="text-[10px] font-medium">
                    {viewerMode === "view" ? "Edit Mode" : "Read Mode"}
                  </span>
                </button>
              </div>
              {activeFile &&
                getToolsForFile(activeFile).map((tool, idx) => (
                  <ToolButton
                    key={idx}
                    icon={tool.icon}
                    label={tool.label}
                    highlight
                  />
                ))}
              <div className="ml-auto">
                <button
                  onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                  className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl border ${isAiPanelOpen ? "bg-indigo-600 border-indigo-500 text-white" : "border-transparent hover:bg-slate-700 text-slate-300"}`}
                >
                  <Bot size={20} />
                  <span className="text-[10px] mt-1 font-medium">AI</span>
                </button>
              </div>
            </div>
          </div>

          {/* Workspace */}
          <div className="flex-1 bg-slate-900 relative flex overflow-hidden">
            <div className="flex-1 p-8 flex justify-center items-start bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-size-[16px_16px] overflow-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center mt-32 text-indigo-400 animate-in fade-in duration-300">
                  <div className="relative">
                    <Loader2 size={48} className="animate-spin mb-4" />
                    <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full"></div>
                  </div>
                  <p className="text-slate-300 font-medium">
                    Processing {loadingFile || "file"}...
                  </p>
                  <p className="text-slate-500 text-xs mt-2">
                    Analyzing content & preparing view
                  </p>
                </div>
              ) : activeFile ? (
                <div
                  className={`w-full max-w-5xl bg-white min-h-[800px] shadow-2xl rounded-sm text-slate-800 animate-in fade-in zoom-in-95 duration-300 overflow-hidden flex flex-col ${viewerMode === "edit" ? "ring-4 ring-indigo-500/20" : ""}`}
                >
                  {/* File Header */}
                  <div className="px-12 py-8 border-b border-slate-100 bg-white flex justify-between items-start">
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900">
                        {activeFile.name}
                      </h1>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                          {activeFile.ext} • {viewerMode.toUpperCase()}
                        </span>
                        {activeFile.content !== activeFile.lastSavedContent && (
                          <span className="text-xs text-indigo-500 font-medium bg-indigo-50 px-2 py-0.5 rounded">
                            Unsaved Changes
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Text File Pagination Stats */}
                    {activeFile.type === "text" && textPagination && (
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-200">
                          {textPagination.count.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">
                          Lines
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Universal Content Renderer */}
                  <div className="flex-1 bg-white relative">
                    {/* 1. IMAGE VIEWER */}
                    {activeFile.type === "image" && (
                      <div className="flex items-center justify-center p-8 bg-slate-50 h-full min-h-[600px]">
                        <img
                          src={activeFile.content}
                          alt={activeFile.name}
                          className="max-w-full max-h-full object-contain shadow-md rounded"
                        />
                      </div>
                    )}

                    {/* 2. PDF VIEWER */}
                    {activeFile.type === "pdf" && (
                      <PdfViewer content={activeFile.content} />
                    )}

                    {/* 3. DOCX/HTML VIEWER */}
                    {activeFile.type === "html" && (
                      <DocxViewer content={activeFile.content} />
                    )}

                    {/* 4. TEXT/CODE VIEWER & EDITOR */}
                    {activeFile.type === "text" && (
                      <div className="flex flex-col h-full">
                        <div className="flex-1 relative min-h-[600px]">
                          {viewerMode === "edit" ? (
                            <textarea
                              className="w-full h-full p-12 font-mono text-sm leading-relaxed focus:outline-none resize-none text-slate-800 bg-white"
                              value={activeFile.content}
                              onChange={(e) =>
                                updateFileContent(e.target.value)
                              }
                              spellCheck={false}
                            />
                          ) : (
                            <pre className="w-full h-full p-12 font-mono text-sm leading-relaxed whitespace-pre-wrap overflow-auto text-slate-700 bg-white">
                              {currentPageContent || "File is empty."}
                            </pre>
                          )}
                        </div>

                        {/* Pagination Footer */}
                        {viewerMode === "view" &&
                          textPagination &&
                          textPagination.totalPages > 1 && (
                            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-between items-center sticky bottom-0">
                              <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-600 text-sm font-medium transition-colors"
                              >
                                <ChevronLeft size={16} /> Prev
                              </button>
                              <span className="text-xs font-mono text-slate-400">
                                Page{" "}
                                <span className="text-slate-700 font-bold">
                                  {currentPage}
                                </span>{" "}
                                of {textPagination.totalPages}
                              </span>
                              <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={
                                  currentPage === textPagination.totalPages
                                }
                                className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-600 text-sm font-medium transition-colors"
                              >
                                Next <ChevronRight size={16} />
                              </button>
                            </div>
                          )}
                      </div>
                    )}

                    {/* 5. FALLBACK / BINARY */}
                    {(activeFile.type === "binary" ||
                      activeFile.type === "unknown" ||
                      activeFile.type === "error") && (
                      <div className="flex flex-col items-center justify-center h-[600px] text-slate-400">
                        <FileText size={64} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium text-slate-600">
                          Preview unavailable
                        </p>
                        <p className="text-sm mt-2">
                          This file type is binary or not supported for direct
                          viewing.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center mt-32 opacity-50">
                  <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
                    <Plus size={40} className="text-slate-600" />
                  </div>
                  <p className="text-slate-500 text-lg">Open a file to begin</p>
                </div>
              )}
            </div>

            {/* AI Panel */}
            {isAiPanelOpen && (
              <div className="w-80 bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl z-30">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                  <span className="font-semibold flex items-center gap-2 text-indigo-100">
                    <Bot size={18} /> Omnis Copilot
                  </span>
                  <button onClick={() => setIsAiPanelOpen(false)}>
                    <X size={16} className="text-slate-500 hover:text-white" />
                  </button>
                </div>
                <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex gap-2">
                  <button
                    onClick={() => setAiMode("cloud")}
                    className={`flex-1 text-[10px] uppercase font-bold py-1.5 rounded-md ${aiMode === "cloud" ? "bg-indigo-600 text-white" : "text-slate-500 bg-slate-950"}`}
                  >
                    Cloud
                  </button>
                  <button
                    onClick={() => setAiMode("local")}
                    className={`flex-1 text-[10px] uppercase font-bold py-1.5 rounded-md ${aiMode === "local" ? "bg-emerald-600 text-white" : "text-slate-500 bg-slate-950"}`}
                  >
                    Local
                  </button>
                </div>
                <div className="flex-1 p-4 text-sm text-slate-400">
                  AI Chat Ready...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const SidebarBtn = ({
  icon: Icon,
  active,
}: {
  icon: LucideIcon;
  active?: boolean;
}) => (
  <button
    className={`p-3 rounded-xl ${active ? "bg-slate-800 text-indigo-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
  >
    <Icon size={22} />
  </button>
);

const ToolButton = ({
  icon: Icon,
  label,
  highlight,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  highlight?: boolean;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-16 h-14 rounded-lg group ${highlight ? "text-indigo-300 hover:bg-slate-700" : "text-slate-400 hover:bg-slate-700"}`}
  >
    <Icon size={20} className="mb-1" />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const FileIconType = ({ type }: { type: string }) => {
  if (type === "image")
    return <ImageIcon size={14} className="text-violet-400" />;
  if (type === "text" || type === "html")
    return <FileText size={14} className="text-emerald-400" />;
  return (
    <FileText
      size={14}
      className={type === "pdf" ? "text-rose-400" : "text-blue-400"}
    />
  );
};

export default App;
