import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { compileFunction } from 'node:vm'

const source = await readFile(new URL('../check-package.mjs', import.meta.url), 'utf8')
const body = source.replace(/^import .*\n/gm, '')
const dependencyNames = [
  'assert', 'spawnSync', 'createHash', 'cp', 'mkdir', 'mkdtemp', 'readFile', 'rename', 'rm',
  'os', 'path', 'chromium', 'preview', 'process', 'console'
]
const execute = compileFunction(`return (async() => { ${body} })()`, dependencyNames)

/** Run the actual CLI body with in-memory files/tools, leaving the real browser gate untouched. */
export function packageConsumerHarness({ args = [], entries, failConsumerBuild = false, mutateTarball = false } = {}) {
  const root = '/package-consumer-test'
  const directory = '/tmp/package-consumer-test'
  const tarball = path.join(root, 'provided.tgz')
  const packedTarball = path.resolve('package-artifacts', 'test-package.tgz')
  const fixture = path.join(root, 'fixtures/package-consumer')
  const packagePath = 'node_modules/@anu3ev/fabric-image-editor'
  const declarations = ['main.d.ts', 'editor/types/fabric-extensions.d.ts', 'editor/types/events.d.ts']
  const files = new Map()
  const calls = []
  const write = (file, text) => files.set(file, Buffer.from(text))
  write(tarball, 'original-tarball-bytes')
  write(`${fixture}/package-lock.json`, JSON.stringify({ packages: {} }))
  write(`${fixture}/node_modules/.package-lock.json`, JSON.stringify({
    packages: { [packagePath]: { version: '1.0.0' } }
  }))
  for (const name of declarations) write(`${fixture}/${packagePath}/dist/${name}`, 'declarations')

  const read = async(file, encoding) => {
    if (!files.has(file)) throw new Error(`ENOENT: ${file}`)
    return encoding ? files.get(file).toString(encoding) : files.get(file)
  }
  const spawnSync = (command, commandArgs, options) => {
    calls.push({ command, args: commandArgs, cwd: options.cwd })
    let status = 0
    let stdout = ''
    if (command === 'tar') {
      stdout = (entries ?? ['package/dist/main.d.ts', 'package/dist/assets/worker-test.js']).join('\n')
    } else if (commandArgs[0] === 'pack') {
      write(packedTarball, 'packed-tarball-bytes')
      stdout = JSON.stringify([{ filename: 'test-package.tgz' }])
    } else if (commandArgs[1] === 'typecheck') {
      status = declarations.every((name) => files.has(`${directory}/${packagePath}/dist/${name}`)) ? 0 : 1
    } else if (commandArgs[1] === 'build' && failConsumerBuild) {
      status = 9
    }
    return { status, stdout, stderr: '' }
  }
  const page = {
    on(event, callback) {
      if (event === 'worker') callback({ url: () => '/assets/worker-test.js' })
    },
    goto: async() => {},
    waitForFunction: async() => {},
    screenshot: async() => {},
    async evaluate() {
      if (mutateTarball) write(args.length ? tarball : packedTarball, 'tampered')
      return ['image/png', 'image/jpeg'].map((contentType) => ({ contentType, width: 128, height: 128, bytes: 1 }))
    }
  }
  const context = {
    tracing: { start: async() => {}, stop: async() => {} },
    newPage: async() => page,
    close: async() => {}
  }
  const dependencies = {
    assert,
    spawnSync,
    createHash,
    cp: async(from, to) => {
      for (const [file, bytes] of [...files]) {
        if (file.startsWith(`${from}/`)) files.set(to + file.slice(from.length), bytes)
      }
    },
    mkdir: async() => {},
    mkdtemp: async() => directory,
    readFile: read,
    rename: async(from, to) => {
      files.set(to, await read(from))
      files.delete(from)
    },
    rm: async(prefix) => {
      for (const file of [...files.keys()]) if (file.startsWith(`${prefix}/`)) files.delete(file)
    },
    os,
    path,
    chromium: { launch: async() => ({ version: () => 'test', newContext: async() => context, close: async() => {} }) },
    preview: async() => ({ resolvedUrls: { local: ['http://localhost/'] }, httpServer: { close: (done) => done() } }),
    process: { cwd: () => root, argv: ['node', 'check-package.mjs', ...args], env: {} },
    console: { log: () => {} }
  }
  return {
    root,
    tarball,
    calls,
    files,
    run: () => execute(...dependencyNames.map((name) => dependencies[name]))
  }
}
