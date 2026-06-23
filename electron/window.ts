import { BrowserWindow } from "electron";
import { getConfig, saveConfig } from "./config";

let isHovered = false;
export const SHADOW_PAD = 20;
let onConfigBroadcast: (() => void) | null = null;

export function setConfigBroadcast(fn: () => void): void {
  onConfigBroadcast = fn;
}

export function setHovered(value: boolean): void {
  isHovered = value;
}

export function getHovered(): boolean {
  return isHovered;
}

export function resizeBubble(win: BrowserWindow, newSize: number): void {
  const config = getConfig();
  const oldSize = config.size;
  const clamped = Math.max(80, Math.min(320, newSize));
  const [oldX, oldY] = win.getPosition();
  const delta = (oldSize - clamped) / 2;
  const newX = Math.round(oldX + delta);
  const newY = Math.round(oldY + delta);
  config.size = clamped;
  config.position = { x: newX, y: newY };
  saveConfig(config);
  win.setSize(clamped + SHADOW_PAD, clamped + SHADOW_PAD + (isHovered ? 44 : 0));
  win.setPosition(newX, newY);
  onConfigBroadcast?.();
}
