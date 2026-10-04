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
- `getCropObjectSceneBounds()` supplies the same stroke-free geometry for the source during migrated gestures. The legacy target cache receives its existing exact source bounds from `CropManager.getFrameSnappingBoundary()`; the shared target resolver does not inspect crop properties. This keeps unsupported geometry on its previous contract.
- After moving a crop frame to a guide, its actual position becomes the reference point for the next resize.
  If another subsystem has already moved the fixed edge away from the guide, source-bound resize must not try to guess the missing pixel back.
  Fix the interaction that moved the edge, not the source clamp math.
- Canvas crop also goes through `CropFrame`, but usually uses `cropSourceScaleX/Y = 1`.
  In this mode, the size indicator and frame geometry on the canvas match; the crop interaction owns application of the shared snapping result.
  Rounding to integer pixels after guide calculation must not move that edge.
- `allowFrameOverflow = false` constrains the crop frame to source-image bounds.
  In this mode, clamp and scale limits must rely on `getCropRectInSource()` and `getSourceSize()`, not a raw canvas bounding box.
- `isFrameOverflowingSource({ target, axis })` reports transient overflow before the source-bound move clamp runs. Without `axis`, it preserves the combined check used by scaling; with `x` or `y`, it lets movement snapping disable only the constrained axis.
- `fitFrame({ type })` uses montage-area `contain` and `cover` only when `allowFrameOverflow = true`.
  With overflow disabled, both values use the same source-bound reset geometry, so fitting expands the current frame without re-centering it to the montage area.
- `preserveAspectRatio` is enabled by default. `Shift` does not add aspect-ratio preservation; it inverts the current rule.
  This contract must match both the unified crop interaction and the compatibility controls.
- Double-clicking an active crop frame calls `resetFrameToSource()`. With `preserveAspectRatio` disabled, the frame returns to the full source size.
  With the mode enabled, it expands to the largest size inside the source while keeping the frame's current aspect ratio.
  Use the unrounded `CropFrame` size in source pixels for this calculation, not the initial preset or public `getState().rect`.
- The `target` of `resetFrameToSource()` is a Fabric event target, not an image source.
  A programmatic image crop may call `resetFrameToSource()` without it; canvas crop and an explicit `null` remain no-ops so a double-click outside the frame cannot reset the session.

## Resize and clamp

### Unified resize

- [`interaction/crop-frame-interaction.ts`](./interaction/crop-frame-interaction.ts) owns all eight standard controls before the original control action mutates the frame.
  It captures a session on `mouse:down`, resolves raw pointer intent through `ScaleSnappingRuntime`, applies the constrained crop size once, and publishes only verified guides.
- [`interaction/crop-scale-session.ts`](./interaction/crop-scale-session.ts) captures exact frame corners without the decorative stroke, the source rectangle, fixed source sides, source-size limits, and snapping candidates.
  Frame geometry and pointer projection use scene coordinates; size limits and placement remain in source-image coordinates.
- Proportional and free resize use the same immutable gesture baseline. `Shift` inverts `preserveAspectRatio`; `Alt` at gesture start keeps the center fixed; Ctrl clears guide holding without disabling source limits.
  The source may be rotated or flipped, but neither the frame nor source may be nested or skewed. Locked frame axes and unsupported geometry keep the original controls.
- Source limits and integer-size stabilization are calculated before applying the frame. Rounding does not overwrite a selected guide.
  Guides are checked against actual frame bounds and scale; an unreachable guide is suppressed independently on each axis.
- The handled native event is marked before Fabric publishes `object:scaling`, so legacy snapping does not apply another correction.
  `CropManager._handleCropFrameChanged()` publishes crop state without reapplying the old clamp for an owned transform, including its final `modified` event.
- Resize and movement share one `CropFrameInteraction` owner, one set of listeners, and one teardown path. It clears holding on mouseup, selection changes, removal of the frame or source, pointer/touch cancellation, window blur, and crop apply/cancel/restart/destroy.
  An error in calculation or application restores the last confirmed frame and ends the gesture. Teardown always restores the original controls and removes listeners, even when Fabric throws while ending its transform.

### Unified movement

- The same [`interaction/crop-frame-interaction.ts`](./interaction/crop-frame-interaction.ts) replaces the active Fabric drag action before its first mutation.
  [`interaction/crop-movement-session.ts`](./interaction/crop-movement-session.ts) captures exact scene bounds, the pointer start, source rectangle, and source matrices once per gesture.
- Raw translation always comes from that baseline. `MovementSnappingRuntime` selects and holds line or equal-spacing constraints independently on each scene axis.
  Crop applies the source-bound correction before changing the frame; verification publishes only guides reached by the final position.
- A source-blocked axis cannot acquire a guide. An unchanged perpendicular axis stays silent during a blocked drag, while actual movement on the available axis can still align.
  Ctrl clears holding without disabling the source limit; `allowFrameOverflow` bypasses only that limit, not snapping.
- Rotated and flipped sources retain their source-pixel crop size. The source itself and the montage area do not participate in equal-spacing chains.
  Mouseup preserves the last confirmed frame. Cancellation, selection changes, frame/source removal and crop teardown end the transform and restore its original action.
- Live movement and mouseup do not save history. Apply saves one crop result; cancel keeps the original image. The same source state is restored by undo/redo.
- Session teardown restores ordinary object interaction, resumes history, removes the frame, and restores the toolbar even if Fabric throws while ending the gesture. The original error remains observable; a repeated cancel does not repeat cleanup or save history.

### Geometry compatibility

Nested or skewed sources, independently transformed frames and locked frame axes keep their existing controls. Their snapping is owned by crop rather than special branches in shared formulas:

- [`snapping/crop-frame-scale-snapping.ts`](./snapping/crop-frame-scale-snapping.ts) applies the compatibility step, including source limits and fixed placement. `SnappingManager` only passes its cached anchors and publishes the returned guides. The unified event marker bypasses this route.
- [`snapping/crop-scale-plan.ts`](./snapping/crop-scale-plan.ts) combines the shared geometric scale plan with the existing source-guide hold rules.
- [`snapping/crop-scale-pixel-grid.ts`](./snapping/crop-scale-pixel-grid.ts) supplies source-pixel dimensions explicitly. Shared pixel-grid code only constructs and applies scale candidates; [`snapping/crop-scale-snap-guards.ts`](./snapping/crop-scale-snap-guards.ts) owns source-boundary and source-size preference rules.
- Pixel rounding preserves the fixed frame point with or without a guide, including Ctrl. The untouched axis retains its fractional size. The crop session is explicitly typed with `CropFrame`; the public `CropState.frame` remains compatible with `Rect`.

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
- [`interaction/crop-source-bound-resize.ts`](./interaction/crop-source-bound-resize.ts) owns that legacy restoration and source-bound scale-plan application. Crop-mode activation, public state, apply/cancel, and event publication remain in `CropManager`.
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
  [`interaction/crop-frame-interaction.ts`](./interaction/crop-frame-interaction.ts),
  [`interaction/crop-scale-session.ts`](./interaction/crop-scale-session.ts),
  [`interaction/crop-source-bound-resize.ts`](./interaction/crop-source-bound-resize.ts),
  [`snapping/crop-frame-scale-snapping.ts`](./snapping/crop-frame-scale-snapping.ts),
  [`interaction/crop-controls.ts`](./interaction/crop-controls.ts),
  [`index.ts`](./index.ts).
