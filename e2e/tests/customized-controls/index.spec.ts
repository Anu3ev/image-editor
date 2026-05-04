import { test, expect } from '../../fixtures/editor.fixture'
import {
  ACTIVE_SELECTION_MINIMUM_SIZE,
  ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE,
  ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS,
  ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS,
  ACTIVE_SELECTION_FLIP_TEXT_LEFT_OPTIONS,
  ACTIVE_SELECTION_FLIP_TEXT_RIGHT_OPTIONS
} from '../../fixtures/data/customized-controls.data'

test.describe('Масштабирование общего выделения', () => {
  test.describe('Выделение с текстом', () => {
    test.beforeEach(async({ editorModel, text }) => {
      const leftText = await text.add(ACTIVE_SELECTION_FLIP_TEXT_LEFT_OPTIONS)
      const rightText = await text.add(ACTIVE_SELECTION_FLIP_TEXT_RIGHT_OPTIONS)

      text.checkCreation({ textObject: leftText })
      text.checkCreation({ textObject: rightText })

      await editorModel.selectAllObjects()
    })

    test('нельзя перевернуть при максимальном сжатии по горизонтали', async({
      editorModel,
      selection
    }) => {
      const liveSelection = await test.step('Сузить выделение справа до минимальной ширины', () => {
        return selection.shrinkHorizontallyFromRightToMinimum({
          minimumSize: ACTIVE_SELECTION_MINIMUM_SIZE
        })
      })
      const finalSelection = await test.step('Отпустить мышь и получить итоговое состояние выделения', () => {
        return selection.finishScale()
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

    test.describe('Непропорциональный скейлинг по диагонали', () => {
      test('нельзя перевернуть при максимальном сжатии', async({
        editorModel,
        selection
      }) => {
        const liveSelection = await test.step('Сузить выделение из правого нижнего угла до минимального размера', () => {
          return selection.shrinkDiagonallyFromBottomRightToMinimum({
            minimumSize: ACTIVE_SELECTION_MINIMUM_SIZE,
            shiftKey: true
          })
        })
        const finalSelection = await test.step('Отпустить мышь и получить итоговое состояние выделения', () => {
          return selection.finishScale()
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
  })

  test.describe('Выделение с шейпом', () => {
    test.beforeEach(async({ editorModel, shapes }) => {
      const leftShape = await shapes.addAtBounds({
        presetKey: 'square',
        options: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS
      })
      const rightShape = await shapes.addAtBounds({
        presetKey: 'square',
        options: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS
      })

      shapes.checkCreation({
        shape: leftShape,
        presetKey: 'square'
      })
      shapes.checkCreation({
        shape: rightShape,
        presetKey: 'square'
      })

      await editorModel.selectAllObjects()
    })

    test('при максимальном сжатии по горизонтали упирается в минимальную ширину шейпов и не переворачивает их', async({
      editorModel,
      selection,
      shapes
    }) => {
      const initialSelection = await test.step('Получить исходную ширину выделения', () => {
        return selection.getSnapshot()
      })
      const liveSelection = await test.step('Сузить выделение справа до минимальной ширины', () => {
        return selection.shrinkHorizontallyFromRightToMinimum({
          minimumSize: ACTIVE_SELECTION_MINIMUM_SIZE
        })
      })
      const finalSelection = await test.step('Отпустить мышь и получить итоговое состояние выделения', () => {
        return selection.finishScale()
      })
      const finalLeftShape = await test.step('Получить положение левого шейпа после максимального сжатия', () => {
        return shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS.id })
      })
      const finalRightShape = await test.step('Получить положение правого шейпа после максимального сжатия', () => {
        return shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS.id })
      })
      const finalLeftObject = await test.step('Получить состояние левого шейпа после максимального сжатия', () => {
        return editorModel.getObjectSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS.id })
      })
      const finalRightObject = await test.step('Получить состояние правого шейпа после максимального сжатия', () => {
        return editorModel.getObjectSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS.id })
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

    test('при максимальном сжатии по вертикали упирается в минимальную высоту шейпов и не переворачивает их', async({
      editorModel,
      selection,
      shapes
    }) => {
      const initialSelection = await test.step('Получить исходную высоту выделения', () => {
        return selection.getSnapshot()
      })
      const liveSelection = await test.step('Сузить выделение снизу до минимальной высоты', () => {
        return selection.shrinkVerticallyFromBottomToMinimum({
          minimumSize: ACTIVE_SELECTION_MINIMUM_SIZE
        })
      })
      const liveLeftShape = await test.step('Получить положение левого шейпа во время максимального сжатия', () => {
        return shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS.id })
      })
      const liveRightShape = await test.step('Получить положение правого шейпа во время максимального сжатия', () => {
        return shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS.id })
      })
      const finalSelection = await test.step('Отпустить мышь и получить итоговое состояние выделения', () => {
        return selection.finishScale()
      })
      const finalLeftShape = await test.step('Получить положение левого шейпа после максимального сжатия', () => {
        return shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS.id })
      })
      const finalRightShape = await test.step('Получить положение правого шейпа после максимального сжатия', () => {
        return shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS.id })
      })
      const finalLeftObject = await test.step('Получить состояние левого шейпа после максимального сжатия', () => {
        return editorModel.getObjectSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS.id })
      })
      const finalRightObject = await test.step('Получить состояние правого шейпа после максимального сжатия', () => {
        return editorModel.getObjectSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS.id })
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

        shapes.checkNodeInsideGroup({
          snapshot: liveLeftShape,
          kind: 'text'
        })
        shapes.checkNodeInsideGroup({
          snapshot: liveRightShape,
          kind: 'text'
        })
        shapes.checkNodeInsideGroup({
          snapshot: finalLeftShape,
          kind: 'text'
        })
        shapes.checkNodeInsideGroup({
          snapshot: finalRightShape,
          kind: 'text'
        })
      })
    })

    test.describe('Непропорциональный скейлинг по диагонали', () => {
      test('при максимальном сжатии не переворачивает шейпы и оставляет текст внутри', async({
        editorModel,
        selection,
        shapes
      }) => {
        const initialSelection = await test.step('Получить исходный размер выделения', () => {
          return selection.getSnapshot()
        })
        const liveSelection = await test.step('Сузить выделение из правого нижнего угла до минимального размера', () => {
          return selection.shrinkDiagonallyFromBottomRightToMinimum({
            minimumSize: ACTIVE_SELECTION_MINIMUM_SIZE,
            shiftKey: true
          })
        })
        const finalSelection = await test.step('Отпустить мышь и получить итоговое состояние выделения', () => {
          return selection.finishScale()
        })
        const finalLeftShape = await test.step('Получить положение левого шейпа после максимального сжатия', () => {
          return shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS.id })
        })
        const finalRightShape = await test.step('Получить положение правого шейпа после максимального сжатия', () => {
          return shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS.id })
        })
        const finalLeftObject = await test.step('Получить состояние левого шейпа после максимального сжатия', () => {
          return editorModel.getObjectSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS.id })
        })
        const finalRightObject = await test.step('Получить состояние правого шейпа после максимального сжатия', () => {
          return editorModel.getObjectSnapshot({ id: ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS.id })
        })

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
  })
})
