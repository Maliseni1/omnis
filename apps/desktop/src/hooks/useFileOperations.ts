import { useCallback } from 'react';

// Interfaces for types used in operations
interface OpenFile {
  id: string;
  name: string;
  type: string;
  ext: string;
  content: string;
  path: string;
  lastSavedContent?: string;
}

interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

interface SaveFileResult {
  success: boolean;
  error?: string;
}

export const useFileOperations = (
  activeFile: OpenFile | undefined,
  setOpenFiles: React.Dispatch<React.SetStateAction<OpenFile[]>>,
  setIsLoading: (loading: boolean) => void
) => {

  const handleSaveFile = useCallback(async () => {
    if (!activeFile) return;
    setIsLoading(true);
    
    try {
      let filePath = activeFile.path;

      // Handle "Save As" for new files (empty path)
      if (!filePath) {
        // Explicitly cast the result to our interface to fix TS errors
        const saveDialogResult = (await window.ipcRenderer.invoke('dialog:saveFile', {
           defaultName: activeFile.name,
           ext: activeFile.ext
        })) as SaveDialogResult;

        if (saveDialogResult && !saveDialogResult.canceled && saveDialogResult.filePath) {
           filePath = saveDialogResult.filePath;
        } else {
           setIsLoading(false);
           return; // Cancelled
        }
      }

      const result = (await window.ipcRenderer.invoke('file:saveFile', { 
        path: filePath, 
        content: activeFile.content 
      })) as SaveFileResult;

      if (result.success) {
        setOpenFiles(prev => prev.map(f => 
          f.id === activeFile.id ? { 
            ...f, 
            path: filePath, // Update path in case it was a new file
            name: filePath.split(/[\\/]/).pop() || f.name, // Update name from path
            lastSavedContent: f.content 
          } : f
        ));
        console.log("File saved successfully to", filePath);
      } else {
        console.error("Save failed:", result.error);
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeFile, setOpenFiles, setIsLoading]);

  const handleShareFile = useCallback(async () => {
    if (!activeFile) return;
    
    try {
      if (activeFile.type === 'text' || activeFile.type === 'html') {
         await navigator.clipboard.writeText(activeFile.content);
         alert("Document content copied to clipboard!");
      } else if (activeFile.path) {
         await navigator.clipboard.writeText(activeFile.path);
         alert("File path copied to clipboard!");
      } else {
         alert("Save the file first to share it.");
      }
    } catch (e) {
      console.error("Share failed", e);
    }
  }, [activeFile]);

  return { handleSaveFile, handleShareFile };
};