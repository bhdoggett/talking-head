# Changelog

## v0.1.1

### New Features
- **Shapes**: Circle, Rounded Square, Pill, Star, Heart, Squiggle, and Outline (person silhouette)
- **Opacity control**: 100% / 80% / 60% / 40% presets
- **Keyboard shortcut**: Cmd+Shift+H to toggle bubble visibility
- **Popout settings menu**: Click the ellipsis on hover to open a standalone settings window with flyout submenus

### Improvements
- Upgraded to MediaPipe Tasks Vision for sharper segmentation edges
- Background blur no longer bleeds person colors into the background
- Smooth transitions between blur on/off (no grey flash)
- Borders disabled for complex shapes (star, heart, squiggle, pill, outline) with tooltip explanation
- Shadow follows shape via drop-shadow for non-circular shapes
- Smoother circle border using box-shadow instead of CSS border

### Fixes
- Camera permission prompt now works in built DMG (added entitlement + NSCameraUsageDescription)
- Camera stream reliably attaches after async config load
- Config changes broadcast to all windows (main bubble + settings menu)
- Menu state updates in real-time when toggling options

## v0.1.0

### Initial Release
- Circular webcam overlay, always on top
- Draggable positioning
- Scroll-to-resize (Small 200px / Medium 260px / Large 320px)
- Background blur via MediaPipe selfie segmentation
- Configurable border (style, color, custom color picker)
- Shadow toggle
- Mirror toggle
- macOS tray menu with full settings access
- Hover ellipsis for quick settings access
- All settings persist to ~/.talking-head/config.json
- macOS DMG build with app icon
