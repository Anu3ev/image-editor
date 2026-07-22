# ShapeManager

`ShapeManager` owns the complete lifecycle of editor shapes represented by `ShapeGroupObject`: a composite Fabric group containing a visual shape node and an embedded `Textbox`. It is the public API boundary for shape creation, replacement, style changes, text layout, editing, scaling, and geometry rehydration. Internal files in this directory implement narrow parts of that contract and must not become alternative entry points for user-facing shape operations.

The main rule for this module is that a shape is a domain object, not a generic Fabric group with unrelated metadata. Its visual node, text node, dimensions, layout state, and runtime behaviour must be created, updated, restored, and scaled through one consistent contract.

## Responsibility split

- [`index.ts`](./index.ts) is the public facade. It owns `add()`, `update()`, `remove()`, style and text commands, target resolution, placement, history transactions, and controller composition.
- [`domain/shape-group.ts`](./domain/shape-group.ts) defines and registers the `shape-group` Fabric class. It restores runtime invariants after direct creation, clone, deserialization, history restore, and template application.
- [`domain/shape-presets.ts`](./domain/shape-presets.ts) is the canonical preset registry and defines preset dimensions, geometry, internal text insets, defaults, and rounded variants.
- [`domain/shape-nodes.ts`](./domain/shape-nodes.ts), [`domain/shape-reference.ts`](./domain/shape-reference.ts), and [`domain/shape-runtime.ts`](./domain/shape-runtime.ts) resolve the group and its child roles, restore interactivity, prepare the embedded text node, and detach Fabric's automatic group layout.
- [`creation/shape-node-factory.ts`](./creation/shape-node-factory.ts) creates and resizes Fabric shape nodes for supported preset types, applies visual styles, and builds rounded geometry where the preset allows it.
- [`layout/`](./layout) owns text measurement, wrapping, user padding, preset and stroke insets, automatic expansion, fixed-width layout, and application of canonical shape and text geometry.
- [`mutation/shape-update-pipeline.ts`](./mutation/shape-update-pipeline.ts) prepares the complete next preset, dimensions, text, style, padding, and layout state before the live group is mutated.
- [`mutation/shape-mutation-controller.ts`](./mutation/shape-mutation-controller.ts) applies prepared updates, replaces only the inner shape node when necessary, coordinates lifecycle events, and wraps on-canvas programmatic mutations in a history transaction.
- [`mutation/shape-rehydration.ts`](./mutation/shape-rehydration.ts) resolves dimensions and embedded text scale for objects restored or transformed outside the regular shape update flow.
- [`editing/shape-editing-controller.ts`](./editing/shape-editing-controller.ts) owns entry into embedded text editing, temporary interaction flags, target resolution during editing, and restoration of normal group interaction on exit.
- [`events/shape-event-controller.ts`](./events/shape-event-controller.ts) connects Fabric pointer, scaling, selection, removal, and text events to the corresponding editing, scaling, snapping, and lifecycle controllers.
- [`lifecycle/shape-lifecycle-controller.ts`](./lifecycle/shape-lifecycle-controller.ts) captures before and after snapshots for programmatic updates, text editing, text updates, and resize gestures.
- [`scaling/`](./scaling) owns live shape layout during scale, minimum-size and text-fit constraints, fixed-anchor restoration, ActiveSelection handling, snapping projection, and final materialization of dimensions.
- [`types.ts`](./types.ts) contains the public shape options and results together with the internal domain contracts shared by these modules.

## Domain and state model

`ShapeGroupObject` contains two semantic child roles: a shape node and a text node. New groups mark them with `shapeNodeType`; node resolution also keeps a legacy fallback for older serialized groups. Code outside `ShapeManager` should not depend on child order or replace group children through generic `Group` operations.

Shape state is split into three categories:

- Persisted state includes the preset key, canonical dimensions, manual base dimensions, replacement box, automatic text expansion mode, text alignment, user padding, visual style, rounding, and child node roles.
- Derived state includes preset-specific internal text insets, stroke-aware content insets, text measurements, roundability, and the current displayed dimensions calculated from canonical dimensions and a live Fabric transform.
- Transient runtime state includes editing snapshots, resize snapshots, scaling sessions, snapping sessions, cached measurements, temporary interaction flags, and no-op transform markers. It must not be copied into serialized shape metadata.

`ShapeGroupObject.rehydrateRuntimeState()` restores the runtime defaults that must survive every materialization path: shape identity, interactivity, padding defaults, rounding capability, custom controls, embedded text behaviour, group opacity normalization, detached Fabric auto-layout, and fresh coordinates.

## Public and cross-manager API

| Method | Responsibility |
| --- | --- |
| `add()` | Creates a complete shape group from a preset, resolves its initial layout and placement, optionally adds and selects it, saves one history state when inserted unless `withoutSave` is set, and emits `editor:shape-added`. |
| `update()` | Prepares and applies preset, size, placement, style, text, padding, alignment, and automatic expansion changes while preserving the outer group instance. |
| `remove()` | Removes an existing unlocked shape group and saves the resulting canvas state unless `withoutSave` is set. |
| `setFill()`, `setStroke()`, `setOpacity()`, `setRounding()` | Apply shape-level visual changes through the same lifecycle and history boundary. |
| `getTextNode()`, `updateTextStyle()`, `setTextAlign()` | Expose the embedded text contract without treating the text node as standalone text. |
| `commitRehydratedShapeLayout()` | Internal cross-manager entry point that materializes restored, cloned, grouped, or externally transformed shape geometry. It is technically public for manager integration, but it is not a user-facing shape command. |
| `destroy()` | Removes ShapeManager's canvas and window event subscriptions and clears the active unified-snapping session together with its verified guides. |

Methods that accept `target` can resolve a shape group instance, its id, one of its child nodes, or the active shape when the target is omitted. User-facing mutating commands ignore missing or locked shapes instead of partially updating their children.

## Creation and update flow

`add()` resolves a preset, normalizes dimensions, style, rounding, padding, and alignment, creates the embedded text node through `TextManager`, creates the visual node through the shape factory, and applies one canonical layout before placement. Explicit `width` and `height` describe the requested shape box unless `preserveAspectRatio` is enabled, while `shapeTextAutoExpand` may still grow the final layout to fit the text. With no explicit coordinates, the completed group is centred in the montage area.

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

`ShapeManager` synchronizes text line styles before measuring a live `text:changed` update, recalculates the shape layout while preserving placement, and emits one shape-level update only when the before and after snapshots differ. Programmatic text changes are coordinated through `editor:before:text-updated` and `editor:text-updated` so shape layout is updated before the final history state is recorded.

## Restore and materialization

Restore is a two-step process. `ShapeGroupObject.fromObject()` first restores Fabric children, enlivable properties, the layout manager, and shape runtime invariants. `commitRehydratedShapeLayout()` then folds live group scale into canonical, manual, and replacement dimensions, scales the embedded text state and padding when required, and reapplies layout without changing the object's placement.

The same materialization entry point is used after history restore, template application, clipboard cloning, ungrouping, and transform-manager fitting. A change to rehydration therefore affects every one of these paths and must not be implemented only in the caller that first exposed the bug.

Programmatic on-canvas mutations suspend history while the group and its children are being updated, resume it in a finalization path, and save one resulting state unless `withoutSave` is set. Live pointer transformations use the editor's shared Fabric event and history lifecycle instead.

## Scaling and snapping

`ShapeScalingController` turns a live Fabric transform into a shape-specific preview: it applies minimum-size and text-fit constraints, reflows text without changing its font size, preserves the fixed anchor, and stores enough state to commit real dimensions on `object:modified`. A completed scale is materialized into shape and text geometry instead of leaving the result as an accumulated group scale.

Shape groups inside `ActiveSelection` use a separate controller. It calculates a compatible selection scale, applies a live layout preview to each shape child, commits each child independently, and then restores the selection. This path supports shape layout but has not yet been migrated to the unified snapping runtime.

A regular top-level shape uses the two-phase scale-snapping contract described in [`../snapping-manager/README.md`](../snapping-manager/README.md). The shape integration supports side and corner controls, rotation, centred scaling, Shift-controlled free corner scaling, Ctrl-controlled snapping disablement, verified guides, and one domain application per pointer step.

Nested, flipped, skewed, or axis-locked shapes, `ActiveSelection`, and unsupported Fabric transforms are deliberately routed to the legacy scaling path before the new owner performs a mutation. If a supported gesture later reaches or crosses its fixed point, the unified session stops and hands subsequent processing to the legacy path. Do not describe the entire ShapeManager as migrated to unified snapping until these fallback paths have been handled explicitly.

## Events and cleanup

- `editor:shape-added` reports the completed shape, effective preset, and add options.
- `editor:before:shape-updated` carries the update source, target, and options. `ShapeManager` captures the previous snapshot internally, but callers must not rely on the live Fabric object still containing its old fields when this event fires.
- `editor:shape-updated` carries both the before and after snapshots for programmatic updates, style changes, text changes, editing, and resize.
- Shape removal uses Fabric's regular `object:removed` event; there is no separate `editor:shape-removed` event.
- The unified-snapping session for a top-level shape is cleared on `mouseup`, selection changes, object removal, `pointercancel`, `touchcancel`, window blur, and manager destruction.

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
