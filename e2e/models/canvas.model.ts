/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page } from '@playwright/test'

export class CanvasModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Устанавливает разрешение montage area */
  async setMontageResolution(params: { width?: number, height?: number }): Promise<void> {
    await this.page.evaluate(({ width, height }) => {
      const { editor } = window as any
      const { canvasManager } = editor

      if (width !== undefined) canvasManager.setResolutionWidth(width)
      if (height !== undefined) canvasManager.setResolutionHeight(height)
    }, params)
  }

  /** Очищает canvas от всех пользовательских объектов */
  async clearCanvas(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any
      editor.canvasManager.clearCanvas()
    })
  }
}
