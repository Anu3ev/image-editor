/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import { resolveDisplayDistance } from '../../src/editor/utils/distance'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'
import type { BrowserMeasurementGuideState } from '../helpers/browser/editor-browser-helpers.types'
import type {
  MeasurementBetweenObjectsParams,
  MeasurementGuideState
} from '../types'

/** Координаты точки указателя в клиентской системе браузера. */
type MeasurementClientPoint = Readonly<{
  x: number
  y: number
}>

/** Маршрут указателя от свободной точки canvas до цели измерения. */
type MeasurementPointerRoute = Readonly<{
  canvasEntry: MeasurementClientPoint
  target: MeasurementClientPoint
}>

/** Выполняет пользовательское Alt-измерение между двумя объектами canvas. */
export class MeasurementModel {
  private readonly page: Page

  /** Создаёт модель Alt-измерений для указанной Playwright-страницы. */
  constructor(page: Page) {
    this.page = page
  }

  /** Зажимает Alt, наводит указатель на цель и возвращает показанные расстояния. */
  async showDistanceBetweenObjects(
    params: MeasurementBetweenObjectsParams
  ): Promise<MeasurementGuideState> {
    const pointerRoute = await this._selectActiveObjectAndResolvePointerRoute(params)
    await waitForCanvasRender({ page: this.page })
    await this.page.keyboard.down('Alt')

    let rawState: BrowserMeasurementGuideState
    try {
      await this.page.mouse.move(pointerRoute.canvasEntry.x, pointerRoute.canvasEntry.y)
      await waitForCanvasRender({ page: this.page })
      await this.page.mouse.move(pointerRoute.target.x, pointerRoute.target.y)
      await this.page.waitForFunction(() => {
        const { __editorHelpers: helpers } = window as any
        const state = helpers.getMeasurementGuideState()

        return state.guides.length > 0 && !state.isTargetMontageArea
      })
      await waitForCanvasRender({ page: this.page })

      rawState = await this.page.evaluate(() => {
        const { __editorHelpers: helpers } = window as any
        return helpers.getMeasurementGuideState()
      })

      expect(rawState.isAltPressed, 'MeasurementManager должен видеть зажатый Alt').toBe(true)
      expect(rawState.isTargetMontageArea, 'целью измерения должен быть указанный объект').toBe(false)
      expect(rawState.guides, 'между указанными объектами должны появиться направляющие').not.toHaveLength(0)
    } finally {
      await this.page.keyboard.up('Alt')
      await this.page.waitForFunction(() => {
        const { __editorHelpers: helpers } = window as any
        return helpers.getMeasurementGuideState().guides.length === 0
      })
    }

    const guides = rawState.guides.map((guide) => Object.freeze({
      ...guide,
      displayDistance: resolveDisplayDistance({ distance: guide.distance })
    }))

    return Object.freeze({
      guides: Object.freeze(guides),
      isTargetMontageArea: rawState.isTargetMontageArea
    })
  }

  /** Выбирает active и возвращает маршрут указателя до цели. */
  private async _selectActiveObjectAndResolvePointerRoute({
    active,
    target
  }: MeasurementBetweenObjectsParams): Promise<MeasurementPointerRoute> {
    const route = await this.page.evaluate(({ active: activeParams, target: targetParams }) => {
      const { editor, __editorHelpers: helpers } = window as any
      const activeObject = helpers.resolveCanvasObject(activeParams.objectIndex, activeParams.id)
      const targetObject = helpers.resolveCanvasObject(targetParams.objectIndex, targetParams.id)
      if (!activeObject || !targetObject || activeObject === targetObject) return null

      editor.canvas.setActiveObject(activeObject)
      activeObject.setCoords()
      targetObject.setCoords()

      const center = targetObject.getCenterPoint()
      const { viewportTransform } = editor.canvas
      if (!center || !Array.isArray(viewportTransform) || viewportTransform.length < 6) return null

      const [a, b, c, d, tx, ty] = viewportTransform
      const canvasBounds = editor.canvas.upperCanvasEl.getBoundingClientRect()
      editor.canvas.requestRenderAll()

      return {
        canvasEntry: {
          x: canvasBounds.left + 2,
          y: canvasBounds.top + 2
        },
        target: {
          x: canvasBounds.left + (center.x * a) + (center.y * c) + tx,
          y: canvasBounds.top + (center.x * b) + (center.y * d) + ty
        }
      }
    }, { active, target })

    expect(route, 'для Alt-измерения должны существовать разные active и target').not.toBeNull()
    if (!route) throw new Error('Не удалось определить маршрут указателя для Alt-измерения')
    expect(Number.isFinite(route.target.x), 'X-координата цели измерения должна быть конечной').toBe(true)
    expect(Number.isFinite(route.target.y), 'Y-координата цели измерения должна быть конечной').toBe(true)

    return route
  }
}
