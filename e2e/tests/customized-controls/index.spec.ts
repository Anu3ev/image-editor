import { test, expect } from '../../fixtures/editor.fixture'
import {
  ACTIVE_SELECTION_MINIMUM_SIZE,
  ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE,
  ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS,
  ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS,
  ACTIVE_SELECTION_FLIP_TEXT_LEFT_OPTIONS,
  ACTIVE_SELECTION_FLIP_TEXT_RIGHT_OPTIONS
} from '../../fixtures/data/customized-controls.data'

test.describe('Сжатие общего выделения с текстом по горизонтали', () => {
  test.beforeEach(async({ editorModel, text }) => {
    const leftText = await text.add(ACTIVE_SELECTION_FLIP_TEXT_LEFT_OPTIONS)
    const rightText = await text.add(ACTIVE_SELECTION_FLIP_TEXT_RIGHT_OPTIONS)

    text.checkCreation({ textObject: leftText })
    text.checkCreation({ textObject: rightText })

    await editorModel.selectAllObjects()
  })

  test('нельзя перевернуть при максимальном сжатии', async({
    editorModel,
    selection
  }) => {
    const liveSelection = await test.step('Сузить выделение справа до минимальной ширины', () => {
      return selection.scaling.shrinkHorizontallyFromRightToMinimum({
        minimumSize: ACTIVE_SELECTION_MINIMUM_SIZE
      })
    })
    const finalSelection = await test.step('Отпустить мышь и получить итоговое состояние выделения', () => {
      return selection.scaling.finish()
    })
    const finalLeftText = await test.step('Получить положение левого текста после максимального сжатия', () => {
      return editorModel.getObjectSnapshot({ id: ACTIVE_SELECTION_FLIP_TEXT_LEFT_OPTIONS.id })
    })
    const finalRightText = await test.step('Получить положение правого текста после максимального сжатия', () => {
      return editorModel.getObjectSnapshot({ id: ACTIVE_SELECTION_FLIP_TEXT_RIGHT_OPTIONS.id })
    })

    await test.step('Проверить что выделение сжалось до минимума и тексты не перевернулись', () => {
      expect(liveSelection.flipX).toBe(false)
      expect(finalSelection.flipX).toBe(false)
      expect(liveSelection.boundsWidth).toBeGreaterThan(0)
      expect(finalSelection.boundsWidth).toBeGreaterThan(0)
      expect(liveSelection.boundsWidth)
        .toBeLessThanOrEqual(ACTIVE_SELECTION_MINIMUM_SIZE + ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(finalLeftText.flipX).toBe(false)
      expect(finalRightText.flipX).toBe(false)
      expect(finalLeftText.centerX).toBeLessThanOrEqual(finalRightText.centerX)
    })
  })
})

test.describe('Общее выделение с текстом: непропорциональный скейлинг по диагонали', () => {
  test.beforeEach(async({ editorModel, text }) => {
    const leftText = await text.add(ACTIVE_SELECTION_FLIP_TEXT_LEFT_OPTIONS)
    const rightText = await text.add(ACTIVE_SELECTION_FLIP_TEXT_RIGHT_OPTIONS)

    text.checkCreation({ textObject: leftText })
    text.checkCreation({ textObject: rightText })

    await editorModel.selectAllObjects()
  })

  test('нельзя перевернуть при максимальном сжатии', async({
    editorModel,
    selection
  }) => {
    const liveSelection = await test.step('Сузить выделение из правого нижнего угла до минимального размера', () => {
      return selection.scaling.shrinkDiagonallyFromBottomRightToMinimum({
        minimumSize: ACTIVE_SELECTION_MINIMUM_SIZE,
        shiftKey: true
      })
    })
    const finalSelection = await test.step('Отпустить мышь и получить итоговое состояние выделения', () => {
      return selection.scaling.finish()
    })
    const finalLeftText = await test.step('Получить положение левого текста после максимального сжатия', () => {
      return editorModel.getObjectSnapshot({ id: ACTIVE_SELECTION_FLIP_TEXT_LEFT_OPTIONS.id })
    })
    const finalRightText = await test.step('Получить положение правого текста после максимального сжатия', () => {
      return editorModel.getObjectSnapshot({ id: ACTIVE_SELECTION_FLIP_TEXT_RIGHT_OPTIONS.id })
    })

    await test.step('Проверить что выделение сжалось до минимума и тексты не перевернулись', () => {
      expect(liveSelection.flipX).toBe(false)
      expect(liveSelection.flipY).toBe(false)
      expect(finalSelection.flipX).toBe(false)
      expect(finalSelection.flipY).toBe(false)
      expect(liveSelection.boundsWidth).toBeGreaterThan(0)
      expect(liveSelection.boundsHeight).toBeGreaterThan(0)
      expect(finalSelection.boundsWidth).toBeGreaterThan(0)
      expect(finalSelection.boundsHeight).toBeGreaterThan(0)
      expect(liveSelection.boundsWidth)
        .toBeLessThanOrEqual(ACTIVE_SELECTION_MINIMUM_SIZE + ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(liveSelection.boundsHeight)
        .toBeLessThanOrEqual(ACTIVE_SELECTION_MINIMUM_SIZE + ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(finalLeftText.flipX).toBe(false)
      expect(finalLeftText.flipY).toBe(false)
      expect(finalRightText.flipX).toBe(false)
      expect(finalRightText.flipY).toBe(false)
      expect(finalLeftText.centerX).toBeLessThanOrEqual(finalRightText.centerX)
    })
  })
})

test.describe('Сжатие общего выделения с шейпами по горизонтали', () => {
  test.beforeEach(async({ editorModel, shapes }) => {
    const leftShape = await shapes.addAtBounds({ presetKey: 'square', options: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS })
    const rightShape = await shapes.addAtBounds({ presetKey: 'square', options: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS })

    shapes.checkCreation({ shape: leftShape, presetKey: 'square' })
    shapes.checkCreation({ shape: rightShape, presetKey: 'square' })

    await editorModel.selectAllObjects()
  })

  test('при максимальном сжатии упирается в минимальную ширину шейпов и не переворачивает их', async({
    editorModel,
    selection,
    shapes
  }) => {
    const initialSelection = await test.step('Получить исходную ширину выделения', () => {
      return selection.scaling.getSnapshot()
    })
    const liveSelection = await test.step('Сузить выделение справа до минимальной ширины', () => {
      return selection.scaling.shrinkHorizontallyFromRightToMinimum({
        minimumSize: ACTIVE_SELECTION_MINIMUM_SIZE
      })
    })
    const finalSelection = await test.step('Отпустить мышь и получить итоговое состояние выделения', () => {
      return selection.scaling.finish()
    })
    // eslint-disable-next-line max-len
    const [finalLeftShape, finalRightShape, finalLeftObject, finalRightObject] = await test.step('Получить итоговое состояние шейпов', () => {
      return Promise.all([
        shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS.id }),
        shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS.id }),
        editorModel.getObjectSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS.id }),
        editorModel.getObjectSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS.id })
      ])
    })

    await test.step('Проверить что выделение сжалось до минимума и шейпы не перевернулись', () => {
      expect(liveSelection.flipX).toBe(false)
      expect(finalSelection.flipX).toBe(false)
      expect(liveSelection.boundsWidth).toBeGreaterThan(0)
      expect(finalSelection.boundsWidth).toBeGreaterThan(0)
      expect(liveSelection.boundsWidth)
        .toBeLessThan(initialSelection.boundsWidth - ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(liveSelection.boundsWidth)
        .toBeGreaterThan(ACTIVE_SELECTION_MINIMUM_SIZE + ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(finalSelection.boundsWidth)
        .toBeGreaterThan(ACTIVE_SELECTION_MINIMUM_SIZE + ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(Math.abs(finalSelection.boundsWidth - liveSelection.boundsWidth))
        .toBeLessThanOrEqual(ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(finalLeftObject.flipX).toBe(false)
      expect(finalRightObject.flipX).toBe(false)
      expect(finalLeftShape.groupBoundsLeft).toBeLessThanOrEqual(finalRightShape.groupBoundsLeft)
    })
  })
})

test.describe('Сжатие общего выделения с шейпами по вертикали', () => {
  test.beforeEach(async({ editorModel, shapes }) => {
    const leftShape = await shapes.addAtBounds({ presetKey: 'square', options: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS })
    const rightShape = await shapes.addAtBounds({ presetKey: 'square', options: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS })

    shapes.checkCreation({ shape: leftShape, presetKey: 'square' })
    shapes.checkCreation({ shape: rightShape, presetKey: 'square' })

    await editorModel.selectAllObjects()
  })

  test('при максимальном сжатии упирается в минимальную высоту шейпов и не переворачивает их', async({
    editorModel,
    selection,
    shapes
  }) => {
    const initialSelection = await selection.scaling.getSnapshot()
    const liveSelection = await test.step('Сузить выделение снизу до минимальной высоты', () => {
      return selection.scaling.shrinkVerticallyFromBottomToMinimum({
        minimumSize: ACTIVE_SELECTION_MINIMUM_SIZE
      })
    })
    const [liveLeftShape, liveRightShape] = await test.step('Получить положение шейпов во время максимального сжатия', () => {
      return Promise.all([
        shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS.id }),
        shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS.id })
      ])
    })
    const finalSelection = await test.step('Отпустить мышь и получить итоговое состояние выделения', () => {
      return selection.scaling.finish()
    })
    // eslint-disable-next-line max-len
    const [finalLeftShape, finalRightShape, finalLeftObject, finalRightObject] = await test.step('Получить итоговое состояние шейпов', () => {
      return Promise.all([
        shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS.id }),
        shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS.id }),
        editorModel.getObjectSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS.id }),
        editorModel.getObjectSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS.id })
      ])
    })

    await test.step('Проверить что выделение сжалось до минимума, шейпы не перевернулись, а текст остался внутри', () => {
      expect(liveSelection.flipY).toBe(false)
      expect(finalSelection.flipY).toBe(false)
      expect(liveSelection.boundsHeight).toBeGreaterThan(0)
      expect(finalSelection.boundsHeight).toBeGreaterThan(0)
      expect(liveSelection.boundsHeight)
        .toBeLessThan(initialSelection.boundsHeight - ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(liveSelection.boundsHeight)
        .toBeGreaterThan(ACTIVE_SELECTION_MINIMUM_SIZE + ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(finalSelection.boundsHeight)
        .toBeGreaterThan(ACTIVE_SELECTION_MINIMUM_SIZE + ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(Math.abs(finalSelection.boundsHeight - liveSelection.boundsHeight))
        .toBeLessThanOrEqual(ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(finalLeftObject.flipY).toBe(false)
      expect(finalRightObject.flipY).toBe(false)
      expect(finalLeftShape.groupBoundsHeight).toBeGreaterThan(0)
      expect(finalRightShape.groupBoundsHeight).toBeGreaterThan(0)

      for (const snapshot of [liveLeftShape, liveRightShape, finalLeftShape, finalRightShape]) {
        shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
      }
    })
  })
})

test.describe('Общее выделение с шейпами: непропорциональный скейлинг по диагонали', () => {
  test.beforeEach(async({ editorModel, shapes }) => {
    const leftShape = await shapes.addAtBounds({ presetKey: 'square', options: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS })
    const rightShape = await shapes.addAtBounds({ presetKey: 'square', options: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS })

    shapes.checkCreation({ shape: leftShape, presetKey: 'square' })
    shapes.checkCreation({ shape: rightShape, presetKey: 'square' })

    await editorModel.selectAllObjects()
  })

  test('при максимальном сжатии не переворачивает шейпы и оставляет текст внутри', async({
    editorModel,
    selection,
    shapes
  }) => {
    const initialSelection = await selection.scaling.getSnapshot()
    const liveSelection = await test.step('Сузить выделение из правого нижнего угла до минимального размера', () => {
      return selection.scaling.shrinkDiagonallyFromBottomRightToMinimum({
        minimumSize: ACTIVE_SELECTION_MINIMUM_SIZE,
        shiftKey: true
      })
    })
    const finalSelection = await selection.scaling.finish()
    const [finalLeftShape, finalRightShape, finalLeftObject, finalRightObject] = await Promise.all([
      shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS.id }),
      shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS.id }),
      editorModel.getObjectSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS.id }),
      editorModel.getObjectSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS.id })
    ])

    await test.step('Проверить что выделение сжалось до минимума и шейпы не перевернулись', () => {
      expect(liveSelection.flipX).toBe(false)
      expect(liveSelection.flipY).toBe(false)
      expect(finalSelection.flipX).toBe(false)
      expect(finalSelection.flipY).toBe(false)
      expect(liveSelection.boundsWidth).toBeGreaterThan(0)
      expect(liveSelection.boundsHeight).toBeGreaterThan(0)
      expect(finalSelection.boundsWidth).toBeGreaterThan(0)
      expect(finalSelection.boundsHeight).toBeGreaterThan(0)
      expect(liveSelection.boundsWidth)
        .toBeLessThan(initialSelection.boundsWidth - ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(liveSelection.boundsWidth)
        .toBeGreaterThan(ACTIVE_SELECTION_MINIMUM_SIZE + ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(liveSelection.boundsHeight)
        .toBeGreaterThan(ACTIVE_SELECTION_MINIMUM_SIZE + ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(finalSelection.boundsWidth)
        .toBeGreaterThan(ACTIVE_SELECTION_MINIMUM_SIZE + ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(finalSelection.boundsHeight)
        .toBeGreaterThan(ACTIVE_SELECTION_MINIMUM_SIZE + ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(Math.abs(finalSelection.boundsWidth - liveSelection.boundsWidth))
        .toBeLessThanOrEqual(ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(Math.abs(finalSelection.boundsHeight - liveSelection.boundsHeight))
        .toBeLessThanOrEqual(ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE)
      expect(finalLeftObject.flipX).toBe(false)
      expect(finalLeftObject.flipY).toBe(false)
      expect(finalRightObject.flipX).toBe(false)
      expect(finalRightObject.flipY).toBe(false)
      expect(finalLeftShape.groupBoundsLeft).toBeLessThanOrEqual(finalRightShape.groupBoundsLeft)
      expect(finalLeftShape.groupBoundsHeight).toBeGreaterThan(0)
      expect(finalRightShape.groupBoundsHeight).toBeGreaterThan(0)
    })
  })
})
