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
