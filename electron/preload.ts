import { contextBridge, ipcRenderer } from "electron";

export const electronAPI = {
  setPosition: (x: number, y: number) =>
    ipcRenderer.invoke("set-position", { x, y }),
  setSize: (size: number) => ipcRenderer.invoke("set-size", { size }),
  setIgnoreMouseEvents: (ignore: boolean) =>
    ipcRenderer.invoke("set-ignore-mouse-events", ignore),
  setHover: (hovered: boolean) =>
    ipcRenderer.invoke("set-hover", hovered),
  getConfig: () => ipcRenderer.invoke("get-config"),
  updateConfig: (updates: Record<string, unknown>) =>
    ipcRenderer.invoke("update-config", updates),
  setBorderColor: (color: string) =>
    ipcRenderer.invoke("set-border-color", color),
  toggleMenu: () => ipcRenderer.invoke("toggle-menu"),
  resizeMenu: (width: number, height: number) =>
    ipcRenderer.invoke("resize-menu", { width, height }),
  onConfigChanged: (callback: (config: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, config: unknown) =>
      callback(config);
    ipcRenderer.on("config-changed", handler);
    return () => ipcRenderer.removeListener("config-changed", handler);
  },
  onSetCamera: (callback: (deviceId: string) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { deviceId: string },
    ) => callback(data.deviceId);
    ipcRenderer.on("set-camera", handler);
    return () => ipcRenderer.removeListener("set-camera", handler);
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
