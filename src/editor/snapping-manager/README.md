# SnappingManager

`SnappingManager` finds guides, resolves snapping, and renders only the guides that the object actually reaches. It does not change the canonical dimensions of composite objects; those remain the responsibility of the manager that owns the corresponding object type.

The new two-phase contract is currently used when scaling a regular top-level shape. Images, standalone text, `ActiveSelection`, and `CropFrame` still use the legacy path. The exact migration boundary and the recommended order for continuing the work are documented in [`technical-specifications/unified-scale-snapping-current-state.md`](../../../technical-specifications/unified-scale-snapping-current-state.md).

## Responsibilities

- [`scale-snap-candidates.ts`](./scale-snap-candidates.ts) captures exact snap targets at the start of a gesture. The active object and its descendants are excluded from this snapshot.
- [`scale-snapping-resolver.ts`](./scale-snapping-resolver.ts) selects guides and maintains independent hold states for the X and Y axes. It does not mutate the canvas.
- [`scale-projection.ts`](./scale-projection.ts) describes the linear relationship between scale factors and object edges.
- [`scale-snapping-runtime.ts`](./scale-snapping-runtime.ts) connects raw pointer intent, mutation-free resolution, and verification of the geometry that was actually applied.
- [`calculations.ts`](./calculations.ts) resolves ordinary line snapping while an object is moving.
- [`spacing.ts`](./spacing.ts) resolves equal spacing and returns the actual segments to render.
- [`scaling.ts`](./scaling.ts) and [`pixel-grid.ts`](./pixel-grid.ts) support resize scenarios that have not yet been migrated, including `CropFrame`.
- [`index.ts`](./index.ts) owns the target snapshot, publishes verified guides, and preserves the legacy handling for object types that do not yet have an owner for the new contract.
- [`../utils/geometry.ts`](../utils/geometry.ts) returns exact object bounds in scene coordinates and separately provides the rounded representation required by legacy code.

## Contract for a single scaling step

```text
gesture-start state
  → pointer intent
  → mutation-free snap resolution
  → one application by the object manager
  → verification of the actual bounds
  → guide publication
```

The following rules are mandatory:

- every new `mousemove` is resolved from the state captured on `mousedown`, not from the result of the previous snapped step;
- `object:scaling` and the following `mouse:move` with the same `event.e` represent one step;
- a guide remains held until the raw pointer intent crosses the release threshold;
- when both axes are available, acquiring or releasing one guide must not reset the other;
- rounding must not move an edge that is already constrained by a guide;
- a guide is published only after the exact bounds of the applied result have been verified;
- `mouseup` must not change the last visible state.

## ShapeManager integration

For a regular shape, the geometry snapshot is captured on `mousedown`. `ShapeManager` resolves the active control mode and remains the sole owner of minimum size, layout, text wrapping, and canonical dimension commits. `SnappingManager` provides the resolved constraints and verifies the resulting bounds after they have been applied.

The new path supports side and corner controls, rotation, centred scaling, free corner scaling with Shift, and disabling snapping with Ctrl. Skewed, flipped, nested, or axis-locked shapes, `ActiveSelection`, and gestures that cross the fixed point are explicitly routed to the legacy path before the new owner performs its first mutation.

Gesture state is cleared on `mouseup`, selection changes, object removal, `pointercancel`, `touchcancel`, window blur, and manager destruction.

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
- when proportional scaling crosses a source-image boundary, the plan is delegated to `CropManager.applyFrameSourceBoundScalePlan()`;
- free scaling remains subject to per-axis constraints in `crop-controls.ts` and final verification in `CropManager._clampFrameIfNeeded()`.

These formulas must not be moved into the shared resolver. `CropManager` must apply source-image constraints once and return the actual bounds for shared verification.

## Before making the next change

- First identify where the defect lives: target selection, guide holding, domain application, result verification, or rendering.
- For a new object type, start with one real browser regression and then connect its owner to the shared runtime.
- Do not consider an object type migrated because one test is green. Cover side and corner controls, rotation, Ctrl and Shift, repeated pointer positions, `mouseup`, history, and gesture interruption paths.
- Before changing `CropFrame`, reread [`../crop-manager/README.md`](../crop-manager/README.md), [`scaling.ts`](./scaling.ts), [`pixel-grid.ts`](./pixel-grid.ts), and [`../crop-manager/domain/crop-frame.ts`](../crop-manager/domain/crop-frame.ts).
