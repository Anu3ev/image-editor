# Development and contributions

[Back to the README](./README.md)

Use Node.js 20.19+ or 22.12+ and npm 9+. The Vite development tools require a newer Node.js minor version than the library's declared minimum.

## Run the demo from source

```bash
git clone https://github.com/Anu3ev/image-editor.git
cd image-editor
npm ci
npm run dev
```

Open the address printed by Vite, normally `https://localhost:5173`. The development server uses a locally generated certificate. Import an image or add text and shapes to explore the editing operations.

The demo uses `src/main.ts` from your checkout. It is a development interface for trying library operations. It starts with an empty canvas; **Load sample composition** opens `?example=promo` with an image, text, and a shape for testing. Remove the query parameter to start empty again.

## Build

| Command | Output |
| --- | --- |
| `npm run dev:build` | An unminified library build in `dev-build/`, rebuilt when source files change. |
| `npm run build` | The ES module library, worker assets, and TypeScript declarations in `dist/`. Its prebuild script runs `npm install`. |
| `npm run build:docs` | The full demo and bundled library in `docs/` for GitHub Pages. |

`dist/`, `dev-build/`, and `docs/` are generated output. Edit documentation in the root Markdown files and `guides/`; edit the demo in `src/demo/`.

## Validate a change

Run the checks:

```bash
npm run typecheck
npm run lint
npm run test:ci -- --runInBand
```

For a focused unit-test run:

```bash
npm run test -- specs/src/editor/image-manager/index.spec.ts --runInBand
```

Other unit-test commands:

| Command | Purpose |
| --- | --- |
| `npm test -- --runInBand` | Run the full Jest suite with coverage, using one worker. |
| `npm run test:watch -- --runInBand` | Watch files and rerun affected tests while developing. |
| `npm run test:coverage -- --runInBand` | Generate JSON, LCOV, and text coverage reports in `coverage/`. |
| `npm run test:ci -- --runInBand` | Run Jest in CI mode with coverage and without watch mode. |

For browser tests, install Chromium once, then run the relevant spec:

```bash
npx playwright install chromium
npx playwright test e2e/tests/editor.spec.ts --project=chromium --workers=1
```

Playwright starts its own HTTP demo server and runs Chromium. The `--workers=1` option runs browser tests with one worker.

## Find the right part of the code

See the [architecture overview](./README.md#-architecture) for manager responsibilities and the [project tree](./README.md#project-structure) for the directory layout.

| Area | Starting point |
| --- | --- |
| Public entry point, exported types | [`src/main.ts`](./src/main.ts) |
| Initialization, manager ownership, teardown | [`src/editor/index.ts`](./src/editor/index.ts) |
| Import, export, image sources | [Image manager](./src/editor/image-manager/README.md) |
| Text and composite shapes | [Text manager](./src/editor/text-manager/README.md), [shape manager](./src/editor/shape-manager/README.md) |
| Cropping and alignment guides | [Crop manager](./src/editor/crop-manager/README.md), [snapping manager](./src/editor/snapping-manager/README.md) |
| Templates and restoration | [Template manager](./src/editor/template-manager/README.md), [history tests](./specs/src/editor/history-manager/README.md) |
| Demo interface | [`src/demo/`](./src/demo/) |
| Unit tests and browser test models | [Unit-test guide](./specs/src/editor/README.md), [browser models](./e2e/models/README.md) |

## Report a bug or propose a change

Open a [GitHub issue](https://github.com/Anu3ev/image-editor/issues) with the package version, browser version, reproduction steps, expected behavior, and actual behavior. Include a small image or serialized example if needed, with any private data removed.

Keep pull requests focused. Explain the user-visible change and list the checks you ran. When changing behavior, add a regression test at the appropriate level. Use unit tests for library logic and browser tests for interactions that depend on the real canvas and event lifecycle.

For new features, describe the editing scenario first so the API and scope can be discussed before implementation. See [Planned Features](./README.md#-planned-features) for the current plans.
