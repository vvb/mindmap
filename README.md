# MindMap - Beautiful Mind Mapping for macOS

A beautiful, cross-platform mind mapping application built with Electron, React, TypeScript, and D3.js. Create, organize, and visualize your ideas with an intuitive interface and powerful features.

## 📥 Installation

### For Users (Easy Installation)

Download the latest release for your platform:

1. Go to the [Releases page](https://github.com/vvb/mindmap/releases)
2. Download the latest `.dmg` file for macOS
3. Open the downloaded `.dmg` file
4. Drag the MindMap app to your Applications folder
5. Launch MindMap from your Applications

**Note**: On first launch, you may need to right-click the app and select "Open" to bypass macOS Gatekeeper.

## ✨ Features

- **🎨 Beautiful UI/UX**: Clean, modern interface with smooth animations and organic curved connections
- **⌨️ Keyboard Navigation**:
  - `Tab` - Create child node
  - `Shift+Tab` - Navigate to parent node
  - `Enter` - Edit selected node
  - `Delete/Backspace` - Delete selected node
  - `Cmd+Z` - Undo
  - `Cmd+Shift+Z` - Redo
  - `Cmd+S` - Save
  - `Cmd+O` - Open
- **🖱️ Mouse Controls**:
  - Click to select nodes
  - Double-click to edit node text
  - Drag nodes to reposition
  - Scroll/pinch to zoom
  - Drag canvas to pan
- **🎨 Node Styling**: Multiple color options for organizing your mindmap
- **💾 Save/Load**: Save your mindmaps as JSON files and load them later
- **📸 Export**: Export your mindmap as PNG images
- **↩️ Undo/Redo**: Full history support with unlimited undo/redo
- **🔄 Auto-layout**: Automatic tree layout with smooth curved connections

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## 🛠️ Development Setup

### For Developers

If you want to contribute or build from source:

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
