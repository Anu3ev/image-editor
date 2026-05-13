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
  TextResizeSnapshot,
  TextResizeStepParams,
  TextResizeUntilWrapParams,
  TextRotateParams,
  TextSelectionParams,
  TextSelectionStyleInfo,
  TextTemplateApplyParams,
  TextUpdateStyleParams
} from '../types'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'
import {
  TEXT_DIAGONAL_MINIMUM_PROBE_SCALING_FACTOR,
  TEXT_RESIZING_REGRESSION_ADD_OPTIONS,
  TEXT_RESIZING_REGRESSION_LINE_DEFAULTS,
  TEXT_RESIZING_REGRESSION_SECOND_LINE_STYLE,
  TEXT_RESIZING_REGRESSION_TEMPLATE
} from '../fixtures/data/text-resizing.data'

export class TextModel {
  private readonly page: Page

  private activeResizeInteraction: {
    point: {
      x: number
      y: number
    }
    corner: 'ml' | 'mr'
    originX: 'left' | 'right'
    originY: 'top' | 'center' | 'bottom'
    objectIndex?: number
    id?: string
  } | null

  private activeScaleInteraction: {
    point: {
      x: number
      y: number
    }
    corner: 'mb' | 'br' | 'mr'
    objectIndex?: number
    id?: string
  } | null

  constructor(page: Page) {
    this.page = page
    this.activeResizeInteraction = null
    this.activeScaleInteraction = null
  }

  /** Возвращает viewport-координаты центра текста для реальных mouse-событий. */
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

  /** Добавляет текстовый объект на canvas. */
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

  /** Добавляет regression text-объект в том же состоянии, что и новый отдельный текстовый объект. */
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

  /** Применяет regression template текстового объекта и возвращает вставленный объект. */
  async applyRegressionTemplate(): Promise<TextObjectInfo> {
    const textObject = await this.applyTemplate({
      template: TEXT_RESIZING_REGRESSION_TEMPLATE
    })

    return this.checkCreation({ textObject })
  }

  /** Применяет text-only template и возвращает первый вставленный текстовый объект. */
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

  /** Возвращает текстовый объект по id или индексу canvas. */
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

  /** Делает текстовый объект активным объектом canvas. */
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

  /** Кликает по текстовому объекту на canvas через реальные координаты viewport. */
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

  /** Открывает редактирование текста через реальный двойной клик по canvas. */
  async openTextEditingFromCanvas(params: ObjectTargetParams = {}): Promise<TextObjectInfo | null> {
    const point = await this._resolveTargetCenterPoint(params)

    await this.page.mouse.dblclick(point.x, point.y)
    await waitForCanvasRender({ page: this.page })

    return this.getObject(params)
  }

  /** Обновляет стиль текстового объекта через публичный API TextManager. */
  async updateStyle(params: TextUpdateStyleParams): Promise<TextObjectInfo | null> {
    const textObject = await this.page.evaluate(({ style, objectIndex, id, syncLineStylesWithText }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      const result = editor.textManager.updateText({
        target,
        style,
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

  /** Включает режим редактирования текста у отдельного текстового объекта. */
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

  /** Меняет текст в активном режиме редактирования текстового объекта. */
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

  /** Завершает режим редактирования текстового объекта. */
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

  /** Устанавливает диапазон выделения текста в режиме редактирования. */
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

  /** Удаляет выделенный текст через реальное keyboard-событие. */
  async deleteSelectedText(params: ObjectTargetParams = {}): Promise<TextObjectInfo | null> {
    await this.page.keyboard.press('Delete')
    await waitForCanvasRender({ page: this.page })

    return this.getObject(params)
  }

  /** Вводит текст в текущую позицию курсора через реальные keyboard-события. */
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

  /** Возвращает стиль текущего или явного выделенного диапазона текста. */
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

  /** Поворачивает текстовый объект на заданный угол. */
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

  /** Применяет inline-стиль к диапазону текстового объекта. */
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

  /** Возвращает текущее состояние resize текстового объекта. */
  async getResizeSnapshot(params: ObjectTargetParams = {}): Promise<TextResizeSnapshot> {
    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return helpers.serializeTextResizeSnapshot(target)
    }, params)

    expect(snapshot, 'должно существовать состояние resize текстового объекта').not.toBeNull()

    return snapshot as TextResizeSnapshot
  }

  /** Выполняет live horizontal resize текстового объекта справа до заданной внутренней ширины. */
  async resizeFromRightToWidth(params: TextResizeFromRightParams): Promise<TextResizeSnapshot> {
    const {
      width,
      originY = 'top',
      ctrlKey,
      objectIndex,
      id
    } = params

    return this._performInteractiveResizeStep({
      width,
      corner: 'mr',
      originX: 'left',
      originY,
      ctrlKey,
      objectIndex,
      id
    })
  }

  /** Выполняет live horizontal resize текстового объекта слева до заданной внутренней ширины. */
  async resizeFromLeftToWidth(params: TextResizeFromLeftParams): Promise<TextResizeSnapshot> {
    const {
      width,
      originY = 'top',
      ctrlKey,
      objectIndex,
      id
    } = params

    return this._performInteractiveResizeStep({
      width,
      corner: 'ml',
      originX: 'right',
      originY,
      ctrlKey,
      objectIndex,
      id
    })
  }

  /** Подводит правую границу текста к заданной вертикальной направляющей. */
  async resizeFromRightToGuide(
    params: {
      x: number
      originY?: 'top' | 'center' | 'bottom'
    } & ObjectTargetParams
  ): Promise<TextResizeSnapshot> {
    return this._resizeToGuide({
      edge: 'right',
      ...params
    })
  }

  /** Подводит левую границу текста к заданной вертикальной направляющей. */
  async resizeFromLeftToGuide(
    params: {
      x: number
      originY?: 'top' | 'center' | 'bottom'
    } & ObjectTargetParams
  ): Promise<TextResizeSnapshot> {
    return this._resizeToGuide({
      edge: 'left',
      ...params
    })
  }

  /** Сужает текстовый объект справа до первого состояния, где текст переносится на новую строку. */
  async resizeFromRightUntilTextWraps(
    params: TextResizeUntilWrapParams = {}
  ): Promise<TextResizeSnapshot> {
    return this._resizeUntilTextWraps({
      edge: 'right',
      ...params
    })
  }

  /** Сужает текстовый объект слева до первого состояния, где текст переносится на новую строку. */
  async resizeFromLeftUntilTextWraps(
    params: TextResizeUntilWrapParams = {}
  ): Promise<TextResizeSnapshot> {
    return this._resizeUntilTextWraps({
      edge: 'left',
      ...params
    })
  }

  /** Завершает активный resize через реальный mouseup, а без active drag-сессии завершает его через object:modified. */
  async finishResize(params: ObjectTargetParams = {}): Promise<TextResizeSnapshot> {
    if (this.activeResizeInteraction && this._matchesActiveResizeTarget(params)) {
      const {
        point,
        corner,
        objectIndex,
        id
      } = this.activeResizeInteraction
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

        return helpers.serializeTextResizeSnapshot(target)
      }, {
        point,
        corner,
        objectIndex,
        id
      })

      await waitForCanvasRender({ page: this.page })
      this.activeResizeInteraction = null

      expect(snapshot, 'должно существовать состояние после завершения resize текстового объекта').not.toBeNull()

      return snapshot as TextResizeSnapshot
    }

    return this._finishModifiedTransform(params)
  }

  /** Завершает активный интерактивный resize, если drag-сессия ещё открыта. */
  async finishResizeIfActive(): Promise<TextResizeSnapshot | null> {
    if (!this.activeResizeInteraction) return null

    const {
      objectIndex,
      id
    } = this.activeResizeInteraction

    return this.finishResize({
      objectIndex,
      id
    })
  }

  /** Масштабирует текстовый объект по вертикали через правый нижний угол, не меняя ширину. */
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

  /** Масштабирует текстовый объект по горизонтали за правую ручку. */
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

  /** Масштабирует текстовый объект по диагонали за правый нижний угол. */
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

  /** Сжимает текст по диагонали до стабильного live-состояния, где дальше он уже не уменьшается. */
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

  /** Завершает интерактивный scale текстового объекта через реальный mouseup. */
  async finishScale(params: ObjectTargetParams = {}): Promise<TextResizeSnapshot> {
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

        return helpers.serializeTextResizeSnapshot(target)
      }, {
        point,
        corner,
        objectIndex,
        id
      })

      await waitForCanvasRender({ page: this.page })
      this.activeScaleInteraction = null

      expect(snapshot, 'должно существовать состояние после завершения scale текстового объекта').not.toBeNull()

      return snapshot as TextResizeSnapshot
    }

    return this._finishModifiedTransform(params)
  }

  /** Завершает активный интерактивный scale, если drag-сессия ещё открыта. */
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

  /** Двигает указатель мыши в сторону от текстового объекта и возвращает его текущее состояние. */
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

  /** Проверяет что текстовый объект был создан и возвращает non-null объект. */
  checkCreation(params: { textObject: TextObjectInfo | null }): TextObjectInfo {
    const { textObject } = params

    expect(textObject, 'текстовый объект должен быть создан').not.toBeNull()

    return textObject as TextObjectInfo
  }

  /** Выполняет один live-шаг horizontal resize текста через настоящую drag-сессию Fabric. */
  private async _performInteractiveResizeStep(params: TextResizeStepParams): Promise<TextResizeSnapshot> {
    await this._startResizeInteractionIfNeeded(params)

    const result = await this.page.evaluate((payload) => {
      const {
        width,
        corner,
        originX,
        originY,
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
      const paddingLeft = typeof target.paddingLeft === 'number' ? target.paddingLeft : 0
      const paddingRight = typeof target.paddingRight === 'number' ? target.paddingRight : 0
      const anchorPoint = target.getPointByOrigin(activeOriginX, activeOriginY)
      const visualWidth = Math.max(1, width + paddingLeft + paddingRight)
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const previousWidth = typeof target.width === 'number' ? target.width : visualWidth
      const previousLeft = typeof target.left === 'number' ? target.left : 0
      const previousTop = typeof target.top === 'number' ? target.top : 0

      target.set({ width: visualWidth })
      target.setPositionByOrigin(anchorPoint, activeOriginX, activeOriginY)
      target.setCoords()

      const control = target.oCoords?.[activeCorner]
      if (!control || typeof control.x !== 'number' || typeof control.y !== 'number') {
        target.set({
          width: previousWidth,
          left: previousLeft,
          top: previousTop
        })
        target.setCoords()

        return null
      }

      const controlPoint = {
        x: rect.left + control.x,
        y: rect.top + control.y
      }

      target.set({
        width: previousWidth,
        left: previousLeft,
        top: previousTop
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

      // В synthetic resize-сессии одного __onMouseMove недостаточно:
      // TextManager слушает object:resizing и без него не применяет тот же live-path,
      // который пользователь получает в реальном браузерном resize.
      editor.canvas.fire('object:resizing', {
        target,
        e: {
          ctrlKey
        },
        transform
      })

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

    expect(result, 'должно существовать состояние live resize текстового объекта').not.toBeNull()

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

    this.activeResizeInteraction = {
      point,
      corner: params.corner,
      originX: params.originX,
      originY: params.originY,
      objectIndex: params.objectIndex,
      id: params.id
    }

    return snapshot
  }

  /** Сужает текстовый объект до первого live-состояния, где число строк увеличилось. */
  private async _resizeUntilTextWraps(
    params: {
      edge: 'left' | 'right'
    } & TextResizeUntilWrapParams
  ): Promise<TextResizeSnapshot> {
    const {
      edge,
      originY = 'top',
      ctrlKey,
      objectIndex,
      id
    } = params
    const minimumWidth = 40
    const widthStep = 12

    const initialSnapshot = await this.getResizeSnapshot({
      objectIndex,
      id
    })
    let currentSnapshot = initialSnapshot

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const nextWidth = Math.max(
        minimumWidth,
        Math.floor(currentSnapshot.width - widthStep)
      )

      if (nextWidth >= currentSnapshot.width) {
        break
      }

      currentSnapshot = edge === 'right'
        ? await this.resizeFromRightToWidth({
          width: nextWidth,
          originY,
          ctrlKey,
          objectIndex,
          id
        })
        : await this.resizeFromLeftToWidth({
          width: nextWidth,
          originY,
          ctrlKey,
          objectIndex,
          id
        })

      if (currentSnapshot.lineCount > initialSnapshot.lineCount) {
        return currentSnapshot
      }
    }

    expect(
      currentSnapshot.lineCount,
      'текст должен перейти на новую строку после сужения'
    ).toBeGreaterThan(initialSnapshot.lineCount)

    return currentSnapshot
  }

  private async _resizeToGuide(
    params: {
      edge: 'left' | 'right'
      x: number
      originY?: 'top' | 'center' | 'bottom'
    } & ObjectTargetParams
  ): Promise<TextResizeSnapshot> {
    const {
      edge,
      x,
      originY = 'top',
      objectIndex,
      id
    } = params
    const guideTolerance = 1.5

    let currentSnapshot = await this.getResizeSnapshot({
      objectIndex,
      id
    })
    let nextWidth = edge === 'right'
      ? x - currentSnapshot.boundsLeft - currentSnapshot.paddingLeft - currentSnapshot.paddingRight
      : currentSnapshot.boundsRight - x - currentSnapshot.paddingLeft - currentSnapshot.paddingRight

    for (let attempt = 0; attempt < 6; attempt += 1) {
      currentSnapshot = edge === 'right'
        ? await this.resizeFromRightToWidth({
          width: Math.max(1, nextWidth),
          originY,
          objectIndex,
          id
        })
        : await this.resizeFromLeftToWidth({
          width: Math.max(1, nextWidth),
          originY,
          objectIndex,
          id
        })

      const guideDelta = edge === 'right'
        ? x - currentSnapshot.boundsRight
        : currentSnapshot.boundsLeft - x

      if (Math.abs(guideDelta) <= guideTolerance) {
        return currentSnapshot
      }

      nextWidth += guideDelta
    }

    return currentSnapshot
  }

  /** Выполняет один live-шаг scale текстового объекта через активную drag-сессию. */
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

  /** Завершает интерактивную трансформацию текстового объекта через object:modified. */
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

  /** Открывает интерактивную drag-сессию resize для текстового объекта через реальный mousedown по ручке. */
  private async _startResizeInteractionIfNeeded(params: TextResizeStepParams): Promise<void> {
    const {
      corner,
      originX,
      originY,
      objectIndex,
      id
    } = params

    if (this.activeResizeInteraction) {
      expect(
        this._matchesActiveResizeTarget({
          objectIndex,
          id
        }),
        'нельзя начинать resize другого текстового объекта, пока не завершён текущий resize'
      ).toBe(true)
      expect(
        this.activeResizeInteraction.corner,
        'нельзя продолжать активную drag-сессию resize через другую ручку'
      ).toBe(corner)
      expect(
        this.activeResizeInteraction.originX,
        'нельзя продолжать активную drag-сессию resize с другой горизонтальной опорой'
      ).toBe(originX)
      expect(
        this.activeResizeInteraction.originY,
        'нельзя продолжать активную drag-сессию resize с другой вертикальной опорой'
      ).toBe(originY)

      return
    }

    const point = await this.page.evaluate((payload) => {
      const {
        corner: controlCorner,
        originX: resizeOriginX,
        originY: resizeOriginY,
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

      transform.originX = resizeOriginX
      transform.originY = resizeOriginY

      if (transform.original) {
        transform.original.originX = resizeOriginX
        transform.original.originY = resizeOriginY
      }

      return pointInfo
    }, {
      corner,
      originX,
      originY,
      objectIndex,
      id
    })

    expect(point, 'должна существовать стартовая точка для интерактивного resize текста').not.toBeNull()

    await waitForCanvasRender({ page: this.page })

    this.activeResizeInteraction = {
      point: point as {
        x: number
        y: number
      },
      corner,
      originX,
      originY,
      objectIndex,
      id
    }
  }

  private _matchesActiveResizeTarget(params: ObjectTargetParams): boolean {
    if (!this.activeResizeInteraction) return false

    const {
      objectIndex,
      id
    } = params

    if (typeof id === 'string') {
      return this.activeResizeInteraction.id === id
    }

    if (typeof objectIndex === 'number') {
      return this.activeResizeInteraction.objectIndex === objectIndex
    }

    return true
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
