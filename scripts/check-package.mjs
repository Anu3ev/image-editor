import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { launchBrowser, observeBrowserPage, serve } from './browser-server.mjs'

const root = process.cwd()
function run({ command, args, cwd = root, allowFailure = false }) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: process.env })
  if (result.error) throw result.error
  if (result.status !== 0 && !allowFailure) throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`)
  return result
}
const argument = process.argv.indexOf('--tarball')
let tarball
if (argument >= 0) {
  tarball = path.resolve(process.argv[argument + 1])
} else {
  await mkdir('package-artifacts', { recursive: true })
  const packed = JSON.parse(run({ command: 'npm', args: ['pack', '--json', '--pack-destination', 'package-artifacts', '--ignore-scripts'] }).stdout)[0]
  tarball = path.resolve('package-artifacts', packed.filename)
  assert(packed.files.some(file => file.path === 'dist/main.d.ts'), 'Missing root declarations')
  assert(packed.files.some(file => /^dist\/assets\/worker-.*\.js$/.test(file.path)), 'Missing worker asset')
  const bytes = await readFile(tarball)
  const metadata = JSON.parse(await readFile('package.json', 'utf8'))
  const manifest = {
    sha: run({ command: 'git', args: ['rev-parse', 'HEAD'] }).stdout.trim(),
    name: metadata.name,
    version: metadata.version,
    filename: packed.filename,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`
  }
  await writeFile('package-artifacts/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
}
const directory = await mkdtemp(path.join(os.tmpdir(), 'fabric-packed-consumer-'))
let browser
try {
  await cp(path.join(root, 'fixtures/package-consumer'), directory, { recursive: true })
  run({ command: 'npm', args: ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], cwd: directory })
  run({ command: 'npm', args: ['run', 'typecheck'], cwd: directory })
  // Prove that compiler success depends on the installed declarations.
  const declarations = path.join(directory, 'node_modules/@anu3ev/fabric-image-editor/dist/main.d.ts')
  await rename(declarations, `${declarations}.missing`)
  try {
    assert.notEqual(run({ command: 'npm', args: ['run', 'typecheck'], cwd: directory, allowFailure: true }).status, 0, 'Missing declarations must fail')
  } finally {
    await rename(`${declarations}.missing`, declarations)
  }
  run({ command: 'npm', args: ['run', 'build'], cwd: directory })
  console.log('Strict installed-package typecheck, missing-declarations rejection, and production consumer build passed')
  await mkdir('test-results', { recursive: true })
  browser = await launchBrowser()
  console.log(`Packed consumer browser: ${browser.version()}`)
  for (const prefix of ['/', '/nested/editor/']) {
    const server = await serve({ directory: path.join(directory, 'dist'), prefix })
    const context = await browser.newContext()
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true })
    const page = await context.newPage()
    const { errors, workers } = observeBrowserPage(page)
    try {
      await page.goto(server.url)
      await page.waitForFunction(() => typeof window.runScenario === 'function')
      const result = await page.evaluate(() => window.runScenario())
      assert.deepEqual({ width: result.width, height: result.height }, { width: 128, height: 128 })
      assert(result.bytes > 0)
      assert(workers.some(url => /worker-.*\.js/.test(url)), 'Worker must load from the installed package')
      assert.deepEqual(errors, [])
      console.log(`Packed consumer passed at ${prefix}: ${result.bytes} byte PNG`)
    } catch (error) {
      await page.screenshot({ path: `test-results/package-${prefix === '/' ? 'root' : 'nested'}.png` }).catch(() => {})
      throw error
    } finally {
      await context.tracing.stop({ path: `test-results/package-${prefix === '/' ? 'root' : 'nested'}.zip` })
      await context.close()
      await server.close()
    }
  }
  // A broken worker must fail the actual runtime path, never a mock or CDN proxy.
  const server = await serve({ directory: path.join(directory, 'dist') })
  const page = await browser.newPage()
  try {
    await page.route('**/worker-*.js', route => route.fulfill({ status: 404, body: 'Missing worker' }))
    await page.goto(server.url)
    await page.waitForFunction(() => typeof window.runScenario === 'function')
    await assert.rejects(page.evaluate(() => window.runScenario()), /worker|Worker|failed|Failed/)
    console.log('Missing worker negative check passed')
  } finally {
    await page.close()
    await server.close()
  }
} finally {
  await browser?.close()
  await rm(directory, { recursive: true, force: true })
}
