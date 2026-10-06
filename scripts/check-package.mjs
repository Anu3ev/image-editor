import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rename, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { preview } from 'vite'

const root = process.cwd()

/** Run package tools without inheriting the repository's source or node_modules. */
function run({ command, args, cwd = root, allowFailure = false }) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: process.env, timeout: 180000 })
  if (result.error) throw result.error
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`)
  }
  return result
}

const args = process.argv.slice(2)
assert(
  args.length === 0 || (args.length === 2 && args[0] === '--tarball' && args[1] && !args[1].startsWith('--')),
  'Usage: check-package.mjs [--tarball <path>]'
)
let tarball
if (args.length > 0) {
  tarball = path.resolve(args[1])
} else {
  await mkdir('package-artifacts', { recursive: true })
  const packed = JSON.parse(run({
    command: 'npm',
    args: ['pack', '--json', '--pack-destination', 'package-artifacts', '--ignore-scripts']
  }).stdout)[0]
  tarball = path.resolve('package-artifacts', packed.filename)
}
const digest = createHash('sha256').update(await readFile(tarball)).digest('hex')
const entries = run({ command: 'tar', args: ['-tzf', tarball] }).stdout.trim().split('\n')
assert(entries.includes('package/dist/main.d.ts'), 'Missing root declarations')
assert(entries.some((entry) => /^package\/dist\/assets\/worker-.*\.js$/.test(entry)), 'Missing worker asset')
console.log(`Checking tarball ${tarball} (SHA-256 ${digest})`)
const directory = await mkdtemp(path.join(os.tmpdir(), 'fabric-packed-consumer-'))
let browser
try {
  await cp(path.join(root, 'fixtures/package-consumer'), directory, { recursive: true })
  run({ command: 'npm', args: ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], cwd: directory })
  // All runtime dependencies and tools were installed from the committed fixture lock.
  // npm may need registry metadata to link the tarball; verify the exact locked graph below.
  run({
    command: 'npm',
    args: [
      'install', '--prefer-offline', '--no-save', '--package-lock=false',
      '--ignore-scripts', '--no-audit', '--no-fund', tarball
    ],
    cwd: directory
  })
  const locked = JSON.parse(await readFile(path.join(directory, 'package-lock.json'), 'utf8')).packages
  const installed = JSON.parse(await readFile(path.join(directory, 'node_modules/.package-lock.json'), 'utf8')).packages
  assert(installed['node_modules/@anu3ev/fabric-image-editor'], 'Tarball must be npm-installed')
  for (const [name, metadata] of Object.entries(installed)) {
    if (name === 'node_modules/@anu3ev/fabric-image-editor') continue
    assert(locked[name], `Unpinned consumer dependency: ${name}`)
    assert.equal(metadata.version, locked[name].version, `Consumer dependency changed: ${name}`)
    assert.equal(metadata.integrity, locked[name].integrity, `Consumer dependency integrity changed: ${name}`)
  }
  run({ command: 'npm', args: ['run', 'typecheck'], cwd: directory })
  // Each declaration-only input must be reachable from the real installed entrypoint.
  for (const name of ['main.d.ts', 'editor/types/fabric-extensions.d.ts', 'editor/types/events.d.ts']) {
    const declarations = path.join(directory, 'node_modules/@anu3ev/fabric-image-editor/dist', name)
    await rename(declarations, `${declarations}.missing`)
    try {
      assert.notEqual(
        run({ command: 'npm', args: ['run', 'typecheck'], cwd: directory, allowFailure: true }).status,
        0,
        `Missing ${name} must fail strict consumer typechecking`
      )
    } finally {
      await rename(`${declarations}.missing`, declarations)
    }
  }
  run({ command: 'npm', args: ['run', 'build'], cwd: directory })
  console.log('Locked installed-package types, negative declaration checks, and consumer build passed')
  await mkdir('test-results', { recursive: true })
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
  })
  console.log(`Packed consumer browser (sequential): ${browser.version()}`)
  for (const prefix of ['/', '/nested/editor/']) {
    const server = await preview({
      configFile: false,
      root: directory,
      base: prefix,
      preview: { host: '127.0.0.1', port: 0, open: false }
    })
    const context = await browser.newContext()
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true })
    const page = await context.newPage()
    const errors = []
    const workers = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('requestfailed', (request) => errors.push(`${request.failure()?.errorText}: ${request.url()}`))
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`)
    })
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('worker', (worker) => workers.push(worker.url()))
    try {
      await page.goto(server.resolvedUrls.local[0])
      await page.waitForFunction(() => typeof window.runScenario === 'function')
      const results = await page.evaluate(() => Promise.race([
        window.runScenario(),
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Packed consumer timed out')), 15000)
        })
      ]))
      assert.deepEqual(results.map((result) => result.contentType), ['image/png', 'image/jpeg'])
      for (const result of results) {
        assert.deepEqual({ width: result.width, height: result.height }, { width: 128, height: 128 })
        assert(result.bytes > 0)
      }
      assert(workers.some((url) => /worker-.*\.js/.test(url)), 'Worker must load from the installed package')
      assert.deepEqual(errors, [])
      console.log(`Packed consumer passed at ${prefix}: PNG and JPEG files`)
    } catch (error) {
      await page.screenshot({ path: `test-results/package-${prefix === '/' ? 'root' : 'nested'}.png` }).catch(() => {})
      throw error
    } finally {
      try {
        await context.tracing.stop({ path: `test-results/package-${prefix === '/' ? 'root' : 'nested'}.zip` })
      } finally {
        try {
          await context.close()
        } finally {
          await new Promise((resolve, reject) => {
            server.httpServer.close((error) => {
              if (error) {
                reject(error)
              } else {
                resolve()
              }
            })
          })
        }
      }
    }
  }
} finally {
  try {
    await browser?.close()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

assert.equal(createHash('sha256').update(await readFile(tarball)).digest('hex'), digest, 'Checked tarball changed')
console.log(`Installed package validated without changing SHA-256 ${digest}`)
