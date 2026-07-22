/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type { ObjectTargetParams } from '../../types'
import { waitForCanvasRender } from '../../helpers/canvas-render.helper'

/** Координаты ручки на странице. */
type ShapeControlPoint = {
  x: number
  y: number
}

/** Имя Fabric-ручки поворота фигуры. */
const SHAPE_ROTATE_CONTROL = 'mtr'

/**
 * Управляет реальным mouse-взаимодействием с ручкой поворота.
 * ShapeModel остаётся внешней точкой входа для e2e-тестов.
 */
export class ShapeRotationSession {
  private readonly page: Page

  private isPointerDown: boolean

  /** Создаёт управление поворотом для страницы редактора. */
  constructor(page: Page) {
    expect(page, 'страница редактора должна существовать').toBeDefined()
    expect(page.mouse, 'у страницы редактора должен быть доступен mouse').toBeDefined()

    this.page = page
    this.isPointerDown = false
  }

  /** Наводит курсор на ручку поворота фигуры. */
  async hoverRotateHandle(params: ObjectTargetParams = {}): Promise<void> {
    const point = await this._resolveRotateControlPoint(params)

    expect(Number.isFinite(point.x), 'координата X ручки поворота должна быть конечным числом').toBe(true)
    expect(Number.isFinite(point.y), 'координата Y ручки поворота должна быть конечным числом').toBe(true)

    await this.page.mouse.move(point.x, point.y)
    await waitForCanvasRender({ page: this.page })
  }

  /** Начинает поворот фигуры реальным mousedown на ручке. */
  async startRotateFromHandle(params: ObjectTargetParams = {}): Promise<void> {
    expect(this.isPointerDown, 'нельзя повторно начать поворот до mouseup').toBe(false)

    const point = await this._resolveRotateControlPoint(params)

    expect(Number.isFinite(point.x), 'координата X ручки поворота должна быть конечным числом').toBe(true)
    expect(Number.isFinite(point.y), 'координата Y ручки поворота должна быть конечным числом').toBe(true)

    await this.page.mouse.move(point.x, point.y)
    await this.page.mouse.down()
    this.isPointerDown = true

    await waitForCanvasRender({ page: this.page })
  }

  /** Завершает поворот фигуры реальным mouseup. */
  async finishRotation(): Promise<void> {
    expect(this.isPointerDown, 'поворот можно завершить только после mousedown').toBe(true)

    await this.page.mouse.up()
    this.isPointerDown = false

    expect(this.isPointerDown, 'состояние поворота должно очиститься после mouseup').toBe(false)
    await waitForCanvasRender({ page: this.page })
  }

  /** Возвращает координаты ручки поворота выбранной фигуры. */
  private async _resolveRotateControlPoint(params: ObjectTargetParams): Promise<ShapeControlPoint> {
    const point = await this.page.evaluate(({ objectIndex, id, rotateControl }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      target.setCoords()
      editor.canvas.renderAll()

      const control = target.oCoords?.[rotateControl]
      if (!control || typeof control.x !== 'number' || typeof control.y !== 'number') return null

      const canvasRect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: canvasRect.left + control.x,
        y: canvasRect.top + control.y
      }
    }, {
      ...params,
      rotateControl: SHAPE_ROTATE_CONTROL
    })

    expect(point, 'ручка поворота выбранной фигуры должна существовать').not.toBeNull()
    expect(Number.isFinite(point?.x), 'координата X ручки поворота должна быть конечным числом').toBe(true)
    expect(Number.isFinite(point?.y), 'координата Y ручки поворота должна быть конечным числом').toBe(true)

    return point as ShapeControlPoint
  }
}
