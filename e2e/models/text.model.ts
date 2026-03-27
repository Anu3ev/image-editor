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

  private activeScaleInteraction: {
    point: {
      x: number
      y: number
    }
    corner: 'mb' | 'br'
    objectIndex?: number
    id?: string
  } | null

  constructor(page: Page) {
    this.page = page
    this.activeScaleInteraction = null
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
      target.enterEditing()
      target.selectAll()
      editor.canvas.requestRenderAll()

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

      const { hiddenTextarea } = target

      if (hiddenTextarea instanceof HTMLTextAreaElement) {
        hiddenTextarea.value = text
        hiddenTextarea.selectionStart = text.length
        hiddenTextarea.selectionEnd = text.length
        hiddenTextarea.dispatchEvent(new Event('input', { bubbles: true }))
      } else {
        target.set({ text })
        editor.canvas.fire('text:changed', {
          target
        })
        editor.canvas.requestRenderAll()
      }

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
      editor.canvas.requestRenderAll()

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
    return this._finishModifiedTransform(params)
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

      await this._waitForCanvasRender()
      this.activeScaleInteraction = null

      expect(snapshot, 'должно существовать состояние после завершения scale текстового объекта').not.toBeNull()

      return snapshot as TextResizeSnapshot
    }

    return this._finishModifiedTransform(params)
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

  /** Выполняет один live-шаг scale текстового объекта через активную drag-сессию. */
  private async _performInteractiveScaleStep(
    params: {
      scaleX: number
      scaleY: number
      corner: 'mb' | 'br'
    } & ObjectTargetParams
  ): Promise<TextResizeSnapshot> {
    await this._startScaleInteractionIfNeeded(params)

    const result = await this.page.evaluate((payload) => {
      const {
        scaleX,
        scaleY,
        corner,
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
          clientY: controlPoint.y
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

    await this._waitForCanvasRender()

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
      corner: 'mb' | 'br'
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

    await this._waitForCanvasRender()

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

  private async _waitForCanvasRender(): Promise<void> {
    await this.page.evaluate(async() => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })
    })
  }
}
