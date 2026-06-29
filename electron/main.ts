import { app, BrowserWindow, globalShortcut, ipcMain, screen } from "electron";
import path from "node:path";
import { loadConfig, saveConfig, getConfig } from "./config";
import { createTray } from "./tray";
import { resizeBubble, setHovered, getHovered, SHADOW_PAD, setConfigBroadcast } from "./window";

let mainWindow: BrowserWindow | null = null;
let menuWindow: BrowserWindow | null = null;

function broadcastConfig(): void {
  const config = getConfig();
  mainWindow?.webContents.send("config-changed", config);
  if (menuWindow && !menuWindow.isDestroyed()) {
    menuWindow.webContents.send("config-changed", config);
  }
}

function toggleMenuWindow(): void {
  if (menuWindow && !menuWindow.isDestroyed()) {
    menuWindow.close();
    menuWindow = null;
    return;
  }
  if (!mainWindow) return;

  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const [bx, by] = mainWindow.getPosition();
  const [bw, bh] = mainWindow.getSize();

  const menuW = 400;
  const estimatedMenuH = 380;

  // Right of bubble, clamped so the window never overflows the screen edge
  const menuX = Math.min(bx + bw - 2, screenW - menuW);

  // Align to bubble top; shift up if not enough space below
  const menuY = Math.max(10, Math.min(by + 10, screenH - estimatedMenuH));

  menuWindow = new BrowserWindow({
    width: menuW,
    height: estimatedMenuH,
    x: menuX,
    y: menuY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  menuWindow.setAlwaysOnTop(true, "floating");
  menuWindow.setVisibleOnAllWorkspaces(true);

  if (process.env.ELECTRON_RENDERER_URL) {
    menuWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#menu`);
  } else {
    menuWindow.loadFile(path.join(__dirname, "../../dist/index.html"), {
      hash: "menu",
    });
  }

  menuWindow.once("ready-to-show", () => {
    menuWindow?.show();
    menuWindow?.focus();
    setTimeout(() => {
      menuWindow?.on("blur", () => {
        if (menuWindow && !menuWindow.isDestroyed()) {
          menuWindow.close();
          menuWindow = null;
        }
      });
    }, 500);
  });

  menuWindow.on("closed", () => {
    menuWindow = null;
  });

}

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
    width: size + SHADOW_PAD,
    height: size + SHADOW_PAD,
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
  setConfigBroadcast(broadcastConfig);

  globalShortcut.register("CommandOrControl+Shift+H", () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  ipcMain.handle("toggle-menu", () => {
    toggleMenuWindow();
  });

  ipcMain.handle("resize-menu", (_event, data: { width: number; height: number }) => {
    if (menuWindow && !menuWindow.isDestroyed()) {
      menuWindow.setSize(data.width, data.height);
    }
  });

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
    if (mainWindow) resizeBubble(mainWindow, data.size);
  });

  ipcMain.handle("set-ignore-mouse-events", (_event, ignore: boolean) => {
    mainWindow?.setIgnoreMouseEvents(ignore, { forward: true });
  });

  ipcMain.handle("set-border-color", (_event, color: string) => {
    const config = getConfig();
    config.border.color = color;
    saveConfig(config);
    broadcastConfig();
  });

  ipcMain.handle("set-hover", (_event, hovered: boolean) => {
    const win = mainWindow;
    if (!win) return;
    setHovered(hovered);
    const config = getConfig();
    const size = config.size;
    win.setSize(size + SHADOW_PAD, size + SHADOW_PAD + (hovered ? 44 : 0));
  });

  ipcMain.handle(
    "update-config",
    (_event, updates: Partial<import("./config").TalkingHeadConfig>) => {
      const config = getConfig();
      Object.assign(config, updates);
      saveConfig(config);
      broadcastConfig();
    },
  );

  if (mainWindow) {
    createTray(mainWindow);
  }
});

app.on("window-all-closed", () => {
  app.quit();
});
