import { app, BrowserWindow, screen } from "electron";
import path from "node:path";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;

  const defaultSize = 150;

  mainWindow = new BrowserWindow({
    width: defaultSize,
    height: defaultSize,
    x: screenWidth - defaultSize - 20,
    y: screenHeight - defaultSize - 20,
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
});

app.on("window-all-closed", () => {
  app.quit();
});

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
