/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type { SnappingObjectSnapshot } from '../types'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'

type SelectionControlKey = 'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'mt' | 'mb'

type SelectionScaleInteraction = {
  point: {
    x: number
    y: number
  }
  control: SelectionControlKey
  shiftKey: boolean
}

type DragActiveScaleHandleParams = {
  deltaX: number
  deltaY: number
}

type ScaleSelectionFromControlParams = {
  startControl: SelectionControlKey
  oppositeControl: SelectionControlKey
  scaleX?: number
  scaleY?: number
  minimumWidth?: number
  minimumHeight?: number
  shiftKey?: boolean
}

type SelectionMinimumSizeParams = {
  minimumSize: number
  shiftKey?: boolean
}

export class SelectionModel {
  private readonly page: Page

  private activeScaleInteraction: SelectionScaleInteraction | null

  constructor(page: Page) {
    this.page = page
    this.activeScaleInteraction = null
  }

  /** Возвращает состояние текущего общего выделения. */
  async getSnapshot(): Promise<SnappingObjectSnapshot> {
    const snapshot = await this.page.evaluate(() => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = editor.canvas.getActiveObject()
      if (!target) return null

      return helpers.serializeSnappingObjectSnapshot(target)
    })

    expect(snapshot, 'должно существовать текущее общее выделение').not.toBeNull()

    return snapshot as SnappingObjectSnapshot
  }

  /** Масштабирует текущее общее выделение справа и возвращает live-состояние. */
  async scaleHorizontallyFromRight(
    params: {
      scaleX: number
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mr',
      oppositeControl: 'ml',
      scaleX: params.scaleX
    })
  }

  /** Масштабирует текущее общее выделение снизу и возвращает live-состояние. */
  async scaleVerticallyFromBottom(
    params: {
      scaleY: number
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mb',
      oppositeControl: 'mt',
      scaleY: params.scaleY
    })
  }

  /** Масштабирует текущее общее выделение сверху и возвращает live-состояние. */
  async scaleVerticallyFromTop(
    params: {
      scaleY: number
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mt',
      oppositeControl: 'mb',
      scaleY: params.scaleY
    })
  }

  /** Масштабирует текущее общее выделение из правого нижнего угла и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async scaleDiagonallyFromBottomRight(
    params: {
      scaleX: number
      scaleY: number
      shiftKey?: boolean
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'br',
      oppositeControl: 'tl',
      scaleX: params.scaleX,
      scaleY: params.scaleY,
      shiftKey: params.shiftKey
    })
  }

  /** Масштабирует текущее общее выделение из правого верхнего угла и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async scaleDiagonallyFromTopRight(
    params: {
      scaleX: number
      scaleY: number
      shiftKey?: boolean
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'tr',
      oppositeControl: 'bl',
      scaleX: params.scaleX,
      scaleY: params.scaleY,
      shiftKey: params.shiftKey
    })
  }

  /** Сжимает текущее общее выделение справа до минимальной ширины и возвращает live-состояние. */
  async shrinkHorizontallyFromRightToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mr',
      oppositeControl: 'ml',
      minimumWidth: params.minimumSize
    })
  }

  /** Сжимает текущее общее выделение снизу до минимальной высоты и возвращает live-состояние. */
  async shrinkVerticallyFromBottomToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mb',
      oppositeControl: 'mt',
      minimumHeight: params.minimumSize
    })
  }

  /** Сжимает текущее общее выделение сверху до минимальной высоты и возвращает live-состояние. */
  async shrinkVerticallyFromTopToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mt',
      oppositeControl: 'mb',
      minimumHeight: params.minimumSize
    })
  }

  /** Сжимает текущее общее выделение из правого нижнего угла до минимальных ширины и высоты и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async shrinkDiagonallyFromBottomRightToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'br',
      oppositeControl: 'tl',
      minimumWidth: params.minimumSize,
      minimumHeight: params.minimumSize,
      shiftKey: params.shiftKey
    })
  }

  /** Сжимает текущее общее выделение из правого верхнего угла до минимальных ширины и высоты и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async shrinkDiagonallyFromTopRightToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'tr',
      oppositeControl: 'bl',
      minimumWidth: params.minimumSize,
      minimumHeight: params.minimumSize,
      shiftKey: params.shiftKey
    })
  }

  /** Завершает активное масштабирование общего выделения через настоящий mouseup. */
  async finishScale(): Promise<SnappingObjectSnapshot> {
    expect(
      this.activeScaleInteraction,
      'должна существовать активная drag-сессия масштабирования общего выделения'
    ).not.toBeNull()

    if (!this.activeScaleInteraction) {
      throw new Error('должна существовать активная drag-сессия масштабирования общего выделения')
    }

    const snapshot = await this.page.evaluate((payload) => {
      const {
        point: interactionPoint,
        control,
        shiftKey
      } = payload
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = editor.canvas.getActiveObject()
      if (!target) return null

      target.setCoords()

      const currentControl = target.oCoords?.[control]
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      let releasePoint = interactionPoint

      if (
        currentControl
        && typeof currentControl.x === 'number'
        && typeof currentControl.y === 'number'
      ) {
        releasePoint = {
          x: rect.left + currentControl.x,
          y: rect.top + currentControl.y
        }
      }

      editor.canvas.__onMouseUp(new MouseEvent('mouseup', {
        bubbles: true,
        button: 0,
        buttons: 0,
        clientX: releasePoint.x,
        clientY: releasePoint.y,
        shiftKey
      }))

      const snapshotTarget = editor.canvas.getActiveObject() ?? target
      snapshotTarget.setCoords()

      return helpers.serializeSnappingObjectSnapshot(snapshotTarget)
    }, this.activeScaleInteraction)

    this.activeScaleInteraction = null

    expect(snapshot, 'должно существовать состояние общего выделения после mouseup').not.toBeNull()

    await waitForCanvasRender({ page: this.page })

    return snapshot as SnappingObjectSnapshot
  }

  /** Продолжает текущий drag хэндла общего выделения и возвращает live-состояние. */
  async dragActiveScaleHandleBy(
    params: DragActiveScaleHandleParams
  ): Promise<SnappingObjectSnapshot> {
    expect(
      this.activeScaleInteraction,
      'должна существовать активная drag-сессия масштабирования общего выделения'
    ).not.toBeNull()

    if (!this.activeScaleInteraction) {
      throw new Error('должна существовать активная drag-сессия масштабирования общего выделения')
    }

    const result = await this.page.evaluate((payload) => {
      const {
        point,
        control,
        deltaX,
        deltaY,
        shiftKey
      } = payload
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = editor.canvas.getActiveObject()
      if (!target) return null

      const movePoint = {
        x: point.x + deltaX,
        y: point.y + deltaY
      }

      editor.canvas.__onMouseMove(new MouseEvent('mousemove', {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: movePoint.x,
        clientY: movePoint.y,
        shiftKey
      }))

      const snapshotTarget = editor.canvas.getActiveObject() ?? target
      snapshotTarget.setCoords()

      const currentControl = snapshotTarget.oCoords?.[control]
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const currentPoint = currentControl
        && typeof currentControl.x === 'number'
        && typeof currentControl.y === 'number'
        ? {
          x: rect.left + currentControl.x,
          y: rect.top + currentControl.y
        }
        : movePoint

      return {
        point: currentPoint,
        snapshot: helpers.serializeSnappingObjectSnapshot(snapshotTarget)
      }
    }, {
      ...this.activeScaleInteraction,
      ...params
    })

    expect(result, 'должно существовать live-состояние общего выделения после продолжения drag').not.toBeNull()

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
      ...this.activeScaleInteraction,
      point
    }

    return snapshot
  }

  private async _scaleFromControl(
    params: ScaleSelectionFromControlParams
  ): Promise<SnappingObjectSnapshot> {
    expect(
      this.activeScaleInteraction,
      'нельзя начинать новое масштабирование общего выделения, пока предыдущий drag не завершён'
    ).toBeNull()

    const result = await this.page.evaluate(({
      startControl: startControlName,
      oppositeControl: oppositeControlName,
      scaleX,
      scaleY,
      minimumWidth,
      minimumHeight,
      shiftKey = false
    }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = editor.canvas.getActiveObject()
      if (!target) return null

      target.setCoords()

      const startControl = target.oCoords?.[startControlName]
      const oppositeControl = target.oCoords?.[oppositeControlName]
      if (
        !startControl
        || !oppositeControl
        || typeof startControl.x !== 'number'
        || typeof startControl.y !== 'number'
        || typeof oppositeControl.x !== 'number'
        || typeof oppositeControl.y !== 'number'
      ) {
        return null
      }

      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const startPoint = {
        x: rect.left + startControl.x,
        y: rect.top + startControl.y
      }

      editor.canvas.__onMouseDown(new MouseEvent('mousedown', {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: startPoint.x,
        clientY: startPoint.y,
        shiftKey
      }))

      const transform = editor.canvas._currentTransform
      if (!transform || transform.target !== target) return null

      const controlWidth = startControl.x - oppositeControl.x
      const controlHeight = startControl.y - oppositeControl.y
      const widthSign = Math.sign(controlWidth) || 1
      const heightSign = Math.sign(controlHeight) || 1
      const targetWidth = typeof minimumWidth === 'number'
        ? minimumWidth
        : Math.abs(controlWidth) * (scaleX ?? 1)
      const targetHeight = typeof minimumHeight === 'number'
        ? minimumHeight
        : Math.abs(controlHeight) * (scaleY ?? 1)
      const movePoint = {
        x: rect.left + oppositeControl.x + (widthSign * targetWidth),
        y: rect.top + oppositeControl.y + (heightSign * targetHeight)
      }

      editor.canvas.__onMouseMove(new MouseEvent('mousemove', {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: movePoint.x,
        clientY: movePoint.y,
        shiftKey
      }))

      target.setCoords()
      const currentControl = target.oCoords?.[startControlName]
      let currentPoint = movePoint

      if (
        currentControl
        && typeof currentControl.x === 'number'
        && typeof currentControl.y === 'number'
      ) {
        currentPoint = {
          x: rect.left + currentControl.x,
          y: rect.top + currentControl.y
        }
      }

      return {
        point: currentPoint,
        shiftKey,
        snapshot: helpers.serializeSnappingObjectSnapshot(target)
      }
    }, params)

    expect(result, 'должно существовать live-состояние общего выделения после масштабирования').not.toBeNull()

    await waitForCanvasRender({ page: this.page })

    const {
      point,
      shiftKey,
      snapshot
    } = result as {
      point: {
        x: number
        y: number
      }
      shiftKey: boolean
      snapshot: SnappingObjectSnapshot
    }

    this.activeScaleInteraction = {
      point,
      control: params.startControl,
      shiftKey
    }

    return snapshot
  }
}
