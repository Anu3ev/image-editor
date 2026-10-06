import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { preview } from 'vite'

// Serve the real built playground under the same nested prefix as GitHub Pages.
const prefix = '/image-editor/'
await mkdir('test-results', { recursive: true })
const server = await preview({
  configFile: false,
  base: prefix,
  build: { outDir: 'docs' },
  preview: { host: '127.0.0.1', port: 0, open: false }
})
let browser
let context
let page
let scenarioTimeout
try {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
  context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.tracing.start({ screenshots: true, snapshots: true })
  page = await context.newPage()
  const errors = []
  const workers = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('worker', (worker) => workers.push(worker.url()))
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`)
  })
  await page.addInitScript(() => { window.__EDITOR_DEMO_INIT_OPTIONS = { fonts: [] } })
  // External requests are not part of the local Pages build contract.
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort()
  })
  await page.goto(server.resolvedUrls.local[0])
  await page.waitForFunction(() => Boolean(window.editor?.canvas && window.editor?.montageArea))
  assert(await page.locator('#editor').isVisible(), 'The original playground must render')
  assert.equal(await page.locator('vite-error-overlay').count(), 0)
  const result = await Promise.race([page.evaluate(async() => {
    const { editor } = window
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 16
    const image = await editor.imageManager.resizeImageToBoundaries({
      dataURL: canvas.toDataURL(), maxWidth: 16, maxHeight: 8, emitMessage: false
    })
    const bitmap = await createImageBitmap(image)
    const resized = [bitmap.width, bitmap.height]
    bitmap.close()
    const exported = await editor.imageManager.exportCanvasAsImageFile({
      fileName: 'smoke.png', contentType: 'image/png'
    })
    return { resized, type: exported.image.type, size: exported.image.size, isFile: exported.image instanceof File }
  }), new Promise((resolve, reject) => {
    scenarioTimeout = setTimeout(() => {
      reject(new Error('Built playground worker/export timed out after 15 seconds'))
    }, 15000)
  })])
  assert.deepEqual(result.resized, [16, 8])
  assert.equal(result.type, 'image/png')
  assert(result.size > 0 && result.isFile, 'PNG export must produce a nonempty file')
  assert(workers.some((url) => new URL(url).pathname.startsWith(prefix)), 'Worker must load under the project prefix')
  assert.deepEqual(errors, [])
  console.log('Built playground, nested-prefix worker and PNG export passed')
} finally {
  clearTimeout(scenarioTimeout)
  if (page) await page.screenshot({ path: 'test-results/docs-prefix.png', fullPage: true }).catch(console.error)
  if (context) await context.tracing.stop({ path: 'test-results/docs-prefix-trace.zip' }).catch(console.error)
  try {
    if (browser) await browser.close()
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
