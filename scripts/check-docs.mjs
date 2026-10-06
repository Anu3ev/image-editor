import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { launchBrowser, observeBrowserPage, serve } from './browser-server.mjs'

const metadata = JSON.parse(await readFile('docs/build-info.json', 'utf8'))
assert.match(metadata.sha, /^[a-f0-9]{40}$/)
assert.equal(metadata.version, JSON.parse(await readFile('package.json', 'utf8')).version)
assert(metadata.buildId)
if (process.env.BUILD_SHA) assert.equal(metadata.sha, process.env.BUILD_SHA)
const browser = await launchBrowser()
const server = await serve({ directory: 'docs', prefix: '/image-editor/' })
try {
  const page = await browser.newPage({ viewport: { width: 1180, height: 757 } })
  const { errors, workers } = observeBrowserPage(page)
  await page.goto(server.url)
  await page.locator('#sample-demo[data-ready="true"]').waitFor({ timeout: 30_000 })
  assert.match(await page.locator('#demo-build-info').innerText(), new RegExp(metadata.sha.slice(0, 7)))
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  const downloadPromise = page.waitForEvent('download')
  await page.locator('#sample-export').click()
  const download = await downloadPromise
  assert.equal(await download.failure(), null)
  const workerResult = await page.evaluate(async () => {
    const editor = window.editor
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 16
    const image = await editor.imageManager.resizeImageToBoundaries({
      dataURL: canvas.toDataURL(), maxWidth: 16, maxHeight: 8, emitMessage: false
    })
    const bitmap = await createImageBitmap(image)
    const size = [bitmap.width, bitmap.height]
    bitmap.close()
    return size
  })
  assert.deepEqual(workerResult, [16, 8])
  assert(workers.length > 0, 'The demo must load its worker under the nested project prefix')
  assert.deepEqual(errors, [])
  await mkdir('test-results', { recursive: true })
  await page.screenshot({ path: 'test-results/demo-nested-prefix.png', fullPage: true })
  await page.addInitScript(() => { window.__EDITOR_DEMO_INIT_OPTIONS = { fonts: [] } })
  await page.goto(`${server.url}?mode=playground`)
  await page.waitForFunction(() => Boolean(window.editor?.canvas))
  await page.evaluate(() => window.editor.ready)
  assert.equal(await page.evaluate(() => window.editor.canvas.getObjects().filter(object => object.id?.startsWith('sample-')).length), 0)
  assert.deepEqual(errors, [])
  console.log(`Demo passed at /image-editor/: ${metadata.sha} (${browser.version()})`)
} finally {
  await browser.close()
  await server.close()
}
