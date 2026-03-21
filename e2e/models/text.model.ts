/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  ObjectTargetParams,
  TextAddParams,
  TextObjectInfo,
  TextRangeStyleParams,
  TextResizeFromLeftParams,
  TextResizeFromRightParams,
  TextResizeSnapshot,
  TextResizeStepParams,
  TextRotateParams,
  TextTemplateApplyParams
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

  /** Добавляет standalone text-объект на canvas. */
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

  /** Добавляет regression text-объект в том же состоянии, что и новый standalone объект. */
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

  /** Применяет regression template standalone text-объекта и возвращает вставленный text. */
  async applyRegressionTemplate(): Promise<TextObjectInfo> {
    const textObject = await this.applyTemplate({
      template: TEXT_RESIZING_REGRESSION_TEMPLATE
    })

    return this.checkCreation({ textObject })
  }

  /** Применяет text-only template и возвращает первый вставленный standalone text-объект. */
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

  /** Возвращает standalone text-объект по id или индексу canvas. */
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

  /** Делает standalone text активным объектом canvas. */
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

  /** Поворачивает standalone text-объект на заданный угол. */
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

  /** Применяет inline-стиль к диапазону standalone text-объекта. */
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

  /** Возвращает текущий resize snapshot standalone text-объекта. */
  async getResizeSnapshot(params: ObjectTargetParams = {}): Promise<TextResizeSnapshot> {
    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const {
        __editorHelpers: helpers
      } = window as any

      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      return helpers.serializeTextResizeSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать resize snapshot standalone text-объекта').not.toBeNull()

    return snapshot as TextResizeSnapshot
  }

  /** Выполняет live horizontal resize standalone text справа до заданной внутренней ширины. */
  async resizeFromRightToWidth(params: TextResizeFromRightParams): Promise<TextResizeSnapshot> {
    const {
      width,
      originY = 'top',
      objectIndex,
      id
    } = params

    return this.simulateResizeStep({
      width,
      corner: 'mr',
      originX: 'left',
      originY,
      objectIndex,
      id
    })
  }

  /** Выполняет live horizontal resize standalone text слева до заданной внутренней ширины. */
  async resizeFromLeftToWidth(params: TextResizeFromLeftParams): Promise<TextResizeSnapshot> {
    const {
      width,
      originY = 'top',
      objectIndex,
      id
    } = params

    return this.simulateResizeStep({
      width,
      corner: 'ml',
      originX: 'right',
      originY,
      objectIndex,
      id
    })
  }

  /** Завершает интерактивный resize standalone text через object:modified. */
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

    expect(snapshot, 'должен существовать snapshot после завершения standalone text resize').not.toBeNull()

    return snapshot as TextResizeSnapshot
  }

  /** Проверяет что standalone text был создан и возвращает non-null объект. */
  checkCreation(params: { textObject: TextObjectInfo | null }): TextObjectInfo {
    const { textObject } = params

    expect(textObject, 'standalone text-объект должен быть создан').not.toBeNull()

    return textObject as TextObjectInfo
  }

  /** Выполняет один live-шаг horizontal resize standalone text с теми же предусловиями, что и Fabric. */
  private async simulateResizeStep(params: TextResizeStepParams): Promise<TextResizeSnapshot> {
    const snapshot = await this.page.evaluate((payload) => {
      const {
        width,
        corner,
        originX,
        originY,
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
        transform: {
          corner,
          originX,
          originY
        }
      })

      return helpers.serializeTextResizeSnapshot(target)
    }, params)

    expect(snapshot, 'должен существовать live snapshot standalone text resize').not.toBeNull()

    return snapshot as TextResizeSnapshot
  }
}
