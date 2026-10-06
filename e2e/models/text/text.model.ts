/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  ObjectTargetParams,
  TextAddParams,
  TextEditingUpdateParams,
  TextObjectInfo,
  TextRangeStyleParams,
  TextResizeFromLeftParams,
  TextResizeFromRightParams,
  TextResizeContinueParams,
  TextResizeSnapshot,
  TextResizeToGuideParams,
  TextResizeUntilWrapParams,
  TextRotateParams,
  TextScaleHandleCorner,
  TextSelectionParams,
  TextSelectionStyleInfo,
  TextTemplateApplyParams,
  TextUpdateStyleParams
} from '../../types'
import { waitForCanvasRender } from '../../helpers/canvas-render.helper'
import {
  TEXT_DIAGONAL_MINIMUM_PROBE_SCALING_FACTOR,
  TEXT_RESIZING_REGRESSION_ADD_OPTIONS,
  TEXT_RESIZING_REGRESSION_LINE_DEFAULTS,
  TEXT_RESIZING_REGRESSION_SECOND_LINE_STYLE,
  TEXT_RESIZING_REGRESSION_TEMPLATE
} from '../../fixtures/data/text-resizing.data'
import TextResizeSession from './text-resize-session'
import TextScalingSession from './text-scaling-session'

/** Unfinished scaling of a standalone text object. */
type ActiveTextScaleInteraction = {
  point: {
    x: number
    y: number
  }
  corner: TextScaleHandleCorner
  objectIndex?: number
  id?: string
}

export class TextModel {
  private readonly page: Page

  private readonly resizeSession: TextResizeSession

  /** Complete browser-scaling lifecycle for standalone text. */
  readonly scaling: TextScalingSession

  private activeScaleInteraction: ActiveTextScaleInteraction | null

  constructor(page: Page) {
    this.page = page
    this.resizeSession = new TextResizeSession(page)
    this.scaling = new TextScalingSession(page)
    this.activeScaleInteraction = null
  }

  /** Returns viewport coordinates of the text center for real mouse events. */
  private async _resolveTargetCenterPoint(params: ObjectTargetParams = {}): Promise<{ x: number, y: number }> {
    const point = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
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

    expect(point, 'для взаимодействия с текстом должны существовать координаты на canvas').not.toBeNull()

    return point as {
      x: number
      y: number
    }
  }

  /** Adds a text object to the canvas. */
  async add(params: TextAddParams = {}): Promise<TextObjectInfo | null> {
    const textObject = await this.page.evaluate((payload) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const textbox = editor.textManager.addText(payload)

      return helpers.serializeTextObject(textbox)
    }, params)

    if (!textObject) return null

    await waitForCanvasRender({ page: this.page })

    if (typeof textObject.id !== 'string') return textObject

    return this.getObject({ id: textObject.id })
  }

  /** Adds a regression text object in the same state as a new standalone text object. */
  async addRegressionText(params: { left?: number, top?: number } = {}): Promise<TextObjectInfo> {
    const textObject = await this.page.evaluate((payload) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const {
        left,
        top,
        addOptions,
        secondLineStyle,
        lineDefaults
      } = payload
      const textbox = editor.textManager.addText({
        ...addOptions,
        left,
        top
      })
      const textValue = typeof textbox.text === 'string' ? textbox.text : ''
      const secondLineStart = textValue.indexOf('\n') + 1

      textbox.setSelectionStyles(
        secondLineStyle,
        secondLineStart,
        textValue.length
      )
      textbox.lineFontDefaults = lineDefaults
      textbox.setCoords()
      editor.canvas.requestRenderAll()

      return helpers.serializeTextObject(textbox)
    }, {
      left: params.left ?? TEXT_RESIZING_REGRESSION_ADD_OPTIONS.left,
      top: params.top ?? TEXT_RESIZING_REGRESSION_ADD_OPTIONS.top,
      addOptions: TEXT_RESIZING_REGRESSION_ADD_OPTIONS,
      secondLineStyle: TEXT_RESIZING_REGRESSION_SECOND_LINE_STYLE,
      lineDefaults: TEXT_RESIZING_REGRESSION_LINE_DEFAULTS
    })

    const createdTextObject = this.checkCreation({ textObject })

    await waitForCanvasRender({ page: this.page })

    const settledTextObject = await this.getObject({ id: createdTextObject.id })

    return this.checkCreation({ textObject: settledTextObject })
  }

  /** Applies a regression text-object template and returns the inserted object. */
  async applyRegressionTemplate(): Promise<TextObjectInfo> {
    const textObject = await this.applyTemplate({
      template: TEXT_RESIZING_REGRESSION_TEMPLATE
    })

    return this.checkCreation({ textObject })
  }

  /** Applies a text-only template and returns the first inserted text object. */
  async applyTemplate(params: TextTemplateApplyParams): Promise<TextObjectInfo | null> {
    const appliedTextObject = await this.page.evaluate(async({ template }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const objects = await editor.templateManager.applyTemplate({ template })
      if (!Array.isArray(objects) || objects.length === 0) return null

      const insertedTextObject = objects.find((object: any) => {
        return object?.type === 'textbox' || object?.type === 'background-textbox'
      })
      if (!insertedTextObject) return null

      return helpers.serializeTextObject(insertedTextObject)
    }, params)

    if (!appliedTextObject) return null

    await waitForCanvasRender({ page: this.page })

    if (typeof appliedTextObject.id !== 'string') return appliedTextObject

    return this.getObject({ id: appliedTextObject.id })
  }

  /** Returns a text object by ID or canvas index. */
  async getObject(params: ObjectTargetParams = {}): Promise<TextObjectInfo | null> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return helpers.serializeTextObject(target)
    }, params)
  }

  /** Makes a text object the active canvas object. */
  async select(params: ObjectTargetParams = {}): Promise<TextObjectInfo | null> {
    const textObject = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      editor.canvas.requestRenderAll()

      return helpers.serializeTextObject(target)
    }, params)

    if (!textObject) return null

    await waitForCanvasRender({ page: this.page })

    const settledParams = typeof textObject.id === 'string'
      ? { id: textObject.id }
      : params

    return this.getObject(settledParams)
  }

  /** Clicks a text object with a real mouse in browser-window coordinates. */
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

    expect(point, 'для клика по тексту должны существовать координаты на canvas').not.toBeNull()

    if (!point) {
      throw new Error('для клика по тексту должны существовать координаты на canvas')
    }

    await this.page.mouse.click(point.x, point.y)
    await waitForCanvasRender({ page: this.page })
  }

  /** Opens text editing with a real double-click on the canvas. */
  async openTextEditingFromCanvas(params: ObjectTargetParams = {}): Promise<TextObjectInfo | null> {
    const point = await this._resolveTargetCenterPoint(params)

    await this.page.mouse.dblclick(point.x, point.y)
    await waitForCanvasRender({ page: this.page })

    return this.getObject(params)
  }

  /** Updates a text object's style through the public TextManager API. */
  async updateStyle(params: TextUpdateStyleParams): Promise<TextObjectInfo | null> {
    const textObject = await this.page.evaluate(({
      style,
      objectIndex,
      id,
      selectionRange,
      syncLineStylesWithText
    }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      const result = editor.textManager.updateText({
        target,
        style,
        selectionRange,
        syncLineStylesWithText
      })
      if (!result) return null

      return helpers.serializeTextObject(result)
    }, params)

    if (!textObject) return null

    await waitForCanvasRender({ page: this.page })

    const settledParams = typeof textObject.id === 'string'
      ? { id: textObject.id }
      : params

    return this.getObject(settledParams)
  }

  /** Enables text-editing mode for a standalone text object. */
  async enterTextEditing(params: ObjectTargetParams = {}): Promise<TextObjectInfo | null> {
    const textObject = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      target.enterEditing()
      target.selectAll()
      editor.canvas.requestRenderAll()

      return helpers.serializeTextObject(target)
    }, params)

    if (!textObject) return null

    await waitForCanvasRender({ page: this.page })

    const settledParams = typeof textObject.id === 'string'
      ? { id: textObject.id }
      : params

    return this.getObject(settledParams)
  }

  /** Changes text in a text object's active editing mode. */
  async updateEditingText(params: TextEditingUpdateParams): Promise<TextObjectInfo | null> {
    const textObject = await this.page.evaluate((payload) => {
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

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      const { hiddenTextarea } = target
      const nextSelectionStart = typeof selectionStart === 'number' ? selectionStart : text.length
      const nextSelectionEnd = typeof selectionEnd === 'number' ? selectionEnd : nextSelectionStart

      if (hiddenTextarea instanceof HTMLTextAreaElement) {
        hiddenTextarea.value = text
        hiddenTextarea.selectionStart = nextSelectionStart
        hiddenTextarea.selectionEnd = nextSelectionEnd
        hiddenTextarea.dispatchEvent(new Event('input', { bubbles: true }))
      } else {
        target.set({ text })
        target.selectionStart = nextSelectionStart
        target.selectionEnd = nextSelectionEnd
        editor.canvas.fire('text:changed', {
          target
        })
        editor.canvas.requestRenderAll()
      }

      return helpers.serializeTextObject(target)
    }, params)

    if (!textObject) return null

    await waitForCanvasRender({ page: this.page })

    const settledParams = typeof textObject.id === 'string'
      ? { id: textObject.id }
      : params

    return this.getObject(settledParams)
  }

  /** Finishes a text object's editing mode. */
  async exitTextEditing(params: ObjectTargetParams = {}): Promise<TextObjectInfo | null> {
    const textObject = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      target.exitEditing()
      editor.canvas.requestRenderAll()

      return helpers.serializeTextObject(target)
    }, params)

    if (!textObject) return null

    await waitForCanvasRender({ page: this.page })

    const settledParams = typeof textObject.id === 'string'
      ? { id: textObject.id }
      : params

    return this.getObject(settledParams)
  }

  /** Sets the text selection range in editing mode. */
  async setTextSelection(params: TextSelectionParams): Promise<TextObjectInfo | null> {
    return this.page.evaluate(({ start, end, objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      if (typeof target.setSelectionStart === 'function') {
        target.setSelectionStart(start)
      } else {
        target.selectionStart = start
      }

      if (typeof target.setSelectionEnd === 'function') {
        target.setSelectionEnd(end)
      } else {
        target.selectionEnd = end
      }
      const { hiddenTextarea } = target

      if (hiddenTextarea instanceof HTMLTextAreaElement) {
        hiddenTextarea.focus()
        hiddenTextarea.selectionStart = start
        hiddenTextarea.selectionEnd = end
      }

      return helpers.serializeTextObject(target)
    }, params)
  }

  /** Deletes selected text through a real keyboard event. */
  async deleteSelectedText(params: ObjectTargetParams = {}): Promise<TextObjectInfo | null> {
    await this.page.keyboard.press('Delete')
    await waitForCanvasRender({ page: this.page })

    return this.getObject(params)
  }

  /** Types text at the current cursor position through real keyboard events. */
  async typeText(params: { text: string } & ObjectTargetParams): Promise<TextObjectInfo | null> {
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

    return this.getObject(targetParams)
  }

  /** Returns the style of the current or explicit text selection range. */
  async getSelectionStyles(
    params: Partial<TextSelectionParams> & ObjectTargetParams = {}
  ): Promise<TextSelectionStyleInfo | null> {
    return this.page.evaluate((payload) => {
      const {
        __editorHelpers: helpers
      } = window as any

      return helpers.getTextSelectionStyles(payload)
    }, params)
  }

  /** Rotates a text object by the specified angle. */
  async rotate(params: TextRotateParams): Promise<TextObjectInfo | null> {
    const textObject = await this.page.evaluate(({ angle, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      target.set({ angle })
      target.setCoords()
      editor.canvas.requestRenderAll()

      return helpers.serializeTextObject(target)
    }, params)

    if (!textObject) return null

    await waitForCanvasRender({ page: this.page })

    const settledParams = typeof textObject.id === 'string'
      ? { id: textObject.id }
      : params

    return this.getObject(settledParams)
  }

  /** Applies an inline style to a text-object range. */
  async setRangeStyle(params: TextRangeStyleParams): Promise<TextObjectInfo | null> {
    const textObject = await this.page.evaluate(({ start, end, style, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      target.setSelectionStyles(style, start, end)
      target.setCoords()
      editor.canvas.requestRenderAll()

      return helpers.serializeTextObject(target)
    }, params)

    if (!textObject) return null

    await waitForCanvasRender({ page: this.page })

    const settledParams = typeof textObject.id === 'string'
      ? { id: textObject.id }
      : params

    return this.getObject(settledParams)
  }

  /** Returns the current text state during width changes. */
  async getResizeSnapshot(params: ObjectTargetParams = {}): Promise<TextResizeSnapshot> {
    return this.resizeSession.getResizeSnapshot(params)
  }

  /** Changes text width from the right to the specified value. */
  async resizeFromRightToWidth(params: TextResizeFromRightParams): Promise<TextResizeSnapshot> {
    return this.resizeSession.resizeFromRightToWidth(params)
  }

  /** Changes text width from the left to the specified value. */
  async resizeFromLeftToWidth(params: TextResizeFromLeftParams): Promise<TextResizeSnapshot> {
    return this.resizeSession.resizeFromLeftToWidth(params)
  }

  /** Continues the side-handle drag with relative pointer movement. */
  async continueResizeHandleBy(params: TextResizeContinueParams): Promise<TextResizeSnapshot> {
    return this.resizeSession.continueResizeHandleBy(params)
  }

  /** Brings the text's right boundary to the specified vertical guide. */
  async resizeFromRightToGuide(
    params: {
      centered?: boolean
      x: number
    } & ObjectTargetParams
  ): Promise<TextResizeSnapshot> {
    return this.resizeSession.resizeFromRightToGuide(params)
  }

  /** Brings the text's left boundary to the specified vertical guide. */
  async resizeFromLeftToGuide(
    params: {
      centered?: boolean
      x: number
    } & ObjectTargetParams
  ): Promise<TextResizeSnapshot> {
    return this.resizeSession.resizeFromLeftToGuide(params)
  }

  /** Brings the selected side handle's outer edge to a guide. */
  async resizeSideToGuide(params: TextResizeToGuideParams): Promise<TextResizeSnapshot> {
    return this.resizeSession.resizeSideToGuide(params)
  }

  /** Narrows the text object from the right to the first state where text wraps onto a new line. */
  async resizeFromRightUntilTextWraps(
    params: TextResizeUntilWrapParams = {}
  ): Promise<TextResizeSnapshot> {
    return this.resizeSession.resizeFromRightUntilTextWraps(params)
  }

  /** Narrows the text object from the left to the first state where text wraps onto a new line. */
  async resizeFromLeftUntilTextWraps(
    params: TextResizeUntilWrapParams = {}
  ): Promise<TextResizeSnapshot> {
    return this.resizeSession.resizeFromLeftUntilTextWraps(params)
  }

  /** Finishes the handle drag or sends a final event for an already modified object. */
  async finishResize(params: ObjectTargetParams = {}): Promise<TextResizeSnapshot> {
    return this.resizeSession.finishResize(params)
  }

  /** Finishes the width change if the side handle is still captured. */
  async finishResizeIfActive(): Promise<TextResizeSnapshot | null> {
    return this.resizeSession.finishResizeIfActive()
  }

  /** Scales a text object vertically from the bottom-right corner without changing its width. */
  async scaleVerticallyFromBottom(
    params: { scaleY: number } & ObjectTargetParams
  ): Promise<TextResizeSnapshot> {
    const {
      scaleY,
      objectIndex,
      id
    } = params

    return this._performInteractiveScaleStep({
      scaleX: 1,
      scaleY,
      corner: 'br',
      objectIndex,
      id
    })
  }

  /** Scales a text object horizontally with the right handle. */
  async scaleHorizontallyFromRight(
    params: { scaleX: number, ctrlKey?: boolean } & ObjectTargetParams
  ): Promise<TextResizeSnapshot> {
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

  /** Scales a text object diagonally from the bottom-right corner. */
  async scaleDiagonallyFromBottomRight(
    params: { scaleX: number, scaleY: number } & ObjectTargetParams
  ): Promise<TextResizeSnapshot> {
    const {
      scaleX,
      scaleY,
      objectIndex,
      id
    } = params

    return this._performInteractiveScaleStep({
      scaleX,
      scaleY,
      corner: 'br',
      objectIndex,
      id
    })
  }

  /** Narrows text diagonally to the state beyond which it no longer shrinks. */
  async shrinkDiagonallyToMinimumSize(params: ObjectTargetParams = {}): Promise<TextResizeSnapshot> {
    const {
      objectIndex,
      id
    } = params
    const initialShrinkScale = 0.2
    const maximumAttempts = 5
    const stabilityTolerance = 0.01

    let currentSnapshot = await this.scaleDiagonallyFromBottomRight({
      scaleX: initialShrinkScale,
      scaleY: initialShrinkScale,
      objectIndex,
      id
    })

    for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
      const nextSnapshot = await this.scaleDiagonallyFromBottomRight({
        scaleX: TEXT_DIAGONAL_MINIMUM_PROBE_SCALING_FACTOR,
        scaleY: TEXT_DIAGONAL_MINIMUM_PROBE_SCALING_FACTOR,
        objectIndex,
        id
      })
      const widthChange = Math.abs(nextSnapshot.width - currentSnapshot.width)
      const fontSizeChange = Math.abs(nextSnapshot.fontSize - currentSnapshot.fontSize)

      currentSnapshot = nextSnapshot

      if (widthChange <= stabilityTolerance && fontSizeChange <= stabilityTolerance) {
        return currentSnapshot
      }
    }

    return currentSnapshot
  }

  /** Finishes text scaling started through a direct Fabric-handler call. */
  async finishScale(params: ObjectTargetParams = {}): Promise<TextResizeSnapshot> {
    if (this.activeScaleInteraction && this._matchesActiveScaleTarget(params)) {
      const interaction = this.activeScaleInteraction
      const snapshot = await this._finishFabricScaleInteraction(interaction)

      this.activeScaleInteraction = null

      expect(snapshot, 'должно существовать состояние после завершения скейлинга текстового объекта').not.toBeNull()
      expect(snapshot.width, 'ширина текста после скейлинга должна быть положительной').toBeGreaterThan(0)

      return snapshot
    }

    return this._finishModifiedTransform(params)
  }

  /** Finishes text scaling started through a direct Fabric-handler call. */
  private async _finishFabricScaleInteraction(
    interaction: ActiveTextScaleInteraction
  ): Promise<TextResizeSnapshot> {
    const snapshot = await this.page.evaluate((payload) => {
      const { point, corner, objectIndex, id } = payload
      const { editor, __editorHelpers: helpers } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      target.setCoords()
      const control = target.oCoords?.[corner]
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const releasePoint = control && Number.isFinite(control.x) && Number.isFinite(control.y)
        ? { x: rect.left + control.x, y: rect.top + control.y }
        : point

      editor.canvas.__onMouseUp(new MouseEvent('mouseup', {
        bubbles: true,
        button: 0,
        buttons: 0,
        clientX: releasePoint.x,
        clientY: releasePoint.y
      }))

      return helpers.serializeTextResizeSnapshot(target)
    }, interaction)

    expect(snapshot, 'Fabric mouseup должен вернуть snapshot текста').not.toBeNull()
    expect(Number.isFinite(snapshot?.width), 'ширина текста после Fabric mouseup должна быть конечной').toBe(true)

    await waitForCanvasRender({ page: this.page })

    return snapshot as TextResizeSnapshot
  }

  /** Finishes scaling if the text handle is still captured. */
  async finishScaleIfActive(): Promise<TextResizeSnapshot | null> {
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

  /** Moves the mouse pointer away from the text object and returns its current state. */
  async movePointerAwayFromObject(
    params: {
      offsetX?: number
      offsetY?: number
    } & ObjectTargetParams = {}
  ): Promise<TextResizeSnapshot> {
    const {
      offsetX = 180,
      offsetY = -120,
      objectIndex,
      id
    } = params
    const point = await this.page.evaluate((payload) => {
      const {
        offsetX: pointerOffsetX,
        offsetY: pointerOffsetY,
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
      const minX = canvasRect.left + 10
      const maxX = canvasRect.right - 10
      const minY = canvasRect.top + 10
      const maxY = canvasRect.bottom - 10

      return {
        x: Math.min(Math.max(canvasRect.left + viewportX + pointerOffsetX, minX), maxX),
        y: Math.min(Math.max(canvasRect.top + viewportY + pointerOffsetY, minY), maxY)
      }
    }, {
      offsetX,
      offsetY,
      objectIndex,
      id
    })

    expect(point, 'для движения мыши в сторону от текста должны существовать координаты на canvas').not.toBeNull()

    await this.page.mouse.move(point!.x, point!.y)
    await waitForCanvasRender({ page: this.page })

    return this.getResizeSnapshot({
      objectIndex,
      id
    })
  }

  /** Checks that the text object was created and returns a non-null object. */
  checkCreation(params: { textObject: TextObjectInfo | null }): TextObjectInfo {
    const { textObject } = params

    expect(textObject, 'текстовый объект должен быть создан').not.toBeNull()

    return textObject as TextObjectInfo
  }

  /** Performs one text-scaling step without releasing the handle. */
  private async _performInteractiveScaleStep(
    params: {
      scaleX: number
      scaleY: number
      corner: 'mb' | 'br' | 'mr'
      ctrlKey?: boolean
    } & ObjectTargetParams
  ): Promise<TextResizeSnapshot> {
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
      let activeOriginX: 'left' | 'center' = 'left'
      if (typeof transform.originX === 'string') {
        activeOriginX = transform.originX as 'left' | 'center'
      } else if (activeCorner === 'mb') {
        activeOriginX = 'center'
      }
      const activeOriginY = typeof transform.originY === 'string'
        ? transform.originY
        : 'top'
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const anchorPoint = target.getPointByOrigin(activeOriginX, activeOriginY)
      const previousLeft = typeof target.left === 'number' ? target.left : 0
      const previousTop = typeof target.top === 'number' ? target.top : 0
      const previousScaleX = typeof target.scaleX === 'number' ? target.scaleX : 1
      const previousScaleY = typeof target.scaleY === 'number' ? target.scaleY : 1
      const currentControl = target.oCoords?.[activeCorner]
      const isVerticalOnlyScale = activeCorner === 'br' && Math.abs(scaleX - 1) < 0.000001

      if (
        !currentControl
        || typeof currentControl.x !== 'number'
        || typeof currentControl.y !== 'number'
      ) {
        return null
      }

      target.set({
        scaleX,
        scaleY
      })
      target.setPositionByOrigin(anchorPoint, activeOriginX, activeOriginY)
      target.setCoords()

      const scaledControl = target.oCoords?.[activeCorner]
      if (
        !scaledControl
        || typeof scaledControl.x !== 'number'
        || typeof scaledControl.y !== 'number'
      ) {
        target.set({
          left: previousLeft,
          top: previousTop,
          scaleX: previousScaleX,
          scaleY: previousScaleY
        })
        target.setCoords()

        return null
      }

      target.set({
        left: previousLeft,
        top: previousTop,
        scaleX: previousScaleX,
        scaleY: previousScaleY
      })
      target.setCoords()

      const controlPoint = {
        x: rect.left + scaledControl.x,
        y: rect.top + scaledControl.y
      }

      if (isVerticalOnlyScale) {
        target.set({
          scaleX: 1,
          scaleY
        })
        target.setCoords()

        const previousAction = transform.action
        const previousCorner = transform.corner
        const previousTransformScaleX = transform.scaleX
        const previousTransformScaleY = transform.scaleY
        const previousSignX = transform.signX
        const previousSignY = transform.signY

        try {
          transform.action = 'scaleY'
          transform.corner = 'mb'
          transform.scaleX = 1
          transform.scaleY = scaleY
          transform.signX = 1
          transform.signY = 1
          editor.canvas.fire('object:scaling', {
            target,
            e: {},
            transform
          })
        } finally {
          transform.action = previousAction
          transform.corner = previousCorner
          transform.scaleX = previousTransformScaleX
          transform.scaleY = previousTransformScaleY
          transform.signX = previousSignX
          transform.signY = previousSignY
        }
      } else {
        editor.canvas.__onMouseMove(new MouseEvent('mousemove', {
          bubbles: true,
          button: 0,
          buttons: 1,
          clientX: controlPoint.x,
          clientY: controlPoint.y,
          ctrlKey
        }))
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
        snapshot: helpers.serializeTextResizeSnapshot(target)
      }
    }, params)

    expect(result, 'должно существовать состояние live scale текстового объекта').not.toBeNull()

    await waitForCanvasRender({ page: this.page })

    const {
      point,
      snapshot
    } = result as {
      point: {
        x: number
        y: number
      }
      snapshot: TextResizeSnapshot
    }

    this.activeScaleInteraction = {
      point,
      corner: params.corner,
      objectIndex: params.objectIndex,
      id: params.id
    }

    return snapshot
  }

  /** Finishes a text object's interactive transform through object:modified. */
  private async _finishModifiedTransform(params: ObjectTargetParams): Promise<TextResizeSnapshot> {
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

      return helpers.serializeTextResizeSnapshot(target)
    }, params)

    expect(snapshot, 'должно существовать состояние после завершения трансформации текстового объекта').not.toBeNull()

    return snapshot as TextResizeSnapshot
  }

  private async _startScaleInteractionIfNeeded(
    params: {
      corner: 'mb' | 'br' | 'mr'
    } & ObjectTargetParams
  ): Promise<void> {
    const {
      corner,
      objectIndex,
      id
    } = params

    if (this.activeScaleInteraction) {
      expect(
        this._matchesActiveScaleTarget({
          objectIndex,
          id
        }),
        'нельзя продолжать активную drag-сессию scale для другого текстового объекта'
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
        clientY: pointInfo.y
      }))

      const transform = editor.canvas._currentTransform
      if (!transform || transform.target !== target) {
        return null
      }

      return pointInfo
    }, {
      corner,
      objectIndex,
      id
    })

    expect(point, 'должна существовать стартовая точка для интерактивного scale текста').not.toBeNull()

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
