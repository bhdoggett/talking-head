# Talking Head

A lightweight desktop app that shows your webcam in a circular overlay — designed to be captured by screen recording tools like QuickTime or Kapture.

## Features

- Circular camera bubble, always on top
- Draggable — click and drag anywhere
- Resizable — scroll wheel or menu presets (Small / Medium / Large)
- Background blur via MediaPipe selfie segmentation
- Configurable border (style, color, shadow)
- Custom color picker
- Mirror toggle
- macOS tray menu + hover ellipsis menu
- Settings persist across sessions

## Download

Grab the latest build from the [Releases page](https://github.com/bhdoggett/talking-head/releases).

- **macOS (Apple Silicon):** `Talking Head-x.x.x-arm64.dmg`
- **macOS (Intel):** `Talking Head-x.x.x-x64.dmg`
- **Windows:** `Talking Head-x.x.x-setup.exe`

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run dist        # macOS arm64
npm run dist:all    # macOS + Windows
```

Or push a version tag to trigger GitHub Actions builds:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Tech Stack

Electron, Vite, React, TypeScript, CSS Modules, MediaPipe Selfie Segmentation
