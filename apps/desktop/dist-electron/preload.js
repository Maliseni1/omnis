"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on: (channel, listener) => {
    electron.ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
  },
  send: (channel, data) => {
    electron.ipcRenderer.send(channel, data);
  },
  // NEW: Expose the invoke method for async data fetching (like file dialogs)
  invoke: (channel, ...args) => electron.ipcRenderer.invoke(channel, ...args)
});
