# Fabric Image Editor

A browser image editor built on top of [FabricJS](https://fabricjs.com/). The project exposes a library `@anu3ev/fabric-image-editor` that can be embedded in any web page and comes with a small demo application.

## Features

- Built-in montage area and clipping region
- Layer, history and selection management
- Object transformation (zoom, rotation, flip, fit, etc.)
- Clipboard and grouping helpers
- Offloads heavy tasks to a Web Worker

## Installation

```
npm install @anu3ev/fabric-image-editor
```

## Usage

Create a canvas container in your HTML and initialise the editor:

```html
<div id="editor"></div>
```

```javascript
import initEditor from '@anu3ev/fabric-image-editor'

document.addEventListener('DOMContentLoaded', async () => {
  const editor = await initEditor('editor', {
    width: 800,
    height: 600,
    displayWidth: '800px',
    displayHeight: '600px'
  })

  // use the `editor` instance...
})
```

## Running the demo

Clone this repository and install the dependencies:

```
npm install
npm run dev
```

This starts a Vite dev server and opens the demo from `index.html`.

## Building the library

Run `npm run build` to produce the library build in the `dist/` folder. The output is an ES module that can be published or used directly in your projects.

## Repository structure

```
src/
  main.ts        - library entry exporting `initEditor`
  demo/          - demo scripts and styles
  editor/        - ImageEditor class and feature managers
index.html       - demo page
vite.config.js   - Vite configuration
```

The `editor` directory contains managers responsible for canvas manipulation, image handling, history, layers, shapes, clipboard and more.

## Further reading

- Explore the manager classes in `src/editor` for details on how each feature works.
- Look at TODO comments throughout the codebase for areas that could be extended.
- Familiarise yourself with FabricJS to customise the editor's behaviour.

## License

MIT
