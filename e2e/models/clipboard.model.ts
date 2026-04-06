/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page } from '@playwright/test'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'

export class ClipboardModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Копирует текущий активный объект во внутренний буфер обмена редактора. */
  async copy(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any
      editor.clipboardManager.copy()
    })
  }

  /** Ожидает, пока внутренний буфер обмена редактора будет заполнен. */
  async waitForClipboardReady(): Promise<void> {
    await this.page.waitForFunction(() => {
      const { editor } = window as any
      return Boolean(editor?.clipboardManager?.clipboard)
    })
  }

  /** Вставляет объект из внутреннего буфера обмена редактора. */
  async paste(): Promise<boolean> {
    const pasted = await this.page.evaluate(async() => {
      const { editor } = window as any
      return editor.clipboardManager.paste()
    })

    await waitForCanvasRender({ page: this.page })

    return pasted
  }
}
