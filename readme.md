# Fabric Image Editor

[![Tests](https://github.com/Anu3ev/image-editor/actions/workflows/test.yml/badge.svg?branch=refactor)](https://github.com/Anu3ev/image-editor/actions/workflows/test.yml)
[![Coverage](https://img.shields.io/badge/coverage-96%25-brightgreen)](https://github.com/Anu3ev/image-editor/actions)

Fabric Image Editor is a browser-based image editor powered by [FabricJS](https://fabricjs.com/). It is published as the library `@anu3ev/fabric-image-editor` and can be embedded into any web page. The repository also contains a small demo application that showcases the library's capabilities.

## Features

- Montage area and clipping region for easy cropping
- Layer, history and selection managers
- Object transformation helpers (zoom, rotate, flip, fit)
- Copy/paste and grouping tools
- Heavy operations are executed in a Web Worker to keep the UI responsive
- Configurable toolbar with actions for selected objects

## Installation

```bash
npm install @anu3ev/fabric-image-editor
````

## Quick Start

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

  // work with the `editor` instance...
})
```

## Running the Demo

Clone this repository and install dependencies:

```bash
npm install
npm run dev
```

A Vite dev server will start and open the demo page from `index.html`.

## Building the Library

Use `npm run build` to create the library build in the `dist/` directory. The output is an ES module that can be published to npm or used directly in other projects.

## Project Structure

```
src/
  main.ts        – entry point exporting `initEditor`
  demo/          – demo scripts and styles
  editor/        – ImageEditor class and feature managers
index.html       – demo page
vite.config.js   – Vite configuration
```

The `editor` directory is divided into managers for canvas manipulation, image handling, history, layers, shapes, clipboard and more. Look inside these files to understand how each feature works.

## Further Reading

* Explore the manager classes under `src/editor` for implementation details
* Check TODO comments in the code for planned features and improvements
* Familiarize yourself with FabricJS to extend the editor

## License

MIT
