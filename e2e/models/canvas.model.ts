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
      const { canvasManager } = (window as any).editor
      if (width !== undefined) canvasManager.setResolutionWidth(width)
      if (height !== undefined) canvasManager.setResolutionHeight(height)
    }, params)
  }

  /** Очищает canvas от всех пользовательских объектов */
  async clearCanvas(): Promise<void> {
    await this.page.evaluate(() => {
      (window as any).editor.canvasManager.clearCanvas()
    })
  }
}
