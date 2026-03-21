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

export class SnappingModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
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
    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      editor.canvas.fire('mouse:down', {
        target
      })

      return helpers.serializeSnappingObjectSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать snapshot объекта после начала перетаскивания').not.toBeNull()

    return snapshot as SnappingObjectSnapshot
  }

  /** Перемещает объект в live drag-сессии и возвращает его новый snapshot. */
  async dragObjectTo(params: SnappingDragMoveParams): Promise<SnappingObjectSnapshot> {
    const snapshot = await this.page.evaluate(({ left, top, ctrlKey = false, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      target.set({
        left,
        top
      })
      target.setCoords()

      editor.canvas.fire('object:moving', {
        target,
        e: {
          ctrlKey
        }
      })

      return helpers.serializeSnappingObjectSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать snapshot объекта после live-перетаскивания').not.toBeNull()

    return snapshot as SnappingObjectSnapshot
  }

  /** Перемещает объект в live drag-сессии так, чтобы его bounding box пришёл в нужную позицию. */
  async dragObjectBoundsTo(params: SnappingDragBoundsParams): Promise<SnappingObjectSnapshot> {
    const snapshot = await this.page.evaluate(({ left, top, ctrlKey = false, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      const currentSnapshot = helpers.serializeSnappingObjectSnapshot(target)
      const nextLeft = currentSnapshot.left + (left - currentSnapshot.boundsLeft)
      const nextTop = currentSnapshot.top + (top - currentSnapshot.boundsTop)

      editor.canvas.setActiveObject(target)
      target.set({
        left: nextLeft,
        top: nextTop
      })
      target.setCoords()

      editor.canvas.fire('object:moving', {
        target,
        e: {
          ctrlKey
        }
      })

      return helpers.serializeSnappingObjectSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать snapshot объекта после перетаскивания по bounds').not.toBeNull()

    return snapshot as SnappingObjectSnapshot
  }

  /** Перемещает объект в live drag-сессии так, чтобы центр его bounding box пришёл в нужную позицию. */
  async dragObjectCenterTo(params: SnappingDragCenterParams): Promise<SnappingObjectSnapshot> {
    const snapshot = await this.page.evaluate(({ centerX, centerY, ctrlKey = false, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      const currentSnapshot = helpers.serializeSnappingObjectSnapshot(target)
      const nextLeft = currentSnapshot.left + (centerX - currentSnapshot.centerX)
      const nextTop = currentSnapshot.top + (centerY - currentSnapshot.centerY)

      editor.canvas.setActiveObject(target)
      target.set({
        left: nextLeft,
        top: nextTop
      })
      target.setCoords()

      editor.canvas.fire('object:moving', {
        target,
        e: {
          ctrlKey
        }
      })

      return helpers.serializeSnappingObjectSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать snapshot объекта после перетаскивания по центру').not.toBeNull()

    return snapshot as SnappingObjectSnapshot
  }

  /** Завершает pointer-взаимодействие и очищает направляющие как после mouseup. */
  async finishPointerInteraction(): Promise<SnappingGuideState> {
    return this.page.evaluate(() => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      editor.canvas.fire('mouse:up')

      return helpers.getSnappingGuideState()
    })
  }
}
