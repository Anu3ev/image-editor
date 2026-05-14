/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type { SnappingObjectSnapshot } from '../types'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'

type SelectionControlKey = 'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'mt' | 'mb'

type SelectionDiagonalControlKey = Extract<SelectionControlKey, 'tl' | 'tr' | 'bl' | 'br'>

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

  /** Масштабирует текущее общее выделение слева и возвращает live-состояние. */
  async scaleHorizontallyFromLeft(
    params: {
      scaleX: number
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'ml',
      oppositeControl: 'mr',
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

  /** Масштабирует текущее общее выделение из левого верхнего угла и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async scaleDiagonallyFromTopLeft(
    params: {
      scaleX: number
      scaleY: number
      shiftKey?: boolean
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'tl',
      oppositeControl: 'br',
      scaleX: params.scaleX,
      scaleY: params.scaleY,
      shiftKey: params.shiftKey
    })
  }

  /** Масштабирует текущее общее выделение из левого нижнего угла и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async scaleDiagonallyFromBottomLeft(
    params: {
      scaleX: number
      scaleY: number
      shiftKey?: boolean
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'bl',
      oppositeControl: 'tr',
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
    return this._shrinkDiagonallyToMinimum({
      corner: 'br',
      minimumSize: params.minimumSize,
      shiftKey: params.shiftKey
    })
  }

  /** Сжимает текущее общее выделение из правого верхнего угла до минимальных ширины и высоты и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async shrinkDiagonallyFromTopRightToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._shrinkDiagonallyToMinimum({
      corner: 'tr',
      minimumSize: params.minimumSize,
      shiftKey: params.shiftKey
    })
  }

  /** Сжимает текущее общее выделение из левого верхнего угла до минимальных ширины и высоты и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async shrinkDiagonallyFromTopLeftToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._shrinkDiagonallyToMinimum({
      corner: 'tl',
      minimumSize: params.minimumSize,
      shiftKey: params.shiftKey
    })
  }

  /** Сжимает текущее общее выделение из левого нижнего угла до минимальных ширины и высоты и возвращает live-состояние. Поддерживает непропорциональный drag через Shift. */
  async shrinkDiagonallyFromBottomLeftToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._shrinkDiagonallyToMinimum({
      corner: 'bl',
      minimumSize: params.minimumSize,
      shiftKey: params.shiftKey
    })
  }

  /** Сжимает текущее общее выделение по диагонали до минимальных ширины и высоты из выбранного угла. */
  async shrinkDiagonallyToMinimum({
    corner,
    minimumSize,
    shiftKey
  }: {
    corner: SelectionDiagonalControlKey
    minimumSize: number
    shiftKey?: boolean
  }): Promise<SnappingObjectSnapshot> {
    return this._shrinkDiagonallyToMinimum({
      corner,
      minimumSize,
      shiftKey
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
    const {
      activeScaleInteraction
    } = this
    const requestedShiftKey = Boolean(params.shiftKey)

    this._assertScaleInteractionCanContinue({
      activeScaleInteraction,
      startControl: params.startControl,
      requestedShiftKey
    })

    const result = await this.page.evaluate((payload) => {
      const {
        __editorHelpers: helpers
      } = window as any

      return helpers.scaleSelectionFromControl(payload)
    }, {
      ...params,
      continueInteraction: activeScaleInteraction !== null,
      shiftKey: requestedShiftKey
    })

    expect(result, 'должно существовать live-состояние общего выделения после масштабирования').not.toBeNull()

    await waitForCanvasRender({ page: this.page })

    const {
      point,
      shiftKey: interactionShiftKey,
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
      shiftKey: interactionShiftKey
    }

    return snapshot
  }

  private async _shrinkDiagonallyToMinimum(params: {
    corner: Extract<SelectionControlKey, 'tl' | 'tr' | 'bl' | 'br'>
    minimumSize: number
    shiftKey?: boolean
  }): Promise<SnappingObjectSnapshot> {
    const {
      corner,
      minimumSize,
      shiftKey
    } = params

    return this._scaleFromControl({
      startControl: corner,
      oppositeControl: this._resolveOppositeDiagonalControl(corner),
      minimumWidth: minimumSize,
      minimumHeight: minimumSize,
      shiftKey
    })
  }

  private _resolveOppositeDiagonalControl(
    corner: Extract<SelectionControlKey, 'tl' | 'tr' | 'bl' | 'br'>
  ): Extract<SelectionControlKey, 'tl' | 'tr' | 'bl' | 'br'> {
    if (corner === 'br') return 'tl'
    if (corner === 'tr') return 'bl'
    if (corner === 'tl') return 'br'

    return 'tr'
  }

  private _assertScaleInteractionCanContinue(params: {
    activeScaleInteraction: SelectionScaleInteraction | null
    startControl: SelectionControlKey
    requestedShiftKey: boolean
  }): void {
    const {
      activeScaleInteraction,
      startControl,
      requestedShiftKey
    } = params

    if (!activeScaleInteraction) return

    expect(
      activeScaleInteraction.control,
      'нельзя продолжать активную drag-сессию общего выделения через другую ручку'
    ).toBe(startControl)
    expect(
      activeScaleInteraction.shiftKey,
      'нельзя продолжать активную drag-сессию общего выделения с другим состоянием Shift'
    ).toBe(requestedShiftKey)
  }
}
