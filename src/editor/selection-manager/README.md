# SelectionManager

`SelectionManager` owns canvas selection behaviour: selecting all editable objects, configuring multi-selection keys, merging box selections made with Ctrl or Cmd, filtering locked objects, restoring a previous selection after a modified click on empty canvas, and coordinating scale interactions whose target is an `ActiveSelection`.

An `ActiveSelection` is a temporary Fabric container, not persisted editor content. Its children remain the domain objects stored on the canvas. Code in this manager may coordinate a transform of the temporary container, but it must not silently replace the creation, layout, materialization, or restore rules owned by ImageManager, ShapeManager, or TextManager.

## Responsibility split

- [`index.ts`](./index.ts) is the manager facade. It owns selection keys, locked-object filtering, box-selection merging, selection restoration, event subscriptions, and composition of the scale interaction owner.
- [`scaling/active-selection-scale-interaction-controller.ts`](./scaling/active-selection-scale-interaction-controller.ts) owns the unified scale session for an `ActiveSelection` made only of direct images, only of direct shapes, or of supported standalone text objects with optional canonical direct images.
- [`../snapping-manager/scaling/rectangular-scale-gesture-projection.ts`](../snapping-manager/scaling/rectangular-scale-gesture-projection.ts) captures the immutable geometry of standard Fabric side and corner controls.
- [`../snapping-manager/scaling/rectangular-scale-interaction.ts`](../snapping-manager/scaling/rectangular-scale-interaction.ts) resolves the Fabric scale mode or accepts an explicit domain mode, builds the raw intent, applies one scale plan around the fixed point, and reads the exact final geometry shared by single-object and supported selection controllers.
- [`../snapping-manager/scaling/standard-scale-control.ts`](../snapping-manager/scaling/standard-scale-control.ts) verifies that the active control still follows the standard Fabric scale contract and detects when a side control switches from scaling to skew.
- [`../snapping-manager/scaling/scale-snapping-runtime.ts`](../snapping-manager/scaling/scale-snapping-runtime.ts) resolves hold and release state and publishes a result only after the applied geometry has been verified.

## Selection behaviour

`selectAll()` reads the editor's selectable canvas objects, creates an `ActiveSelection` when more than one object is available, preserves the lock state of a selection containing locked objects, selects the result, requests a render, and emits `editor:all-objects-selected`.

The configured `selectionKey` defaults to Ctrl or Cmd. Text editing temporarily disables multi-selection and restores the configured key on exit. During a modified box selection, the manager merges the previous and new selections without duplicates. Locked and unlocked objects are not mixed accidentally: the manager either preserves the previous locked-only selection or removes locked objects from a newly formed mixed selection according to the current pointer action.

`lastSelection`, box-selection flags, the active Fabric transform, and scale sessions are transient runtime state. They are never serialized into templates or history.

## Image-only, shape-only, and text-driven scaling

The migrated scale path accepts an `ActiveSelection` when it contains at least two direct `FabricImage` children, at least two canonical shape groups, or at least one supported standalone `BackgroundTextbox` and two objects in total. A text-driven composition may contain only supported text objects and canonical direct images. The selection must use a supported scale control with positive scale, no parent, no skew or flip, and no locked scale axis; a text-driven selection must also start with unit scale. A supported shape must have complete visual and text nodes, canonical unit scale, zero angle, and no parent, skew, flip, or locked scale axis. A supported text child must use canonical unit scale and zero angle. It must also have no path or parent, no skew or flip, zero stroke width, no editing or locked state, and no locked scale axis. An image in a text-driven composition may retain positive finite scale but must have zero angle, skew, flip, and stroke width, no parent, and no locked scale axis. Every other composition returns to the existing Fabric and domain-manager lifecycle before the new owner mutates anything.

At `mousedown`, the controller captures exact selection bounds, the fixed point, original scale, candidates, zoom, the selected control, and the protected state required by the selected composition. Each pointer step follows one contract:

```text
immutable gesture baseline
  → raw Fabric preview or pointer projection
  → shared snapping plan
  → one scale application to ActiveSelection
  → ShapeManager constraints and layout when the children are shapes
  → TextManager measurement and canonical geometry when the composition contains text
  → verification of exact bounds and protected child state
  → publication of verified guides
```

Image-only and shape-only selections support all eight side and corner controls. Text-driven selections support `ml`, `mr`, `tl`, `tr`, `bl`, and `br`; the vertical side controls stay hidden because standalone text has no product contract for changing height independently of font size. The same path handles proportional and Shift-controlled free corner scaling, scaling relative to the centre, rotation of the entire `ActiveSelection`, and independent X/Y hold and release. Individually rotated shape or text children remain on the existing snapping path. For a direct canonical rotated shape in a selection without flip or skew, `ShapeManager` compensates the non-uniform parent transform, changes the shape's own width and/or height without visible skew, and preserves the last intermediate geometry when Fabric rebuilds the selection. This geometry correction is also used by selections containing shapes and other object types, but it does not make those compositions eligible for unified snapping. When a shape side control switches to skew, the selection returns to the existing Fabric path. If the user presses Shift on a text side control after changing the size, the last confirmed canonical size is committed and the current transform ends without applying skew. In both cases stale guides are cleared.

For an image-only composition, the temporary selection owns the scale and position while every image keeps its local position, dimensions, scale, crop, angle, skew, flip, and origins. For shapes, `ShapeManager` intersects the minimum-size and text-layout constraints of all children, recalculates their layout once, preserves the fixed point, and returns the scale that was actually applied. For a text-driven composition, `TextManager` measures every text on a detached object, combines the strictest minimum width and font-size limits, projects direct images from the same immutable local frame, refines snapping against the resulting geometry, and applies one state to all live children. Horizontal scaling changes text width without changing font size; proportional corner scaling changes width, font size, padding, and corner radii together; free corner scaling resolves both axes against the actual text geometry. Images receive calculated local position and scale while source dimensions, crop, angle, skew, flip, and origins remain unchanged. On `object:modified`, shapes or text-driven compositions are committed to child geometry and the selection is restored without a second snapping session. Text children and the restored selection keep unit scale. A completed rectangular scale creates one history entry through the regular Fabric lifecycle.

## Lifecycle and cleanup

The scale session is ended on `mouseup`, a selection change, removal of the active selection or any child captured at gesture start, `pointercancel`, `touchcancel`, window blur, a new `mousedown`, and manager destruction. Pointer cancellation, window blur, and editor-owned deletion finish an affected Fabric transform while the original selection still exists, so ShapeManager or TextManager can commit the last visible rectangular geometry before transient scaling state is cleared. Manager destruction only clears the transient session before the canvas is disposed and does not promise to persist unfinished geometry. Selection events fired while a domain manager rebuilds the temporary selection are part of the same commit and cannot clear the state early. Cleanup is idempotent. An unrelated `object:removed` event does not end the session; `DeletionManager` retains its existing selection cleanup after a successful delete.

The captured child list, rather than the current mutable contents of `ActiveSelection`, determines whether an `object:removed` event belongs to the active session. This keeps cleanup correct even if Fabric changes the selection contents before delivering the event.

## Migration boundary

Selections that combine a shape with text or another object type still use their existing scale and snapping paths. `ShapeManager` is registered before `SelectionManager`, so its event controller asks the unified owner to process a shape-only step immediately. If that owner declines the step, the same event continues through the existing shape path; an accepted step is not processed twice when the later `SelectionManager` listener receives it. `SelectionManager` delegates shape constraints and layout to `ShapeManager`, and text-driven geometry to `TextManager`; neither domain manager starts a second snapping session.

Before adding the full image, shape, and standalone-text composition, the scale controller must be split by its existing responsibilities without changing behaviour. The composition contract, protected child state, and invariant checks should move out of the interaction owner; events, session lifecycle, scale calculation, application, and commit coordination should remain in the controller. Individually rotated text children, noncanonical images in text-driven compositions, `Group`, `CropFrame`, nested objects, and unknown child types remain outside the supported boundary until their product contract is established separately.

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
npx playwright test e2e/tests/snapping-manager/selection --project=chromium --workers=1
```

Also run the changed-code audit used by this project:

```bash
{ rtk npx fallow audit --format json --quiet 2>/dev/null || true; } | head -c 12000
```
