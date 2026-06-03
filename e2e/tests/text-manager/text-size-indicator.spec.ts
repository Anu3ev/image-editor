import { test, expect } from '../../fixtures/editor.fixture'

/** Допустимая погрешность округления размеров в DOM-индикаторе. */
const TEXT_SIZE_INDICATOR_TOLERANCE = 1

test.describe('Индикатор размеров текстового объекта', () => {
  test.beforeEach(async({ text }) => {
    const textObject = await text.add({
      text: 'TEST',
      width: 87,
      fontSize: 32,
      autoExpand: false
    })

    text.checkCreation({ textObject })
  })

  test('при изменении только ширины показывает текущие размеры текста', async({
    editorModel,
    text
  }) => {
    const liveSnapshot = await test.step('Потянуть текст за правую ручку', async() => {
      return text.dragScaleHandleBy({
        corner: 'mr',
        deltaX: 28,
        deltaY: 0,
        objectIndex: 0,
        pointerSteps: 8
      })
    })

    const indicator = await test.step('Получить текст индикатора размеров', async() => {
      return editorModel.requireObjectSizeIndicator()
    })

    await test.step('Проверить, что индикатор показывает текущие размеры текста', () => {
      expect(Math.abs(indicator.width - Math.round(liveSnapshot.width)))
        .toBeLessThanOrEqual(TEXT_SIZE_INDICATOR_TOLERANCE)
      expect(Math.abs(indicator.height - Math.round(liveSnapshot.height)))
        .toBeLessThanOrEqual(TEXT_SIZE_INDICATOR_TOLERANCE)
    })
  })

  test('при скейлинге по диагонали показывает текущие размеры текста', async({
    editorModel,
    text
  }) => {
    const liveSnapshot = await test.step('Потянуть текст за правый нижний угол', async() => {
      return text.dragScaleHandleBy({
        corner: 'br',
        deltaX: 25,
        deltaY: 18,
        objectIndex: 0,
        pointerSteps: 8
      })
    })

    const indicator = await test.step('Получить текст индикатора размеров', async() => {
      return editorModel.requireObjectSizeIndicator()
    })

    await test.step('Проверить, что индикатор показывает текущие размеры текста', () => {
      expect(Math.abs(indicator.width - Math.round(liveSnapshot.width)))
        .toBeLessThanOrEqual(TEXT_SIZE_INDICATOR_TOLERANCE)
      expect(Math.abs(indicator.height - Math.round(liveSnapshot.height)))
        .toBeLessThanOrEqual(TEXT_SIZE_INDICATOR_TOLERANCE)
    })
  })
})
