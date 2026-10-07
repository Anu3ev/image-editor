/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  SnappingDragBoundsParams,
  SnappingDragBoundsWithHoldParams,
  SnappingDragCenterParams,
  SnappingDragHoldTrace,
  SnappingDragMoveParams,
  SnappingDragStartParams,
  SnappingGuideState,
  SnappingObservedDragStep,
  SnappingObjectSnapshot,
  SnappingTargetParams
} from '../types'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'

/** Pointer coordinates in the browser's client coordinate system. */
type CanvasClientPoint = {
  x: number
  y: number
}

/** Fabric transform data required for the next drag step. */
type DragTransformInfo = {
  offsetX: number
  offsetY: number
  snapshot: SnappingObjectSnapshot
}

/** Object ID and modifier for one pointer step. */
type DragPointerParams = SnappingTargetParams & {
  ctrlKey?: boolean
}

/** Manages user drag scenarios and reads snapping state. */
export class SnappingModel {
  private readonly page: Page

  private activePointerClientPoint: CanvasClientPoint | null

  private isControlKeyPressed: boolean

  /** Creates a snapping model for the specified Playwright page. */
  constructor(page: Page) {
    this.page = page
    this.activePointerClientPoint = null
    this.isControlKeyPressed = false
  }

  /** Returns the current SnappingManager guide state. */
  async getGuideState(): Promise<SnappingGuideState> {
    return this.page.evaluate(() => {
      const {
        __editorHelpers: helpers
      } = window as any

      return helpers.getSnappingGuideState()
    })
  }

  /** Returns a canvas-object snapshot with its current bounding box. */
  async getObjectSnapshot(params: SnappingTargetParams = {}): Promise<SnappingObjectSnapshot> {
    const snapshot = await this.page.evaluate(({ activeObject, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = activeObject
        ? editor.canvas.getActiveObject()
        : helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return helpers.serializeSnappingObjectSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать snapshot объекта для snapping-проверки').not.toBeNull()

    return snapshot as SnappingObjectSnapshot
  }

  /** Starts a real drag of the selected object from its center. */
  async startObjectDrag(params: SnappingDragStartParams = {}): Promise<SnappingObjectSnapshot> {
    const dragStart = await this._resolveObjectDragStartClientPoint(params)

    await waitForCanvasRender({ page: this.page })

    const { x, y } = dragStart
    this.activePointerClientPoint = {
      x,
      y
    }
    await this.page.mouse.move(x, y)
    await this.page.mouse.down()
    await waitForCanvasRender({ page: this.page })

    await this._assertObjectDragStarted(params)

    return this.getObjectSnapshot(params)
  }

  /** Returns client coordinates of the selected object's center. */
  private async _resolveObjectDragStartClientPoint(
    params: SnappingDragStartParams
  ): Promise<CanvasClientPoint> {
    const dragStart = await this.page.evaluate(({ activeObject, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = activeObject
        ? editor.canvas.getActiveObject()
        : helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      target.setCoords()

      const centerPoint = typeof target.getCenterPoint === 'function'
        ? target.getCenterPoint()
        : {
          x: typeof target.left === 'number' ? target.left : 0,
          y: typeof target.top === 'number' ? target.top : 0
        }
      const sceneX = typeof centerPoint.x === 'number' ? centerPoint.x : 0
      const sceneY = typeof centerPoint.y === 'number' ? centerPoint.y : 0
      const [a, b, c, d, tx, ty] = editor.canvas.viewportTransform
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      editor.canvas.requestRenderAll()

      return {
        x: rect.left + (sceneX * a) + (sceneY * c) + tx,
        y: rect.top + (sceneX * b) + (sceneY * d) + ty
      }
    }, params)

    expect(dragStart, 'должна существовать стартовая pointer-точка для перетаскивания').not.toBeNull()
    expect(Number.isFinite(dragStart?.x), 'стартовая X-координата drag должна быть конечной').toBe(true)
    expect(Number.isFinite(dragStart?.y), 'стартовая Y-координата drag должна быть конечной').toBe(true)

    return dragStart as CanvasClientPoint
  }

  /** Checks that pointerdown started moving the selected object specifically. */
  private async _assertObjectDragStarted(params: SnappingDragStartParams): Promise<void> {
    const dragTransform = await this.page.evaluate(({ activeObject, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = activeObject
        ? editor.canvas.getActiveObject()
        : helpers.resolveCanvasObject(objectIndex, id)
      const transform = editor.canvas._currentTransform
      if (!target || !transform || transform.target !== target) return null

      return {
        action: transform.action ?? null
      }
    }, params)

    expect(dragTransform, 'после начала drag должен появиться transform для нужного объекта').not.toBeNull()
    expect(dragTransform?.action, 'pointerdown должен начать перемещение, а не работу с control').toBe('drag')
  }

  /** Moves the object in a live drag session and returns its new snapshot. */
  async dragObjectTo(params: SnappingDragMoveParams): Promise<SnappingObjectSnapshot> {
    const dragInfo = await this._getDragTransformInfo(params)
    return this._moveDragPointerToFabricPosition({
      params,
      dragInfo,
      left: params.left,
      top: params.top
    })
  }

  /** Moves the object in a live drag session so its bounding box reaches the required position. */
  async dragObjectBoundsTo(params: SnappingDragBoundsParams): Promise<SnappingObjectSnapshot> {
    const dragInfo = await this._getDragTransformInfo(params)
    const nextLeft = dragInfo.snapshot.left + (params.left - dragInfo.snapshot.boundsLeft)
    const nextTop = dragInfo.snapshot.top + (params.top - dragInfo.snapshot.boundsTop)

    return this._moveDragPointerToFabricPosition({
      params,
      dragInfo,
      left: nextLeft,
      top: nextTop
    })
  }

  /** Performs a complete object drag to the required bounding-box position and ends it with mouseup. */
  async moveObjectBoundsTo(params: SnappingDragBoundsParams): Promise<SnappingObjectSnapshot> {
    await this.startObjectDrag(params)
    await this.dragObjectBoundsTo(params)
    await this.finishPointerInteraction()

    return this.getObjectSnapshot(params)
  }

  /** Performs a complete drag and saves states during the snap hold. */
  async dragObjectBoundsWithHold({
    heldPositions,
    ...params
  }: SnappingDragBoundsWithHoldParams): Promise<SnappingDragHoldTrace> {
    await this.startObjectDrag(params)
    const acquiredSnapshot = await this.dragObjectBoundsTo(params)
    const acquired = Object.freeze({
      snapshot: acquiredSnapshot,
      guides: await this.getGuideState()
    })
    const held: SnappingObservedDragStep[] = []

    for (const position of heldPositions) {
      const snapshot = await this.dragObjectBoundsTo({ ...params, ...position })
      held.push(Object.freeze({
        snapshot,
        guides: await this.getGuideState()
      }))
    }

    await this.finishPointerInteraction()

    return Object.freeze({
      acquired,
      held: Object.freeze(held),
      committed: await this.getObjectSnapshot(params)
    })
  }

  /** Moves the object in a live drag session so its bounding-box center reaches the required position. */
  async dragObjectCenterTo(params: SnappingDragCenterParams): Promise<SnappingObjectSnapshot> {
    const dragInfo = await this._getDragTransformInfo(params)
    const nextLeft = dragInfo.snapshot.left + (params.centerX - dragInfo.snapshot.centerX)
    const nextTop = dragInfo.snapshot.top + (params.centerY - dragInfo.snapshot.centerY)

    return this._moveDragPointerToFabricPosition({
      params,
      dragInfo,
      left: nextLeft,
      top: nextTop
    })
  }

  /** Moves the real pointer to the position corresponding to Fabric left/top. */
  private async _moveDragPointerToFabricPosition({
    params,
    dragInfo,
    left,
    top
  }: {
    params: DragPointerParams
    dragInfo: DragTransformInfo
    left: number
    top: number
  }): Promise<SnappingObjectSnapshot> {
    const clientPoint = await this._resolveClientPointForScenePoint({
      x: left + dragInfo.offsetX,
      y: top + dragInfo.offsetY
    })

    await this._movePointerDuringDrag({
      point: clientPoint,
      ctrlKey: params.ctrlKey
    })

    return this.getObjectSnapshot(params)
  }

  /** Ends the pointer interaction and clears guides as after mouseup. */
  async finishPointerInteraction(): Promise<SnappingGuideState> {
    expect(
      this.activePointerClientPoint,
      'pointer interaction должна завершаться только после начала drag'
    ).not.toBeNull()

    await this.page.mouse.up()
    await waitForCanvasRender({ page: this.page })
    await this._setControlKeyPressed({ pressed: false })
    this.activePointerClientPoint = null

    return this.getGuideState()
  }

  /** Interrupts the active drag with a pointer-cancel event and releases the mouse. */
  async cancelPointerInteraction(): Promise<SnappingGuideState> {
    if (!this.activePointerClientPoint) throw new Error('Перетаскивание не начато')
    try {
      const dispatched = await this.page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel')))
      expect(dispatched, 'событие отмены должно быть доставлено').toBe(true)
      await waitForCanvasRender({ page: this.page })
      const hasCurrentTransform = await this.page.evaluate(() => {
        const { editor } = window as any
        return editor.canvas._currentTransform !== null
      })
      expect(hasCurrentTransform, 'отмена указателя должна завершить преобразование').toBe(false)
      return await this.getGuideState()
    } finally {
      await this.finishPointerInteraction()
    }
  }

  /** Finishes a drag started by the model, or does nothing if no pointer is active. */
  async finishPointerInteractionIfActive(): Promise<void> {
    if (!this.activePointerClientPoint) return

    await this.finishPointerInteraction()
  }

  /** Returns the current Fabric transform and selected-object geometry. */
  private async _getDragTransformInfo(params: SnappingTargetParams): Promise<DragTransformInfo> {
    const dragInfo = await this.page.evaluate(({ activeObject, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = activeObject
        ? editor.canvas.getActiveObject()
        : helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      const transform = editor.canvas._currentTransform
      if (!transform || transform.target !== target) return null

      return {
        offsetX: typeof transform.offsetX === 'number' ? transform.offsetX : 0,
        offsetY: typeof transform.offsetY === 'number' ? transform.offsetY : 0,
        snapshot: helpers.serializeSnappingObjectSnapshot(target)
      }
    }, params)

    expect(dragInfo, 'во время drag должен существовать transform для выбранного объекта').not.toBeNull()

    return dragInfo as DragTransformInfo
  }

  /** Converts scene coordinates to browser client coordinates. */
  private async _resolveClientPointForScenePoint(
    point: { x: number, y: number }
  ): Promise<CanvasClientPoint> {
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

  /** Performs one real pointer movement with explicitly specified Ctrl state. */
  private async _movePointerDuringDrag({
    point,
    ctrlKey = false
  }: {
    point: CanvasClientPoint
    ctrlKey?: boolean
  }): Promise<void> {
    await this._setControlKeyPressed({ pressed: ctrlKey })
    await this.page.mouse.move(point.x, point.y)
    await waitForCanvasRender({ page: this.page })
    this.activePointerClientPoint = point
  }

  /** Synchronizes Ctrl with the next mouse event's modifier state. */
  private async _setControlKeyPressed({
    pressed
  }: {
    pressed: boolean
  }): Promise<void> {
    if (pressed === this.isControlKeyPressed) return

    if (pressed) {
      await this.page.keyboard.down('Control')
      this.isControlKeyPressed = true
      return
    }

    await this.page.keyboard.up('Control')
    this.isControlKeyPressed = false
  }
}
