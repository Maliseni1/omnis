import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import mammoth from "mammoth";
import HTMLtoDOCX from "html-to-docx";

process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(__dirname, "../public");

let win: BrowserWindow | null;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC as string, "electron-vite.svg"),
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST as string, "index.html"));
  }
}

// --- IPC HANDLERS ---

ipcMain.handle("dialog:openFile", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "All Files", extensions: ["*"] }],
  });

  if (canceled) return null;
  const filePath = filePaths[0];
  return {
    path: filePath,
    name: path.basename(filePath),
    ext: path.extname(filePath).toLowerCase().replace(".", ""),
  };
});

ipcMain.handle("file:readFile", async (_, filePath) => {
  if (!filePath) return { error: "No path provided" };

  const ext = path.extname(filePath).toLowerCase().replace(".", "");

  const imageExts = ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico"];
  const textExts = [
    "txt",
    "md",
    "json",
    "js",
    "ts",
    "tsx",
    "jsx",
    "css",
    "html",
    "xml",
    "yaml",
    "yml",
    "ini",
    "env",
    "log",
    "csv",
    "py",
    "java",
    "c",
    "cpp",
    "h",
    "cs",
    "go",
    "rs",
    "php",
    "rb",
    "sh",
    "bat",
    "ps1",
    "sql",
    "gitignore",
    "editorconfig",
    "package",
    "lock",
  ];

  try {
    // 1. Handle Images
    if (imageExts.includes(ext)) {
      const buffer = await fs.readFile(filePath);
      return {
        content: `data:image/${ext === "svg" ? "svg+xml" : ext};base64,${buffer.toString("base64")}`,
        type: "image",
        ext,
      };
    }

    // 2. Handle PDF
    if (ext === "pdf") {
      const buffer = await fs.readFile(filePath);
      return {
        content: `data:application/pdf;base64,${buffer.toString("base64")}`,
        type: "pdf",
        ext,
      };
    }

    // 3. Handle DOCX (Read as HTML)
    if (ext === "docx") {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.convertToHtml({ buffer });
      return {
        content: result.value,
        type: "html",
        ext,
      };
    }

    // 4. Handle Text & Code
    if (textExts.includes(ext) || ext === "") {
      const content = await fs.readFile(filePath, "utf-8");
      return { content, type: "text", ext };
    }

    // 5. Universal Fallback
    try {
      const stat = await fs.stat(filePath);
      if (stat.size < 2 * 1024 * 1024) {
        const raw = await fs.readFile(filePath, "utf-8");
        // Basic binary check
        if (raw.includes("\u0000")) {
          return { content: "Binary content detected.", type: "binary", ext };
        }
        return { content: raw, type: "text", ext };
      }
    } catch {
      // Ignore fallback errors and return generic message
    }

    return {
      content: "File too large or format not supported.",
      type: "binary",
      ext,
    };
  } catch (err) {
    console.error("Read Error:", err);
    return { error: String(err), type: "error", ext };
  }
});

// 3. SAVE Handler
ipcMain.handle("file:saveFile", async (_, { path: filePath, content }) => {
  try {
    const ext = path.extname(filePath).toLowerCase().replace(".", "");

    if (ext === "docx") {
      // Convert HTML back to DOCX buffer
      const buffer = await HTMLtoDOCX(content, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
      });
      await fs.writeFile(filePath, buffer);
    } else {
      // Standard text save
      await fs.writeFile(filePath, content, "utf-8");
    }

    return { success: true };
  } catch (err) {
    console.error("Save Error:", err);
    return { success: false, error: String(err) };
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.whenReady().then(createWindow);
