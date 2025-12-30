import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Loader2, AlertCircle } from 'lucide-react';

// Offline Support: Import directly from the installed package
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css'; 

// --- WORKER CONFIGURATION (OFFLINE) ---
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface PdfViewerProps {
  content: string; // Base64 data URI
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ content }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the Document
  useEffect(() => {
    if (!content) return;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (pdfDoc) {
          pdfDoc.destroy();
        }

        const loadingTask = pdfjsLib.getDocument(content);
        const doc = await loadingTask.promise;
        
        setPdfDoc(doc);
        setPageCount(doc.numPages);
        setPageNum(1);
        setLoading(false);
      } catch (err: any) {
        console.error("PDF Load Error:", err);
        setError("Could not load PDF. The file might be corrupted.");
        setLoading(false);
      }
    };

    loadPdf();
    // Cleanup on unmount
    return () => {
      if (pdfDoc) pdfDoc.destroy();
    };
  }, [content]);

  // Render the Page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        
        const viewport = page.getViewport({ scale, rotation });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error("Render Error:", err);
        }
      }
    };

    renderPage();
  }, [pdfDoc, pageNum, scale, rotation]);

  // --- Controls ---
  const changePage = (offset: number) => {
    setPageNum(prev => Math.min(Math.max(1, prev + offset), pageCount));
  };

  return (
    <div className="w-full h-full bg-slate-100 flex flex-col items-center relative overflow-hidden group">
      
      {/* PDF Canvas Container - Takes up full space now */}
      <div className="flex-1 w-full overflow-auto flex justify-center p-8 bg-slate-200/50">
        <div className="relative shadow-xl transition-transform duration-200 ease-out">
          
          {/* Loading State Overlay */}
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-20 min-h-[600px] min-w-[400px] rounded-lg">
               <div className="flex flex-col items-center text-indigo-500">
                 <Loader2 className="animate-spin mb-2" size={32} />
                 <span className="text-sm font-medium">Rendering PDF...</span>
               </div>
            </div>
          )}
          
          {/* Error State Overlay */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-20 min-h-[600px] min-w-[400px] rounded-lg">
               <div className="flex flex-col items-center text-red-500 p-6 text-center">
                 <AlertCircle className="mb-2" size={32} />
                 <span className="text-sm font-medium">Error</span>
                 <span className="text-xs text-slate-400 mt-1 max-w-xs">{error}</span>
               </div>
            </div>
          )}

          {/* Actual Document Render */}
          <canvas 
            ref={canvasRef} 
            className="bg-white block rounded-sm"
          />
        </div>
      </div>

      {/* Floating Bottom Toolbar */}
      {/* Only show controls if loaded successfully */}
      {!loading && !error && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 shadow-2xl px-5 py-2.5 rounded-full text-slate-300 transition-all duration-300 z-50">
          
          {/* Page Navigation */}
          <div className="flex items-center gap-1">
              <button 
                onClick={() => changePage(-1)} 
                disabled={pageNum <= 1} 
                className="p-1.5 hover:bg-slate-700 rounded-full disabled:opacity-30 text-white transition-colors"
                title="Previous Page"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs font-medium text-white select-none min-w-[70px] text-center font-mono">
                {pageNum} / {pageCount}
              </span>
              <button 
                onClick={() => changePage(1)} 
                disabled={pageNum >= pageCount} 
                className="p-1.5 hover:bg-slate-700 rounded-full disabled:opacity-30 text-white transition-colors"
                title="Next Page"
              >
                <ChevronRight size={18} />
              </button>
          </div>

          <div className="w-px h-5 bg-slate-700"></div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 hover:bg-slate-700 rounded-full text-white transition-colors" title="Zoom Out">
                <ZoomOut size={18} />
              </button>
              <span className="text-xs text-white w-12 text-center select-none font-mono">
                {Math.round(scale * 100)}%
              </span>
              <button onClick={() => setScale(s => Math.min(3.0, s + 0.1))} className="p-1.5 hover:bg-slate-700 rounded-full text-white transition-colors" title="Zoom In">
                <ZoomIn size={18} />
              </button>
          </div>

          <div className="w-px h-5 bg-slate-700"></div>

          {/* Rotation */}
          <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-1.5 hover:bg-slate-700 rounded-full text-white transition-colors" title="Rotate Page">
              <RotateCw size={18} />
          </button>
        </div>
      )}
    </div>
  );
};