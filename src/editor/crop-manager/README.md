# CropManager

`CropManager` manages temporary crop mode for the montage area and images. Its job is not to persist the final crop, but to safely run an editing session: create a `CropFrame`, constrain it to the source bounds, expose the current state, and then either apply the result or cancel the session.

## State ownership

- The active session lives in `CropManager._session`. It is transient editing state: it is not serialized, does not enter history, and must not leak into the persisted model.
- `getState()` returns the public crop-mode state. The final rectangle is not derived directly from raw Fabric frame geometry:
  resize uses the unrounded `getCropSessionResultRect()`, while `getState()` exposes the rounded result through `getRoundedCropRect()`.
- The rounded crop result converts `width/height` to integer pixels and constrains `left/top` to the source image only when `allowFrameOverflow = false`.
  When overflow is allowed, negative `left/top` values remain valid results for transparent margins.
- `CropFrame` also exists only inside an active crop session. It is marked `excludeFromExport` and must not be included in exports.

## Dimmed area

- `showDimmedArea` is an optional crop start option and defaults to `true`. It paints `#000000` at 25% opacity everywhere on the Fabric canvas bitmap except for the active crop frame.
  The dimmed area is not limited to the montage area: it also covers the rest of the Fabric canvas, but never the editor's DOM controls.
- The option is read when a crop session starts, like `showGrid`. There is intentionally no live setter for an already active session.
- The dimming overlay is transient session state. It must not be serialized, added to history, or included in image, JSON, SVG, or template exports.
- Crop mode temporarily owns the native Fabric `overlayImage` slot and restores the previous `overlayImage`, `overlayVpt`, and `controlsAboveOverlay` values when the session finishes, restarts, or the editor is destroyed.
  Fabric has one native overlay slot, so crop mode restores a pre-existing overlay but does not compose it with the crop dimming overlay.

## Important crop-time contracts

- `CropFrame` stores `cropSource`, `cropAllowFrameOverflow`, `cropSourceScaleX`, `cropSourceScaleY`, and `preserveAspectRatio`.
  These fields define not only the UI, but also how resize and snapping interpret the frame size.
- `CropFrame.scaleX/scaleY` initially match the source image scale.
  Regular Fabric bounds therefore describe frame geometry on the canvas, while `frame.getObjectDisplaySize()` returns the crop-result size in source-image pixels.
- For image crop, `aspectRatio` describes the visible `CropFrame` on the canvas. If the source has different X and Y scales, `CropManager` converts the requested ratio into source-image coordinates before resolving the local frame size. `startImageCrop()` and `setAspectRatio()` share this rule; explicit `size`, `getState().rect`, and the ratio used by `resetFrameToSource()` remain source-pixel values and are not converted again.
- `CropFrame` does not inherit `flipX/flipY` from the source. During source-bound resize, the visually fixed side is converted to the opposite source-side on each flipped axis, while `getCropRectInSource()` still uses the full source matrix to calculate the correct crop result. For centered resize, Fabric's center origin takes precedence over the control name.
- `frame.getObjectSnappingBounds()` intentionally excludes the stroke.
  Snapping must use crop-result geometry, not the visible frame outline.
- After moving a crop frame to a guide, its actual position becomes the reference point for the next resize.
  If another subsystem has already moved the fixed edge away from the guide, source-bound resize must not try to guess the missing pixel back.
  Fix this kind of bug in `SnappingManager`, not in `CropManager` clamp math.
- Canvas crop also goes through `CropFrame`, but usually uses `cropSourceScaleX/Y = 1`.
  In this mode, the size indicator and frame geometry on the canvas match, but holding an edge on a guide remains `SnappingManager` responsibility.
  Rounding to integer pixels after guide calculation must not move that edge.
- `allowFrameOverflow = false` constrains the crop frame to source-image bounds.
  In this mode, clamp and scale limits must rely on `getCropRectInSource()` and `getSourceSize()`, not a raw canvas bounding box.
- `isFrameOverflowingSource({ target, axis })` reports transient overflow before the source-bound move clamp runs. Without `axis`, it preserves the combined check used by scaling; with `x` or `y`, it lets movement snapping disable only the constrained axis.
- `fitFrame({ type })` uses montage-area `contain` and `cover` only when `allowFrameOverflow = true`.
  With overflow disabled, both values use the same source-bound reset geometry, so fitting expands the current frame without re-centering it to the montage area.
- `preserveAspectRatio` is enabled by default. `Shift` does not add aspect-ratio preservation; it inverts the current rule.
  This contract must match `crop-controls` and `snapping-manager`.
- Double-clicking an active crop frame calls `resetFrameToSource()`. With `preserveAspectRatio` disabled, the frame returns to the full source size.
  With the mode enabled, it expands to the largest size inside the source while keeping the frame's current aspect ratio.
  Use the unrounded `CropFrame` size in source pixels for this calculation, not the initial preset or public `getState().rect`.
- The `target` of `resetFrameToSource()` is a Fabric event target, not an image source.
  A programmatic image crop may call `resetFrameToSource()` without it; canvas crop and an explicit `null` remain no-ops so a double-click outside the frame cannot reset the session.

## Resize and clamp

- `crop-controls` calculates source-bound scale limits and annotates the current `Transform` with transient fields:
  `cropSourceScaleBounds`, `cropSourceScaleAnchorX/Y`, `cropSourceScaleClamped`, `cropSourceBoundScale`,
  `cropSourceScalePreserveAspectRatio`.
- These fields exist only for the current resize session.
  Do not treat them as persisted state or copy them into the domain model.
- Resize constrained by the source image keeps two coordinate systems separate:
  `getCropRectInSource()` returns a rectangle in source-image coordinates, `getCropSessionResultRect()` returns an unrounded crop result,
  and public `getState().rect` returns the rounded result.
  Do not use the public result rectangle as input when restoring frame placement from source-image coordinates.
- `CropManager._handleCropFrameChanged()` first collects source-bound state from the current `Transform`, then applies a common source clamp and restores the fixed anchor through `startRect + anchors + final size`.
  This is necessary because the common clamp may change the size, but must not move the opposite crop-frame corner.
- During Fabric resize, `originX/originY` may temporarily change on the frame.
  When mapping a source rectangle back to frame state, translate the rectangle center to the current Fabric origin with `translateToOriginPoint()` instead of assigning it directly as raw `left/top`.

## Easy ways to break it

- Mix source-image pixels and canvas coordinates in one comparison.
- Copy transient `Transform` fields into session or model state “for convenience”.
- Fix only one resize path and forget `apply`, `cancel`, repeated `start*Crop()`, or geometry restoration after clamp.
- Change the `Shift` rule in only one place.

## Before making a change

- First determine where the problem belongs: session lifecycle, geometry/clamp, or snapping.
- When changing `CropFrame` behavior, verify both contracts:
  the size indicator through `getObjectDisplaySize()` and snapping bounds through `getObjectSnappingBounds()`.
- When changing source-bound resize, immediately reread:
  [`domain/crop-frame.ts`](./domain/crop-frame.ts),
  [`interaction/crop-controls.ts`](./interaction/crop-controls.ts),
  [`index.ts`](./index.ts).
