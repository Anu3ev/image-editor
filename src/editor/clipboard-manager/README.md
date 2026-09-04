# ClipboardManager

`ClipboardManager` owns copy, cut, paste, duplicate, internal clipboard state, and best-effort writes to the browser clipboard. It works together with `DeletionManager`: cut must copy only objects that can really be deleted.

The manager does not know application domains. It must not inspect `customData.handle` or decide which metadata has special meaning. Applications can prepare clones through `editor.options.prepareObjectClone`.

## Clone Preparation

All internal object cloning goes through `_cloneObject()`:

1. Capture the exact geometry of the source root and nested objects.
2. Clone the source Fabric object with `CLIPBOARD_CLONE_OBJECT_KEYS`.
3. Restore geometry values rounded by Fabric's internal serialization.
4. Walk the root clone and nested objects inside `ActiveSelection` or `Group`.
5. Detach `customData` on every clone before external preparation.
6. Call `editor.options.prepareObjectClone(object)` for each clone.
7. Continue the normal copy, paste, duplicate, or cut flow.

Detaching `customData` matters because Fabric clones may share nested metadata references with the source object. The application callback is allowed to mutate the clone, but it must not accidentally mutate the original object.

Geometry is captured before the asynchronous clone starts. Fabric serializes numeric transform values with limited precision, and text objects can recalculate their height when width is restored. The manager therefore restores transforms first and writes the captured width and height last.

## Copy, Paste, and Duplicate

`copy()`, `copyPaste()`, and `paste()` all use the same clone preparation rule.

- `copy()` stores a prepared clone in the internal clipboard and starts a background browser clipboard write.
- `copyPaste()` creates a prepared clone, gives it a new identity, offsets it, materializes text/shape geometry, and inserts it.
- `paste()` clones from the internal clipboard again, prepares that clone again, gives it a new identity, offsets it, and inserts it.

This repeated preparation is intentional. A long-lived internal clipboard can contain old object data, and every inserted object must still pass through the current clone preparation contract.

## Cut

`cut()` must not copy an object first and discover later that deletion is blocked. It asks `DeletionManager.resolveDeleteTargets()` before filling the clipboard.

Behavior:

- if all selected objects can be deleted, cut copies the current active object or active selection;
- if only some selected objects can be deleted, cut copies only those deletable objects;
- if no selected object can be deleted, cut leaves the clipboard unchanged and asks `DeletionManager.deleteSelectedObjects()` to emit the skipped-delete notification.

After a successful internal copy, deletion still goes through `DeletionManager.deleteSelectedObjects()` so history, events, groups, locks, and guards stay consistent.

## Browser Clipboard

System clipboard writes are best effort and run in the background. A browser permission failure should warn through `ErrorManager`, but it must not undo the internal clipboard state. The internal clipboard is the editor's reliable source for `paste()`.

## When Changing This Manager

- Keep clone preparation centralized in `_cloneObject()`.
- Capture source geometry before calling Fabric's asynchronous `clone()`.
- Do not call `prepareObjectClone` on source objects.
- Do not remove the `customData` detach step before external clone preparation.
- Keep cut dependent on `DeletionManager.resolveDeleteTargets()`.
- Do not make browser clipboard success a requirement for editor copy or cut.
- When changing copy or cut, check active selection, single object, groups, and protected-object cases.

## Validation

For focused changes in this manager, run:

```bash
npm run typecheck
npm run test -- specs/src/editor/clipboard-manager/index.spec.ts --runInBand --coverage=false
npx playwright test e2e/tests/delete-guard.spec.ts --project=chromium
```
