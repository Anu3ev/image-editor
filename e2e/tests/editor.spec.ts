import { test, expect } from '../fixtures/editor.fixture'

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
