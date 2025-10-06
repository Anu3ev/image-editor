# Fabric Image Editor

A modern, powerful browser-based image editor built with <a href="https://fabricjs.com/" target="_blank">FabricJS</a> and TypeScript. This library provides a complete image editing solution with professional features for web applications.

🚀 **<a href="https://anu3ev.github.io/image-editor/" target="_blank">Live Demo</a>**

## ✨ Features

### Core Editing
- **Montage Area** - Dedicated workspace with clipping region for precise cropping
- **Multi-layer Support** - Layer management with ordering, visibility, and locking
- **History System** - Full undo/redo with state management
- **Object Transformations** - Zoom, rotate, flip, fit, and scale operations
- **Professional Tools** - Copy/paste, grouping, selection, and alignment

### Advanced Capabilities
- **Background Management** - Color, gradient, and image backgrounds
- **Image Import/Export** - Support for PNG, JPG, SVG, and PDF formats
- **Web Worker Integration** - Heavy operations run in background threads
- **Configurable Toolbar** - Dynamic toolbar with context-sensitive actions
- **Clipboard Integration** - Native copy/paste support with system clipboard

### Developer Features
- **TypeScript Support** - Full type definitions included
- **Modular Architecture** - Clean separation of concerns with manager classes
- **Event System** - Rich event handling for integration
- **Responsive Design** - Adapts to different screen sizes and containers
- **Testing Infrastructure** - Jest test suite with 45%+ coverage
- **Web Worker Support** - Background processing for heavy operations

## 📦 Installation

```bash
npm install @anu3ev/fabric-image-editor
```

**Requirements:**
- Node.js ≥ 20.0.0
- NPM ≥ 9.0.0
- Modern browser with ES2016+ support

## 🚀 Quick Start

### Basic Setup

Create a container in your HTML and initialize the editor:

```html
<div id="editor"></div>
```

```javascript
import initEditor from '@anu3ev/fabric-image-editor'

document.addEventListener('DOMContentLoaded', async () => {
  const editor = await initEditor('editor', {
    montageAreaWidth: 512,
    montageAreaHeight: 512,
    editorContainerWidth: '100%',
    editorContainerHeight: '100vh'
  })

  // The editor is now ready to use!
  console.log('Editor initialized:', editor)
})
```

### Working with Images

```javascript
// Import an image
await editor.imageManager.importImage({
  source: 'path/to/image.jpg',
  scale: 'image-contain' // 'image-contain', 'image-cover', 'scale-montage'
})

// Export the canvas
const result = await editor.imageManager.exportCanvasAsImageFile({
  fileName: 'edited-image.png',
  contentType: 'image/png' // Supports: 'image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf'
})

// Handle the exported file (result.image is File, Blob, or Base64 string)
const url = URL.createObjectURL(result.image)
// Use the URL for download or display
```

### Managing Backgrounds

```javascript
// Set a color background
editor.backgroundManager.setColorBackground({ color: '#ff0000' })

// Set a gradient background
editor.backgroundManager.setGradientBackground({
  gradient: {
    // 'linear' or 'radial'
    type: 'linear',
    angle: 45,
    startColor: '#ff0000',
    endColor: '#0000ff'
  },
  customData: {
    customProperty: 'value'
  },
  withoutSave: false
})

// Set an image background
await editor.backgroundManager.setImageBackground({ imageSource: 'bg-image.jpg' })
```

## 🎮 Demo Application

The repository includes a comprehensive demo showcasing all features:

```bash
git clone https://github.com/Anu3ev/image-editor.git
cd image-editor
npm install
npm run dev
```

Visit the demo at: **<a href="https://anu3ev.github.io/image-editor/" target="_blank">https://anu3ev.github.io/image-editor/</a>**

## 🏗️ Architecture

The editor follows a modular architecture with specialized managers:

### Core Managers
- **`ImageManager`** - Image import/export, format handling, PDF generation
- **`CanvasManager`** - Canvas sizing, scaling, and viewport management
- **`HistoryManager`** - Undo/redo functionality with state persistence
- **`LayerManager`** - Object layering, z-index management, send to back/front
- **`BackgroundManager`** - Background colors, gradients, and images
- **`TransformManager`** - Object transformations, fitting, and scaling

### Utility Managers
- **`SelectionManager`** - Object selection and multi-selection handling
- **`ClipboardManager`** - Copy/paste with system clipboard integration
- **`GroupingManager`** - Object grouping and ungrouping operations
- **`DeletionManager`** - Object deletion with group handling
- **`ShapeManager`** - Shape creation (rectangles, circles, triangles)
- **`ObjectLockManager`** - Object locking and unlocking functionality
- **`WorkerManager`** - Web Worker integration for heavy operations
- **`ModuleLoader`** - Dynamic module loading (jsPDF, etc.)
- **`ErrorManager`** - Error handling and user notifications

### UI Components
- **`ToolbarManager`** - Dynamic toolbar with configurable actions
- **`CustomizedControls`** - Custom FabricJS controls and interactions
- **`InteractionBlocker`** - UI blocking during operations

## 📚 API Reference

### Editor Initialization

```javascript
initEditor(containerId, options): Promise<ImageEditor>
```

**Parameters:**
- `containerId` (string) - HTML container element ID
- `options` (CanvasOptions) - Configuration object

**Common Options:**
```javascript
{
  // Canvas dimensions (internal resolution)
  montageAreaWidth: 512,
  montageAreaHeight: 512,

  // Container dimensions (display size)
  editorContainerWidth: '800px',
  editorContainerHeight: '600px',

  // Initial image
  initialImage: {
    source: 'path/to/image.jpg',
    scale: 'image-contain'
  },

  // Content types for import
  acceptContentTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],

  // Callback when ready
  _onReadyCallback: (editor) => console.log('Ready!')
}
```

### Core Methods

#### Image Operations
```javascript
// Import image from file or URL
await editor.imageManager.importImage({
  source: File | string,
  scale: 'image-contain' // or 'image-cover', 'scale-montage'
})

// Export canvas as image
await editor.imageManager.exportCanvasAsImageFile({
  fileName: 'export.png',
  contentType: 'image/png' // 'image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf'
})
```

#### Background Management
```javascript
// Color background
editor.backgroundManager.setColorBackground({ color: '#ff0000' })

// Gradient background
editor.backgroundManager.setLinearGradientBackground({
  angle: 45,
  startColor: '#ff0000',
  endColor: '#0000ff',
  startPosition: 0,
  endPosition: 100
})

// Image background
await editor.backgroundManager.setImageBackground({ imageSource: 'image.jpg' })

// Remove background
editor.backgroundManager.removeBackground()
```

#### Canvas Control
```javascript
// Scale montage area to fit image
editor.canvasManager.scaleMontageAreaToImage()

// Set canvas dimensions
editor.canvasManager.setCanvasBackstoreWidth(800)
editor.canvasManager.setCanvasBackstoreHeight(600)

// Zoom operations
editor.canvas.zoomToPoint(point, zoomLevel)
```

#### Object Transformations
```javascript
// Fit object to montage area
editor.transformManager.fitObject({
  type: 'contain',
  fitAsOneObject: true
})

// Reset object transformations
editor.transformManager.resetObject()

// Flip operations
editor.transformManager.flipX()
editor.transformManager.flipY()
```

#### Layer Management
```javascript
// Layer operations
editor.layerManager.sendToBack(object)
editor.layerManager.bringToFront(object)
editor.layerManager.sendBackwards(object)
editor.layerManager.bringForward(object)
```

#### History Control
```javascript
// Undo/Redo
editor.historyManager.undo()
editor.historyManager.redo()

// Save state
editor.historyManager.saveState()

// Load from JSON
editor.historyManager.loadStateFromFullState(jsonState)
```

## 🛠️ Development

### Building the Library

```bash
# Development mode with demo app and watch
npm run dev

# Development build to dev-build folder
npm run dev:build

# Production build (library to dist/)
npm run build

# Build for GitHub Pages (demo to docs/)
npm run build:docs
```

### Testing

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# CI mode
npm run test:ci
```

### Project Structure

```
src/
├── main.ts              # Entry point, exports initEditor()
├── editor/
│   ├── index.ts          # ImageEditor class
│   ├── defaults.ts       # Default configuration
│   ├── constants.ts      # Constants and limits
│   ├── listeners.ts      # Event handling
│   ├── background-manager/    # Background functionality
│   ├── canvas-manager/        # Canvas operations
│   ├── clipboard-manager/     # Copy/paste operations
│   ├── customized-controls/   # Custom FabricJS controls
│   ├── deletion-manager/      # Object deletion
│   ├── error-manager/         # Error handling
│   ├── grouping-manager/      # Object grouping
│   ├── history-manager/       # Undo/redo system
│   ├── image-manager/         # Image import/export
│   ├── interaction-blocker/   # UI blocking during operations
│   ├── layer-manager/         # Layer management
│   ├── module-loader/         # Dynamic module loading
│   ├── object-lock-manager/   # Object locking
│   ├── selection-manager/     # Selection handling
│   ├── shape-manager/         # Shape creation
│   ├── transform-manager/     # Object transformations
│   ├── worker-manager/        # Web Worker management
│   ├── ui/                    # UI components (toolbar)
│   └── types/                 # TypeScript definitions
├── demo/                 # Demo application
specs/                    # Test specifications
docs/                     # GitHub Pages build output
dev-build/                # Development build output
dist/                     # Production library build
vite.config.*.js         # Vite configurations
jest.config.ts           # Jest test configuration
```

## 🎯 Planned Features

The following features are planned for future releases:

- **Drawing Mode** - Freehand drawing tools and brushes
- **Text Support** - Text layers with formatting options (IText, Textbox)
- **Snap/Alignment** - Snap to edges, centers, and guides
- **Filters & Effects** - Image filters and visual effects
- **Extended Shape Library** - Additional shapes beyond current rectangles, circles, and triangles
- **Multi-language** - Internationalization support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup
```bash
git clone https://github.com/Anu3ev/image-editor.git
cd image-editor
npm install
npm run dev
```

### Running Tests
```bash
npm test                 # Run all tests
npm run test:watch      # Development mode
npm run test:coverage   # Coverage report
```

## 🔧 Browser Support

- **Chrome** ≥ 88
- **Firefox** ≥ 85
- **Safari** ≥ 14
- **Edge** ≥ 88

All modern browsers with ES2016+ and Web Workers support.

## 📄 License

MIT License - see <a href="LICENSE" target="_blank">LICENSE</a> file for details.

## 🙏 Acknowledgments

- Built with <a href="https://fabricjs.com/" target="_blank">FabricJS</a> - Powerful HTML5 canvas library
- <a href="https://vitejs.dev/" target="_blank">Vite</a> - Lightning fast build tool
- <a href="https://www.typescriptlang.org/" target="_blank">TypeScript</a> - Type safety and developer experience
- <a href="https://jestjs.io/" target="_blank">Jest</a> - Comprehensive testing framework

---

**Repository:** <a href="https://github.com/Anu3ev/image-editor" target="_blank">github.com/Anu3ev/image-editor</a>

**NPM Package:** <a href="https://www.npmjs.com/package/@anu3ev/fabric-image-editor" target="_blank">@anu3ev/fabric-image-editor</a>

**Live Demo:** <a href="https://anu3ev.github.io/image-editor/" target="_blank">anu3ev.github.io/image-editor</a>
