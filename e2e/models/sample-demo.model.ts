import { readFile } from 'node:fs/promises'
import { expect, type Page } from '@playwright/test'
import type { FabricImage } from 'fabric'
import type { ImageEditor } from '../../src/editor'
import { SAMPLE_ARTWORK_ROUTE } from '../fixtures/data/sample-demo.data'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'

/** Типизированная граница доступа к редактору демонстрационной страницы. */
interface SampleDemoWindow extends Window {
  editor?: ImageEditor
}

/** DOM-сценарии готового образца: загрузка, сброс, ошибки и скачивание. */
export class SampleDemoModel {
  readonly root

  readonly status

  readonly headline

  readonly crop

  readonly applyCrop

  readonly cancelCrop

  readonly cropToolbar

  readonly undo

  readonly redo

  readonly exportPng

  readonly reset

  readonly canvas

  readonly host

  readonly playground

  readonly chooseImages

  readonly advancedLink

  readonly primaryActions

  readonly pageErrors: string[] = []

  readonly requests: string[] = []

  artworkRequests = 0

  private releaseArtwork: (() => void) | null = null

  constructor(readonly page: Page) {
    this.root = page.locator('#sample-demo')
    this.status = page.locator('#sample-status')
    this.headline = page.locator('#sample-headline')
    this.crop = page.locator('#sample-crop')
    this.applyCrop = page.locator('#sample-crop-apply')
    this.cancelCrop = page.locator('#sample-crop-cancel')
    this.cropToolbar = page.locator('#sample-crop-toolbar')
    this.undo = page.locator('#sample-undo')
    this.redo = page.locator('#sample-redo')
    this.exportPng = page.locator('#sample-export')
    this.reset = page.locator('#sample-reset')
    this.canvas = page.locator('#sample-editor-host .lower-canvas')
    this.host = page.locator('#sample-editor-host')
    this.playground = page.locator('#playground-demo')
    this.chooseImages = page.locator('#choose-images-btn')
    this.advancedLink = page.getByRole('link', { name: 'Advanced playground' })
    this.primaryActions = [this.headline, this.crop, this.undo, this.redo, this.exportPng, this.reset]
  }

  /** Записывает сетевые обращения и ошибки до первой загрузки образца. */
  observeLoading(): void {
    this.page.on('request', (request) => this.requests.push(request.url()))
    this.page.on('pageerror', (error) => this.pageErrors.push(error.message))
  }

  /** Возвращает обращения вне сервера демо, независимо от его порта и домена. */
  getExternalRequests(): string[] {
    const { origin } = new URL(this.page.url())
    return this.requests.filter((url) => /^https?:/.test(url) && new URL(url).origin !== origin)
  }

  /** Ожидает завершения сборки сцены и отложенной отрисовки. */
  async waitForReady(): Promise<void> {
    await expect(this.root).toHaveAttribute('data-ready', 'true')
    await expect(this.exportPng).toBeEnabled()
    await waitForCanvasRender({ page: this.page })
  }

  /** Читает содержимое готового образца, включая исходную геометрию картинки. */
  async getScene() {
    return this.page.evaluate(() => {
      const { editor } = window as SampleDemoWindow
      if (!editor) throw new Error('Редактор образца не готов')
      const objects = editor.canvas.getObjects()
      const image = objects.find((object) => object.id === 'sample-image') as FabricImage | undefined
      const headline = objects.find((object) => object.id === 'sample-headline')
      if (!image || !headline || !('text' in headline)) throw new Error('Образец должен содержать картинку и заголовок')
      return {
        headline: headline.text,
        image: {
          width: image.width,
          height: image.height,
          left: image.left,
          top: image.top,
          cropX: image.cropX,
          cropY: image.cropY,
          scaleX: image.scaleX,
          scaleY: image.scaleY
        },
        sampleIds: objects.map((object) => object.id).filter((id) => id?.startsWith('sample-')),
        canvasObjects: objects.length
      }
    })
  }

  /** Проверяет горизонтальную прокрутку всей страницы. */
  async hasHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  }

  /** Скачивает PNG видимой кнопкой и возвращает реальный файл для проверки. */
  async downloadPng() {
    const pendingDownload = this.page.waitForEvent('download')
    await this.exportPng.click()
    const download = await pendingDownload
    const failure = await download.failure()
    if (failure) throw new Error(`Не удалось скачать PNG: ${failure}`)
    const path = await download.path()
    if (!path) throw new Error('Браузер не сохранил скачанный PNG')
    const body = await readFile(path)
    return {
      fileName: download.suggestedFilename(),
      body,
      dataUrl: `data:image/png;base64,${body.toString('base64')}`
    }
  }

  /** Имитирует два отказа экспорта, затем восстанавливает настоящий экспорт. */
  async failNextExports(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as SampleDemoWindow
      if (!editor) throw new Error('Редактор образца не готов')
      const { imageManager } = editor
      const original = imageManager.exportCanvasAsImageFile.bind(imageManager)
      let attempts = 0
      imageManager.exportCanvasAsImageFile = async(options) => {
        attempts += 1
        if (attempts === 1) return null
        if (attempts === 2) throw new Error('Injected export failure')
        return original(options)
      }
    })
  }

  /** Убирает ответ с ошибкой, чтобы следующий сброс загрузил локальную иллюстрацию. */
  async restoreArtwork(): Promise<void> {
    await this.page.unroute(SAMPLE_ARTWORK_ROUTE)
  }

  /** Удерживает первую повторную загрузку иллюстрации до явного продолжения сценария. */
  async holdNextArtwork(): Promise<void> {
    if (this.releaseArtwork) throw new Error('Предыдущая загрузка иллюстрации ещё удерживается')
    const blocked = new Promise<void>((resolve) => { this.releaseArtwork = resolve })
    this.artworkRequests = 0
    await this.page.route(SAMPLE_ARTWORK_ROUTE, async(route) => {
      this.artworkRequests += 1
      if (this.artworkRequests === 1) await blocked
      await route.continue()
    })
  }

  /** Продолжает загрузку, в том числе при завершении прерванного теста. */
  releaseHeldArtwork(): void {
    this.releaseArtwork?.()
    this.releaseArtwork = null
  }
}
