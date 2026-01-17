import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import mammoth from 'mammoth'
const HTMLtoDOCX = require('html-to-docx')

// --- CONFIGURATION ---
const GITHUB_REPO = "Maliseni1/omnis"; // GitHub repo for update checks
const APP_VERSION = app.getVersion(); // Reads version from package.json

// --- LINUX/UBUNTU STABILITY OVERRIDES ---
app.disableHardwareAcceleration();
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

  win.setMenuBarVisibility(false);

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
    // Trigger automatic update check on load
    checkUpdatesAndNotify(win!);
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST as string, 'index.html'))
  }
}

// --- UPDATE CHECKER LOGIC ---
const checkUpdatesAndNotify = async (window: BrowserWindow) => {
  const result = await performUpdateCheck();
  if (result.update) {
    window.webContents.send('update-available', result);
  }
};

const performUpdateCheck = async () => {
  try {
    // 1. Fetch latest release from GitHub API
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { 'User-Agent': 'Omnis-Desktop-App' }
    });
    
    if (!response.ok) throw new Error('Repo not found or private');
    
    const data: any = await response.json();
    const latestTag = data.tag_name || 'v0.0.0';
    const latestVersion = latestTag.replace(/^v/, '');
    
    // 2. Compare versions (Simple string compare for now, ideally use semver)
    const isUpdate = latestVersion !== APP_VERSION && latestVersion > APP_VERSION;

    return { 
      update: isUpdate, 
      current: APP_VERSION, 
      latest: latestVersion, 
      url: data.html_url,
      releaseNotes: data.body
    };
  } catch (error: any) {
    console.error("Update check failed:", error);
    return { update: false, current: APP_VERSION, error: error.message };
  }
};

// --- HELPER: Analysis Logic ---
const analyzeText = (prompt: string, rawContext: string, mode: 'local' | 'cloud'): string => {
  // ... (Keep existing AI logic as is)
  const p = prompt.toLowerCase();
  const plainText = rawContext.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  
  if (p.includes('summarize')) return `<b>Summary:</b><br>${plainText.substring(0, 200)}...`;
  
  return `[${mode}] Analyzed ${plainText.length} chars.`;
};

// --- IPC HANDLERS ---

ipcMain.handle('app:checkUpdate', async () => {
  return await performUpdateCheck();
});

ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (canceled) return null;
  const filePath = filePaths[0];
  return { path: filePath, name: path.basename(filePath), ext: path.extname(filePath).toLowerCase().replace('.', '') };
})

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
      return { content: `data:application/pdf;base64,${buffer.toString('base64')}`, type: 'pdf', ext }
    }
    if (ext === 'docx') {
      const buffer = await fs.readFile(filePath)
      const result = await mammoth.convertToHtml({ buffer })
      return { content: result.value, type: 'html', ext }
    }
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
  await new Promise(resolve => setTimeout(resolve, mode === 'cloud' ? 1500 : 500));
  const response = analyzeText(prompt, context, mode);
  return { response };
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
app.whenReady().then(createWindow)