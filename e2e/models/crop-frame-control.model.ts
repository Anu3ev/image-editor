import { type Page, expect } from '@playwright/test'

import { waitForCanvasRender } from '../helpers/canvas-render.helper'
import type { CropControlKey } from '../types'

/** Client-точка crop frame control. */
type CropFrameControlPoint = {
  x: number
  y: number
}

/** Browser-side shape control с координатами, которые нужны e2e-модели. */
type BrowserCropFrameControl = {
  x?: unknown
  y?: unknown
}

/** Browser-side crop frame, достаточный для чтения control-точки. */
type BrowserCropFrameWithControls = {
  oCoords?: Partial<Record<CropControlKey, BrowserCropFrameControl>>
  setCoords: () => void
}

/** Browser-side состояние active crop mode, достаточное для hover control. */
type BrowserCropStateWithFrame = {
  frame: BrowserCropFrameWithControls
}

/** Browser-side editor contract для работы с crop frame controls. */
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

/** Browser window с editor runtime для crop frame control e2e. */
type BrowserCropFrameControlWindow = Window & {
  editor?: BrowserCropFrameControlEditor
}

/** E2E-модель hover/cursor действий над controls активной crop-области. */
export class CropFrameControlModel {
  private readonly page: Page

  /**
   * @param page - Playwright page с открытым editor demo.
   */
  constructor(page: Page) {
    this.page = page
  }

  /** Наводит курсор на указанный resize control активной crop-области. */
  async hoverControl(params: { control: CropControlKey }): Promise<void> {
    const point = await this.resolveControlPoint(params)

    await this.page.mouse.move(point.x, point.y)
    await waitForCanvasRender({ page: this.page })
  }

  /** Возвращает cursor canvas после hover указанного resize control. */
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

  /** Возвращает viewport-координаты resize control активной crop-области. */
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

  /** Возвращает текущее значение cursor у верхнего canvas слоя. */
  private async readCanvasCursor(): Promise<string> {
    return this.page.evaluate(() => {
      const { editor } = window as BrowserCropFrameControlWindow
      if (!editor) return ''

      return editor.canvas.upperCanvasEl.style.cursor ?? ''
    })
  }
}
