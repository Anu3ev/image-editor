import { setTimeout as delay } from 'node:timers/promises'
import { test as base } from '@playwright/test'
import { EditorModel } from '../models/editor.model'
import { ShapeModel } from '../models/shape.model'
import { CanvasModel } from '../models/canvas.model'
import { HistoryModel } from '../models/history.model'
import { ClipboardModel } from '../models/clipboard.model'
import { TemplateModel } from '../models/template.model'
import { TextModel } from '../models/text.model'
import { SnappingModel } from '../models/snapping.model'
import { BackgroundModel } from '../models/background.model'
import { InteractionBlockerModel } from '../models/interaction-blocker.model'
import { ImageModel } from '../models/image.model'
import { bypassCertificateWarning } from '../helpers/certificate.helper'
import { injectEditorBrowserHelpers } from '../helpers/editor-browser-helpers.helper'
import { resolveHeadedBrowserHoldMs } from '../helpers/headed-browser-hold.helper'

interface EditorFixtures {
  editorModel: EditorModel
  shapes: ShapeModel
  canvas: CanvasModel
  history: HistoryModel
  clipboard: ClipboardModel
  template: TemplateModel
  text: TextModel
  snapping: SnappingModel
  background: BackgroundModel
  interactionBlocker: InteractionBlockerModel
  images: ImageModel
}

interface EditorInternalFixtures {
  holdBrowserAfterTest: void
}

export const test = base.extend<EditorFixtures & EditorInternalFixtures>({
  holdBrowserAfterTest: [async({ page: _page }, use, testInfo) => {
    await use()

    const holdMs = resolveHeadedBrowserHoldMs({ testInfo })
    if (!holdMs) return

    await delay(holdMs)
  }, { auto: true }],

  editorModel: async({ page }, use) => {
    const model = new EditorModel(page)
    await injectEditorBrowserHelpers({ page })
    await page.goto('/')
    await bypassCertificateWarning({ page })
    await model.waitForReady()
    await use(model)
    await model.text.finishScaleIfActive()
    await model.text.finishResizeIfActive()
    await model.shapes.finishScaleIfActive()
  },

  shapes: async({ editorModel }, use) => {
    await use(editorModel.shapes)
  },

  canvas: async({ editorModel }, use) => {
    await use(editorModel.canvas)
  },

  history: async({ editorModel }, use) => {
    await use(editorModel.history)
  },

  clipboard: async({ editorModel }, use) => {
    await use(editorModel.clipboard)
  },

  template: async({ editorModel }, use) => {
    await use(editorModel.template)
  },

  text: async({ editorModel }, use) => {
    await use(editorModel.text)
  },

  snapping: async({ editorModel }, use) => {
    await use(editorModel.snapping)
  },

  background: async({ editorModel }, use) => {
    await use(editorModel.background)
  },

  interactionBlocker: async({ editorModel }, use) => {
    await use(editorModel.interactionBlocker)
  },

  images: async({ editorModel }, use) => {
    await use(editorModel.images)
  }
})

export { expect } from '@playwright/test'
