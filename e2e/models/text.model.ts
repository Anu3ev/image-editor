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
  TextRotateParams,
  TextSelectionParams,
  TextSelectionStyleInfo,
  TextTemplateApplyParams,
  TextUpdateStyleParams
} from '../types'
import {
  TEXT_RESIZING_REGRESSION_ADD_OPTIONS,
  TEXT_RESIZING_REGRESSION_LINE_DEFAULTS,
  TEXT_RESIZING_REGRESSION_SECOND_LINE_STYLE,
  TEXT_RESIZING_REGRESSION_TEMPLATE
} from '../fixtures/data/text-resizing.data'

export class TextModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Добавляет текстовый объект на canvas. */
  async add(params: TextAddParams = {}): Promise<TextObjectInfo | null> {
    return this.page.evaluate((payload) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const textbox = editor.textManager.addText(payload)

      return helpers.serializeTextObject(textbox)
    }, params)
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

    return this.checkCreation({ textObject })
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
    return this.page.evaluate(async({ template }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const objects = await editor.templateManager.applyTemplate({ template })
      if (!Array.isArray(objects) || objects.length === 0) return null

      const textObject = objects.find((object: any) => {
        return object?.type === 'textbox' || object?.type === 'background-textbox'
      })
      if (!textObject) return null

      return helpers.serializeTextObject(textObject)
    }, params)
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
    return this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      editor.canvas.setActiveObject(target)

      return helpers.serializeTextObject(target)
    }, params)
  }

  /** Обновляет стиль текстового объекта через публичный API TextManager. */
  async updateStyle(params: TextUpdateStyleParams): Promise<TextObjectInfo | null> {
    return this.page.evaluate(({ style, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      const result = editor.textManager.updateText({
        target,
        style
      })
      if (!result) return null

      return helpers.serializeTextObject(result)
    }, params)
  }

  /** Включает режим редактирования текста у отдельного текстового объекта. */
  async enterTextEditing(params: ObjectTargetParams = {}): Promise<TextObjectInfo | null> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      target.isEditing = true
      target.enterEditing()
      target.selectAll()
      editor.canvas.fire('text:editing:entered', {
        target
      })

      return helpers.serializeTextObject(target)
    }, params)
  }

  /** Меняет текст в активном режиме редактирования текстового объекта. */
  async updateEditingText(params: TextEditingUpdateParams): Promise<TextObjectInfo | null> {
    return this.page.evaluate(({ text, objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      target.set({ text })
      editor.canvas.fire('text:changed', {
        target
      })

      return helpers.serializeTextObject(target)
    }, params)
  }

  /** Завершает режим редактирования текстового объекта. */
  async exitTextEditing(params: ObjectTargetParams = {}): Promise<TextObjectInfo | null> {
    return this.page.evaluate(({ objectIndex, id }) => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      target.exitEditing()
      target.isEditing = false
      editor.canvas.fire('text:editing:exited', {
        target
      })

      return helpers.serializeTextObject(target)
    }, params)
  }

  /** Устанавливает диапазон выделения текста в режиме редактирования. */
  async setTextSelection(params: TextSelectionParams): Promise<TextObjectInfo | null> {
    return this.page.evaluate(({ start, end, objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      target.selectionStart = start
      target.selectionEnd = end

      return helpers.serializeTextObject(target)
    }, params)
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
    return this.page.evaluate(({ angle, objectIndex, id }) => {
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
  }

  /** Применяет inline-стиль к диапазону текстового объекта. */
  async setRangeStyle(params: TextRangeStyleParams): Promise<TextObjectInfo | null> {
    return this.page.evaluate(({ start, end, style, objectIndex, id }) => {
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

    return this.simulateResizeStep({
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

    return this.simulateResizeStep({
      width,
      corner: 'ml',
      originX: 'right',
      originY,
      ctrlKey,
      objectIndex,
      id
    })
  }

  /** Завершает интерактивный resize текстового объекта через object:modified. */
  async finishResize(params: ObjectTargetParams = {}): Promise<TextResizeSnapshot> {
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

    expect(snapshot, 'должно существовать состояние после завершения resize текстового объекта').not.toBeNull()

    return snapshot as TextResizeSnapshot
  }

  /** Проверяет что текстовый объект был создан и возвращает non-null объект. */
  checkCreation(params: { textObject: TextObjectInfo | null }): TextObjectInfo {
    const { textObject } = params

    expect(textObject, 'текстовый объект должен быть создан').not.toBeNull()

    return textObject as TextObjectInfo
  }

  /** Выполняет один live-шаг horizontal resize текстового объекта с теми же предусловиями, что и Fabric. */
  private async simulateResizeStep(params: TextResizeStepParams): Promise<TextResizeSnapshot> {
    const snapshot = await this.page.evaluate((payload) => {
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

      const paddingLeft = typeof target.paddingLeft === 'number' ? target.paddingLeft : 0
      const paddingRight = typeof target.paddingRight === 'number' ? target.paddingRight : 0
      const anchorPoint = target.getPointByOrigin(originX, originY)
      const visualWidth = Math.max(1, width + paddingLeft + paddingRight)

      // Эмулируем состояние объекта после fabric changeWidth + wrapWithFixedAnchor
      // и только потом отправляем object:resizing в TextManager.
      target.set({ width: visualWidth })
      target.setPositionByOrigin(anchorPoint, originX, originY)
      target.setCoords()

      editor.canvas.fire('object:resizing', {
        target,
        e: {
          ctrlKey
        },
        transform: {
          corner,
          originX,
          originY
        }
      })

      return helpers.serializeTextResizeSnapshot(target)
    }, params)

    expect(snapshot, 'должно существовать состояние live resize текстового объекта').not.toBeNull()

    return snapshot as TextResizeSnapshot
  }
}
