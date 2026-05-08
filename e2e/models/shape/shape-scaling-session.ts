/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  ObjectTargetParams,
  ShapeScaleCorner,
  ShapeScaleMouseMoveStepParams,
  ShapeScaleSnapshot,
  ShapeScaleStepParams
} from '../../types'
import { waitForCanvasRender } from '../../helpers/canvas-render.helper'

type ActiveScaleInteraction = {
  point: {
    x: number
    y: number
  }
  mode: 'interactive' | 'synthetic-mouse-move'
  corner: ShapeScaleCorner
  objectIndex?: number
  id?: string
}

export type ShapeDiagonalScaleCorner = Extract<ShapeScaleCorner, 'tl' | 'tr' | 'bl' | 'br'>

type DiagonalScaleHandle = {
  pointerX: number
  pointerY: number
  originX: 'left' | 'right'
  originY: 'top' | 'bottom'
  signX: -1 | 1
  signY: -1 | 1
}

const SCALE_ORIGIN_BY_CORNER: Record<ShapeDiagonalScaleCorner, {
  originX: 'left' | 'right'
  originY: 'top' | 'bottom'
}> = {
  tl: {
    originX: 'right',
    originY: 'bottom'
  },
  tr: {
    originX: 'left',
    originY: 'bottom'
  },
  bl: {
    originX: 'right',
    originY: 'top'
  },
  br: {
    originX: 'left',
    originY: 'top'
  }
}

const DIAGONAL_MINIMUM_SCALE_HANDLE_BY_CORNER: Record<ShapeDiagonalScaleCorner, DiagonalScaleHandle> = {
  tl: {
    pointerX: 20,
    pointerY: 20,
    originX: 'right',
    originY: 'bottom',
    signX: -1,
    signY: -1
  },
  tr: {
    pointerX: -20,
    pointerY: 20,
    originX: 'left',
    originY: 'bottom',
    signX: 1,
    signY: -1
  },
  bl: {
    pointerX: 20,
    pointerY: -20,
    originX: 'right',
    originY: 'top',
    signX: -1,
    signY: 1
  },
  br: {
    pointerX: -20,
    pointerY: -20,
    originX: 'left',
    originY: 'top',
    signX: 1,
    signY: 1
  }
}

export class ShapeScalingSession {
  private readonly page: Page

  private activeScaleInteraction: ActiveScaleInteraction | null

  constructor(page: Page) {
    this.page = page
    this.activeScaleInteraction = null
  }

  /** Сжимает shape до minimum width в live drag-сессии и возвращает проверенный snapshot. */
  async shrinkToMinimumWidth(
    params: ({ edge?: 'left' | 'right' } & ObjectTargetParams) = {}
  ): Promise<ShapeScaleSnapshot> {
    const {
      edge = 'right',
      objectIndex,
      id
    } = params

    const scaleHandleByEdge = {
      right: {
        pointerX: -20,
        corner: 'mr' as const,
        originX: 'left' as const,
        signX: 1 as const
      },
      left: {
        pointerX: 20,
        corner: 'ml' as const,
        originX: 'right' as const,
        signX: -1 as const
      }
    }
    const scaleHandle = scaleHandleByEdge[edge]

    return this.simulateScaleMouseMoveStep({
      scaleX: 0.2,
      scaleY: 1,
      pointerX: scaleHandle.pointerX,
      pointerY: 0,
      corner: scaleHandle.corner,
      signX: scaleHandle.signX,
      originX: scaleHandle.originX,
      originY: 'center',
      objectIndex,
      id
    })
  }

  /** Масштабирует текущий target на canvas по горизонтали за правую ручку и возвращает live snapshot. */
  async scaleHorizontallyFromRight(
    params: { scaleX: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
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
      originX: 'left',
      originY: 'center',
      ctrlKey,
      objectIndex,
      id
    })
  }

  /** Масштабирует shape по горизонтали за левую ручку и возвращает live snapshot. */
  async scaleHorizontallyFromLeft(
    params: { scaleX: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    const {
      scaleX,
      ctrlKey,
      objectIndex,
      id
    } = params

    return this._performInteractiveScaleStep({
      scaleX,
      scaleY: 1,
      corner: 'ml',
      originX: 'right',
      originY: 'center',
      ctrlKey,
      objectIndex,
      id
    })
  }

  /** Масштабирует текущий target на canvas по вертикали за нижнюю ручку и возвращает live snapshot. */
  async scaleVerticallyFromBottom(
    params: { scaleY: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    const {
      scaleY,
      ctrlKey,
      objectIndex,
      id
    } = params

    return this._performInteractiveScaleStep({
      scaleX: 1,
      scaleY,
      corner: 'mb',
      originX: 'center',
      originY: 'top',
      ctrlKey,
      objectIndex,
      id
    })
  }

  /** Масштабирует shape по вертикали за верхнюю ручку и возвращает live snapshot. */
  async scaleVerticallyFromTop(
    params: { scaleY: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    const {
      scaleY,
      ctrlKey,
      objectIndex,
      id
    } = params

    return this._performInteractiveScaleStep({
      scaleX: 1,
      scaleY,
      corner: 'mt',
      originX: 'center',
      originY: 'bottom',
      ctrlKey,
      objectIndex,
      id
    })
  }

  /** Масштабирует shape по диагонали за угловую ручку и возвращает live snapshot. Поддерживает явную передачу Shift и отключение snap через Ctrl. */
  async scaleDiagonally(
    params: {
      scaleX: number
      scaleY: number
      corner: ShapeDiagonalScaleCorner
      shiftKey?: boolean
      ctrlKey?: boolean
    } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    const {
      scaleX,
      scaleY,
      corner,
      shiftKey,
      ctrlKey,
      objectIndex,
      id
    } = params
    const {
      originX,
      originY
    } = SCALE_ORIGIN_BY_CORNER[corner]

    return this._performInteractiveScaleStep({
      scaleX,
      scaleY,
      corner,
      originX,
      originY,
      shiftKey,
      ctrlKey,
      objectIndex,
      id
    })
  }

  /** Масштабирует shape по диагонали пропорционально за угловую ручку и возвращает live snapshot. */
  async scaleDiagonallyProportionally(
    params: {
      scale: number
      corner: ShapeDiagonalScaleCorner
    } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    const {
      scale,
      corner,
      objectIndex,
      id
    } = params

    return this.scaleDiagonally({
      scaleX: scale,
      scaleY: scale,
      corner,
      shiftKey: false,
      objectIndex,
      id
    })
  }

  /** Сжимает shape до minimum по диагонали и возвращает live snapshot текущего кадра. */
  async shrinkDiagonallyToMinimum(
    params: {
      corner: ShapeDiagonalScaleCorner
    } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    const {
      corner,
      objectIndex,
      id
    } = params
    const scaleHandle = DIAGONAL_MINIMUM_SCALE_HANDLE_BY_CORNER[corner]

    return this.simulateScaleMouseMoveStep({
      scaleX: 0.2,
      scaleY: 0.2,
      pointerX: scaleHandle.pointerX,
      pointerY: scaleHandle.pointerY,
      signX: scaleHandle.signX,
      signY: scaleHandle.signY,
      corner,
      originX: scaleHandle.originX,
      originY: scaleHandle.originY,
      objectIndex,
      id
    })
  }

  private async _performInteractiveScaleStep(params: ShapeScaleStepParams): Promise<ShapeScaleSnapshot> {
    await this._startScaleInteractionIfNeeded(params)

    const result = await this.page.evaluate((payload) => {
      const {
        scaleX,
        scaleY,
        corner = 'br',
        shiftKey = false,
        ctrlKey = false,
        objectIndex,
        id
      } = payload

      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObjectOrActive(objectIndex, id)
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
        shiftKey,
        ctrlKey
      }))

      if (!ctrlKey) {
        target.setCoords()

        const settledControl = target.oCoords?.[activeCorner]
        if (settledControl && typeof settledControl.x === 'number' && typeof settledControl.y === 'number') {
          let settleDeltaX = 0
          if (activeCorner.includes('l')) settleDeltaX = -settleStep
          if (activeCorner.includes('r')) settleDeltaX = settleStep

          let settleDeltaY = 0
          if (activeCorner.includes('t')) settleDeltaY = -settleStep
          if (activeCorner.includes('b')) settleDeltaY = settleStep

          const settlePoint = {
            x: rect.left + settledControl.x + settleDeltaX,
            y: rect.top + settledControl.y + settleDeltaY
          }

          editor.canvas.__onMouseMove(new MouseEvent('mousemove', {
            bubbles: true,
            button: 0,
            buttons: 1,
            clientX: settlePoint.x,
            clientY: settlePoint.y,
            shiftKey,
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
        snapshot: helpers.serializeShapeScaleSnapshot(target)
      }
    }, params)

    expect(result, 'должен существовать live snapshot после интерактивного масштабирования').not.toBeNull()

    await waitForCanvasRender({ page: this.page })

    const {
      point,
      snapshot
    } = result as {
      point: {
        x: number
        y: number
      }
      snapshot: ShapeScaleSnapshot
    }

    expect(snapshot, 'должен существовать live snapshot после интерактивного масштабирования').not.toBeNull()

    this.activeScaleInteraction = {
      point,
      mode: 'interactive',
      corner: params.corner ?? 'br',
      objectIndex: params.objectIndex,
      id: params.id
    }

    return snapshot
  }

  /** Имитирует масштабирование shape и запекание результата через object:modified */
  async simulateScale(params: { scaleX: number, scaleY: number } & ObjectTargetParams): Promise<void> {
    const {
      scaleX,
      scaleY,
      objectIndex,
      id
    } = params

    await this.simulateScaleStep({
      scaleX,
      scaleY,
      objectIndex,
      id
    })
    await this.finishScale({
      objectIndex,
      id
    })
  }

  /** Выполняет один live-шаг интерактивного масштабирования, при необходимости с зажатыми Shift/Ctrl, и возвращает проверенный snapshot. */
  async simulateScaleStep(params: ShapeScaleStepParams): Promise<ShapeScaleSnapshot> {
    const snapshot = await this.page.evaluate((payload) => {
      const {
        scaleX,
        scaleY,
        corner = 'br',
        originX = 'left',
        originY = 'top',
        shiftKey = false,
        ctrlKey = false,
        objectIndex,
        id
      } = payload

      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObjectOrActive(objectIndex, id)
      if (!target) return null

      const left = typeof target.left === 'number' ? target.left : 0
      const top = typeof target.top === 'number' ? target.top : 0
      const anchorPoint = target.getPointByOrigin(originX, originY)

      target.set({
        scaleX,
        scaleY
      })
      target.setPositionByOrigin(anchorPoint, originX, originY)
      target.setCoords()

      editor.canvas.fire('object:scaling', {
        target,
        e: {
          shiftKey,
          ctrlKey
        },
        transform: {
          original: {
            scaleX: 1,
            scaleY: 1,
            left,
            top
          },
          corner,
          originX,
          originY
        }
      })

      return helpers.serializeShapeScaleSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать live snapshot после интерактивного масштабирования').not.toBeNull()

    return snapshot as ShapeScaleSnapshot
  }

  /** Выполняет live-scale шаг с synthetic mouse:move для clamp-сценариев и при необходимости передаёт состояние Shift/Ctrl. */
  async simulateScaleMouseMoveStep(params: ShapeScaleMouseMoveStepParams): Promise<ShapeScaleSnapshot> {
    await this._startScaleInteractionIfNeeded(params)

    const result = await this.page.evaluate((payload) => {
      const {
        scaleX,
        scaleY,
        pointerX,
        pointerY,
        action,
        signX = 1,
        signY = 1,
        corner = 'br',
        originX = 'left',
        originY = 'top',
        shiftKey = false,
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
        : originX
      const activeOriginY = typeof transform.originY === 'string'
        ? transform.originY
        : originY
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
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

      const PointCtor = anchorPoint.constructor as new(x: number, y: number) => {
        subtract: (point: { x: number, y: number }) => unknown
      }
      const scenePoint = new PointCtor(anchorPoint.x + pointerX, anchorPoint.y + pointerY)
      const originalGetScenePoint = editor.canvas.getScenePoint.bind(editor.canvas)
      const previousAction = transform.action
      const previousSignX = transform.signX
      const previousSignY = transform.signY

      try {
        transform.action = action ?? previousAction
        transform.signX = signX
        transform.signY = signY
        editor.canvas.getScenePoint = () => scenePoint
        editor.canvas.fire('object:scaling', {
          target,
          e: {
            shiftKey,
            ctrlKey
          },
          transform
        })
        editor.canvas.fire('mouse:move', {
          e: new PointerEvent('pointermove', {
            clientX: pointerX,
            clientY: pointerY
          })
        })
      } finally {
        editor.canvas.getScenePoint = originalGetScenePoint
        transform.action = previousAction
        transform.signX = previousSignX
        transform.signY = previousSignY
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
        snapshot: helpers.serializeShapeScaleSnapshot(target)
      }
    }, params)

    expect(result, 'должен существовать live snapshot после mouse:move clamp').not.toBeNull()

    await waitForCanvasRender({ page: this.page })

    const {
      point,
      snapshot
    } = result as {
      point: {
        x: number
        y: number
      }
      snapshot: ShapeScaleSnapshot
    }

    expect(snapshot, 'должен существовать live snapshot после mouse:move clamp').not.toBeNull()

    this.activeScaleInteraction = {
      point,
      mode: 'synthetic-mouse-move',
      corner: params.corner ?? 'br',
      objectIndex: params.objectIndex,
      id: params.id
    }

    return snapshot
  }

  /** Сжимает shape до minimum height в live drag-сессии и возвращает проверенный snapshot. */
  async shrinkToMinimumHeight(
    params: ({ edge?: 'top' | 'bottom' } & ObjectTargetParams) = {}
  ): Promise<ShapeScaleSnapshot> {
    const {
      edge = 'bottom',
      objectIndex,
      id
    } = params

    if (edge === 'top') {
      return this.simulateScaleMouseMoveStep({
        scaleX: 1,
        scaleY: 0.2,
        pointerX: 0,
        pointerY: 20,
        action: 'scaleY',
        signY: -1,
        corner: 'mt',
        originX: 'center',
        originY: 'bottom',
        objectIndex,
        id
      })
    }

    return this.simulateScaleMouseMoveStep({
      scaleX: 1,
      scaleY: 0.2,
      pointerX: 0,
      pointerY: -20,
      action: 'scaleY',
      signY: 1,
      corner: 'mb',
      originX: 'center',
      originY: 'top',
      objectIndex,
      id
    })
  }

  /** Завершает активное интерактивное масштабирование через реальный mouseup, а для synthetic-сценариев остаётся на object:modified. */
  async finishScale(params: ObjectTargetParams = {}): Promise<ShapeScaleSnapshot> {
    if (this.activeScaleInteraction && this._matchesActiveScaleTarget(params)) {
      const {
        point,
        mode,
        corner,
        objectIndex,
        id
      } = this.activeScaleInteraction
      const snapshot = await this.page.evaluate((payload) => {
        const {
          point: interactionPoint,
          mode: interactionMode,
          corner: controlCorner,
          objectIndex: targetObjectIndex,
          id: targetId
        } = payload
        const {
          editor,
          __editorHelpers: helpers
        } = window as any

        const target = helpers.resolveCanvasObjectOrActive(targetObjectIndex, targetId)
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

        if (interactionMode === 'synthetic-mouse-move') {
          editor.canvas.fire('object:modified', {
            target
          })
        }

        return helpers.serializeShapeScaleSnapshot(target)
      }, {
        point,
        mode,
        corner,
        objectIndex,
        id
      })

      await waitForCanvasRender({ page: this.page })
      this.activeScaleInteraction = null

      expect(snapshot, 'должен существовать snapshot после завершения масштабирования').not.toBeNull()

      return snapshot as ShapeScaleSnapshot
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

      return helpers.serializeShapeScaleSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать snapshot после завершения масштабирования').not.toBeNull()

    return snapshot as ShapeScaleSnapshot
  }

  /** Завершает активное интерактивное масштабирование, если drag-сессия ещё открыта. */
  async finishScaleIfActive(): Promise<ShapeScaleSnapshot | null> {
    if (!this.activeScaleInteraction) return null

    const {
      objectIndex,
      id
    } = this.activeScaleInteraction

    return this.finishScale({
      objectIndex,
      id
    })
  }

  private async _startScaleInteractionIfNeeded(params: ShapeScaleStepParams): Promise<void> {
    const {
      corner = 'br',
      objectIndex,
      id,
      shiftKey = false,
      ctrlKey = false
    } = params

    if (this.activeScaleInteraction) {
      expect(
        this._matchesActiveScaleTarget({
          objectIndex,
          id
        }),
        'нельзя продолжать активную drag-сессию масштабирования для другого объекта'
      ).toBe(true)
      expect(
        this.activeScaleInteraction.corner,
        'нельзя продолжать активную drag-сессию масштабирования через другую ручку'
      ).toBe(corner)

      return
    }

    const point = await this.page.evaluate((payload) => {
      const {
        corner: controlCorner,
        objectIndex: targetObjectIndex,
        id: targetId,
        shiftKey: isShiftKeyPressed,
        ctrlKey: isCtrlKeyPressed
      } = payload
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObjectOrActive(targetObjectIndex, targetId)
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
        shiftKey: isShiftKeyPressed,
        ctrlKey: isCtrlKeyPressed
      }))

      const transform = editor.canvas._currentTransform
      if (!transform || transform.target !== target) {
        return null
      }

      return pointInfo
    }, {
      corner,
      objectIndex,
      id,
      shiftKey,
      ctrlKey
    })

    expect(point, 'должна существовать стартовая точка для интерактивного масштабирования').not.toBeNull()

    await waitForCanvasRender({ page: this.page })

    this.activeScaleInteraction = {
      point: point as {
        x: number
        y: number
      },
      mode: 'interactive',
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
