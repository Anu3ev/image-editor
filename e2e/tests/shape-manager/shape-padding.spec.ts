import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_PADDING_BASE_OPTIONS,
  SHAPE_PADDING_HISTORY_UPDATED,
  SHAPE_PADDING_INITIAL,
  SHAPE_PADDING_NORMALIZED_INPUT,
  SHAPE_PADDING_NORMALIZED_RESULT,
  SHAPE_PADDING_SCALING_OPTIONS,
  SHAPE_PADDING_TOO_LARGE_RIGHT,
  SHAPE_PADDING_UPDATED_RIGHT_INPUT,
  SHAPE_PADDING_UPDATED_RIGHT_RESULT
} from '../../fixtures/data/shape-padding.data'

test.describe('Внутренние отступы текста внутри фигуры', () => {
  test('без явно заданных отступов фигура создаётся с нулями по всем сторонам', async({ shapes }) => {
    const createdShape = await test.step('Добавить фигуру без внутренних отступов', async() => {
      return shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_PADDING_BASE_OPTIONS,
          id: 'shape-padding-zero'
        }
      })
    })

    await test.step('Проверить что по всем сторонам сохранены нули', () => {
      expect(createdShape?.shapePaddingTop).toBe(0)
      expect(createdShape?.shapePaddingRight).toBe(0)
      expect(createdShape?.shapePaddingBottom).toBe(0)
      expect(createdShape?.shapePaddingLeft).toBe(0)
    })
  })

  test('при добавлении фигуры применяет только целые неотрицательные отступы', async({ shapes }) => {
    const createdShape = await test.step('Добавить фигуру с дробными и отрицательными значениями', async() => {
      return shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_PADDING_BASE_OPTIONS,
          id: 'shape-padding-normalized',
          textPadding: SHAPE_PADDING_NORMALIZED_INPUT
        }
      })
    })

    await test.step('Проверить что библиотека сохранила уже применённые значения', () => {
      expect(createdShape?.shapePaddingTop).toBe(SHAPE_PADDING_NORMALIZED_RESULT.top)
      expect(createdShape?.shapePaddingRight).toBe(SHAPE_PADDING_NORMALIZED_RESULT.right)
      expect(createdShape?.shapePaddingBottom).toBe(SHAPE_PADDING_NORMALIZED_RESULT.bottom)
      expect(createdShape?.shapePaddingLeft).toBe(SHAPE_PADDING_NORMALIZED_RESULT.left)
    })
  })

  test.describe('изменение уже созданной фигуры', () => {
    test.beforeEach(async({ shapes }) => {
      const createdShape = await shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_PADDING_BASE_OPTIONS,
          textPadding: SHAPE_PADDING_INITIAL
        }
      })

      shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })
    })

    test('при изменении правого отступа не сбрасывает остальные стороны', async({ shapes }) => {
      const updatedShape = await test.step('Изменить только правый внутренний отступ', async() => {
        return shapes.update({
          id: SHAPE_PADDING_BASE_OPTIONS.id,
          options: {
            textPadding: {
              right: SHAPE_PADDING_UPDATED_RIGHT_INPUT
            }
          }
        })
      })

      await test.step('Проверить что изменился только правый отступ', () => {
        expect(updatedShape?.shapePaddingTop).toBe(SHAPE_PADDING_INITIAL.top)
        expect(updatedShape?.shapePaddingRight).toBe(SHAPE_PADDING_UPDATED_RIGHT_RESULT)
        expect(updatedShape?.shapePaddingBottom).toBe(SHAPE_PADDING_INITIAL.bottom)
        expect(updatedShape?.shapePaddingLeft).toBe(SHAPE_PADDING_INITIAL.left)
      })
    })

    test('слишком большой правый отступ уменьшается до максимально возможного значения', async({ shapes }) => {
      const initialSnapshot = await test.step('Получить исходные размеры фигуры', () => {
        return shapes.getScaleSnapshot({ id: SHAPE_PADDING_BASE_OPTIONS.id })
      })

      const updatedShape = await test.step('Задать заведомо слишком большой правый отступ', async() => {
        return shapes.update({
          id: SHAPE_PADDING_BASE_OPTIONS.id,
          options: {
            textPadding: {
              right: SHAPE_PADDING_TOO_LARGE_RIGHT
            }
          }
        })
      })

      const updatedSnapshot = await test.step('Получить состояние фигуры после ограничения отступа', () => {
        return shapes.getScaleSnapshot({ id: SHAPE_PADDING_BASE_OPTIONS.id })
      })

      await test.step('Проверить что отступ зажался и текст остался внутри фигуры', () => {
        expect(updatedShape?.shapePaddingRight).toBeGreaterThan(SHAPE_PADDING_INITIAL.right)
        expect(updatedShape?.shapePaddingRight).toBeLessThan(SHAPE_PADDING_TOO_LARGE_RIGHT)
        expect(Math.abs(updatedSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth)).toBeLessThanOrEqual(1.5)
        expect(Math.abs(updatedSnapshot.groupBoundsHeight - initialSnapshot.groupBoundsHeight)).toBeLessThanOrEqual(1.5)
        shapes.checkNodeInsideGroup({
          snapshot: updatedSnapshot,
          kind: 'text'
        })
      })
    })

    test('изменение только отступов не меняет размер фигуры', async({ shapes }) => {
      const initialSnapshot = await test.step('Получить исходные размеры фигуры', () => {
        return shapes.getScaleSnapshot({ id: SHAPE_PADDING_BASE_OPTIONS.id })
      })

      await test.step('Изменить только внутренние отступы', async() => {
        await shapes.update({
          id: SHAPE_PADDING_BASE_OPTIONS.id,
          options: {
            textPadding: {
              top: 18,
              right: 24
            }
          }
        })
      })

      const updatedSnapshot = await test.step('Получить размеры фигуры после изменения отступов', () => {
        return shapes.getScaleSnapshot({ id: SHAPE_PADDING_BASE_OPTIONS.id })
      })

      await test.step('Проверить что размеры фигуры остались теми же', () => {
        expect(Math.abs(updatedSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth)).toBeLessThanOrEqual(1.5)
        expect(Math.abs(updatedSnapshot.groupBoundsHeight - initialSnapshot.groupBoundsHeight)).toBeLessThanOrEqual(1.5)
      })
    })

    test('после смены пресета доступные отступы сохраняются, а текст остаётся внутри фигуры', async({ shapes }) => {
      const updatedShape = await test.step('Сменить пресет фигуры', async() => {
        return shapes.update({
          id: SHAPE_PADDING_BASE_OPTIONS.id,
          presetKey: 'circle'
        })
      })

      const updatedSnapshot = await test.step('Получить итоговое положение фигуры и текста', () => {
        return shapes.getScaleSnapshot({ id: SHAPE_PADDING_BASE_OPTIONS.id })
      })

      await test.step('Проверить что доступные отступы сохранились, а текст остался внутри фигуры', () => {
        expect(updatedShape).not.toBeNull()
        expect(updatedShape?.shapePaddingTop).toBeLessThanOrEqual(SHAPE_PADDING_INITIAL.top)
        expect(updatedShape?.shapePaddingRight).toBe(SHAPE_PADDING_INITIAL.right)
        expect(updatedShape?.shapePaddingBottom).toBeLessThanOrEqual(SHAPE_PADDING_INITIAL.bottom)
        expect(updatedShape?.shapePaddingLeft).toBe(SHAPE_PADDING_INITIAL.left)
        shapes.checkNodeInsideGroup({
          snapshot: updatedSnapshot,
          kind: 'text'
        })
      })
    })
  })

  test('undo и redo возвращают те же внутренние отступы', async({ history, shapes }) => {
    await test.step('Добавить фигуру с начальными отступами', async() => {
      await shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_PADDING_BASE_OPTIONS,
          id: 'shape-padding-history',
          textPadding: SHAPE_PADDING_INITIAL
        }
      })
    })

    const updatedShape = await test.step('Изменить внутренние отступы', async() => {
      return shapes.update({
        id: 'shape-padding-history',
        options: {
          textPadding: SHAPE_PADDING_HISTORY_UPDATED
        }
      })
    })

    const restoredShape = await test.step('Сделать undo и получить восстановленное состояние', async() => {
      await history.undo()
      return shapes.getObject({ id: 'shape-padding-history' })
    })

    const redoneShape = await test.step('Сделать redo и получить повторно применённое состояние', async() => {
      await history.redo()
      return shapes.getObject({ id: 'shape-padding-history' })
    })

    await test.step('Проверить что undo и redo возвращают те же значения по сторонам', () => {
      expect(restoredShape?.shapePaddingTop).toBe(SHAPE_PADDING_INITIAL.top)
      expect(restoredShape?.shapePaddingRight).toBe(SHAPE_PADDING_INITIAL.right)
      expect(restoredShape?.shapePaddingBottom).toBe(SHAPE_PADDING_INITIAL.bottom)
      expect(restoredShape?.shapePaddingLeft).toBe(SHAPE_PADDING_INITIAL.left)

      expect(redoneShape?.shapePaddingTop).toBe(updatedShape?.shapePaddingTop)
      expect(redoneShape?.shapePaddingRight).toBe(updatedShape?.shapePaddingRight)
      expect(redoneShape?.shapePaddingBottom).toBe(updatedShape?.shapePaddingBottom)
      expect(redoneShape?.shapePaddingLeft).toBe(updatedShape?.shapePaddingLeft)
    })
  })

  test('при сужении фигуры скейлингом пользовательские отступы могут уменьшиться', async({ shapes }) => {
    await test.step('Добавить фигуру с большими внутренними отступами', async() => {
      await shapes.add({
        presetKey: 'square',
        options: SHAPE_PADDING_SCALING_OPTIONS
      })
    })

    const initialShape = await test.step('Получить исходные отступы', () => {
      return shapes.getObject({ id: SHAPE_PADDING_SCALING_OPTIONS.id })
    })
    const initialSnapshot = await test.step('Получить исходные размеры фигуры', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_PADDING_SCALING_OPTIONS.id })
    })

    await test.step('Сжать фигуру по ширине до упора', async() => {
      await shapes.shrinkToMinimumWidth({ id: SHAPE_PADDING_SCALING_OPTIONS.id })
      await shapes.finishScale({ id: SHAPE_PADDING_SCALING_OPTIONS.id })
    })

    const finalShape = await test.step('Получить отступы после сужения', () => {
      return shapes.getObject({ id: SHAPE_PADDING_SCALING_OPTIONS.id })
    })
    const finalSnapshot = await test.step('Получить итоговую геометрию после сужения', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_PADDING_SCALING_OPTIONS.id })
    })

    await test.step('Проверить что фигура стала уже, а часть отступов могла быть съедена', () => {
      const initialHorizontalPadding = (initialShape?.shapePaddingLeft ?? 0) + (initialShape?.shapePaddingRight ?? 0)
      const finalHorizontalPadding = (finalShape?.shapePaddingLeft ?? 0) + (finalShape?.shapePaddingRight ?? 0)

      expect(finalSnapshot.groupBoundsWidth).toBeLessThan(initialSnapshot.groupBoundsWidth - 1.5)
      expect(finalHorizontalPadding).toBeLessThan(initialHorizontalPadding)
      shapes.checkNodeInsideGroup({
        snapshot: finalSnapshot,
        kind: 'text'
      })
    })
  })
})
