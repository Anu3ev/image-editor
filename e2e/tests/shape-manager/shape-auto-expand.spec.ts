import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_AUTO_EXPAND_ARROW_UP_FAT_TYPING_SEQUENCE,
  SHAPE_AUTO_EXPAND_ATOMIC_UPDATE_WIDTH,
  SHAPE_AUTO_EXPAND_BASE_OPTIONS,
  SHAPE_AUTO_EXPAND_LIMIT_RESOLUTION,
  SHAPE_AUTO_EXPAND_LIMIT_TEXT,
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

    test('update с явной шириной и длинным текстом сразу расширяет фигуру, когда авторасширение включено', async({
      shapes
    }) => {
      const initialSnapshot = await test.step('Получить исходную ширину фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
      })

      await test.step('Одним update задать новую базовую ширину и длинный текст', async() => {
        const updatedShape = await shapes.update({
          id: 'shape-auto-expand-default',
          options: {
            width: SHAPE_AUTO_EXPAND_ATOMIC_UPDATE_WIDTH,
            text: SHAPE_AUTO_EXPAND_LONG_TEXT,
            shapeTextAutoExpand: true
          }
        })

        expect(updatedShape).not.toBeNull()
      })

      const updatedText = await test.step('Получить состояние текста после update', () => {
        return shapes.getTextNode({ id: 'shape-auto-expand-default' })
      })
      const updatedSnapshot = await test.step('Получить ширину фигуры после update', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-default' })
      })

      await test.step('Проверить что фигура сразу расширилась под текст без промежуточного переноса', () => {
        expect(updatedText?.lineCount).toBe(1)
        expect(updatedSnapshot.groupBoundsWidth)
          .toBeGreaterThan(SHAPE_AUTO_EXPAND_ATOMIC_UPDATE_WIDTH + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(updatedSnapshot.groupBoundsWidth)
          .toBeGreaterThan(initialSnapshot.groupBoundsWidth + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
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

    test('после ручного сужения новый текст переносится вместо расширения фигуры', async({ shapes }) => {
      const createdShape = await test.step('Добавить фигуру с текстом для ручного сужения', async() => {
        return shapes.add({
          presetKey: 'square',
          options: {
            ...SHAPE_AUTO_EXPAND_BASE_OPTIONS,
            id: 'shape-auto-expand-after-manual-shrink',
            text: 'TEST'
          }
        })
      })

      shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })

      const initialSnapshot = await test.step('Получить исходную ширину фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-after-manual-shrink' })
      })

      const liveSnapshot = await test.step('Сузить фигуру по ширине вручную', () => {
        return shapes.shrinkToMinimumWidth({ id: 'shape-auto-expand-after-manual-shrink' })
      })

      const resizedShape = await test.step('Зафиксировать новую ширину после скейлинга', async() => {
        await shapes.finishScale({ id: 'shape-auto-expand-after-manual-shrink' })

        return shapes.getObject({ id: 'shape-auto-expand-after-manual-shrink' })
      })
      const resizedSnapshot = await test.step('Получить ширину после ручного сужения', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-after-manual-shrink' })
      })

      await test.step('Ввести длинный текст после ручного сужения', async() => {
        await shapes.enterTextEditing({ id: 'shape-auto-expand-after-manual-shrink' })
        await shapes.updateEditingText({
          id: 'shape-auto-expand-after-manual-shrink',
          text: SHAPE_AUTO_EXPAND_VERY_LONG_TEXT
        })
      })

      const updatedShape = await test.step('Получить состояние фигуры после нового ввода', () => {
        return shapes.getObject({ id: 'shape-auto-expand-after-manual-shrink' })
      })
      const updatedText = await test.step('Получить состояние текста после нового ввода', () => {
        return shapes.getTextNode({ id: 'shape-auto-expand-after-manual-shrink' })
      })
      const updatedSnapshot = await test.step('Получить ширину фигуры после нового ввода', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-after-manual-shrink' })
      })

      await test.step('Проверить что ручная ширина осталась фиксированной и текст перенёсся', () => {
        expect(liveSnapshot.groupBoundsWidth)
          .toBeLessThan(initialSnapshot.groupBoundsWidth - SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(resizedShape?.shapeTextAutoExpand).toBe(false)
        expect(updatedShape?.shapeTextAutoExpand).toBe(false)
        expect(updatedText?.lineCount).toBeGreaterThan(1)
        expect(resizedSnapshot.groupBoundsWidth)
          .toBeLessThan(initialSnapshot.groupBoundsWidth - SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(Math.abs(updatedSnapshot.groupBoundsWidth - resizedSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)

        shapes.checkNodeInsideGroup({
          snapshot: updatedSnapshot,
          kind: 'text'
        })
      })
    })

    test('после ручного сужения undo и redo сохраняют фиксированную ширину для следующего ввода', async({
      history,
      shapes
    }) => {
      const createdShape = await test.step('Добавить фигуру с текстом для проверки истории', async() => {
        return shapes.add({
          presetKey: 'square',
          options: {
            ...SHAPE_AUTO_EXPAND_BASE_OPTIONS,
            id: 'shape-auto-expand-after-manual-shrink-history',
            text: 'TEST'
          }
        })
      })

      shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })

      const initialSnapshot = await test.step('Получить исходную ширину фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-after-manual-shrink-history' })
      })

      await test.step('Сузить фигуру по ширине вручную и сохранить это состояние в истории', async() => {
        await shapes.shrinkToMinimumWidth({ id: 'shape-auto-expand-after-manual-shrink-history' })
        await shapes.finishScale({ id: 'shape-auto-expand-after-manual-shrink-history' })
        await history.flushPendingSave()
      })

      const resizedShape = await test.step('Получить состояние фигуры после ручного сужения', () => {
        return shapes.getObject({ id: 'shape-auto-expand-after-manual-shrink-history' })
      })
      const resizedSnapshot = await test.step('Получить ширину после ручного сужения', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-after-manual-shrink-history' })
      })

      await test.step('Сделать undo и redo', async() => {
        await history.undo()
        await history.redo()
      })

      const redoneShape = await test.step('Получить состояние фигуры после redo', () => {
        return shapes.getObject({ id: 'shape-auto-expand-after-manual-shrink-history' })
      })
      const redoneSnapshot = await test.step('Получить ширину фигуры после redo', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-after-manual-shrink-history' })
      })

      await test.step('Ввести длинный текст после redo', async() => {
        await shapes.enterTextEditing({ id: 'shape-auto-expand-after-manual-shrink-history' })
        await shapes.updateEditingText({
          id: 'shape-auto-expand-after-manual-shrink-history',
          text: SHAPE_AUTO_EXPAND_VERY_LONG_TEXT
        })
      })

      const updatedShape = await test.step('Получить состояние фигуры после нового ввода', () => {
        return shapes.getObject({ id: 'shape-auto-expand-after-manual-shrink-history' })
      })
      const updatedText = await test.step('Получить состояние текста после нового ввода', () => {
        return shapes.getTextNode({ id: 'shape-auto-expand-after-manual-shrink-history' })
      })
      const updatedSnapshot = await test.step('Получить ширину фигуры после нового ввода', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-after-manual-shrink-history' })
      })

      await test.step('Проверить что после redo ручная ширина сохранилась и текст снова переносится', () => {
        expect(resizedSnapshot.groupBoundsWidth)
          .toBeLessThan(initialSnapshot.groupBoundsWidth - SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(resizedShape?.shapeTextAutoExpand).toBe(false)
        expect(redoneShape?.shapeTextAutoExpand).toBe(false)
        expect(Math.abs(redoneSnapshot.groupBoundsWidth - resizedSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(updatedShape?.shapeTextAutoExpand).toBe(false)
        expect(updatedText?.lineCount).toBeGreaterThan(1)
        expect(Math.abs(updatedSnapshot.groupBoundsWidth - redoneSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)

        shapes.checkNodeInsideGroup({
          snapshot: updatedSnapshot,
          kind: 'text'
        })
      })
    })

    test('после изменения только высоты длинный текст по-прежнему расширяет фигуру', async({ shapes }) => {
      const createdShape = await test.step('Добавить фигуру с текстом для вертикального скейлинга', async() => {
        return shapes.add({
          presetKey: 'square',
          options: {
            ...SHAPE_AUTO_EXPAND_BASE_OPTIONS,
            id: 'shape-auto-expand-after-vertical-scale',
            text: 'TEST'
          }
        })
      })

      shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })

      const initialShape = await test.step('Получить исходное состояние фигуры', () => {
        return shapes.getObject({ id: 'shape-auto-expand-after-vertical-scale' })
      })
      const initialSnapshot = await test.step('Получить исходные размеры фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-after-vertical-scale' })
      })

      await test.step('Изменить только высоту фигуры вручную', async() => {
        await shapes.scaleVerticallyFromBottom({
          id: 'shape-auto-expand-after-vertical-scale',
          scaleY: 0.55
        })
        await shapes.finishScale({ id: 'shape-auto-expand-after-vertical-scale' })
      })

      const resizedShape = await test.step('Получить состояние фигуры после вертикального скейлинга', () => {
        return shapes.getObject({ id: 'shape-auto-expand-after-vertical-scale' })
      })
      const resizedSnapshot = await test.step('Получить размеры после вертикального скейлинга', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-after-vertical-scale' })
      })

      await test.step('Ввести длинный текст после изменения только высоты', async() => {
        await shapes.enterTextEditing({ id: 'shape-auto-expand-after-vertical-scale' })
        await shapes.updateEditingText({
          id: 'shape-auto-expand-after-vertical-scale',
          text: SHAPE_AUTO_EXPAND_VERY_LONG_TEXT
        })
      })

      const updatedShape = await test.step('Получить состояние фигуры после ввода текста', () => {
        return shapes.getObject({ id: 'shape-auto-expand-after-vertical-scale' })
      })
      const updatedText = await test.step('Получить состояние текста после ввода', () => {
        return shapes.getTextNode({ id: 'shape-auto-expand-after-vertical-scale' })
      })
      const updatedSnapshot = await test.step('Получить размеры фигуры после ввода', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-after-vertical-scale' })
      })

      await test.step('Проверить что вертикальный скейлинг не выключил авторасширение', () => {
        expect(initialShape?.shapeTextAutoExpand).toBe(true)
        expect(resizedShape?.shapeTextAutoExpand).toBe(true)
        expect(resizedSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight - 1)
        expect(Math.abs(resizedSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(updatedShape?.shapeTextAutoExpand).toBe(true)
        expect(updatedText?.lineCount).toBeGreaterThan(0)
        expect(updatedSnapshot.groupBoundsWidth)
          .toBeGreaterThan(resizedSnapshot.groupBoundsWidth + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)

        shapes.checkNodeInsideGroup({
          snapshot: updatedSnapshot,
          kind: 'text'
        })
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

  test('во время набора текста в arrow-up-fat текст не уходит на следующую строку перед расширением фигуры', async({
    shapes
  }) => {
    const createdShape = await test.step('Добавить arrow-up-fat с пустым текстом', async() => {
      return shapes.add({
        presetKey: 'arrow-up-fat',
        options: {
          id: 'shape-auto-expand-arrow-up-fat',
          text: '',
          textStyle: {
            fontSize: 36
          }
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'arrow-up-fat'
    })

    const initialSnapshot = await test.step('Получить исходную ширину фигуры', () => {
      return shapes.getScaleSnapshot({ id: 'shape-auto-expand-arrow-up-fat' })
    })

    await test.step('Открыть редактирование текста', async() => {
      await shapes.enterTextEditing({ id: 'shape-auto-expand-arrow-up-fat' })
    })

    for (const text of SHAPE_AUTO_EXPAND_ARROW_UP_FAT_TYPING_SEQUENCE) {
      await test.step(`Ввести "${text}"`, async() => {
        await shapes.updateEditingText({
          id: 'shape-auto-expand-arrow-up-fat',
          text
        })
      })

      const currentText = await test.step(`Получить состояние текста после "${text}"`, () => {
        return shapes.getTextNode({ id: 'shape-auto-expand-arrow-up-fat' })
      })
      const currentSnapshot = await test.step(`Получить ширину фигуры после "${text}"`, () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-arrow-up-fat' })
      })

      await test.step(`Проверить что после "${text}" текст остаётся в одну строку`, () => {
        expect(currentText?.lineCount).toBe(1)
        expect(currentSnapshot.groupBoundsWidth)
          .toBeGreaterThanOrEqual(initialSnapshot.groupBoundsWidth - SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      })
    }

    const finalSnapshot = await test.step('Получить итоговую ширину после всей последовательности ввода', () => {
      return shapes.getScaleSnapshot({ id: 'shape-auto-expand-arrow-up-fat' })
    })

    await test.step('Проверить что фигура действительно расширилась и текст остался внутри неё', () => {
      expect(finalSnapshot.groupBoundsWidth)
        .toBeGreaterThan(initialSnapshot.groupBoundsWidth + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })

  test('если текст упирается в ширину монтажной области, фигура остаётся внутри неё, а текст начинает переноситься', async({
    canvas,
    editorModel,
    shapes
  }) => {
    await test.step('Уменьшить монтажную область для сценария с ограничением максимальной ширины', async() => {
      await canvas.setMontageResolution(SHAPE_AUTO_EXPAND_LIMIT_RESOLUTION)
    })

    const createdShape = await test.step('Добавить фигуру с коротким текстом по центру монтажной области', async() => {
      return shapes.add({
        presetKey: 'square',
        options: {
          id: 'shape-auto-expand-limit',
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

    const initialSnapshot = await test.step('Получить исходную геометрию фигуры', () => {
      return shapes.getScaleSnapshot({ id: 'shape-auto-expand-limit' })
    })
    const montageBounds = await test.step('Получить границы монтажной области', () => {
      return editorModel.getMontageAreaBounds()
    })

    await test.step('Ввести текст, который должен уткнуться в максимальную ширину', async() => {
      await shapes.enterTextEditing({ id: 'shape-auto-expand-limit' })
      await shapes.updateEditingText({
        id: 'shape-auto-expand-limit',
        text: SHAPE_AUTO_EXPAND_LIMIT_TEXT
      })
    })

    const limitedText = await test.step('Получить состояние текста после упора в ширину', () => {
      return shapes.getTextNode({ id: 'shape-auto-expand-limit' })
    })
    const limitedSnapshot = await test.step('Получить геометрию фигуры после упора в ширину', () => {
      return shapes.getScaleSnapshot({ id: 'shape-auto-expand-limit' })
    })

    await test.step('Проверить что фигура не вышла за монтажную область и текст начал переноситься', () => {
      expect(limitedSnapshot.groupBoundsWidth)
        .toBeGreaterThan(initialSnapshot.groupBoundsWidth + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      expect(limitedSnapshot.groupBoundsLeft)
        .toBeGreaterThanOrEqual(montageBounds.left - SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      expect(limitedSnapshot.groupBoundsRight)
        .toBeLessThanOrEqual(montageBounds.right + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      expect(limitedText?.lineCount).toBeGreaterThan(1)
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

    test('update с явной шириной и длинным текстом сразу переносит текст, когда авторасширение выключено', async({
      shapes
    }) => {
      const initialSnapshot = await test.step('Получить исходную ширину фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-disabled' })
      })

      await test.step('Одним update задать явную ширину и длинный текст при выключенном авторасширении', async() => {
        const updatedShape = await shapes.update({
          id: 'shape-auto-expand-disabled',
          options: {
            width: SHAPE_AUTO_EXPAND_ATOMIC_UPDATE_WIDTH,
            text: SHAPE_AUTO_EXPAND_LONG_TEXT,
            shapeTextAutoExpand: false
          }
        })

        expect(updatedShape).not.toBeNull()
      })

      const updatedShape = await test.step('Получить состояние фигуры после update', () => {
        return shapes.getObject({ id: 'shape-auto-expand-disabled' })
      })
      const updatedText = await test.step('Получить состояние текста после update', () => {
        return shapes.getTextNode({ id: 'shape-auto-expand-disabled' })
      })
      const updatedSnapshot = await test.step('Получить ширину фигуры после update', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-disabled' })
      })

      await test.step('Проверить что ширина не раздулась, а текст перенёсся сразу', () => {
        expect(updatedShape?.shapeTextAutoExpand).toBe(false)
        expect(updatedText?.lineCount).toBeGreaterThan(1)
        expect(Math.abs(updatedSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
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

    test('после скейлинга, undo и redo выключенный режим авторасширения не включается при новом вводе', async({
      history,
      shapes
    }) => {
      const initialSnapshot = await test.step('Получить исходную ширину фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-disabled' })
      })

      await test.step('Растянуть фигуру по ширине и сохранить это состояние в истории', async() => {
        await shapes.scaleHorizontallyFromRight({
          id: 'shape-auto-expand-disabled',
          scaleX: SHAPE_AUTO_EXPAND_RESIZE_SCALE_X
        })
        await shapes.finishScale({ id: 'shape-auto-expand-disabled' })
        await history.flushPendingSave()
      })

      const resizedSnapshot = await test.step('Получить ширину после ручного скейлинга', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-disabled' })
      })

      await test.step('Сделать undo и redo', async() => {
        await history.undo()
        await history.redo()
      })

      const redoneShape = await test.step('Получить состояние фигуры после redo', () => {
        return shapes.getObject({ id: 'shape-auto-expand-disabled' })
      })
      const redoneSnapshot = await test.step('Получить ширину фигуры после redo', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-disabled' })
      })

      await test.step('После redo ввести длинный текст', async() => {
        await shapes.enterTextEditing({ id: 'shape-auto-expand-disabled' })
        await shapes.updateEditingText({
          id: 'shape-auto-expand-disabled',
          text: SHAPE_AUTO_EXPAND_VERY_LONG_TEXT
        })
      })

      const updatedShape = await test.step('Получить состояние фигуры после нового ввода', () => {
        return shapes.getObject({ id: 'shape-auto-expand-disabled' })
      })
      const updatedText = await test.step('Получить состояние текста после нового ввода', () => {
        return shapes.getTextNode({ id: 'shape-auto-expand-disabled' })
      })
      const updatedSnapshot = await test.step('Получить ширину фигуры после нового ввода', () => {
        return shapes.getScaleSnapshot({ id: 'shape-auto-expand-disabled' })
      })

      await test.step('Проверить что после redo режим не включился заново и ширина осталась ручной', () => {
        expect(resizedSnapshot.groupBoundsWidth)
          .toBeGreaterThan(initialSnapshot.groupBoundsWidth + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(redoneShape?.shapeTextAutoExpand).toBe(false)
        expect(Math.abs(redoneSnapshot.groupBoundsWidth - resizedSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(updatedShape?.shapeTextAutoExpand).toBe(false)
        expect(updatedText?.lineCount).toBeGreaterThan(1)
        expect(Math.abs(updatedSnapshot.groupBoundsWidth - redoneSnapshot.groupBoundsWidth))
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
    const currentText = await test.step('Получить состояние текста после обновления', () => {
      return shapes.getTextNode({ id: 'shape-editing-auto-expand' })
    })
    const activeObject = await test.step('Получить активный объект после обновления', () => {
      return editorModel.getActiveObject()
    })

    await test.step('Завершить редактирование текста', async() => {
      const textAfterExit = await shapes.exitTextEditing({ id: 'shape-editing-auto-expand' })

      expect(textAfterExit).not.toBeNull()
    })

    const activeShapeAfterEditing = await test.step('Получить активный объект после завершения редактирования', () => {
      return editorModel.getActiveObject()
    })

    await test.step('Проверить что редактирование сохранилось и после него фигура снова выделяется', () => {
      expect(initialText?.lineCount).toBe(1)
      expect(initialSnapshot.groupBoundsWidth)
        .toBeGreaterThan((SHAPE_AUTO_EXPAND_BASE_OPTIONS.width ?? 0) + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      expect(currentShape?.shapeTextAutoExpand).toBe(false)
      expect(currentText?.isEditing).toBe(true)
      expect(activeObject?.type).toBe(currentText?.type)
      expect(activeObject?.id).toBe(currentText?.id)
      expect(activeShapeAfterEditing?.type).toBe('shape-group')
      expect(activeShapeAfterEditing?.id).toBe('shape-editing-auto-expand')
    })
  })

  test('включение авторасширения во время редактирования текста не ломает выделение фигуры', async({
    editorModel,
    shapes
  }) => {
    const createdShape = await test.step('Добавить фигуру с выключенным авторасширением и длинным текстом', async() => {
      return shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_AUTO_EXPAND_BASE_OPTIONS,
          id: 'shape-editing-enable-auto-expand',
          text: SHAPE_AUTO_EXPAND_LONG_TEXT,
          shapeTextAutoExpand: false
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'square'
    })

    const wrappedText = await test.step('Получить состояние текста до включения режима', () => {
      return shapes.getTextNode({ id: 'shape-editing-enable-auto-expand' })
    })
    const wrappedSnapshot = await test.step('Получить ширину фигуры до включения режима', () => {
      return shapes.getScaleSnapshot({ id: 'shape-editing-enable-auto-expand' })
    })

    await test.step('Открыть режим редактирования текста', async() => {
      await shapes.enterTextEditing({ id: 'shape-editing-enable-auto-expand' })
    })

    await test.step('Включить авторасширение у редактируемой фигуры', async() => {
      const updatedShape = await shapes.update({
        id: 'shape-editing-enable-auto-expand',
        options: {
          shapeTextAutoExpand: true
        }
      })

      expect(updatedShape).not.toBeNull()
    })

    const currentShape = await test.step('Получить состояние фигуры после включения режима', () => {
      return shapes.getObject({ id: 'shape-editing-enable-auto-expand' })
    })
    const currentText = await test.step('Получить состояние текста после включения режима', () => {
      return shapes.getTextNode({ id: 'shape-editing-enable-auto-expand' })
    })
    const currentSnapshot = await test.step('Получить ширину фигуры после включения режима', () => {
      return shapes.getScaleSnapshot({ id: 'shape-editing-enable-auto-expand' })
    })
    const activeObject = await test.step('Получить активный объект после обновления', () => {
      return editorModel.getActiveObject()
    })

    await test.step('Завершить редактирование текста', async() => {
      const textAfterExit = await shapes.exitTextEditing({ id: 'shape-editing-enable-auto-expand' })

      expect(textAfterExit).not.toBeNull()
    })

    const activeShapeAfterEditing = await test.step('Получить активный объект после завершения редактирования', () => {
      return editorModel.getActiveObject()
    })

    await test.step('Проверить что редактирование сохранилось, текст перестроился и после него фигура снова выделяется', () => {
      expect(wrappedText?.lineCount).toBeGreaterThan(1)
      expect(currentShape?.shapeTextAutoExpand).toBe(true)
      expect(currentText?.isEditing).toBe(true)
      expect(currentText?.lineCount).toBe(1)
      expect(currentSnapshot.groupBoundsWidth)
        .toBeGreaterThan(wrappedSnapshot.groupBoundsWidth + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      expect(activeObject?.type).toBe(currentText?.type)
      expect(activeObject?.id).toBe(currentText?.id)
      expect(activeShapeAfterEditing?.type).toBe('shape-group')
      expect(activeShapeAfterEditing?.id).toBe('shape-editing-enable-auto-expand')
    })
  })

  test.describe('после применения шаблона (TemplateManager), копирования и истории', () => {
    test('если длинный текст уже сохранён в шаблоне, то фигура сразу расширяется и не прыгает при входе в редактирование', async({
      editorModel,
      shapes,
      template
    }) => {
      const sourceShape = await test.step('Добавить исходную фигуру с включённым авторасширением', async() => {
        return shapes.add({
          presetKey: 'square',
          options: {
            ...SHAPE_AUTO_EXPAND_BASE_OPTIONS,
            id: 'shape-template-serialized-long-text-source',
            text: 'TEST',
            shapeTextAutoExpand: true
          }
        })
      })

      shapes.checkCreation({
        shape: sourceShape,
        presetKey: 'square'
      })

      await test.step('Сериализовать исходную фигуру в шаблон', async() => {
        await shapes.select({ id: 'shape-template-serialized-long-text-source' })
      })

      const serializedTemplate = await test.step('Подменить текст прямо в serialized template', async() => {
        const currentTemplate = await template.serializeSelection()

        expect(currentTemplate).not.toBeNull()

        return template.setFirstShapeText({
          template: currentTemplate!,
          text: SHAPE_AUTO_EXPAND_VERY_LONG_TEXT,
          shapeTextAutoExpand: true
        })
      })

      const templateShapeId = await test.step('Применить шаблон и определить новую фигуру', async() => {
        const insertedCount = await template.applyTemplate({
          template: serializedTemplate
        })

        expect(insertedCount).toBe(1)
        await editorModel.checkObjectCount({ count: 2 })

        const objects = await shapes.getShapeObjects()
        const appliedShape = objects.find((shape) => shape.id !== 'shape-template-serialized-long-text-source')

        expect(appliedShape).toBeDefined()
        expect(appliedShape?.id).toBeDefined()

        return appliedShape?.id as string
      })

      const appliedShape = await test.step('Получить состояние фигуры сразу после применения шаблона', () => {
        return shapes.getObject({ id: templateShapeId })
      })
      const appliedText = await test.step('Получить текст фигуры сразу после применения шаблона', () => {
        return shapes.getTextNode({ id: templateShapeId })
      })
      const appliedSnapshot = await test.step('Получить ширину фигуры сразу после применения шаблона', () => {
        return shapes.getScaleSnapshot({ id: templateShapeId })
      })

      await test.step('Войти в редактирование текста фигуры из шаблона', async() => {
        await shapes.enterTextEditing({ id: templateShapeId })
      })

      const editingText = await test.step('Получить текст фигуры после входа в редактирование', () => {
        return shapes.getTextNode({ id: templateShapeId })
      })
      const editingSnapshot = await test.step('Получить ширину фигуры после входа в редактирование', () => {
        return shapes.getScaleSnapshot({ id: templateShapeId })
      })

      await test.step('Проверить что фигура сразу расширилась и не изменила ширину при входе в редактирование', () => {
        expect(appliedShape?.shapeTextAutoExpand).toBe(true)
        expect(appliedText?.lineCount).toBe(2)
        expect(appliedSnapshot.groupBoundsWidth)
          .toBeGreaterThan((SHAPE_AUTO_EXPAND_BASE_OPTIONS.width ?? 0) + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(editingText?.lineCount).toBe(2)
        expect(Math.abs(editingSnapshot.groupBoundsWidth - appliedSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      })
    })

    test('если длинный текст уже сохранён в шаблоне с выключенным авторасширением, то фигура сохраняет переносы и ширину', async({
      editorModel,
      shapes,
      template
    }) => {
      const sourceShape = await test.step('Добавить исходную фигуру с выключенным авторасширением', async() => {
        return shapes.add({
          presetKey: 'square',
          options: {
            ...SHAPE_AUTO_EXPAND_BASE_OPTIONS,
            id: 'shape-template-serialized-wrapped-text-source',
            text: 'TEST',
            shapeTextAutoExpand: false
          }
        })
      })

      shapes.checkCreation({
        shape: sourceShape,
        presetKey: 'square'
      })

      const sourceSnapshot = await test.step('Получить исходную ширину фигуры', () => {
        return shapes.getScaleSnapshot({ id: 'shape-template-serialized-wrapped-text-source' })
      })

      await test.step('Сериализовать исходную фигуру в шаблон', async() => {
        await shapes.select({ id: 'shape-template-serialized-wrapped-text-source' })
      })

      const serializedTemplate = await test.step('Подменить текст прямо в serialized template', async() => {
        const currentTemplate = await template.serializeSelection()

        expect(currentTemplate).not.toBeNull()

        return template.setFirstShapeText({
          template: currentTemplate!,
          text: SHAPE_AUTO_EXPAND_VERY_LONG_TEXT,
          shapeTextAutoExpand: false
        })
      })

      const templateShapeId = await test.step('Применить шаблон и определить новую фигуру', async() => {
        const insertedCount = await template.applyTemplate({
          template: serializedTemplate
        })

        expect(insertedCount).toBe(1)
        await editorModel.checkObjectCount({ count: 2 })

        const objects = await shapes.getShapeObjects()
        const appliedShape = objects.find((shape) => shape.id !== 'shape-template-serialized-wrapped-text-source')

        expect(appliedShape).toBeDefined()
        expect(appliedShape?.id).toBeDefined()

        return appliedShape?.id as string
      })

      const appliedShape = await test.step('Получить состояние фигуры сразу после применения шаблона', () => {
        return shapes.getObject({ id: templateShapeId })
      })
      const appliedText = await test.step('Получить текст фигуры сразу после применения шаблона', () => {
        return shapes.getTextNode({ id: templateShapeId })
      })
      const appliedSnapshot = await test.step('Получить ширину фигуры сразу после применения шаблона', () => {
        return shapes.getScaleSnapshot({ id: templateShapeId })
      })

      await test.step('Проверить что фигура сохранила выключенный режим и осталась в fixed-width состоянии', () => {
        expect(appliedShape?.shapeTextAutoExpand).toBe(false)
        expect(appliedText?.lineCount).toBeGreaterThan(1)
        expect(Math.abs(appliedSnapshot.groupBoundsWidth - sourceSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
      })
    })

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

    test('после копирования фигура с уже расширенной шириной не откатывается к базовой при вертикальном сжатии', async({
      clipboard,
      editorModel,
      shapes
    }) => {
      const sourceShape = await test.step('Добавить фигуру, которая сразу расширится под текст', async() => {
        return shapes.add({
          presetKey: 'square',
          options: {
            ...SHAPE_AUTO_EXPAND_BASE_OPTIONS,
            id: 'shape-copy-expanded-width-source',
            text: SHAPE_AUTO_EXPAND_LONG_TEXT
          }
        })
      })

      shapes.checkCreation({
        shape: sourceShape,
        presetKey: 'square'
      })

      await test.step('Скопировать исходную фигуру', async() => {
        await shapes.select({ id: 'shape-copy-expanded-width-source' })
        await clipboard.copy()
        await clipboard.waitForClipboardReady()
      })

      const pastedShapeId = await test.step('Вставить копию и определить новую фигуру', async() => {
        const pasted = await clipboard.paste()

        expect(pasted).toBe(true)
        await editorModel.checkObjectCount({ count: 2 })

        const objects = await shapes.getShapeObjects()
        const duplicatedShape = objects.find((shape) => shape.id !== 'shape-copy-expanded-width-source')

        expect(duplicatedShape).toBeDefined()
        expect(duplicatedShape?.id).toBeDefined()

        return duplicatedShape?.id as string
      })

      const initialText = await test.step('Получить состояние текста во вставленной фигуре', () => {
        return shapes.getTextNode({ id: pastedShapeId })
      })
      const initialSnapshot = await test.step('Получить исходную ширину вставленной фигуры', () => {
        return shapes.getScaleSnapshot({ id: pastedShapeId })
      })

      const liveSnapshot = await test.step('Сжать вставленную фигуру по высоте до упора в текст', async() => {
        return shapes.shrinkToMinimumHeight({ id: pastedShapeId })
      })
      const finalSnapshot = await test.step('Зафиксировать итоговое состояние после вертикального сжатия', async() => {
        await shapes.finishScale({ id: pastedShapeId })

        return shapes.getScaleSnapshot({ id: pastedShapeId })
      })
      const finalText = await test.step('Получить состояние текста после вертикального сжатия', () => {
        return shapes.getTextNode({ id: pastedShapeId })
      })

      await test.step('Проверить что ширина не откатилась к базовой, а текст остался в одну строку', () => {
        expect(initialText?.lineCount).toBe(1)
        expect(initialSnapshot.groupBoundsWidth)
          .toBeGreaterThan((SHAPE_AUTO_EXPAND_BASE_OPTIONS.width ?? 0) + SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(Math.abs(liveSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(Math.abs(finalSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE)
        expect(finalSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)
        expect(finalText?.lineCount).toBe(1)
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
