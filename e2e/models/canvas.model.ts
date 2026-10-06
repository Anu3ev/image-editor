/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'

export class CanvasModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Sets the artboard resolution */
  async setMontageResolution(params: { width?: number, height?: number }): Promise<void> {
    await this.page.evaluate(({ width, height }) => {
      const { editor } = window as any
      const { canvasManager } = editor

      if (width !== undefined) canvasManager.setResolutionWidth(width)
      if (height !== undefined) canvasManager.setResolutionHeight(height)
    }, params)
  }

  /** Clears all user objects from the canvas */
  async clearCanvas(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any
      editor.canvasManager.clearCanvas()
    })
  }

  /** Clicks the artboard's top-left corner using real viewport coordinates. */
  async clickTopLeftInsideMontageArea(): Promise<void> {
    const point = await this.page.evaluate(() => {
      const { editor } = window as any
      const {
        canvas,
        montageArea
      } = editor

      montageArea.setCoords()

      const tl = montageArea.oCoords?.tl
      const tr = montageArea.oCoords?.tr
      const br = montageArea.oCoords?.br
      const bl = montageArea.oCoords?.bl

      if (!tl || !tr || !br || !bl) return null

      const montageLeft = Math.min(tl.x, tr.x, br.x, bl.x)
      const montageTop = Math.min(tl.y, tr.y, br.y, bl.y)
      const canvasRect = canvas.upperCanvasEl.getBoundingClientRect()
      const inset = 24

      return {
        x: canvasRect.left + montageLeft + inset,
        y: canvasRect.top + montageTop + inset
      }
    })

    expect(point, 'для клика внутри монтажной области должны существовать viewport-координаты').not.toBeNull()

    await this.page.mouse.click(point!.x, point!.y)
    await waitForCanvasRender({ page: this.page })
  }
}
