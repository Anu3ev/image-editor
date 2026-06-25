# HistoryManager specs

This folder contains unit tests for public `HistoryManager` behavior: saving history steps, `undo/redo`, state loading, deferred save, accessors, and serialized state normalization.

The main rule for new tests is simple: verify the observable history contract, not the internal mechanics of `jsondiffpatch`, unless the test is specifically about diff normalization.

## Test Support

- Shared `HistoryManager` setup lives in [`specs/test-utils/history/manager-setup.ts`](../../../test-utils/history/manager-setup.ts).
- Serialized state factories and scenario actions for history tests live in [`specs/test-utils/history/state-fixtures.ts`](../../../test-utils/history/state-fixtures.ts).
- Snapshot-specific runtime fixtures live in [`specs/test-utils/history/snapshot-fixtures.ts`](../../../test-utils/history/snapshot-fixtures.ts).
- Do not add a new `*.spec-utils.ts` file in this folder. If a helper is needed by multiple history specs, it belongs in `specs/test-utils/history`.
- A local helper inside a spec is fine only when it serves one file and is not part of the shared scenario language for history tests.

## Writing New Tests

- The test name should describe observable behavior: what happened to history, canvas state, or a public event.
- Setup should go through `createHistoryManagerTestSetup()` and serialized state factories, not a hand-built large canvas object in every test.
- Use `saveHistoryStates()` when saving several states in sequence.
- Use a domain action such as `saveThreeObjectLeftHistorySteps()` for repeated `undo/redo` scenarios, unless the test is about the history setup protocol itself.
- Do not assert the full `diff` or `patches` when `currentIndex`, `totalChangesCount`, `canUndo/canRedo`, restored canvas state, or a public event is enough.
- When a test covers `editor:history-changed`, keep the payload compact: counters, flags, and `patchId` for `save`. Full patches and serialized state are not part of the public event payload.
- For no-op scenarios, check that no event fired or that the index did not change, not only that the method did not throw.

## State Boundaries

- Persisted history state: `baseState`, patches, serialized canvas objects.
- Derived state: `canUndo`, `canRedo`, `currentChangePosition`, `hasUnsavedChanges`.
- Transient runtime state: active text editing, overlay, and current canvas runtime objects.

If a test needs to go through transient state, describe the user scenario first, then use a helper that puts that state at the right lifecycle point.

## Validation

For changes in this folder, run focused unit tests:

```bash
npm test -- --runTestsByPath specs/src/editor/history-manager/history-manager-save-state.spec.ts specs/src/editor/history-manager/history-manager-undo-redo.spec.ts
```

If shared test support in `specs/test-utils/history` changed, also run all history specs:

```bash
npm test -- specs/src/editor/history-manager
```

And check TypeScript:

```bash
npx tsc --noEmit --pretty false
```
