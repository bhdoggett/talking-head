import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export type BubbleShape =
  | "circle"
  | "rounded-square"
  | "pill"
  | "rectangle"
  | "star"
  | "heart"
  | "squiggle"
  | "outline";

export interface TalkingHeadConfig {
  position: { x: number; y: number };
  size: number;
  cameraDeviceId: string | null;
  border: { width: number; color: string; shadowAmount: number };
  mirrored: boolean;
  blurAmount: number;
  opacity: number;
  shape: BubbleShape;
}

const CONFIG_DIR = path.join(os.homedir(), ".talking-head");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: TalkingHeadConfig = {
  position: { x: -1, y: -1 },
  size: 150,
  cameraDeviceId: null,
  border: { width: 2, color: "#ffffff", shadowAmount: 5 },
  mirrored: true,
  blurAmount: 0,
  opacity: 1.0,
  shape: "circle",
};

let currentConfig: TalkingHeadConfig = { ...DEFAULT_CONFIG };

export function loadConfig(): TalkingHeadConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      currentConfig = { ...DEFAULT_CONFIG, ...(parsed as Partial<TalkingHeadConfig>) };
      // Migrate: backgroundBlur boolean → blurAmount number
      if ("backgroundBlur" in parsed && !("blurAmount" in parsed)) {
        currentConfig.blurAmount = parsed.backgroundBlur ? 10 : 0;
      }
      // Migrate: border.shadow boolean → border.shadowAmount number
      const oldBorder = parsed.border as Record<string, unknown> | undefined;
      if (oldBorder && "shadow" in oldBorder && !("shadowAmount" in oldBorder)) {
        currentConfig.border = { ...currentConfig.border, shadowAmount: oldBorder.shadow ? 5 : 0 };
      }
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
