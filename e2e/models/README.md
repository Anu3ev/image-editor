# E2E test models

`e2e/models` is the Component Object Model layer for the editor. A model owns a
coherent user-facing test domain and hides the browser interaction needed to
exercise it. Specs describe a scenario and its expectations; they must not
reimplement FabricJS access, pointer protocols, or browser-side state reads.

## Placement rule

A domain with one model may stay at the root of this directory:

```text
e2e/models/toolbar.model.ts
```

As soon as a manager or domain needs a second related model, interaction
session, visual reader, or domain-specific test support file, all files for
that domain belong in one folder:

```text
e2e/models/crop/
  crop.model.ts
  crop-dimming-overlay.model.ts
  crop-frame-control.model.ts
  crop-source-boundary.model.ts
```

Do not leave `foo.model.ts` at the root beside `foo/`. Move the existing
facade into the folder together with its related files. The `crop`, `text`,
and `shape` domains already follow this rule.

`EditorModel` remains at the root because it is the composition root. It
creates and exposes domain facades, but it must not absorb their manager
behaviour. A supporting model is composed by its domain facade, not exposed as
another top-level Playwright fixture. For example, crop tests use
`editor.crop.dimmingOverlay`, not a separate `dimmingOverlay` fixture.

## Working with models

- First identify the existing domain owner. Extend it when the new behaviour
  belongs to that owner; do not create a second model that performs the same
  action or reads the same state.
- Public model methods describe an observable action or result, not a FabricJS
  implementation detail. Keep repeated real pointer lifecycles in a dedicated
  session or component model composed by the facade.
- Use `page.evaluate()` only to find editor runtime data, invoke a real editor
  action, and return serializable state. Do not put business logic there or
  assign an artificial final Fabric state.
- Read Fabric canvas state and pixels through browser-side APIs. Use DOM
  locators only when the behaviour under test is genuinely DOM behaviour.
- Reproduce the complete browser lifecycle for drag, resize, selection, and
  editing. Wait for state or canvas rendering instead of using fixed delays.
- Keep scenario assertions in specs. A model may assert fail-fast invariants
  when it narrows a stable internal contract for every caller.

When a new folder is introduced, update `EditorModel`, fixture imports, and
this catalogue in the same change. A new root-level model is appropriate only
for a genuinely independent one-file domain.

## Current model catalogue

| Location | Owner and responsibility |
| --- | --- |
| `editor.model.ts` | Composition root, editor readiness, shared canvas/viewport operations, keyboard input, and cross-domain object reads. |
| `canvas.model.ts` | Canvas manager actions, montage-area resolution, canvas clearing, and canvas-point interactions. |
| `background.model.ts` | Background colour, gradient, image, and related state. |
| `clipboard.model.ts` | Copy and paste lifecycle. |
| `grouping.model.ts` | Grouping, ungrouping, and active-selection behaviour. |
| `history.model.ts` | History save, undo, redo, current position, and serialized history state. |
| `interaction-blocker.model.ts` | Interaction-blocker and AI-overlay state. |
| `scale-interaction-trace.model.ts` | Canvas event order and state snapshots for focused scaling scenarios. |
| `selection.model.ts` | Active Fabric selection geometry and control scaling. |
| `snapping.model.ts` | Snapping guides and snap-governed object movement. |
| `template.model.ts` | Template serialization and application. |
| `toolbar.model.ts` | Contextual toolbar visibility, bounds, and actions. |
| `crop/crop.model.ts` | Crop lifecycle, options, frame movement and resize, apply/cancel, and crop state. |
| `crop/crop-dimming-overlay.model.ts` | Visual reads of the transient dimmed area, including canvas pixels and overlay state. |
| `crop/crop-frame-control.model.ts` | Crop-frame control coordinates, cursor, and hover interaction. |
| `crop/crop-source-boundary.model.ts` | Crop source-boundary geometry used by the crop facade; it is internal support, not a fixture of its own. |
| `image/image.model.ts` | Image creation, source operations, image/canvas export, snapshots, and the composed scaling session. |
| `image/image-scaling-session.ts` | Full browser pointer lifecycle for live image scaling, composed by `ImageModel`. |
| `text/text.model.ts` | Text creation, content and style updates, editing, selection, scaling, and resize scenarios. |
| `text/text-resize-session.ts` | Live text-resize pointer interaction and intermediate states, composed by `TextModel`. |
| `shape/shape.model.ts` | Shape creation, presets, style, text, selection, editing, and scaling scenarios. |
| `shape/shape-rotation-session.ts` | Real pointer interaction with a shape rotation handle, composed by `ShapeModel`. |
| `shape/shape-scaling-session.ts` | Live shape-scaling pointer interaction and intermediate states, composed by `ShapeModel`. |

Before adding a model, check this table and the existing domain folder. If an
owner already exists, preserve one clear API for that responsibility instead of
adding a duplicate browser protocol.
