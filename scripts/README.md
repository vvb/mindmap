# Icon Generation

## Quick Start

To regenerate all icon files from `build/icon.png`:

```bash
npm run icons
```

This will generate:
- `build/icon.icns` - macOS icon
- `build/icon.ico` - Windows icon

## Files

- **`resources/icon.svg`** - Source SVG file (editable)
- **`build/icon.png`** - Base PNG (1024x1024, generated from SVG)
- **`build/icon.icns`** - macOS icon (auto-generated)
- **`build/icon.ico`** - Windows icon (auto-generated)

## Updating the Icon

### Method 1: Edit the SVG (Recommended)

1. Edit `resources/icon.svg` in your favorite editor
2. Open `scripts/generate-icons.html` in your browser
3. Download the 1024x1024 PNG
4. Save it as `build/icon.png`
5. Run `npm run icons` to generate platform-specific icons

### Method 2: Replace the PNG directly

1. Create a new 1024x1024 PNG icon
2. Save it as `build/icon.png`
3. Run `npm run icons` to generate platform-specific icons

## Icon Design

The current icon features:
- **Purple gradient background** - Modern and professional
- **Mind map structure** - Central node with 4 branches extending outward
- **Light bulb symbol** - Represents ideas and creativity
- **Clean, modern design** - Works well at all sizes (16x16 to 1024x1024)

## Technical Details

The `npm run icons` script:
1. Uses macOS `sips` and `iconutil` to generate `.icns` from PNG
2. Uses `png2icons` npm package to generate `.ico` from PNG
3. Creates all required sizes for each platform

When you run `npm run build:mac` or `npm run build:win`, electron-builder will automatically use these icon files.

