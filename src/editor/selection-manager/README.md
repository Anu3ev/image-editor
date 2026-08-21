# SelectionManager

`SelectionManager` owns canvas selection behaviour: selecting all editable objects, configuring multi-selection keys, merging box selections made with Ctrl or Cmd, filtering locked objects, restoring a previous selection after a modified click on empty canvas, and coordinating scale interactions whose target is an `ActiveSelection`.

An `ActiveSelection` is a temporary Fabric container, not persisted editor content. Its children remain the domain objects stored on the canvas. Code in this manager may coordinate a transform of the temporary container, but it must not silently replace the creation, layout, materialization, or restore rules owned by ImageManager, ShapeManager, or TextManager.

## Responsibility split

- [`index.ts`](./index.ts) is the manager facade. It owns selection keys, locked-object filtering, box-selection merging, selection restoration, event subscriptions, and composition of the scale interaction owner.
- [`scaling/active-selection-scale-interaction-controller.ts`](./scaling/active-selection-scale-interaction-controller.ts) owns the unified scale session for an `ActiveSelection` made only of direct top-level images.
- [`../snapping-manager/scaling/rectangular-scale-gesture-projection.ts`](../snapping-manager/scaling/rectangular-scale-gesture-projection.ts) captures the immutable geometry of standard Fabric side and corner controls.
- [`../snapping-manager/scaling/rectangular-scale-interaction.ts`](../snapping-manager/scaling/rectangular-scale-interaction.ts) resolves the Fabric scale mode and raw intent, applies one scale plan around the fixed point, and reads the exact final geometry shared by single-image and image-only selection controllers.
- [`../snapping-manager/scaling/standard-scale-control.ts`](../snapping-manager/scaling/standard-scale-control.ts) verifies that the active control still follows the standard Fabric scale contract and detects when a side control switches from scaling to skew.
- [`../snapping-manager/scaling/scale-snapping-runtime.ts`](../snapping-manager/scaling/scale-snapping-runtime.ts) resolves hold and release state and publishes a result only after the applied geometry has been verified.

## Selection behaviour

`selectAll()` reads the editor's selectable canvas objects, creates an `ActiveSelection` when more than one object is available, preserves the lock state of a selection containing locked objects, selects the result, requests a render, and emits `editor:all-objects-selected`.

The configured `selectionKey` defaults to Ctrl or Cmd. Text editing temporarily disables multi-selection and restores the configured key on exit. During a modified box selection, the manager merges the previous and new selections without duplicates. Locked and unlocked objects are not mixed accidentally: the manager either preserves the previous locked-only selection or removes locked objects from a newly formed mixed selection according to the current pointer action.

`lastSelection`, box-selection flags, the active Fabric transform, and scale sessions are transient runtime state. They are never serialized into templates or history.

## Image-only scaling

The migrated scale path accepts an `ActiveSelection` only when it contains at least two direct top-level `FabricImage` children and the selection uses a standard scale control with positive scale, no parent, no skew or flip, and no locked scale axis. Every other composition returns to the existing Fabric and domain-manager lifecycle before the new owner mutates anything.

At `mousedown`, the controller captures exact selection bounds, the fixed point, original scale, candidates, zoom, the selected control, and protected local state for every image. Each pointer step follows one contract:

```text
immutable gesture baseline
  → raw Fabric preview or pointer projection
  → shared snapping plan
  → one scale application to ActiveSelection
  → verification of exact bounds and protected child state
  → publication of verified guides
```

All eight standard side and corner controls are supported. The same path handles proportional and Shift-controlled free corner scaling, scaling relative to the centre, rotation, independent X/Y hold and release, Ctrl, zoom, and pan. A side control that Fabric switches to skew ends the scale session without applying a second scale transform.

The live transform changes only the temporary selection scale and position around its fixed point. Each image keeps its local position, dimensions, scale, crop, angle, skew, flip, and origins. `mouseup` preserves the final live geometry and lets the existing Fabric listener create one history entry. After undo or redo, the temporary selection does not exist, so restored top-level images may carry the equivalent scale themselves while preserving the same visible bounds.

## Lifecycle and cleanup

The scale session is ended on `mouseup`, a selection change, removal of the active selection or any image captured at gesture start, `pointercancel`, `touchcancel`, window blur, a new `mousedown`, and manager destruction. Pointer cancellation and window blur end the current Fabric transform before clearing the snapping session and verified guides. Cleanup is idempotent, and removing an unrelated object does not interrupt the gesture.

The captured child list, rather than the current mutable contents of `ActiveSelection`, determines whether an `object:removed` event belongs to the active session. This keeps cleanup correct even if Fabric changes the selection contents before delivering the event.

## Migration boundary

Shape-only, standalone-text-only, and mixed selections still use their existing scale paths. ShapeManager is registered before SelectionManager and currently performs shape preview and materialization for a shape-containing selection before the new image-only controller would run. TextManager has a separate commit path for standalone text. Extending the image matcher would therefore create multiple mutation owners for one pointer step.

The next stages must introduce an explicit composite routing boundary, collect the applicable child constraints, apply one selection transform, and delegate canonical shape or text materialization without starting another snapping session. `Group`, `CropFrame`, nested objects, and unknown child types remain outside the supported boundary until their product contract is established separately.

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
