# DeletionManager

`DeletionManager` owns user-level object deletion. Keyboard deletion, toolbar deletion, direct API calls, and `ClipboardManager.cut()` should all rely on the same deletion rules instead of reimplementing delete logic at the UI layer.

The manager does not know application domains. It must not read `customData.handle`, image roles, product roles, or any other app-specific marker. Applications pass those rules through editor options.

## Delete Flow

`deleteSelectedObjects()` is the transaction boundary:

1. Resolve the requested objects from `options.objects` or from the active canvas selection.
2. Skip locked objects silently.
3. Ask `editor.options.canDeleteObject(object)` for each unlocked object unless `ignoreDeleteGuard` is set.
4. Delete only the objects that are actually allowed.
5. If at least one object was protected by the guard, fire `editor:objects-delete-skipped`.
6. Save history and fire `editor:objects-deleted` only when something was really removed.

If nothing can be deleted, the manager returns `null`. In that case it must not save history, discard selection, render as a delete operation, or finish text editing just because deletion was requested.

## Delete Guard

`canDeleteObject` is a synchronous rule supplied by the application:

```ts
canDeleteObject: (object) => object.customData?.handle !== 'main-image'
```

The callback answers one question only: can this object be deleted by a normal editor operation. It should be cheap and free of side effects.

The guard applies to public delete paths and to `cut()`. A technical operation that intentionally clears protected content should pass `ignoreDeleteGuard: true` to `deleteSelectedObjects()`.

## Skipped Delete Event

`editor:objects-delete-skipped` is notification only. It does not cancel deletion and must not become a second decision point. The decision has already been made by `canDeleteObject`.

The event payload contains:

- `skippedObjects`: objects skipped by `canDeleteObject`;
- `requestedObjects`: objects the caller tried to delete;
- `withoutSave`: the delete call flag.

Locked objects are not reported through this event. They are an editor-level lock rule, not an application guard result.

## Groups

Non-SVG Fabric groups are ungrouped before deletion. Child objects go through the same guard as top-level objects.

If a group contains both deletable and protected children, the manager removes the deletable children and leaves protected children on canvas. If none of the children can be deleted, the group is not ungrouped just to produce an empty delete operation.

## When Changing This Manager

- Keep `resolveDeleteTargets()` as the shared calculation used by deletion and cut.
- Do not add app-specific checks here. The library contract is `canDeleteObject`.
- Do not use events as a hidden cancellation mechanism.
- Do not save history when no object was deleted.
- Keep `ignoreDeleteGuard` explicit. Avoid temporary marker removal or manual bypasses in callers.
- When changing group deletion, check mixed groups: protected child plus normal child.

## Validation

For focused changes in this manager, run:

```bash
npm run typecheck
npm run test -- specs/src/editor/deletion-manager/index.spec.ts --runInBand --coverage=false
npx playwright test e2e/tests/delete-guard.spec.ts --project=chromium
```
