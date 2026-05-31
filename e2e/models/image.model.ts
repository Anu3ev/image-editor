/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  EditorObjectInfo,
  ObjectTargetParams,
  SnappingObjectSnapshot
} from '../types'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'

export class ImageModel {
  private readonly page: Page

  private activeScaleInteraction: {
    point: {
      x: number
      y: number
    }
    corner: 'mr'
    objectIndex?: number
    id?: string
  } | null

  constructor(page: Page) {
    this.page = page
    this.activeScaleInteraction = null
  }

  /** Добавляет растровое изображение заданного размера через публичный API ImageManager. */
  async addFilledImage(
    params: {
      width: number
      height: number
      fill?: string
      scale?: 'image-contain' | 'image-cover' | 'scale-montage'
      withoutSelection?: boolean
    }
  ): Promise<EditorObjectInfo | null> {
    return this.page.evaluate(async({
      width,
      height,
      fill = '#f28f3b',
      scale = 'image-contain',
      withoutSelection = false
    }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context) return null

      context.fillStyle = fill
      context.fillRect(0, 0, width, height)

      const source = canvas.toDataURL('image/png')
      const result = await editor.imageManager.importImage({
        source,
        scale,
        withoutSelection
      })
      if (!result?.image) return null

      return helpers.serializeEditorObject(result.image)
    }, params)
  }

  /** Возвращает текущее состояние изображения по id или индексу canvas. */
  async getObject(params: ObjectTargetParams = {}): Promise<EditorObjectInfo | null> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return helpers.serializeEditorObject(target)
    }, params)
  }

  /** Возвращает snapshot изображения с актуальным bounding box. */
  async getSnapshot(params: ObjectTargetParams = {}): Promise<SnappingObjectSnapshot> {
    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return helpers.serializeSnappingObjectSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать snapshot изображения').not.toBeNull()

    return snapshot as SnappingObjectSnapshot
  }

  /** Масштабирует изображение вправо через реальную drag-сессию с фиксированной левой верхней точкой. */
  async scaleHorizontallyFromRight(
    params: { scaleX: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<SnappingObjectSnapshot> {
    const {
      scaleX,
      ctrlKey,
      objectIndex,
      id
    } = params

    return this._performInteractiveScaleStep({
      scaleX,
      scaleY: 1,
      corner: 'mr',
      ctrlKey,
      objectIndex,
      id
    })
  }

  /** Завершает интерактивный scale изображения через реальный mouseup. */
  async finishScale(params: ObjectTargetParams = {}): Promise<SnappingObjectSnapshot> {
    if (this.activeScaleInteraction && this._matchesActiveScaleTarget(params)) {
      const {
        point,
        corner,
        objectIndex,
        id
      } = this.activeScaleInteraction
      const snapshot = await this.page.evaluate((payload) => {
        const {
          point: interactionPoint,
          corner: controlCorner,
          objectIndex: targetObjectIndex,
          id: targetId
        } = payload
        const {
          editor,
          __editorHelpers: helpers
        } = window as any

        const target = helpers.resolveCanvasObject(targetObjectIndex, targetId)
        if (!target) return null

        target.setCoords()

        const currentControl = target.oCoords?.[controlCorner]
        const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
        const releasePoint = currentControl
          && typeof currentControl.x === 'number'
          && typeof currentControl.y === 'number'
          ? {
            x: rect.left + currentControl.x,
            y: rect.top + currentControl.y
          }
          : interactionPoint

        editor.canvas.__onMouseUp(new MouseEvent('mouseup', {
          bubbles: true,
          button: 0,
          buttons: 0,
          clientX: releasePoint.x,
          clientY: releasePoint.y
        }))

        return helpers.serializeSnappingObjectSnapshot(target)
      }, {
        point,
        corner,
        objectIndex,
        id
      })

      await waitForCanvasRender({ page: this.page })
      this.activeScaleInteraction = null

      expect(snapshot, 'должно существовать состояние после завершения scale изображения').not.toBeNull()

      return snapshot as SnappingObjectSnapshot
    }

    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      editor.canvas.fire('object:modified', {
        target
      })

      return helpers.serializeSnappingObjectSnapshot(target)
    }, params)

    expect(snapshot, 'должно существовать состояние после завершения scale изображения').not.toBeNull()

    return snapshot as SnappingObjectSnapshot
  }

  /** Проверяет что изображение было добавлено и возвращает объект с обязательным id. */
  checkCreation(params: { imageObject: EditorObjectInfo | null }): EditorObjectInfo & { id: string } {
    const { imageObject } = params

    expect(imageObject, 'изображение должно быть добавлено').not.toBeNull()
    expect(imageObject?.type, 'объект должен быть изображением').toBe('image')
    expect(imageObject?.id, 'у импортированного изображения должен быть id').toBeDefined()

    return imageObject as EditorObjectInfo & { id: string }
  }

  private async _performInteractiveScaleStep(
    params: {
      scaleX: number
      scaleY: number
      corner: 'mr'
      ctrlKey?: boolean
    } & ObjectTargetParams
  ): Promise<SnappingObjectSnapshot> {
    await this._startScaleInteractionIfNeeded(params)

    const result = await this.page.evaluate((payload) => {
      const {
        scaleX,
        scaleY,
        corner,
        ctrlKey = false,
        objectIndex,
        id
      } = payload
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      const transform = editor.canvas._currentTransform
      if (!transform || transform.target !== target) return null

      const activeCorner = typeof transform.corner === 'string' && transform.corner
        ? transform.corner
        : corner
      const activeOriginX = typeof transform.originX === 'string'
        ? transform.originX
        : 'left'
      const activeOriginY = typeof transform.originY === 'string'
        ? transform.originY
        : 'top'
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const settleStep = 0.75
      const anchorPoint = target.getPointByOrigin(activeOriginX, activeOriginY)
      const previousLeft = typeof target.left === 'number' ? target.left : 0
      const previousTop = typeof target.top === 'number' ? target.top : 0
      const previousScaleX = typeof target.scaleX === 'number' ? target.scaleX : 1
      const previousScaleY = typeof target.scaleY === 'number' ? target.scaleY : 1

      target.set({
        scaleX,
        scaleY
      })
      target.setPositionByOrigin(anchorPoint, activeOriginX, activeOriginY)
      target.setCoords()

      const control = target.oCoords?.[activeCorner]
      if (!control || typeof control.x !== 'number' || typeof control.y !== 'number') {
        target.set({
          left: previousLeft,
          top: previousTop,
          scaleX: previousScaleX,
          scaleY: previousScaleY
        })
        target.setCoords()

        return null
      }

      const controlPoint = {
        x: rect.left + control.x,
        y: rect.top + control.y
      }

      target.set({
        left: previousLeft,
        top: previousTop,
        scaleX: previousScaleX,
        scaleY: previousScaleY
      })
      target.setCoords()

      editor.canvas.__onMouseMove(new MouseEvent('mousemove', {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: controlPoint.x,
        clientY: controlPoint.y,
        ctrlKey
      }))

      if (!ctrlKey) {
        target.setCoords()

        const settledControl = target.oCoords?.[activeCorner]
        if (settledControl && typeof settledControl.x === 'number' && typeof settledControl.y === 'number') {
          const settlePoint = {
            x: rect.left + settledControl.x + settleStep,
            y: rect.top + settledControl.y
          }

          editor.canvas.__onMouseMove(new MouseEvent('mousemove', {
            bubbles: true,
            button: 0,
            buttons: 1,
            clientX: settlePoint.x,
            clientY: rect.top + settledControl.y,
            ctrlKey
          }))
        }
      }

      target.setCoords()
      const finalControl = target.oCoords?.[activeCorner]
      const finalPoint = finalControl && typeof finalControl.x === 'number' && typeof finalControl.y === 'number'
        ? {
          x: rect.left + finalControl.x,
          y: rect.top + finalControl.y
        }
        : controlPoint

      return {
        point: finalPoint,
        snapshot: helpers.serializeSnappingObjectSnapshot(target)
      }
    }, params)

    expect(result, 'должен существовать live snapshot после интерактивного scale изображения').not.toBeNull()

    await waitForCanvasRender({ page: this.page })

    const {
      point,
      snapshot
    } = result as {
      point: {
        x: number
        y: number
      }
      snapshot: SnappingObjectSnapshot
    }

    this.activeScaleInteraction = {
      point,
      corner: params.corner,
      objectIndex: params.objectIndex,
      id: params.id
    }

    return snapshot
  }

  private async _startScaleInteractionIfNeeded(
    params: {
      corner: 'mr'
      ctrlKey?: boolean
    } & ObjectTargetParams
  ): Promise<void> {
    const {
      corner,
      ctrlKey = false,
      objectIndex,
      id
    } = params

    if (this.activeScaleInteraction) {
      expect(
        this._matchesActiveScaleTarget({
          objectIndex,
          id
        }),
        'нельзя продолжать активную drag-сессию scale для другого изображения'
      ).toBe(true)
      expect(
        this.activeScaleInteraction.corner,
        'нельзя продолжать активную drag-сессию scale через другую ручку'
      ).toBe(corner)

      return
    }

    const point = await this.page.evaluate((payload) => {
      const {
        corner: controlCorner,
        ctrlKey: isCtrlKeyPressed,
        objectIndex: targetObjectIndex,
        id: targetId
      } = payload
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(targetObjectIndex, targetId)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      target.setCoords()
      editor.canvas.renderAll()

      const control = target.oCoords?.[controlCorner]
      if (!control || typeof control.x !== 'number' || typeof control.y !== 'number') {
        return null
      }

      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const pointInfo = {
        x: rect.left + control.x,
        y: rect.top + control.y
      }

      editor.canvas.__onMouseDown(new MouseEvent('mousedown', {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: pointInfo.x,
        clientY: pointInfo.y,
        ctrlKey: isCtrlKeyPressed
      }))

      const transform = editor.canvas._currentTransform
      if (!transform || transform.target !== target) {
        return null
      }

      return pointInfo
    }, {
      corner,
      ctrlKey,
      objectIndex,
      id
    })

    expect(point, 'должна существовать стартовая точка для интерактивного scale изображения').not.toBeNull()

    await waitForCanvasRender({ page: this.page })

    this.activeScaleInteraction = {
      point: point as {
        x: number
        y: number
      },
      corner,
      objectIndex,
      id
    }
  }

  private _matchesActiveScaleTarget(params: ObjectTargetParams): boolean {
    if (!this.activeScaleInteraction) return false

    const {
      objectIndex,
      id
    } = params

    if (typeof id === 'string') {
      return this.activeScaleInteraction.id === id
    }

    if (typeof objectIndex === 'number') {
      return this.activeScaleInteraction.objectIndex === objectIndex
    }

    return true
  }
}
