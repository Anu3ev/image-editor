import { test, expect } from '../fixtures/editor.fixture'
import {
  BLOCKER_SHAPE_OPTIONS,
  BLOCKER_UPDATED_FILL
} from '../fixtures/data/interaction-blocker.data'
import {
  LISTENERS_CLIPBOARD_OFFSET,
  LISTENERS_CUT_HOTKEY_SHAPE_ID,
  LISTENERS_CUT_HOTKEY_SHAPE_OFFSET,
  LISTENERS_DUPLICATE_HOTKEY_SHAPE_ID,
  LISTENERS_DUPLICATE_HOTKEY_SHAPE_OFFSET,
  LISTENERS_HOTKEY_SHAPE_SIZE
} from '../fixtures/data/listeners.data'

test.describe('Горячие клавиши и zoom', () => {
  test('пока редактор заблокирован undo и redo по hotkeys не меняют состояние', async({
    editorModel,
    interactionBlocker,
    shapes
  }) => {
    await test.step('Добавить фигуру и изменить её цвет', async() => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: BLOCKER_SHAPE_OPTIONS
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })

      await shapes.setFill({
        id: BLOCKER_SHAPE_OPTIONS.id,
        fill: BLOCKER_UPDATED_FILL
      })
    })

    await test.step('Заблокировать редактор', async() => {
      await interactionBlocker.block()
    })

    await test.step('Отправить hotkeys undo и redo', async() => {
      await editorModel.pressUndoHotkey()
      await editorModel.pressRedoHotkey()
    })

    await test.step('Проверить что состояние фигуры не изменилось', async() => {
      const currentShape = await shapes.getObject({ id: BLOCKER_SHAPE_OPTIONS.id })
      const blockerState = await interactionBlocker.getState()

      expect(currentShape?.shapeFill).toBe(BLOCKER_UPDATED_FILL)
      expect(blockerState.isBlocked).toBe(true)
    })
  })

  test('ctrl + wheel меняет zoom редактора', async({ editorModel }) => {
    const initialCanvasState = await test.step('Получить исходный zoom', () => {
      return editorModel.getCanvasState()
    })

    await test.step('Отправить ctrl + wheel на canvas', async() => {
      const dispatchState = await editorModel.zoomByCtrlWheel({ deltaY: -120 })

      expect(dispatchState.dispatchedEvents).toBe(1)
      expect(dispatchState.canceledEvents).toBe(dispatchState.dispatchedEvents)
    })

    await test.step('Проверить что zoom изменился', async() => {
      const currentCanvasState = await editorModel.getCanvasState()

      expect(currentCanvasState.zoom).toBeGreaterThan(initialCanvasState.zoom)
      expect(currentCanvasState.objectCount).toBe(initialCanvasState.objectCount)
    })
  })

  test('pinch на тачпаде меняет zoom редактора', async({ editorModel }) => {
    const initialCanvasState = await test.step('Получить исходный zoom', () => {
      return editorModel.getCanvasState()
    })

    await test.step('Сделать полный pinch-жест на тачпаде', async() => {
      const dispatchState = await editorModel.zoomInByTrackpadPinch()

      expect(dispatchState.dispatchedEvents).toBeGreaterThan(0)
      expect(dispatchState.canceledEvents).toBe(dispatchState.dispatchedEvents)
    })

    await test.step('Проверить что один pinch-жест даёт заметное приближение', async() => {
      const currentCanvasState = await editorModel.getCanvasState()
      const zoomIncrease = currentCanvasState.zoom - initialCanvasState.zoom

      expect(zoomIncrease).toBeGreaterThanOrEqual(0.25)
      expect(zoomIncrease).toBeLessThanOrEqual(0.35)
      expect(currentCanvasState.objectCount).toBe(initialCanvasState.objectCount)
    })
  })

  test('pinch-out на тачпаде уменьшает zoom после приближения', async({ editorModel }) => {
    const initialCanvasState = await test.step('Получить исходный zoom', () => {
      return editorModel.getCanvasState()
    })

    const zoomedInCanvasState = await test.step('Сначала приблизить canvas pinch-жестом', async() => {
      await editorModel.zoomInByTrackpadPinch()

      return editorModel.getCanvasState()
    })

    await test.step('Сделать обратный pinch-жест на тачпаде', async() => {
      const dispatchState = await editorModel.zoomOutByTrackpadPinch()

      expect(dispatchState.dispatchedEvents).toBeGreaterThan(0)
      expect(dispatchState.canceledEvents).toBe(dispatchState.dispatchedEvents)
    })

    await test.step('Проверить что zoom уменьшился', async() => {
      const currentCanvasState = await editorModel.getCanvasState()

      expect(zoomedInCanvasState.zoom).toBeGreaterThan(initialCanvasState.zoom)
      expect(currentCanvasState.zoom).toBeLessThan(zoomedInCanvasState.zoom)
      expect(currentCanvasState.objectCount).toBe(initialCanvasState.objectCount)
    })
  })

  test('gesture-событие Safari меняет zoom редактора', async({ editorModel }) => {
    const initialCanvasState = await test.step('Получить исходный zoom', () => {
      return editorModel.getCanvasState()
    })

    await test.step('Отправить WebKit pinch gesture на canvas', async() => {
      const dispatchState = await editorModel.zoomInByWebKitGesturePinch()

      expect(dispatchState.dispatchedEvents).toBe(3)
      expect(dispatchState.canceledEvents).toBe(dispatchState.dispatchedEvents)
    })

    await test.step('Проверить что gesture fallback приблизил canvas', async() => {
      const currentCanvasState = await editorModel.getCanvasState()

      expect(currentCanvasState.zoom).toBeGreaterThan(initialCanvasState.zoom)
      expect(currentCanvasState.objectCount).toBe(initialCanvasState.objectCount)
    })
  })

  test('Ctrl+D создаёт копию выделенной фигуры и оставляет исходную на canvas', async({
    editorModel,
    shapes
  }) => {
    const sourceShape = await test.step('Добавить и выделить фигуру внутри рабочей области', async() => {
      const area = await editorModel.getMontageAreaBounds()
      const shape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: LISTENERS_DUPLICATE_HOTKEY_SHAPE_ID,
          left: area.left + LISTENERS_DUPLICATE_HOTKEY_SHAPE_OFFSET.left,
          top: area.top + LISTENERS_DUPLICATE_HOTKEY_SHAPE_OFFSET.top,
          ...LISTENERS_HOTKEY_SHAPE_SIZE
        }
      })

      const createdShape = shapes.checkCreation({
        shape,
        presetKey: 'square'
      })

      await shapes.select({ id: LISTENERS_DUPLICATE_HOTKEY_SHAPE_ID })

      return createdShape
    })

    await test.step('Нажать Ctrl+D', async() => {
      await editorModel.pressDuplicateHotkey()
      await editorModel.waitForObjectCount({ count: 2 })
    })

    await test.step('Проверить исходную фигуру и её копию', async() => {
      const shapeObjects = await shapes.getShapeObjects()
      const original = shapeObjects.find((shape) => shape.id === LISTENERS_DUPLICATE_HOTKEY_SHAPE_ID)
      const duplicate = shapeObjects.find((shape) => shape.id !== LISTENERS_DUPLICATE_HOTKEY_SHAPE_ID)
      const activeObject = await editorModel.getActiveObject()

      expect(shapeObjects).toHaveLength(2)
      expect(original, 'после Ctrl+D исходная фигура должна остаться на canvas').toBeDefined()
      expect(duplicate, 'после Ctrl+D должна появиться копия фигуры').toBeDefined()
      expect(activeObject, 'после Ctrl+D копия должна стать активной').not.toBeNull()

      if (!original || !duplicate || !activeObject) {
        throw new Error('После Ctrl+D должны существовать исходная фигура, её копия и active object')
      }

      expect(original.left).toBeCloseTo(sourceShape.left, 1)
      expect(original.top).toBeCloseTo(sourceShape.top, 1)
      expect(duplicate.id).toEqual(expect.any(String))
      expect(duplicate.id).not.toBe(LISTENERS_DUPLICATE_HOTKEY_SHAPE_ID)
      expect(duplicate.left).toBeCloseTo(sourceShape.left + LISTENERS_CLIPBOARD_OFFSET, 1)
      expect(duplicate.top).toBeCloseTo(sourceShape.top + LISTENERS_CLIPBOARD_OFFSET, 1)
      expect(activeObject.id).toBe(duplicate.id)
    })
  })

  test('Ctrl+X вырезает выделенную фигуру и оставляет её в буфере для вставки', async({
    clipboard,
    editorModel,
    shapes
  }) => {
    const sourceShape = await test.step('Добавить и выделить фигуру внутри рабочей области', async() => {
      const area = await editorModel.getMontageAreaBounds()
      const shape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: LISTENERS_CUT_HOTKEY_SHAPE_ID,
          left: area.left + LISTENERS_CUT_HOTKEY_SHAPE_OFFSET.left,
          top: area.top + LISTENERS_CUT_HOTKEY_SHAPE_OFFSET.top,
          ...LISTENERS_HOTKEY_SHAPE_SIZE
        }
      })

      const createdShape = shapes.checkCreation({
        shape,
        presetKey: 'square'
      })

      await shapes.select({ id: LISTENERS_CUT_HOTKEY_SHAPE_ID })

      return createdShape
    })

    await test.step('Нажать Ctrl+X', async() => {
      await editorModel.pressCutHotkey()
      await editorModel.waitForObjectCount({ count: 0 })
      await clipboard.waitForClipboardReady()
    })

    await test.step('Вставить вырезанную фигуру из внутреннего буфера', async() => {
      const pasted = await clipboard.paste()

      expect(pasted).toBe(true)
      await editorModel.waitForObjectCount({ count: 1 })
    })

    await test.step('Проверить вставленную фигуру', async() => {
      const shapeObjects = await shapes.getShapeObjects()
      const pastedShape = shapeObjects[0]

      expect(shapeObjects).toHaveLength(1)
      expect(pastedShape, 'после вставки вырезанной фигуры на canvas должен быть новый объект').toBeDefined()

      if (!pastedShape) {
        throw new Error('После вставки вырезанной фигуры объект должен существовать на canvas')
      }

      expect(pastedShape.id).toEqual(expect.any(String))
      expect(pastedShape.id).not.toBe(LISTENERS_CUT_HOTKEY_SHAPE_ID)
      expect(pastedShape.left).toBeCloseTo(sourceShape.left + LISTENERS_CLIPBOARD_OFFSET, 1)
      expect(pastedShape.top).toBeCloseTo(sourceShape.top + LISTENERS_CLIPBOARD_OFFSET, 1)
    })
  })
})
