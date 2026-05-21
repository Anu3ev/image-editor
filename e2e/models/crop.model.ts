/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'

import { waitForCanvasRender } from '../helpers/canvas-render.helper'
import type {
  CropControlKey,
  CropImageSourceInfo,
  CropResizeFromControlParams,
  CropStartParams,
  CropStateInfo,
  ObjectTargetParams
} from '../types'

/** Соответствие drag-control crop frame его фиксированному противоположному control. */
const OPPOSITE_CROP_CONTROL = {
  tl: 'br',
  tr: 'bl',
  bl: 'tr',
  br: 'tl',
  ml: 'mr',
  mr: 'ml',
  mt: 'mb',
  mb: 'mt'
} satisfies Record<CropControlKey, CropControlKey>

export class CropModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Возвращает true, если crop mode активен. */
  async isActive(): Promise<boolean> {
    return this.page.evaluate(() => {
      const { editor } = window as any

      return Boolean(editor.cropManager?.isActive)
    })
  }

  /** Ожидает выхода из crop mode. */
  async waitUntilInactive(): Promise<void> {
    await this.page.waitForFunction(() => {
      const { editor } = window as any

      return !editor.cropManager?.isActive
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Возвращает публичное состояние crop mode в сериализованном виде. */
  async getState(): Promise<CropStateInfo | null> {
    return this.page.evaluate(() => {
      const { editor } = window as any
      const state = editor.cropManager?.getState()
      if (!state) return null

      const { frame } = state

      return {
        mode: state.mode,
        targetId: state.target?.id ?? null,
        options: state.options,
        rect: state.rect,
        frame: {
          id: frame.id ?? null,
          type: frame.type,
          left: frame.left,
          top: frame.top,
          width: frame.width,
          height: frame.height,
          scaleX: frame.scaleX,
          scaleY: frame.scaleY,
          angle: frame.angle
        }
      }
    })
  }

  /** Входит в режим кропа монтажной области через публичный API редактора. */
  async startCanvasCrop(params: CropStartParams = {}): Promise<CropStateInfo> {
    const state = await this.page.evaluate((options) => {
      const { editor } = window as any

      return editor.cropManager.startCanvasCrop(options)
    }, params)

    expect(state, 'crop монтажной области должен стартовать').not.toBeNull()
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Входит в режим кропа изображения через публичный API редактора. */
  async startImageCrop(params: CropStartParams = {}): Promise<CropStateInfo> {
    const state = await this.page.evaluate(({ objectIndex, id, ...options }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)

      return editor.cropManager.startImageCrop({
        ...options,
        target
      })
    }, params)

    expect(state, 'crop изображения должен стартовать').not.toBeNull()
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Задаёт размер активной crop-области через публичный API редактора. */
  async setSize(params: { width: number, height: number }): Promise<CropStateInfo> {
    await this.page.evaluate((size) => {
      const { editor } = window as any

      editor.cropManager.setSize({ size })
    }, params)

    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Применяет активный crop mode. */
  async apply(): Promise<void> {
    const result = await this.page.evaluate(() => {
      const { editor } = window as any

      return editor.cropManager.apply()
    })

    expect(result, 'активный crop должен примениться').not.toBeNull()
    await waitForCanvasRender({ page: this.page })
  }

  /** Отменяет активный crop mode. */
  async cancel(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any

      editor.cropManager.cancel()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Масштабирует crop-область из control через реальную Fabric drag-сессию. */
  async resizeFrameFromControl(params: CropResizeFromControlParams): Promise<CropStateInfo> {
    const oppositeControl = OPPOSITE_CROP_CONTROL[params.control]
    const state = await this.page.evaluate((payload) => {
      const {
        control,
        oppositeControl: opposite,
        widthRatio,
        heightRatio,
        shiftKey = false
      } = payload
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const cropState = editor.cropManager.getState()
      if (!cropState) return null

      editor.canvas.setActiveObject(cropState.frame)
      const result = helpers.scaleSelectionFromControl({
        startControl: control,
        oppositeControl: opposite,
        scaleX: widthRatio,
        scaleY: heightRatio,
        shiftKey
      })
      if (!result) return null

      editor.canvas.__onMouseUp(new MouseEvent('mouseup', {
        bubbles: true,
        button: 0,
        buttons: 0,
        clientX: result.point.x,
        clientY: result.point.y,
        shiftKey
      }))

      return editor.cropManager.getState()
    }, {
      ...params,
      oppositeControl
    })

    expect(state, 'после resize crop mode должен остаться активным').not.toBeNull()
    await waitForCanvasRender({ page: this.page })

    return this.requireState()
  }

  /** Кликает в центр canvas-объекта реальным mouse-событием. */
  async clickObjectCenter(params: ObjectTargetParams): Promise<void> {
    const point = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      target.setCoords()
      const bounds = target.getBoundingRect(false, true)
      const canvasRect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: canvasRect.left + bounds.left + (bounds.width / 2),
        y: canvasRect.top + bounds.top + (bounds.height / 2)
      }
    }, params)

    expect(point, 'для клика по объекту должны существовать client-координаты').not.toBeNull()
    if (!point) {
      throw new Error('Не удалось получить client-координаты для клика по объекту')
    }

    await this.page.mouse.click(point.x, point.y)
    await waitForCanvasRender({ page: this.page })
  }

  /** Возвращает pixel/source-состояние изображения после image crop. */
  async getImageSourceInfo(params: ObjectTargetParams): Promise<CropImageSourceInfo> {
    const info = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      const source = target.getElement?.()

      return {
        id: target.id ?? null,
        width: target.width,
        height: target.height,
        cropX: target.cropX ?? 0,
        cropY: target.cropY ?? 0,
        sourceWidth: source?.width ?? 0,
        sourceHeight: source?.height ?? 0
      }
    }, params)

    expect(info, 'должно существовать состояние изображения после crop').not.toBeNull()
    if (!info) {
      throw new Error('Не удалось получить состояние изображения после crop')
    }

    return info
  }

  /** Возвращает активное состояние crop mode или падает, если оно отсутствует. */
  async requireState(): Promise<CropStateInfo> {
    const state = await this.getState()

    expect(state, 'crop mode должен быть активен').not.toBeNull()
    if (!state) {
      throw new Error('Crop mode должен быть активен')
    }

    return state
  }
}
