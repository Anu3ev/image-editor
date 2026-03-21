import { test, expect } from '../../fixtures/editor.fixture'
import type { TextHorizontalAlign } from '../../types'

test.describe('Изменение текстового объекта', () => {
  test.beforeEach(async({ text }) => {
    const textObject = await text.add({
      text: 'Исходный текст'
    })

    text.checkCreation({ textObject })
  })

  test('обновляет стиль текстового объекта без входа в режим редактирования', async({
    editorModel,
    text
  }) => {
    const textObject = await test.step('Получить текстовый объект до изменения стиля', async() => {
      const currentTextObject = await text.getObject({ objectIndex: 0 })
      return text.checkCreation({ textObject: currentTextObject })
    })

    await test.step('Применить несколько визуальных изменений одним действием', async() => {
      const updatedTextObject = await text.updateStyle({
        objectIndex: 0,
        style: {
          fontFamily: 'Roboto',
          fontSize: 54,
          color: '#ff0055',
          strokeColor: '#111111',
          strokeWidth: 2,
          bold: true,
          underline: true,
          opacity: 0.45
        }
      })

      expect(updatedTextObject).not.toBeNull()
    })

    await test.step('Проверить что стиль обновился без входа в редактирование', async() => {
      const updatedTextObject = await text.getObject({ objectIndex: 0 })
      const activeObject = await editorModel.getActiveObject()

      expect(updatedTextObject?.fontFamily).toBe('Roboto')
      expect(updatedTextObject?.fontSize).toBe(54)
      expect(updatedTextObject?.fill).toBe('#ff0055')
      expect(updatedTextObject?.stroke).toBe('#111111')
      expect(updatedTextObject?.strokeWidth).toBe(2)
      expect(updatedTextObject?.fontWeight).toBe('bold')
      expect(updatedTextObject?.underline).toBe(true)
      expect(updatedTextObject?.opacity).toBe(0.45)
      expect(updatedTextObject?.isEditing).toBe(false)
      expect(activeObject?.id).toBe(textObject.id)
      expect(activeObject?.type).toBe('background-textbox')
    })
  })

  test('включает и выключает верхний регистр без потери исходного текста', async({
    text
  }) => {
    await test.step('Включить верхний регистр для текста', async() => {
      await text.updateStyle({
        objectIndex: 0,
        style: {
          uppercase: true
        }
      })
    })

    await test.step('Проверить что текст отображается в верхнем регистре', async() => {
      const updatedTextObject = await text.getObject({ objectIndex: 0 })

      expect(updatedTextObject?.uppercase).toBe(true)
      expect(updatedTextObject?.text).toBe('ИСХОДНЫЙ ТЕКСТ')
    })

    await test.step('Выключить верхний регистр', async() => {
      await text.updateStyle({
        objectIndex: 0,
        style: {
          uppercase: false
        }
      })
    })

    await test.step('Проверить что исходный текст вернулся без потерь', async() => {
      const updatedTextObject = await text.getObject({ objectIndex: 0 })

      expect(updatedTextObject?.uppercase).toBe(false)
      expect(updatedTextObject?.text).toBe('Исходный текст')
    })
  })

  test('циклически меняет горизонтальное выравнивание текста', async({
    text
  }) => {
    const alignSequence: TextHorizontalAlign[] = ['left', 'center', 'right', 'left']

    await test.step('Последовательно переключить выравнивание текста', async() => {
      for (let index = 0; index < alignSequence.length; index += 1) {
        const align = alignSequence[index]
        const updatedTextObject = await text.updateStyle({
          objectIndex: 0,
          style: {
            align
          }
        })

        expect(updatedTextObject?.textAlign).toBe(align)
      }
    })
  })

  test('обновляет фон, внутренние отступы и скругление текстового объекта', async({
    text
  }) => {
    await test.step('Применить фон, отступы и скругление', async() => {
      await text.updateStyle({
        objectIndex: 0,
        style: {
          backgroundColor: '#EBE4ED',
          backgroundOpacity: 0.85,
          paddingTop: 16,
          paddingRight: 12,
          paddingBottom: 20,
          paddingLeft: 10,
          radiusTopLeft: 24,
          radiusTopRight: 18,
          radiusBottomRight: 28,
          radiusBottomLeft: 14
        }
      })
    })

    await test.step('Проверить что визуальные параметры применились', async() => {
      const updatedTextObject = await text.getObject({ objectIndex: 0 })

      expect(updatedTextObject?.backgroundColor).toBe('#EBE4ED')
      expect(updatedTextObject?.backgroundOpacity).toBe(0.85)
      expect(updatedTextObject?.paddingTop).toBe(16)
      expect(updatedTextObject?.paddingRight).toBe(12)
      expect(updatedTextObject?.paddingBottom).toBe(20)
      expect(updatedTextObject?.paddingLeft).toBe(10)
      expect(updatedTextObject?.radiusTopLeft).toBe(24)
      expect(updatedTextObject?.radiusTopRight).toBe(18)
      expect(updatedTextObject?.radiusBottomRight).toBe(28)
      expect(updatedTextObject?.radiusBottomLeft).toBe(14)
    })
  })

  test('сохраняет ранее применённые визуальные изменения при последовательных обновлениях', async({
    text
  }) => {
    await test.step('Сначала изменить цвет текста и фона', async() => {
      await text.updateStyle({
        objectIndex: 0,
        style: {
          color: '#3366ff',
          backgroundColor: '#f5f1d6',
          backgroundOpacity: 0.9
        }
      })
    })

    await test.step('Затем отдельно изменить размер и начертание', async() => {
      await text.updateStyle({
        objectIndex: 0,
        style: {
          fontSize: 60,
          italic: true
        }
      })
    })

    await test.step('Проверить что первый набор изменений не потерялся', async() => {
      const updatedTextObject = await text.getObject({ objectIndex: 0 })

      expect(updatedTextObject?.fill).toBe('#3366ff')
      expect(updatedTextObject?.backgroundColor).toBe('#f5f1d6')
      expect(updatedTextObject?.backgroundOpacity).toBe(0.9)
      expect(updatedTextObject?.fontSize).toBe(60)
      expect(updatedTextObject?.fontStyle).toBe('italic')
    })
  })
})
