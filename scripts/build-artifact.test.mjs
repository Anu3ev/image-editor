import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fixtureManifest, writeArtifact } from './test-support/artifact.mjs'

const entrypoint = path.resolve('scripts/build-artifact.mjs')
const check = 'node scripts/check-package.mjs'
const npmStub = `#!/usr/bin/env node
const fs = require('node:fs')
const args = process.argv.slice(2)
fs.writeFileSync('checker-arguments.json', JSON.stringify(args))
if (process.env.CHECKER_MODE === 'failure') process.exit(7)
if (process.env.CHECKER_MODE === 'tarball-change') fs.appendFileSync(args.at(-1), 'changed')
if (process.env.CHECKER_MODE === 'manifest-change') {
  const file = 'package-artifacts/manifest.json'
  const manifest = JSON.parse(fs.readFileSync(file))
  manifest.source.attempt += 1
  fs.writeFileSync(file, JSON.stringify(manifest))
}
`

for (const scenario of [
  { name: 'без контракта проверяет legacy tarball', expected: 0 },
  { name: 'типы требуют checker', types: 'dist/main.d.ts', expected: 1 },
  { name: 'types export требует checker', exports: { '.': { types: './dist/main.d.ts' } }, expected: 1 },
  { name: 'consumer требует checker', consumer: true, expected: 1 },
  {
    name: 'checker не может скрыто пересобрать пакет',
    script: 'npm run build && node scripts/check-package.mjs',
    expected: 1
  },
  {
    name: 'проверяет переданный tarball без изменения байтов',
    script: check,
    consumer: true,
    expected: 0,
    invoked: true
  },
  { name: 'ошибка checker блокирует артефакт', script: check, mode: 'failure', expected: 1, invoked: true },
  { name: 'изменение tarball блокирует артефакт', script: check, mode: 'tarball-change', expected: 1, invoked: true },
  { name: 'изменение manifest блокирует артефакт', script: check, mode: 'manifest-change', expected: 1, invoked: true }
]) {
  test(`Общий package gate: ${scenario.name}`, async() => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'editor-artifact-gate-'))
    try {
      const manifest = await writeArtifact(path.join(directory, 'package-artifacts'))
      await writeFile(path.join(directory, 'package.json'), JSON.stringify({
        name: manifest.name,
        types: scenario.types,
        exports: scenario.exports,
        scripts: scenario.script ? { 'check:package': scenario.script } : {}
      }))
      if (scenario.consumer) {
        await mkdir(path.join(directory, 'fixtures/package-consumer'), { recursive: true })
        await writeFile(path.join(directory, 'fixtures/package-consumer/package.json'), '{}')
      }
      await mkdir(path.join(directory, 'bin'))
      await writeFile(path.join(directory, 'bin/npm'), npmStub, { mode: 0o755 })
      const result = spawnSync(process.execPath, [entrypoint, 'check-package'], {
        cwd: directory,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${path.join(directory, 'bin')}:${process.env.PATH}`,
          GITHUB_SHA: fixtureManifest.sha,
          CHECKER_MODE: scenario.mode ?? 'success'
        }
      })
      assert.equal(result.status, scenario.expected, result.stderr)
      if (scenario.invoked) {
        const args = JSON.parse(await readFile(path.join(directory, 'checker-arguments.json'), 'utf8'))
        assert.deepEqual(args, ['run', 'check:package', '--', '--tarball',
                                path.join(directory, 'package-artifacts', manifest.filename)])
      } else {
        await assert.rejects(readFile(path.join(directory, 'checker-arguments.json')), { code: 'ENOENT' })
      }
      if (scenario.expected === 0) {
        const after = JSON.parse(await readFile(path.join(directory, 'package-artifacts/manifest.json'), 'utf8'))
        assert.equal(after.sha256, manifest.sha256)
        assert.equal(after.integrity, manifest.integrity)
      }
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
}
