import { readFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { test as base, type Page } from '@playwright/test'
import { EditorModel } from '../models/editor.model'
import { ShapeModel } from '../models/shape/shape.model'
import { CanvasModel } from '../models/canvas.model'
import { HistoryModel } from '../models/history.model'
import { ClipboardModel } from '../models/clipboard.model'
import { TemplateModel } from '../models/template.model'
import { TextModel } from '../models/text/text.model'
import { SnappingModel } from '../models/snapping.model'
import { MeasurementModel } from '../models/measurement.model'
import { BackgroundModel } from '../models/background.model'
import { InteractionBlockerModel } from '../models/interaction-blocker.model'
import { ImageModel } from '../models/image/image.model'
import { ToolbarModel } from '../models/toolbar.model'
import { SelectionModel } from '../models/selection/selection.model'
import { GroupingModel } from '../models/grouping.model'
import { CropModel } from '../models/crop/crop.model'
import { bypassCertificateWarning } from '../helpers/certificate.helper'
import { injectEditorBrowserHelpers } from '../helpers/editor-browser-helpers.helper'
import { resolveHeadedBrowserHoldMs } from '../helpers/headed-browser-hold.helper'
import {
  E2E_EDITOR_FONTS,
  E2E_EDITOR_FONT_FILES
} from './data/editor-fonts.data'

interface EditorFixtures {
  editorModel: EditorModel
  shapes: ShapeModel
  canvas: CanvasModel
  history: HistoryModel
  clipboard: ClipboardModel
  template: TemplateModel
  text: TextModel
  snapping: SnappingModel
  measurement: MeasurementModel
  background: BackgroundModel
  interactionBlocker: InteractionBlockerModel
  images: ImageModel
  toolbar: ToolbarModel
  selection: SelectionModel
  grouping: GroupingModel
  crop: CropModel
}

type EditorRouteMock = {
  body: string
  contentType: string
  status?: number
  url: string
}

type EditorDemoInitOptions = {
  fonts?: typeof E2E_EDITOR_FONTS
  initialState?: object | null
  showToolbar?: boolean
}

interface EditorInternalFixtures {
  editorInitOptions: EditorDemoInitOptions
  editorRouteMocks: readonly EditorRouteMock[]
  holdBrowserAfterTest: void
}

interface EditorDemoWindow extends Window {
  __EDITOR_DEMO_INIT_OPTIONS?: EditorDemoInitOptions
}

/** Передаёт настройки редактора в браузер до загрузки демонстрационной страницы. */
async function installEditorInitOptions({
  page,
  initOptions
}: {
  page: Page
  initOptions: EditorDemoInitOptions
}): Promise<void> {
  await page.addInitScript(({ initOptions: browserInitOptions }) => {
    const demoWindow = window as EditorDemoWindow

    demoWindow.__EDITOR_DEMO_INIT_OPTIONS = browserInitOptions
  }, {
    initOptions
  })
}

/** Подключает ответы тестового окружения и локальные файлы шрифтов. */
async function installEditorRoutes({
  page,
  routeMocks
}: {
  page: Page
  routeMocks: readonly EditorRouteMock[]
}): Promise<void> {
  for (const routeMock of routeMocks) {
    await page.route(routeMock.url, async(route) => {
      await route.fulfill({
        body: routeMock.body,
        contentType: routeMock.contentType,
        headers: {
          'access-control-allow-origin': '*'
        },
        status: routeMock.status ?? 200
      })
    })
  }

  await page.route('**/__e2e/fonts/**', async(route) => {
    const requestUrl = new URL(route.request().url())
    const fileName = requestUrl.pathname.replace('/__e2e/fonts/', '')

    if (!E2E_EDITOR_FONT_FILES.has(fileName)) {
      await route.abort()
      return
    }

    const fileBody = await readFile(new URL(`../assets/fonts/${fileName}`, import.meta.url))

    await route.fulfill({
      body: fileBody,
      contentType: 'font/woff2',
      status: 200
    })
  })

  await page.route('https://fonts.gstatic.com/**', async(route) => {
    await route.abort()
  })
}

/** Открывает демонстрационную страницу и ждёт готовности редактора. */
async function openEditorPage({
  model,
  page
}: {
  model: EditorModel
  page: Page
}): Promise<void> {
  await injectEditorBrowserHelpers({ page })
  await page.goto('/', {
    waitUntil: 'domcontentloaded'
  })
  await bypassCertificateWarning({ page })
  await model.waitForReady()
}

/** Завершает браузерные взаимодействия, которые тест оставил активными. */
async function finishEditorInteractions({ model }: { model: EditorModel }): Promise<void> {
  await model.selection.scaling.finishIfActive()
  await model.snapping.finishPointerInteractionIfActive()
  await model.text.scaling.finishIfActive()
  await model.text.finishScaleIfActive()
  await model.text.finishResizeIfActive()
  await model.shapes.finishScaleIfActive()
  await model.images.scaling.finishIfActive()
}

export const test = base.extend<EditorFixtures & EditorInternalFixtures>({
  editorInitOptions: [{}, { option: true }],

  editorRouteMocks: [[], { option: true }],

  holdBrowserAfterTest: [async({ page: _page }, use, testInfo) => {
    await use()

    const holdMs = resolveHeadedBrowserHoldMs({ testInfo })
    if (!holdMs) return

    await delay(holdMs)
  }, { auto: true }],

  editorModel: async({
    editorInitOptions,
    editorRouteMocks,
    page
  }, use) => {
    const model = new EditorModel(page)
    const demoInitOptions: EditorDemoInitOptions = {
      ...editorInitOptions,
      fonts: editorInitOptions.fonts ?? E2E_EDITOR_FONTS,
      showToolbar: editorInitOptions.showToolbar ?? true
    }

    await installEditorInitOptions({ page, initOptions: demoInitOptions })
    await installEditorRoutes({ page, routeMocks: editorRouteMocks })
    await openEditorPage({ model, page })
    await use(model)
    await finishEditorInteractions({ model })
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

  measurement: async({ editorModel }, use) => {
    await use(editorModel.measurement)
  },

  background: async({ editorModel }, use) => {
    await use(editorModel.background)
  },

  interactionBlocker: async({ editorModel }, use) => {
    await use(editorModel.interactionBlocker)
  },

  images: async({ editorModel }, use) => {
    await use(editorModel.images)
  },

  toolbar: async({ editorModel }, use) => {
    await use(editorModel.toolbar)
  },

  selection: async({ editorModel }, use) => {
    await use(editorModel.selection)
  },

  grouping: async({ editorModel }, use) => {
    await use(editorModel.grouping)
  },

  crop: async({ editorModel }, use) => {
    await use(editorModel.crop)
  }
})

export { expect } from '@playwright/test'
