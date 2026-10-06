/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page } from '@playwright/test'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'

export class ClipboardModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Copies the current active object to the editor's internal clipboard. */
  async copy(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any
      editor.clipboardManager.copy()
    })
  }

  /** Waits for the editor's internal clipboard to be populated. */
  async waitForClipboardReady(): Promise<void> {
    await this.page.waitForFunction(() => {
      const { editor } = window as any
      return Boolean(editor?.clipboardManager?.clipboard)
    })
  }

  /** Pastes an object from the editor's internal clipboard. */
  async paste(): Promise<boolean> {
    const pasted = await this.page.evaluate(async() => {
      const { editor } = window as any
      return editor.clipboardManager.paste()
    })

    await waitForCanvasRender({ page: this.page })

    return pasted
  }
}
