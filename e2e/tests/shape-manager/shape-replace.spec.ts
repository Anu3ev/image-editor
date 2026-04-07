import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_REPLACE_ARROW_UP_RATIO,
  SHAPE_REPLACE_BASE_OPTIONS,
  SHAPE_REPLACE_EXPANDING_TEXT,
  SHAPE_REPLACE_TOLERANCE
} from '../../fixtures/data/shape-replace.data'

test.describe('Смена фигуры между пресетами с разными пропорциями', () => {
  test('после смены квадрата на стрелку вверх фигура принимает новые пропорции', async({ shapes }) => {
    const createdShape = await test.step('Добавить квадрат с коротким текстом', async() => {
      return shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_REPLACE_BASE_OPTIONS,
          id: 'shape-replace-arrow-up'
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'square'
    })

    const initialSnapshot = await test.step('Получить исходную геометрию квадрата', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-arrow-up' })
    })

    const updatedShape = await test.step('Сменить квадрат на стрелку вверх', async() => {
      return shapes.update({
        id: 'shape-replace-arrow-up',
        presetKey: 'arrow-up'
      })
    })

    const updatedSnapshot = await test.step('Получить геометрию после замены', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-arrow-up' })
    })

    await test.step('Проверить что фигура сразу учитывает текст и сохраняет пропорции нового пресета', () => {
      shapes.checkUpdate({
        shape: updatedShape,
        presetKey: 'arrow-up'
      })

      expect(updatedSnapshot.groupBoundsHeight)
        .toBeGreaterThan(initialSnapshot.groupBoundsHeight + SHAPE_REPLACE_TOLERANCE)
      expect(updatedSnapshot.groupBoundsWidth).toBeLessThan(initialSnapshot.groupBoundsWidth - 20)
      expect(updatedSnapshot.groupBoundsWidth / updatedSnapshot.groupBoundsHeight)
        .toBeCloseTo(SHAPE_REPLACE_ARROW_UP_RATIO, 1)
      expect(Math.abs(updatedSnapshot.textBoundsHeight - initialSnapshot.textBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_REPLACE_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'text' })
    })
  })

  test('после нескольких замен фигура не становится всё меньше', async({ shapes }) => {
    const createdShape = await test.step('Добавить квадрат для последовательных замен', async() => {
      return shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_REPLACE_BASE_OPTIONS,
          id: 'shape-replace-no-shrink'
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'square'
    })

    await test.step('Первый раз сменить фигуру на стрелку вверх', async() => {
      await shapes.update({
        id: 'shape-replace-no-shrink',
        presetKey: 'arrow-up'
      })
    })

    const firstArrowUpSnapshot = await test.step('Получить размер первой стрелки вверх', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-no-shrink' })
    })

    await test.step('Сменить фигуру на стрелку вправо и потом снова на стрелку вверх', async() => {
      await shapes.update({
        id: 'shape-replace-no-shrink',
        presetKey: 'arrow-right'
      })
      await shapes.update({
        id: 'shape-replace-no-shrink',
        presetKey: 'arrow-up'
      })
    })

    const secondArrowUpSnapshot = await test.step('Получить размер второй стрелки вверх', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-no-shrink' })
    })

    await test.step('Проверить что повторная замена не усушила фигуру', () => {
      expect(Math.abs(secondArrowUpSnapshot.groupBoundsWidth - firstArrowUpSnapshot.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_REPLACE_TOLERANCE)
      expect(Math.abs(secondArrowUpSnapshot.groupBoundsHeight - firstArrowUpSnapshot.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_REPLACE_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: secondArrowUpSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: secondArrowUpSnapshot, kind: 'text' })
    })
  })

  test('после расширения текста следующая замена сохраняет новый размер объекта', async({ shapes }) => {
    const createdShape = await test.step('Добавить квадрат для сценария с повторной заменой', async() => {
      return shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_REPLACE_BASE_OPTIONS,
          id: 'shape-replace-expanded-box'
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'square'
    })

    const initialSnapshot = await test.step('Получить исходный размер квадрата', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-expanded-box' })
    })

    await test.step('Сменить квадрат на стрелку вверх', async() => {
      await shapes.update({
        id: 'shape-replace-expanded-box',
        presetKey: 'arrow-up'
      })
    })

    const replacedSnapshot = await test.step('Получить размер стрелки вверх до расширения текста', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-expanded-box' })
    })

    await test.step('Задать длинный текст, который расширяет фигуру', async() => {
      await shapes.update({
        id: 'shape-replace-expanded-box',
        options: {
          text: SHAPE_REPLACE_EXPANDING_TEXT
        }
      })
    })

    const expandedSnapshot = await test.step('Получить размер фигуры после расширения текста', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-expanded-box' })
    })

    await test.step('Сменить фигуру на стрелку вправо', async() => {
      await shapes.update({
        id: 'shape-replace-expanded-box',
        presetKey: 'arrow-right'
      })
    })

    const finalSnapshot = await test.step('Получить размер фигуры после следующей замены', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-expanded-box' })
    })

    await test.step('Проверить что следующая замена использует уже увеличенный размер объекта', () => {
      expect(expandedSnapshot.groupBoundsWidth)
        .toBeGreaterThan(replacedSnapshot.groupBoundsWidth + SHAPE_REPLACE_TOLERANCE)
      expect(finalSnapshot.groupBoundsWidth)
        .toBeGreaterThan(initialSnapshot.groupBoundsWidth + SHAPE_REPLACE_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })
})
