import type { IpcRendererEvent } from "electron";

declare global {
  interface Window {
    ipcRenderer: {
      on(
        channel: string,
        listener: (event: IpcRendererEvent, ...args: unknown[]) => void
      ): void;
      send(channel: string, args: unknown): void;
      invoke(channel: string, ...args: unknown[]): Promise<unknown>;
    };
  }
}
