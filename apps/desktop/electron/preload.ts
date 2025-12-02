import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("ipcRenderer", {
  on: (
    channel: string,
    listener: (event: IpcRendererEvent, ...args: unknown[]) => void
  ) => {
    ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
  },
  send: (channel: string, data: unknown) => {
    ipcRenderer.send(channel, data);
  },
  // NEW: Expose the invoke method for async data fetching (like file dialogs)
  invoke: (channel: string, ...args: unknown[]) =>
    ipcRenderer.invoke(channel, ...args),
});
