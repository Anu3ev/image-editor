import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_AUTO_EXPAND_BASE_OPTIONS,
  SHAPE_AUTO_EXPAND_LONGER_TEXT,
  SHAPE_AUTO_EXPAND_LONG_TEXT,
  SHAPE_AUTO_EXPAND_RESIZE_SCALE_X,
  SHAPE_AUTO_EXPAND_SHORT_TEXT,
  SHAPE_AUTO_EXPAND_TYPING_SEQUENCE,
  SHAPE_AUTO_EXPAND_UPDATED_WIDTH,
  SHAPE_AUTO_EXPAND_VERY_LONG_TEXT,
  SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE
} from '../../fixtures/data/shape-auto-expand.data'

test.describe('Авторасширение текста внутри фигуры', () => {
  test.describe('когда режим shapeTextAutoExpand не задан явно (по умолчанию true)', () => {
    test.beforeEach(async({ shapes }) => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_AUTO_EXPAND_BASE_OPTIONS,
          id: 'shape-auto-expand-default'
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    // eslint-disable-next-line max-len
    test('если добавить шейп с явно заданной шириной и текстом длиннее этой ширины, то сработает авторасширение, и шейп займёт ширину текста', async({
      shapes
    }) => {
      const createdShape = await test.step('Добавить фигуру с длинным текстом и явной базовой шириной', async() => {
        return shapes.add({
          presetKey: 'square',
          options: {
            ...SHAPE_AUTO_EXPAND_BASE_OPTIONS,
            id: 'shape-auto-expand-on-create',
            text: SHAPE_AUTO_EXPAND_LONG_TEXT
          }
        })
      })

      shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })

      const createdText = await test.step('Получить состояние текста сразу после добавления', () => {
        return shapes.getTextNode({ id: 'shape-auto-expand-on-create' })
      })
      const createdSnapshot = await test.step('Получить ширину фигуры сразу после добавления', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-on-create' })
      })

      await test.step('Проверить что фигура сразу расширилась под длинный текст', () => {
        expect(createdShape?.shapeTextAutoExpand).toBe(true)
        expect(createdText?.lineCount).toBe(1)
        expect(createdSnapshot.groupBoundsWidth)
          .toBeGreaterThan((SHAPE_AUTO_EXPAND_BASE_OPTIONS.width ?? 0) + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      })
    })

    test('при начале ввода текста не сужает фигуру уже ширины, с которой она была добавлена', async({ shapes }) => {
      const initialSnapshot = await test.step('Получить исходную ширину фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
      })

      await test.step('Открыть редактирование текста и ввести короткий текст', async() => {
        await shapes.enterTextEditing({ id: 'shape-auto-expand-default' })
        await shapes.updateEditingText({
          id: 'shape-auto-expand-default',
          text: SHAPE_AUTO_EXPAND_SHORT_TEXT
        })
      })

      const currentShape = await test.step('Получить состояние фигуры после ввода текста', () => {
        return shapes.getObject({ id: 'shape-auto-expand-default' })
      })
      const currentText = await test.step('Получить состояние текста после ввода', () => {
        return shapes.getTextNode({ id: 'shape-auto-expand-default' })
      })
      const currentSnapshot = await test.step('Получить текущую ширину фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
      })

      await test.step('Проверить что shapeTextAutoExpand включён по умолчанию и ширина не стала меньше исходной', () => {
        expect(currentShape?.shapeTextAutoExpand).toBe(true)
        expect(currentText?.lineCount).toBe(1)
        expect(currentSnapshot.groupBoundsWidth)
          .toBeGreaterThanOrEqual(initialSnapshot.groupBoundsWidth - SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(Math.abs(currentSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      })
    })

    // eslint-disable-next-line max-len
    test('после удаления текста шейп сужается обратно до исходной ширины которая была задана при его добавлении', async({ shapes }) => {
      const initialSnapshot = await test.step('Получить исходную ширину фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
      })

      await test.step('Ввести длинный текст и расширить фигуру', async() => {
        await shapes.enterTextEditing({ id: 'shape-auto-expand-default' })
        await shapes.updateEditingText({
          id: 'shape-auto-expand-default',
          text: SHAPE_AUTO_EXPAND_VERY_LONG_TEXT
        })
      })

      const expandedSnapshot = await test.step('Получить ширину после расширения', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
      })

      await test.step('Удалить лишний текст', async() => {
        await shapes.updateEditingText({
          id: 'shape-auto-expand-default',
          text: SHAPE_AUTO_EXPAND_SHORT_TEXT
        })
      })

      const finalText = await test.step('Получить итоговое состояние текста', () => {
        return shapes.getTextNode({ id: 'shape-auto-expand-default' })
      })
      const finalSnapshot = await test.step('Получить итоговую ширину фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
      })

      await test.step('Проверить что фигура сужается обратно только до исходной ширины', () => {
        expect(expandedSnapshot.groupBoundsWidth)
          .toBeGreaterThan(initialSnapshot.groupBoundsWidth + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(finalText?.lineCount).toBe(1)
        expect(finalSnapshot.groupBoundsWidth)
          .toBeGreaterThanOrEqual(initialSnapshot.groupBoundsWidth - SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(Math.abs(finalSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      })
    })

    // eslint-disable-next-line max-len
    test('если фигуре задать новую ширину с помощью метода update, затем расширить её длинным текстом и сократить текст обратно, фигура возвращается к новой базовой ширине, а не к исходной', async({ shapes }) => {
      await test.step('Явно задать фигуре новую ширину', async() => {
        const updatedShape = await shapes.update({
          id: 'shape-auto-expand-default',
          options: {
            width: SHAPE_AUTO_EXPAND_UPDATED_WIDTH
          }
        })

        expect(updatedShape).not.toBeNull()
      })

      const resizedSnapshot = await test.step('Получить новую базовую ширину фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
      })

      await test.step('Расширить фигуру длинным текстом', async() => {
        await shapes.enterTextEditing({ id: 'shape-auto-expand-default' })
        await shapes.updateEditingText({
          id: 'shape-auto-expand-default',
          text: SHAPE_AUTO_EXPAND_VERY_LONG_TEXT
        })
      })

      const expandedSnapshot = await test.step('Получить ширину после расширения', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
      })

      await test.step('Укоротить текст обратно', async() => {
        await shapes.updateEditingText({
          id: 'shape-auto-expand-default',
          text: SHAPE_AUTO_EXPAND_SHORT_TEXT
        })
      })

      const finalSnapshot = await test.step('Получить итоговую ширину фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
      })

      await test.step('Проверить что фигура сужается только до новой базовой ширины', () => {
        expect(expandedSnapshot.groupBoundsWidth)
          .toBeGreaterThan(resizedSnapshot.groupBoundsWidth + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(Math.abs(finalSnapshot.groupBoundsWidth - resizedSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      })
    })

    // eslint-disable-next-line max-len
    test('если фигуре задать новую ширину вручную (скейлинг), затем расширить её длинным текстом и сократить текст обратно, фигура возвращается к новой базовой ширине, а не к исходной', async({ shapes }) => {
      const initialSnapshot = await test.step('Получить исходную ширину фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
      })

      const liveSnapshot = await test.step('Растянуть фигуру по ширине вручную', () => {
        return shapes.scaleHorizontallyFromRight({
          id: 'shape-auto-expand-default',
          scaleX: SHAPE_AUTO_EXPAND_RESIZE_SCALE_X
        })
      })

      const resizedSnapshot = await test.step('Зафиксировать новую ширину после ресайза', async() => {
        await shapes.finishScale({ id: 'shape-auto-expand-default' })

        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
      })

      await test.step('Ввести длинный текст после ресайза', async() => {
        await shapes.enterTextEditing({ id: 'shape-auto-expand-default' })
        await shapes.updateEditingText({
          id: 'shape-auto-expand-default',
          text: SHAPE_AUTO_EXPAND_VERY_LONG_TEXT
        })
      })

      const expandedSnapshot = await test.step('Получить ширину после авторасширения', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
      })

      await test.step('Сократить текст обратно', async() => {
        await shapes.updateEditingText({
          id: 'shape-auto-expand-default',
          text: SHAPE_AUTO_EXPAND_SHORT_TEXT
        })
      })

      const finalSnapshot = await test.step('Получить итоговую ширину фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
      })

      await test.step('Проверить что ручной ресайз стал новой нижней границей ширины', () => {
        expect(liveSnapshot.groupBoundsWidth)
          .toBeGreaterThan(initialSnapshot.groupBoundsWidth + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(resizedSnapshot.groupBoundsWidth)
          .toBeGreaterThan(initialSnapshot.groupBoundsWidth + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(expandedSnapshot.groupBoundsWidth)
          .toBeGreaterThanOrEqual(resizedSnapshot.groupBoundsWidth - SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(Math.abs(finalSnapshot.groupBoundsWidth - resizedSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      })
    })

    test('во время набора текст не уходит на следующую строку перед расширением фигуры', async({ shapes }) => {
      const initialSnapshot = await test.step('Получить исходную ширину фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
      })

      await test.step('Открыть редактирование текста', async() => {
        await shapes.enterTextEditing({ id: 'shape-auto-expand-default' })
      })

      for (const text of SHAPE_AUTO_EXPAND_TYPING_SEQUENCE) {
        await test.step(`Ввести "${text}"`, async() => {
          await shapes.updateEditingText({
            id: 'shape-auto-expand-default',
            text
          })
        })

        const currentText = await test.step(`Получить состояние текста после "${text}"`, () => {
          return shapes.getTextNode({ id: 'shape-auto-expand-default' })
        })
        const currentSnapshot = await test.step(`Получить ширину фигуры после "${text}"`, () => {
          return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
        })

        await test.step(`Проверить что после "${text}" текст остаётся в одну строку`, () => {
          expect(currentText?.lineCount).toBe(1)
          expect(currentSnapshot.groupBoundsWidth)
            .toBeGreaterThanOrEqual(initialSnapshot.groupBoundsWidth - SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        })
      }

      const finalSnapshot = await test.step('Получить итоговую ширину после всей последовательности ввода', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
      })

      await test.step('Проверить что фигура действительно расширилась', () => {
        expect(finalSnapshot.groupBoundsWidth)
          .toBeGreaterThan(initialSnapshot.groupBoundsWidth + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      })
    })
  })

  test('при выключении авторасширения уже уложенный текст не перепрыгивает на следующую строку', async({
    shapes
  }) => {
    const createdShape = await test.step('Добавить фигуру с длинным текстом и включённым авторасширением', async() => {
      return shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_AUTO_EXPAND_BASE_OPTIONS,
          id: 'shape-auto-expand-turn-off',
          text: SHAPE_AUTO_EXPAND_LONG_TEXT
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'square'
    })

    const initialText = await test.step('Получить состояние текста до выключения режима', () => {
      return shapes.getTextNode({ id: 'shape-auto-expand-turn-off' })
    })
    const initialSnapshot = await test.step('Получить ширину фигуры до выключения режима', () => {
      return shapes.getScaleSnapshot({ id: 'shape-auto-expand-turn-off' })
    })

    await test.step('Выключить авторасширение у текущей фигуры', async() => {
      const updatedShape = await shapes.update({
        id: 'shape-auto-expand-turn-off',
        options: {
          shapeTextAutoExpand: false
        }
      })

      expect(updatedShape).not.toBeNull()
    })

    const updatedShape = await test.step('Получить состояние фигуры после выключения режима', () => {
      return shapes.getObject({ id: 'shape-auto-expand-turn-off' })
    })
    const updatedText = await test.step('Получить состояние текста после выключения режима', () => {
      return shapes.getTextNode({ id: 'shape-auto-expand-turn-off' })
    })
    const updatedSnapshot = await test.step('Получить ширину фигуры после выключения режима', () => {
      return shapes.getScaleSnapshot({ id: 'shape-auto-expand-turn-off' })
    })

    await test.step('Проверить что текст и ширина остались прежними', () => {
      expect(initialText?.lineCount).toBe(1)
      expect(updatedShape?.shapeTextAutoExpand).toBe(false)
      expect(updatedText?.lineCount).toBe(1)
      expect(Math.abs(updatedSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
    })
  })

  test('после выключения авторасширения новый текст начинает переноситься вместо расширения фигуры', async({
    shapes
  }) => {
    const createdShape = await test.step('Добавить фигуру с длинным текстом и включённым авторасширением', async() => {
      return shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_AUTO_EXPAND_BASE_OPTIONS,
          id: 'shape-auto-expand-stop-growing',
          text: SHAPE_AUTO_EXPAND_LONG_TEXT
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'square'
    })

    await test.step('Выключить авторасширение у текущей фигуры', async() => {
      const updatedShape = await shapes.update({
        id: 'shape-auto-expand-stop-growing',
        options: {
          shapeTextAutoExpand: false
        }
      })

      expect(updatedShape).not.toBeNull()
    })

    const disabledSnapshot = await test.step('Получить ширину фигуры сразу после выключения режима', () => {
      return shapes.getScaleSnapshot({ id: 'shape-auto-expand-stop-growing' })
    })

    await test.step('Открыть редактирование и дописать текст после выключения режима', async() => {
      await shapes.enterTextEditing({ id: 'shape-auto-expand-stop-growing' })
      await shapes.updateEditingText({
        id: 'shape-auto-expand-stop-growing',
        text: SHAPE_AUTO_EXPAND_VERY_LONG_TEXT
      })
    })

    const updatedText = await test.step('Получить состояние текста после нового ввода', () => {
      return shapes.getTextNode({ id: 'shape-auto-expand-stop-growing' })
    })
    const updatedSnapshot = await test.step('Получить ширину фигуры после нового ввода', () => {
      return shapes.getScaleSnapshot({ id: 'shape-auto-expand-stop-growing' })
    })

    await test.step('Проверить что фигура больше не расширяется, а текст переносится', () => {
      expect(updatedText?.lineCount).toBeGreaterThan(1)
      expect(Math.abs(updatedSnapshot.groupBoundsWidth - disabledSnapshot.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      expect(updatedSnapshot.groupBoundsHeight)
        .toBeGreaterThanOrEqual(disabledSnapshot.groupBoundsHeight)
    })
  })

  test.describe('когда режим shapeTextAutoExpand выключен явно', () => {
    test.beforeEach(async({ shapes }) => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_AUTO_EXPAND_BASE_OPTIONS,
          id: 'shape-auto-expand-disabled',
          shapeTextAutoExpand: false
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    test('длинный текст переносится, а ширина фигуры не меняется', async({ shapes }) => {
      const initialSnapshot = await test.step('Получить исходную ширину фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-disabled' })
      })

      await test.step('Открыть редактирование и ввести длинный текст', async() => {
        await shapes.enterTextEditing({ id: 'shape-auto-expand-disabled' })
        await shapes.updateEditingText({
          id: 'shape-auto-expand-disabled',
          text: SHAPE_AUTO_EXPAND_LONGER_TEXT
        })
      })

      const currentShape = await test.step('Получить состояние фигуры после ввода', () => {
        return shapes.getObject({ id: 'shape-auto-expand-disabled' })
      })
      const wrappedText = await test.step('Получить состояние текста после переноса', () => {
        return shapes.getTextNode({ id: 'shape-auto-expand-disabled' })
      })
      const wrappedSnapshot = await test.step('Получить ширину фигуры после ввода', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-disabled' })
      })

      await test.step('Проверить что ширина осталась прежней, а текст перенёсся', () => {
        expect(currentShape?.shapeTextAutoExpand).toBe(false)
        expect(wrappedText?.lineCount).toBeGreaterThan(1)
        expect(Math.abs(wrappedSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(wrappedSnapshot.groupBoundsHeight)
          .toBeGreaterThan(initialSnapshot.groupBoundsHeight)
      })
    })

    test('включение авторасширения у текущей фигуры собирает текст в одну строку', async({ shapes }) => {
      await test.step('Ввести длинный текст при выключенном авторасширении', async() => {
        await shapes.enterTextEditing({ id: 'shape-auto-expand-disabled' })
        await shapes.updateEditingText({
          id: 'shape-auto-expand-disabled',
          text: SHAPE_AUTO_EXPAND_LONG_TEXT
        })
        await shapes.exitTextEditing({ id: 'shape-auto-expand-disabled' })
      })

      const wrappedSnapshot = await test.step('Получить состояние до включения авторасширения', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-disabled' })
      })
      const wrappedText = await test.step('Получить состояние текста до включения авторасширения', () => {
        return shapes.getTextNode({ id: 'shape-auto-expand-disabled' })
      })

      await test.step('Включить авторасширение у текущей фигуры', async() => {
        const updatedShape = await shapes.update({
          id: 'shape-auto-expand-disabled',
          options: {
            shapeTextAutoExpand: true
          }
        })

        expect(updatedShape).not.toBeNull()
      })

      const updatedShape = await test.step('Получить состояние фигуры после включения режима', () => {
        return shapes.getObject({ id: 'shape-auto-expand-disabled' })
      })
      const expandedText = await test.step('Получить состояние текста после включения режима', () => {
        return shapes.getTextNode({ id: 'shape-auto-expand-disabled' })
      })
      const expandedSnapshot = await test.step('Получить ширину фигуры после включения режима', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-disabled' })
      })

      await test.step('Проверить что текст вернулся в одну строку и фигура расширилась', () => {
        expect(wrappedText?.lineCount).toBeGreaterThan(1)
        expect(updatedShape?.shapeTextAutoExpand).toBe(true)
        expect(expandedText?.lineCount).toBe(1)
        expect(expandedSnapshot.groupBoundsWidth)
          .toBeGreaterThan(wrappedSnapshot.groupBoundsWidth + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      })
    })

    test('изменение стиля текста не включает авторасширение само по себе', async({ shapes }) => {
      await test.step('Задать длинный текст при выключенном авторасширении', async() => {
        const updatedShape = await shapes.update({
          id: 'shape-auto-expand-disabled',
          options: {
            text: SHAPE_AUTO_EXPAND_LONG_TEXT
          }
        })

        expect(updatedShape).not.toBeNull()
      })

      const initialShape = await test.step('Получить состояние фигуры до изменения стиля', () => {
        return shapes.getObject({ id: 'shape-auto-expand-disabled' })
      })
      const initialText = await test.step('Получить состояние текста до изменения стиля', () => {
        return shapes.getTextNode({ id: 'shape-auto-expand-disabled' })
      })
      const initialSnapshot = await test.step('Получить ширину фигуры до изменения стиля', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-disabled' })
      })

      await test.step('Увеличить размер шрифта', async() => {
        await shapes.updateTextStyle({
          id: 'shape-auto-expand-disabled',
          style: {
            fontSize: 96
          }
        })
      })

      const updatedShape = await test.step('Получить состояние фигуры после изменения стиля', () => {
        return shapes.getObject({ id: 'shape-auto-expand-disabled' })
      })
      const updatedText = await test.step('Получить состояние текста после изменения стиля', () => {
        return shapes.getTextNode({ id: 'shape-auto-expand-disabled' })
      })
      const updatedSnapshot = await test.step('Получить ширину фигуры после изменения стиля', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-disabled' })
      })

      await test.step('Проверить что режим не включился и ширина не начала раздуваться', () => {
        expect(initialShape?.shapeTextAutoExpand).toBe(false)
        expect(updatedShape?.shapeTextAutoExpand).toBe(false)
        expect(updatedText?.lineCount).toBeGreaterThanOrEqual(initialText?.lineCount ?? 0)
        expect(Math.abs(updatedSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      })
    })
  })

  test('выключение авторасширения во время редактирования текста не ломает выделение фигуры', async({
    editorModel,
    shapes
  }) => {
    const createdShape = await test.step('Добавить фигуру с текстом для редактирования', async() => {
      return shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_AUTO_EXPAND_BASE_OPTIONS,
          id: 'shape-editing-auto-expand',
          text: SHAPE_AUTO_EXPAND_LONG_TEXT
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'square'
    })

    const initialText = await test.step('Получить состояние текста до начала редактирования', () => {
      return shapes.getTextNode({ id: 'shape-editing-auto-expand' })
    })
    const initialSnapshot = await test.step('Получить ширину фигуры до начала редактирования', () => {
      return shapes.getScaleSnapshot({ id: 'shape-editing-auto-expand' })
    })

    await test.step('Открыть режим редактирования текста', async() => {
      await shapes.enterTextEditing({ id: 'shape-editing-auto-expand' })
    })

    await test.step('Выключить авторасширение у редактируемой фигуры', async() => {
      const updatedShape = await shapes.update({
        id: 'shape-editing-auto-expand',
        options: {
          shapeTextAutoExpand: false
        }
      })

      expect(updatedShape).not.toBeNull()
    })

    const currentShape = await test.step('Получить состояние фигуры после обновления', () => {
      return shapes.getObject({ id: 'shape-editing-auto-expand' })
    })
    const activeObject = await test.step('Получить активный объект после обновления', () => {
      return editorModel.getActiveObject()
    })

    await test.step('Снова выбрать фигуру как активную', async() => {
      const selectedShape = await shapes.select({ id: 'shape-editing-auto-expand' })

      expect(selectedShape).not.toBeNull()
    })

    const selectedActiveObject = await test.step('Получить активный объект после повторного выбора', () => {
      return editorModel.getActiveObject()
    })

    await test.step('Проверить что фигура осталась выделяемой', () => {
      expect(initialText?.lineCount).toBe(1)
      expect(initialSnapshot.groupBoundsWidth)
        .toBeGreaterThan((SHAPE_AUTO_EXPAND_BASE_OPTIONS.width ?? 0) + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      expect(currentShape?.shapeTextAutoExpand).toBe(false)
      expect(currentShape?.selectable).toBe(true)
      expect(activeObject?.type).toBe('shape-group')
      expect(selectedActiveObject?.type).toBe('shape-group')
      expect(selectedActiveObject?.id).toBe('shape-editing-auto-expand')
    })
  })

  test.describe('после применения шаблона (TemplateManager), копирования и истории', () => {
    test('объект из шаблона ведёт себя так же, как созданный напрямую', async({
      editorModel,
      shapes,
      template
    }) => {
      const directShape = await test.step('Добавить исходную фигуру', async() => {
        return shapes.add({
          presetKey: 'square',
          options: {
            ...SHAPE_AUTO_EXPAND_BASE_OPTIONS,
            id: 'shape-template-source'
          }
        })
      })

      shapes.checkCreation({
        shape: directShape,
        presetKey: 'square'
      })

      const directBaselineSnapshot = await test.step('Получить исходную ширину исходной фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-template-source' })
      })

      await test.step('Сериализовать выделенную фигуру в шаблон', async() => {
        await shapes.select({ id: 'shape-template-source' })
      })

      const serializedTemplate = await test.step('Получить описание шаблона', () => {
        return template.serializeSelection()
      })

      const templateObjectId = await test.step('Применить шаблон и определить новую фигуру', async() => {
        expect(serializedTemplate).not.toBeNull()

        const insertedCount = await template.applyTemplate({
          template: serializedTemplate!
        })

        expect(insertedCount).toBe(1)
        await editorModel.checkObjectCount({ count: 2 })

        const objects = await shapes.getShapeObjects()
        const appliedShape = objects.find((shape) => shape.id !== 'shape-template-source')

        expect(appliedShape).toBeDefined()
        expect(appliedShape?.id).toBeDefined()

        return appliedShape?.id as string
      })

      const templateBaselineSnapshot = await test.step('Получить исходную ширину фигуры из шаблона', () => {
        return shapes.getScaleSnapshot({ id: templateObjectId })
      })

      await test.step('Задать одинаковый длинный текст обеим фигурам', async() => {
        await shapes.update({
          id: 'shape-template-source',
          options: {
            text: SHAPE_AUTO_EXPAND_LONG_TEXT
          }
        })
        await shapes.update({
          id: templateObjectId,
          options: {
            text: SHAPE_AUTO_EXPAND_LONG_TEXT
          }
        })
      })

      const directExpandedText = await test.step('Получить текст исходной фигуры после расширения', () => {
        return shapes.getTextNode({ id: 'shape-template-source' })
      })
      const directExpandedSnapshot = await test.step('Получить ширину исходной фигуры после расширения', () => {
        return shapes.getScaleSnapshot({ id: 'shape-template-source' })
      })
      const templateExpandedText = await test.step('Получить текст фигуры из шаблона после расширения', () => {
        return shapes.getTextNode({ id: templateObjectId })
      })
      const templateExpandedSnapshot = await test.step('Получить ширину фигуры из шаблона после расширения', () => {
        return shapes.getScaleSnapshot({ id: templateObjectId })
      })

      await test.step('Сократить текст у обеих фигур', async() => {
        await shapes.update({
          id: 'shape-template-source',
          options: {
            text: SHAPE_AUTO_EXPAND_SHORT_TEXT
          }
        })
        await shapes.update({
          id: templateObjectId,
          options: {
            text: SHAPE_AUTO_EXPAND_SHORT_TEXT
          }
        })
      })

      const directFinalSnapshot = await test.step('Получить итоговую ширину исходной фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-template-source' })
      })
      const templateFinalSnapshot = await test.step('Получить итоговую ширину фигуры из шаблона', () => {
        return shapes.getScaleSnapshot({ id: templateObjectId })
      })

      await test.step('Проверить что обе фигуры ведут себя одинаково', () => {
        expect(directExpandedText?.lineCount).toBe(1)
        expect(templateExpandedText?.lineCount).toBe(1)
        expect(Math.abs(directExpandedSnapshot.groupBoundsWidth - templateExpandedSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(Math.abs(directFinalSnapshot.groupBoundsWidth - directBaselineSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(Math.abs(templateFinalSnapshot.groupBoundsWidth - templateBaselineSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(Math.abs(directFinalSnapshot.groupBoundsWidth - templateFinalSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      })
    })

    test('вставленная копия сохраняет выключенное авторасширение', async({
      clipboard,
      editorModel,
      shapes
    }) => {
      const sourceShape = await test.step('Добавить фигуру с выключенным авторасширением', async() => {
        return shapes.add({
          presetKey: 'square',
          options: {
            ...SHAPE_AUTO_EXPAND_BASE_OPTIONS,
            id: 'shape-copy-source',
            shapeTextAutoExpand: false
          }
        })
      })

      shapes.checkCreation({
        shape: sourceShape,
        presetKey: 'square'
      })

      await test.step('Скопировать исходную фигуру', async() => {
        await shapes.select({ id: 'shape-copy-source' })
        await clipboard.copy()
        await clipboard.waitForClipboardReady()
      })

      const pastedShapeId = await test.step('Вставить копию и определить новую фигуру', async() => {
        const pasted = await clipboard.paste()

        expect(pasted).toBe(true)
        await editorModel.checkObjectCount({ count: 2 })

        const objects = await shapes.getShapeObjects()
        const duplicatedShape = objects.find((shape) => shape.id !== 'shape-copy-source')

        expect(duplicatedShape).toBeDefined()
        expect(duplicatedShape?.id).toBeDefined()

        return duplicatedShape?.id as string
      })

      const pastedInitialShape = await test.step('Получить состояние вставленной фигуры', () => {
        return shapes.getObject({ id: pastedShapeId })
      })
      const pastedInitialSnapshot = await test.step('Получить исходную ширину вставленной фигуры', () => {
        return shapes.getScaleSnapshot({ id: pastedShapeId })
      })

      await test.step('Ввести длинный текст во вставленную фигуру', async() => {
        await shapes.enterTextEditing({ id: pastedShapeId })
        await shapes.updateEditingText({
          id: pastedShapeId,
          text: SHAPE_AUTO_EXPAND_VERY_LONG_TEXT
        })
      })

      const pastedText = await test.step('Получить состояние текста во вставленной фигуре', () => {
        return shapes.getTextNode({ id: pastedShapeId })
      })
      const pastedSnapshot = await test.step('Получить ширину вставленной фигуры после ввода текста', () => {
        return shapes.getScaleSnapshot({ id: pastedShapeId })
      })

      await test.step('Проверить что вставленная копия сохранила выключенный режим', () => {
        expect(pastedInitialShape?.shapeTextAutoExpand).toBe(false)
        expect(pastedText?.lineCount).toBeGreaterThan(1)
        expect(Math.abs(pastedSnapshot.groupBoundsWidth - pastedInitialSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      })
    })

    test('после undo и redo выключенный режим авторасширения не включается обратно', async({
      history,
      shapes
    }) => {
      const createdShape = await test.step('Добавить фигуру с режимом по умолчанию', async() => {
        return shapes.add({
          presetKey: 'square',
          options: {
            ...SHAPE_AUTO_EXPAND_BASE_OPTIONS,
            id: 'shape-history-auto-expand'
          }
        })
      })

      shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })

      await test.step('Выключить авторасширение у фигуры', async() => {
        const updatedShape = await shapes.update({
          id: 'shape-history-auto-expand',
          options: {
            shapeTextAutoExpand: false
          }
        })

        expect(updatedShape).not.toBeNull()
      })

      const initialDisabledSnapshot = await test.step('Получить ширину фигуры с выключенным режимом', () => {
        return shapes.getScaleSnapshot({ id: 'shape-history-auto-expand' })
      })

      await test.step('Сделать undo и проверить возврат режима по умолчанию', async() => {
        await history.undo()

        const undoneShape = await shapes.getObject({ id: 'shape-history-auto-expand' })

        expect(undoneShape?.shapeTextAutoExpand).toBe(true)
      })

      await test.step('Сделать redo и проверить возврат выключенного режима', async() => {
        await history.redo()

        const redoneShape = await shapes.getObject({ id: 'shape-history-auto-expand' })

        expect(redoneShape?.shapeTextAutoExpand).toBe(false)
      })

      await test.step('Ввести длинный текст после redo', async() => {
        await shapes.enterTextEditing({ id: 'shape-history-auto-expand' })
        await shapes.updateEditingText({
          id: 'shape-history-auto-expand',
          text: SHAPE_AUTO_EXPAND_VERY_LONG_TEXT
        })
      })

      const wrappedText = await test.step('Получить состояние текста после redo и ввода', () => {
        return shapes.getTextNode({ id: 'shape-history-auto-expand' })
      })
      const wrappedSnapshot = await test.step('Получить состояние фигуры после redo и ввода', () => {
        return shapes.getScaleSnapshot({ id: 'shape-history-auto-expand' })
      })

      await test.step('Проверить что после redo фигура ведёт себя как объект с выключенным авторасширением', () => {
        expect(wrappedText?.lineCount).toBeGreaterThan(1)
        expect(Math.abs(wrappedSnapshot.groupBoundsWidth - initialDisabledSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      })
    })
  })
})
