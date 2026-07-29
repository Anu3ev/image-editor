# SnappingManager

`SnappingManager` finds guides and coordinates both verified and legacy snapping paths. Migrated interactions publish guides only after the object reaches them, while legacy interactions keep their existing calculated-guide contract. Canonical dimensions of composite objects remain the responsibility of the manager that owns the corresponding object type.

The two-phase contract is currently used when scaling a regular top-level shape and when moving a standalone top-level `FabricImage`. Movement of shapes, standalone text, `ActiveSelection`, `Group`, and `CropFrame` still uses the legacy path, as does all image scaling. The exact migration boundary and the recommended order for continuing the work are documented in [`technical-specifications/unified-scale-snapping-current-state.md`](../../../technical-specifications/unified-scale-snapping-current-state.md).

## Responsibilities

- [`scale-snap-candidates.ts`](./scale-snap-candidates.ts) captures exact snap targets at the start of a gesture. The active object and its descendants are excluded from this snapshot.
- [`scale-snapping-resolver.ts`](./scale-snapping-resolver.ts) selects guides and maintains independent hold states for the X and Y axes. It does not mutate the canvas.
- [`scale-projection.ts`](./scale-projection.ts) describes the linear relationship between scale factors and object edges.
- [`scale-snapping-runtime.ts`](./scale-snapping-runtime.ts) connects raw pointer intent, mutation-free resolution, and verification of the geometry that was actually applied.
- [`movement-snap-candidates.ts`](./movement-snap-candidates.ts) creates line targets with stable identities for the lifetime of a gesture and separates ordinary objects from montage bounds used only for line snapping.
- [`movement-snapping-resolver.ts`](./movement-snapping-resolver.ts) selects one line or equal-spacing constraint per axis, preserves the selected constraint through its release zone, revalidates the exact selected spacing intervals against the combined predicted and final bounds, falls back to a line from the same raw intent when the primary interval is lost, handles Ctrl and pixel rounding, and verifies the applied result without mutating Fabric objects.
- [`movement-snapping-runtime.ts`](./movement-snapping-runtime.ts) gives one movement plan to each native pointer marker and updates line and spacing hold state only after verification.
- [`movement-snapping-controller.ts`](./movement-snapping-controller.ts) captures an immutable movement session and applies one final translation for standalone top-level images. Other object types are deliberately routed to the legacy owner.
- [`calculations.ts`](./calculations.ts) resolves ordinary line snapping for movement targets that have not yet been migrated.
- [`spacing.ts`](./spacing.ts) resolves equal spacing and returns every selected interval with its exact nearest-neighbour or reference-pattern identity, whether it is primary or related, and the segment to render.
- [`scaling.ts`](./scaling.ts) and [`pixel-grid.ts`](./pixel-grid.ts) support resize scenarios that have not yet been migrated, including `CropFrame`.
- [`renderer.ts`](./renderer.ts) owns drawing line and spacing guides and calculating fallback viewport bounds.
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

Each spacing plan keeps the exact before and after neighbours and the reference pattern selected from the immutable gesture snapshot. Applicability is checked after X and Y corrections are combined and again against the final bounds. Losing only a related interval hides only that guide; losing the primary interval rejects the spacing constraint and lets the same raw intent acquire a line instead.

## ShapeManager integration

For a regular shape, the geometry snapshot is captured on `mousedown`. `ShapeManager` resolves the active control mode and remains the sole owner of minimum size, layout, text wrapping, and canonical dimension commits. `SnappingManager` provides the resolved constraints and verifies the resulting bounds after they have been applied.

The new path supports side and corner controls, rotation, centred scaling, free corner scaling with Shift, and disabling snapping with Ctrl. Skewed, flipped, nested, or axis-locked shapes and `ActiveSelection` use the legacy path. A supported gesture that later crosses the fixed point may hand the remaining live interaction back to the legacy path after earlier unified steps have already been applied.

Gesture state is cleared on `mouseup`, selection changes, object removal, `pointercancel`, `touchcancel`, window blur, and manager destruction.

## Image movement integration

For a standalone top-level image, `mousedown` captures exact initial bounds, Fabric `left/top`, zoom, named line candidates, and spacing candidates. Every `object:moving` step reads the raw Fabric result, resolves line and equal-spacing hold state independently by axis, includes pixel rounding in the same final position, applies at most one post-Fabric translation, and verifies the resulting exact bounds before publishing guides.

Ctrl returns the unrounded raw Fabric position and clears both line and spacing hold state. A repeated native marker reuses its verified result without reading or changing the target again. A new `mousedown` first ends the previous movement session and clears visible guides and legacy anchor caches before the new snapshot and anchors are captured. The movement session and visible guides are also cleared on `mouseup`, selection changes, removal of the active target, `pointercancel`, `touchcancel`, window blur, and manager destruction.

This phase intentionally supports only a top-level `FabricImage`. Image movement without an active browser gesture and movement of shapes, standalone text, `ActiveSelection`, `Group`, and `CropFrame` continue through the legacy path. Image scaling is also still legacy. The next representative slice starts with the `mr` control of a standalone image; the remaining movement targets are migrated one at a time after that slice.

## Geometry, distances, and MeasurementManager

- Movement, equal-spacing snapping, and `MeasurementManager` use `getObjectExactBounds()`. All compared edges are expressed in scene coordinates, and centres are derived from those same bounds.
- Custom exact bounds must contain finite, ordered values. Invalid geometry fails before guides are resolved or rendered.
- An equal-spacing guide stores the actual bounds of both gaps. Its label is rendered only when both distances produce the same display value.
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
- Do not consider an object type migrated because one test is green. Cover side and corner controls, rotation, Ctrl and Shift, repeated pointer positions, `mouseup`, history, and gesture interruption paths.
- Before changing `CropFrame`, reread [`../crop-manager/README.md`](../crop-manager/README.md), [`scaling.ts`](./scaling.ts), [`pixel-grid.ts`](./pixel-grid.ts), and [`../crop-manager/domain/crop-frame.ts`](../crop-manager/domain/crop-frame.ts).
