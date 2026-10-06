import { copyFile, readFile, writeFile } from 'node:fs/promises'

// tsc does not copy handwritten declarations. Keep augmentations reachable from
// the published type entry without creating declaration-only runtime imports.
const references = []
for (const name of ['fabric-extensions', 'events']) {
  await copyFile(`src/editor/types/${name}.d.ts`, `dist/editor/types/${name}.d.ts`)
  references.push(`/// <reference path="./editor/types/${name}.d.ts" />`)
}
const entry = await readFile('dist/main.d.ts', 'utf8')
await writeFile('dist/main.d.ts', `${references.join('\n')}\n${entry}`)
