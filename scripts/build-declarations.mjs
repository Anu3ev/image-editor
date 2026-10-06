import { copyFile, readFile, writeFile } from 'node:fs/promises'

// tsc does not copy handwritten declarations. Make the Fabric augmentation part
// of the root declaration graph, without adding declaration-only runtime imports.
for (const name of ['fabric-extensions', 'events']) {
  await copyFile(`src/editor/types/${name}.d.ts`, `dist/editor/types/${name}.d.ts`)
}
const entry = await readFile('dist/main.d.ts', 'utf8')
await writeFile('dist/main.d.ts', `/// <reference path="./editor/types/fabric-extensions.d.ts" />\n/// <reference path="./editor/types/events.d.ts" />\n${entry}`)
