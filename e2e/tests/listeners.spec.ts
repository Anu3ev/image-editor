import { test, expect } from '../fixtures/editor.fixture'
import {
  BLOCKER_SHAPE_OPTIONS,
  BLOCKER_UPDATED_FILL
} from '../fixtures/data/interaction-blocker.data'

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
      await editorModel.zoomByCtrlWheel({ deltaY: -120 })
    })

    await test.step('Проверить что zoom изменился', async() => {
      const currentCanvasState = await editorModel.getCanvasState()

      expect(currentCanvasState.zoom).toBeGreaterThan(initialCanvasState.zoom)
    })
  })
})
