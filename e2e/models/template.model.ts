/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page } from '@playwright/test'
import type {
  SerializeTemplateParams,
  TemplateDefinition
} from '../types'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'

export class TemplateModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Обновляет текст первого shape-объекта в шаблоне.
   * Используется в regression-сценариях, где нужно проверить materialization
   * уже изменённого serialized template.
   */
  setFirstShapeText({
    template,
    text,
    shapeTextAutoExpand
  }: {
    template: TemplateDefinition
    text: string
    shapeTextAutoExpand?: boolean
  }): TemplateDefinition {
    const firstShapeObject = template.objects.find((object) => {
      return object.type === 'shape-group'
    })

    if (!firstShapeObject) {
      throw new Error('Template должен содержать хотя бы один shape-group')
    }

    if (shapeTextAutoExpand !== undefined) {
      firstShapeObject.shapeTextAutoExpand = shapeTextAutoExpand
    }

    const nestedObjects = firstShapeObject.objects

    if (!Array.isArray(nestedObjects)) {
      throw new Error('shape-group в шаблоне должен содержать вложенные объекты')
    }

    const textObject = nestedObjects.find((object) => {
      return object.shapeNodeType === 'text'
    })

    if (!textObject) {
      throw new Error('shape-group в шаблоне должен содержать текстовый узел')
    }

    textObject.text = text

    if (typeof textObject.textCaseRaw === 'string') {
      textObject.textCaseRaw = text
    }

    return template
  }

  /** Сериализует текущее выделение редактора в описание шаблона. */
  async serializeSelection(params: SerializeTemplateParams = {}): Promise<TemplateDefinition | null> {
    return this.page.evaluate((payload) => {
      const { editor } = window as any

      return editor.templateManager.serializeSelection(payload)
    }, params)
  }

  /** Применяет шаблон к текущему редактору. */
  async applyTemplate(params: { template: TemplateDefinition }): Promise<number> {
    const insertedCount = await this.page.evaluate(async({ template }) => {
      const { editor } = window as any
      const objects = await editor.templateManager.applyTemplate({ template })

      return Array.isArray(objects) ? objects.length : 0
    }, params)

    await waitForCanvasRender({ page: this.page })

    return insertedCount
  }
}
