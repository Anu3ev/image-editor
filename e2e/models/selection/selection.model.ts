/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type { SnappingObjectSnapshot } from '../../types'
import { waitForCanvasRender } from '../../helpers/canvas-render.helper'
import type { ScaleInteractionTraceModel } from '../scale-interaction-trace.model'
import type { ShapeModel } from '../shape/shape.model'
import { SelectionScalingSession } from './selection-scaling-session'

/** Расхождение между границами активного объекта и отрисованной рамкой выделения. */
type SelectionFrameAlignmentInfo = {
  bottomRightDeltaX: number
  bottomRightDeltaY: number
  maxDistance: number
  topLeftDeltaX: number
  topLeftDeltaY: number
}

/** Точка объекта в координатах сцены. */
type SelectionScenePoint = {
  x: number
  y: number
  transform?: (matrix: number[]) => SelectionScenePoint
}

/** Минимальный контракт объекта для проверки положения рамки выделения. */
type SelectionVisualTarget = {
  group?: {
    calcTransformMatrix?: () => number[]
  }
  getPointByOrigin: (originX: string, originY: string) => SelectionScenePoint
}

/** Локальные свойства дочернего объекта, которые нужны снимку общего выделения. */
type SelectionCompositionChildTarget = {
  cropX?: number
  cropY?: number
  id?: unknown
  originX: string
  originY: string
  skewX?: number
  skewY?: number
}

/** Снимок дочернего объекта с локальными свойствами, защищёнными во время скейлинга. */
export interface SelectionCompositionChildSnapshot extends SnappingObjectSnapshot {
  cropX: number
  cropY: number
  id: string
  originX: string
  originY: string
  skewX: number
  skewY: number
}

/** Снимок активного составного объекта и его прямых дочерних объектов. */
export interface SelectionCompositionSnapshot {
  selection: SnappingObjectSnapshot
  children: SelectionCompositionChildSnapshot[]
}

/** Действия и проверки для активного общего выделения или группы. */
export class SelectionModel {
  private readonly page: Page

  /** Полный жест указателя при скейлинге активного составного объекта. */
  readonly scaling: SelectionScalingSession

  /** Создаёт модель действий над составными объектами редактора. */
  constructor({
    page,
    scaleInteractionTrace,
    shapes
  }: {
    page: Page
    scaleInteractionTrace: ScaleInteractionTraceModel
    shapes: ShapeModel
  }) {
    this.page = page
    this.scaling = new SelectionScalingSession({ page, scaleInteractionTrace, shapes })
  }

  /** Возвращает геометрию активного составного объекта и всех его прямых дочерних объектов. */
  async getCompositionSnapshot(): Promise<SelectionCompositionSnapshot> {
    const composition = await this.page.evaluate(() => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = editor.canvas.getActiveObject()
      const objects = target?.getObjects?.()
      if (!target || !Array.isArray(objects) || objects.length < 2) return null

      const children = objects.map((object: SelectionCompositionChildTarget) => {
        if (typeof object.id !== 'string') return null

        return {
          ...helpers.serializeSnappingObjectSnapshot(object),
          cropX: object.cropX ?? 0,
          cropY: object.cropY ?? 0,
          skewX: object.skewX ?? 0,
          skewY: object.skewY ?? 0,
          originX: object.originX,
          originY: object.originY,
          id: object.id
        }
      })
      if (children.some((child: unknown) => child === null)) return null

      return {
        selection: helpers.serializeSnappingObjectSnapshot(target),
        children
      }
    })

    expect(composition, 'активный составной объект должен содержать дочерние объекты с id').not.toBeNull()
    expect(composition?.children.length, 'составной объект должен содержать минимум два дочерних объекта')
      .toBeGreaterThanOrEqual(2)
    if (!composition) {
      throw new Error('Не удалось получить состав текущего активного объекта')
    }

    return composition
  }

  /** Устанавливает угол текущего общего выделения через публичный TransformManager. */
  async setAngle({ angle }: { angle: number }): Promise<SnappingObjectSnapshot> {
    expect(Number.isFinite(angle), 'угол общего выделения должен быть конечным').toBe(true)

    const snapshot = await this.page.evaluate((targetAngle) => {
      const { editor, __editorHelpers: helpers } = window as any
      const target = editor.canvas.getActiveObject()
      const children = target?.getObjects?.()
      if (target?.type !== 'activeselection' || !Array.isArray(children) || children.length < 2) return null

      editor.transformManager.setAngle(target, targetAngle)

      return helpers.serializeSnappingObjectSnapshot(target)
    }, angle)

    expect(snapshot, 'должно существовать общее выделение для изменения угла').not.toBeNull()
    expect(snapshot?.angle, 'общее выделение должно получить запрошенный угол').toBeCloseTo(angle, 5)
    if (!snapshot) throw new Error('Не удалось изменить угол общего выделения')

    await waitForCanvasRender({ page: this.page })

    return snapshot
  }

  /** Возвращает смещение области выделения относительно активного объекта без принудительного setCoords(). */
  async getActiveObjectSelectionFrameAlignment(): Promise<SelectionFrameAlignmentInfo> {
    const alignment = await this.page.evaluate(() => {
      const { editor, __editorHelpers: helpers } = window as any
      const target = editor.canvas.getActiveObject()
      const visualTarget = helpers.resolveShapeNode(target) ?? target

      if (!target?.oCoords || typeof visualTarget?.getPointByOrigin !== 'function') return null

      const measuredTarget = visualTarget as SelectionVisualTarget
      const { viewportTransform } = editor.canvas
      const toScenePoint = (object: SelectionVisualTarget, originX: string, originY: string) => {
        const point = object.getPointByOrigin(originX, originY)

        if (
          object.group
          && typeof point.transform === 'function'
          && typeof object.group.calcTransformMatrix === 'function'
        ) {
          return point.transform(object.group.calcTransformMatrix())
        }

        return point
      }
      const toViewportPoint = (point: { x: number; y: number }) => ({
        x: viewportTransform[0] * point.x + viewportTransform[2] * point.y + viewportTransform[4],
        y: viewportTransform[1] * point.x + viewportTransform[3] * point.y + viewportTransform[5]
      })

      const topLeft = toViewportPoint(toScenePoint(measuredTarget, 'left', 'top'))
      const bottomRight = toViewportPoint(toScenePoint(measuredTarget, 'right', 'bottom'))
      const controlTopLeft = target.oCoords.tl
      const controlBottomRight = target.oCoords.br

      if (!controlTopLeft || !controlBottomRight) return null

      const topLeftDeltaX = controlTopLeft.x - topLeft.x
      const topLeftDeltaY = controlTopLeft.y - topLeft.y
      const bottomRightDeltaX = controlBottomRight.x - bottomRight.x
      const bottomRightDeltaY = controlBottomRight.y - bottomRight.y
      const topLeftDistance = Math.sqrt(topLeftDeltaX * topLeftDeltaX + topLeftDeltaY * topLeftDeltaY)
      const bottomRightDistance = Math.sqrt(
        bottomRightDeltaX * bottomRightDeltaX + bottomRightDeltaY * bottomRightDeltaY
      )

      return {
        bottomRightDeltaX,
        bottomRightDeltaY,
        maxDistance: Math.max(topLeftDistance, bottomRightDistance),
        topLeftDeltaX,
        topLeftDeltaY
      }
    })

    expect(alignment, 'область выделения активного объекта должна быть доступна').not.toBeNull()
    if (!alignment) throw new Error('Не удалось получить положение рамки выделения')

    return alignment
  }
}
