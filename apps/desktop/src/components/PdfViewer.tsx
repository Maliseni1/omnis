import React from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Loader2, AlertCircle } from 'lucide-react';
import { usePdf } from '../hooks/usePdf';

interface PdfViewerProps {
  content: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ content }) => {
  const {
    canvasRef,
    numPages,
    pageNumber,
    loading,
    error,
    scale,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    rotate
  } = usePdf(content);

  return (
    <div className="w-full h-full bg-slate-100 flex flex-col items-center overflow-hidden">
      {/* Toolbar */}
      <div className="w-full bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-sm z-10 shrink-0">
         
         <div className="flex items-center gap-2">
            <button 
              onClick={prevPage} 
              disabled={pageNumber <= 1 || loading} 
              className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 text-slate-600 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-slate-600 select-none min-w-[80px] text-center">
               {loading ? '...' : `Page ${pageNumber} / ${numPages}`}
            </span>
            <button 
              onClick={nextPage} 
              disabled={pageNumber >= numPages || loading} 
              className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 text-slate-600 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
         </div>

         <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <button onClick={zoomOut} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600">
               <ZoomOut size={18} />
            </button>
            <span className="text-xs text-slate-500 w-12 text-center select-none font-mono">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={zoomIn} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600">
               <ZoomIn size={18} />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <button onClick={rotate} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600">
               <RotateCw size={18} />
            </button>
         </div>
      </div>

      {/* Rendering Area */}
      <div className="flex-1 w-full overflow-auto flex justify-center p-8 bg-slate-200/50">
        <div className="relative shadow-xl">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-20 min-h-[400px] min-w-[300px]">
               <div className="flex flex-col items-center text-indigo-500">
                 <Loader2 className="animate-spin mb-2" size={32} />
                 <span className="text-sm font-medium">Processing PDF...</span>
               </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-20 min-h-[400px] min-w-[300px]">
               <div className="flex flex-col items-center text-red-500 p-6 text-center">
                 <AlertCircle className="mb-2" size={32} />
                 <span className="text-sm font-medium">Error Loading PDF</span>
                 <span className="text-xs text-slate-400 mt-1 max-w-xs">{error}</span>
               </div>
            </div>
          )}

          <canvas ref={canvasRef} className="bg-white block" />
        </div>
      </div>
    </div>
  );
};