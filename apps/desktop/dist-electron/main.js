"use strict";
const electron = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = electron.app.isPackaged ? process.env.DIST : path.join(__dirname, "../public");
let win;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  win = new electron.BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
}
electron.ipcMain.handle("dialog:openFile", async () => {
  const { canceled, filePaths } = await electron.dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "All Files", extensions: ["*"] }]
  });
  if (canceled) return null;
  const filePath = filePaths[0];
  const ext = path.extname(filePath).toLowerCase().replace(".", "");
  const name = path.basename(filePath);
  let content = "";
  let type = "unknown";
  const imageExts = ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"];
  const codeExts = [
    "txt",
    "md",
    "json",
    "js",
    "ts",
    "tsx",
    "jsx",
    "css",
    "html",
    "py",
    "java",
    "c",
    "cpp"
  ];
  try {
    if (imageExts.includes(ext)) {
      type = "image";
      const buffer = await fs.readFile(filePath);
      content = `data:image/${ext === "svg" ? "svg+xml" : ext};base64,${buffer.toString("base64")}`;
    } else if (ext === "pdf") {
      type = "pdf";
      const buffer = await fs.readFile(filePath);
      content = `data:application/pdf;base64,${buffer.toString("base64")}`;
    } else if (codeExts.includes(ext)) {
      type = "text";
      content = await fs.readFile(filePath, "utf-8");
    } else {
      type = "binary";
      content = "Preview unavailable for this binary format.";
    }
  } catch (err) {
    console.error("Error reading file", err);
    return null;
  }
  return { id: crypto.randomUUID(), name, type, ext, content, path: filePath };
});
electron.ipcMain.handle("file:saveFile", async (_, { path: filePath, content }) => {
  try {
    await fs.writeFile(filePath, content, "utf-8");
    return { success: true };
  } catch (err) {
    console.error("Failed to save", err);
    return { success: false, error: String(err) };
  }
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
});
electron.app.whenReady().then(createWindow);
