# SnappingManager

`SnappingManager` finds guides and coordinates both verified and legacy snapping paths. Migrated interactions publish guides only after the object reaches them, while legacy interactions keep their existing calculated-guide contract. Canonical dimensions of composite objects remain the responsibility of the manager that owns the corresponding object type.

The two-phase contract is currently used when scaling a regular top-level shape, when moving a standalone top-level `FabricImage`, top-level shape, or standalone top-level `Textbox`, and when scaling a supported top-level `FabricImage` through any of the eight standard Fabric controls. Movement of nested text, `ActiveSelection`, `Group`, and `CropFrame` still uses the legacy path. Nested images and shapes also remain on that path. Unsupported image scale geometries and controls with custom scale behaviour or geometry are not routed through the migrated scale owner. The exact migration boundary and the recommended order for continuing the work are documented in [`technical-specifications/unified-scale-snapping-current-state.md`](../../../technical-specifications/unified-scale-snapping-current-state.md).

## Responsibilities

- [`scaling/scale-snap-candidates.ts`](./scaling/scale-snap-candidates.ts) captures exact snap targets at the start of a gesture. The active object and its descendants are excluded from this snapshot.
- [`scaling/scale-snapping-resolver.ts`](./scaling/scale-snapping-resolver.ts) selects guides and maintains independent hold states for the X and Y axes. It does not mutate the canvas.
- [`scaling/scale-projection.ts`](./scaling/scale-projection.ts) describes the linear relationship between scale factors and object edges.
- [`scaling/scale-snapping-runtime.ts`](./scaling/scale-snapping-runtime.ts) connects raw pointer intent, mutation-free resolution, and verification of the geometry that was actually applied.
- [`scaling/rectangular-scale-gesture-projection.ts`](./scaling/rectangular-scale-gesture-projection.ts) captures and projects the immutable geometry of all eight standard side and corner controls for a top-level rectangular scale gesture without skew or flip. It is shared by Shape and Image, but contains no Shape layout or materialization policy.
- [`movement/movement-snap-candidates.ts`](./movement/movement-snap-candidates.ts) creates line targets with stable identities for the lifetime of a gesture and separates ordinary objects from montage bounds used only for line snapping.
- [`movement/movement-snapping-resolver.ts`](./movement/movement-snapping-resolver.ts) selects one line or equal-spacing constraint per axis, preserves the selected constraint through its release zone, coordinates exact correction and verification, falls back to a line from the same raw intent when the primary interval is lost, and handles Ctrl and pixel rounding without mutating Fabric objects.
- [`movement/spacing-patterns.ts`](./movement/spacing-patterns.ts) finds exact intervals between neighbouring named objects while preserving the identities at both ends of each interval.
- [`movement/spacing-chains.ts`](./movement/spacing-chains.ts) builds complete logical chains from the full gesture snapshot, including the active object. It accepts only intervals whose exact spread is at most `0.001`, whose display values match, and whose objects share one perpendicular corridor.
- [`movement/movement-spacing-correction.ts`](./movement/movement-spacing-correction.ts) keeps exact correction separate from display rounding. An object that already belonged to a logical chain at `mousedown` returns to its initial position on the constrained axis, while a new isolated interval continues to use the selected exact neighbours or reference interval.
- [`movement/movement-spacing-verification.ts`](./movement/movement-spacing-verification.ts) verifies the selected intervals against the final bounds and builds guides for every interval of a confirmed logical chain.
- [`movement/movement-snapping-runtime.ts`](./movement/movement-snapping-runtime.ts) gives one movement plan to each native pointer marker and updates line and spacing hold state only after verification.
- [`movement/movement-snapping-controller.ts`](./movement/movement-snapping-controller.ts) captures an immutable movement session and applies one final Fabric translation for standalone top-level images, top-level shapes, and standalone top-level `Textbox` objects. Other object types are deliberately routed to the existing owner.
- [`scaling/image-scale-snapping-controller.ts`](./scaling/image-scale-snapping-controller.ts) owns supported scale sessions for a top-level `FabricImage`, applies both resolved scale factors once around the fixed scene point, and returns only guides verified against the exact final bounds.
- [`movement/line-snapping.ts`](./movement/line-snapping.ts) resolves ordinary line snapping for movement targets that have not yet been migrated.
- [`movement/spacing.ts`](./movement/spacing.ts) resolves equal spacing and returns every selected interval with its exact nearest-neighbour or reference-pattern identity, whether it is primary or related, and the segment to render.
- [`scaling/legacy-scale-snapping.ts`](./scaling/legacy-scale-snapping.ts) and [`pixel-grid.ts`](./pixel-grid.ts) support resize scenarios that have not yet been migrated, including `CropFrame`.
- [`guides/renderer.ts`](./guides/renderer.ts) owns drawing line and spacing guides and calculating fallback viewport bounds.
- [`index.ts`](./index.ts) routes gestures to migrated or legacy owners, publishes verified guides, owns terminal cleanup, and preserves the old handling for object types that have not moved to the new contract.
- [`../utils/geometry.ts`](../utils/geometry.ts) returns exact object bounds in scene coordinates and separately provides the rounded representation required by legacy code.

## Contract for a single migrated interaction step

```text
gesture-start state
  → pointer intent
  → mutation-free snap resolution
  → one application by the current domain or Fabric owner
  → verification of the actual bounds
  → guide publication
```

The following rules are mandatory:

- every new `mousemove` is resolved from the state captured on `mousedown`, not from the result of the previous snapped step;
- in migrated scaling paths, `object:scaling` and the following `mouse:move` with the same `event.e` represent one step;
- a guide remains held until the raw pointer intent crosses the release threshold;
- when both axes are available, acquiring or releasing one guide must not reset the other;
- rounding must not move an edge that is already constrained by a guide;
- a guide is published only after the exact bounds of the applied result have been verified;
- `mouseup` must not change the last visible state.

Each spacing plan keeps the exact before and after neighbours and the reference interval selected from the immutable gesture snapshot. Applicability is checked after X and Y corrections are combined and again against the final bounds. A logical chain is rendered only when it already contained the active object at `mousedown` and the object remains inside the current acquire or release threshold. Losing the primary interval rejects the spacing constraint and lets the same raw intent acquire a line instead.

## ShapeManager integration

For a regular shape, the geometry snapshot is captured on `mousedown`. `ShapeManager` resolves the active control mode and remains the sole owner of minimum size, layout, text wrapping, and canonical dimension commits. `SnappingManager` provides the resolved constraints and verifies the resulting bounds after they have been applied.

The new path supports side and corner controls, rotation, centred scaling, free corner scaling with Shift, and disabling snapping with Ctrl. Skewed, flipped, nested, or axis-locked shapes and `ActiveSelection` use the legacy path. A supported gesture that later crosses the fixed point may hand the remaining live interaction back to the legacy path after earlier unified steps have already been applied.

Gesture state is cleared on `mouseup`, selection changes, object removal, `pointercancel`, `touchcancel`, window blur, and manager destruction.

## Image, shape, and standalone text movement integration

For a standalone top-level image, top-level shape, or standalone top-level `Textbox`, `mousedown` captures exact initial bounds, Fabric `left/top`, zoom, named line candidates, and a full equal-spacing snapshot that includes the active object. Every `object:moving` step reads the raw Fabric result, resolves line and equal-spacing hold state independently by axis, includes pixel rounding in the same final position, applies at most one post-Fabric translation, and verifies the resulting exact bounds before publishing guides.

Exact correction and the displayed distance are deliberately separate. Centred placement and a newly acquired reference interval use exact scene bounds without quantizing the correction to a half-pixel step. An existing chain is accepted only when the spread between its minimum and maximum exact intervals is at most `0.001` scene pixels, every interval resolves to the same display value, and every object intersects one shared perpendicular corridor. The representative distance is then calculated from the complete chain, and every guide uses the shared display value and the centre of the common corridor. These rules are identical for horizontal and vertical chains.

Template application preserves exact fractional geometry, so a template with three intervals of `47.25` scene pixels remains `47.25 / 47.25 / 47.25`. Equal-spacing guides and Alt measurement read those same actual intervals and both display `47`. A `47 / 48 / 47` layout is not an equal-spacing chain even though some values may look close after rounding. If template content ever needs bulk pixel alignment, TemplateManager must use a group-level algorithm that explicitly preserves relative distances, anchors, and outer bounds instead of snapping each object independently.

When the active object already belongs to a confirmed chain at `mousedown`, snapping restores its initial position on the constrained axis instead of rewriting one interval from an active-dependent local reference. The complete chain therefore remains stable regardless of which object is dragged first or how later drags are ordered.

Ctrl returns the unrounded raw Fabric position and clears both line and spacing hold state. A repeated native marker reuses its verified result without reading or changing the target again. A new `mousedown` first ends the previous movement session and clears visible guides and legacy anchor caches before the new snapshot and anchors are captured. The movement session and visible guides are also cleared on `mouseup`, selection changes, removal of the active target, `pointercancel`, `touchcancel`, window blur, and manager destruction.

Shape movement remains a plain Fabric translation: it does not run shape layout, change canonical dimensions, or alter the embedded text. On a drag `object:modified` event, ShapeManager still performs its normal interaction cleanup but skips scale materialization because a move must not reinterpret pre-existing `scaleX/scaleY` as a resize. Standalone text movement is also a plain Fabric translation and does not change its text, dimensions, font size, padding, corner radii, angle, or scale factors. The regular Fabric history lifecycle commits both completed drag types without an additional save from their domain managers.

This phase intentionally handles only an active browser drag of a top-level `FabricImage`, top-level shape, or standalone top-level `Textbox`. Movement without an active browser gesture, nested images, nested shapes, nested text, `ActiveSelection`, `Group`, and `CropFrame` continue through the legacy path.

## Image scale integration

For a supported top-level image, `mousedown` captures exact bounds, the original Fabric scale, the fixed scene point, immutable candidates, zoom, the selected control, and the control origin. The shared rectangular projection handles `ml`, `mr`, `mt`, `mb`, `tl`, `tr`, `bl`, and `br`, including rotated and centred gestures. Corner scaling follows the current Fabric `uniformScaling` and `uniScaleKey` settings, so the controller preserves Fabric's real uniform/free mode instead of assigning product meaning directly to Shift.

Each `object:scaling` step reads the raw scale already calculated by the standard Fabric control. If Fabric does not publish that transform event for a new native marker, the following `mouse:move` projects the pointer from the same immutable baseline. A repeated marker reuses the verified result without another target read, mutation, or guide publication. If a side modifier switches Fabric from scaling to skew during the gesture, the controller ends the unified session, clears its scale guides, and does not apply legacy scaling over Fabric's skew result.

The scale runtime holds vertical and horizontal constraints independently. The controller applies the resolved `scaleX` and `scaleY` once, updates the active Fabric transform from the scale values actually accepted by the target, restores the fixed scene point, and then verifies exact bounds, reached guides, canonical `width` and `height`, crop offsets, inactive scale state, and affine state. This keeps the transform synchronized when Fabric applies constraints such as `minScaleLimit`. Guides are published only after this verification. Ctrl clears held constraints and applies raw intent, zoom and pan stay at the scene-coordinate boundary, and `mouseup` preserves the last live geometry while clearing transient guides.

The supported boundary is a positive-scale, top-level `FabricImage` using one of the eight standard matching scale actions, with no skew, flip, or locked scale axis. An ordinary stroke whose width scales with the image is supported. Visual control overrides such as rendering, cursor, and size preserve the standard interaction contract and remain supported. A nested image, `Group`, `ActiveSelection`, control with custom scale behaviour or geometry, custom transform action, skewed or flipped image, axis-locked image, scale-independent nonzero stroke, or a gesture that crosses its fixed point stays on or returns to the legacy path. Shape-specific eligibility, stabilization, minimum size, text layout, and canonical materialization remain in `ShapeManager`.

## Geometry, distances, and MeasurementManager

- Movement, equal-spacing snapping, and `MeasurementManager` use `getObjectExactBounds()`. All compared edges are expressed in scene coordinates, and centres are derived from those same bounds.
- Custom exact bounds must contain finite, ordered values. Invalid geometry fails before guides are resolved or rendered.
- An isolated equal-spacing guide stores the actual bounds of both gaps. A verified logical chain stores every neighbouring interval, accepts only a technical exact-distance error of at most `0.001`, and uses the same display value as Alt measurement for the same geometry.
- `resolveDisplayDistance()` rounds finite values only. Negative distances become zero, while `NaN` and `Infinity` are treated as contract violations.

## CropFrame on the legacy path

`CropFrame` geometry is expressed in canvas coordinates, while the resulting crop size may be calculated in source-image pixels. These values must not be compared without an explicit conversion.

Until `CropFrame` is migrated:

- `getObjectSnappingBounds()` returns the frame bounds on the canvas;
- `getObjectDisplaySize()` may return the resulting size through `cropSourceScaleX/Y`;
- `shouldUseUniformScaleSnap()` mirrors the `preserveAspectRatio` rule, including its Shift inversion;
- during movement with `allowFrameOverflow = false`, source overflow is resolved per axis: snapping is disabled only on the axis that will be clamped, while a guide reached by movement on the other axis remains active;
- when proportional scaling crosses a source-image boundary, the plan is delegated to `CropManager.applyFrameSourceBoundScalePlan()`;
- free scaling remains subject to per-axis constraints in `crop-controls.ts` and final verification in `CropManager._clampFrameIfNeeded()`.

These formulas must not be moved into the shared resolver. `CropManager` must apply source-image constraints once and return the actual bounds for shared verification.

## Before making the next change

- First identify where the defect lives: target selection, guide holding, domain application, result verification, or rendering.
- For a new object type, start with one real browser regression and then connect its owner to the shared runtime.
- Do not consider movement migrated because one test is green. Cover line and equal-spacing hold, independent axis release, Ctrl, rotation, zoom and pan, `mouseup`, history, and gesture interruption paths.
- Do not consider scaling migrated because one control is green. Cover every supported side and corner control, rotation, Ctrl and Shift, repeated pointer positions, `mouseup`, history, and gesture interruption paths.
- Image scale is complete for the supported top-level `FabricImage` boundary, and movement is complete for top-level images, shapes, and standalone `Textbox` objects. The next movement slices are `ActiveSelection` and then `Group`, each after its own capability audit.
- Before changing `CropFrame`, reread [`../crop-manager/README.md`](../crop-manager/README.md), [`scaling/legacy-scale-snapping.ts`](./scaling/legacy-scale-snapping.ts), [`pixel-grid.ts`](./pixel-grid.ts), and [`../crop-manager/domain/crop-frame.ts`](../crop-manager/domain/crop-frame.ts).
