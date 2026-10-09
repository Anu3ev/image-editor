# Integration guide

[Back to the README](../README.md) · [Quick start](../README.md#-quick-start) · [Development](../CONTRIBUTING.md)

The examples use the `editor` instance created in [Initialization and cleanup](#initialization-and-cleanup).

## Contents

- [Initialization and cleanup](#initialization-and-cleanup)
- [Language and translations](#language-and-translations)
- [Errors and events](#errors-and-events)
- [Images and export](#images-and-export)
- [Text](#text)
- [Shapes](#shapes)
- [Backgrounds](#backgrounds)
- [Cropping](#cropping)
- [Canvas size and viewport](#canvas-size-and-viewport)
- [Transforms, layers, and alignment](#transforms-layers-and-alignment)
- [History](#history)
- [Templates and persistence](#templates-and-persistence)
- [Deletion guards and copied objects](#deletion-guards-and-copied-objects)
- [Fonts](#fonts)

## Initialization and cleanup

Call `initEditor(containerId, options)` after the container exists. It returns `Promise<ImageEditor>` and rejects if initialization fails or the editor is destroyed before it is ready.

This example uses top-level `await` in an ES module.

```typescript
import initEditor, { type EditorOptions, type ImageEditor } from '@anu3ev/fabric-image-editor'

/** Options for this application's editor. */
const options: Partial<EditorOptions> = {
  montageAreaWidth: 800,
  montageAreaHeight: 600,
  editorContainerWidth: '100%',
  editorContainerHeight: '600px',
  initialImage: { source: '/images/product.jpg', scale: 'image-contain' },
  acceptContentTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
  fonts: [],
  toolbar: { offsetTop: 12 }
}

/** Keep the instance in the owning page or component. */
const editor: ImageEditor = await initEditor('editor', options)
```

Common initialization options:

| Option | Purpose |
| --- | --- |
| `montageAreaWidth`, `montageAreaHeight` | Artboard dimensions in the composition's scene coordinates. |
| `editorContainerWidth`, `editorContainerHeight` | CSS dimensions of the editor's container. |
| `initialImage` | An image source and import options for the initial composition. |
| `initialState` | A complete serialized editor state to restore on initialization. |
| `acceptContentTypes` | Allowed image MIME types for import. |
| `fonts` | Font definitions that replace the default collection. |
| `showToolbar`, `toolbar` | Visibility and configuration of the contextual toolbar. |
| `canDeleteObject`, `prepareObjectClone` | Application rules for deletion and copied object metadata. |
| `_onReadyCallback` | Optional `(editor) => void` notification after initialization. For sequential setup, prefer awaiting `initEditor()`. |

The complete option contract is [`EditorOptions`](../src/editor/types/options.ts), with editor-specific properties in [`fabric-extensions.d.ts`](../src/editor/types/fabric-extensions.d.ts) and defaults in [`defaults.ts`](../src/editor/defaults.ts).

`ImageEditor` also exposes the initialization promise:

```typescript
await editor.ready
```

`initEditor()` already waits for this promise. Source-level integrations that construct `ImageEditor` directly must await `ready` before using its managers. The npm entry point exports `ImageEditor` as a TypeScript type, not as a constructor.

The artboard is called the *montage area* in the API. `montageAreaWidth` and `montageAreaHeight` define the composition's dimensions; container dimensions define its display size. Zoom does not change export resolution.

In an application with server rendering, load and initialize the editor on the client. Pass only one instance per container. When the owning view is removed, remove application listeners and call:

```typescript
editor.destroy()
```

Repeated `destroy()` calls are safe. Destroy the previous instance before mounting another editor in the same container.

## Language and translations

Set `language` when initializing the editor. English (`en`) is the default and fallback; Russian (`ru`) is also bundled. Locale codes are case-insensitive. Missing translations resolve through the requested regional locale, its base language, then English. For example, `pt-BR` can use a custom `pt` catalog, with missing keys falling back to English. Unsupported languages also fall back to English.

Use `customLanguages` to add locales or partially override built-in ones. The exported `EditorLocale` type provides nested key completion; every key is optional and accepts a translated string. `CustomLanguages` types a map of locale codes to catalogs.

```ts
import initEditor, { type CustomLanguages } from '@anu3ev/fabric-image-editor'

const customLanguages = {
  ru: { ui: { toolbar: { delete: 'Убрать' } } }
} satisfies CustomLanguages

const editor = await initEditor('editor', {
  language: 'ru-RU',
  customLanguages
})
```

This overrides only the Russian Delete label; other built-in translations remain available. See the [English catalog](../src/editor/i18n/en.ts) for all keys and interpolation placeholders. Preserve placeholders such as `{{width}}`, `{{height}}`, `{{angle}}`, and `{{format}}` when translating their values.

Resources are copied for each editor, so one instance's customizations never affect another. The language is fixed at initialization; destroy and recreate an instance to choose another language.

The selected language applies to built-in toolbar labels, indicators, default inserted text, and export filenames. Authored text, custom toolbar labels, serialized content, event names, and error codes remain unchanged. The development demo's own controls are English-only.

Actionable errors and warnings may include an optional localized `userMessage`, customizable through the `notifications` branch of `EditorLocale`. Library-authored technical `message` fields and console diagnostics remain in English; caller-provided messages and external errors are preserved. See [Errors and events](#errors-and-events) for displaying notifications and handling initialization failures.

## Errors and events

Manager operations can report errors through `editor:error`. Some methods also return `null`, including failed image import/export and shape creation with an unknown preset. Check the documented result before using it.

```typescript
/** Unsubscribe when the application stops observing this editor. */
const stopObservingErrors = editor.canvas.on('editor:error', ({ code, message }) => {
  console.error(code, message)
})

// In the owning component's cleanup:
stopObservingErrors()
```

For notifications, display the optional `userMessage` as plain text, or use your application's fallback for the event's `code`. This applies to both `editor:error` and `editor:warning`, including entries in `editor.errorManager.buffer`. The `message` field is a technical diagnostic, not display text. Library-authored `userMessage` values use the instance language and the `notifications` branch of its `customLanguages` catalog; explicitly supplied messages are forwarded unchanged. Initialization can reject before the application subscribes, so also catch the promise returned by `initEditor()`.

Typed events are declared in [`events.d.ts`](../src/editor/types/events.d.ts). Examples include `editor:history-changed`, `editor:canvas-exported`, `editor:template-applied`, and `editor:objects-delete-skipped`.

## Images and export

Import a browser `File` or a URL. This example loads a same-origin asset:

```typescript
/** Imported image and its format metadata. */
const imported = await editor.imageManager.importImage({
  source: '/images/product.jpg',
  scale: 'image-contain'
})

if (!imported) throw new Error('The image could not be imported.')

editor.layerManager.sendToBack(imported.image)
```

The scale modes are `image-contain`, `image-cover`, and `scale-montage`. The first two fit the image to the artboard; `scale-montage` adjusts the artboard to the image. Default import types include PNG, JPEG, WebP, and SVG. You can restrict them with `acceptContentTypes` during initialization.

Export the current artboard as a Blob:

```typescript
/** Snapshot of the current composition, independent of viewport zoom. */
const result = await editor.imageManager.exportCanvasAsImageFile({
  fileName: 'product-card.png',
  contentType: 'image/png',
  exportAsBlob: true
})

if (!result) throw new Error('The image could not be exported.')
if (typeof result.image === 'string') throw new Error('Expected a Blob export.')

/** Use this URL for a preview or download, then revoke it when no longer needed. */
const previewUrl = URL.createObjectURL(result.image)
```

The result type includes `File`, `Blob`, and data URL variants, so TypeScript requires narrowing even with `exportAsBlob: true`. Call `URL.revokeObjectURL(previewUrl)` when the preview or download no longer needs the URL. To upload the image, pass the returned file or Blob to your own API.

| Output | `contentType` | Notes |
| --- | --- | --- |
| PNG | `image/png` | Supports transparency. |
| JPEG | `image/jpeg` | Transparent areas are filled white. |
| WebP | `image/webp` | Requires browser encoder support. |
| SVG | `image/svg+xml` | Intended for vector compositions. For photos or mixed raster/vector content, request PNG, JPEG, or WebP explicitly. |
| PDF | `application/pdf` | A raster snapshot placed on a PDF page; PDF import is not provided. |

For PNG, JPEG, WebP, and vector SVG, omit both export flags for a `File`. Use `exportAsBlob: true` for a Blob or `exportAsBase64: true` for a data URL; choose one flag.

For PDF, omit `exportAsBlob` and use the returned File, or set `exportAsBase64: true` for a PDF data URL. The current `exportAsBlob` path returns the intermediate raster snapshot before PDF generation.

Remote image servers must allow cross-origin access.

## Text

```typescript
/** Editable caption placed in canvas scene coordinates. */
const caption = editor.textManager.addText({
  text: 'New collection',
  fontFamily: 'Arial',
  fontSize: 36,
  bold: true,
  align: 'center',
  color: '#18232f',
  backgroundColor: '#ffffff',
  backgroundOpacity: 0.9,
  paddingTop: 12,
  paddingRight: 20,
  paddingBottom: 12,
  paddingLeft: 20,
  radiusTopLeft: 8,
  radiusTopRight: 8,
  radiusBottomRight: 8,
  radiusBottomLeft: 8
})

editor.textManager.updateText({
  target: caption,
  style: { text: 'Weekend offer', uppercase: true, color: '#a43821' }
})
```

Without `left` and `top`, new text is centered on the artboard. Explicit placement follows Fabric.js scene coordinates and `originX`/`originY`; these are not DOM or screen coordinates. Users can double-click text to edit it. Use manager methods for application-driven updates so layout and history are handled together.

For example, place a caption near the artboard's top-left corner, then update its outline, padding, and background corners:

```typescript
/** Caption positioned explicitly in scene coordinates. */
const positionedCaption = editor.textManager.addText({
  text: 'Limited edition',
  left: 24,
  top: 24,
  originX: 'left',
  originY: 'top',
  fontFamily: 'Arial',
  fontSize: 36,
  backgroundColor: '#ffffff'
})

editor.textManager.updateText({
  target: positionedCaption,
  style: {
    strokeColor: '#2563eb',
    strokeWidth: 2,
    paddingTop: 20,
    paddingBottom: 20,
    radiusTopLeft: 16,
    radiusTopRight: 16
  }
})
```

## Shapes

Shapes combine an outer shape with editable text inside it. Use the shape API to update either part while keeping layout, transforms, copy/paste, and restoration consistent.

Create a shape with text:

```typescript
/** Promotional label with an editable caption. */
const badge = await editor.shapeManager.add({
  presetKey: 'badge',
  options: {
    id: 'promo-badge',
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'top',
    width: 220,
    height: 160,
    text: 'SALE',
    fill: '#18232f',
    stroke: '#f59e0b',
    strokeWidth: 4,
    textStyle: { fontFamily: 'Arial', fontSize: 34, color: '#ffffff', bold: true },
    alignH: 'center',
    alignV: 'middle'
  }
})

if (!badge) throw new Error('The shape preset is not available.')
```

Update the badge's text. `updateTextStyle()` applies `TextManager`-style updates to the inner text and recalculates the group layout:

```typescript
if (!editor.shapeManager.updateTextStyle({
  target: badge,
  style: {
    text: 'LIMITED',
    uppercase: true,
    fontSize: 30,
    color: '#f9fafb',
    bold: true
  }
})) {
  throw new Error('The badge text could not be updated.')
}
```

Change the badge's outline:

```typescript
if (!editor.shapeManager.setStroke({ target: badge, stroke: '#22c55e', strokeWidth: 4, dash: [12, 6] })) {
  throw new Error('The badge stroke could not be updated.')
}
```

Change the badge's opacity:

```typescript
if (!editor.shapeManager.setOpacity({ target: badge, opacity: 0.9 })) {
  throw new Error('The badge opacity could not be updated.')
}
```

Change the badge's preset:

```typescript
/** The existing group after replacing its outer shape. */
const updatedBadge = await editor.shapeManager.update({
  target: badge,
  presetKey: 'tag',
  options: {
    fill: '#a43821',
    width: 240,
    text: 'LIMITED OFFER',
    alignH: 'center',
    alignV: 'middle'
  }
})

if (!updatedBadge) throw new Error('The badge could not be updated.')
```

When switching presets, `update()` preserves existing text, transforms, and metadata. Pass `options.text` to replace the text.

Built-in presets include `circle`, `triangle`, `square`, `diamond`, `pentagon`, `hexagon`, `star`, `sparkle`, `heart`, `arrow-right-fat`, `arrow-up-fat`, `arrow-right`, `arrow-down-fat`, `arrow-up-down`, `arrow-left-right`, `drop`, `cross`, `gear`, `badge`, `bookmark`, `tag`, and `moon`.

`target` can be a shape group, its ID, or an object inside it. Omitting it uses the active shape. Mutating methods save history by default; `withoutSave: true` skips the history entry for that update. Methods that return a shape return `null` when the target cannot be resolved or changed, for example when it is locked.

Create a rectangular label, change its fill and text alignment, and round its corners:

```typescript
/** A roundable shape with embedded text. */
const label = await editor.shapeManager.add({
  presetKey: 'square',
  options: { text: 'SALE', width: 240, height: 120 }
})

if (!label) throw new Error('The label could not be created.')

if (!editor.shapeManager.setFill({ target: label, fill: '#7c3aed' })) {
  throw new Error('The label fill could not be updated.')
}

if (!editor.shapeManager.setTextAlign({ target: label, horizontal: 'center', vertical: 'middle' })) {
  throw new Error('The label text could not be aligned.')
}

/** Updated label after applying rounding to a supported preset. */
const roundedLabel = await editor.shapeManager.setRounding({ target: label, rounding: 20 })
if (!roundedLabel) throw new Error('The label could not be updated.')
```

`setTextAlign()` accepts horizontal `left`, `center`, `right`, or `justify` and vertical `top`, `middle`, or `bottom`. Rounding applies only to presets that support it; an unsupported preset is returned unchanged.

Use `getTextNode()` to read the badge's inner `Textbox` or pass it to other text APIs:

```typescript
/** Text node belonging to the badge, resolved through its group ID. */
const innerText = editor.shapeManager.getTextNode({ target: 'promo-badge' })
if (!innerText) throw new Error('The badge text could not be found.')

console.log(innerText.text)
```

Remove the badge:

```typescript
/** Whether the existing, unlocked badge was removed. */
const removed = editor.shapeManager.remove({ target: 'promo-badge' })
if (!removed) throw new Error('The badge could not be removed.')
```

See the [shape documentation](../src/editor/shape-manager/README.md) for the full sizing, layout, and restoration contracts.

## Backgrounds

Set a solid, gradient, or image background:

```typescript
editor.backgroundManager.setColorBackground({ color: '#f3ede2' })
```

```typescript
editor.backgroundManager.setGradientBackground({
  gradient: {
    type: 'linear',
    angle: 120,
    colorStops: [
      { offset: 0, color: '#ff8a00' },
      { offset: 45, color: '#e52e71' },
      { offset: 100, color: '#4a00e0' }
    ]
  },
  customData: { customProperty: 'value' },
  withoutSave: false
})
```

```typescript
await editor.backgroundManager.setImageBackground({ imageSource: '/images/background.jpg' })
```

Gradient offsets use percentages from 0 to 100. Two-stop gradients can use `startColor`/`endColor` and `startPosition`/`endPosition`. Radial gradients support `centerX`, `centerY`, and `radius` in percentages.

To clear the background:

```typescript
editor.backgroundManager.removeBackground()
```

Background setters also accept `customData` for application metadata and `withoutSave: true` for controlled updates that should not create their own history entry.

## Cropping

Start a crop session for the artboard:

```typescript
/** Active crop session for the artboard. */
const crop = editor.cropManager.startCanvasCrop({
  aspectRatio: { width: 1, height: 1 },
  preserveAspectRatio: true,
  allowFrameOverflow: false,
  showGrid: true,
  cancelOnSelectionClear: true
})

if (!crop) throw new Error('Artboard cropping could not be started.')
```

Alternatively, start with explicit artboard crop dimensions:

```typescript
/** Crop frame initialized with dimensions instead of an aspect ratio. */
const crop = editor.cropManager.startCanvasCrop({ size: { width: 800, height: 600 } })
if (!crop) throw new Error('Artboard cropping could not be started.')
```

Import and select a raster image, then start cropping:

```typescript
/** Raster image to crop. */
const imported = await editor.imageManager.importImage({
  source: '/images/product.jpg',
  withoutSelection: false
})
if (!imported) throw new Error('The image could not be imported.')

/** Crop session for the selected image. */
const crop = editor.cropManager.startImageCrop({
  aspectRatio: { width: 16, height: 9 }
})
if (!crop) throw new Error('The selected image could not be cropped.')
```

`startImageCrop()` uses the selected raster image when `target` is omitted, or accepts a raster image as `target`. It returns `null` for non-image or locked targets.

Alternatively, start cropping the selected raster image with explicit dimensions in source-image pixels:

```typescript
/** Crop session for the selected image, initialized with a fixed size. */
const crop = editor.cropManager.startImageCrop({
  size: { width: 512, height: 512 }
})
if (!crop) throw new Error('Image cropping could not be started.')
```

Change the visible frame's aspect ratio:

```typescript
/** State after choosing a different crop ratio. */
const crop = editor.cropManager.setAspectRatio({ aspectRatio: { width: 4, height: 3 } })
if (!crop) throw new Error('Start a crop session before changing its ratio.')
```

Set an explicit size:

```typescript
/** State after setting crop dimensions. */
const crop = editor.cropManager.setSize({ size: { width: 512, height: 512 } })
if (!crop) throw new Error('Start a crop session before changing its size.')
```

Allow free resizing:

```typescript
/** State after turning off aspect-ratio preservation. */
const crop = editor.cropManager.setPreserveAspectRatio({ preserveAspectRatio: false })
if (!crop) throw new Error('Start a crop session before changing its resize mode.')
```

Read the active crop state, including the mode, frame, target, options, and result rectangle:

```typescript
/** Current crop state for updating application controls. */
const crop = editor.cropManager.getState()
if (!crop) throw new Error('There is no active crop session.')

console.log(crop.mode, crop.rect.width, crop.rect.height)
```

For image crop, explicit `size` and the resulting `rect` use source-image pixels. The requested `aspectRatio` describes the visible frame on the canvas; scaled images may require a coordinate conversion, which the manager performs. Artboard crop uses artboard scene units.

Apply the crop:

```typescript
/** Committed crop result; applying also saves history. */
const result = editor.cropManager.apply()
if (!result) throw new Error('There is no crop result to apply.')
```

Cancel the crop:

```typescript
/** False means no crop session was active. */
const cancelled = editor.cropManager.cancel()
if (!cancelled) console.info('There was no active crop session to cancel.')
```

`apply()` commits the crop and ends the session. `cancel()` ends it without changing the source.

Defaults: `allowFrameOverflow`, `showGrid`, `cancelOnSelectionClear`, and `preserveAspectRatio` are all `true`. Holding Shift temporarily inverts the active aspect-ratio mode. An explicit `size: { width, height }` can be passed when starting a crop. Frame dimensions follow the editor's size limits.

Artboard crop changes the montage area. Image crop keeps the visible content inside the frame in place. The temporary frame is not a persisted canvas object. See the [crop documentation](../src/editor/crop-manager/README.md).

## Canvas size and viewport

Resize the artboard to an imported image:

```typescript
/** Image whose dimensions should determine the artboard size. */
const imported = await editor.imageManager.importImage({ source: '/images/product.jpg' })
if (!imported) throw new Error('The image could not be imported.')

editor.canvasManager.scaleMontageAreaToImage({ object: imported.image })
```

`scaleMontageAreaToImage()` can also use the active image when `object` is omitted. It applies editor size limits, resets the image's transforms, centers it, and saves history unless `withoutSave: true` is passed. Pass `preserveAspectRatio: true` to retain the artboard's existing aspect ratio.

Backing-canvas dimensions are separate from artboard dimensions:

```typescript
editor.canvasManager.setCanvasBackstoreWidth(800)
editor.canvasManager.setCanvasBackstoreHeight(600)
```

These setters change the canvas backing size, not the composition's dimensions. Use the artboard crop API to change the composition's bounds, or `scaleMontageAreaToImage()` when matching an image.

Change or reset the zoom level:

```typescript
editor.zoomManager.zoom(0.1)
editor.zoomManager.resetZoom()
```

Use the Fabric canvas API to zoom around a point:

```typescript
editor.canvas.zoomToPoint(editor.canvas.getCenterPoint(), 1)
```

`canvas.zoomToPoint()` uses viewport coordinates; scene coordinates are converted with the canvas viewport transform. `ZoomManager` handles zoom limits and viewport centering.

## Transforms, layers, and alignment

These commands operate on the current selection:

```typescript
editor.transformManager.fitObject({ type: 'contain', fitAsOneObject: true })
editor.transformManager.rotate(90)
editor.transformManager.flipX()
editor.transformManager.flipY()
```

Reset the selected object's transforms:

```typescript
editor.transformManager.resetObject()
```

Layer methods accept an explicit target or use the current selection when omitted:

```typescript
/** Object or selection whose stacking order the user wants to change. */
const target = editor.canvas.getActiveObject()
if (!target) throw new Error('Select an object before changing its layer.')

editor.layerManager.sendToBack(target)
editor.layerManager.bringToFront(target)
editor.layerManager.sendBackwards(target)
editor.layerManager.bringForward(target)
```

Use `groupingManager.group()` / `ungroup()` to combine or separate the selection. [Canvas size and viewport](#canvas-size-and-viewport) covers canvas dimensions and zoom.

- Objects snap to montage area edges/centers and nearby objects while dragging, with guides for matches and equal spacing.
- Hold `Ctrl` during drag to temporarily disable snapping (movement still follows the configured move step).
- Hold `Alt` with an active selection to show measurement overlays to the hovered object or montage area; distances are labeled on the helper layer and the toolbar hides temporarily until guides clear.

## History

```typescript
await editor.historyManager.undo()
await editor.historyManager.redo()
```

Manager methods normally record their own changes. `saveState()` is available when the application intentionally commits a supported direct change.

Capture a completed composition, make a change, and restore the captured state within the same editor session:

```typescript
// Run after the current editing action has finished.
editor.historyManager.saveState()

/** Full state reconstructed at the current history position. */
const savedState = editor.historyManager.getFullState()

editor.backgroundManager.setColorBackground({ color: '#f3ede2' })

await editor.historyManager.loadStateFromFullState(savedState)
editor.historyManager.saveState()
```

`getFullState()` reconstructs the saved history state, not an unfinished drag or text-editing preview. `loadStateFromFullState()` restores the canvas asynchronously; await it before the next action. Loading a snapshot alone does not move the history cursor like `undo()` or `redo()`. The final `saveState()` above records the restored composition as a new change.

History is local to the editor instance. Keeping a project after closing the page requires application storage and durable image sources.

## Templates and persistence

```typescript
/** A template of the selected objects, optionally including the background. */
const template = editor.templateManager.serializeSelection({ withBackground: false })

if (template) {
  await editor.templateManager.applyTemplate({ template })
}
```

Serialization returns `null` when there is no selection. Applying a template adds its objects without clearing the existing composition.

Templates and full editor states are different contracts. A template represents selected objects; `initialState` and `loadStateFromFullState()` expect a full state. See the [template contract](../src/editor/template-manager/README.md) and [history documentation](../specs/src/editor/history-manager/README.md) for details.

The editor can use managed `blob:` URLs while it is open. These URLs do not remain valid across browser sessions. For persistent projects, store image assets separately and replace temporary image sources with durable application URLs or self-contained image data before saving.

## Deletion guards and copied objects

Pass application-specific rules at initialization:

```typescript
import initEditor from '@anu3ev/fabric-image-editor'

/** Object metadata owned by this application. */
interface ProductObjectData {
  handle?: string
}

/** Domain marker reserved for the application's primary image. */
const MAIN_IMAGE_HANDLE = 'main-image'

/** Editor with deletion and copying rules supplied by the application. */
const editor = await initEditor('editor', {
  /** Keeps the marked image out of user-triggered deletion. */
  canDeleteObject: (object) => {
    const data = object.customData as ProductObjectData | null | undefined
    return data?.handle !== MAIN_IMAGE_HANDLE
  },

  /** Removes the original's role from a copied object. */
  prepareObjectClone: (object) => {
    const data = object.customData as ProductObjectData | null | undefined
    if (data?.handle !== MAIN_IMAGE_HANDLE) return

    delete data.handle
  }
})
```

The library leaves `customData` generic. These callbacks narrow it to the application's own metadata contract.

The deletion guard is shared by keyboard deletion, toolbar deletion, the deletion manager, and cut. Locked objects are skipped separately. `editor:objects-delete-skipped` notifies the application after a guard rejects deletion; the event itself is not a cancellation mechanism. A technical deletion can pass `ignoreDeleteGuard: true` deliberately.

Subscribe to skipped-delete notifications when the application needs to explain why an object stayed on the canvas:

```typescript
/** Release the subscription when the owning view is removed. */
const stopObservingSkippedDeletes = editor.canvas.on('editor:objects-delete-skipped', ({ skippedObjects }) => {
  console.info('Some objects could not be deleted:', skippedObjects)
})

// In the owning component's cleanup:
stopObservingSkippedDeletes()
```

Clone preparation runs for the root clone and nested objects during copy, cut, duplicate, and paste. The editor detaches `customData` from the original before invoking the callback. See the [deletion](../src/editor/deletion-manager/README.md) and [clipboard](../src/editor/clipboard-manager/README.md) guides for the full contracts.

## Fonts

Omitting `fonts` loads the default Google Fonts collection with Latin and Cyrillic coverage. Passing an array replaces that collection; an empty array disables those downloads. A font family can still use a system-installed font such as Arial.

```typescript
import initEditor from '@anu3ev/fabric-image-editor'

/** Editor configured with a font hosted by the application. */
const editor = await initEditor('editor', {
  fonts: [{
    family: 'My Brand Font',
    source: "url('/fonts/my-brand-font.woff2') format('woff2')",
    descriptors: { style: 'normal', weight: '400', display: 'swap' }
  }]
})
```

Serve the font file from your application or a server that permits cross-origin font requests. Provide the weights and styles your composition uses; descriptors can also specify `unicodeRange` when loading a subset of a font. Initialization waits for the editor's font-loading step; a failed font request can still leave the browser using a fallback font.
