import {
  Tray,
  Menu,
  nativeImage,
  BrowserWindow,
  app,
} from "electron";
import path from "node:path";
import { getConfig, saveConfig, TalkingHeadConfig } from "./config";
import { resizeBubble } from "./window";

let tray: Tray | null = null;

function sendConfigToRenderer(win: BrowserWindow, config: TalkingHeadConfig) {
  win.webContents.send("config-changed", config);
}

async function buildMenu(win: BrowserWindow): Promise<Menu> {
  const config = getConfig();

  let devices: { deviceId: string; label: string }[] = [];
  try {
    devices = await win.webContents.executeJavaScript(
      `navigator.mediaDevices.enumerateDevices().then(ds => ds.filter(d => d.kind === "videoinput").map(d => ({ deviceId: d.deviceId, label: d.label || "Camera " + d.deviceId.slice(0, 4) })))`,
    );
  } catch {
    devices = [];
  }

  const cameraSubmenu =
    devices.length > 0
      ? devices.map((d) => ({
          label: d.label,
          type: "radio" as const,
          checked: config.cameraDeviceId === d.deviceId,
          click: () => {
            const c = getConfig();
            c.cameraDeviceId = d.deviceId;
            saveConfig(c);
            win.webContents.send("set-camera", { deviceId: d.deviceId });
          },
        }))
      : [{ label: "No cameras found", enabled: false }];

  return Menu.buildFromTemplate([
    {
      label: "Camera",
      submenu: cameraSubmenu,
    },
    {
      label: "Size",
      submenu: [
        {
          label: "Small (200px)",
          type: "radio" as const,
          checked: config.size === 200,
          click: () => resizeBubble(win, 200),
        },
        {
          label: "Medium (260px)",
          type: "radio" as const,
          checked: config.size === 260,
          click: () => resizeBubble(win, 260),
        },
        {
          label: "Large (320px)",
          type: "radio" as const,
          checked: config.size === 320,
          click: () => resizeBubble(win, 320),
        },
      ],
    },
    {
      label: "Border",
      submenu: [
        {
          label: "Style",
          submenu: [
            {
              label: "None",
              type: "radio" as const,
              checked: config.border.width === 0,
              click: () => setBorder(win, { width: 0 }),
            },
            {
              label: "Thin (2px)",
              type: "radio" as const,
              checked: config.border.width === 2,
              click: () => setBorder(win, { width: 2 }),
            },
            {
              label: "Medium (4px)",
              type: "radio" as const,
              checked: config.border.width === 4,
              click: () => setBorder(win, { width: 4 }),
            },
            {
              label: "Thick (6px)",
              type: "radio" as const,
              checked: config.border.width === 6,
              click: () => setBorder(win, { width: 6 }),
            },
          ],
        },
        {
          label: "Color",
          submenu: [
            {
              label: "White",
              type: "radio" as const,
              checked: config.border.color === "#ffffff",
              click: () => setBorder(win, { color: "#ffffff" }),
            },
            {
              label: "Black",
              type: "radio" as const,
              checked: config.border.color === "#000000",
              click: () => setBorder(win, { color: "#000000" }),
            },
            {
              label: "Gray",
              type: "radio" as const,
              checked: config.border.color === "#888888",
              click: () => setBorder(win, { color: "#888888" }),
            },
            {
              label: "Custom...",
              click: () => openColorPicker(win),
            },
          ],
        },
        {
          label: "Shadow",
          submenu: [
            {
              label: "On",
              type: "radio" as const,
              checked: config.border.shadow === true,
              click: () => setBorder(win, { shadow: true }),
            },
            {
              label: "Off",
              type: "radio" as const,
              checked: config.border.shadow === false,
              click: () => setBorder(win, { shadow: false }),
            },
          ],
        },
      ],
    },
    {
      label: "Mirror",
      type: "checkbox",
      checked: config.mirrored,
      click: (menuItem) => {
        const c = getConfig();
        c.mirrored = menuItem.checked;
        saveConfig(c);
        sendConfigToRenderer(win, c);
      },
    },
    {
      label: "Background Blur",
      type: "checkbox",
      checked: config.backgroundBlur,
      click: (menuItem) => {
        const c = getConfig();
        c.backgroundBlur = menuItem.checked;
        saveConfig(c);
        sendConfigToRenderer(win, c);
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);
}


function setBorder(
  win: BrowserWindow,
  updates: Partial<TalkingHeadConfig["border"]>,
) {
  const config = getConfig();
  config.border = { ...config.border, ...updates };
  saveConfig(config);
  sendConfigToRenderer(win, config);
}

function openColorPicker(win: BrowserWindow) {
  const picker = new BrowserWindow({
    width: 300,
    height: 120,
    parent: win,
    modal: false,
    frame: true,
    resizable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "../preload/preload.js"),
    },
  });

  const config = getConfig();
  const currentColor = config.border.color;

  const html = `<!DOCTYPE html>
<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;gap:12px;font-family:system-ui;background:#1e1e1e;color:#fff">
<label>Border Color:</label>
<input type="color" id="c" value="${currentColor}" style="width:60px;height:40px;border:none;cursor:pointer">
<button id="btn" style="padding:6px 16px;cursor:pointer;border-radius:4px;border:none;background:#4a9eff;color:#fff">Apply</button>
<script>
document.getElementById('btn').addEventListener('click', () => {
  const color = document.getElementById('c').value;
  window.electronAPI.setBorderColor(color).then(() => window.close());
});
</script>
</body></html>`;

  picker.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

export function createTray(win: BrowserWindow): Tray {
  const icon = nativeImage.createFromNamedImage(
    "NSImageNameTouchBarVideoCallTemplate",
    [-1, 0, 1],
  );
  tray = new Tray(icon);
  tray.setToolTip("Talking Head");

  buildMenu(win).then((menu) => tray?.setContextMenu(menu));

  return tray;
}

