import { test, expect } from '../../fixtures/editor.fixture'
import {
  BROWSER_RESIZE_NARROW_VIEWPORT,
  BROWSER_RESIZE_WIDE_VIEWPORT
} from '../../fixtures/data/browser-resize.data'
import {
  PRODUCT_CARD_TEMPLATE,
  PRODUCT_CARD_TEMPLATE_BACKGROUND_COLOR,
  PRODUCT_CARD_TEMPLATE_BASE_RESOLUTION,
  PRODUCT_CARD_TEMPLATE_COMPACT_RESOLUTION,
  PRODUCT_CARD_TEMPLATE_EXPANDED_RESOLUTION,
  PRODUCT_CARD_TEMPLATE_INDEXES,
  PRODUCT_CARD_TEMPLATE_OBJECT_COUNT,
  PRODUCT_CARD_TEMPLATE_UPDATED_TITLE,
  TEMPLATE_ALIGNMENT_TOLERANCE,
  TEMPLATE_BOUNDS_TOLERANCE,
  TEMPLATE_SHAPE_LONG_TEXT_OPTIONS,
  TEMPLATE_SHAPE_TEXT_BASE_RESOLUTION,
  TEMPLATE_SHAPE_TEXT_LARGE_SCALE,
  TEMPLATE_SHAPE_TEXT_LARGE_RESOLUTION,
  TEMPLATE_SHAPE_TEXT_SCALE_OPTIONS,
  TEMPLATE_SHAPE_TEXT_SCALE_TOLERANCE,
  TEMPLATE_ROUNDTRIP_BASE_RESOLUTION,
  TEMPLATE_ROUNDTRIP_EXPANDED_RESOLUTION,
  TEMPLATE_ROUNDTRIP_LEFT_SHAPE,
  TEMPLATE_ROUNDTRIP_MIXED_SHAPE,
  TEMPLATE_ROUNDTRIP_MIXED_TEXT,
  TEMPLATE_ROUNDTRIP_POSITION_TOLERANCE,
  TEMPLATE_ROUNDTRIP_RELATIVE_TOLERANCE,
  TEMPLATE_ROUNDTRIP_RIGHT_SHAPE
} from '../../fixtures/data/template-manager.data'

test.describe('Готовый шаблон', () => {
  test('готовый шаблон появляется внутри монтажной области', async({
    background,
    canvas,
    editorModel,
    template
  }) => {
    await test.step('Установить исходный размер монтажной области', async() => {
      await canvas.setMontageResolution(PRODUCT_CARD_TEMPLATE_BASE_RESOLUTION)
    })

    await test.step('Применить готовый шаблон карточки', async() => {
      const insertedCount = await template.applyTemplate({
        template: PRODUCT_CARD_TEMPLATE
      })

      expect(insertedCount).toBe(PRODUCT_CARD_TEMPLATE_OBJECT_COUNT)
      await editorModel.checkObjectCount({ count: PRODUCT_CARD_TEMPLATE_OBJECT_COUNT })
    })

    await test.step('Проверить что все вставленные объекты остались внутри монтажной области', async() => {
      const montageBounds = await editorModel.getMontageAreaBounds()
      const backgroundObject = await background.getObject()
      const objectIndexes = Object.values(PRODUCT_CARD_TEMPLATE_INDEXES)

      expect(backgroundObject?.fill).toBe(PRODUCT_CARD_TEMPLATE_BACKGROUND_COLOR)

      for (const objectIndex of objectIndexes) {
        const snapshot = await editorModel.getObjectSnapshot({ objectIndex })

        expect(snapshot.boundsLeft).toBeGreaterThanOrEqual(montageBounds.left - TEMPLATE_BOUNDS_TOLERANCE)
        expect(snapshot.boundsTop).toBeGreaterThanOrEqual(montageBounds.top - TEMPLATE_BOUNDS_TOLERANCE)
        expect(snapshot.boundsRight).toBeLessThanOrEqual(montageBounds.right + TEMPLATE_BOUNDS_TOLERANCE)
        expect(snapshot.boundsBottom).toBeLessThanOrEqual(montageBounds.bottom + TEMPLATE_BOUNDS_TOLERANCE)
      }
    })
  })

  test('после применения шаблона фон остаётся фоном, а не обычным объектом', async({
    background,
    canvas,
    editorModel,
    template
  }) => {
    await test.step('Подготовить монтажную область и применить шаблон', async() => {
      await canvas.setMontageResolution(PRODUCT_CARD_TEMPLATE_BASE_RESOLUTION)

      const insertedCount = await template.applyTemplate({
        template: PRODUCT_CARD_TEMPLATE
      })

      expect(insertedCount).toBe(PRODUCT_CARD_TEMPLATE_OBJECT_COUNT)
    })

    await test.step('Проверить что фон применился отдельно от обычных объектов canvas', async() => {
      const objects = await editorModel.getObjects()
      const backgroundObject = await background.getObject()

      expect(objects).toHaveLength(PRODUCT_CARD_TEMPLATE_OBJECT_COUNT)
      expect(objects.some((object) => object.id === 'background')).toBe(false)
      expect(backgroundObject?.backgroundType).toBe('color')
      expect(backgroundObject?.fill).toBe(PRODUCT_CARD_TEMPLATE_BACKGROUND_COLOR)
    })
  })

  test('готовый шаблон на исходном размере сохраняет раскладку карточки', async({
    canvas,
    editorModel,
    template,
    text
  }) => {
    await test.step('Установить исходный размер монтажной области и применить шаблон', async() => {
      await canvas.setMontageResolution(PRODUCT_CARD_TEMPLATE_BASE_RESOLUTION)

      const insertedCount = await template.applyTemplate({
        template: PRODUCT_CARD_TEMPLATE
      })

      expect(insertedCount).toBe(PRODUCT_CARD_TEMPLATE_OBJECT_COUNT)
    })

    await test.step('Проверить композицию шаблона на канвасе', async() => {
      const montageBounds = await editorModel.getMontageAreaBounds()
      const card = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.card })
      const image = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.image })
      const title = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.title })
      const subtitle = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.subtitle })
      const featureLeft = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.featureLeft })
      const featureCenter = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.featureCenter })
      const featureRight = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.featureRight })
      const titleObject = text.checkCreation({
        textObject: await text.getObject({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.title })
      })
      const subtitleObject = text.checkCreation({
        textObject: await text.getObject({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.subtitle })
      })

      expect(titleObject.text).toBe('НАУШНИКИ BOSE')
      expect(subtitleObject.text).toContain('шумоподавлением')
      expect(Math.abs(card.centerX - montageBounds.centerX)).toBeLessThanOrEqual(TEMPLATE_BOUNDS_TOLERANCE)
      expect(Math.abs(image.centerX - card.centerX)).toBeLessThanOrEqual(TEMPLATE_BOUNDS_TOLERANCE)
      expect(image.centerY).toBeLessThan(card.centerY)
      expect(title.boundsBottom).toBeLessThan(card.boundsTop)
      expect(subtitle.boundsTop).toBeGreaterThan(title.boundsTop)
      expect(subtitle.boundsBottom).toBeLessThan(card.boundsTop)
      expect(featureLeft.centerX).toBeLessThan(featureCenter.centerX)
      expect(featureCenter.centerX).toBeLessThan(featureRight.centerX)
      expect(Math.abs(featureLeft.boundsBottom - featureCenter.boundsBottom)).toBeLessThanOrEqual(
        TEMPLATE_ALIGNMENT_TOLERANCE
      )
      expect(Math.abs(featureCenter.boundsBottom - featureRight.boundsBottom)).toBeLessThanOrEqual(
        TEMPLATE_ALIGNMENT_TOLERANCE
      )
    })
  })

  test('готовый шаблон на другом размере сохраняет ту же композицию', async({
    canvas,
    editorModel,
    template
  }) => {
    await test.step('Установить уменьшенный размер монтажной области и применить шаблон', async() => {
      await canvas.setMontageResolution(PRODUCT_CARD_TEMPLATE_COMPACT_RESOLUTION)

      const insertedCount = await template.applyTemplate({
        template: PRODUCT_CARD_TEMPLATE
      })

      expect(insertedCount).toBe(PRODUCT_CARD_TEMPLATE_OBJECT_COUNT)
    })

    await test.step('Проверить что блоки шаблона сохранили ожидаемую раскладку', async() => {
      const montageBounds = await editorModel.getMontageAreaBounds()
      const card = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.card })
      const image = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.image })
      const title = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.title })
      const subtitle = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.subtitle })
      const featureLeft = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.featureLeft })
      const featureCenter = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.featureCenter })
      const featureRight = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.featureRight })

      expect(Math.abs(((card.centerX - montageBounds.left) / montageBounds.width) - 0.5))
        .toBeLessThanOrEqual(0.03)
      expect(Math.abs(((image.centerX - montageBounds.left) / montageBounds.width) - 0.5))
        .toBeLessThanOrEqual(0.03)
      expect((title.boundsTop - montageBounds.top) / montageBounds.height).toBeLessThan(0.1)
      expect(subtitle.boundsTop).toBeGreaterThan(title.boundsTop)
      expect(subtitle.boundsBottom).toBeLessThan(card.boundsTop)
      expect(((featureLeft.centerX - montageBounds.left) / montageBounds.width)).toBeLessThan(0.3)
      expect(((featureCenter.centerX - montageBounds.left) / montageBounds.width)).toBeGreaterThan(0.45)
      expect(((featureCenter.centerX - montageBounds.left) / montageBounds.width)).toBeLessThan(0.55)
      expect(((featureRight.centerX - montageBounds.left) / montageBounds.width)).toBeGreaterThan(0.7)
      expect(Math.abs(featureLeft.boundsBottom - featureCenter.boundsBottom)).toBeLessThanOrEqual(
        TEMPLATE_ALIGNMENT_TOLERANCE
      )
      expect(Math.abs(featureCenter.boundsBottom - featureRight.boundsBottom)).toBeLessThanOrEqual(
        TEMPLATE_ALIGNMENT_TOLERANCE
      )
    })
  })

  test('после применения шаблона заголовок и подзаголовок можно сразу редактировать', async({
    canvas,
    template,
    text
  }) => {
    await test.step('Применить готовый шаблон карточки', async() => {
      await canvas.setMontageResolution(PRODUCT_CARD_TEMPLATE_BASE_RESOLUTION)

      const insertedCount = await template.applyTemplate({
        template: PRODUCT_CARD_TEMPLATE
      })

      expect(insertedCount).toBe(PRODUCT_CARD_TEMPLATE_OBJECT_COUNT)
    })

    await test.step('Сразу после вставки изменить заголовок и подзаголовок', async() => {
      await text.enterTextEditing({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.title })
      await text.updateEditingText({
        objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.title,
        text: PRODUCT_CARD_TEMPLATE_UPDATED_TITLE
      })
      await text.exitTextEditing({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.title })

      await text.enterTextEditing({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.subtitle })
      await text.updateEditingText({
        objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.subtitle,
        text: 'Новый подзаголовок товара'
      })
      await text.exitTextEditing({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.subtitle })
    })

    await test.step('Проверить что оба текстовых блока сохранили изменения', async() => {
      const titleObject = text.checkCreation({
        textObject: await text.getObject({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.title })
      })
      const subtitleObject = text.checkCreation({
        textObject: await text.getObject({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.subtitle })
      })

      expect(titleObject.text).toBe(PRODUCT_CARD_TEMPLATE_UPDATED_TITLE)
      expect(subtitleObject.text).toBe('Новый подзаголовок товара')
    })
  })
})

test.describe('Текст внутри фигуры из шаблона', () => {
  test('длинный текст внутри фигуры из сохранённого шаблона остаётся внутри выделения', async({
    canvas,
    shapes,
    template
  }) => {
    const serializedTemplate = await test.step('Создать фигуру с длинным текстом и сохранить её как шаблон', async() => {
      await canvas.setMontageResolution(TEMPLATE_SHAPE_TEXT_BASE_RESOLUTION)
      shapes.checkCreation({
        shape: await shapes.addAtBounds({
          presetKey: 'square',
          options: TEMPLATE_SHAPE_LONG_TEXT_OPTIONS
        }),
        presetKey: 'square'
      })
      await shapes.select({ id: TEMPLATE_SHAPE_LONG_TEXT_OPTIONS.id })

      return template.serializeSelection()
    })

    await test.step('Очистить canvas и применить сохранённый шаблон', async() => {
      expect(serializedTemplate).not.toBeNull()
      await canvas.clearCanvas()

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(1)
    })

    await test.step('Проверить что текст остался внутри фигуры', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })
      const snapshot = await shapes.getScaleSnapshot({ objectIndex: 0 })

      if (!textNode) {
        throw new Error('текст внутри фигуры из шаблона должен существовать')
      }

      expect(textNode.text).toBe(TEMPLATE_SHAPE_LONG_TEXT_OPTIONS.text)
      expect(textNode.lineCount).toBeGreaterThan(1)
      shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
    })
  })

  test('текст внутри фигуры из сохранённого шаблона увеличивается вместе с монтажной областью', async({
    canvas,
    shapes,
    template
  }) => {
    await test.step('Создать фигуру на исходном размере монтажной области', async() => {
      await canvas.setMontageResolution(TEMPLATE_SHAPE_TEXT_BASE_RESOLUTION)
      shapes.checkCreation({
        shape: await shapes.addAtBounds({
          presetKey: 'square',
          options: TEMPLATE_SHAPE_TEXT_SCALE_OPTIONS
        }),
        presetKey: 'square'
      })
      await shapes.select({ id: TEMPLATE_SHAPE_TEXT_SCALE_OPTIONS.id })
    })

    const sourceText = await test.step('Получить исходный размер текста внутри фигуры', async() => {
      return shapes.getTextNode({ id: TEMPLATE_SHAPE_TEXT_SCALE_OPTIONS.id })
    })
    const sourceSnapshot = await test.step('Получить исходную геометрию фигуры', async() => {
      return shapes.getScaleSnapshot({ id: TEMPLATE_SHAPE_TEXT_SCALE_OPTIONS.id })
    })
    const serializedTemplate = await test.step('Сохранить фигуру как шаблон', () => {
      return template.serializeSelection()
    })

    await test.step('Применить сохранённый шаблон на большом размере монтажной области', async() => {
      expect(serializedTemplate).not.toBeNull()
      await canvas.clearCanvas()
      await canvas.setMontageResolution(TEMPLATE_SHAPE_TEXT_LARGE_RESOLUTION)

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(1)
    })

    await test.step('Проверить что текст и фигура увеличились в том же масштабе', async() => {
      const appliedText = await shapes.getTextNode({ objectIndex: 0 })
      const appliedSnapshot = await shapes.getScaleSnapshot({ objectIndex: 0 })

      if (!sourceText || !appliedText) {
        throw new Error('текст внутри фигуры должен существовать до и после применения шаблона')
      }

      const expectedFontSize = sourceText.fontSize * TEMPLATE_SHAPE_TEXT_LARGE_SCALE
      const expectedWidth = sourceSnapshot.groupBoundsWidth * TEMPLATE_SHAPE_TEXT_LARGE_SCALE

      expect(appliedText.fontSize).toBeGreaterThan(sourceText.fontSize + 1)
      expect(Math.abs(appliedText.fontSize - expectedFontSize))
        .toBeLessThanOrEqual(TEMPLATE_SHAPE_TEXT_SCALE_TOLERANCE)
      expect(Math.abs(appliedSnapshot.groupBoundsWidth - expectedWidth))
        .toBeLessThanOrEqual(TEMPLATE_SHAPE_TEXT_SCALE_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: appliedSnapshot, kind: 'text' })
    })
  })
})

test.describe('Сохранение выделения в шаблон', () => {
  test('два выделенных объекта после сохранения в шаблон и повторного применения остаются на своих местах', async({
    canvas,
    editorModel,
    shapes,
    template
  }) => {
    const serializedTemplate = await test.step('Создать две фигуры, выделить их и сериализовать в шаблон', async() => {
      await canvas.setMontageResolution(TEMPLATE_ROUNDTRIP_BASE_RESOLUTION)
      shapes.checkCreation({
        shape: await shapes.addAtBounds({
          presetKey: 'square',
          options: TEMPLATE_ROUNDTRIP_LEFT_SHAPE
        }),
        presetKey: 'square'
      })
      shapes.checkCreation({
        shape: await shapes.addAtBounds({
          presetKey: 'square',
          options: TEMPLATE_ROUNDTRIP_RIGHT_SHAPE
        }),
        presetKey: 'square'
      })
      await editorModel.selectAllObjects()

      return template.serializeSelection()
    })

    const sourceLeft = await test.step('Получить исходное положение левой фигуры', () => {
      return editorModel.getObjectSnapshot({ id: TEMPLATE_ROUNDTRIP_LEFT_SHAPE.id })
    })
    const sourceRight = await test.step('Получить исходное положение правой фигуры', () => {
      return editorModel.getObjectSnapshot({ id: TEMPLATE_ROUNDTRIP_RIGHT_SHAPE.id })
    })

    await test.step('Очистить canvas и применить сохранённый шаблон', async() => {
      expect(serializedTemplate).not.toBeNull()
      await canvas.clearCanvas()

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(2)
      await editorModel.checkObjectCount({ count: 2 })
    })

    await test.step('Проверить что обе фигуры вернулись на те же места', async() => {
      const appliedLeft = await editorModel.getObjectSnapshot({ objectIndex: 0 })
      const appliedRight = await editorModel.getObjectSnapshot({ objectIndex: 1 })

      expect(Math.abs(appliedLeft.boundsLeft - sourceLeft.boundsLeft)).toBeLessThanOrEqual(
        TEMPLATE_ROUNDTRIP_POSITION_TOLERANCE
      )
      expect(Math.abs(appliedLeft.boundsTop - sourceLeft.boundsTop)).toBeLessThanOrEqual(
        TEMPLATE_ROUNDTRIP_POSITION_TOLERANCE
      )
      expect(Math.abs(appliedRight.boundsLeft - sourceRight.boundsLeft)).toBeLessThanOrEqual(
        TEMPLATE_ROUNDTRIP_POSITION_TOLERANCE
      )
      expect(Math.abs(appliedRight.boundsTop - sourceRight.boundsTop)).toBeLessThanOrEqual(
        TEMPLATE_ROUNDTRIP_POSITION_TOLERANCE
      )
      expect(Math.abs(appliedLeft.boundsWidth - sourceLeft.boundsWidth)).toBeLessThanOrEqual(
        TEMPLATE_ROUNDTRIP_POSITION_TOLERANCE
      )
      expect(Math.abs(appliedRight.boundsWidth - sourceRight.boundsWidth)).toBeLessThanOrEqual(
        TEMPLATE_ROUNDTRIP_POSITION_TOLERANCE
      )
    })
  })

  // eslint-disable-next-line max-len
  test('два выделенных объекта после сохранения в шаблон и повторного применения сохраняют расстояние между собой на другом размере', async({
    canvas,
    editorModel,
    shapes,
    template
  }) => {
    await test.step('Подготовить две фигуры на исходном размере монтажной области', async() => {
      await canvas.setMontageResolution(TEMPLATE_ROUNDTRIP_BASE_RESOLUTION)
      shapes.checkCreation({
        shape: await shapes.addAtBounds({
          presetKey: 'square',
          options: TEMPLATE_ROUNDTRIP_LEFT_SHAPE
        }),
        presetKey: 'square'
      })
      shapes.checkCreation({
        shape: await shapes.addAtBounds({
          presetKey: 'square',
          options: TEMPLATE_ROUNDTRIP_RIGHT_SHAPE
        }),
        presetKey: 'square'
      })
    })

    const sourceMontageBounds = await test.step('Получить исходные границы монтажной области', () => {
      return editorModel.getMontageAreaBounds()
    })
    const sourceLeft = await test.step('Получить исходное положение левой фигуры', () => {
      return editorModel.getObjectSnapshot({ id: TEMPLATE_ROUNDTRIP_LEFT_SHAPE.id })
    })
    const sourceRight = await test.step('Получить исходное положение правой фигуры', () => {
      return editorModel.getObjectSnapshot({ id: TEMPLATE_ROUNDTRIP_RIGHT_SHAPE.id })
    })

    const serializedTemplate = await test.step('Выделить обе фигуры и сохранить их в шаблон', async() => {
      await editorModel.selectAllObjects()

      return template.serializeSelection()
    })

    await test.step('Применить шаблон на монтажной области другого размера', async() => {
      expect(serializedTemplate).not.toBeNull()
      await canvas.clearCanvas()
      await canvas.setMontageResolution(TEMPLATE_ROUNDTRIP_EXPANDED_RESOLUTION)

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(2)
    })

    await test.step('Проверить что фигуры сохранили относительное положение и не выехали за монтажную область', async() => {
      const appliedMontageBounds = await editorModel.getMontageAreaBounds()
      const appliedLeft = await editorModel.getObjectSnapshot({ objectIndex: 0 })
      const appliedRight = await editorModel.getObjectSnapshot({ objectIndex: 1 })
      const sourceLeftCenterX = (sourceLeft.centerX - sourceMontageBounds.left) / sourceMontageBounds.width
      const sourceRightCenterX = (sourceRight.centerX - sourceMontageBounds.left) / sourceMontageBounds.width
      const sourceLeftCenterY = (sourceLeft.centerY - sourceMontageBounds.top) / sourceMontageBounds.height
      const sourceRightCenterY = (sourceRight.centerY - sourceMontageBounds.top) / sourceMontageBounds.height
      const sourceGap = (sourceRight.centerX - sourceLeft.centerX) / sourceMontageBounds.width
      const appliedLeftCenterX = (appliedLeft.centerX - appliedMontageBounds.left) / appliedMontageBounds.width
      const appliedRightCenterX = (appliedRight.centerX - appliedMontageBounds.left) / appliedMontageBounds.width
      const appliedLeftCenterY = (appliedLeft.centerY - appliedMontageBounds.top) / appliedMontageBounds.height
      const appliedRightCenterY = (appliedRight.centerY - appliedMontageBounds.top) / appliedMontageBounds.height
      const appliedGap = (appliedRight.centerX - appliedLeft.centerX) / appliedMontageBounds.width

      expect(Math.abs(appliedLeftCenterX - sourceLeftCenterX)).toBeLessThanOrEqual(
        TEMPLATE_ROUNDTRIP_RELATIVE_TOLERANCE
      )
      expect(Math.abs(appliedRightCenterX - sourceRightCenterX)).toBeLessThanOrEqual(
        TEMPLATE_ROUNDTRIP_RELATIVE_TOLERANCE
      )
      expect(Math.abs(appliedLeftCenterY - sourceLeftCenterY)).toBeLessThanOrEqual(
        TEMPLATE_ROUNDTRIP_RELATIVE_TOLERANCE
      )
      expect(Math.abs(appliedRightCenterY - sourceRightCenterY)).toBeLessThanOrEqual(
        TEMPLATE_ROUNDTRIP_RELATIVE_TOLERANCE
      )
      expect(Math.abs(appliedGap - sourceGap)).toBeLessThanOrEqual(TEMPLATE_ROUNDTRIP_RELATIVE_TOLERANCE)
      expect(appliedLeft.boundsLeft).toBeGreaterThanOrEqual(appliedMontageBounds.left - TEMPLATE_BOUNDS_TOLERANCE)
      expect(appliedRight.boundsRight).toBeLessThanOrEqual(appliedMontageBounds.right + TEMPLATE_BOUNDS_TOLERANCE)
      expect(appliedLeft.boundsTop).toBeGreaterThanOrEqual(appliedMontageBounds.top - TEMPLATE_BOUNDS_TOLERANCE)
      expect(appliedRight.boundsBottom).toBeLessThanOrEqual(appliedMontageBounds.bottom + TEMPLATE_BOUNDS_TOLERANCE)
    })
  })

  test('один объект и несколько объектов после сохранения в шаблон появляются там, где их сохранили', async({
    canvas,
    editorModel,
    shapes,
    template
  }) => {
    await test.step('Подготовить шаблон из одной фигуры и применить его обратно', async() => {
      await canvas.setMontageResolution(TEMPLATE_ROUNDTRIP_BASE_RESOLUTION)
      shapes.checkCreation({
        shape: await shapes.addAtBounds({
          presetKey: 'square',
          options: TEMPLATE_ROUNDTRIP_LEFT_SHAPE
        }),
        presetKey: 'square'
      })
      await shapes.select({ id: TEMPLATE_ROUNDTRIP_LEFT_SHAPE.id })
    })

    const singleTemplate = await test.step('Сериализовать одну фигуру', () => {
      return template.serializeSelection()
    })

    const sourceSingle = await test.step('Получить исходное положение фигуры до roundtrip', () => {
      return editorModel.getObjectSnapshot({ id: TEMPLATE_ROUNDTRIP_LEFT_SHAPE.id })
    })

    const singleApplied = await test.step('Очистить canvas, применить шаблон из одной фигуры и получить результат', async() => {
      expect(singleTemplate).not.toBeNull()
      await canvas.clearCanvas()

      const insertedCount = await template.applyTemplate({
        template: singleTemplate!
      })

      expect(insertedCount).toBe(1)

      return editorModel.getObjectSnapshot({ objectIndex: 0 })
    })

    await test.step('Подготовить шаблон из двух фигур и применить его обратно', async() => {
      await canvas.clearCanvas()
      shapes.checkCreation({
        shape: await shapes.addAtBounds({
          presetKey: 'square',
          options: TEMPLATE_ROUNDTRIP_LEFT_SHAPE
        }),
        presetKey: 'square'
      })
      shapes.checkCreation({
        shape: await shapes.addAtBounds({
          presetKey: 'square',
          options: TEMPLATE_ROUNDTRIP_RIGHT_SHAPE
        }),
        presetKey: 'square'
      })
      await editorModel.selectAllObjects()
    })

    const multiTemplate = await test.step('Сериализовать две фигуры', () => {
      return template.serializeSelection()
    })

    await test.step('Очистить canvas и применить шаблон из двух фигур', async() => {
      expect(multiTemplate).not.toBeNull()
      await canvas.clearCanvas()

      const insertedCount = await template.applyTemplate({
        template: multiTemplate!
      })

      expect(insertedCount).toBe(2)
    })

    await test.step('Проверить что общая для обоих сценариев фигура появилась в той же точке', async() => {
      const multiApplied = await editorModel.getObjectSnapshot({ objectIndex: 0 })

      expect(Math.abs(singleApplied.boundsLeft - sourceSingle.boundsLeft)).toBeLessThanOrEqual(
        TEMPLATE_ROUNDTRIP_POSITION_TOLERANCE
      )
      expect(Math.abs(singleApplied.boundsTop - sourceSingle.boundsTop)).toBeLessThanOrEqual(
        TEMPLATE_ROUNDTRIP_POSITION_TOLERANCE
      )
      expect(Math.abs(multiApplied.boundsLeft - sourceSingle.boundsLeft)).toBeLessThanOrEqual(
        TEMPLATE_ROUNDTRIP_POSITION_TOLERANCE
      )
      expect(Math.abs(multiApplied.boundsTop - sourceSingle.boundsTop)).toBeLessThanOrEqual(
        TEMPLATE_ROUNDTRIP_POSITION_TOLERANCE
      )
      expect(Math.abs(multiApplied.boundsLeft - singleApplied.boundsLeft)).toBeLessThanOrEqual(
        TEMPLATE_ROUNDTRIP_POSITION_TOLERANCE
      )
      expect(Math.abs(multiApplied.boundsTop - singleApplied.boundsTop)).toBeLessThanOrEqual(
        TEMPLATE_ROUNDTRIP_POSITION_TOLERANCE
      )
    })
  })

  test('фигура и текст после сохранения в один шаблон сохраняют взаимное расположение', async({
    canvas,
    editorModel,
    shapes,
    template,
    text
  }) => {
    await test.step('Подготовить фигуру и standalone текст для общего выделения', async() => {
      await canvas.setMontageResolution(TEMPLATE_ROUNDTRIP_BASE_RESOLUTION)
      shapes.checkCreation({
        shape: await shapes.addAtBounds({
          presetKey: 'square',
          options: TEMPLATE_ROUNDTRIP_MIXED_SHAPE
        }),
        presetKey: 'square'
      })
      text.checkCreation({
        textObject: await text.add(TEMPLATE_ROUNDTRIP_MIXED_TEXT)
      })
    })

    const sourceMontageBounds = await test.step('Получить исходные границы монтажной области', () => {
      return editorModel.getMontageAreaBounds()
    })
    const sourceShape = await test.step('Получить исходное положение фигуры', () => {
      return editorModel.getObjectSnapshot({ id: TEMPLATE_ROUNDTRIP_MIXED_SHAPE.id })
    })
    const sourceText = await test.step('Получить исходное положение текста', () => {
      return editorModel.getObjectSnapshot({ id: TEMPLATE_ROUNDTRIP_MIXED_TEXT.id })
    })

    const serializedTemplate = await test.step('Выделить оба объекта и сохранить их в шаблон', async() => {
      await editorModel.selectAllObjects()

      return template.serializeSelection()
    })

    await test.step('Очистить canvas и применить смешанный шаблон заново', async() => {
      expect(serializedTemplate).not.toBeNull()
      await canvas.clearCanvas()

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(2)
    })

    await test.step('Проверить что фигура и текст сохранили взаимное расположение', async() => {
      const appliedMontageBounds = await editorModel.getMontageAreaBounds()
      const appliedShape = await editorModel.getObjectSnapshot({ objectIndex: 0 })
      const appliedText = await editorModel.getObjectSnapshot({ objectIndex: 1 })
      const appliedTextObject = text.checkCreation({
        textObject: await text.getObject({ objectIndex: 1 })
      })
      const sourceOffsetX = (sourceText.centerX - sourceShape.centerX) / sourceMontageBounds.width
      const sourceOffsetY = (sourceText.centerY - sourceShape.centerY) / sourceMontageBounds.height
      const appliedOffsetX = (appliedText.centerX - appliedShape.centerX) / appliedMontageBounds.width
      const appliedOffsetY = (appliedText.centerY - appliedShape.centerY) / appliedMontageBounds.height

      expect(appliedTextObject.text).toBe(TEMPLATE_ROUNDTRIP_MIXED_TEXT.text)
      expect(Math.abs(appliedOffsetX - sourceOffsetX)).toBeLessThanOrEqual(TEMPLATE_ROUNDTRIP_RELATIVE_TOLERANCE)
      expect(Math.abs(appliedOffsetY - sourceOffsetY)).toBeLessThanOrEqual(TEMPLATE_ROUNDTRIP_RELATIVE_TOLERANCE)
      expect(appliedShape.boundsLeft).toBeGreaterThanOrEqual(appliedMontageBounds.left - TEMPLATE_BOUNDS_TOLERANCE)
      expect(appliedText.boundsRight).toBeLessThanOrEqual(appliedMontageBounds.right + TEMPLATE_BOUNDS_TOLERANCE)
    })
  })
})

test.describe('Шаблон после undo, redo и ресайза', () => {
  test('после undo и redo готовый шаблон возвращается на те же места', async({
    background,
    canvas,
    editorModel,
    history,
    template
  }) => {
    await test.step('Применить готовый шаблон на исходном размере монтажной области', async() => {
      await canvas.setMontageResolution(PRODUCT_CARD_TEMPLATE_BASE_RESOLUTION)

      const insertedCount = await template.applyTemplate({
        template: PRODUCT_CARD_TEMPLATE
      })

      expect(insertedCount).toBe(PRODUCT_CARD_TEMPLATE_OBJECT_COUNT)
      await history.flushPendingSave()
    })

    const initialCard = await test.step('Получить исходное положение карточки', () => {
      return editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.card })
    })
    const initialTitle = await test.step('Получить исходное положение заголовка', () => {
      return editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.title })
    })
    const initialFeature = await test.step('Получить исходное положение нижнего блока', () => {
      return editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.featureCenter })
    })

    await test.step('Сделать undo и убедиться что контент шаблона исчез', async() => {
      await history.undo()
      await editorModel.checkObjectCount({ count: 0 })
    })

    await test.step('Сделать redo и получить восстановленные объекты', async() => {
      await history.redo()
      await editorModel.checkObjectCount({ count: PRODUCT_CARD_TEMPLATE_OBJECT_COUNT })
    })

    await test.step('Проверить что после redo шаблон вернулся на те же места', async() => {
      const currentCard = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.card })
      const currentTitle = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.title })
      const currentFeature = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.featureCenter })
      const backgroundObject = await background.getObject()

      expect(backgroundObject?.fill).toBe(PRODUCT_CARD_TEMPLATE_BACKGROUND_COLOR)
      expect(Math.abs(currentCard.boundsLeft - initialCard.boundsLeft)).toBeLessThanOrEqual(TEMPLATE_BOUNDS_TOLERANCE)
      expect(Math.abs(currentCard.boundsTop - initialCard.boundsTop)).toBeLessThanOrEqual(TEMPLATE_BOUNDS_TOLERANCE)
      expect(Math.abs(currentTitle.boundsLeft - initialTitle.boundsLeft)).toBeLessThanOrEqual(TEMPLATE_BOUNDS_TOLERANCE)
      expect(Math.abs(currentTitle.boundsTop - initialTitle.boundsTop)).toBeLessThanOrEqual(TEMPLATE_BOUNDS_TOLERANCE)
      expect(Math.abs(currentFeature.boundsLeft - initialFeature.boundsLeft)).toBeLessThanOrEqual(
        TEMPLATE_BOUNDS_TOLERANCE
      )
      expect(Math.abs(currentFeature.boundsTop - initialFeature.boundsTop)).toBeLessThanOrEqual(
        TEMPLATE_BOUNDS_TOLERANCE
      )
    })
  })

  test('после нескольких ресайзов окна объекты из шаблона не накапливают смещение', async({
    canvas,
    editorModel,
    template
  }) => {
    await test.step('Применить готовый шаблон карточки', async() => {
      await canvas.setMontageResolution(PRODUCT_CARD_TEMPLATE_BASE_RESOLUTION)

      const insertedCount = await template.applyTemplate({
        template: PRODUCT_CARD_TEMPLATE
      })

      expect(insertedCount).toBe(PRODUCT_CARD_TEMPLATE_OBJECT_COUNT)
    })

    const initialTitle = await test.step('Получить исходное положение заголовка', () => {
      return editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.title })
    })
    const initialFeature = await test.step('Получить исходное положение левого нижнего блока', () => {
      return editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.featureLeft })
    })

    await test.step('Последовательно сузить и снова расширить окно браузера', async() => {
      await editorModel.resizeViewport(BROWSER_RESIZE_NARROW_VIEWPORT)
      await editorModel.resizeViewport(BROWSER_RESIZE_WIDE_VIEWPORT)
      await editorModel.resizeViewport(BROWSER_RESIZE_NARROW_VIEWPORT)
    })

    await test.step('Проверить что объекты не накопили смещение', async() => {
      const montageBounds = await editorModel.getMontageAreaBounds()
      const currentTitle = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.title })
      const currentFeature = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.featureLeft })

      expect(Math.abs(currentTitle.boundsLeft - initialTitle.boundsLeft)).toBeLessThanOrEqual(TEMPLATE_BOUNDS_TOLERANCE)
      expect(Math.abs(currentTitle.boundsTop - initialTitle.boundsTop)).toBeLessThanOrEqual(TEMPLATE_BOUNDS_TOLERANCE)
      expect(Math.abs(currentFeature.boundsLeft - initialFeature.boundsLeft)).toBeLessThanOrEqual(
        TEMPLATE_BOUNDS_TOLERANCE
      )
      expect(Math.abs(currentFeature.boundsTop - initialFeature.boundsTop)).toBeLessThanOrEqual(
        TEMPLATE_BOUNDS_TOLERANCE
      )
      expect(currentTitle.boundsLeft).toBeGreaterThanOrEqual(montageBounds.left - TEMPLATE_BOUNDS_TOLERANCE)
      expect(currentFeature.boundsBottom).toBeLessThanOrEqual(montageBounds.bottom + TEMPLATE_BOUNDS_TOLERANCE)
    })
  })

  test('после изменения resolution объекты из шаблона сохраняют свои места на canvas', async({
    canvas,
    editorModel,
    template
  }) => {
    await test.step('Применить готовый шаблон на исходном размере', async() => {
      await canvas.setMontageResolution(PRODUCT_CARD_TEMPLATE_BASE_RESOLUTION)

      const insertedCount = await template.applyTemplate({
        template: PRODUCT_CARD_TEMPLATE
      })

      expect(insertedCount).toBe(PRODUCT_CARD_TEMPLATE_OBJECT_COUNT)
    })

    const initialCard = await test.step('Получить исходное положение карточки', () => {
      return editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.card })
    })
    const initialTitle = await test.step('Получить исходное положение заголовка', () => {
      return editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.title })
    })
    const initialFeature = await test.step('Получить исходное положение правого нижнего блока', () => {
      return editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.featureRight })
    })

    await test.step('Изменить размер монтажной области после применения шаблона', async() => {
      await canvas.setMontageResolution(PRODUCT_CARD_TEMPLATE_EXPANDED_RESOLUTION)
    })

    await test.step('Проверить что template-объекты сохранили свои scene-позиции', async() => {
      const currentCard = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.card })
      const currentTitle = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.title })
      const currentFeature = await editorModel.getObjectSnapshot({ objectIndex: PRODUCT_CARD_TEMPLATE_INDEXES.featureRight })

      expect(Math.abs(currentCard.boundsLeft - initialCard.boundsLeft)).toBeLessThanOrEqual(TEMPLATE_BOUNDS_TOLERANCE)
      expect(Math.abs(currentCard.boundsTop - initialCard.boundsTop)).toBeLessThanOrEqual(TEMPLATE_BOUNDS_TOLERANCE)
      expect(Math.abs(currentTitle.boundsLeft - initialTitle.boundsLeft)).toBeLessThanOrEqual(
        TEMPLATE_BOUNDS_TOLERANCE
      )
      expect(Math.abs(currentTitle.boundsTop - initialTitle.boundsTop)).toBeLessThanOrEqual(
        TEMPLATE_BOUNDS_TOLERANCE
      )
      expect(Math.abs(currentFeature.boundsLeft - initialFeature.boundsLeft)).toBeLessThanOrEqual(
        TEMPLATE_BOUNDS_TOLERANCE
      )
      expect(Math.abs(currentFeature.boundsTop - initialFeature.boundsTop)).toBeLessThanOrEqual(
        TEMPLATE_BOUNDS_TOLERANCE
      )
      expect(Math.abs(currentCard.centerX - initialCard.centerX)).toBeLessThanOrEqual(TEMPLATE_BOUNDS_TOLERANCE)
      expect(Math.abs(currentTitle.centerX - initialTitle.centerX)).toBeLessThanOrEqual(TEMPLATE_BOUNDS_TOLERANCE)
      expect(Math.abs(currentFeature.centerX - initialFeature.centerX)).toBeLessThanOrEqual(
        TEMPLATE_BOUNDS_TOLERANCE
      )
    })
  })
})
