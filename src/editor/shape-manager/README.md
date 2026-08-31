# ShapeManager

`ShapeManager` owns the complete lifecycle of editor shapes represented by `ShapeGroupObject`: a composite Fabric group containing a visual shape node and an embedded `Textbox`. It is the public API boundary for shape creation, replacement, style changes, text layout, editing, scaling, and geometry rehydration. Internal files in this directory implement narrow parts of that contract and must not become alternative entry points for user-facing shape operations.

The main rule for this module is that a shape is a domain object, not a generic Fabric group with unrelated metadata. Its visual node, text node, dimensions, layout state, and runtime behaviour must be created, updated, restored, and scaled through one consistent contract.

## Responsibility split

- [`index.ts`](./index.ts) is the public facade. It composes the internal controllers, exposes shape commands, and owns canvas insertion, placement, selection, `editor:shape-added`, and the history transaction for `add()`.
- [`domain/shape-group.ts`](./domain/shape-group.ts) defines and registers the `shape-group` Fabric class together with its persisted metadata contract. It restores runtime invariants after direct creation, clone, deserialization, history restore, and template application.
- [`domain/shape-presets.ts`](./domain/shape-presets.ts) is the canonical preset registry and defines preset dimensions, geometry, internal text insets, defaults, and rounded variants.
- [`domain/shape-nodes.ts`](./domain/shape-nodes.ts), [`domain/shape-reference.ts`](./domain/shape-reference.ts), and [`domain/shape-runtime.ts`](./domain/shape-runtime.ts) resolve the group and its child roles, restore interactivity, prepare the embedded text node, and detach Fabric's automatic group layout.
- [`creation/shape-group-factory.ts`](./creation/shape-group-factory.ts) materializes a complete off-canvas group for `add()`: it normalizes the requested state, creates both child nodes, applies persisted metadata and runtime invariants, and runs the canonical initial layout. It does not insert or select the group, save history, or emit editor events.
- [`creation/shape-node-factory.ts`](./creation/shape-node-factory.ts) creates and resizes Fabric shape nodes for supported preset types, applies visual styles, and builds rounded geometry where the preset allows it.
- [`layout/`](./layout) owns text measurement, wrapping, user padding, preset and stroke insets, automatic expansion, fixed-width layout, and application of canonical shape and text geometry.
- [`mutation/shape-update-pipeline.ts`](./mutation/shape-update-pipeline.ts) prepares the complete next preset, dimensions, text, style, padding, and layout state before the live group is mutated.
- [`mutation/shape-mutation-controller.ts`](./mutation/shape-mutation-controller.ts) applies prepared updates, replaces only the inner shape node when necessary, coordinates lifecycle events, and wraps on-canvas programmatic mutations in a history transaction.
- [`mutation/shape-rehydration.ts`](./mutation/shape-rehydration.ts) resolves dimensions and embedded text scale for objects restored or transformed outside the regular shape update flow.
- [`editing/shape-editing-controller.ts`](./editing/shape-editing-controller.ts) owns entry into embedded text editing, temporary interaction flags, target resolution during editing, and restoration of normal group interaction on exit.
- [`events/shape-event-controller.ts`](./events/shape-event-controller.ts) connects Fabric pointer, scaling, selection, removal, and text events to the corresponding editing, scaling, snapping, and lifecycle controllers. It normalizes direct targets, child nodes, sub-targets, and `ActiveSelection`, and orchestrates shape layout after text events.
- [`lifecycle/shape-lifecycle-controller.ts`](./lifecycle/shape-lifecycle-controller.ts) captures before and after snapshots for programmatic updates, text editing, text updates, and resize gestures.
- [`scaling/`](./scaling) owns live shape layout during scale, minimum-size and text-fit constraints, fixed-anchor restoration, ActiveSelection handling, snapping projection, and final materialization of dimensions.
- [`text/shape-text-node-controller.ts`](./text/shape-text-node-controller.ts) is the explicit adapter between shape-owned text nodes and `TextManager`. It creates embedded textboxes, applies programmatic text updates, resolves staged style state, and suppresses only the events caused by its own updates. `TextManager` is resolved when an operation starts because ShapeManager must bind its Fabric listeners first; this is a composition-order constraint, not permission to access unrelated editor state.
- [`types.ts`](./types.ts) contains the public shape options and results together with shared internal contracts such as shape dimensions and inset resolvers.

## Domain and state model

`ShapeGroupObject` contains two semantic child roles: a shape node and a text node. New groups mark them with `shapeNodeType`; node resolution also keeps a legacy fallback for older serialized groups. Code outside `ShapeManager` should not depend on child order or replace group children through generic `Group` operations.

Shape state is split into three categories:

- Persisted state includes the preset key, canonical dimensions, manual base dimensions, replacement box, automatic text expansion mode, text alignment, user padding, visual style, rounding, and child node roles.
- Derived state includes preset-specific internal text insets, stroke-aware content insets, text measurements, roundability, and the current displayed dimensions calculated from canonical dimensions and a live Fabric transform. `shapeLayoutSignature` is the only derived validation marker deliberately carried in persisted state; it is regenerated after every completed layout and never replaces those source values.
- Transient runtime state includes editing snapshots, resize snapshots, scaling sessions, snapping sessions, cached measurements, temporary interaction flags, and no-op transform markers. It must not be copied into serialized shape metadata.

`ShapeGroupObject.rehydrateRuntimeState()` restores the runtime defaults that must survive every materialization path: shape identity, interactivity, padding defaults, rounding capability, custom controls, embedded text behaviour, group opacity normalization, detached Fabric auto-layout, and fresh coordinates.

## Public and cross-manager API

| Method | Responsibility |
| --- | --- |
| `add()` | Creates a complete shape group from a preset, resolves its initial layout and placement, optionally adds and selects it, saves one history state when inserted unless `withoutSave` is set, and emits `editor:shape-added`. |
| `update()` | Prepares and applies preset, size, placement, style, text, padding, alignment, and automatic expansion changes while preserving the outer group instance. |
| `remove()` | Finishes an active Fabric transform before removing an existing unlocked shape group and saves the resulting canvas state unless `withoutSave` is set. |
| `setFill()`, `setStroke()`, `setOpacity()`, `setRounding()` | Apply shape-level visual changes through the same lifecycle and history boundary. |
| `getTextNode()`, `updateTextStyle()`, `setTextAlign()` | Expose the embedded text contract without treating the text node as standalone text. |
| `commitRehydratedShapeLayout()` | Internal cross-manager entry point that materializes restored, cloned, grouped, or externally transformed shape geometry. It preserves current visual bounds when persisted layout inputs are unchanged and recalculates automatic expansion when those inputs were intentionally edited. It is technically public for manager integration, but it is not a user-facing shape command. |
| `supportsActiveSelectionScaling()` | Internal cross-manager capability check for a temporary selection made only of direct canonical shape groups whose children are not individually rotated. |
| `resolveActiveSelectionScaleControlMode()` | Returns the proportional or free mode used by a shape corner control so Fabric preview and the unified resolver follow the same Shift rule. |
| `applyActiveSelectionScalePreview()` | Applies the minimum-size and text-layout rules of all selected shapes to one scale already resolved by the unified selection owner and returns the scale that was actually accepted. |
| `clearActiveSelectionScalePreviewState()` | Clears shape scaling, layout, and resize state that remains after the unified owner has completed or abandoned a selection gesture. |
| `destroy()` | Removes ShapeManager's canvas and window event subscriptions and clears its active top-level shape gesture; `SelectionManager` separately cancels any shape-only selection session before `SnappingManager` is destroyed. |

Methods that accept `target` can resolve a shape group instance, its id, one of its child nodes, or the active shape when the target is omitted. User-facing mutating commands ignore missing or locked shapes instead of partially updating their children.

## Creation and update flow

`add()` delegates off-canvas materialization to `ShapeGroupFactory`. The factory resolves the preset, normalizes dimensions, style, rounding, padding, and alignment, creates the embedded text node through `ShapeTextNodeController`, creates the visual node through the shape-node factory, and applies one canonical layout before returning the group. The facade then owns placement, optional canvas insertion and selection, one add-history transaction, and `editor:shape-added`. Explicit `width` and `height` describe the requested shape box unless `preserveAspectRatio` is enabled, while `shapeTextAutoExpand` may still grow the final layout to fit the text. With no explicit coordinates, the completed group is centred in the montage area.

`update()` follows a prepare-then-apply flow. The update pipeline resolves the complete next state without mutating the live group, including a replacement shape node when the preset changes. The mutation controller then applies that state to the existing outer group, preserves placement and non-scale transformations, folds the current scale into canonical dimensions, updates metadata, runs layout once, and emits the shape lifecycle events.

`withoutAdding`, `withoutSelection`, and `withoutSave` affect canvas insertion, selection, and history only. They do not change the geometry contract of the shape returned by `add()` or `update()`.

## Dimensions and text layout

Shape dimensions are not interchangeable:

- `shapeBaseWidth/Height` are the current canonical laid-out dimensions.
- `shapeManualBaseWidth/Height` are the baseline for later layout calculations. They normally come from user-requested dimensions or a committed scale, while proportional creation and preset replacement may normalize them to the final laid-out size.
- `shapeReplaceBoxWidth/Height` preserve the box used when replacing one preset with another.
- `scaleX/scaleY` are live Fabric transform values and must be materialized before the result becomes canonical shape state.

`shapeTextAutoExpand` is enabled by default. It allows the current layout to grow when the embedded text needs more room while retaining a separate manual baseline for later layout calculations. User padding remains separate from the preset-specific and stroke-aware inset, because they have different sources and must be recomputed independently when the preset, size, or stroke changes.

The embedded `Textbox` always has Fabric `autoExpand` disabled. `ShapeManager` owns its frame, wrapping, placement, and the shape size affected by that text. `TextManager` still owns text semantics such as content, character and line styles, but standalone text geometry must not be applied to a shape-owned text node.

Fabric's automatic fit-content group layout is detached after creation and rehydration. Re-enabling it would introduce a second layout owner and allow Fabric to move or resize children after `ShapeManager` has already calculated the canonical result.

## Text editing lifecycle

A second click on an already selected shape enters text editing when both the group and its embedded `Textbox` are unlocked. During editing, group movement and selection are temporarily disabled, the embedded `Textbox` becomes the active object, and the target resolver keeps clicks inside the shape directed to that textbox. On exit, normal interaction is restored and the outer group becomes active again.

`ShapeEventController` synchronizes text line styles before measuring a live `text:changed` update, recalculates the shape layout while preserving placement, and emits one shape-level update only when the before and after snapshots differ. Programmatic text changes are coordinated through `editor:before:text-updated` and `editor:text-updated` so shape layout is updated before the final history state is recorded. Its internal-update guard belongs to `ShapeTextNodeController`, so event handling does not depend on a raw shared `WeakSet`.

## Restore and materialization

Restore is a two-step process. `ShapeGroupObject.fromObject()` first restores Fabric children, enlivable properties, the layout manager, and shape runtime invariants. `commitRehydratedShapeLayout()` then folds live group scale into canonical, manual, and replacement dimensions, scales the embedded text state and padding when required, and reapplies the internal layout without changing the object's placement. Materialization preserves the current visual bounds for an already completed layout, but still runs automatic expansion when serialized content or another persisted layout input was intentionally changed.

Each completed layout stores `shapeLayoutSignature`, a compact derived signature of the text, size-affecting text styles, shape padding, preset, stroke, rounding, and automatic expansion mode used to calculate it. History, clipboard, unchanged templates, ungrouping, and transform fitting therefore preserve their current bounds. If serialized content was intentionally changed after the layout was saved, the signature no longer matches and materialization runs the normal auto-expand calculation. Legacy states without a signature preserve their serialized visual bounds.

The same materialization entry point is used after history restore, template application, clipboard cloning, ungrouping, and transform-manager fitting. A change to rehydration therefore affects every one of these paths and must not be implemented only in the caller that first exposed the bug.

Programmatic on-canvas mutations owned by `ShapeMutationController` suspend history while the group and its children are being updated, resume it in a finalization path, and save one resulting state unless `withoutSave` is set. The facade keeps the same short transaction specifically for `add()`, because canvas insertion belongs there. Controllers receive explicit dependencies; there is no shared function-bag runtime that forwards private facade methods. Live pointer transformations use the editor's shared Fabric event and history lifecycle instead.

## Scaling and snapping

`ShapeScalingController` turns a live Fabric transform into a shape-specific preview: it applies minimum-size and text-fit constraints, reflows text without changing its font size, preserves the fixed anchor, and stores enough state to commit real dimensions on `object:modified`. A completed scale is materialized into shape and text geometry instead of leaving the result as an accumulated group scale.

Shape groups inside a supported shape-only `ActiveSelection` use `SelectionManager` as the single owner of the scale and snapping gesture. Because `ShapeManager` receives Fabric events first, `ShapeEventController` asks that owner to process the current step immediately. A declined step continues through the existing shape path in the same event, while an accepted step is deduplicated when the later selection listener receives it. The selection owner resolves one scale plan and delegates the shape-specific part back through `applyActiveSelectionScalePreview()`. `ShapeManager` intersects the minimum-size and text-fit constraints, recalculates every child once, preserves the fixed point, and reports the scale that was actually applied so guides can be verified against final bounds.

The existing `object:modified` path remains the only final shape commit. A rectangular scale materializes each child's canonical dimensions, clears temporary group scale, restores the selection, and completes the normal history and shape-update lifecycle. SelectionManager owns this short commit boundary so selection events emitted while Fabric rebuilds the `ActiveSelection` cannot clear shape state early. Rotation of the whole selection is restored on the new temporary selection instead of being baked into each child. If a side control switched to skew, the current Fabric selection is left intact and no second rectangular resize runs over its children. `SelectionManager` does not duplicate this commit or save a second history state.

A regular top-level shape uses the two-phase scale-snapping contract described in [`../snapping-manager/README.md`](../snapping-manager/README.md). The shape integration supports side and corner controls, rotation, centred scaling, Shift-controlled free corner scaling, Ctrl-controlled snapping disablement, verified guides, and one domain application per pointer step.

Nested, individually rotated, flipped, skewed, axis-locked, or non-canonical shapes and unsupported Fabric transforms are deliberately routed to the legacy scaling path before the new owner performs a mutation. Shape-only selections support all eight side and corner controls, rotation of the entire selection, centred scaling, proportional and free corner scaling, independent guide holding, Ctrl, zoom, pan, and the existing minimum-size and text-layout rules. A side-control skew stays on the existing Fabric path, clears unified guides, and leaves the transform on the temporary selection. Exact materialization and history or template round trips for skew require a separate affine contract. Selections containing text, images mixed with shapes, `Group`, `CropFrame`, or unknown objects also remain on the legacy path.

## Movement and snapping

A top-level shape uses the shared movement contract from [`../snapping-manager/README.md`](../snapping-manager/README.md). `SnappingManager` captures the gesture baseline, resolves and holds line or equal-spacing constraints independently on both axes, applies one final `left/top` translation, and publishes guides only after verifying the exact resulting bounds.

Movement does not have a shape-specific materialization step. It must not run layout, update canonical dimensions, or change the embedded text. `SnappingManager` owns the movement session and its guides, while the regular Fabric `object:modified` and history lifecycle commits the completed drag. Rotation, skew, and flip do not change this boundary for a top-level shape because movement only translates its exact scene bounds.

Nested shapes, shapes inside `ActiveSelection`, movement without an active browser drag, and direct movement of an embedded text node remain outside this migrated movement boundary.

## Events and cleanup

- `editor:shape-added` reports the completed shape, effective preset, and add options.
- `editor:before:shape-updated` carries the update source, target, and options. `ShapeManager` captures the previous snapshot internally, but callers must not rely on the live Fabric object still containing its old fields when this event fires.
- `editor:shape-updated` carries both the before and after snapshots for programmatic updates, style changes, text changes, editing, and resize.
- Shape removal uses Fabric's regular `object:removed` event; there is no separate `editor:shape-removed` event.
- Unified snapping sessions for a top-level shape or a supported shape-only selection are cleared on `mouseup`, selection changes, object removal, `pointercancel`, `touchcancel`, window blur, and manager destruction. Editor-owned deletion finishes the current transform before removing a shape, while the original selection can still materialize its last visible geometry. Remaining shape layout and resize state is cleared only after that commit or when no commit is available.

## Easy ways to break it

- Treat a shape as a generic `Group` and mutate, remove, reorder, or replace its children outside the shape domain.
- Use current, manual, replacement, and transient scale dimensions as if they represented the same value.
- Re-enable Fabric auto-layout or apply a second layout pass after the canonical shape layout has been committed.
- Update only direct creation and forget clone, history, template, clipboard, grouping, or external transform materialization.
- Scale the embedded text as standalone text or change its font size while shape scaling is only supposed to reflow its layout.
- Apply snapping after shape layout as another mutation instead of resolving one plan and verifying the geometry applied by the shape owner.
- Store editing, scaling, or snapping session data in serialized metadata.
- Save history while a shape group and its children are only partially updated.
- Treat `destroy()` as a replacement for the text-editing exit lifecycle. Current destroy cleanup removes subscriptions and the active unified-snapping session, while the temporary editing target resolver is restored when text editing exits.

## Before changing this module

- First identify the owner of the change: public scenario, domain model, preset or factory, layout, mutation, editing, lifecycle, scaling, snapping integration, or rehydration.
- When changing dimensions, explicitly state whether the value is current, manual base, replacement box, derived layout, or transient Fabric scale.
- When changing text layout, check empty text, multiline text, long words, padding, stroke, alignment, automatic expansion, and editing placement.
- When changing materialization, check direct creation, history, template, clipboard, grouping, transform fitting, and serialized round trips.
- When changing scaling, verify live intermediate states, final `object:modified` state, fixed placement, minimum size, text wrapping, ActiveSelection, snapping hold, and interrupted gestures.
- Before changing unified snapping integration, reread [`../snapping-manager/README.md`](../snapping-manager/README.md) and the current checkpoint in [`technical-specifications/unified-scale-snapping-current-state.md`](../../../technical-specifications/unified-scale-snapping-current-state.md).

## Validation

For focused changes in this folder, run:

```bash
npm run typecheck
rtk ./node_modules/.bin/eslint src/editor/shape-manager/**/*.ts
npm run test -- specs/src/editor/shape-manager --runInBand
rtk ./node_modules/.bin/playwright test e2e/tests/shape-manager --project=chromium
```

Also run the changed-code audit used by this project:

```bash
{ rtk npx fallow audit --format json --quiet 2>/dev/null || true; } | head -c 12000
```
