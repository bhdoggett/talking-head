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

- **macOS (Apple Silicon):** `Talking.Head_x.x.x_aarch64.dmg`
- **macOS (Intel):** `Talking.Head_x.x.x_x64.dmg`
- **Windows:** `Talking.Head_x.x.x_x64-setup.exe`

## Development

```bash
npm install
npm run dev
```

Requires Node 22+ and a Rust toolchain (`rustup`).

## Test

```bash
cd src-tauri && cargo test
```

## Build

```bash
npm run build       # bundles for the current platform into src-tauri/target/release/bundle
```

Or push a version tag to trigger GitHub Actions builds:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Tech Stack

Tauri 2 (Rust), Vite, React, TypeScript, CSS Modules, MediaPipe Selfie Segmentation
