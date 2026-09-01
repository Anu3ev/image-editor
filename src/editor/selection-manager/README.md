# SelectionManager

`SelectionManager` owns canvas selection behaviour: selecting all editable objects, configuring multi-selection keys, merging box selections made with Ctrl or Cmd, filtering locked objects, restoring a previous selection after a modified click on empty canvas, and coordinating scale interactions whose target is an `ActiveSelection`.

An `ActiveSelection` is a temporary Fabric container, not persisted editor content. Its children remain the domain objects stored on the canvas. Code in this manager may coordinate a transform of the temporary container, but it must not silently replace the creation, layout, materialization, or restore rules owned by ImageManager, ShapeManager, or TextManager.

## Responsibility split

- [`index.ts`](./index.ts) is the manager facade. It owns selection keys, locked-object filtering, box-selection merging, selection restoration, event subscriptions, and composition of the scale interaction owner.
- [`scaling/active-selection-scale-interaction-controller.ts`](./scaling/active-selection-scale-interaction-controller.ts) owns the unified scale session for an `ActiveSelection` made only of direct top-level images or only of direct top-level shapes.
- [`../snapping-manager/scaling/rectangular-scale-gesture-projection.ts`](../snapping-manager/scaling/rectangular-scale-gesture-projection.ts) captures the immutable geometry of standard Fabric side and corner controls.
- [`../snapping-manager/scaling/rectangular-scale-interaction.ts`](../snapping-manager/scaling/rectangular-scale-interaction.ts) resolves the Fabric scale mode or accepts an explicit domain mode, builds the raw intent, applies one scale plan around the fixed point, and reads the exact final geometry shared by single-object and supported selection controllers.
- [`../snapping-manager/scaling/standard-scale-control.ts`](../snapping-manager/scaling/standard-scale-control.ts) verifies that the active control still follows the standard Fabric scale contract and detects when a side control switches from scaling to skew.
- [`../snapping-manager/scaling/scale-snapping-runtime.ts`](../snapping-manager/scaling/scale-snapping-runtime.ts) resolves hold and release state and publishes a result only after the applied geometry has been verified.

## Selection behaviour

`selectAll()` reads the editor's selectable canvas objects, creates an `ActiveSelection` when more than one object is available, preserves the lock state of a selection containing locked objects, selects the result, requests a render, and emits `editor:all-objects-selected`.

The configured `selectionKey` defaults to Ctrl or Cmd. Text editing temporarily disables multi-selection and restores the configured key on exit. During a modified box selection, the manager merges the previous and new selections without duplicates. Locked and unlocked objects are not mixed accidentally: the manager either preserves the previous locked-only selection or removes locked objects from a newly formed mixed selection according to the current pointer action.

`lastSelection`, box-selection flags, the active Fabric transform, and scale sessions are transient runtime state. They are never serialized into templates or history.

## Image-only and shape-only scaling

The migrated scale path accepts an `ActiveSelection` when it contains at least two direct top-level `FabricImage` children or at least two canonical shape groups. The selection must use a supported scale control with positive scale, no parent, no skew or flip, and no locked scale axis. A supported shape must have complete visual and text nodes, canonical unit scale, zero angle, and no parent, skew, flip, or locked scale axis. Every other composition returns to the existing Fabric and domain-manager lifecycle before the new owner mutates anything.

At `mousedown`, the controller captures exact selection bounds, the fixed point, original scale, candidates, zoom, the selected control, and the protected state required by the selected composition. Each pointer step follows one contract:

```text
immutable gesture baseline
  → raw Fabric preview or pointer projection
  → shared snapping plan
  → one scale application to ActiveSelection
  → ShapeManager constraints and layout when the children are shapes
  → verification of exact bounds and protected child state
  → publication of verified guides
```

All eight side and corner controls are supported. The same path handles proportional and Shift-controlled free corner scaling, scaling relative to the centre, rotation of the entire `ActiveSelection`, independent X/Y hold and release, Ctrl, zoom, and pan. Individually rotated shape children remain on the existing snapping path. For a direct canonical rotated shape in a selection without flip or skew, `ShapeManager` now compensates the non-uniform parent transform, changes the shape's own width and/or height without visible skew, and preserves the last live geometry when Fabric rebuilds the selection. This legacy geometry correction is also used by mixed selections and does not make either composition eligible for unified snapping. When a side control switches to skew, the existing Fabric transform remains responsible for that part of the gesture, scale snapping stops for every skew frame, and stale guides are cleared. Releasing the modifier continues through the existing scale path, and pressing it again cannot run shape scaling over Fabric skew.

For images, the temporary selection owns the scale and position while every image keeps its local position, dimensions, scale, crop, angle, skew, flip, and origins. For shapes, `ShapeManager` intersects the minimum-size and text-layout constraints of all children, recalculates their layout once, preserves the fixed point, and returns the scale that was actually applied. On `object:modified`, a rectangular scale is materialized into canonical child dimensions and the selection is restored without a second snapping session. Rotation of the whole selection remains on the restored selection instead of being transferred to each shape, so another scale gesture uses the same unified path. If a side control introduced skew, the current Fabric selection is left intact and no rectangular shape materialization runs over it. Exact materialization and history or template round trips for skew are outside this migration phase. A completed rectangular scale creates one history entry through the regular Fabric lifecycle.

## Lifecycle and cleanup

The scale session is ended on `mouseup`, a selection change, removal of the active selection or any child captured at gesture start, `pointercancel`, `touchcancel`, window blur, a new `mousedown`, and manager destruction. Pointer cancellation, window blur, and editor-owned deletion finish an affected Fabric transform while the original selection still exists, so ShapeManager can commit the last visible rectangular geometry before transient scaling and resize state is cleared. Manager destruction only clears the transient session before the canvas is disposed and does not promise to persist unfinished geometry. A skew step stays on the existing Fabric path and only clears the unified scale state and guides. Selection events fired while ShapeManager rebuilds the temporary selection are part of the same rectangular commit and cannot clear the domain state early. Cleanup is idempotent. An unrelated `object:removed` event does not end the session; `DeletionManager` retains its existing selection cleanup after a successful delete.

The captured child list, rather than the current mutable contents of `ActiveSelection`, determines whether an `object:removed` event belongs to the active session. This keeps cleanup correct even if Fabric changes the selection contents before delivering the event.

## Migration boundary

Standalone-text-only and mixed selections still use their existing scale and snapping paths. `ShapeManager` is registered before `SelectionManager`, so its event controller asks the unified owner to process a shape-only step immediately. If that owner declines the step, the same event continues through the existing shape path; an accepted step is not processed twice when the later `SelectionManager` listener receives it. `SelectionManager` delegates only shape constraints, text layout, canonical materialization, and cleanup of remaining transient state back to `ShapeManager`; it does not start a second snapping session. `TextManager` still has a separate commit path for standalone text.

The next stages must apply the same single-owner boundary to standalone-text-only selections and then to mixed image, shape, and text selections. `Group`, `CropFrame`, nested objects, and unknown child types remain outside the supported boundary until their product contract is established separately.

## Before changing this manager

- Keep selection state transient and keep domain object state in the manager that owns that object type.
- Do not add a new `ActiveSelection` composition to unified scaling until all earlier mutation and commit listeners for that composition are routed through one owner.
- Keep the fixed point in scene coordinates and compare only geometry expressed in the same coordinate system.
- Verify every supported control, intermediate hold states, Ctrl and Shift behaviour, `mouseup`, history, interruption, and the local state of all children.
- Leave unsupported compositions entirely on the existing path; do not partially apply a new plan and then fall back.

## Validation

For focused changes in this manager, run:

```bash
npm run typecheck
npx eslint --no-cache src/editor/selection-manager e2e/models/selection
npm run test -- specs/src/editor/selection-manager --runInBand
npx playwright test e2e/tests/snapping-manager/selection --project=chromium
```

Also run the changed-code audit used by this project:

```bash
{ rtk npx fallow audit --format json --quiet 2>/dev/null || true; } | head -c 12000
```
