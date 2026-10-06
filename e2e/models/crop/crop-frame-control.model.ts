import { type Page, expect } from '@playwright/test'

import { waitForCanvasRender } from '../../helpers/canvas-render.helper'
import type { CropControlKey } from '../../types'

/** Client point of a crop-frame control. */
type CropFrameControlPoint = {
  x: number
  y: number
}

/** Browser-side shape control with coordinates needed by the e2e model. */
type BrowserCropFrameControl = {
  x?: unknown
  y?: unknown
}

/** Browser-side crop frame sufficient for reading a control point. */
type BrowserCropFrameWithControls = {
  oCoords?: Partial<Record<CropControlKey, BrowserCropFrameControl>>
  setCoords: () => void
}

/** Browser-side active crop-mode state sufficient for hovering a control. */
type BrowserCropStateWithFrame = {
  frame: BrowserCropFrameWithControls
}

/** Browser-side editor contract for working with crop-frame controls. */
type BrowserCropFrameControlEditor = {
  canvas: {
    renderAll: () => void
    setActiveObject: (target: BrowserCropFrameWithControls) => void
    upperCanvasEl: {
      getBoundingClientRect: () => DOMRect
      style: {
        cursor?: string
      }
    }
  }
  cropManager: {
    getState: () => BrowserCropStateWithFrame | null
  }
}

/** Browser window with the editor runtime for crop-frame control e2e tests. */
type BrowserCropFrameControlWindow = Window & {
  editor?: BrowserCropFrameControlEditor
}

/** E2E model of hover/cursor actions on active crop-area controls. */
export class CropFrameControlModel {
  private readonly page: Page

  /**
   * @param page - Playwright page with the editor demo open.
   */
  constructor(page: Page) {
    this.page = page
  }

  /** Hovers over the specified resize control of the active crop area. */
  async hoverControl(params: { control: CropControlKey }): Promise<void> {
    const point = await this.resolveControlPoint(params)

    await this.page.mouse.move(point.x, point.y)
    await waitForCanvasRender({ page: this.page })
  }

  /** Returns the canvas cursor after hovering over the specified resize control. */
  async getControlCursor(
    params: { control: CropControlKey, shiftKey?: boolean }
  ): Promise<string> {
    const {
      control,
      shiftKey = false
    } = params

    if (!shiftKey) {
      await this.hoverControl({ control })

      return this.readCanvasCursor()
    }

    await this.page.keyboard.down('Shift')

    try {
      await this.hoverControl({ control })

      return await this.readCanvasCursor()
    } finally {
      await this.page.keyboard.up('Shift')
    }
  }

  /** Returns viewport coordinates of the active crop area's resize control. */
  async resolveControlPoint(
    { control }: { control: CropControlKey }
  ): Promise<CropFrameControlPoint> {
    const point = await this.page.evaluate(({ control: controlKey }) => {
      const { editor } = window as BrowserCropFrameControlWindow
      if (!editor) return null

      const cropState = editor.cropManager.getState()
      if (!cropState) return null

      const { frame } = cropState

      editor.canvas.setActiveObject(frame)
      frame.setCoords()
      editor.canvas.renderAll()

      const frameControl = frame.oCoords?.[controlKey]
      if (!frameControl || typeof frameControl.x !== 'number' || typeof frameControl.y !== 'number') {
        return null
      }

      const canvasRect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: canvasRect.left + frameControl.x,
        y: canvasRect.top + frameControl.y
      }
    }, { control })

    expect(point, 'для hover crop-control должны существовать client-координаты').not.toBeNull()
    if (!point) {
      throw new Error('Не удалось получить client-координаты crop-control')
    }

    return point
  }

  /** Returns the current cursor value of the upper canvas layer. */
  private async readCanvasCursor(): Promise<string> {
    return this.page.evaluate(() => {
      const { editor } = window as BrowserCropFrameControlWindow
      if (!editor) return ''

      return editor.canvas.upperCanvasEl.style.cursor ?? ''
    })
  }
}
