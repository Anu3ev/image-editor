# SelectionManager

`SelectionManager` owns canvas selection behaviour: selecting all editable objects, configuring multi-selection keys, merging box selections made with Ctrl or Cmd, filtering locked objects, restoring a previous selection after a modified click on empty canvas, and coordinating scale interactions whose target is an `ActiveSelection`.

An `ActiveSelection` is a temporary Fabric container, not persisted editor content. Its children remain the domain objects stored on the canvas. Code in this manager may coordinate a transform of the temporary container, but it must not silently replace the creation, layout, materialization, or restore rules owned by ImageManager, ShapeManager, or TextManager.

## Responsibility split

- [`index.ts`](./index.ts) is the manager facade. It owns selection keys, locked-object filtering, box-selection merging, selection restoration, event subscriptions, and composition of the scale interaction owner.
- [`scaling/active-selection-scale-interaction-controller.ts`](./scaling/active-selection-scale-interaction-controller.ts) owns scale events, session lifecycle, scale calculation and application, fallback routing, and commit coordination for supported `ActiveSelection` compositions.
- [`scaling/active-selection-scale-session.ts`](./scaling/active-selection-scale-session.ts) validates a supported gesture, captures its immutable baseline and protected state, and starts the shared snapping and domain sessions atomically.
- [`scaling/active-selection-scale-composition.ts`](./scaling/active-selection-scale-composition.ts) identifies supported image, shape, text-driven, and full mixed compositions, captures the child state protected during a gesture, and verifies that scaling preserved its invariants.
- [`scaling/active-selection-scale-domain-source.ts`](./scaling/active-selection-scale-domain-source.ts) defines the boundary through which a domain manager contributes measured child geometry to a shared selection scale without starting another snapping session.
- [`../snapping-manager/scaling/rectangular-scale-gesture-projection.ts`](../snapping-manager/scaling/rectangular-scale-gesture-projection.ts) captures the immutable geometry of standard Fabric side and corner controls.
- [`../snapping-manager/scaling/rectangular-scale-interaction.ts`](../snapping-manager/scaling/rectangular-scale-interaction.ts) resolves the Fabric scale mode or accepts an explicit domain mode, builds the raw intent, applies one scale plan around the fixed point, and reads the exact final geometry shared by single-object and supported selection controllers.
- [`../snapping-manager/scaling/standard-scale-control.ts`](../snapping-manager/scaling/standard-scale-control.ts) verifies that the active control still follows the standard Fabric scale contract and detects when a side control switches from scaling to skew.
- [`../snapping-manager/scaling/scale-snapping-runtime.ts`](../snapping-manager/scaling/scale-snapping-runtime.ts) resolves hold and release state and publishes a result only after the applied geometry has been verified.

## Selection behaviour

`selectAll()` reads the editor's selectable canvas objects, creates an `ActiveSelection` when more than one object is available, preserves the lock state of a selection containing locked objects, selects the result, requests a render, and emits `editor:all-objects-selected`.

The configured `selectionKey` defaults to Ctrl or Cmd. Text editing temporarily disables multi-selection and restores the configured key on exit. During a modified box selection, the manager merges the previous and new selections without duplicates. Locked and unlocked objects are not mixed accidentally: the manager either preserves the previous locked-only selection or removes locked objects from a newly formed mixed selection according to the current pointer action.

`lastSelection`, box-selection flags, the active Fabric transform, and scale sessions are transient runtime state. They are never serialized into templates or history.

## Supported ActiveSelection scaling

The migrated scale path accepts an `ActiveSelection` when it contains at least two direct `FabricImage` children, at least two canonical shape groups, at least one supported standalone `BackgroundTextbox` with another supported text or image, or the full mixed composition with at least one image, one canonical unrotated shape, and one canonical standalone text. The selection must use a supported scale control with positive scale, no parent, no skew or flip, and no locked scale axis; every composition containing standalone text must also start with unit scale. A supported shape has complete visual and text nodes, canonical unit scale, zero angle, and no parent, skew, flip, or locked scale axis. A supported text child uses canonical unit scale and zero angle, has no path or parent, no skew or flip, zero stroke width, no editing or locked state, and no locked scale axis. An image in a text-driven or full mixed composition may retain positive finite scale but must have zero angle, skew, flip, and stroke width, no parent, and no locked scale axis. Every other composition returns to the existing Fabric and domain-manager lifecycle before the new owner mutates anything.

At `mousedown`, the controller captures exact selection bounds, the fixed point, original scale, candidates, zoom, the selected control, and the protected state required by the selected composition. Each pointer step follows one contract:

```text
immutable gesture baseline
  → raw Fabric preview or pointer projection
  → shared snapping plan
  → one scale application to ActiveSelection
  → ShapeManager constraints and layout when the composition contains shapes
  → TextManager measurement and canonical geometry when the composition contains text
  → verification of exact bounds and protected child state
  → confirmation of the applied live and domain state
  → publication of verified guides
```

Image-only and shape-only selections support all eight side and corner controls. Selections containing standalone text, including the full mixed composition, support `ml`, `mr`, `tl`, `tr`, `bl`, and `br`; the vertical side controls stay hidden because standalone text has no product contract for changing height independently of font size. The same path handles horizontal scaling, proportional and Shift-controlled free corner scaling, scaling relative to the centre, rotation of the entire `ActiveSelection`, and independent X/Y hold and release. Individually rotated shape or text children remain on the existing snapping path. When a shape side control switches to skew, the selection returns to the existing Fabric path. If the user presses Shift on a text side control after changing the size, the last confirmed canonical size is committed and the current transform ends without applying skew. In both cases stale guides are cleared.

For an image-only composition, the temporary selection owns the scale and position while every image keeps its local position, dimensions, scale, crop, angle, skew, flip, and origins. `ShapeManager` owns shape layout, minimum size, text wrapping, and canonical shape commit. `TextManager` measures every standalone text on a detached object, combines the strictest text constraints with the exact geometry supplied by `ShapeManager`, projects direct images from the same immutable local frame, refines snapping against the combined result, and applies one state to all live children. Horizontal scaling changes text width without changing font size; proportional corner scaling changes width, font size, padding, and corner radii together; free corner scaling resolves both axes against the actual text and shape geometry. Images receive calculated local position and scale while source dimensions, crop, angle, skew, flip, and origins remain unchanged. `SelectionManager` owns the common session, plan, application, verification, and coordinated commit. An applied text-driven step stays pending until its exact frame and protected child state pass common verification; only then do `TextManager` and the shape domain source promote their direct live snapshots to the confirmed state. A failed step restores the last confirmed snapshot atomically, and a failure before the first accepted step also closes the unfinished history action. On `object:modified`, `SelectionManager` removes the old selection, asks `TextManager` to validate the confirmed child geometry while retaining its rollback snapshot, prepares canonical shape geometry without publishing lifecycle events, and creates a replacement unit-scale `ActiveSelection`. Creating that replacement is the geometry commit point. A failure before it restores the original selection and every child, clears the matching Fabric transform and history action, and rethrows the original error. After that point, retained domain state is cleared and shape lifecycle events are published from the current geometry in the replacement selection. A finalization failure is reported through `ErrorManager` and does not roll back committed geometry or interrupt the remaining Fabric and history lifecycle. A completed rectangular scale creates one history entry and preserves the result through undo, redo, copying, and templates.

## Lifecycle and cleanup

The scale session is ended on `mouseup`, a selection change, removal of the active selection or any child captured at gesture start, `pointercancel`, `touchcancel`, window blur, a new `mousedown`, and manager destruction. Pointer cancellation, window blur, and editor-owned deletion finish an affected Fabric transform while the original selection still exists, so ShapeManager or TextManager can commit the last visible rectangular geometry before transient scaling state is cleared. Manager destruction only clears the transient session before the canvas is disposed and does not promise to persist unfinished geometry. Selection events fired while `SelectionManager` replaces the temporary selection belong to the same commit and cannot clear retained domain state early. Cleanup is idempotent. An unrelated `object:removed` event does not end the session; `DeletionManager` retains its existing selection cleanup after a successful delete.

The captured child list, rather than the current mutable contents of `ActiveSelection`, determines whether an `object:removed` event belongs to the active session. This keeps cleanup correct even if Fabric changes the selection contents before delivering the event.

Destruction removes canvas and window subscriptions even if Fabric throws while ending an active transform. Transient state and guides are still cleared, and the original error is propagated.

## Migration boundary

The full composition of an image, a canonical unrotated shape, and canonical standalone text now uses the same unified scale owner as the other supported selections. `ShapeManager` is registered before `SelectionManager`, so its event controller asks the unified owner to process a supported shape step immediately. If that owner declines the step, the same event continues through the existing shape path; an accepted step is not processed twice when the later `SelectionManager` listener receives it. `SelectionManager` delegates shape constraints and commit to `ShapeManager` and text measurement and canonical text application to `TextManager`; neither domain manager starts a second snapping session.

The interaction controller and the composition contract are separated so adding another supported composition does not mix eligibility and invariant checks with browser interaction lifecycle. Individually rotated shape or text children, flipped or skewed children or selection frames, nested objects, noncanonical children, `Group`, `CropFrame`, and unknown child types remain outside the supported boundary. The next migration phase is the `CropFrame` interaction owner.

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
