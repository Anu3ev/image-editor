# TemplateManager

`TemplateManager` owns template serialization and template application. A template is serialized editor content, not a live Fabric object tree. The manager must prepare that serialized content before Fabric restores it and must leave the caller's template object unchanged.

## Apply Flow

`TemplateManager.applyTemplate()` is the transaction boundary:

1. Validate that the template contains objects and that the montage area has usable bounds.
2. Normalize template metadata and calculate the scale for the current montage area.
3. Suspend history.
4. Ask `ImageManager.prepareSerializedImageSources()` to prepare a cloned template.
5. Restore Fabric objects from the prepared clone.
6. Apply background objects through `BackgroundManager`; add content objects to the canvas.
7. Rehydrate text and shape geometry before the objects are inserted.
8. Materialize fresh object ids, render, fire `editor:template-applied`, resume history, and save state when something was inserted.

The event payload keeps the original template object. Runtime-only `blob:` URLs from image source preparation must not be exposed as a new public template format.

## Image Sources

Image objects in templates can contain remote URLs, `blob:` URLs, or `data:image/...` URLs. `TemplateManager` does not parse or fetch those sources itself. It delegates to `ImageManager` so `initialState` restore and template restore use the same rules:

- `blob:` stays unchanged;
- valid `data:image/...` becomes a managed `blob:` URL before `fabric.util.enlivenObjects()`;
- remote URLs are fetched into managed `blob:` URLs when possible;
- invalid or non-image `data:` URLs remain unchanged;
- the original template passed to `applyTemplate()` is not mutated.

This keeps large base64 image payloads out of Fabric live objects and out of template-created history snapshots after user actions such as scaling.

## When Changing This Manager

- Keep restore-time source preparation before `_enlivenObjects()`. Fabric should receive already prepared image `src` values.
- Do not add image-specific parsing here. If the rule is about image source materialization, it belongs in `ImageManager` or `BlobUrlRegistry`.
- Keep geometry rehydration before `canvas.add()`. Text, shape, and image dimensions should be canonical before the object enters the live canvas.
- Keep `editor:template-applied` stable for users: original template in the event, inserted Fabric objects in `objects`, montage bounds in `bounds`.
- When changing apply behavior, test template insertion, background extraction, history save, object identity materialization, and image scaling after insertion.
