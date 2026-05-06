import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_ROUNDING_UPDATED_VALUE
} from '../../fixtures/data/shape-rounding.data'

test.describe('Повёрнутая фигура', () => {
  test('после поворота обновление скругления не сбрасывает угол', async({ shapes }) => {
    const createdShape = await test.step('Добавить прямоугольник с текстом', () => {
      return shapes.add({
        presetKey: 'square',
        options: {
          id: 'shape-rotation-rounding',
          text: 'Текст',
          textStyle: { fontSize: 32 }
        }
      })
    })

    shapes.checkCreation({ shape: createdShape, presetKey: 'square' })

    await test.step('Повернуть фигуру на 45°', () => {
      return shapes.setAngle({ id: 'shape-rotation-rounding', angle: 45 })
    })

    await test.step('Изменить скругление', () => {
      return shapes.setRounding({ id: 'shape-rotation-rounding', rounding: SHAPE_ROUNDING_UPDATED_VALUE })
    })

    const updatedShape = await test.step('Получить состояние после изменения скругления', () => {
      return shapes.getObject({ id: 'shape-rotation-rounding' })
    })
    const updatedSnapshot = await test.step('Получить геометрию после изменения скругления', () => {
      return shapes.getScaleSnapshot({ id: 'shape-rotation-rounding' })
    })

    await test.step('Проверить что угол не сбросился, а скругление применилось', () => {
      expect(updatedShape?.angle).toBeCloseTo(45, 1)
      expect(updatedShape?.shapePresetKey).toBe('square')
      expect(updatedShape?.shapeRounding).toBe(SHAPE_ROUNDING_UPDATED_VALUE)
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'text' })
    })
  })

  test('после поворота обновление отступов текста не сбрасывает угол', async({ shapes }) => {
    const createdShape = await test.step('Добавить прямоугольник с текстом', () => {
      return shapes.add({
        presetKey: 'square',
        options: {
          id: 'shape-rotation-padding',
          text: 'Текст',
          textStyle: { fontSize: 32 }
        }
      })
    })

    shapes.checkCreation({ shape: createdShape, presetKey: 'square' })

    await test.step('Повернуть фигуру на 45°', () => {
      return shapes.setAngle({ id: 'shape-rotation-padding', angle: 45 })
    })

    await test.step('Изменить отступы текста', () => {
      return shapes.update({
        id: 'shape-rotation-padding',
        options: {
          textPadding: { top: 50 }
        }
      })
    })

    const updatedShape = await test.step('Получить состояние после изменения отступов', () => {
      return shapes.getObject({ id: 'shape-rotation-padding' })
    })
    const updatedSnapshot = await test.step('Получить геометрию после изменения отступов', () => {
      return shapes.getScaleSnapshot({ id: 'shape-rotation-padding' })
    })

    await test.step('Проверить что угол не сбросился, а отступы применились', () => {
      expect(updatedShape?.angle).toBeCloseTo(45, 1)
      expect(updatedShape?.shapePresetKey).toBe('square')
      expect(updatedShape?.shapePaddingTop).toBe(50)
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'text' })
    })
  })

  test('после поворота замена пресета не сбрасывает угол', async({ shapes }) => {
    const createdShape = await test.step('Добавить прямоугольник с текстом', () => {
      return shapes.add({
        presetKey: 'square',
        options: {
          id: 'shape-rotation-replace',
          text: 'Текст',
          textStyle: { fontSize: 32 }
        }
      })
    })

    shapes.checkCreation({ shape: createdShape, presetKey: 'square' })

    await test.step('Повернуть фигуру на 45°', () => {
      return shapes.setAngle({ id: 'shape-rotation-replace', angle: 45 })
    })

    const updatedShape = await test.step('Сменить прямоугольник на круг', () => {
      return shapes.update({
        id: 'shape-rotation-replace',
        presetKey: 'circle'
      })
    })

    const updatedSnapshot = await test.step('Получить геометрию после замены', () => {
      return shapes.getScaleSnapshot({ id: 'shape-rotation-replace' })
    })

    await test.step('Проверить что угол не сбросился, а пресет сменился', () => {
      expect(updatedShape?.angle).toBeCloseTo(45, 1)
      expect(updatedShape?.shapePresetKey).toBe('circle')
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'text' })
    })
  })

  test('undo/redo после обновления повёрнутой фигуры возвращает повёрнутое состояние', async({ history, shapes }) => {
    const createdShape = await test.step('Добавить прямоугольник с текстом', () => {
      return shapes.add({
        presetKey: 'square',
        options: {
          id: 'shape-rotation-undo',
          text: 'Текст',
          textStyle: { fontSize: 32 }
        }
      })
    })

    shapes.checkCreation({ shape: createdShape, presetKey: 'square' })

    await test.step('Повернуть фигуру на 45°', () => {
      return shapes.setAngle({ id: 'shape-rotation-undo', angle: 45 })
    })

    const beforeUpdate = await test.step('Получить состояние до обновления скругления', () => {
      return shapes.getObject({ id: 'shape-rotation-undo' })
    })

    await test.step('Изменить скругление', () => {
      return shapes.setRounding({ id: 'shape-rotation-undo', rounding: SHAPE_ROUNDING_UPDATED_VALUE })
    })

    const afterUpdate = await test.step('Получить состояние после обновления скругления', () => {
      return shapes.getObject({ id: 'shape-rotation-undo' })
    })

    await test.step('Проверить что скругление изменилось, а угол остался 45°', () => {
      expect(afterUpdate?.angle).toBeCloseTo(45, 1)
      expect(afterUpdate?.shapeRounding).toBe(SHAPE_ROUNDING_UPDATED_VALUE)
    })

    await test.step('Отменить обновление', () => {
      return history.undo()
    })

    const afterUndo = await test.step('Получить состояние после undo', () => {
      return shapes.getObject({ id: 'shape-rotation-undo' })
    })

    await test.step('Проверить что скругление вернулось к исходному, а угол остался 45°', () => {
      expect(afterUndo?.angle).toBeCloseTo(45, 1)
      expect(afterUndo?.shapeRounding).toBe(beforeUpdate?.shapeRounding)
    })

    await test.step('Повторить обновление', () => {
      return history.redo()
    })

    const afterRedo = await test.step('Получить состояние после redo', () => {
      return shapes.getObject({ id: 'shape-rotation-undo' })
    })

    await test.step('Проверить что скругление снова применилось, а угол остался 45°', () => {
      expect(afterRedo?.angle).toBeCloseTo(45, 1)
      expect(afterRedo?.shapeRounding).toBe(SHAPE_ROUNDING_UPDATED_VALUE)
    })
  })
})
