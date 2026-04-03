import { test, expect } from '../../fixtures/editor.fixture'
import type {
  ShapeHorizontalAlign,
  ShapeVerticalAlign
} from '../../types'

test.describe('Выравнивание текста внутри фигуры', () => {
  const horizontalAligns: ShapeHorizontalAlign[] = ['left', 'center', 'right', 'justify']
  const verticalAligns: ShapeVerticalAlign[] = ['top', 'middle', 'bottom']

  test('меняет горизонтальное выравнивание текста внутри фигуры', async({ shapes }) => {
    await test.step('Добавить фигуру с текстом', () => shapes.add({ presetKey: 'square', options: { text: 'Тест' } }))

    const result = await test.step('Установить выравнивание по левому краю', () => {
      return shapes.setTextAlign({ horizontal: 'left', objectIndex: 0 })
    })

    await test.step('Проверить выравнивание', () => shapes.checkTextAlign({ shape: result, horizontal: 'left' }))
  })

  test('меняет горизонтальное выравнивание текста внутри фигуры по ширине', async({ shapes }) => {
    await test.step('Добавить фигуру с текстом', () => shapes.add({
      presetKey: 'square', options: { text: 'Тест Тест \n тест тест тест' }
    }))

    const result = await test.step('Установить выравнивание по ширине', () => {
      return shapes.setTextAlign({ horizontal: 'justify', objectIndex: 0 })
    })

    await test.step('Проверить выравнивание по ширине', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      shapes.checkTextAlign({ shape: result, horizontal: 'justify' })
      expect(textNode?.textAlign).toBe('justify')
    })
  })

  test('меняет вертикальное выравнивание текста внутри фигуры', async({ shapes }) => {
    await test.step('Добавить фигуру с текстом', () => shapes.add({ presetKey: 'square', options: { text: 'Тест' } }))

    const result = await test.step('Установить выравнивание по нижнему краю', () => {
      return shapes.setTextAlign({ vertical: 'bottom', objectIndex: 0 })
    })

    await test.step('Проверить выравнивание', () => shapes.checkTextAlign({ shape: result, vertical: 'bottom' }))
  })

  for (const horizontal of horizontalAligns) {
    for (const vertical of verticalAligns) {
      test(`применяет сочетание выравнивания ${horizontal}/${vertical}`, async({ shapes }) => {
        await test.step('Добавить фигуру с текстом', () => shapes.add({
          presetKey: 'square', options: { text: 'Тест Тест \n тест тест тест' }
        }))

        const result = await test.step(`Установить выравнивание ${horizontal}/${vertical}`, () => {
          return shapes.setTextAlign({ horizontal, vertical, objectIndex: 0 })
        })

        shapes.checkTextAlign({ shape: result, horizontal, vertical })
      })
    }
  }
})
