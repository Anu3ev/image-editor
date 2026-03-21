import { test } from '../../fixtures/editor.fixture'
import type {
  ShapeHorizontalAlign,
  ShapeVerticalAlign
} from '../../types'

test.describe('Выравнивание текста (setTextAlign)', () => {
  const horizontalAligns: ShapeHorizontalAlign[] = ['left', 'center', 'right']
  const verticalAligns: ShapeVerticalAlign[] = ['top', 'middle', 'bottom']

  test('setTextAlign меняет горизонтальное выравнивание', async({ shapes }) => {
    await test.step('Добавить фигуру с текстом', () => shapes.add({ presetKey: 'square', options: { text: 'Тест' } }))

    const result = await test.step('Установить left', () => shapes.setTextAlign({ horizontal: 'left', objectIndex: 0 }))

    await test.step('Проверить выравнивание', () => shapes.checkTextAlign({ shape: result, horizontal: 'left' }))
  })

  test('setTextAlign меняет вертикальное выравнивание', async({ shapes }) => {
    await test.step('Добавить фигуру с текстом', () => shapes.add({ presetKey: 'square', options: { text: 'Тест' } }))

    const result = await test.step('Установить bottom', () => shapes.setTextAlign({ vertical: 'bottom', objectIndex: 0 }))

    await test.step('Проверить выравнивание', () => shapes.checkTextAlign({ shape: result, vertical: 'bottom' }))
  })

  for (const horizontal of horizontalAligns) {
    for (const vertical of verticalAligns) {
      test(`setTextAlign применяет комбинацию ${horizontal}/${vertical}`, async({ shapes }) => {
        await test.step('Добавить фигуру с текстом', () => shapes.add({ presetKey: 'square', options: { text: 'Тест' } }))

        const result = await test.step(`Установить ${horizontal}/${vertical}`, () => {
          return shapes.setTextAlign({ horizontal, vertical, objectIndex: 0 })
        })

        shapes.checkTextAlign({ shape: result, horizontal, vertical })
      })
    }
  }
})
