# Editor manager specs

Unit tests in this folder verify editor managers through their public scenarios and stable internal contracts. A spec should explain manager behavior, not restate the order of private calls.

## Test Support Placement

- Shared test utilities live in [`specs/test-utils`](../../test-utils).
- Manager-specific setup used by multiple specs should live in `specs/test-utils/managers` or in a domain folder such as `specs/test-utils/<domain>`.
- A local helper inside a spec is fine when it is used only by that file and does not define shared scenario language.
- Do not add `*.spec-utils.ts` next to a spec when a helper is already needed by multiple files. Move it to `specs/test-utils` immediately.
- Do not create re-export facades just to shorten imports. Import directly from the file that owns the helper.

## Writing Manager Specs

- Name tests after the observable effect: what changed in canvas state, an object, an event, persisted state, or a public result.
- Use setup and fixtures from `specs/test-utils` when a scenario repeats across multiple tests.
- Keep low-level mocks in test support. The spec itself should read as the user scenario and its expectations.
- Do not lock tests to private call order when the public contract can be expressed through state, a method result, or an event.
- When a test covers lifecycle or state restoration, explicitly separate persisted state, derived state, and transient runtime state.
- If a rule applies only to one manager, keep it next to that manager's tests. If it applies to multiple managers, move it to this README or to `specs/test-utils/README.md`.

## Validation

For focused changes, run the spec files that were actually touched. After changing shared test support, also run the specs for every manager that uses that support, plus TypeScript:

```bash
npx tsc --noEmit --pretty false
```
