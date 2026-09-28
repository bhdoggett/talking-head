import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

export interface AppConfig {
  position: { x: number; y: number };
  size: number;
  cameraDeviceId: string | null;
  border: { width: number; color: string; shadowAmount: number };
  mirrored: boolean;
  blurAmount: number;
  opacity: number;
  zoom: number;
  shape: string;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

// listen() resolves its unlisten function asynchronously; hand back a sync cleanup for useEffect
function subscribe<T>(event: string, callback: (payload: T) => void): () => void {
  let disposed = false;
  let unlisten: (() => void) | null = null;
  listen<T>(event, (e) => callback(e.payload)).then((fn) => {
    if (disposed) fn();
    else unlisten = fn;
  });
  return () => {
    disposed = true;
    unlisten?.();
  };
}

export const api = {
  getConfig: () => invoke<AppConfig>("get_config"),
  updateConfig: (updates: Partial<AppConfig>) => invoke<void>("update_config", { updates }),
  setSize: (size: number) => invoke<void>("set_size", { size }),
  setCameras: (cameras: CameraDevice[]) => invoke<void>("set_cameras", { cameras }),
  toggleMenu: () => invoke<void>("toggle_menu"),
  resizeMenu: (width: number, height: number) => invoke<void>("resize_menu", { width, height }),
  closeMenu: () => invoke<void>("close_menu"),
  startDragging: () => getCurrentWindow().startDragging(),
  isMenuWindow: () => getCurrentWindow().label === "menu",
  onConfigChanged: (callback: (config: AppConfig) => void) =>
    subscribe<AppConfig>("config-changed", callback),
  onSetCamera: (callback: (deviceId: string) => void) =>
    subscribe<string>("set-camera", callback),
};
