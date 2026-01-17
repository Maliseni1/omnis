import { useState, useEffect, useCallback, useRef } from 'react';
import { configurePdfWorker, getPdfLib } from '../utils/pdfWorker';


export const usePdf = (content: string) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for rendering
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // 1. Initialize & Load
  useEffect(() => {
    if (!content) return;

    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      
      try {
        configurePdfWorker();
        const pdfjs = getPdfLib();

        // Destroy previous instance
        if (pdfDoc) {
          pdfDoc.destroy();
        }

        const loadingTask = pdfjs.getDocument(content);
        const doc = await loadingTask.promise;
        
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageNumber(1);
        setLoading(false);
      } catch (err: any) {
        console.error("PDF Load Failed:", err);
        setError(err.message || "Failed to load document");
        setLoading(false);
      }
    };

    loadDocument();
    
    return () => {
       // Cleanup logic if needed
    };
  }, [content]);

  // 2. Render Page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(pageNumber);
      
      // Calculate viewport
      const viewport = page.getViewport({ scale, rotation });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      // Handle High DPI displays
      const outputScale = window.devicePixelRatio || 1;
      
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = Math.floor(viewport.width) + "px";
      canvas.style.height = Math.floor(viewport.height) + "px";

      // Clear previous render
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const transform = outputScale !== 1 
        ? [outputScale, 0, 0, outputScale, 0, 0] 
        : null;

      const renderContext = {
        canvasContext: context,
        transform: transform,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error("Page Render Error:", err);
      }
    }
  }, [pdfDoc, pageNumber, scale, rotation]);

  // Trigger render on state changes
  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Navigation handlers
  const nextPage = () => setPageNumber(p => Math.min(p + 1, numPages));
  const prevPage = () => setPageNumber(p => Math.max(1, p - 1));
  const zoomIn = () => setScale(s => Math.min(s + 0.2, 3.0));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));
  const rotate = () => setRotation(r => (r + 90) % 360);

  return {
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
  };
};