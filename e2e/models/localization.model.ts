import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import type { ImageEditor } from '../../src/main'
import type { CanvasFullState } from '../../src/editor/history-manager'
import type { LocalizedEditorOptions } from '../types'
import { E2E_EDITOR_FONTS } from '../fixtures/data/editor-fonts.data'

const EDITOR_MODULE_URL = `/@fs${fileURLToPath(new URL('../../src/main.ts', import.meta.url))}`

/** Exercises localization through independent public library instances. */
export class LocalizationModel {
  private readonly containerIds: string[] = []

  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Initializes a real editor without adding language behavior to the demo. */
  async create(options: LocalizedEditorOptions): Promise<void> {
    this.containerIds.push(options.containerId)
    await this.page.evaluate(async({ moduleUrl, options: initOptions, fonts }) => {
      const { default: initEditor } = await import(/* @vite-ignore */ moduleUrl)
      const container = document.createElement('div')
      container.id = initOptions.containerId
      container.style.cssText = 'position:relative;width:640px;height:480px'
      document.body.appendChild(container)
      await initEditor(initOptions.containerId, {
        language: initOptions.language,
        toolbar: initOptions.toolbar,
        initialState: initOptions.initialState,
        fonts,
        showToolbar: true
      })
    }, { moduleUrl: EDITOR_MODULE_URL, options, fonts: E2E_EDITOR_FONTS })
  }

  /** Adds content through the public text manager and returns its actual text. */
  async addText({ containerId, text }: { containerId: string; text?: string }): Promise<string> {
    return this.page.evaluate(({ containerId: id, text: content }) => {
      const editor = window[id] as ImageEditor
      return editor.textManager.addText({ text: content }).text
    }, { containerId, text })
  }

  /** Saves a portable snapshot through the public history API. */
  async saveState(containerId: string): Promise<CanvasFullState> {
    return this.page.evaluate((id) => {
      const editor = window[id] as ImageEditor
      editor.historyManager.saveState()
      return editor.historyManager.getFullState()
    }, containerId)
  }

  /** Reads restored standalone text objects without depending on their canvas rendering. */
  async textContents(containerId: string): Promise<string[]> {
    return this.page.evaluate((id) => {
      const editor = window[id] as ImageEditor
      const texts: string[] = []
      for (const object of editor.canvas.getObjects()) {
        if ('text' in object && typeof object.text === 'string') texts.push(object.text)
      }
      return texts
    }, containerId)
  }

  /** Reads rendered toolbar labels belonging to one editor only. */
  async toolbarLabels(containerId: string): Promise<string[]> {
    return this.page.locator(`[id="${containerId}"] button img[title]`).evaluateAll((icons) => {
      return icons.map((icon) => icon.getAttribute('title') ?? '')
    })
  }

  /** Returns the localized initialization error before an editor can be created. */
  async missingContainerError({ containerId, language }: LocalizedEditorOptions): Promise<string> {
    return this.page.evaluate(async({ moduleUrl, containerId: id, language: locale }) => {
      const { default: initEditor } = await import(/* @vite-ignore */ moduleUrl)
      try {
        await initEditor(id, { language: locale })
      } catch (error) {
        return error instanceof Error ? error.message : String(error)
      }
      throw new Error('Expected initialization to reject a missing container')
    }, { moduleUrl: EDITOR_MODULE_URL, containerId, language })
  }

  /** Sends an unsupported action to the actual browser worker. */
  async workerError({ containerId, action }: { containerId: string; action: string }): Promise<string> {
    return this.page.evaluate(async({ containerId: id, action: workerAction }) => {
      const editor = window[id] as ImageEditor
      try {
        await editor.workerManager.post(workerAction, {})
      } catch (error) {
        return error instanceof Error ? error.message : String(error)
      }
      throw new Error('Expected the worker to reject an unsupported action')
    }, { containerId, action })
  }

  /** Releases every additional editor created by this test. */
  async destroyAll(): Promise<void> {
    if (!this.containerIds.length) return

    await this.page.evaluate((containerIds) => {
      for (const id of containerIds) {
        const editor = window[id] as ImageEditor | undefined
        editor?.destroy()
        document.getElementById(id)?.remove()
      }
    }, this.containerIds)
  }
}
