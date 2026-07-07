import { test, expect } from '../fixtures/editor.fixture'

const PROTECTED_HANDLE = 'main-image'

test.describe('Защита объектов от удаления', () => {
  test.beforeEach(async({ editorModel }) => {
    await editorModel.useCustomDataDeleteGuard({
      handle: PROTECTED_HANDLE
    })
    await editorModel.startDeleteSkippedEventRecording()
  })

  test('Delete оставляет защищённый объект на canvas и пишет событие отказа', async({
    editorModel,
    shapes
  }) => {
    const protectedShapeId = 'delete-protected-shape'

    await test.step('Добавить и выделить защищённый объект', async() => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: {
          id: protectedShapeId,
          left: 120,
          top: 120
        }
      })

      shapes.checkCreation({ shape, presetKey: 'square' })
      await editorModel.setObjectCustomData({
        id: protectedShapeId,
        customData: {
          handle: PROTECTED_HANDLE,
          keep: 'asset-id'
        }
      })
      await shapes.select({ id: protectedShapeId })
    })

    await test.step('Нажать Delete', async() => {
      await editorModel.pressDeleteKey()
    })

    await test.step('Проверить что объект остался и событие записалось', async() => {
      const handle = await editorModel.getObjectCustomDataHandle({ id: protectedShapeId })
      const events = await editorModel.getDeleteSkippedEvents()

      await editorModel.checkObjectCount({ count: 1 })
      expect(handle).toBe(PROTECTED_HANDLE)
      expect(events).toEqual([expect.objectContaining({
        requestedCount: 1,
        requestedIds: [protectedShapeId],
        skippedCount: 1,
        skippedIds: [protectedShapeId],
        withoutSave: false
      })])
    })
  })

  test('Backspace оставляет защищённый объект на canvas и пишет событие отказа', async({
    editorModel,
    shapes
  }) => {
    const protectedShapeId = 'backspace-protected-shape'

    await test.step('Добавить и выделить защищённый объект', async() => {
      const shape = await shapes.add({
        presetKey: 'circle',
        options: {
          id: protectedShapeId,
          left: 160,
          top: 140
        }
      })

      shapes.checkCreation({ shape, presetKey: 'circle' })
      await editorModel.setObjectCustomData({
        id: protectedShapeId,
        customData: {
          handle: PROTECTED_HANDLE
        }
      })
      await shapes.select({ id: protectedShapeId })
    })

    await test.step('Нажать Backspace', async() => {
      await editorModel.pressBackspaceKey()
    })

    await test.step('Проверить что объект остался и событие записалось', async() => {
      const protectedShape = await shapes.getObject({ id: protectedShapeId })
      const events = await editorModel.getDeleteSkippedEvents()

      expect(protectedShape).not.toBeNull()
      await editorModel.checkObjectCount({ count: 1 })
      expect(events).toEqual([expect.objectContaining({
        requestedCount: 1,
        requestedIds: [protectedShapeId],
        skippedCount: 1,
        skippedIds: [protectedShapeId],
        withoutSave: false
      })])
    })
  })

  test('Ctrl+A и Delete удаляет обычные объекты и оставляет защищённый', async({
    editorModel,
    shapes
  }) => {
    const protectedShapeId = 'delete-selection-protected-shape'
    const regularShapeId = 'delete-selection-regular-shape'

    await test.step('Добавить защищённый и обычный объекты', async() => {
      const protectedShape = await shapes.add({
        presetKey: 'square',
        options: {
          id: protectedShapeId,
          left: 130,
          top: 130
        }
      })
      const regularShape = await shapes.add({
        presetKey: 'circle',
        options: {
          id: regularShapeId,
          left: 300,
          top: 220
        }
      })

      shapes.checkCreation({ shape: protectedShape, presetKey: 'square' })
      shapes.checkCreation({ shape: regularShape, presetKey: 'circle' })
      await editorModel.setObjectCustomData({
        id: protectedShapeId,
        customData: {
          handle: PROTECTED_HANDLE
        }
      })
    })

    await test.step('Выделить всё и нажать Delete', async() => {
      await editorModel.selectAllObjects()
      await editorModel.pressDeleteKey()
      await editorModel.waitForObjectCount({ count: 1 })
    })

    await test.step('Проверить что обычный объект удалён, а защищённый остался', async() => {
      const protectedShape = await shapes.getObject({ id: protectedShapeId })
      const regularShape = await shapes.getObject({ id: regularShapeId })
      const events = await editorModel.getDeleteSkippedEvents()

      expect(protectedShape).not.toBeNull()
      expect(regularShape).toBeNull()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(expect.objectContaining({
        requestedCount: 2,
        skippedCount: 1,
        skippedIds: [protectedShapeId]
      }))
    })
  })

  test('кнопка "Удалить" удаляет из выделения только обычные объекты', async({
    editorModel,
    shapes,
    toolbar
  }) => {
    const protectedShapeId = 'toolbar-protected-shape'
    const regularShapeId = 'toolbar-regular-shape'

    await test.step('Добавить защищённый и обычный объекты', async() => {
      const protectedShape = await shapes.add({
        presetKey: 'square',
        options: {
          id: protectedShapeId,
          left: 140,
          top: 130
        }
      })
      const regularShape = await shapes.add({
        presetKey: 'circle',
        options: {
          id: regularShapeId,
          left: 300,
          top: 230
        }
      })

      shapes.checkCreation({ shape: protectedShape, presetKey: 'square' })
      shapes.checkCreation({ shape: regularShape, presetKey: 'circle' })
      await editorModel.setObjectCustomData({
        id: protectedShapeId,
        customData: {
          handle: PROTECTED_HANDLE
        }
      })
    })

    await test.step('Создать массовое выделение и нажать кнопку "Удалить"', async() => {
      await editorModel.selectAllObjects()
      await toolbar.waitUntilVisible()
      await toolbar.clickAction({
        name: 'Удалить'
      })
      await editorModel.waitForObjectCount({ count: 1 })
    })

    await test.step('Проверить что обычный объект удалён, а защищённый остался', async() => {
      const protectedShape = await shapes.getObject({ id: protectedShapeId })
      const regularShape = await shapes.getObject({ id: regularShapeId })
      const events = await editorModel.getDeleteSkippedEvents()

      expect(protectedShape).not.toBeNull()
      expect(regularShape).toBeNull()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(expect.objectContaining({
        requestedCount: 2,
        skippedCount: 1,
        skippedIds: [protectedShapeId]
      }))
    })
  })

  test('Ctrl+X вырезает только обычные объекты и не создаёт второго защищённого после вставки', async({
    clipboard,
    editorModel,
    shapes
  }) => {
    const protectedShapeId = 'cut-protected-shape'
    const regularShapeId = 'cut-regular-shape'

    await test.step('Добавить защищённый и обычный объекты', async() => {
      const protectedShape = await shapes.add({
        presetKey: 'square',
        options: {
          id: protectedShapeId,
          left: 120,
          top: 130
        }
      })
      const regularShape = await shapes.add({
        presetKey: 'circle',
        options: {
          id: regularShapeId,
          left: 300,
          top: 220
        }
      })

      shapes.checkCreation({ shape: protectedShape, presetKey: 'square' })
      shapes.checkCreation({ shape: regularShape, presetKey: 'circle' })
      await editorModel.setObjectCustomData({
        id: protectedShapeId,
        customData: {
          handle: PROTECTED_HANDLE,
          keep: 'asset-id'
        }
      })
    })

    await test.step('Выделить всё и нажать Ctrl+X', async() => {
      await editorModel.selectAllObjects()
      await editorModel.pressCutHotkey()
      await editorModel.waitForObjectCount({ count: 1 })
      await clipboard.waitForClipboardReady()
    })

    await test.step('Проверить что вырезался только обычный объект', async() => {
      const protectedShape = await shapes.getObject({ id: protectedShapeId })
      const regularShape = await shapes.getObject({ id: regularShapeId })
      const events = await editorModel.getDeleteSkippedEvents()

      expect(protectedShape).not.toBeNull()
      expect(regularShape).toBeNull()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(expect.objectContaining({
        requestedCount: 2,
        skippedCount: 1,
        skippedIds: [protectedShapeId]
      }))
    })

    await test.step('Вставить объект из буфера и проверить защищающий признак', async() => {
      const pasted = await clipboard.paste()
      const protectedObjectsCount = await editorModel.countObjectsByCustomDataHandle({
        handle: PROTECTED_HANDLE
      })

      expect(pasted).toBe(true)
      await editorModel.checkObjectCount({ count: 2 })
      expect(protectedObjectsCount).toBe(1)
    })
  })

  test('Ctrl+D создаёт копию защищённого объекта без защищающего признака', async({
    editorModel,
    shapes
  }) => {
    const protectedShapeId = 'duplicate-protected-shape'

    await test.step('Добавить и выделить защищённый объект', async() => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: {
          id: protectedShapeId,
          left: 160,
          top: 150
        }
      })

      shapes.checkCreation({ shape, presetKey: 'square' })
      await editorModel.setObjectCustomData({
        id: protectedShapeId,
        customData: {
          handle: PROTECTED_HANDLE,
          keep: 'asset-id'
        }
      })
      await shapes.select({ id: protectedShapeId })
    })

    await test.step('Нажать Ctrl+D', async() => {
      await editorModel.pressDuplicateHotkey()
      await editorModel.waitForObjectCount({ count: 2 })
    })

    await test.step('Проверить что только исходный объект остался защищённым', async() => {
      const shapeObjects = await shapes.getShapeObjects()
      const duplicateShape = shapeObjects.find((shape) => shape.id !== protectedShapeId)
      const originalHandle = await editorModel.getObjectCustomDataHandle({ id: protectedShapeId })
      const protectedObjectsCount = await editorModel.countObjectsByCustomDataHandle({
        handle: PROTECTED_HANDLE
      })

      expect(duplicateShape, 'после Ctrl+D должна появиться копия объекта').toBeDefined()

      if (!duplicateShape?.id) {
        throw new Error('У копии после Ctrl+D должен быть id')
      }

      const duplicateHandle = await editorModel.getObjectCustomDataHandle({
        id: duplicateShape.id
      })

      expect(originalHandle).toBe(PROTECTED_HANDLE)
      expect(duplicateHandle).toBeNull()
      expect(protectedObjectsCount).toBe(1)
    })
  })
})
