import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_PRESERVE_ASPECT_BASE_OPTIONS,
  SHAPE_PRESERVE_ASPECT_FOLLOW_UP_TEXT,
  SHAPE_PRESERVE_ASPECT_REPLACEMENT_PRESET,
  SHAPE_PRESERVE_ASPECT_TOLERANCE
} from '../../fixtures/data/shape-preserve-aspect.data'

test.describe('Добавление фигуры с сохранением пропорций', () => {
  test('при добавлении стрелки длинный текст сразу расширяет фигуру и остаётся внутри неё', async({ shapes }) => {
    const createdShape = await test.step('Добавить стрелку с сохранением пропорций и крупным текстом', async() => {
      return shapes.add({
        presetKey: 'arrow-up',
        options: SHAPE_PRESERVE_ASPECT_BASE_OPTIONS
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'arrow-up'
    })

    const createdText = await test.step('Получить состояние текста сразу после добавления', () => {
      return shapes.getTextNode({ id: SHAPE_PRESERVE_ASPECT_BASE_OPTIONS.id })
    })
    const createdSnapshot = await test.step('Получить геометрию фигуры сразу после добавления', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_PRESERVE_ASPECT_BASE_OPTIONS.id })
    })

    await test.step('Проверить что фигура сразу выросла под текст и текст остался внутри', () => {
      expect(createdShape?.shapeTextAutoExpand).toBe(true)
      expect(createdText?.lineCount).toBe(1)
      expect(createdSnapshot.groupBoundsWidth)
        .toBeGreaterThan((SHAPE_PRESERVE_ASPECT_BASE_OPTIONS.width ?? 0) + SHAPE_PRESERVE_ASPECT_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: createdSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: createdSnapshot, kind: 'text' })
    })
  })

  test('после добавления стрелки с сохранением пропорций следующий ввод текста не схлопывает фигуру', async({ shapes }) => {
    const createdShape = await test.step('Добавить стрелку с сохранением пропорций и крупным текстом', async() => {
      return shapes.add({
        presetKey: 'arrow-up',
        options: {
          ...SHAPE_PRESERVE_ASPECT_BASE_OPTIONS,
          id: 'shape-preserve-aspect-next-input'
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'arrow-up'
    })

    const expandedSnapshot = await test.step('Получить размер фигуры сразу после добавления', () => {
      return shapes.getScaleSnapshot({ id: 'shape-preserve-aspect-next-input' })
    })

    await test.step('Открыть редактирование и ввести следующий текст', async() => {
      await shapes.enterTextEditing({ id: 'shape-preserve-aspect-next-input' })
      await shapes.updateEditingText({
        id: 'shape-preserve-aspect-next-input',
        text: SHAPE_PRESERVE_ASPECT_FOLLOW_UP_TEXT
      })
    })

    const currentText = await test.step('Получить состояние текста после следующего ввода', () => {
      return shapes.getTextNode({ id: 'shape-preserve-aspect-next-input' })
    })
    const currentSnapshot = await test.step('Получить размер фигуры после следующего ввода', () => {
      return shapes.getScaleSnapshot({ id: 'shape-preserve-aspect-next-input' })
    })

    await test.step('Проверить что следующий ввод не схлопнул фигуру', () => {
      expect(currentText?.lineCount).toBe(1)
      expect(currentSnapshot.groupBoundsWidth)
        .toBeGreaterThanOrEqual(expandedSnapshot.groupBoundsWidth - SHAPE_PRESERVE_ASPECT_TOLERANCE)
      expect(currentSnapshot.groupBoundsHeight)
        .toBeGreaterThanOrEqual(expandedSnapshot.groupBoundsHeight - SHAPE_PRESERVE_ASPECT_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: currentSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: currentSnapshot, kind: 'text' })
    })
  })

  // eslint-disable-next-line max-len
  test('после добавления стрелки с сохранением пропорций и роста под текст следующая смена фигуры сохраняет увеличенный размер', async({ shapes }) => {
    const createdShape = await test.step('Добавить стрелку с сохранением пропорций и крупным текстом', async() => {
      return shapes.add({
        presetKey: 'arrow-up',
        options: {
          ...SHAPE_PRESERVE_ASPECT_BASE_OPTIONS,
          id: 'shape-preserve-aspect-replace'
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'arrow-up'
    })

    const expandedSnapshot = await test.step('Получить размер фигуры после добавления', () => {
      return shapes.getScaleSnapshot({ id: 'shape-preserve-aspect-replace' })
    })

    const updatedShape = await test.step('Сменить фигуру на новый пресет', async() => {
      return shapes.update({
        id: 'shape-preserve-aspect-replace',
        presetKey: SHAPE_PRESERVE_ASPECT_REPLACEMENT_PRESET
      })
    })

    const updatedSnapshot = await test.step('Получить размер фигуры после смены пресета', () => {
      return shapes.getScaleSnapshot({ id: 'shape-preserve-aspect-replace' })
    })

    await test.step('Проверить что следующая смена фигуры использует уже увеличенный размер', () => {
      shapes.checkUpdate({
        shape: updatedShape,
        presetKey: SHAPE_PRESERVE_ASPECT_REPLACEMENT_PRESET
      })

      expect(updatedSnapshot.groupBoundsWidth)
        .toBeGreaterThanOrEqual(expandedSnapshot.groupBoundsWidth - SHAPE_PRESERVE_ASPECT_TOLERANCE)
      expect(updatedSnapshot.groupBoundsWidth)
        .toBeGreaterThan((SHAPE_PRESERVE_ASPECT_BASE_OPTIONS.width ?? 0) + SHAPE_PRESERVE_ASPECT_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'text' })
    })
  })
})
