import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import mammoth from 'mammoth'
const HTMLtoDOCX = require('html-to-docx')

// --- CRITICAL LINUX STABILITY FIXES ---
// 1. Force Software Rendering (Bypasses libva/MESA-INTEL errors)
app.disableHardwareAcceleration()

// 2. Disable Sandbox and GPU features that often crash on Ubuntu/WSL
app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-software-rasterizer')
app.commandLine.appendSwitch('disable-gpu-compositing')
app.commandLine.appendSwitch('disable-gpu-rasterization')
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('--no-zygote')

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')

let win: BrowserWindow | null
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC as string, 'electron-vite.svg'),
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Helps with loading local resources
      plugins: true // REQUIRED: Enables the native PDF viewer (iframe)
    },
  })

  // Hide the menu bar
  win.setMenuBarVisibility(false);

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST as string, 'index.html'))
  }
}

// --- HELPER: Analysis Logic (Shared) ---
const analyzeText = (prompt: string, rawContext: string, mode: 'local' | 'cloud'): string => {
  const p = prompt.toLowerCase();
  const plainText = rawContext.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  const textLower = plainText.toLowerCase();

  // Logic: Word Frequency
  if (p.includes('most used') || p.includes('frequency') || p.includes('common word')) {
    const words = textLower.match(/\b[a-z]{3,}\b/g) || [];
    const stopWords = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'you', 'not', 'are', 'from', 'but', 'have', 'was', 'all', 'can', 'your', 'which', 'will', 'one', 'has', 'been', 'there', 'they', 'our', 'would', 'what', 'so', 'if', 'about', 'who', 'get', 'go', 'me', 'my', 'is', 'it', 'in', 'to', 'of', 'on', 'at', 'by', 'an', 'be', 'as', 'or']);
    
    const freq: Record<string, number> = {};
    words.forEach(w => { if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const topWord = sorted[0];
    const prefix = mode === 'cloud' ? "<b>Cloud Frequency Analysis</b><br>" : "";
    
    if (!topWord) return "No words found to analyze.";
    return `${prefix}The most frequently used word is <b>"${topWord[0]}"</b>, which appears <b>${topWord[1]} times</b>.`;
  }
  
  // Logic: Summarization
  if (p.includes('summarize') || p.includes('summary')) {
      return `<b>Summary:</b><br>${plainText.substring(0, 300)}...<br><i>(Generated via ${mode} mode)</i>`;
  }

  // Default Fallback
  return `[${mode === 'cloud' ? 'Cloud' : 'Local'}] I received your query: "${prompt}". I can analyze this ${plainText.length}-character document.`;
};

// --- IPC HANDLERS ---

ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (canceled) return null;
  const filePath = filePaths[0];
  return { path: filePath, name: path.basename(filePath), ext: path.extname(filePath).toLowerCase().replace('.', '') };
})

// NEW: Save File Dialog Handler
ipcMain.handle('dialog:saveFile', async (_, { defaultName, ext }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: `${ext.toUpperCase()} Files`, extensions: [ext] }]
  });
  return { canceled, filePath };
});

ipcMain.handle('file:readFile', async (_, filePath) => {
  if (!filePath) return { error: 'No path provided' }
  const ext = path.extname(filePath).toLowerCase().replace('.', '')
  
  try {
    if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
      const buffer = await fs.readFile(filePath)
      return { content: `data:image/${ext === 'svg' ? 'svg+xml' : ext};base64,${buffer.toString('base64')}`, type: 'image', ext }
    } 
    if (ext === 'pdf') {
      const buffer = await fs.readFile(filePath)
      // Native iframe needs base64
      return { content: `data:application/pdf;base64,${buffer.toString('base64')}`, type: 'pdf', ext }
    }
    if (ext === 'docx') {
      const buffer = await fs.readFile(filePath)
      const result = await mammoth.convertToHtml({ buffer })
      return { content: result.value, type: 'html', ext }
    }
    // Default Text
    const content = await fs.readFile(filePath, 'utf-8')
    return { content, type: 'text', ext }
  } catch (err) {
    return { error: String(err), type: 'error', ext }
  }
})

ipcMain.handle('file:saveFile', async (_, { path: filePath, content }) => {
  try {
    const ext = path.extname(filePath).toLowerCase().replace('.', '')
    if (ext === 'docx') {
      const buffer = await HTMLtoDOCX(content);
      await fs.writeFile(filePath, buffer)
    } else {
      await fs.writeFile(filePath, content, 'utf-8')
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('ai:generate', async (_, { prompt, context, mode }) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return { response: analyzeText(prompt, context, mode) };
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
app.whenReady().then(createWindow)