import { test as base } from '@playwright/test'
import { EditorModel } from '../models/editor.model'
import { ShapeModel } from '../models/shape.model'
import { CanvasModel } from '../models/canvas.model'
import { bypassCertificateWarning } from '../helpers/certificate.helper'

interface EditorFixtures {
  editorModel: EditorModel
  shapes: ShapeModel
  canvas: CanvasModel
}

export const test = base.extend<EditorFixtures>({
  editorModel: async({ page }, use) => {
    const model = new EditorModel(page)
    await model.injectBrowserHelpers()
    await page.goto('/')
    await bypassCertificateWarning({ page })
    await model.waitForReady()
    await use(model)
  },

  shapes: async({ editorModel }, use) => {
    await use(editorModel.shapes)
  },

  canvas: async({ editorModel }, use) => {
    await use(editorModel.canvas)
  }
})

export { expect } from '@playwright/test'
