import { test as base } from '@playwright/test'
import { EditorModel } from '../models/editor.model'
import { ShapeModel } from '../models/shape.model'
import { CanvasModel } from '../models/canvas.model'
import { HistoryModel } from '../models/history.model'
import { bypassCertificateWarning } from '../helpers/certificate.helper'
import { injectEditorBrowserHelpers } from '../helpers/editor-browser-helpers.helper'

interface EditorFixtures {
  editorModel: EditorModel
  shapes: ShapeModel
  canvas: CanvasModel
  history: HistoryModel
}

export const test = base.extend<EditorFixtures>({
  editorModel: async({ page }, use) => {
    const model = new EditorModel(page)
    await injectEditorBrowserHelpers({ page })
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
  },

  history: async({ editorModel }, use) => {
    await use(editorModel.history)
  }
})

export { expect } from '@playwright/test'
