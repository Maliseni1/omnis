import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import mammoth from 'mammoth'
import JSZip from 'jszip'
import PptxGenJS from 'pptxgenjs'
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

interface PresentationSlide {
  id: string;
  title: string;
  body: string;
}

interface PresentationDocument {
  slides: PresentationSlide[];
}

const decodeXml = (value: string): string =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const htmlToPlain = (value: string): string =>
  value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

const extractSlidesFromPptx = async (filePath: string): Promise<PresentationDocument> => {
  const fileBuffer = await fs.readFile(filePath);
  const zip = await JSZip.loadAsync(fileBuffer);
  const slideEntries = Object.keys(zip.files)
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry))
    .sort((a, b) => {
      const aNum = Number((a.match(/slide(\d+)\.xml/) || [])[1] || '0');
      const bNum = Number((b.match(/slide(\d+)\.xml/) || [])[1] || '0');
      return aNum - bNum;
    });

  const slides: PresentationSlide[] = [];
  for (let index = 0; index < slideEntries.length; index += 1) {
    const entryPath = slideEntries[index];
    const xml = await zip.files[entryPath].async('text');
    const textRuns = Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g), (match) =>
      decodeXml(match[1]),
    );

    const [titleRaw, ...bodyRuns] = textRuns;
    const title = titleRaw?.trim() || `Slide ${index + 1}`;
    const body = bodyRuns.join('\n').trim();
    slides.push({ id: `slide-${index + 1}`, title, body });
  }

  if (slides.length === 0) {
    slides.push({ id: 'slide-1', title: 'Slide 1', body: '' });
  }

  return { slides };
};

const buildPptxFromSlides = async (slides: PresentationSlide[]): Promise<Buffer> => {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Omnis';
  pptx.subject = 'Presentation';
  pptx.title = 'Omnis Presentation';
  pptx.company = 'Chiza Labs';

  const safeSlides = slides.length > 0 ? slides : [{ id: 'slide-1', title: 'Slide 1', body: '' }];
  safeSlides.forEach((slide, index) => {
    const page = pptx.addSlide();
    page.addText(htmlToPlain(slide.title || `Slide ${index + 1}`), {
      x: 0.5,
      y: 0.5,
      w: 12.3,
      h: 0.9,
      fontSize: 30,
      bold: true,
      color: '1E293B',
    });
    page.addText(htmlToPlain(slide.body || ''), {
      x: 0.7,
      y: 1.7,
      w: 12.0,
      h: 4.8,
      fontSize: 18,
      color: '334155',
      valign: 'top',
      breakLine: true,
    });
  });

  const arrayBuffer = (await pptx.write({ outputType: 'arraybuffer' })) as ArrayBuffer;
  return Buffer.from(arrayBuffer);
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
    if (ext === 'pptx') {
      const presentation = await extractSlidesFromPptx(filePath);
      return { content: JSON.stringify(presentation), type: 'pptx', ext };
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
    } else if (ext === 'pptx') {
      let slides: PresentationSlide[] = [];
      try {
        const parsed = JSON.parse(content) as PresentationDocument;
        slides = Array.isArray(parsed.slides) ? parsed.slides : [];
      } catch {
        slides = [{ id: 'slide-1', title: 'Slide 1', body: content }];
      }
      const buffer = await buildPptxFromSlides(slides);
      await fs.writeFile(filePath, buffer);
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

ipcMain.handle('app:checkUpdate', async () => {
  const current = app.getVersion();
  // Placeholder updater endpoint until GitHub release checks are integrated.
  return {
    update: false,
    current,
    latest: current,
    url: 'https://github.com/maliseni1/omnis/releases',
  };
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
app.whenReady().then(createWindow)