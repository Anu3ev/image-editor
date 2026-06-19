# ImageManager

`ImageManager` owns image import, image export, image resize, image format detection, and image source materialization for editor state restore. It is the public API boundary for image work inside the editor. The helper files in this folder contain internal steps only; they must not become a second public API or a hidden copy of `ImageManager`.

The main rule for this module is simple: keep the public user scenarios in [`index.ts`](./index.ts), and move only narrow, private steps into files named by responsibility.

## Responsibility split

- [`index.ts`](./index.ts) is the public scenario owner. It keeps `importImage()`, `prepareInitialState()`, `exportCanvasAsImageFile()`, `exportObjectAsImageFile()`, `resizeImageToBoundaries()`, content-type helpers, scale calculation, and blob URL cleanup.
- [`import-image.ts`](./import-image.ts) contains the private import pipeline steps: request creation, source validation, Fabric image loading, import-time resize, placement, canvas insertion, history completion, error emission, and initial state image source replacement.
- [`canvas-export.ts`](./canvas-export.ts) contains the private canvas export pipeline: export request normalization, cloned canvas preparation, montage-area snapshot creation, SVG/raster/PDF export branches, and `editor:canvas-exported` payload creation.
- [`object-export.ts`](./object-export.ts) contains the private object export pipeline: selected-object request normalization, SVG export, direct image-element base64 export, rendered object export, crop-aware object rendering, and `editor:object-exported` payload creation.
- [`export-utils.ts`](./export-utils.ts) contains export operations shared by canvas and object export: SVG string packaging and Blob-to-data-URL conversion through the worker.
- [`blob-url-registry.ts`](./blob-url-registry.ts) owns Blob URL creation, URL fetch-to-Blob conversion, per-restore caching, and cleanup through `revokeAll()`.
- [`image-format.ts`](./image-format.ts) is the single source for MIME type and format parsing. Import and export code must use it instead of parsing `contentType` locally.
- [`image-resize.ts`](./image-resize.ts) contains the worker-backed resize implementation and resize warning emission. `ImageManager.resizeImageToBoundaries()` stays as the public API and delegates to this implementation.
- [`image-scale.ts`](./image-scale.ts) contains pure image scale factor calculation against the montage area.
- [`types.ts`](./types.ts) contains the public option/result types and the local editor-port interfaces needed by this module.

## Public flow

`ImageManager.importImage()` is the import transaction boundary:

1. Build an `ImportImageRequest` from public options and editor defaults.
2. Reject unsupported content types before history is suspended.
3. Suspend history for the actual import transaction.
4. Resolve the source into a loadable URL, load a Fabric object, resize large or tiny raster images when needed, and place the result.
5. Add the object to the canvas unless `withoutAdding` is set.
6. Resume history, optionally save state, and fire `editor:image-imported`.
7. On failure, emit `IMPORT_FAILED`, resume history, and return `null`.

`ImageManager.exportCanvasAsImageFile()` is the canvas export boundary:

1. Normalize export options into a request.
2. Clone the canvas and prepare the clone in montage-area coordinates.
3. Hide editor-only objects such as the montage area and interaction blocker overlay.
4. Export as SVG when the requested output and canvas content allow it.
5. Otherwise export through a raster Blob and optionally convert to base64 or PDF.
6. Fire `editor:canvas-exported`, or emit `IMAGE_EXPORT_FAILED` and return `null`.

`ImageManager.exportObjectAsImageFile()` is the object export boundary:

1. Use the explicit object when provided, otherwise use the active canvas object.
2. Emit `NO_OBJECT_SELECTED` when there is no export target.
3. Export SVG objects without rasterizing.
4. Export a raw image element directly only when base64 is requested and there is no visible crop.
5. Otherwise render the Fabric object to an offscreen canvas so crop and other Fabric state are preserved.
6. Fire `editor:object-exported`, or emit `IMAGE_EXPORT_FAILED` and return `null`.

## Important contracts

- The public API is `editor.imageManager.*`. Do not move user-facing calls to helper modules.
- Helper files must not accept `ImageManager` as an argument. Pass only the real dependencies a step needs: `editor`, `blobUrls`, `request`, `image`, or `acceptContentTypes`.
- Do not duplicate format parsing. Use [`image-format.ts`](./image-format.ts) for `contentType -> format` and content-type detection.
- Blob URLs created for import and state restore must go through `BlobUrlRegistry`, so `ImageManager.revokeBlobUrls()` can release them on editor destroy.
- `prepareInitialState()` works on serialized state and replaces image `src` values with blob URLs when possible. It must not mutate the caller's original state object.
- Import history must be resumed on every path after `suspendHistory()`. A failed import must not leave history suspended.
- Resize worker calls must check returned values. `resizeImage` is expected to return a `Blob`; `toDataURL` is expected to return a string.
- Object export must preserve visible image crop. Direct image-element export is allowed only when the Fabric image is not visibly cropped.
- Canvas export uses montage-area scene bounds. Do not mix viewport/camera coordinates with export backstore coordinates.
- `CropFrame`, montage area, and interaction blocker overlays are editor-only runtime objects; export code must not include them as user content.

## Before changing this module

- Decide which boundary you are changing: public scenario flow, import step, export step, source materialization, content-type detection, resize, or scale calculation.
- If a change needs access to many parts of `ImageManager`, reconsider the boundary. A helper that needs the whole manager probably belongs in `index.ts`, or the dependency should be narrowed.
- Keep public scenario methods readable. They should show the user-level flow and delegate only narrow steps.
- Keep helper exports intentional. Export only functions used by `index.ts` or by a neighboring helper module.
- When changing import behavior, check direct import, initial state restore, history resume/save, selection policy, and blob URL cleanup.
- When changing export behavior, check canvas export, object export, SVG output, base64 output, Blob output, PDF output, and cropped image export.
- When changing worker calls, verify both the returned type and the transferable lifecycle.

## What is easy to break

- Turning `ImageManager.importImage()` or export methods into one-line wrappers around another object.
- Passing `ImageManager` into helper functions and hiding a wide dependency behind one parameter.
- Reintroducing local copies of `getFormatFromContentType()` in canvas or object export.
- Moving temporary import/export state into persisted canvas state.
- Treating current viewport coordinates as export coordinates.
- Exporting a cropped image through the raw image element path and silently losing the crop.
- Creating Blob URLs outside `BlobUrlRegistry`.
- Swallowing worker return-type mismatches with casts instead of checking the value.

## Validation

For focused changes in this folder, run:

```bash
rtk ./node_modules/.bin/tsc --noEmit --pretty false
rtk ./node_modules/.bin/eslint src/editor/image-manager/**/*.ts
rtk ./node_modules/.bin/playwright test e2e/tests/image-manager/index.spec.ts --project=chromium
```

Also run the changed-code audit used by this project:

```bash
{ rtk npx fallow audit --format json --quiet 2>/dev/null || true; } | head -c 12000
```
