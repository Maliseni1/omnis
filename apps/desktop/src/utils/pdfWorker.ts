import * as pdfjsLib from 'pdfjs-dist';

let isWorkerConfigured = false;

export const configurePdfWorker = () => {
  if (isWorkerConfigured) return;

  try {
    // 1. Try to use the CDN version which matches the installed version.
    // This is often the most robust way in Electron to avoid bundling weirdness with workers.
    // We use a specific version known to work well.
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    
    isWorkerConfigured = true;
    console.log(`PDF Worker configured via CDN: ${pdfjsLib.version}`);
  } catch (error) {
    console.error("Failed to configure PDF worker:", error);
  }
};

export const getPdfLib = () => pdfjsLib;