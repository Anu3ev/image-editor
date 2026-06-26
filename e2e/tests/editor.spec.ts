import { test, expect } from '../fixtures/editor.fixture'
import { IMAGE_SCALING_FACTOR } from '../fixtures/data/image.data'
import {
  IMAGE_SOURCE_RESTORE_CASES,
  IMAGE_SOURCE_RESTORE_OBJECT_COUNT,
  IMAGE_SOURCE_RESTORE_ROUTE_MOCK
} from '../fixtures/data/image-source-restore.data'

test.describe('Инициализация редактора', () => {
  test('canvas создан и доступен', async({ editorModel }) => {
    const state = await test.step('Получить состояние canvas', () => editorModel.getCanvasState())

    await test.step('Проверить размеры', () => {
      expect(state.width).toBeGreaterThan(0)
      expect(state.height).toBeGreaterThan(0)
    })
  })

  test('montage area существует с корректными размерами', async({ editorModel }) => {
    const montageArea = await test.step('Получить montage area', () => editorModel.getMontageArea())

    await test.step('Проверить размеры 512×512', () => {
      expect(montageArea.width).toBe(512)
      expect(montageArea.height).toBe(512)
    })
  })

  test('все менеджеры доступны на инстансе редактора', async({ editorModel }) => {
    const managers = await test.step('Получить доступность менеджеров', () => editorModel.page.evaluate(() => {
      const e = (window as any).editor
      return {
        canvasManager: Boolean(e.canvasManager),
        shapeManager: Boolean(e.shapeManager),
        textManager: Boolean(e.textManager),
        historyManager: Boolean(e.historyManager),
        layerManager: Boolean(e.layerManager),
        clipboardManager: Boolean(e.clipboardManager),
        selectionManager: Boolean(e.selectionManager),
        deletionManager: Boolean(e.deletionManager),
        groupingManager: Boolean(e.groupingManager),
        transformManager: Boolean(e.transformManager),
        zoomManager: Boolean(e.zoomManager),
        backgroundManager: Boolean(e.backgroundManager),
        objectLockManager: Boolean(e.objectLockManager),
        snappingManager: Boolean(e.snappingManager),
        measurementManager: Boolean(e.measurementManager),
        templateManager: Boolean(e.templateManager),
        fontManager: Boolean(e.fontManager),
        imageManager: Boolean(e.imageManager),
        errorManager: Boolean(e.errorManager)
      }
    }))

    await test.step('Проверить что все менеджеры доступны', () => {
      for (const [name, exists] of Object.entries(managers)) {
        expect(exists, `${name} должен быть доступен`).toBe(true)
      }
    })
  })
})

test.describe('Состояние canvas после инициализации', () => {
  test('нет пользовательских объектов на canvas', async({ editorModel }) => {
    const objects = await editorModel.getObjects()
    expect(objects).toHaveLength(0)
  })

  test('нет активного объекта', async({ editorModel }) => {
    const activeObject = await editorModel.getActiveObject()
    expect(activeObject).toBeNull()
  })

  test('zoom соответствует дефолтному значению', async({ editorModel }) => {
    const state = await test.step('Получить состояние canvas', () => editorModel.getCanvasState())

    await test.step('Проверить zoom в допустимом диапазоне', () => {
      expect(state.zoom).toBeGreaterThan(0)
      expect(state.zoom).toBeLessThanOrEqual(1)
    })
  })
})

test.describe('Картинка из начального состояния', () => {
  for (const sourceCase of IMAGE_SOURCE_RESTORE_CASES) {
    test.describe(sourceCase.label, () => {
      test.use({
        editorInitOptions: {
          initialState: sourceCase.initialState
        },
        editorRouteMocks: [IMAGE_SOURCE_RESTORE_ROUTE_MOCK]
      })

      test(sourceCase.initialStateTestName, async({
        editorModel,
        history,
        images
      }) => {
        const imageTarget = {
          id: sourceCase.initialStateImageId
        }

        await test.step('Проверить что картинка появилась на canvas', async() => {
          await editorModel.checkObjectCount({ count: IMAGE_SOURCE_RESTORE_OBJECT_COUNT })
        })

        await test.step('Проверить что картинка загружена как blob-ссылка', async() => {
          const sourceInfo = await images.getSourceInfo(imageTarget)

          expect(sourceInfo.runtimeSrc.startsWith('blob:')).toBe(true)
          expect(sourceInfo.runtimeSrc).not.toBe(sourceCase.source)
          expect(sourceInfo.sourceWidth).toBeGreaterThan(0)
          expect(sourceInfo.sourceHeight).toBeGreaterThan(0)
        })

        await test.step('Проверить что история после init не содержит исходные данные картинки', async() => {
          const serializedHistoryText = await history.getSerializedStateText()

          expect(serializedHistoryText).toContain('blob:')

          for (const forbiddenPayload of sourceCase.historyForbiddenPayloads) {
            expect(serializedHistoryText).not.toContain(forbiddenPayload)
          }
        })

        const initialSnapshot = await test.step('Получить геометрию до scale', async() => {
          return images.getSnapshot(imageTarget)
        })

        await test.step('Масштабировать картинку вправо', async() => {
          await images.scaleHorizontallyFromRight({
            ...imageTarget,
            scaleX: IMAGE_SCALING_FACTOR
          })
        })

        const finalSnapshot = await test.step('Завершить scale и сохранить состояние', async() => {
          const snapshot = await images.finishScale(imageTarget)

          await history.saveState()

          return snapshot
        })

        await test.step('Проверить что после scale картинка осталась blob-ссылкой', async() => {
          const sourceInfo = await images.getSourceInfo(imageTarget)

          expect(finalSnapshot.boundsWidth).toBeLessThan(initialSnapshot.boundsWidth)
          expect(sourceInfo.runtimeSrc.startsWith('blob:')).toBe(true)
          expect(sourceInfo.runtimeSrc).not.toBe(sourceCase.source)
        })

        await test.step('Проверить что история не содержит исходные данные картинки', async() => {
          const serializedHistoryText = await history.getSerializedStateText()

          expect(serializedHistoryText).toContain('blob:')

          for (const forbiddenPayload of sourceCase.historyForbiddenPayloads) {
            expect(serializedHistoryText).not.toContain(forbiddenPayload)
          }
        })
      })
    })
  }
})
