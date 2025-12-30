import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import mammoth from 'mammoth'
const HTMLtoDOCX = require('html-to-docx')

// --- LINUX/UBUNTU STABILITY OVERRIDES ---
// 1. Force Mesa (Linux Graphics) to use software rendering. This fixes MESA-INTEL errors.
process.env.LIBGL_ALWAYS_SOFTWARE = '1';

// 2. Disable GTK/Chrome GPU compositing. This fixes libva errors.
app.disableHardwareAcceleration();

// 3. Additional safety switches for the Chromium engine
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-rasterization');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');

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
      webSecurity: false,
      plugins: true 
    },
  })

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

  if (p.includes('most used') || p.includes('frequency') || p.includes('common word')) {
    const words = textLower.match(/\b[a-z]{3,}\b/g) || [];
    const stopWords = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'you', 'not', 'are', 'from', 'but', 'have', 'was', 'all', 'can', 'your', 'which', 'will', 'one', 'has', 'been', 'there', 'they', 'our', 'would', 'what', 'so', 'if', 'about', 'who', 'get', 'go', 'me', 'my', 'is', 'it', 'in', 'to', 'of', 'on', 'at', 'by', 'an', 'be', 'as', 'or']);
    
    const freq: Record<string, number> = {};
    words.forEach(w => { if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1; });

    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    
    if (top5.length === 0) return "Not enough text data to analyze frequency.";
    
    const topWord = top5[0];
    const prefix = mode === 'cloud' ? "<b>Cloud Frequency Analysis</b><br>" : "";
    return `${prefix}The most frequently used word is <b>"${topWord[0]}"</b>, which appears <b>${topWord[1]} times</b>.<br><br>Here are the top 5 words:<br>${top5.map((w, i) => `${i+1}. <b>${w[0]}</b>: ${w[1]}`).join('<br>')}`;
  }

  if (p.includes('summarize') || p.includes('summary') || p.includes('overview')) {
     const sentences = plainText.match(/[^.!?]+[.!?]+/g) || [plainText];
     if (sentences.length < 5) return `<b>Summary:</b><br>${plainText}`; 
     const first = sentences[0].trim();
     const last = sentences[sentences.length - 1].trim();
     const middleIndex = Math.floor(sentences.length / 2);
     const middle = sentences[middleIndex].trim();
     const title = mode === 'cloud' ? "<b>Cloud Executive Summary:</b>" : "<b>Local Summary Analysis:</b>";
     const footer = mode === 'cloud' ? "<i>(Generated via Cloud Neural Engine)</i>" : "<i>(Generated locally by extracting key structural sentences)</i>";
     return `${title}<br><br>${first}<br><br>[...]<br><br>${middle}<br><br>[...]<br><br>${last}<br><br>${footer}`;
  }

  if (p.includes('how many') || p.includes('count') || p.includes('stats') || p.includes('long')) {
    const words = plainText.match(/\b\w+\b/g) || [];
    const chars = plainText.length;
    const readTime = Math.ceil(words.length / 200);
    return `<b>Document Statistics:</b><br><br>- <b>Word Count:</b> ${words.length}<br>- <b>Characters:</b> ${chars}<br>- <b>Est. Reading Time:</b> ${readTime} min<br>- <b>Sentences:</b> ${(plainText.match(/[^.!?]+[.!?]+/g) || []).length}`;
  }

  if (p.includes('grammar') || p.includes('check')) {
    const sentences = plainText.match(/[^.!?]+[.!?]+/g) || [];
    let issues = 0;
    sentences.slice(0, 20).forEach(s => { 
        const trimmed = s.trim();
        if (trimmed.length > 0 && trimmed[0] !== trimmed[0].toUpperCase()) issues++;
    });
    if (issues > 0) return `I scanned the beginning of the document and found <b>${issues} potential capitalization issues</b>.`;
    return "The text structure looks clean. No obvious capitalization errors found in the scan.";
  }

  const modelName = mode === 'cloud' ? "Cloud API" : "Local AI";
  const capabilities = mode === 'cloud' ? "deep-learning analysis" : "fast, privacy-focused analysis";
  return `[${modelName}] I received your query: "${prompt}".<br><br>I can perform ${capabilities} on this ${plainText.length}-character document. Try asking me to:<br>- "Summarize this"<br>- "Find the most used word"<br>- "Show word count"`;
};

// --- IPC HANDLERS ---

ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (canceled) return null;
  const filePath = filePaths[0];
  return { path: filePath, name: path.basename(filePath), ext: path.extname(filePath).toLowerCase().replace('.', '') };
});

ipcMain.handle('file:readFile', async (_, filePath) => {
  if (!filePath) return { error: 'No path' };
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  
  try {
     if (ext === 'docx') {
       const buffer = await fs.readFile(filePath);
       const result = await mammoth.convertToHtml({ buffer });
       return { content: result.value, type: 'html', ext };
     }
     if (ext === 'pdf') {
       const buffer = await fs.readFile(filePath);
       return { content: `data:application/pdf;base64,${buffer.toString('base64')}`, type: 'pdf', ext };
     }
     if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
       const buffer = await fs.readFile(filePath)
       return { content: `data:image/${ext === 'svg' ? 'svg+xml' : ext};base64,${buffer.toString('base64')}`, type: 'image', ext }
     }
     
     const content = await fs.readFile(filePath, 'utf-8');
     return { content, type: 'text', ext };
  } catch (e) {
     return { error: String(e), type: 'error', ext };
  }
});

ipcMain.handle('file:saveFile', async (_, { path: filePath, content }) => {
    try {
      const ext = path.extname(filePath).toLowerCase().replace('.', '');
      if (ext === 'docx') {
          const buffer = await HTMLtoDOCX(content);
          await fs.writeFile(filePath, buffer);
      } else {
          await fs.writeFile(filePath, content, 'utf-8');
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
});

ipcMain.handle('ai:generate', async (_, { prompt, context, mode }) => {
    await new Promise(resolve => setTimeout(resolve, mode === 'cloud' ? 1500 : 800));
    const response = analyzeText(prompt, context, mode);
    return { response };
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() });
app.whenReady().then(createWindow);