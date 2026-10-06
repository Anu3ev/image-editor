import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'

export async function serve({ directory, prefix = '/' }) {
  const root = path.resolve(directory)
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
      if (!pathname.startsWith(prefix)) throw new Error('Wrong prefix')
      let file = path.resolve(root, `.${pathname.slice(prefix.length - 1)}`)
      if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error('Outside root')
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html')
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' }
      response.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' })
      response.end(await readFile(file))
    } catch {
      response.writeHead(404)
      response.end('Not found')
    }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return { url: `http://127.0.0.1:${server.address().port}${prefix}`, close: () => new Promise(resolve => server.close(resolve)) }
}

export function launchBrowser() {
  return chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: process.env.CI ? [] : ['--no-sandbox']
  })
}

/** Collect browser failures and real worker URLs for built-artifact checks. */
export function observeBrowserPage(page) {
  const errors = []
  const workers = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('requestfailed', request => errors.push(`${request.failure()?.errorText}: ${request.url()}`))
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`)
  })
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('worker', worker => workers.push(worker.url()))
  return { errors, workers }
}
