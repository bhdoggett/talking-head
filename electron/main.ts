import { app, BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";
import { loadConfig, saveConfig, getConfig } from "./config";
import { createTray } from "./tray";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const config = loadConfig();
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;

  const size = config.size;
  const x =
    config.position.x >= 0 ? config.position.x : screenWidth - size - 20;
  const y =
    config.position.y >= 0 ? config.position.y : screenHeight - size - 20;

  mainWindow = new BrowserWindow({
    width: size,
    height: size,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, "floating");
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

app.dock?.hide();

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle("get-config", () => {
    return getConfig();
  });

  ipcMain.handle(
    "set-position",
    (_event, delta: { x: number; y: number }) => {
      const win = mainWindow;
      if (!win) return;
      const [currentX, currentY] = win.getPosition();
      const newX = currentX + delta.x;
      const newY = currentY + delta.y;
      win.setPosition(newX, newY);
      const config = getConfig();
      config.position = { x: newX, y: newY };
      saveConfig(config);
    },
  );

  ipcMain.handle("set-size", (_event, data: { size: number }) => {
    const win = mainWindow;
    if (!win) return;
    const config = getConfig();
    const oldSize = config.size;
    const newSize = Math.max(80, Math.min(200, data.size));
    const [oldX, oldY] = win.getPosition();
    const delta = (oldSize - newSize) / 2;
    const newX = Math.round(oldX + delta);
    const newY = Math.round(oldY + delta);
    config.size = newSize;
    config.position = { x: newX, y: newY };
    saveConfig(config);
    win.setSize(newSize, newSize);
    win.setPosition(newX, newY);
  });

  ipcMain.handle("set-ignore-mouse-events", (_event, ignore: boolean) => {
    mainWindow?.setIgnoreMouseEvents(ignore, { forward: true });
  });

  ipcMain.handle("set-border-color", (_event, color: string) => {
    const config = getConfig();
    config.border.color = color;
    saveConfig(config);
    if (mainWindow) {
      mainWindow.webContents.send("config-changed", config);
    }
  });

  ipcMain.handle("set-hover", (_event, hovered: boolean) => {
    const win = mainWindow;
    if (!win) return;
    const config = getConfig();
    const size = config.size;
    if (hovered) {
      win.setSize(size, size + 44);
    } else {
      win.setSize(size, size);
    }
  });

  ipcMain.handle("set-background-blur", (_event, enabled: boolean) => {
    const config = getConfig();
    config.backgroundBlur = enabled;
    saveConfig(config);
    if (mainWindow) {
      mainWindow.webContents.send("config-changed", config);
    }
  });

  ipcMain.handle(
    "update-config",
    (_event, updates: Partial<import("./config").TalkingHeadConfig>) => {
      const config = getConfig();
      Object.assign(config, updates);
      saveConfig(config);
      if (mainWindow) {
        mainWindow.webContents.send("config-changed", config);
      }
    },
  );

  if (mainWindow) {
    createTray(mainWindow);
  }
});

app.on("window-all-closed", () => {
  app.quit();
});

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
