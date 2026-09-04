# TemplateManager

`TemplateManager` owns template serialization and template application. A template is serialized editor content, not a live Fabric object tree. The manager must prepare that serialized content before Fabric restores it and must leave the caller's template object unchanged.

`index.ts` owns the public transaction flow, `image-restoration.ts` owns image geometry restoration and serialization rules, and `types.ts` contains the template contracts shared by those modules.

## Apply Flow

`TemplateManager.applyTemplate()` is the transaction boundary:

1. Validate that the template contains objects and that the montage area has usable bounds.
2. Normalize template metadata and calculate the scale for the current montage area.
3. Suspend history.
4. Ask `ImageManager.prepareSerializedImageSources()` to prepare a cloned template.
5. Restore Fabric objects from the prepared clone.
6. Apply background objects through `BackgroundManager`.
7. Transform content for the current montage area and rehydrate text and shape geometry without independently snapping each object to the pixel grid.
8. Materialize fresh object ids, insert the objects, render, fire `editor:template-applied`, resume history, and save state when something was inserted.

The event payload keeps the original template object. Runtime-only `blob:` URLs from image source preparation must not be exposed as a new public template format.

## Image Sources

Image objects in templates can contain remote URLs, `blob:` URLs, or `data:image/...` URLs. `TemplateManager` does not parse or fetch those sources itself. It delegates to `ImageManager` so `initialState` restore and template restore use the same rules:

- `blob:` stays unchanged;
- valid `data:image/...` becomes a managed `blob:` URL before `fabric.util.enlivenObjects()`;
- remote URLs are fetched into managed `blob:` URLs when possible;
- invalid or non-image `data:` URLs remain unchanged;
- the original template passed to `applyTemplate()` is not mutated.

This keeps large base64 image payloads out of Fabric live objects and out of template-created history snapshots after user actions such as scaling.

## Geometry Preservation

Template application preserves the exact fractional scene geometry produced by the template transform and type-specific rehydration. It does not round the position or size of each content object independently because that would change alignment and equal-spacing relationships stored in the template.

When `serializeSelection()` receives an `ActiveSelection`, it temporarily applies the selection transform only while each child is converted to serialized data. The live selection and its children are restored immediately and keep the same geometry for the next interaction. This is required because an `ActiveSelection` is temporary and is not stored in a template.

Fabric rounds numeric transform fields while producing object data. `TemplateManager` replaces those rounded fields with the live values while the temporary selection transform is still applied, so fractional scales and positions survive the round trip.

The realized placement must come from the same temporary transform as the serialized angle, scale, and skew. Mixing those properties with the child's placement inside the temporary selection shifts individually rotated children after a non-uniform selection scale. Fabric may represent the same flattened affine matrix with different angle and skew values, so the standalone control rectangle can differ from the temporary grouped rectangle even when the rendered matrix, source dimensions, and visual position are preserved.

For images without `imageCrop`, `customData.imageFit` controls source fitting. The `stretch` value preserves independent displayed dimensions on both axes, while an absent value or `contain` fits the source uniformly into the saved area. The fitting mode is derived from the serialized scale, so a non-uniform transform applied through an `ActiveSelection` is preserved as well.

When `serializeSelection()` captures a cropped image, it records `customData.imageCrop` with the current `src` and intrinsic source dimensions. If the `src` and dimensions are unchanged, the serialized `width`, `height`, `cropX`, `cropY`, and scales are preserved.

If the `src` changes, the saved visible area stays in place and keeps its size. The old crop coordinates are cleared, and the new source is cropped from the center to fill that area without distortion. This rule takes precedence over `imageFit`.

Templates without `imageCrop` cannot reliably restore an existing crop and continue through the previous `contain` or `stretch` path. Temporary templates with `imageFit: 'crop'` preserve the crop only while it fits the loaded source; otherwise the source is cropped from the center to fill the saved area.

`imageCrop` and `imageFit` are restore metadata, not live image state. They are removed from the restored Fabric object after application and recalculated from the current geometry if the object is serialized again.

If bulk pixel alignment is introduced later, it must be a group-level algorithm with an explicit contract for relative distances, anchors, and outer bounds. Reusing a per-object pixel-grid helper for template content is not compatible with this contract.

## When Changing This Manager

- Keep restore-time source preparation before `_enlivenObjects()`. Fabric should receive already prepared image `src` values.
- Do not add image-specific parsing here. If the rule is about image source materialization, it belongs in `ImageManager` or `BlobUrlRegistry`.
- Keep geometry rehydration before `canvas.add()`. Text, shape, and image dimensions should be canonical before the object enters the live canvas.
- Keep the image restore contracts separate: a cropped image uses its saved visible area as a filled frame, while uncropped images continue to use `contain` or `stretch`.
- Preserve exact fractional geometry and relationships between template objects. Do not align content objects to the pixel grid independently.
- Keep `editor:template-applied` stable for users: original template in the event, inserted Fabric objects in `objects`, montage bounds in `bounds`.
- When changing apply behavior, test template insertion, background extraction, history save, object identity materialization, and image scaling after insertion.
