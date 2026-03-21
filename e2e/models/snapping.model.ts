/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  SnappingDragBoundsParams,
  SnappingDragCenterParams,
  ObjectTargetParams,
  SnappingDragMoveParams,
  SnappingDragStartParams,
  SnappingGuideState,
  SnappingObjectSnapshot
} from '../types'

type CanvasPagePoint = {
  x: number
  y: number
}

type DragTransformInfo = {
  offsetX: number
  offsetY: number
  pointerX: number
  pointerY: number
  snapshot: SnappingObjectSnapshot
}

export class SnappingModel {
  private readonly page: Page

  private activePointerPagePoint: CanvasPagePoint | null

  constructor(page: Page) {
    this.page = page
    this.activePointerPagePoint = null
  }

  /** Возвращает текущее состояние направляющих SnappingManager. */
  async getGuideState(): Promise<SnappingGuideState> {
    return this.page.evaluate(() => {
      const {
        __editorHelpers: helpers
      } = window as any

      return helpers.getSnappingGuideState()
    })
  }

  /** Возвращает snapshot объекта canvas с актуальным bounding box. */
  async getObjectSnapshot(params: ObjectTargetParams = {}): Promise<SnappingObjectSnapshot> {
    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return helpers.serializeSnappingObjectSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать snapshot объекта для snapping-проверки').not.toBeNull()

    return snapshot as SnappingObjectSnapshot
  }

  /** Начинает интерактивное перетаскивание объекта и кеширует anchor-ы для снапа. */
  async startObjectDrag(params: SnappingDragStartParams = {}): Promise<SnappingObjectSnapshot> {
    const dragStart = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      target.setCoords()

      const originX = typeof target.originX === 'string' ? target.originX : 'left'
      const originY = typeof target.originY === 'string' ? target.originY : 'top'
      const originPoint = typeof target.getPointByOrigin === 'function'
        ? target.getPointByOrigin(originX, originY)
        : {
          x: typeof target.left === 'number' ? target.left : 0,
          y: typeof target.top === 'number' ? target.top : 0
        }
      const sceneX = typeof originPoint.x === 'number' ? originPoint.x : 0
      const sceneY = typeof originPoint.y === 'number' ? originPoint.y : 0
      const [a, b, c, d, tx, ty] = editor.canvas.viewportTransform
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      editor.canvas.requestRenderAll()

      return {
        x: rect.left + (sceneX * a) + (sceneY * c) + tx,
        y: rect.top + (sceneX * b) + (sceneY * d) + ty
      }
    }, params)

    expect(dragStart, 'должна существовать стартовая pointer-точка для перетаскивания').not.toBeNull()

    await this._waitForCanvasRender()

    const { x, y } = dragStart as CanvasPagePoint
    this.activePointerPagePoint = {
      x,
      y
    }
    await this._dispatchPointerDown({
      point: this.activePointerPagePoint
    })
    await this._waitForCanvasRender()

    const transformReady = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return false

      const transform = editor.canvas._currentTransform
      if (!transform) return false

      return transform.target === target
    }, params)

    expect(transformReady, 'после начала drag должен появиться transform для нужного объекта').toBe(true)

    return this.getObjectSnapshot(params)
  }

  /** Перемещает объект в live drag-сессии и возвращает его новый snapshot. */
  async dragObjectTo(params: SnappingDragMoveParams): Promise<SnappingObjectSnapshot> {
    const dragInfo = await this._getDragTransformInfo(params)
    const targetSceneX = params.left === dragInfo.snapshot.left
      ? dragInfo.pointerX
      : params.left + dragInfo.offsetX
    const targetSceneY = params.top === dragInfo.snapshot.top
      ? dragInfo.pointerY
      : params.top + dragInfo.offsetY
    const pagePoint = await this._resolvePagePointForScenePoint({
      x: targetSceneX,
      y: targetSceneY
    })

    await this._movePointerDuringDrag({
      point: pagePoint,
      ctrlKey: params.ctrlKey
    })

    return this.getObjectSnapshot(params)
  }

  /** Перемещает объект в live drag-сессии так, чтобы его bounding box пришёл в нужную позицию. */
  async dragObjectBoundsTo(params: SnappingDragBoundsParams): Promise<SnappingObjectSnapshot> {
    const dragInfo = await this._getDragTransformInfo(params)
    const nextLeft = dragInfo.snapshot.left + (params.left - dragInfo.snapshot.boundsLeft)
    const nextTop = dragInfo.snapshot.top + (params.top - dragInfo.snapshot.boundsTop)
    const targetSceneX = params.left === dragInfo.snapshot.boundsLeft
      ? dragInfo.pointerX
      : nextLeft + dragInfo.offsetX
    const targetSceneY = params.top === dragInfo.snapshot.boundsTop
      ? dragInfo.pointerY
      : nextTop + dragInfo.offsetY
    const pagePoint = await this._resolvePagePointForScenePoint({
      x: targetSceneX,
      y: targetSceneY
    })

    await this._movePointerDuringDrag({
      point: pagePoint,
      ctrlKey: params.ctrlKey
    })

    return this.getObjectSnapshot(params)
  }

  /** Перемещает объект в live drag-сессии так, чтобы центр его bounding box пришёл в нужную позицию. */
  async dragObjectCenterTo(params: SnappingDragCenterParams): Promise<SnappingObjectSnapshot> {
    const dragInfo = await this._getDragTransformInfo(params)
    const nextLeft = dragInfo.snapshot.left + (params.centerX - dragInfo.snapshot.centerX)
    const nextTop = dragInfo.snapshot.top + (params.centerY - dragInfo.snapshot.centerY)
    const targetSceneX = params.centerX === dragInfo.snapshot.centerX
      ? dragInfo.pointerX
      : nextLeft + dragInfo.offsetX
    const targetSceneY = params.centerY === dragInfo.snapshot.centerY
      ? dragInfo.pointerY
      : nextTop + dragInfo.offsetY
    const pagePoint = await this._resolvePagePointForScenePoint({
      x: targetSceneX,
      y: targetSceneY
    })

    await this._movePointerDuringDrag({
      point: pagePoint,
      ctrlKey: params.ctrlKey
    })

    return this.getObjectSnapshot(params)
  }

  /** Завершает pointer-взаимодействие и очищает направляющие как после mouseup. */
  async finishPointerInteraction(): Promise<SnappingGuideState> {
    expect(
      this.activePointerPagePoint,
      'pointer interaction должна завершаться только после начала drag'
    ).not.toBeNull()

    await this._dispatchPointerUp({
      point: this.activePointerPagePoint as CanvasPagePoint
    })
    await this._waitForCanvasRender()
    this.activePointerPagePoint = null

    return this.getGuideState()
  }

  private async _waitForCanvasRender(): Promise<void> {
    await this.page.evaluate(async() => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })
    })
  }

  private async _getDragTransformInfo(params: ObjectTargetParams): Promise<DragTransformInfo> {
    const dragInfo = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      const transform = editor.canvas._currentTransform
      if (!transform || transform.target !== target) return null

      return {
        offsetX: typeof transform.offsetX === 'number' ? transform.offsetX : 0,
        offsetY: typeof transform.offsetY === 'number' ? transform.offsetY : 0,
        pointerX: typeof transform.lastX === 'number' ? transform.lastX : 0,
        pointerY: typeof transform.lastY === 'number' ? transform.lastY : 0,
        snapshot: helpers.serializeSnappingObjectSnapshot(target)
      }
    }, params)

    expect(dragInfo, 'во время drag должен существовать transform для выбранного объекта').not.toBeNull()

    return dragInfo as DragTransformInfo
  }

  private async _resolvePagePointForScenePoint(point: { x: number, y: number }): Promise<CanvasPagePoint> {
    return this.page.evaluate(({ x, y }) => {
      const {
        editor
      } = window as any

      const [a, b, c, d, tx, ty] = editor.canvas.viewportTransform
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: rect.left + (x * a) + (y * c) + tx,
        y: rect.top + (x * b) + (y * d) + ty
      }
    }, point)
  }

  private async _movePointerDuringDrag({
    point,
    ctrlKey = false
  }: {
    point: CanvasPagePoint
    ctrlKey?: boolean
  }): Promise<void> {
    await this._dispatchPointerMove({
      point,
      ctrlKey
    })
    await this._waitForCanvasRender()
    this.activePointerPagePoint = point
  }

  private async _dispatchPointerDown({
    point
  }: {
    point: CanvasPagePoint
  }): Promise<void> {
    await this.page.evaluate(({ x, y }) => {
      const {
        editor
      } = window as any

      const event = new PointerEvent('pointerdown', {
        clientX: x,
        clientY: y,
        button: 0,
        buttons: 1,
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        isPrimary: true
      })

      editor.canvas._onMouseDown(event)
    }, point)
  }

  private async _dispatchPointerMove({
    point,
    ctrlKey
  }: {
    point: CanvasPagePoint
    ctrlKey: boolean
  }): Promise<void> {
    await this.page.evaluate(({ x, y, ctrlKey: isCtrlPressed }) => {
      const {
        editor
      } = window as any

      const event = new PointerEvent('pointermove', {
        clientX: x,
        clientY: y,
        button: 0,
        buttons: 1,
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        isPrimary: true,
        ctrlKey: isCtrlPressed
      })

      editor.canvas._onMouseMove(event)
    }, {
      x: point.x,
      y: point.y,
      ctrlKey
    })
  }

  private async _dispatchPointerUp({
    point
  }: {
    point: CanvasPagePoint
  }): Promise<void> {
    await this.page.evaluate(({ x, y }) => {
      const {
        editor
      } = window as any

      const event = new PointerEvent('pointerup', {
        clientX: x,
        clientY: y,
        button: 0,
        buttons: 0,
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        isPrimary: true
      })

      editor.canvas._onMouseUp(event)
    }, point)
  }
}
