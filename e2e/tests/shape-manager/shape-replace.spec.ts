import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_REPLACE_ARROW_UP_RATIO,
  SHAPE_REPLACE_BASE_OPTIONS,
  SHAPE_REPLACE_DISABLED_FOLLOW_UP_TEXT,
  SHAPE_REPLACE_EXPANDING_TEXT,
  SHAPE_REPLACE_FOLLOW_UP_TEXT,
  SHAPE_REPLACE_LIMIT_RESOLUTION,
  SHAPE_REPLACE_LIMIT_TEXT,
  SHAPE_REPLACE_RESIZE_SCALE_X,
  SHAPE_REPLACE_STYLE_FONT_SIZE,
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

  test('после замены следующий ввод текста не схлопывает фигуру обратно', async({ shapes }) => {
    const createdShape = await test.step('Добавить квадрат для следующего ввода после замены', async() => {
      return shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_REPLACE_BASE_OPTIONS,
          id: 'shape-replace-next-input'
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'square'
    })

    await test.step('Сменить квадрат на стрелку вверх', async() => {
      await shapes.update({
        id: 'shape-replace-next-input',
        presetKey: 'arrow-up'
      })
    })

    const replacedSnapshot = await test.step('Получить размер фигуры сразу после замены', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-next-input' })
    })

    await test.step('Открыть редактирование и ввести следующий текст', async() => {
      await shapes.enterTextEditing({ id: 'shape-replace-next-input' })
      await shapes.updateEditingText({
        id: 'shape-replace-next-input',
        text: SHAPE_REPLACE_FOLLOW_UP_TEXT
      })
    })

    const updatedText = await test.step('Получить состояние текста после следующего ввода', () => {
      return shapes.getTextNode({ id: 'shape-replace-next-input' })
    })
    const updatedSnapshot = await test.step('Получить размер фигуры после следующего ввода', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-next-input' })
    })

    await test.step('Проверить что следующий ввод не вернул фигуру к прежнему размеру', () => {
      expect(updatedText?.lineCount).toBe(1)
      expect(updatedSnapshot.groupBoundsWidth)
        .toBeGreaterThanOrEqual(replacedSnapshot.groupBoundsWidth - SHAPE_REPLACE_TOLERANCE)
      expect(updatedSnapshot.groupBoundsHeight)
        .toBeGreaterThanOrEqual(replacedSnapshot.groupBoundsHeight - SHAPE_REPLACE_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'text' })
    })
  })

  test('при выключенном авторасширении после замены следующий ввод текста не схлопывает фигуру обратно', async({ shapes }) => {
    const createdShape = await test.step('Добавить квадрат с выключенным авторасширением', async() => {
      return shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_REPLACE_BASE_OPTIONS,
          id: 'shape-replace-next-input-disabled',
          shapeTextAutoExpand: false
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'square'
    })

    await test.step('Сменить квадрат на star', async() => {
      await shapes.update({
        id: 'shape-replace-next-input-disabled',
        presetKey: 'star'
      })
    })

    const replacedShape = await test.step('Получить состояние фигуры сразу после замены', () => {
      return shapes.getObject({ id: 'shape-replace-next-input-disabled' })
    })
    const replacedSnapshot = await test.step('Получить размер фигуры сразу после замены', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-next-input-disabled' })
    })

    await test.step('Открыть редактирование и ввести следующий текст', async() => {
      await shapes.enterTextEditing({ id: 'shape-replace-next-input-disabled' })
      await shapes.updateEditingText({
        id: 'shape-replace-next-input-disabled',
        text: SHAPE_REPLACE_DISABLED_FOLLOW_UP_TEXT
      })
    })

    const updatedShape = await test.step('Получить состояние фигуры после следующего ввода', () => {
      return shapes.getObject({ id: 'shape-replace-next-input-disabled' })
    })
    const updatedText = await test.step('Получить состояние текста после следующего ввода', () => {
      return shapes.getTextNode({ id: 'shape-replace-next-input-disabled' })
    })
    const updatedSnapshot = await test.step('Получить размер фигуры после следующего ввода', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-next-input-disabled' })
    })

    await test.step('Проверить что фигура не схлопнулась, а текст перенёсся внутри неё', () => {
      expect(replacedShape?.shapeTextAutoExpand).toBe(false)
      expect(updatedShape?.shapeTextAutoExpand).toBe(false)
      expect(updatedText?.lineCount).toBeGreaterThan(1)
      expect(updatedSnapshot.groupBoundsWidth)
        .toBeGreaterThanOrEqual(replacedSnapshot.groupBoundsWidth - SHAPE_REPLACE_TOLERANCE)
      expect(updatedSnapshot.groupBoundsHeight)
        .toBeGreaterThanOrEqual(replacedSnapshot.groupBoundsHeight - SHAPE_REPLACE_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'text' })
    })
  })

  test('если после замены текст упирается в ширину монтажной области, фигура остаётся внутри неё по ширине и текст переносится', async({
    canvas,
    editorModel,
    shapes
  }) => {
    await test.step('Уменьшить монтажную область для сценария с ограничением максимальной ширины', async() => {
      await canvas.setMontageResolution(SHAPE_REPLACE_LIMIT_RESOLUTION)
    })

    const createdShape = await test.step('Добавить квадрат для replace-сценария с ограничением по ширине', async() => {
      return shapes.add({
        presetKey: 'square',
        options: {
          id: 'shape-replace-limit',
          width: 140,
          height: 180,
          text: 'Текст',
          textStyle: {
            fontSize: 32
          }
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'square'
    })

    await test.step('Сменить квадрат на arrow-up-fat', async() => {
      await shapes.update({
        id: 'shape-replace-limit',
        presetKey: 'arrow-up-fat'
      })
    })

    const replacedSnapshot = await test.step('Получить размеры фигуры сразу после замены', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-limit' })
    })
    const montageBounds = await test.step('Получить границы монтажной области', () => {
      return editorModel.getMontageAreaBounds()
    })

    await test.step('Ввести длинный текст после замены', async() => {
      await shapes.enterTextEditing({ id: 'shape-replace-limit' })
      await shapes.updateEditingText({
        id: 'shape-replace-limit',
        text: SHAPE_REPLACE_LIMIT_TEXT
      })
    })

    const limitedText = await test.step('Получить состояние текста после упора в ширину', () => {
      return shapes.getTextNode({ id: 'shape-replace-limit' })
    })
    const limitedSnapshot = await test.step('Получить размеры фигуры после упора в ширину', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-limit' })
    })

    await test.step('Проверить что фигура не вышла за монтажную область и текст начал переноситься', () => {
      expect(limitedSnapshot.groupBoundsWidth)
        .toBeGreaterThan(replacedSnapshot.groupBoundsWidth + SHAPE_REPLACE_TOLERANCE)
      expect(limitedSnapshot.groupBoundsLeft)
        .toBeGreaterThanOrEqual(montageBounds.left - SHAPE_REPLACE_TOLERANCE)
      expect(limitedSnapshot.groupBoundsRight)
        .toBeLessThanOrEqual(montageBounds.right + SHAPE_REPLACE_TOLERANCE)
      expect(limitedText?.lineCount).toBeGreaterThan(1)
      shapes.checkNodeInsideGroup({ snapshot: limitedSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: limitedSnapshot, kind: 'text' })
    })
  })

  test('после замены увеличение текста не возвращает фигуру к размеру до замены', async({ shapes }) => {
    const createdShape = await test.step('Добавить квадрат для изменения размера текста после замены', async() => {
      return shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_REPLACE_BASE_OPTIONS,
          id: 'shape-replace-style-after-update'
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'square'
    })

    await test.step('Сменить квадрат на стрелку вверх', async() => {
      await shapes.update({
        id: 'shape-replace-style-after-update',
        presetKey: 'arrow-up'
      })
    })

    const replacedSnapshot = await test.step('Получить размер фигуры сразу после замены', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-style-after-update' })
    })

    await test.step('Увеличить размер текста после замены', async() => {
      await shapes.updateTextStyle({
        id: 'shape-replace-style-after-update',
        style: {
          fontSize: SHAPE_REPLACE_STYLE_FONT_SIZE
        }
      })
    })

    const updatedText = await test.step('Получить состояние текста после изменения размера', () => {
      return shapes.getTextNode({ id: 'shape-replace-style-after-update' })
    })
    const updatedSnapshot = await test.step('Получить размер фигуры после изменения размера текста', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-style-after-update' })
    })

    await test.step('Проверить что увеличение текста не вернуло фигуру к прежнему размеру', () => {
      expect(updatedText?.fontSize).toBe(SHAPE_REPLACE_STYLE_FONT_SIZE)
      expect(updatedSnapshot.groupBoundsWidth)
        .toBeGreaterThanOrEqual(replacedSnapshot.groupBoundsWidth - SHAPE_REPLACE_TOLERANCE)
      expect(updatedSnapshot.groupBoundsHeight)
        .toBeGreaterThanOrEqual(replacedSnapshot.groupBoundsHeight - SHAPE_REPLACE_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'text' })
    })
  })

  test('после ручного изменения ширины следующая замена использует новый размер фигуры', async({ shapes }) => {
    const createdShape = await test.step('Добавить квадрат для ручного ресайза перед заменой', async() => {
      return shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_REPLACE_BASE_OPTIONS,
          id: 'shape-replace-after-resize'
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'square'
    })

    const initialSnapshot = await test.step('Получить исходный размер фигуры', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-after-resize' })
    })

    await test.step('Растянуть фигуру по ширине вручную и зафиксировать новый размер', async() => {
      await shapes.scaleHorizontallyFromRight({
        id: 'shape-replace-after-resize',
        scaleX: SHAPE_REPLACE_RESIZE_SCALE_X
      })
      await shapes.finishScale({ id: 'shape-replace-after-resize' })
    })

    const resizedSnapshot = await test.step('Получить размер фигуры после ручного ресайза', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-after-resize' })
    })

    await test.step('Сменить фигуру на стрелку вправо', async() => {
      await shapes.update({
        id: 'shape-replace-after-resize',
        presetKey: 'arrow-right'
      })
    })

    const updatedSnapshot = await test.step('Получить размер фигуры после замены', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-after-resize' })
    })

    await test.step('Проверить что замена использовала новый размер фигуры, а не старый', () => {
      expect(resizedSnapshot.groupBoundsWidth)
        .toBeGreaterThan(initialSnapshot.groupBoundsWidth + SHAPE_REPLACE_TOLERANCE)
      expect(updatedSnapshot.groupBoundsWidth)
        .toBeGreaterThan(initialSnapshot.groupBoundsWidth + SHAPE_REPLACE_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'text' })
    })
  })
})
