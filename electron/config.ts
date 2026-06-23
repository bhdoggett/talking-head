import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface TalkingHeadConfig {
  position: { x: number; y: number };
  size: number;
  cameraDeviceId: string | null;
  border: { width: number; color: string; shadow: boolean };
  mirrored: boolean;
  backgroundBlur: boolean;
}

const CONFIG_DIR = path.join(os.homedir(), ".talking-head");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: TalkingHeadConfig = {
  position: { x: -1, y: -1 },
  size: 150,
  cameraDeviceId: null,
  border: { width: 2, color: "#ffffff", shadow: true },
  mirrored: true,
  backgroundBlur: false,
};

let currentConfig: TalkingHeadConfig = { ...DEFAULT_CONFIG };

export function loadConfig(): TalkingHeadConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(raw) as Partial<TalkingHeadConfig>;
      currentConfig = { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    currentConfig = { ...DEFAULT_CONFIG };
  }
  return currentConfig;
}

export function saveConfig(config: TalkingHeadConfig): void {
  currentConfig = config;
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getConfig(): TalkingHeadConfig {
  return currentConfig;
}
