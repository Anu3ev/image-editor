const PACKAGE_NAME = '@anu3ev/fabric-image-editor'
const ESM_SH_ORIGIN = 'https://esm.sh'
const JSDELIVR_NPM_ORIGIN = 'https://cdn.jsdelivr.net/npm'
const ESM_SH_BUNDLE_PATTERN = /export \* from "([^"]+\.mjs)"/
const VITE_WORKER_ASSET_PATTERN = /new URL\(["']([^"']*worker[^"']*\.js)["'],\s*import\.meta\.url\)/

/** @type {Map<string, string>} */
const publishedWorkerBlobUrls = new Map()
let publishedWorkerProxyInstalled = false

/**
 * Возвращает версию редактора из query string.
 * Пустое значение означает локальную dev/docs сборку.
 */
function getRequestedEditorVersion() {
  return new URLSearchParams(window.location.search).get('version')
}

/**
 * Загружает текстовый CDN-asset и явно падает, если CDN вернул ошибку.
 * @param {string | URL} url
 */
async function fetchText(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Не удалось загрузить ${url}: ${response.status}`)
  }

  return response.text()
}

/**
 * Находит реальный bundled module, который esm.sh сгенерировал для npm-пакета.
 * @param {{ entrySource: string, moduleUrl: string }} params
 */
function resolveEsmShBundleUrl(params) {
  const { entrySource, moduleUrl } = params
  const match = entrySource.match(ESM_SH_BUNDLE_PATTERN)
  const bundlePath = match?.[1]

  if (!bundlePath) {
    throw new Error('Не найден bundled module URL в ответе esm.sh')
  }

  return new URL(bundlePath, moduleUrl).href
}

/**
 * Достаёт путь к Vite worker asset из bundled module опубликованной версии.
 * @param {{ bundledSource: string }} params
 */
function resolveViteWorkerAssetPath(params) {
  const { bundledSource } = params
  const match = bundledSource.match(VITE_WORKER_ASSET_PATTERN)

  return match?.[1] || null
}

/**
 * Строит URL worker-файла внутри реального npm package.
 * @param {{ version: string, workerAssetPath: string }} params
 */
function resolvePublishedWorkerAssetUrl(params) {
  const { version, workerAssetPath } = params
  const workerFileName = workerAssetPath.split('/').pop()

  if (!workerFileName) {
    throw new Error('Не найдено имя worker asset в esm.sh module')
  }

  return `${JSDELIVR_NPM_ORIGIN}/${PACKAGE_NAME}@${version}/dist/assets/${workerFileName}`
}

/**
 * Подменяет только тот worker URL, который указывает на несуществующий asset в esm.sh.
 * @param {string | URL} scriptUrl
 */
function resolveWorkerScriptUrl(scriptUrl) {
  const scriptUrlString = String(scriptUrl)

  return publishedWorkerBlobUrls.get(scriptUrlString) || scriptUrl
}

/**
 * Ставит узкий Worker proxy для опубликованных CDN-версий редактора.
 */
function installPublishedWorkerProxy() {
  if (publishedWorkerProxyInstalled) return

  const NativeWorker = window.Worker

  window.Worker = class DemoWorker extends NativeWorker {
    /**
     * @param {string | URL} scriptUrl
     * @param {WorkerOptions} [options]
     */
    constructor(scriptUrl, options) {
      const workerScriptUrl = resolveWorkerScriptUrl(scriptUrl)

      super(workerScriptUrl, options)
    }
  }

  publishedWorkerProxyInstalled = true
}

/**
 * Готовит same-origin Blob URL для worker-а опубликованной версии.
 * @param {{ moduleUrl: string, version: string }} params
 */
async function preparePublishedWorkerProxy(params) {
  const { moduleUrl, version } = params
  const entrySource = await fetchText(moduleUrl)
  const esmShBundleUrl = resolveEsmShBundleUrl({ entrySource, moduleUrl })
  const bundledSource = await fetchText(esmShBundleUrl)
  const workerAssetPath = resolveViteWorkerAssetPath({ bundledSource })

  if (!workerAssetPath) return

  const esmShWorkerUrl = new URL(workerAssetPath, esmShBundleUrl).href
  const publishedWorkerUrl = resolvePublishedWorkerAssetUrl({ version, workerAssetPath })
  const workerSource = await fetchText(publishedWorkerUrl)
  const workerBlobUrl = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }))

  publishedWorkerBlobUrls.set(esmShWorkerUrl, workerBlobUrl)
  installPublishedWorkerProxy()
}

/**
 * Загружает опубликованную npm-версию редактора через browser-ready ESM.
 * @param {{ version: string }} params
 */
async function loadPublishedEditorModule(params) {
  const { version } = params
  const moduleUrl = `${ESM_SH_ORIGIN}/${PACKAGE_NAME}@${version}`

  // esm.sh делает браузерный ESM из npm-пакета, но не отдаёт рядом файлы из dist/assets.
  // Worker берём из опубликованного npm-пакета и проксируем через Blob URL, чтобы обойти same-origin restriction.
  await preparePublishedWorkerProxy({ moduleUrl, version })

  return import(/* @vite-ignore */ moduleUrl)
}

/**
 * Загружает локальный редактор или опубликованную npm-версию из query string.
 */
async function loadEditorModule() {
  const version = getRequestedEditorVersion()

  if (!version) return import('../../main.js')

  return loadPublishedEditorModule({ version })
}

export {
  getRequestedEditorVersion,
  loadEditorModule
}
