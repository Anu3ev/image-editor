import { test, expect } from '../../fixtures/editor.fixture'
import type { TextHorizontalAlign } from '../../types'
import {
  TEXT_AFTER_DIAGONAL_SCALE_ADD_OPTIONS,
  TEXT_AFTER_DIAGONAL_SCALE_BACKGROUND_STYLE,
  TEXT_AFTER_DIAGONAL_SCALE_PADDING_RIGHT,
  TEXT_AFTER_DIAGONAL_SCALE_PADDING_TOP,
  TEXT_RIGHT_BOTTOM_ADD_OPTIONS,
  TEXT_RIGHT_BOTTOM_EDITED_TEXT,
  TEXT_RIGHT_BOTTOM_UPDATED_STYLE
} from '../../fixtures/data/object-placement.data'
import {
  TEXT_DIAGONAL_SCALING_FACTORS,
  TEXT_RESIZING_TOLERANCE
} from '../../fixtures/data/text-resizing.data'

test.describe('Изменение текстового объекта', () => {
  test.beforeEach(async({ text }) => {
    const textObject = await text.add({
      text: 'Исходный текст'
    })

    text.checkCreation({ textObject })
  })

  test('обновляет стиль текстового объекта без входа в режим редактирования текста', async({
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

    await test.step('Проверить что стиль обновился без входа в режим редактирования текста', async() => {
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

test.describe('Позиционирование текстового объекта', () => {
  test.beforeEach(async({ text }) => {
    const textObject = await text.add(TEXT_RIGHT_BOTTOM_ADD_OPTIONS)

    text.checkCreation({ textObject })
  })

  test('обновление текста с правым нижним позиционированием не сдвигает объект', async({ text }) => {
    const initialSnapshot = await test.step('Получить исходное положение текста', () => {
      return text.getResizeSnapshot({ id: TEXT_RIGHT_BOTTOM_ADD_OPTIONS.id })
    })

    await test.step('Обновить стиль текста', async() => {
      const updatedTextObject = await text.updateStyle({
        id: TEXT_RIGHT_BOTTOM_ADD_OPTIONS.id,
        style: TEXT_RIGHT_BOTTOM_UPDATED_STYLE
      })

      expect(updatedTextObject?.fontSize).toBe(TEXT_RIGHT_BOTTOM_UPDATED_STYLE.fontSize)
      expect(updatedTextObject?.fontWeight).toBe('bold')
    })

    await test.step('Проверить что правая нижняя точка осталась на месте', async() => {
      const updatedSnapshot = await text.getResizeSnapshot({ id: TEXT_RIGHT_BOTTOM_ADD_OPTIONS.id })

      expect(updatedSnapshot.rightBottomX).toBeCloseTo(initialSnapshot.rightBottomX, 1)
      expect(updatedSnapshot.rightBottomY).toBeCloseTo(initialSnapshot.rightBottomY, 1)
    })
  })

  test('ввод текста с правым нижним позиционированием не сдвигает объект', async({ text }) => {
    const initialSnapshot = await test.step('Получить исходное положение текста', () => {
      return text.getResizeSnapshot({ id: TEXT_RIGHT_BOTTOM_ADD_OPTIONS.id })
    })

    await test.step('Открыть редактирование и ввести более длинный текст', async() => {
      await text.enterTextEditing({ id: TEXT_RIGHT_BOTTOM_ADD_OPTIONS.id })
      await text.updateEditingText({
        id: TEXT_RIGHT_BOTTOM_ADD_OPTIONS.id,
        text: TEXT_RIGHT_BOTTOM_EDITED_TEXT
      })
    })

    await test.step('Проверить что правая нижняя точка не сдвинулась', async() => {
      const currentTextObject = await text.getObject({ id: TEXT_RIGHT_BOTTOM_ADD_OPTIONS.id })
      const updatedSnapshot = await text.getResizeSnapshot({ id: TEXT_RIGHT_BOTTOM_ADD_OPTIONS.id })

      expect(currentTextObject?.isEditing).toBe(true)
      expect(currentTextObject?.text).toBe(TEXT_RIGHT_BOTTOM_EDITED_TEXT)
      expect(updatedSnapshot.rightBottomX).toBeCloseTo(initialSnapshot.rightBottomX, 1)
      expect(updatedSnapshot.rightBottomY).toBeCloseTo(initialSnapshot.rightBottomY, 1)
    })
  })
})

test.describe('Позиционирование текста после скейлинга по диагонали', () => {
  test.describe('объект создан напрямую', () => {
    test.beforeEach(async({ text }) => {
      const textObject = await text.add(TEXT_AFTER_DIAGONAL_SCALE_ADD_OPTIONS)

      text.checkCreation({ textObject })
    })

    test('после скейлинга по диагонали текст не сдвигается, когда ему включают фон и увеличивают верхний отступ', async({
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние текста до скейлинга', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const scaledSnapshot = await test.step('Масштабировать текст по диагонали и зафиксировать новый размер', async() => {
        await text.scaleDiagonallyFromBottomRight({
          objectIndex: 0,
          scaleX: TEXT_DIAGONAL_SCALING_FACTORS.scaleX,
          scaleY: TEXT_DIAGONAL_SCALING_FACTORS.scaleY
        })

        return text.finishScale({ objectIndex: 0 })
      })

      await test.step('Увести курсор с объекта после завершения скейлинга', async() => {
        await text.movePointerAwayFromObject({ objectIndex: 0 })
      })

      const backgroundSnapshot = await test.step('Включить фон текста', async() => {
        const updatedTextObject = await text.updateStyle({
          objectIndex: 0,
          style: TEXT_AFTER_DIAGONAL_SCALE_BACKGROUND_STYLE
        })

        expect(updatedTextObject?.backgroundColor?.toLowerCase())
          .toBe(TEXT_AFTER_DIAGONAL_SCALE_BACKGROUND_STYLE.backgroundColor)

        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const afterPaddingSnapshot = await test.step('Увеличить верхний отступ и получить новое положение', async() => {
        const updatedTextObject = await text.updateStyle({
          objectIndex: 0,
          style: {
            paddingTop: TEXT_AFTER_DIAGONAL_SCALE_PADDING_TOP
          }
        })

        expect(updatedTextObject?.paddingTop).toBe(TEXT_AFTER_DIAGONAL_SCALE_PADDING_TOP)

        return text.getResizeSnapshot({ objectIndex: 0 })
      })
      await test.step('Проверить что после скейлинга, включения фона и увеличения верхнего отступа текст остался на месте', () => {
        expect(scaledSnapshot.fontSize).toBeGreaterThan(initialSnapshot.fontSize + 1)
        expect(scaledSnapshot.scaleX).toBe(1)
        expect(scaledSnapshot.scaleY).toBe(1)
        expect(backgroundSnapshot.textAreaLeftTopX).toBeCloseTo(scaledSnapshot.textAreaLeftTopX, 1)
        expect(backgroundSnapshot.textAreaLeftTopY).toBeCloseTo(scaledSnapshot.textAreaLeftTopY, 1)
        expect(afterPaddingSnapshot.backgroundColor?.toLowerCase())
          .toBe(TEXT_AFTER_DIAGONAL_SCALE_BACKGROUND_STYLE.backgroundColor)
        expect(afterPaddingSnapshot.paddingTop).toBe(TEXT_AFTER_DIAGONAL_SCALE_PADDING_TOP)
        expect(afterPaddingSnapshot.textAreaLeftTopX).toBeCloseTo(backgroundSnapshot.textAreaLeftTopX, 1)
        expect(afterPaddingSnapshot.textAreaLeftTopY).toBeCloseTo(backgroundSnapshot.textAreaLeftTopY, 1)
      })
    })

    test('после скейлинга по диагонали текст не сдвигается, когда ему включают фон и увеличивают правый отступ', async({
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние текста до скейлинга', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const scaledSnapshot = await test.step('Масштабировать текст по диагонали и зафиксировать новый размер', async() => {
        await text.scaleDiagonallyFromBottomRight({
          objectIndex: 0,
          scaleX: TEXT_DIAGONAL_SCALING_FACTORS.scaleX,
          scaleY: TEXT_DIAGONAL_SCALING_FACTORS.scaleY
        })

        return text.finishScale({ objectIndex: 0 })
      })

      await test.step('Увести курсор с объекта после завершения скейлинга', async() => {
        await text.movePointerAwayFromObject({ objectIndex: 0 })
      })

      const backgroundSnapshot = await test.step('Включить фон текста', async() => {
        const updatedTextObject = await text.updateStyle({
          objectIndex: 0,
          style: TEXT_AFTER_DIAGONAL_SCALE_BACKGROUND_STYLE
        })

        expect(updatedTextObject?.backgroundColor?.toLowerCase())
          .toBe(TEXT_AFTER_DIAGONAL_SCALE_BACKGROUND_STYLE.backgroundColor)

        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const afterPaddingSnapshot = await test.step('Увеличить правый отступ и получить новое положение', async() => {
        const updatedTextObject = await text.updateStyle({
          objectIndex: 0,
          style: {
            paddingRight: TEXT_AFTER_DIAGONAL_SCALE_PADDING_RIGHT
          }
        })

        expect(updatedTextObject?.paddingRight).toBe(TEXT_AFTER_DIAGONAL_SCALE_PADDING_RIGHT)

        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      await test.step('Проверить что после скейлинга, включения фона и увеличения правого отступа текст остался на месте', () => {
        expect(scaledSnapshot.fontSize).toBeGreaterThan(initialSnapshot.fontSize + 1)
        expect(scaledSnapshot.scaleX).toBe(1)
        expect(scaledSnapshot.scaleY).toBe(1)
        expect(backgroundSnapshot.textAreaLeftTopX).toBeCloseTo(scaledSnapshot.textAreaLeftTopX, 1)
        expect(backgroundSnapshot.textAreaLeftTopY).toBeCloseTo(scaledSnapshot.textAreaLeftTopY, 1)
        expect(afterPaddingSnapshot.backgroundColor?.toLowerCase())
          .toBe(TEXT_AFTER_DIAGONAL_SCALE_BACKGROUND_STYLE.backgroundColor)
        expect(afterPaddingSnapshot.paddingRight).toBe(TEXT_AFTER_DIAGONAL_SCALE_PADDING_RIGHT)
        expect(afterPaddingSnapshot.textAreaLeftTopX).toBeCloseTo(backgroundSnapshot.textAreaLeftTopX, 1)
        expect(afterPaddingSnapshot.textAreaLeftTopY).toBeCloseTo(backgroundSnapshot.textAreaLeftTopY, 1)
      })
    })
  })

  // eslint-disable-next-line max-len
  test('объект, созданный напрямую, и объект, восстановленный из шаблона, одинаково держат позицию при увеличении верхнего отступа после скейлинга по диагонали', async({
    editorModel,
    template,
    text
  }) => {
    await test.step('Добавить текст, созданный напрямую', async() => {
      const textObject = await text.add(TEXT_AFTER_DIAGONAL_SCALE_ADD_OPTIONS)

      text.checkCreation({ textObject })
    })

    const serializedTemplate = await test.step('Сохранить этот текст в шаблон', async() => {
      await text.select({ objectIndex: 0 })

      const currentTemplate = await template.serializeSelection()

      expect(currentTemplate).not.toBeNull()

      return currentTemplate!
    })

    await test.step('Восстановить текст из шаблона на тот же canvas', async() => {
      const insertedCount = await template.applyTemplate({
        template: serializedTemplate
      })

      expect(insertedCount).toBe(1)
      await editorModel.checkObjectCount({ count: 2 })
    })

    const directScaledSnapshot = await test.step('Масштабировать по диагонали текст, созданный напрямую', async() => {
      await text.scaleDiagonallyFromBottomRight({
        objectIndex: 0,
        scaleX: TEXT_DIAGONAL_SCALING_FACTORS.scaleX,
        scaleY: TEXT_DIAGONAL_SCALING_FACTORS.scaleY
      })

      return text.finishScale({ objectIndex: 0 })
    })

    const restoredScaledSnapshot = await test.step('Масштабировать по диагонали текст, восстановленный из шаблона', async() => {
      await text.scaleDiagonallyFromBottomRight({
        objectIndex: 1,
        scaleX: TEXT_DIAGONAL_SCALING_FACTORS.scaleX,
        scaleY: TEXT_DIAGONAL_SCALING_FACTORS.scaleY
      })

      return text.finishScale({ objectIndex: 1 })
    })

    await test.step('Увести курсор с текста, созданного напрямую, после завершения скейлинга', async() => {
      await text.movePointerAwayFromObject({ objectIndex: 0 })
    })

    await test.step('Увести курсор с текста, восстановленного из шаблона, после завершения скейлинга', async() => {
      await text.movePointerAwayFromObject({ objectIndex: 1 })
    })

    const directBackgroundSnapshot = await test.step('Включить фон у текста, созданного напрямую', async() => {
      const updatedTextObject = await text.updateStyle({
        objectIndex: 0,
        style: TEXT_AFTER_DIAGONAL_SCALE_BACKGROUND_STYLE
      })

      expect(updatedTextObject?.backgroundColor?.toLowerCase())
        .toBe(TEXT_AFTER_DIAGONAL_SCALE_BACKGROUND_STYLE.backgroundColor)

      return text.getResizeSnapshot({ objectIndex: 0 })
    })

    const restoredBackgroundSnapshot = await test.step('Включить фон у текста, восстановленного из шаблона', async() => {
      const updatedTextObject = await text.updateStyle({
        objectIndex: 1,
        style: TEXT_AFTER_DIAGONAL_SCALE_BACKGROUND_STYLE
      })

      expect(updatedTextObject?.backgroundColor?.toLowerCase())
        .toBe(TEXT_AFTER_DIAGONAL_SCALE_BACKGROUND_STYLE.backgroundColor)

      return text.getResizeSnapshot({ objectIndex: 1 })
    })

    // eslint-disable-next-line max-len
    const directAfterPaddingSnapshot = await test.step('Увеличить верхний отступ у текста, созданного напрямую', async() => {
      const updatedTextObject = await text.updateStyle({
        objectIndex: 0,
        style: {
          paddingTop: TEXT_AFTER_DIAGONAL_SCALE_PADDING_TOP
        }
      })

      expect(updatedTextObject?.paddingTop).toBe(TEXT_AFTER_DIAGONAL_SCALE_PADDING_TOP)

      return text.getResizeSnapshot({ objectIndex: 0 })
    })

    // eslint-disable-next-line max-len
    const restoredAfterPaddingSnapshot = await test.step('Увеличить верхний отступ у текста, восстановленного из шаблона', async() => {
      const updatedTextObject = await text.updateStyle({
        objectIndex: 1,
        style: {
          paddingTop: TEXT_AFTER_DIAGONAL_SCALE_PADDING_TOP
        }
      })

      expect(updatedTextObject?.paddingTop).toBe(TEXT_AFTER_DIAGONAL_SCALE_PADDING_TOP)

      return text.getResizeSnapshot({ objectIndex: 1 })
    })

    await test.step('Проверить что оба текста одинаково сохранили позицию после включения фона и увеличения верхнего отступа', () => {
      expect(directScaledSnapshot.scaleX).toBe(1)
      expect(directScaledSnapshot.scaleY).toBe(1)
      expect(restoredScaledSnapshot.scaleX).toBe(1)
      expect(restoredScaledSnapshot.scaleY).toBe(1)
      expect(Math.abs(directScaledSnapshot.width - restoredScaledSnapshot.width))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      expect(directBackgroundSnapshot.textAreaLeftTopX).toBeCloseTo(directScaledSnapshot.textAreaLeftTopX, 1)
      expect(directBackgroundSnapshot.textAreaLeftTopY).toBeCloseTo(directScaledSnapshot.textAreaLeftTopY, 1)
      expect(restoredBackgroundSnapshot.textAreaLeftTopX).toBeCloseTo(restoredScaledSnapshot.textAreaLeftTopX, 1)
      expect(restoredBackgroundSnapshot.textAreaLeftTopY).toBeCloseTo(restoredScaledSnapshot.textAreaLeftTopY, 1)
      expect(directAfterPaddingSnapshot.paddingTop).toBe(TEXT_AFTER_DIAGONAL_SCALE_PADDING_TOP)
      expect(restoredAfterPaddingSnapshot.paddingTop).toBe(TEXT_AFTER_DIAGONAL_SCALE_PADDING_TOP)
      expect(directAfterPaddingSnapshot.textAreaLeftTopX).toBeCloseTo(directBackgroundSnapshot.textAreaLeftTopX, 1)
      expect(directAfterPaddingSnapshot.textAreaLeftTopY).toBeCloseTo(directBackgroundSnapshot.textAreaLeftTopY, 1)
      expect(restoredAfterPaddingSnapshot.textAreaLeftTopX).toBeCloseTo(restoredBackgroundSnapshot.textAreaLeftTopX, 1)
      expect(restoredAfterPaddingSnapshot.textAreaLeftTopY).toBeCloseTo(restoredBackgroundSnapshot.textAreaLeftTopY, 1)
      expect(Math.abs(directAfterPaddingSnapshot.width - restoredAfterPaddingSnapshot.width))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      expect(directAfterPaddingSnapshot.lineCount).toBe(restoredAfterPaddingSnapshot.lineCount)
    })
  })

  // eslint-disable-next-line max-len
  test('после undo и redo восстановленный из шаблона текст не сдвигается при следующем увеличении отступа после скейлинга по диагонали', async({
    history,
    template,
    text
  }) => {
    await test.step('Добавить исходный текст для восстановления через шаблон', async() => {
      const textObject = await text.add(TEXT_AFTER_DIAGONAL_SCALE_ADD_OPTIONS)

      text.checkCreation({ textObject })
    })

    const serializedTemplate = await test.step('Сохранить исходный текст в шаблон', async() => {
      await text.select({ objectIndex: 0 })

      const currentTemplate = await template.serializeSelection()

      expect(currentTemplate).not.toBeNull()

      return currentTemplate!
    })

    await test.step('Восстановить текст из шаблона', async() => {
      const insertedCount = await template.applyTemplate({
        template: serializedTemplate
      })

      expect(insertedCount).toBe(1)
    })

    await test.step('Масштабировать по диагонали восстановленный текст', async() => {
      await text.scaleDiagonallyFromBottomRight({
        objectIndex: 1,
        scaleX: TEXT_DIAGONAL_SCALING_FACTORS.scaleX,
        scaleY: TEXT_DIAGONAL_SCALING_FACTORS.scaleY
      })

      await text.finishScale({ objectIndex: 1 })
    })

    await test.step('Увести курсор с восстановленного текста после завершения скейлинга', async() => {
      await text.movePointerAwayFromObject({ objectIndex: 1 })
    })

    await test.step('Включить фон и увеличить верхний отступ у восстановленного текста', async() => {
      const backgroundTextObject = await text.updateStyle({
        objectIndex: 1,
        style: TEXT_AFTER_DIAGONAL_SCALE_BACKGROUND_STYLE
      })

      expect(backgroundTextObject?.backgroundColor?.toLowerCase())
        .toBe(TEXT_AFTER_DIAGONAL_SCALE_BACKGROUND_STYLE.backgroundColor)

      const paddedTextObject = await text.updateStyle({
        objectIndex: 1,
        style: {
          paddingTop: TEXT_AFTER_DIAGONAL_SCALE_PADDING_TOP
        }
      })

      expect(paddedTextObject?.paddingTop).toBe(TEXT_AFTER_DIAGONAL_SCALE_PADDING_TOP)
    })

    const beforeUndoSnapshot = await test.step('Получить состояние восстановленного текста перед undo', async() => {
      return text.getResizeSnapshot({ objectIndex: 1 })
    })

    await test.step('Сделать undo и redo для последнего изменения', async() => {
      await history.flushPendingSave()
      await history.undo()
      await history.redo()
    })

    const afterRedoSnapshot = await test.step('Получить состояние восстановленного текста после redo', async() => {
      return text.getResizeSnapshot({ objectIndex: 1 })
    })

    // eslint-disable-next-line max-len
    const afterNextPaddingSnapshot = await test.step('Ещё раз увеличить правый отступ у восстановленного текста после redo', async() => {
      const updatedTextObject = await text.updateStyle({
        objectIndex: 1,
        style: {
          paddingRight: TEXT_AFTER_DIAGONAL_SCALE_PADDING_RIGHT
        }
      })

      expect(updatedTextObject?.paddingRight).toBe(TEXT_AFTER_DIAGONAL_SCALE_PADDING_RIGHT)

      return text.getResizeSnapshot({ objectIndex: 1 })
    })

    await test.step('Проверить что после undo, redo и следующего изменения отступа текст остаётся на месте', () => {
      expect(afterRedoSnapshot.backgroundColor?.toLowerCase())
        .toBe(TEXT_AFTER_DIAGONAL_SCALE_BACKGROUND_STYLE.backgroundColor)
      expect(afterRedoSnapshot.paddingTop).toBe(TEXT_AFTER_DIAGONAL_SCALE_PADDING_TOP)
      expect(Math.abs(afterRedoSnapshot.width - beforeUndoSnapshot.width))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      expect(afterRedoSnapshot.leftTopX).toBeCloseTo(beforeUndoSnapshot.leftTopX, 1)
      expect(afterRedoSnapshot.leftTopY).toBeCloseTo(beforeUndoSnapshot.leftTopY, 1)
      expect(afterNextPaddingSnapshot.paddingRight).toBe(TEXT_AFTER_DIAGONAL_SCALE_PADDING_RIGHT)
      expect(afterNextPaddingSnapshot.leftTopX).toBeCloseTo(afterRedoSnapshot.leftTopX, 1)
      expect(afterNextPaddingSnapshot.leftTopY).toBeCloseTo(afterRedoSnapshot.leftTopY, 1)
    })
  })
})

test.describe('Тулбар во время редактирования текста', () => {
  test('в режиме редактирования текста кнопка "Создать копию" создаёт рабочую копию текстового объекта', async({
    canvas,
    editorModel,
    text,
    toolbar
  }) => {
    const textObject = await test.step('Добавить отдельный текстовый объект', async() => {
      return text.add({
        text: 'Новый текст'
      })
    })

    expect(textObject).not.toBeNull()
    expect(typeof textObject?.id).toBe('string')

    const sourceTextId = textObject!.id as string

    await test.step('Открыть редактирование текста через реальный двойной клик', async() => {
      const editingText = await text.openTextEditingFromCanvas({ id: sourceTextId })

      expect(editingText?.isEditing).toBe(true)
      await toolbar.waitUntilVisible()
    })

    await test.step('Нажать кнопку "Создать копию" в тулбаре', async() => {
      await toolbar.clickAction({
        name: 'Создать копию'
      })

      await editorModel.checkObjectCount({ count: 2 })
    })

    const copiedTextId = await test.step('Найти id созданной копии', async() => {
      const objects = await editorModel.getObjects()
      const copiedText = objects.find((item) => {
        return item.type === 'background-textbox' && item.id !== sourceTextId
      })

      expect(copiedText).toBeDefined()
      expect(typeof copiedText?.id).toBe('string')

      return copiedText!.id as string
    })

    await test.step('Сбросить текущее выделение реальным кликом по монтажной области', async() => {
      await canvas.clickTopLeftInsideMontageArea()

      const activeObject = await editorModel.getActiveObject()

      expect(activeObject).toBeNull()
    })

    await test.step('Реальным кликом выбрать копию и удалить её как рабочий текстовый объект', async() => {
      await text.clickOnCanvas({
        id: copiedTextId,
        point: 'bottom-right'
      })

      const activeObject = await editorModel.getActiveObject()

      expect(activeObject?.id).toBe(copiedTextId)
      expect(activeObject?.type).toBe('background-textbox')

      await editorModel.deleteSelectedObject()
      await editorModel.checkObjectCount({ count: 1 })
    })
  })
})
