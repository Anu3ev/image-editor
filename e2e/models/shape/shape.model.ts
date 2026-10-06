/**
 * ShapeModel is the main e2e model for working with a shape.
 * The entire public API stays here: creation, updates, selection, text operations, and reading shape state.
 *
 * ShapeScalingSession is separate because scaling is not part of the shape itself, but a distinct action with its own temporary state: start resizing, perform intermediate steps, and finish.
 * ShapeModel remains the entry point, while ShapeScalingSession handles only scaling.
 *
 * For future splits of shape.model, follow a simple rule:
 * keep the main shape API in ShapeModel;
 * move distinct actions with their own responsibilities into separate files through composition;
 * do not split the file just for size: extraction should make the code clearer.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  ShapeObjectInfo,
  ShapeObjectTreeIds,
  ShapeTextInfo,
  ShapeAddParams,
  ShapeAddAtBoundsParams,
  ShapeUpdateParams,
  ShapeStrokeParams,
  ShapeTextAlignParams,
  ShapeTextStyleParams,
  ShapeScaleMouseMoveStepParams,
  ShapeScaleSnapshot,
  ShapeScaleSide,
  ShapeScaleStepParams,
  ShapePresetKey,
  ShapeHorizontalAlign,
  ShapeVerticalAlign,
  ObjectTargetParams,
  ShapeTextEditingUpdateParams,
  ShapeTextSelectionParams,
  ShapeTextSelectionStyleInfo
} from '../../types'
import { waitForCanvasRender } from '../../helpers/canvas-render.helper'
import { ShapeScalingSession, type ShapeDiagonalScaleCorner } from './shape-scaling-session'
import { ShapeRotationSession } from './shape-rotation-session'

type ShapeScaleLiveState = {
  snapshot: ShapeScaleSnapshot
  lineCount: number
}

type ShapeScaleTextLiveState = {
  snapshot: ShapeScaleSnapshot
  text: ShapeTextInfo
}

const SHAPE_DIAGONAL_LIVE_SHRINK_START_SCALE = 0.92

const SHAPE_DIAGONAL_LIVE_SHRINK_DISTANCES = [120, 60, 30, 15, 8, 4, 2, 1]

export class ShapeModel {
  private readonly page: Page

  private readonly scalingSession: ShapeScalingSession

  private readonly rotationSession: ShapeRotationSession

  constructor(page: Page) {
    this.page = page
    this.scalingSession = new ShapeScalingSession(page)
    this.rotationSession = new ShapeRotationSession(page)
  }

  /** Returns viewport coordinates of the shape's center for real mouse events. */
  private async _resolveTargetCenterPoint(params: ObjectTargetParams = {}): Promise<{ x: number, y: number }> {
    const point = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObjectOrActive(objectIndex, id)
      if (!target) return null

      target.setCoords()
      const centerPoint = target.getCenterPoint()
      const sceneCenterX = typeof centerPoint.x === 'number' ? centerPoint.x : 0
      const sceneCenterY = typeof centerPoint.y === 'number' ? centerPoint.y : 0
      const viewportTransform = Array.isArray(editor.canvas.viewportTransform)
        ? editor.canvas.viewportTransform
        : [1, 0, 0, 1, 0, 0]
      const viewportX = (viewportTransform[0] * sceneCenterX)
        + (viewportTransform[2] * sceneCenterY)
        + viewportTransform[4]
      const viewportY = (viewportTransform[1] * sceneCenterX)
        + (viewportTransform[3] * sceneCenterY)
        + viewportTransform[5]
      const canvasRect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: canvasRect.left + viewportX,
        y: canvasRect.top + viewportY
      }
    }, params)

    expect(point, 'для взаимодействия с фигурой должны существовать координаты на canvas').not.toBeNull()

    return point as {
      x: number
      y: number
    }
  }

  /** Converts a canvas-scene point to browser viewport coordinates for real mouse events. */
  private async _resolveViewportPointFromScenePoint(
    params: {
      x: number
      y: number
    }
  ): Promise<{
    x: number
    y: number
  }> {
    const point = await this.page.evaluate(({ x, y }) => {
      const { editor } = window as any
      const viewportTransform = Array.isArray(editor.canvas.viewportTransform)
        ? editor.canvas.viewportTransform
        : [1, 0, 0, 1, 0, 0]
      const viewportX = (viewportTransform[0] * x)
        + (viewportTransform[2] * y)
        + viewportTransform[4]
      const viewportY = (viewportTransform[1] * x)
        + (viewportTransform[3] * y)
        + viewportTransform[5]
      const canvasRect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: canvasRect.left + viewportX,
        y: canvasRect.top + viewportY
      }
    }, params)

    expect(point, 'для pointer-взаимодействия на canvas должны существовать viewport-координаты').not.toBeNull()

    return point as {
      x: number
      y: number
    }
  }

  /** Returns click and drag points in the horizontal text-padding area inside a shape. */
  private async _resolveTextInsetInteractionPoints(
    {
      side,
      ...targetParams
    }: {
      side: 'left' | 'right'
    } & ObjectTargetParams
  ): Promise<{
    insetPoint: {
      x: number
      y: number
    }
    textPoint: {
      x: number
      y: number
    }
  }> {
    const snapshot = await this.getScaleSnapshot(targetParams)

    expect(
      snapshot.textBoundsLeft,
      'левая граница текста должна существовать для взаимодействия с отступом'
    ).not.toBeNull()
    expect(
      snapshot.textBoundsTop,
      'верхняя граница текста должна существовать для взаимодействия с отступом'
    ).not.toBeNull()
    expect(
      snapshot.textBoundsRight,
      'правая граница текста должна существовать для взаимодействия с отступом'
    ).not.toBeNull()
    expect(
      snapshot.textBoundsBottom,
      'нижняя граница текста должна существовать для взаимодействия с отступом'
    ).not.toBeNull()

    const textBoundsLeft = snapshot.textBoundsLeft as number
    const textBoundsTop = snapshot.textBoundsTop as number
    const textBoundsRight = snapshot.textBoundsRight as number
    const textBoundsBottom = snapshot.textBoundsBottom as number
    const insetWidth = side === 'right'
      ? snapshot.groupBoundsRight - textBoundsRight
      : textBoundsLeft - snapshot.groupBoundsLeft

    const insetSideTitle = side === 'right'
      ? 'правого'
      : 'левого'

    expect(
      insetWidth,
      `для ${insetSideTitle} отступа фигуры должно быть место для pointer-взаимодействия`
    ).toBeGreaterThan(8)

    const textBoundsWidth = textBoundsRight - textBoundsLeft
    const textOffset = Math.max(4, Math.min(textBoundsWidth / 3, 24))
    const interactionSceneY = textBoundsTop + ((textBoundsBottom - textBoundsTop) / 2)
    const insetSceneX = side === 'right'
      ? textBoundsRight + (insetWidth / 2)
      : textBoundsLeft - (insetWidth / 2)
    const textSceneX = side === 'right'
      ? textBoundsLeft + textOffset
      : textBoundsRight - textOffset

    const insetPoint = await this._resolveViewportPointFromScenePoint({
      x: insetSceneX,
      y: interactionSceneY
    })
    const textPoint = await this._resolveViewportPointFromScenePoint({
      x: textSceneX,
      y: interactionSceneY
    })

    return {
      insetPoint,
      textPoint
    }
  }

  /** Adds a shape to the canvas and returns information about the created object */
  async add(params: ShapeAddParams = {}): Promise<ShapeObjectInfo | null> {
    const createdShape = await this.page.evaluate(async(p) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const shape = await editor.shapeManager.add(p)
      if (!shape) return null
      return helpers.serializeShapeObject(shape)
    }, params)

    if (!createdShape) return null

    await waitForCanvasRender({ page: this.page })

    if (typeof createdShape.id !== 'string') return createdShape

    return this.getObject({ id: createdShape.id })
  }

  /** Adds a shape so that `left/top` specify the bounding box's top-left corner. */
  async addAtBounds(params: ShapeAddAtBoundsParams): Promise<ShapeObjectInfo | null> {
    const {
      options: {
        left,
        top,
        width,
        height,
        ...rest
      },
      ...shapeParams
    } = params

    return this.add({
      ...shapeParams,
      options: {
        ...rest,
        width,
        height,
        left: left + (width / 2),
        top: top + (height / 2)
      }
    })
  }

  /** Adds a shape and immediately sets text of the required size through the editing path. */
  async addWithText({
    presetKey,
    text,
    fontSize,
    options
  }: {
    presetKey: ShapePresetKey
    text: string
    fontSize: number
    options?: ShapeAddParams['options']
  }): Promise<ShapeObjectInfo | null> {
    const createdShape = await this.add({
      presetKey,
      options
    })

    if (!createdShape) return null

    const targetParams: ObjectTargetParams = typeof createdShape.id === 'string'
      ? { id: createdShape.id }
      : { objectIndex: 0 }

    await this.enterTextEditing(targetParams)
    await this.updateEditingText({
      ...targetParams,
      text
    })
    await this.updateTextStyleInEditing({
      ...targetParams,
      style: {
        fontSize
      }
    })
    await this.exitTextEditing(targetParams)

    return this.getObject(targetParams)
  }

  /** Deletes a shape. Defaults to the active object */
  async remove(params: ObjectTargetParams = {}): Promise<boolean> {
    const removed = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      return editor.shapeManager.remove({ target })
    }, params)

    await waitForCanvasRender({ page: this.page })

    return removed
  }

  /** Sets a shape's fill. Defaults to the active object */
  async setFill(params: { fill: string } & ObjectTargetParams): Promise<void> {
    await this.page.evaluate(({ fill, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      editor.shapeManager.setFill({ target, fill })
    }, params)

    await waitForCanvasRender({ page: this.page })
  }

  /** Sets a shape's stroke. Defaults to the active object */
  async setStroke(params: ShapeStrokeParams & ObjectTargetParams = {}): Promise<void> {
    await this.page.evaluate(({ stroke, strokeWidth, dash, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      editor.shapeManager.setStroke({ target, stroke, strokeWidth, dash })
    }, params)

    await waitForCanvasRender({ page: this.page })
  }

  /** Sets a shape's opacity. Defaults to the active object and its text */
  async setOpacity(params: { opacity: number; applyToText?: boolean } & ObjectTargetParams): Promise<void> {
    await this.page.evaluate(({ opacity, applyToText, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      editor.shapeManager.setOpacity({ target, opacity, applyToText })
    }, params)

    await waitForCanvasRender({ page: this.page })
  }

  /** Sets a shape's corner rounding. Defaults to the active object */
  async setRounding(params: { rounding: number } & ObjectTargetParams): Promise<void> {
    await this.page.evaluate(async({ rounding, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      await editor.shapeManager.setRounding({ target, rounding })
    }, params)

    await waitForCanvasRender({ page: this.page })
  }

  /** Adds a shape with text and initial text styles. */
  async addShapeWithText(
    params: {
      presetKey?: ShapePresetKey
      text?: string
      fontSize?: number
      width?: number
      height?: number
    } = {}
  ): Promise<ShapeObjectInfo> {
    const {
      presetKey = 'square',
      text = 'TEST',
      fontSize = 72,
      width,
      height
    } = params

    const shape = await this.add({
      presetKey,
      options: {
        width,
        height,
        text,
        textStyle: {
          fontSize
        }
      }
    })
    return this.checkCreation({
      shape,
      presetKey
    })
  }

  /** Adds a shape with empty text. */
  async addEmptyTextShape(
    params: { presetKey?: ShapePresetKey } = {}
  ): Promise<ShapeObjectInfo> {
    const { presetKey = 'square' } = params
    const shape = await this.add({
      presetKey,
      options: {
        text: ''
      }
    })

    return this.checkCreation({
      shape,
      presetKey
    })
  }

  /** Shrinks a shape to minimum width in a live drag session and returns a verified snapshot. */
  async shrinkToMinimumWidth(
    params: ({ edge?: 'left' | 'right' } & ObjectTargetParams) = {}
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingSession.shrinkToMinimumWidth(params)
  }

  /** Scales the current canvas target horizontally with the right handle and returns a live snapshot. */
  async scaleHorizontallyFromRight(
    params: { scaleX: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingSession.scaleHorizontallyFromRight(params)
  }

  /** Scales a shape horizontally with the left handle and returns a live snapshot. */
  async scaleHorizontallyFromLeft(
    params: { scaleX: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingSession.scaleHorizontallyFromLeft(params)
  }

  /** Scales the current canvas target vertically with the bottom handle and returns a live snapshot. */
  async scaleVerticallyFromBottom(
    params: { scaleY: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingSession.scaleVerticallyFromBottom(params)
  }

  /** Scales a shape vertically with the top handle and returns a live snapshot. */
  async scaleVerticallyFromTop(
    params: { scaleY: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingSession.scaleVerticallyFromTop(params)
  }

  /** Scales a shape diagonally with a corner handle and returns a live snapshot. Supports explicitly passing Shift and disabling snapping with Ctrl. */
  async scaleDiagonally(
    params: {
      scaleX: number
      scaleY: number
      corner: ShapeDiagonalScaleCorner
      shiftKey?: boolean
      ctrlKey?: boolean
    } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingSession.scaleDiagonally(params)
  }

  /** Scales a shape diagonally and proportionally with a corner handle and returns a live snapshot. */
  async scaleDiagonallyProportionally(
    params: {
      scale: number
      corner: ShapeDiagonalScaleCorner
    } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingSession.scaleDiagonallyProportionally(params)
  }

  /** Starts shape scaling with a real mousedown on a corner handle. */
  async startScaleFromCorner(
    params: { corner: ShapeDiagonalScaleCorner } & ObjectTargetParams
  ): Promise<void> {
    await this.scalingSession.startScaleFromCorner(params)
  }

  /** Scales a shape with the selected side handle and returns a live snapshot. */
  async scaleFromSide(
    params: {
      side: ShapeScaleSide
      scale: number
    } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    const {
      side,
      scale,
      objectIndex,
      id
    } = params

    if (side === 'right') {
      return this.scaleHorizontallyFromRight({
        scaleX: scale,
        objectIndex,
        id
      })
    }

    if (side === 'left') {
      return this.scaleHorizontallyFromLeft({
        scaleX: scale,
        objectIndex,
        id
      })
    }

    if (side === 'bottom') {
      return this.scaleVerticallyFromBottom({
        scaleY: scale,
        objectIndex,
        id
      })
    }

    return this.scaleVerticallyFromTop({
      scaleY: scale,
      objectIndex,
      id
    })
  }

  /** Shrinks a shape diagonally to its minimum and returns the current frame's live snapshot. */
  async shrinkDiagonallyToMinimum(
    params: {
      corner: ShapeDiagonalScaleCorner
    } & ObjectTargetParams
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingSession.shrinkDiagonallyToMinimum(params)
  }

  /** Simulates shape scaling and baking the result through object:modified. */
  async simulateScale(params: { scaleX: number, scaleY: number } & ObjectTargetParams): Promise<void> {
    await this.scalingSession.simulateScale(params)
  }

  /** Performs one live interactive-scaling step and returns a verified snapshot. */
  async simulateScaleStep(params: ShapeScaleStepParams): Promise<ShapeScaleSnapshot> {
    return this.scalingSession.simulateScaleStep(params)
  }

  /** Performs a live scaling step with synthetic mouse:move for clamp scenarios. */
  async simulateScaleMouseMoveStep(params: ShapeScaleMouseMoveStepParams): Promise<ShapeScaleSnapshot> {
    return this.scalingSession.simulateScaleMouseMoveStep(params)
  }

  /** Continues the current shape-handle drag and returns a live snapshot. */
  async dragActiveScaleHandleBy(params: { deltaX: number, deltaY: number }): Promise<ShapeScaleSnapshot> {
    return this.scalingSession.dragActiveScaleHandleBy(params)
  }

  /** Continues the current shape-handle drag toward the current drag session's anchor. */
  async dragActiveScaleHandleTowardAnchor(params: { distance: number }): Promise<ShapeScaleSnapshot> {
    return this.scalingSession.dragActiveScaleHandleTowardAnchor(params)
  }

  /** Shrinks a shape to minimum height in a live drag session and returns a verified snapshot. */
  async shrinkToMinimumHeight(
    params: ({ edge?: 'top' | 'bottom' } & ObjectTargetParams) = {}
  ): Promise<ShapeScaleSnapshot> {
    return this.scalingSession.shrinkToMinimumHeight(params)
  }

  /** Finishes active interactive scaling and returns the final snapshot. */
  async finishScale(params: ObjectTargetParams = {}): Promise<ShapeScaleSnapshot> {
    return this.scalingSession.finishScale(params)
  }

  /** Finishes active interactive scaling if the drag session is still open. */
  async finishScaleIfActive(): Promise<ShapeScaleSnapshot | null> {
    return this.scalingSession.finishScaleIfActive()
  }

  /** Narrows a shape step by step from the selected side and returns each step's live state. */
  async shrinkFromSideInSteps(
    params: {
      side: ShapeScaleSide
      steps: number[]
    } & ObjectTargetParams
  ): Promise<ShapeScaleLiveState[]> {
    const {
      side,
      steps,
      objectIndex,
      id
    } = params

    expect(steps.length, 'для поэтапного сужения должен быть хотя бы один шаг').toBeGreaterThan(0)

    const states: ShapeScaleLiveState[] = []

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index]
      let snapshot: ShapeScaleSnapshot

      if (side === 'right') {
        snapshot = await this.scaleHorizontallyFromRight({
          id,
          objectIndex,
          scaleX: step
        })
      } else if (side === 'left') {
        snapshot = await this.scaleHorizontallyFromLeft({
          id,
          objectIndex,
          scaleX: step
        })
      } else if (side === 'bottom') {
        snapshot = await this.scaleVerticallyFromBottom({
          id,
          objectIndex,
          scaleY: step
        })
      } else {
        snapshot = await this.scaleVerticallyFromTop({
          id,
          objectIndex,
          scaleY: step
        })
      }

      const text = await this.getTextNode({
        id,
        objectIndex
      })

      states.push({
        snapshot,
        lineCount: text?.lineCount ?? 0
      })
    }

    return states
  }

  /** Narrows a shape diagonally and proportionally in one drag session and returns live text states at each step. */
  async shrinkDiagonallyProportionallyInLiveSteps(
    params: {
      corner: ShapeDiagonalScaleCorner
    } & ObjectTargetParams
  ): Promise<ShapeScaleTextLiveState[]> {
    const {
      corner,
      objectIndex,
      id
    } = params
    const states: ShapeScaleTextLiveState[] = []

    const initialSnapshot = await this.scaleDiagonallyProportionally({
      id,
      objectIndex,
      corner,
      scale: SHAPE_DIAGONAL_LIVE_SHRINK_START_SCALE
    })
    const initialText = await this.getTextNode({ id, objectIndex })

    expect(initialText, 'текст должен существовать после первого live-шага при диагональном сужении').not.toBeNull()

    if (!initialText) {
      throw new Error('текст должен существовать после первого live-шага при диагональном сужении')
    }

    states.push({
      snapshot: initialSnapshot,
      text: initialText
    })

    for (const distance of SHAPE_DIAGONAL_LIVE_SHRINK_DISTANCES) {
      const snapshot = await this.dragActiveScaleHandleTowardAnchor({ distance })
      const text = await this.getTextNode({ id, objectIndex })

      expect(text, 'текст должен существовать на каждом live-шаге диагонального сужения').not.toBeNull()

      if (!text) {
        throw new Error('текст должен существовать на каждом live-шаге диагонального сужения')
      }

      states.push({
        snapshot,
        text
      })
    }

    return states
  }

  /** Returns the current scaling-target snapshot, failing fast if it is absent. */
  async getScaleSnapshot(params: ObjectTargetParams = {}): Promise<ShapeScaleSnapshot> {
    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const { __editorHelpers: helpers } = window as any

      const target = helpers.resolveCanvasObjectOrActive(objectIndex, id)
      if (!target) return null

      return helpers.serializeShapeScaleSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать текущий snapshot масштабируемого target').not.toBeNull()

    return snapshot as ShapeScaleSnapshot
  }

  /**
   * Sets the shape's absolute rotation angle.
   * Uses TransformManager to apply the transformation correctly and save it to history.
   */
  async setAngle(params: { angle: number } & ObjectTargetParams): Promise<void> {
    await this.page.evaluate(({ angle, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return

      editor.transformManager.setAngle(target, angle)
    }, params)

    await waitForCanvasRender({ page: this.page })
  }

  /** Updates a shape's preset, dimensions, and styles. Preserves position and text */
  async update(params: ShapeUpdateParams & ObjectTargetParams = {}): Promise<ShapeObjectInfo | null> {
    const shape = await this.page.evaluate(async({ presetKey, options, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const result = await editor.shapeManager.update({ target, presetKey, options })
      if (!result) return null
      return helpers.serializeShapeObject(result)
    }, params)

    if (!shape) return null

    await waitForCanvasRender({ page: this.page })

    const settledParams = typeof shape.id === 'string'
      ? { id: shape.id }
      : params

    return this.getObject(settledParams)
  }

  /** Sets text alignment inside a shape */
  async setTextAlign(params: ShapeTextAlignParams & ObjectTargetParams = {}): Promise<ShapeObjectInfo | null> {
    const shape = await this.page.evaluate(({ horizontal, vertical, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const result = editor.shapeManager.setTextAlign({ target, horizontal, vertical })
      if (!result) return null
      return helpers.serializeShapeObject(result)
    }, params)

    if (!shape) return null

    await waitForCanvasRender({ page: this.page })

    const settledParams = typeof shape.id === 'string'
      ? { id: shape.id }
      : params

    return this.getObject(settledParams)
  }

  /** Updates the text style inside a shape and returns a text-node snapshot */
  async updateTextStyle(
    params: { style: ShapeTextStyleParams } & ObjectTargetParams
  ): Promise<ShapeTextInfo | null> {
    const updatedTextNode = await this.page.evaluate(({ style, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const result = editor.shapeManager.updateTextStyle({ target, style })
      if (!result) return null

      const textNode = editor.shapeManager.getTextNode({ target: result })
      if (!textNode) return null

      return helpers.serializeShapeTextObject(textNode)
    }, params)

    if (!updatedTextNode) return null

    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(params)
  }

  /** Returns the text node inside a shape */
  async getTextNode(params: ObjectTargetParams = {}): Promise<ShapeTextInfo | null> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const textNode = editor.shapeManager.getTextNode({ target })
      if (!textNode) return null

      return helpers.serializeShapeTextObject(textNode)
    }, params)
  }

  /** Returns the shape-group ID and its internal object IDs. */
  async getObjectTreeIds(params: ObjectTargetParams = {}): Promise<ShapeObjectTreeIds> {
    const ids = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObjectOrActive(objectIndex, id)
      if (!target) return null

      const shapeNode = helpers.resolveShapeNode(target)
      const textNode = editor.shapeManager.getTextNode({ target })

      return {
        groupId: typeof target.id === 'string' ? target.id : null,
        shapeId: shapeNode && typeof shapeNode.id === 'string' ? shapeNode.id : null,
        textId: textNode && typeof textNode.id === 'string' ? textNode.id : null
      }
    }, params)

    expect(ids, 'для shape-группы должны существовать id объектов').not.toBeNull()

    return ids as ShapeObjectTreeIds
  }

  /** Makes a shape the active canvas object */
  async select(params: ObjectTargetParams = {}): Promise<ShapeObjectInfo | null> {
    const shape = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObjectOrActive(objectIndex, id)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      editor.canvas.requestRenderAll()

      return helpers.serializeShapeObject(target)
    }, params)

    if (!shape) return null

    await waitForCanvasRender({ page: this.page })

    const settledParams = typeof shape.id === 'string'
      ? { id: shape.id }
      : params

    return this.getObject(settledParams)
  }

  /** Clicks a shape on the canvas using real viewport coordinates. */
  async clickOnCanvas(
    params: ({
      point?: 'center' | 'bottom-right'
    } & ObjectTargetParams) = {}
  ): Promise<void> {
    const {
      point: pointType = 'center',
      ...targetParams
    } = params

    const point = pointType === 'bottom-right'
      ? await this.page.evaluate(({ objectIndex, id }) => {
        const {
          editor,
          __editorHelpers: helpers
        } = window as any

        const target = helpers.resolveCanvasObject(objectIndex, id)
        if (!target) return null

        target.setCoords()

        const corner = target.oCoords?.br
        if (!corner || typeof corner.x !== 'number' || typeof corner.y !== 'number') {
          return null
        }

        const canvasRect = editor.canvas.upperCanvasEl.getBoundingClientRect()

        return {
          x: canvasRect.left + corner.x - 12,
          y: canvasRect.top + corner.y - 12
        }
      }, targetParams)
      : await this._resolveTargetCenterPoint(targetParams)

    expect(point, 'для клика по фигуре должны существовать координаты на canvas').not.toBeNull()

    const resolvedPoint = point as {
      x: number
      y: number
    }

    await this.page.mouse.click(resolvedPoint.x, resolvedPoint.y)
    await waitForCanvasRender({ page: this.page })
  }

  /** Opens text editing inside a shape through a real double-click on the canvas. */
  async openTextEditingFromCanvas(params: ObjectTargetParams = {}): Promise<ShapeTextInfo | null> {
    const point = await this._resolveTargetCenterPoint(params)

    await this.page.mouse.dblclick(point.x, point.y)
    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(params)
  }

  /** Clicks the horizontal text-padding area inside a shape using real canvas coordinates. */
  async clickTextInset(
    params: {
      side: 'left' | 'right'
    } & ObjectTargetParams
  ): Promise<ShapeTextInfo | null> {
    const {
      side,
      ...targetParams
    } = params
    const { insetPoint } = await this._resolveTextInsetInteractionPoints({
      side,
      ...targetParams
    })

    await this.page.mouse.click(insetPoint.x, insetPoint.y)
    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(targetParams)
  }

  /** Starts text selection from the horizontal padding area and drags the cursor into the text. */
  async dragTextSelectionFromInset(
    params: {
      side: 'left' | 'right'
    } & ObjectTargetParams
  ): Promise<ShapeTextInfo | null> {
    const {
      side,
      ...targetParams
    } = params
    const {
      insetPoint,
      textPoint
    } = await this._resolveTextInsetInteractionPoints({
      side,
      ...targetParams
    })

    await this.page.mouse.move(insetPoint.x, insetPoint.y)
    await this.page.mouse.down()
    await waitForCanvasRender({ page: this.page })

    await this.page.mouse.move(textPoint.x, textPoint.y, {
      steps: 8
    })
    await waitForCanvasRender({ page: this.page })

    await this.page.mouse.up()
    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(targetParams)
  }

  /** Hovers over the shape's rotation handle. */
  async hoverRotateHandle(params: ObjectTargetParams = {}): Promise<void> {
    await this.rotationSession.hoverRotateHandle(params)
  }

  /** Starts shape rotation with a real mousedown on the handle. */
  async startRotateFromHandle(params: ObjectTargetParams = {}): Promise<void> {
    await this.rotationSession.startRotateFromHandle(params)
  }

  /** Finishes shape rotation with a real mouseup. */
  async finishRotation(): Promise<void> {
    await this.rotationSession.finishRotation()
  }

  /** Enables text-editing mode inside a shape */
  async enterTextEditing(params: ObjectTargetParams = {}): Promise<ShapeTextInfo | null> {
    const editingTextNode = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const textNode = editor.shapeManager.getTextNode({ target })
      if (!textNode) return null

      editor.canvas.setActiveObject(textNode)
      textNode.enterEditing()
      textNode.selectAll()
      editor.canvas.requestRenderAll()

      return helpers.serializeShapeTextObject(textNode)
    }, params)

    if (!editingTextNode) return null

    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(params)
  }

  /** Changes text in the active text-edit session inside a shape */
  async updateEditingText(params: ShapeTextEditingUpdateParams): Promise<ShapeTextInfo | null> {
    const updatedTextNode = await this.page.evaluate((payload) => {
      const {
        text,
        selectionStart,
        selectionEnd,
        objectIndex,
        id
      } = payload
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const textNode = editor.shapeManager.getTextNode({ target })
      if (!textNode) return null

      const { hiddenTextarea } = textNode
      const nextSelectionStart = typeof selectionStart === 'number' ? selectionStart : text.length
      const nextSelectionEnd = typeof selectionEnd === 'number' ? selectionEnd : nextSelectionStart

      if (hiddenTextarea instanceof HTMLTextAreaElement) {
        hiddenTextarea.value = text
        hiddenTextarea.selectionStart = nextSelectionStart
        hiddenTextarea.selectionEnd = nextSelectionEnd
        hiddenTextarea.dispatchEvent(new Event('input', { bubbles: true }))
      } else {
        textNode.set({ text })
        textNode.selectionStart = nextSelectionStart
        textNode.selectionEnd = nextSelectionEnd
        editor.canvas.fire('text:changed', {
          target: textNode
        })
        editor.canvas.requestRenderAll()
      }

      return helpers.serializeShapeTextObject(textNode)
    }, params)

    if (!updatedTextNode) return null

    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(params)
  }

  /** Updates text style inside a shape while editing mode is open. */
  async updateTextStyleInEditing(
    params: { style: ShapeTextStyleParams } & ObjectTargetParams
  ): Promise<ShapeTextInfo | null> {
    const updatedTextNode = await this.page.evaluate(({ style, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const textNode = editor.shapeManager.getTextNode({ target })
      if (!textNode) return null

      const result = editor.textManager.updateText({
        target: textNode,
        style
      })
      if (!result) return null

      return helpers.serializeShapeTextObject(result)
    }, params)

    if (!updatedTextNode) return null

    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(params)
  }

  /** Finishes text editing inside a shape */
  async exitTextEditing(params: ObjectTargetParams = {}): Promise<ShapeTextInfo | null> {
    const editingTextNode = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const textNode = editor.shapeManager.getTextNode({ target })
      if (!textNode) return null

      textNode.exitEditing()
      editor.canvas.requestRenderAll()

      return helpers.serializeShapeTextObject(textNode)
    }, params)

    if (!editingTextNode) return null

    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(params)
  }

  /** Sets the text selection range inside a shape in editing mode. */
  async setTextSelection(
    params: ShapeTextSelectionParams & ObjectTargetParams
  ): Promise<ShapeTextInfo | null> {
    return this.page.evaluate(({ start, end, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveTarget(objectIndex, id)
      const textNode = editor.shapeManager.getTextNode({ target })
      if (!textNode) return null

      if (typeof textNode.setSelectionStart === 'function') {
        textNode.setSelectionStart(start)
      } else {
        textNode.selectionStart = start
      }

      if (typeof textNode.setSelectionEnd === 'function') {
        textNode.setSelectionEnd(end)
      } else {
        textNode.selectionEnd = end
      }
      const { hiddenTextarea } = textNode

      if (hiddenTextarea instanceof HTMLTextAreaElement) {
        hiddenTextarea.focus()
        hiddenTextarea.selectionStart = start
        hiddenTextarea.selectionEnd = end
      }

      return helpers.serializeShapeTextObject(textNode)
    }, params)
  }

  /** Deletes selected text inside a shape through a real keyboard event. */
  async deleteSelectedText(params: ObjectTargetParams = {}): Promise<ShapeTextInfo | null> {
    await this.page.keyboard.press('Delete')
    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(params)
  }

  /** Types text inside a shape at the current cursor position through real keyboard events. */
  async typeText(params: { text: string } & ObjectTargetParams): Promise<ShapeTextInfo | null> {
    const {
      text,
      ...targetParams
    } = params
    const parts = text.split('\n')

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index]
      if (part.length > 0) {
        await this.page.keyboard.type(part)
      }

      if (index < parts.length - 1) {
        await this.page.keyboard.press('Enter')
      }
    }

    await waitForCanvasRender({ page: this.page })

    return this.getTextNode(targetParams)
  }

  /** Returns the style of the current or explicit text selection range inside a shape. */
  async getSelectionStyles(
    params: Partial<ShapeTextSelectionParams> & ObjectTargetParams = {}
  ): Promise<ShapeTextSelectionStyleInfo | null> {
    return this.page.evaluate((payload) => {
      const { __editorHelpers: helpers } = window as any

      return helpers.getShapeTextSelectionStyles(payload)
    }, params)
  }

  /**
   * Checks that the shape was created correctly.
   * Returns a guaranteed non-null ShapeObjectInfo
   */
  checkCreation(params: { shape: ShapeObjectInfo | null, presetKey?: ShapePresetKey }): ShapeObjectInfo {
    const { shape, presetKey } = params

    expect(shape, 'shape должен быть создан').not.toBeNull()
    expect(shape?.shapeComposite, 'shape должен быть композитным').toBe(true)

    if (presetKey) {
      expect(shape?.shapePresetKey, 'presetKey должен совпадать').toBe(presetKey)
    }

    return shape as ShapeObjectInfo
  }

  /** Adds multiple shapes from a preset list and returns the created objects */
  async addMultiple(params: { presets: ShapePresetKey[] }): Promise<ShapeObjectInfo[]> {
    const results: ShapeObjectInfo[] = []

    for (const presetKey of params.presets) {
      const shape = await this.add({ presetKey })
      if (shape) results.push(shape)
    }

    return results
  }

  /** Returns the first shape object on the canvas */
  async getFirstShape(): Promise<ShapeObjectInfo> {
    const objects = await this.getShapeObjects()
    expect(objects.length, 'на canvas должен быть хотя бы один shape').toBeGreaterThan(0)
    return objects[0]
  }

  /** Returns a shape object by ID or canvas index. */
  async getObject(params: ObjectTargetParams = {}): Promise<ShapeObjectInfo | null> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return helpers.serializeShapeObject(target)
    }, params)
  }

  /**
   * Checks that update returned a valid result.
   * Returns a guaranteed non-null ShapeObjectInfo
   */
  checkUpdate(params: { shape: ShapeObjectInfo | null, presetKey: ShapePresetKey }): ShapeObjectInfo {
    const { shape, presetKey } = params

    expect(shape, 'update должен вернуть объект').not.toBeNull()
    expect(shape?.shapePresetKey, 'presetKey должен смениться').toBe(presetKey)

    return shape as ShapeObjectInfo
  }

  /**
   * Checks that setTextAlign returned a valid result.
   * Returns a guaranteed non-null ShapeObjectInfo
   */
  checkTextAlign(
    params: { shape: ShapeObjectInfo | null, horizontal?: ShapeHorizontalAlign, vertical?: ShapeVerticalAlign }
  ): ShapeObjectInfo {
    const { shape, horizontal, vertical } = params

    expect(shape, 'setTextAlign должен вернуть объект').not.toBeNull()

    if (horizontal) {
      expect(shape?.shapeAlignHorizontal, 'горизонтальное выравнивание должно совпадать').toBe(horizontal)
    }

    if (vertical) {
      expect(shape?.shapeAlignVertical, 'вертикальное выравнивание должно совпадать').toBe(vertical)
    }

    return shape as ShapeObjectInfo
  }

  /** Checks that shape- or text-node bounds remain within group bounds. */
  checkNodeInsideGroup(params: {
    snapshot: ShapeScaleSnapshot
    kind: 'shape' | 'text'
    tolerance?: number
  }): {
    left: number
    top: number
    right: number
    bottom: number
  } {
    const {
      snapshot,
      kind,
      tolerance = 1.5
    } = params

    const left = kind === 'shape' ? snapshot.shapeBoundsLeft : snapshot.textBoundsLeft
    const top = kind === 'shape' ? snapshot.shapeBoundsTop : snapshot.textBoundsTop
    const right = kind === 'shape' ? snapshot.shapeBoundsRight : snapshot.textBoundsRight
    const bottom = kind === 'shape' ? snapshot.shapeBoundsBottom : snapshot.textBoundsBottom

    expect(left, `${kind} bounds left должен существовать`).not.toBeNull()
    expect(top, `${kind} bounds top должен существовать`).not.toBeNull()
    expect(right, `${kind} bounds right должен существовать`).not.toBeNull()
    expect(bottom, `${kind} bounds bottom должен существовать`).not.toBeNull()

    if (left === null || top === null || right === null || bottom === null) {
      throw new Error(`${kind} bounds должны существовать`)
    }

    expect(left).toBeGreaterThanOrEqual(snapshot.groupBoundsLeft - tolerance)
    expect(top).toBeGreaterThanOrEqual(snapshot.groupBoundsTop - tolerance)
    expect(right).toBeLessThanOrEqual(snapshot.groupBoundsRight + tolerance)
    expect(bottom).toBeLessThanOrEqual(snapshot.groupBoundsBottom + tolerance)

    return {
      left,
      top,
      right,
      bottom
    }
  }

  /** Checks that text remains inside the shape's inner area after subtracting the stroke. */
  checkTextInsideStrokeSafeArea(params: {
    snapshot: ShapeScaleSnapshot
    tolerance?: number
  }): {
    left: number
    top: number
    right: number
    bottom: number
  } {
    const {
      snapshot,
      tolerance = 1.5
    } = params

    expect(
      snapshot.shapeStrokeWidth,
      'ширина обводки должна существовать для проверки текста внутри обводки'
    ).not.toBeNull()
    expect(snapshot.shapeBoundsLeft, 'левая граница шейпа должна существовать').not.toBeNull()
    expect(snapshot.shapeBoundsTop, 'верхняя граница шейпа должна существовать').not.toBeNull()
    expect(snapshot.shapeBoundsRight, 'правая граница шейпа должна существовать').not.toBeNull()
    expect(snapshot.shapeBoundsBottom, 'нижняя граница шейпа должна существовать').not.toBeNull()
    expect(snapshot.textBoundsLeft, 'левая граница текста должна существовать').not.toBeNull()
    expect(snapshot.textBoundsTop, 'верхняя граница текста должна существовать').not.toBeNull()
    expect(snapshot.textBoundsRight, 'правая граница текста должна существовать').not.toBeNull()
    expect(snapshot.textBoundsBottom, 'нижняя граница текста должна существовать').not.toBeNull()

    if (
      snapshot.shapeStrokeWidth === null
      || snapshot.shapeBoundsLeft === null
      || snapshot.shapeBoundsTop === null
      || snapshot.shapeBoundsRight === null
      || snapshot.shapeBoundsBottom === null
      || snapshot.textBoundsLeft === null
      || snapshot.textBoundsTop === null
      || snapshot.textBoundsRight === null
      || snapshot.textBoundsBottom === null
    ) {
      throw new Error('для проверки текста внутри обводки должны существовать bounds шейпа, текста и strokeWidth')
    }

    const safeLeft = snapshot.shapeBoundsLeft + snapshot.shapeStrokeWidth
    const safeTop = snapshot.shapeBoundsTop + snapshot.shapeStrokeWidth
    const safeRight = snapshot.shapeBoundsRight - snapshot.shapeStrokeWidth
    const safeBottom = snapshot.shapeBoundsBottom - snapshot.shapeStrokeWidth

    expect(snapshot.textBoundsLeft).toBeGreaterThanOrEqual(safeLeft - tolerance)
    expect(snapshot.textBoundsTop).toBeGreaterThanOrEqual(safeTop - tolerance)
    expect(snapshot.textBoundsRight).toBeLessThanOrEqual(safeRight + tolerance)
    expect(snapshot.textBoundsBottom).toBeLessThanOrEqual(safeBottom + tolerance)

    return {
      left: snapshot.textBoundsLeft,
      top: snapshot.textBoundsTop,
      right: snapshot.textBoundsRight,
      bottom: snapshot.textBoundsBottom
    }
  }

  /**
   * Deletes a shape and checks that deletion succeeded.
   * Returns true if deletion is confirmed
   */
  async checkRemoval(params: ObjectTargetParams = {}): Promise<boolean> {
    const removed = await this.remove(params)
    expect(removed, 'shape должен быть удалён').toBe(true)
    return removed
  }

  /** Returns the list of shape objects on the canvas */
  async getShapeObjects(): Promise<ShapeObjectInfo[]> {
    return this.page.evaluate(() => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      return editor.canvasManager.getObjects()
        .filter((obj: any) => Boolean(obj.shapeComposite))
        .map(helpers.serializeShapeObject)
    })
  }
}
