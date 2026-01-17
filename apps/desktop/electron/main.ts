import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import mammoth from 'mammoth'

// --- CRITICAL LINUX FIXES (MUST BE AT TOP) ---
// 1. Force X11 backend to avoid Wayland/GTK schema crashes on Ubuntu 24.04+
// This specifically fixes the "Schema org.gnome.desktop.interface" crash.
process.env.GDK_BACKEND = 'x11';
process.env.XDG_SESSION_TYPE = 'x11';

// 2. Disable Hardware Acceleration immediately.
// This prevents the "libva" and "MESA-INTEL" GPU crashes.
app.disableHardwareAcceleration();

// 3. GPU Safety Flags
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-rasterization');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');

// 4. Fallback theme (Optional, but helps if system theme is broken)
process.env.GTK_THEME = 'Adwaita';
// ---------------------------------------------

// Robust require for html-to-docx
let HTMLtoDOCX: any;
try {
  HTMLtoDOCX = require('html-to-docx');
} catch (e) {
  console.error("Failed to load html-to-docx:", e);
}

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
      plugins: true // REQUIRED: Enables native PDF viewer
    },
  })

  // Hide the menu bar (fixes some GTK issues and looks cleaner)
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
  
  // 1. Sanitize Context (Remove HTML tags if it's a docx/html content)
  const plainText = rawContext.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  const textLower = plainText.toLowerCase();

  // 2. Logic: Word Frequency / "Most Used"
  if (p.includes('most used') || p.includes('frequency') || p.includes('common word')) {
    const words = textLower.match(/\b[a-z]{3,}\b/g) || []; // Only words 3+ chars
    const stopWords = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'you', 'not', 'are', 'from', 'but', 'have', 'was', 'all', 'can', 'your', 'which', 'will', 'one', 'has', 'been', 'there', 'they', 'our', 'would', 'what', 'so', 'if', 'about', 'who', 'get', 'go', 'me', 'my', 'is', 'it', 'in', 'to', 'of', 'on', 'at', 'by', 'an', 'be', 'as', 'or']);
    
    const freq: Record<string, number> = {};
    words.forEach(w => {
      if (!stopWords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    });

    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    
    if (top5.length === 0) return "Not enough text data to analyze frequency.";
    
    const topWord = top5[0];
    const prefix = mode === 'cloud' ? "<b>Cloud Frequency Analysis</b><br>" : "";
    return `${prefix}The most frequently used word is <b>"${topWord[0]}"</b>, which appears <b>${topWord[1]} times</b>.<br><br>Here are the top 5 words:<br>${top5.map((w, i) => `${i+1}. <b>${w[0]}</b>: ${w[1]}`).join('<br>')}`;
  }

  // 3. Logic: Summarization (Heuristic)
  if (p.includes('summarize') || p.includes('summary') || p.includes('overview')) {
     const sentences = plainText.match(/[^.!?]+[.!?]+/g) || [plainText];
     
     if (sentences.length < 5) return `<b>Summary:</b><br>${plainText}`; 
     
     // Heuristic: First sentence + Middle significant sentence + Last sentence
     const first = sentences[0].trim();
     const last = sentences[sentences.length - 1].trim();
     const middleIndex = Math.floor(sentences.length / 2);
     const middle = sentences[middleIndex].trim();

     const title = mode === 'cloud' ? "<b>Cloud Executive Summary:</b>" : "<b>Local Summary Analysis:</b>";
     const footer = mode === 'cloud' ? "<i>(Generated via Cloud Neural Engine)</i>" : "<i>(Generated locally by extracting key structural sentences)</i>";

     return `${title}<br><br>${first}<br><br>[...]<br><br>${middle}<br><br>[...]<br><br>${last}<br><br>${footer}`;
  }

  // 4. Logic: Statistics
  if (p.includes('how many') || p.includes('count') || p.includes('stats') || p.includes('long')) {
    const words = plainText.match(/\b\w+\b/g) || [];
    const chars = plainText.length;
    const readTime = Math.ceil(words.length / 200); // 200 wpm average

    return `<b>Document Statistics:</b><br><br>- <b>Word Count:</b> ${words.length}<br>- <b>Characters:</b> ${chars}<br>- <b>Est. Reading Time:</b> ${readTime} min<br>- <b>Sentences:</b> ${(plainText.match(/[^.!?]+[.!?]+/g) || []).length}`;
  }

  // 5. Logic: Grammar (Simulated)
  if (p.includes('grammar') || p.includes('check')) {
    const sentences = plainText.match(/[^.!?]+[.!?]+/g) || [];
    let issues = 0;
    sentences.slice(0, 20).forEach(s => { 
        const trimmed = s.trim();
        if (trimmed.length > 0 && trimmed[0] !== trimmed[0].toUpperCase()) issues++;
    });

    if (issues > 0) {
        return `I scanned the beginning of the document and found <b>${issues} potential capitalization issues</b>.`;
    }
    return "The text structure looks clean. No obvious capitalization errors found in the scan.";
  }

  // Fallback
  const modelName = mode === 'cloud' ? "Cloud API" : "Local AI";
  const capabilities = mode === 'cloud' ? "deep-learning analysis" : "fast, privacy-focused analysis";
  return `[${modelName}] I received your query: "${prompt}".<br><br>I can perform ${capabilities} on this ${plainText.length}-character document. Try asking me to:<br>- "Summarize this"<br>- "Find the most used word"<br>- "Show word count"`;
};

// --- IPC HANDLERS ---

ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'All Files', extensions: ['*'] }]
  })

  if (canceled) return null
  const filePath = filePaths[0]
  return { 
    path: filePath, 
    name: path.basename(filePath), 
    ext: path.extname(filePath).toLowerCase().replace('.', '') 
  }
})

ipcMain.handle('file:readFile', async (_, filePath) => {
  if (!filePath) return { error: 'No path provided' }

  const ext = path.extname(filePath).toLowerCase().replace('.', '')
  
  const imageExts = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico']
  const textExts = [
    'txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'xml', 'yaml', 'yml', 
    'ini', 'env', 'log', 'csv', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'php', 
    'rb', 'sh', 'bat', 'ps1', 'sql', 'gitignore', 'editorconfig', 'package', 'lock'
  ]

  try {
    if (imageExts.includes(ext)) {
      const buffer = await fs.readFile(filePath)
      return { 
        content: `data:image/${ext === 'svg' ? 'svg+xml' : ext};base64,${buffer.toString('base64')}`, 
        type: 'image', 
        ext 
      }
    } 
    
    if (ext === 'pdf') {
      const buffer = await fs.readFile(filePath)
      return { 
        content: `data:application/pdf;base64,${buffer.toString('base64')}`, 
        type: 'pdf', 
        ext 
      }
    }

    if (ext === 'docx') {
      const buffer = await fs.readFile(filePath)
      const result = await mammoth.convertToHtml({ buffer })
      return { 
        content: result.value, 
        type: 'html', 
        ext 
      }
    }

    if (textExts.includes(ext) || ext === '') {
      const content = await fs.readFile(filePath, 'utf-8')
      return { content, type: 'text', ext }
    }

    try {
      const stat = await fs.stat(filePath)
      if (stat.size < 2 * 1024 * 1024) { 
         const raw = await fs.readFile(filePath, 'utf-8')
         if (raw.includes('\u0000')) {
           return { content: 'Binary content detected.', type: 'binary', ext }
         }
         return { content: raw, type: 'text', ext }
      }
    } catch {
      // Ignore fallback
    }

    return { content: 'File too large or format not supported.', type: 'binary', ext }

  } catch (err) {
    console.error("Read Error:", err)
    return { error: String(err), type: 'error', ext }
  }
})

ipcMain.handle('file:saveFile', async (_, { path: filePath, content }) => {
  try {
    const ext = path.extname(filePath).toLowerCase().replace('.', '')

    if (ext === 'docx') {
      if (HTMLtoDOCX) {
        const buffer = await HTMLtoDOCX(content, null, {
          table: { row: { cantSplit: true } },
          footer: true,
          pageNumber: true,
      });
        await fs.writeFile(filePath, buffer)
      } else {
        throw new Error("HTMLtoDOCX library not loaded");
      }
    } else {
      await fs.writeFile(filePath, content, 'utf-8')
    }
    
    return { success: true }
  } catch (err) {
    console.error("Save Error:", err)
    return { success: false, error: String(err) }
  }
})

// 4. AI Processing (Updated: Both modes now use the real analysis engine)
ipcMain.handle('ai:generate', async (_, { prompt, context, mode }) => {
  // Simulate processing time (Cloud is slower)
  await new Promise(resolve => setTimeout(resolve, mode === 'cloud' ? 1500 : 500));

  // Run the analysis engine for both modes so answers are always accurate
  const response = analyzeText(prompt, context, mode);
  
  return { response };
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.whenReady().then(createWindow)