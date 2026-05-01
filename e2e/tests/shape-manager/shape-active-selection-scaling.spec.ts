import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_MULTI_SCALING_EDITED_TEXT,
  SHAPE_MULTI_SCALING_EXPAND_SCALE_X,
  SHAPE_MULTI_SCALING_EXPAND_SCALE_Y,
  SHAPE_MULTI_SCALING_LEFT_OPTIONS,
  SHAPE_MULTI_SCALING_RIGHT_OPTIONS,
  SHAPE_MULTI_SCALING_SCALE_X,
  SHAPE_MULTI_SCALING_SCALE_Y,
  SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS,
  SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS,
  SHAPE_MULTI_SCALING_TOLERANCE
} from '../../fixtures/data/shape-multi-scaling.data'

const SHAPE_MULTI_SCALING_MINIMUM_TARGET_SIZE = 1
const SHAPE_MULTI_SCALING_BEYOND_MINIMUM_DRAG_DELTA = -120
const SHAPE_MULTI_SCALING_BEYOND_TOP_MINIMUM_DRAG_DELTA = 120

test.describe('Изменение размера нескольких шейпов', () => {
  test.beforeEach(async({ editorModel, shapes }) => {
    const leftShape = await shapes.addAtBounds({
      presetKey: 'square',
      options: SHAPE_MULTI_SCALING_LEFT_OPTIONS
    })
    const rightShape = await shapes.addAtBounds({
      presetKey: 'square',
      options: SHAPE_MULTI_SCALING_RIGHT_OPTIONS
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

  test('при сужении нескольких шейпов справа текст в них переносится уже во время drag', async({
    selection,
    shapes
  }) => {
    const initialSelectionSnapshot = await test.step('Получить исходную ширину общего выделения', () => {
      return selection.getSnapshot()
    })
    const initialLeftText = await test.step('Получить исходное состояние текста в левом шейпе', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const initialRightText = await test.step('Получить исходное состояние текста в правом шейпе', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    const liveSelectionSnapshot = await test.step('Сузить общее выделение справа во время drag', () => {
      return selection.scaleHorizontallyFromRight({
        scaleX: SHAPE_MULTI_SCALING_SCALE_X
      })
    })
    const liveLeftText = await test.step('Получить текст в левом шейпе во время drag', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const liveRightText = await test.step('Получить текст в правом шейпе во время drag', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })
    const liveLeftShape = await test.step('Получить состояние левого шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const liveRightShape = await test.step('Получить состояние правого шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    await test.step('Проверить что текст уже переносится во время drag и не выходит за границы своих шейпов', () => {
      expect(initialLeftText, 'текст в левом шейпе должен существовать').not.toBeNull()
      expect(initialRightText, 'текст в правом шейпе должен существовать').not.toBeNull()
      expect(liveLeftText, 'текст в левом шейпе во время drag должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в правом шейпе во время drag должен существовать').not.toBeNull()

      if (!initialLeftText || !initialRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать до и во время drag')
      }

      expect(liveSelectionSnapshot.boundsWidth)
        .toBeLessThan(initialSelectionSnapshot.boundsWidth - SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(initialLeftText.lineCount).toBe(1)
      expect(initialRightText.lineCount).toBe(1)
      expect(liveLeftText.lineCount).toBeGreaterThan(initialLeftText.lineCount)
      expect(liveRightText.lineCount).toBeGreaterThan(initialRightText.lineCount)
      expect(liveLeftText.fontSize).toBe(initialLeftText.fontSize)
      expect(liveRightText.fontSize).toBe(initialRightText.fontSize)

      shapes.checkNodeInsideGroup({
        snapshot: liveLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: liveRightShape,
        kind: 'text'
      })
    })
  })

  test('после сужения нескольких шейпов справа их размер не дёргается после отпускания мыши', async({
    selection,
    shapes
  }) => {
    const liveSelectionSnapshot = await test.step('Сузить общее выделение справа во время drag', () => {
      return selection.scaleHorizontallyFromRight({
        scaleX: SHAPE_MULTI_SCALING_SCALE_X
      })
    })
    const liveLeftShape = await test.step('Получить состояние левого шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const liveRightShape = await test.step('Получить состояние правого шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })
    const liveLeftText = await test.step('Получить текст в левом шейпе во время drag', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const liveRightText = await test.step('Получить текст в правом шейпе во время drag', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    const finalSelectionSnapshot = await test.step('Отпустить мышь и получить итоговую ширину общего выделения', () => {
      return selection.finishScale()
    })
    const finalLeftShape = await test.step('Получить итоговое состояние левого шейпа', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const finalRightShape = await test.step('Получить итоговое состояние правого шейпа', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })
    const finalLeftText = await test.step('Получить итоговый текст в левом шейпе', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const finalRightText = await test.step('Получить итоговый текст в правом шейпе', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    await test.step('Проверить что после mouseup ширина не дёрнулась и переносы строк сохранились', () => {
      expect(liveLeftText, 'текст в левом шейпе во время drag должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в правом шейпе во время drag должен существовать').not.toBeNull()
      expect(finalLeftText, 'итоговый текст в левом шейпе должен существовать').not.toBeNull()
      expect(finalRightText, 'итоговый текст в правом шейпе должен существовать').not.toBeNull()

      if (!liveLeftText || !liveRightText || !finalLeftText || !finalRightText) {
        throw new Error('текст в обоих шейпах должен существовать до и после mouseup')
      }

      const selectionWidthJump = Math.abs(finalSelectionSnapshot.boundsWidth - liveSelectionSnapshot.boundsWidth)
      const leftWidthJump = Math.abs(finalLeftShape.groupBoundsWidth - liveLeftShape.groupBoundsWidth)
      const rightWidthJump = Math.abs(finalRightShape.groupBoundsWidth - liveRightShape.groupBoundsWidth)

      expect(selectionWidthJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(leftWidthJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(rightWidthJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(finalLeftText.lineCount).toBe(liveLeftText.lineCount)
      expect(finalRightText.lineCount).toBe(liveRightText.lineCount)
      expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
      expect(finalRightText.fontSize).toBe(liveRightText.fontSize)

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

  test('после сужения и обратного расширения нескольких шейпов высота не дёргается после mouseup', async({
    editorModel,
    selection,
    shapes
  }) => {
    await test.step('Сузить несколько шейпов справа и завершить изменение размера', async() => {
      await selection.scaleHorizontallyFromRight({
        scaleX: SHAPE_MULTI_SCALING_SCALE_X
      })
      await selection.finishScale()
    })

    await test.step('Заново выделить оба шейпа перед обратным расширением', async() => {
      await editorModel.selectAllObjects()
    })

    const narrowedSelectionSnapshot = await test.step('Получить ширину выделения после сужения', () => {
      return selection.getSnapshot()
    })
    const narrowedLeftText = await test.step('Получить текст в левом шейпе после сужения', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const narrowedRightText = await test.step('Получить текст в правом шейпе после сужения', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    const liveSelectionSnapshot = await test.step('Расширить общее выделение справа во время drag', () => {
      return selection.scaleHorizontallyFromRight({
        scaleX: SHAPE_MULTI_SCALING_EXPAND_SCALE_X
      })
    })
    const liveLeftShape = await test.step('Получить состояние левого шейпа во время обратного расширения', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const liveRightShape = await test.step('Получить состояние правого шейпа во время обратного расширения', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })
    const liveLeftText = await test.step('Получить текст в левом шейпе во время обратного расширения', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const liveRightText = await test.step('Получить текст в правом шейпе во время обратного расширения', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    await test.step('Проверить что во время обратного расширения текст вернулся в одну строку и остался внутри шейпов', () => {
      expect(narrowedLeftText, 'текст в левом шейпе после сужения должен существовать').not.toBeNull()
      expect(narrowedRightText, 'текст в правом шейпе после сужения должен существовать').not.toBeNull()
      expect(liveLeftText, 'текст в левом шейпе во время обратного расширения должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в правом шейпе во время обратного расширения должен существовать').not.toBeNull()

      if (!narrowedLeftText || !narrowedRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать после сужения и во время обратного расширения')
      }

      expect(liveSelectionSnapshot.boundsWidth)
        .toBeGreaterThan(narrowedSelectionSnapshot.boundsWidth + SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(narrowedLeftText.lineCount).toBeGreaterThan(1)
      expect(narrowedRightText.lineCount).toBeGreaterThan(1)
      expect(liveLeftText.lineCount).toBe(1)
      expect(liveRightText.lineCount).toBe(1)
      expect(liveLeftText.fontSize).toBe(narrowedLeftText.fontSize)
      expect(liveRightText.fontSize).toBe(narrowedRightText.fontSize)

      shapes.checkNodeInsideGroup({
        snapshot: liveLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: liveRightShape,
        kind: 'text'
      })
    })

    const finalSelectionSnapshot = await test.step('Отпустить мышь и получить итоговое состояние общего выделения', async() => {
      return selection.finishScale()
    })
    const finalLeftShape = await test.step('Получить итоговое состояние левого шейпа после обратного расширения', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const finalRightShape = await test.step('Получить итоговое состояние правого шейпа после обратного расширения', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })
    const finalLeftText = await test.step('Получить итоговый текст в левом шейпе после обратного расширения', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const finalRightText = await test.step('Получить итоговый текст в правом шейпе после обратного расширения', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    await test.step('Проверить что после mouseup размер не дёрнулся и переносы строк сохранились', () => {
      expect(finalLeftText, 'итоговый текст в левом шейпе должен существовать').not.toBeNull()
      expect(finalRightText, 'итоговый текст в правом шейпе должен существовать').not.toBeNull()

      if (!finalLeftText || !finalRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать до и после mouseup')
      }

      const selectionWidthJump = Math.abs(finalSelectionSnapshot.boundsWidth - liveSelectionSnapshot.boundsWidth)
      const leftWidthJump = Math.abs(finalLeftShape.groupBoundsWidth - liveLeftShape.groupBoundsWidth)
      const rightWidthJump = Math.abs(finalRightShape.groupBoundsWidth - liveRightShape.groupBoundsWidth)
      const leftHeightJump = Math.abs(finalLeftShape.groupBoundsHeight - liveLeftShape.groupBoundsHeight)
      const rightHeightJump = Math.abs(finalRightShape.groupBoundsHeight - liveRightShape.groupBoundsHeight)

      expect(selectionWidthJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(leftWidthJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(rightWidthJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(leftHeightJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(rightHeightJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(finalLeftText.lineCount).toBe(liveLeftText.lineCount)
      expect(finalRightText.lineCount).toBe(liveRightText.lineCount)
      expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
      expect(finalRightText.fontSize).toBe(liveRightText.fontSize)

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

  test('при уменьшении нескольких шейпов снизу их высота меняется без деформации текста и без рывка после mouseup', async({
    selection,
    shapes
  }) => {
    const initialSelectionSnapshot = await test.step('Получить исходную высоту общего выделения', () => {
      return selection.getSnapshot()
    })
    const initialLeftText = await test.step('Получить исходное состояние текста в левом шейпе', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const initialRightText = await test.step('Получить исходное состояние текста в правом шейпе', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    const liveSelectionSnapshot = await test.step('Уменьшить общее выделение снизу во время drag', () => {
      return selection.scaleVerticallyFromBottom({
        scaleY: SHAPE_MULTI_SCALING_SCALE_Y
      })
    })
    const liveLeftShape = await test.step('Получить состояние левого шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const liveRightShape = await test.step('Получить состояние правого шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })
    const liveLeftText = await test.step('Получить текст в левом шейпе во время drag', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const liveRightText = await test.step('Получить текст в правом шейпе во время drag', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    await test.step('Проверить что во время drag уменьшается только высота, а текст не деформируется', () => {
      expect(initialLeftText, 'текст в левом шейпе должен существовать').not.toBeNull()
      expect(initialRightText, 'текст в правом шейпе должен существовать').not.toBeNull()
      expect(liveLeftText, 'текст в левом шейпе во время drag должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в правом шейпе во время drag должен существовать').not.toBeNull()

      if (!initialLeftText || !initialRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать до и во время drag')
      }

      expect(liveSelectionSnapshot.boundsHeight)
        .toBeLessThan(initialSelectionSnapshot.boundsHeight - SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(liveSelectionSnapshot.boundsWidth - initialSelectionSnapshot.boundsWidth))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(liveLeftText.fontSize).toBe(initialLeftText.fontSize)
      expect(liveRightText.fontSize).toBe(initialRightText.fontSize)
      expect(liveLeftText.lineCount).toBe(initialLeftText.lineCount)
      expect(liveRightText.lineCount).toBe(initialRightText.lineCount)

      shapes.checkNodeInsideGroup({
        snapshot: liveLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: liveRightShape,
        kind: 'text'
      })
    })

    const finalSelectionSnapshot = await test.step('Отпустить мышь и получить итоговое состояние общего выделения', async() => {
      return selection.finishScale()
    })
    const finalLeftShape = await test.step('Получить итоговое состояние левого шейпа', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const finalRightShape = await test.step('Получить итоговое состояние правого шейпа', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })
    const finalLeftText = await test.step('Получить итоговый текст в левом шейпе', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const finalRightText = await test.step('Получить итоговый текст в правом шейпе', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    await test.step('Проверить что после mouseup высота не дёрнулась и текст остался тем же', () => {
      expect(finalLeftText, 'итоговый текст в левом шейпе должен существовать').not.toBeNull()
      expect(finalRightText, 'итоговый текст в правом шейпе должен существовать').not.toBeNull()

      if (!finalLeftText || !finalRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать до и после mouseup')
      }

      const selectionHeightJump = Math.abs(finalSelectionSnapshot.boundsHeight - liveSelectionSnapshot.boundsHeight)
      const leftHeightJump = Math.abs(finalLeftShape.groupBoundsHeight - liveLeftShape.groupBoundsHeight)
      const rightHeightJump = Math.abs(finalRightShape.groupBoundsHeight - liveRightShape.groupBoundsHeight)

      expect(selectionHeightJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(leftHeightJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(rightHeightJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
      expect(finalRightText.fontSize).toBe(liveRightText.fontSize)
      expect(finalLeftText.lineCount).toBe(liveLeftText.lineCount)
      expect(finalRightText.lineCount).toBe(liveRightText.lineCount)

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

  test('при уменьшении нескольких шейпов сверху их высота меняется без деформации текста и без рывка после mouseup', async({
    selection,
    shapes
  }) => {
    const initialSelectionSnapshot = await test.step('Получить исходную высоту общего выделения', () => {
      return selection.getSnapshot()
    })
    const initialLeftText = await test.step('Получить исходное состояние текста в левом шейпе', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const initialRightText = await test.step('Получить исходное состояние текста в правом шейпе', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    const liveSelectionSnapshot = await test.step('Уменьшить общее выделение сверху во время drag', () => {
      return selection.scaleVerticallyFromTop({
        scaleY: SHAPE_MULTI_SCALING_SCALE_Y
      })
    })
    const liveLeftShape = await test.step('Получить состояние левого шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const liveRightShape = await test.step('Получить состояние правого шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })
    const liveLeftText = await test.step('Получить текст в левом шейпе во время drag', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const liveRightText = await test.step('Получить текст в правом шейпе во время drag', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    await test.step('Проверить что во время drag уменьшается только высота, а текст не деформируется', () => {
      expect(initialLeftText, 'текст в левом шейпе должен существовать').not.toBeNull()
      expect(initialRightText, 'текст в правом шейпе должен существовать').not.toBeNull()
      expect(liveLeftText, 'текст в левом шейпе во время drag должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в правом шейпе во время drag должен существовать').not.toBeNull()

      if (!initialLeftText || !initialRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать до и во время drag')
      }

      expect(liveSelectionSnapshot.boundsHeight)
        .toBeLessThan(initialSelectionSnapshot.boundsHeight - SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(liveSelectionSnapshot.boundsWidth - initialSelectionSnapshot.boundsWidth))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(liveLeftText.fontSize).toBe(initialLeftText.fontSize)
      expect(liveRightText.fontSize).toBe(initialRightText.fontSize)
      expect(liveLeftText.lineCount).toBe(initialLeftText.lineCount)
      expect(liveRightText.lineCount).toBe(initialRightText.lineCount)

      shapes.checkNodeInsideGroup({
        snapshot: liveLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: liveRightShape,
        kind: 'text'
      })
    })

    const finalSelectionSnapshot = await test.step('Отпустить мышь и получить итоговое состояние общего выделения', async() => {
      return selection.finishScale()
    })
    const finalLeftShape = await test.step('Получить итоговое состояние левого шейпа', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const finalRightShape = await test.step('Получить итоговое состояние правого шейпа', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })
    const finalLeftText = await test.step('Получить итоговый текст в левом шейпе', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const finalRightText = await test.step('Получить итоговый текст в правом шейпе', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    await test.step('Проверить что после mouseup высота не дёрнулась и текст остался тем же', () => {
      expect(finalLeftText, 'итоговый текст в левом шейпе должен существовать').not.toBeNull()
      expect(finalRightText, 'итоговый текст в правом шейпе должен существовать').not.toBeNull()

      if (!finalLeftText || !finalRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать до и после mouseup')
      }

      const selectionHeightJump = Math.abs(finalSelectionSnapshot.boundsHeight - liveSelectionSnapshot.boundsHeight)
      const leftHeightJump = Math.abs(finalLeftShape.groupBoundsHeight - liveLeftShape.groupBoundsHeight)
      const rightHeightJump = Math.abs(finalRightShape.groupBoundsHeight - liveRightShape.groupBoundsHeight)

      expect(selectionHeightJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(leftHeightJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(rightHeightJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
      expect(finalRightText.fontSize).toBe(liveRightText.fontSize)
      expect(finalLeftText.lineCount).toBe(liveLeftText.lineCount)
      expect(finalRightText.lineCount).toBe(liveRightText.lineCount)

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

  test('при сужении нескольких шейпов за правый верхний угол текст переносится во время drag и размер не дёргается после mouseup', async({
    selection,
    shapes
  }) => {
    const { id: leftShapeId } = SHAPE_MULTI_SCALING_LEFT_OPTIONS
    const { id: rightShapeId } = SHAPE_MULTI_SCALING_RIGHT_OPTIONS
    const { mouseupJump } = SHAPE_MULTI_SCALING_TOLERANCE

    const initialSelectionSnapshot = await test.step('Получить исходный размер общего выделения', () => {
      return selection.getSnapshot()
    })
    const initialLeftText = await test.step('Получить исходное состояние текста в левом шейпе', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const initialRightText = await test.step('Получить исходное состояние текста в правом шейпе', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    const liveSelectionSnapshot = await test.step('Сузить общее выделение из правого верхнего угла во время drag', () => {
      return selection.scaleDiagonallyFromTopRight({
        scaleX: SHAPE_MULTI_SCALING_SCALE_X,
        scaleY: SHAPE_MULTI_SCALING_SCALE_Y
      })
    })
    const liveLeftShape = await test.step('Получить состояние левого шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const liveRightShape = await test.step('Получить состояние правого шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })
    const liveLeftText = await test.step('Получить текст в левом шейпе во время drag', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const liveRightText = await test.step('Получить текст в правом шейпе во время drag', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    const finalSelectionSnapshot = await test.step('Отпустить мышь и получить итоговое состояние общего выделения', () => {
      return selection.finishScale()
    })
    const finalLeftShape = await test.step('Получить итоговое состояние левого шейпа', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const finalRightShape = await test.step('Получить итоговое состояние правого шейпа', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })
    const finalLeftText = await test.step('Получить итоговый текст в левом шейпе', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const finalRightText = await test.step('Получить итоговый текст в правом шейпе', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    await test.step('Проверить что во время drag изменяются обе оси и текст переносится внутри шейпов', () => {
      expect(initialLeftText, 'текст в левом шейпе должен существовать').not.toBeNull()
      expect(initialRightText, 'текст в правом шейпе должен существовать').not.toBeNull()
      expect(liveLeftText, 'текст в левом шейпе во время drag должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в правом шейпе во время drag должен существовать').not.toBeNull()

      if (!initialLeftText || !initialRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать до и во время drag')
      }

      expect(liveSelectionSnapshot.boundsWidth)
        .toBeLessThan(initialSelectionSnapshot.boundsWidth - mouseupJump)
      expect(liveSelectionSnapshot.boundsHeight)
        .toBeLessThan(initialSelectionSnapshot.boundsHeight - mouseupJump)
      expect(liveLeftText.lineCount).toBeGreaterThan(initialLeftText.lineCount)
      expect(liveRightText.lineCount).toBeGreaterThan(initialRightText.lineCount)
      expect(liveLeftText.fontSize).toBe(initialLeftText.fontSize)
      expect(liveRightText.fontSize).toBe(initialRightText.fontSize)

      shapes.checkNodeInsideGroup({
        snapshot: liveLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: liveRightShape,
        kind: 'text'
      })
    })

    await test.step('Проверить что после mouseup размер не дёрнулся и переносы строк сохранились', () => {
      expect(liveLeftText, 'текст в левом шейпе во время drag должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в правом шейпе во время drag должен существовать').not.toBeNull()
      expect(finalLeftText, 'итоговый текст в левом шейпе должен существовать').not.toBeNull()
      expect(finalRightText, 'итоговый текст в правом шейпе должен существовать').not.toBeNull()

      if (!liveLeftText || !liveRightText || !finalLeftText || !finalRightText) {
        throw new Error('текст в обоих шейпах должен существовать во время drag и после mouseup')
      }

      const selectionWidthJump = Math.abs(finalSelectionSnapshot.boundsWidth - liveSelectionSnapshot.boundsWidth)
      const selectionHeightJump = Math.abs(finalSelectionSnapshot.boundsHeight - liveSelectionSnapshot.boundsHeight)
      const leftWidthJump = Math.abs(finalLeftShape.groupBoundsWidth - liveLeftShape.groupBoundsWidth)
      const rightWidthJump = Math.abs(finalRightShape.groupBoundsWidth - liveRightShape.groupBoundsWidth)
      const leftHeightJump = Math.abs(finalLeftShape.groupBoundsHeight - liveLeftShape.groupBoundsHeight)
      const rightHeightJump = Math.abs(finalRightShape.groupBoundsHeight - liveRightShape.groupBoundsHeight)

      expect(selectionWidthJump).toBeLessThanOrEqual(mouseupJump)
      expect(selectionHeightJump).toBeLessThanOrEqual(mouseupJump)
      expect(leftWidthJump).toBeLessThanOrEqual(mouseupJump)
      expect(rightWidthJump).toBeLessThanOrEqual(mouseupJump)
      expect(leftHeightJump).toBeLessThanOrEqual(mouseupJump)
      expect(rightHeightJump).toBeLessThanOrEqual(mouseupJump)
      expect(finalLeftText.lineCount).toBe(liveLeftText.lineCount)
      expect(finalRightText.lineCount).toBe(liveRightText.lineCount)
      expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
      expect(finalRightText.fontSize).toBe(liveRightText.fontSize)

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

  test('при сужении нескольких шейпов за угол текст переносится во время drag и размер не дёргается после mouseup', async({
    selection,
    shapes
  }) => {
    const { id: leftShapeId } = SHAPE_MULTI_SCALING_LEFT_OPTIONS
    const { id: rightShapeId } = SHAPE_MULTI_SCALING_RIGHT_OPTIONS
    const { mouseupJump } = SHAPE_MULTI_SCALING_TOLERANCE

    const initialSelectionSnapshot = await test.step('Получить исходный размер общего выделения', () => {
      return selection.getSnapshot()
    })
    const initialLeftText = await test.step('Получить исходное состояние текста в левом шейпе', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const initialRightText = await test.step('Получить исходное состояние текста в правом шейпе', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    const liveSelectionSnapshot = await test.step('Сузить общее выделение из правого нижнего угла во время drag', () => {
      return selection.scaleDiagonallyFromBottomRight({
        scaleX: SHAPE_MULTI_SCALING_SCALE_X,
        scaleY: SHAPE_MULTI_SCALING_SCALE_Y
      })
    })
    const liveLeftShape = await test.step('Получить состояние левого шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const liveRightShape = await test.step('Получить состояние правого шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })
    const liveLeftText = await test.step('Получить текст в левом шейпе во время drag', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const liveRightText = await test.step('Получить текст в правом шейпе во время drag', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    const finalSelectionSnapshot = await test.step('Отпустить мышь и получить итоговое состояние общего выделения', () => {
      return selection.finishScale()
    })
    const finalLeftShape = await test.step('Получить итоговое состояние левого шейпа', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const finalRightShape = await test.step('Получить итоговое состояние правого шейпа', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })
    const finalLeftText = await test.step('Получить итоговый текст в левом шейпе', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const finalRightText = await test.step('Получить итоговый текст в правом шейпе', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    await test.step('Проверить что во время drag изменяются обе оси и текст переносится внутри шейпов', () => {
      expect(initialLeftText, 'текст в левом шейпе должен существовать').not.toBeNull()
      expect(initialRightText, 'текст в правом шейпе должен существовать').not.toBeNull()
      expect(liveLeftText, 'текст в левом шейпе во время drag должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в правом шейпе во время drag должен существовать').not.toBeNull()

      if (!initialLeftText || !initialRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать до и во время drag')
      }

      expect(liveSelectionSnapshot.boundsWidth)
        .toBeLessThan(initialSelectionSnapshot.boundsWidth - mouseupJump)
      expect(liveSelectionSnapshot.boundsHeight)
        .toBeLessThan(initialSelectionSnapshot.boundsHeight - mouseupJump)
      expect(liveLeftText.lineCount).toBeGreaterThan(initialLeftText.lineCount)
      expect(liveRightText.lineCount).toBeGreaterThan(initialRightText.lineCount)
      expect(liveLeftText.fontSize).toBe(initialLeftText.fontSize)
      expect(liveRightText.fontSize).toBe(initialRightText.fontSize)

      shapes.checkNodeInsideGroup({
        snapshot: liveLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: liveRightShape,
        kind: 'text'
      })
    })

    await test.step('Проверить что после mouseup размер не дёрнулся и переносы строк сохранились', () => {
      expect(liveLeftText, 'текст в левом шейпе во время drag должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в правом шейпе во время drag должен существовать').not.toBeNull()
      expect(finalLeftText, 'итоговый текст в левом шейпе должен существовать').not.toBeNull()
      expect(finalRightText, 'итоговый текст в правом шейпе должен существовать').not.toBeNull()

      if (!liveLeftText || !liveRightText || !finalLeftText || !finalRightText) {
        throw new Error('текст в обоих шейпах должен существовать во время drag и после mouseup')
      }

      const selectionWidthJump = Math.abs(finalSelectionSnapshot.boundsWidth - liveSelectionSnapshot.boundsWidth)
      const selectionHeightJump = Math.abs(finalSelectionSnapshot.boundsHeight - liveSelectionSnapshot.boundsHeight)
      const leftWidthJump = Math.abs(finalLeftShape.groupBoundsWidth - liveLeftShape.groupBoundsWidth)
      const rightWidthJump = Math.abs(finalRightShape.groupBoundsWidth - liveRightShape.groupBoundsWidth)
      const leftHeightJump = Math.abs(finalLeftShape.groupBoundsHeight - liveLeftShape.groupBoundsHeight)
      const rightHeightJump = Math.abs(finalRightShape.groupBoundsHeight - liveRightShape.groupBoundsHeight)

      expect(selectionWidthJump).toBeLessThanOrEqual(mouseupJump)
      expect(selectionHeightJump).toBeLessThanOrEqual(mouseupJump)
      expect(leftWidthJump).toBeLessThanOrEqual(mouseupJump)
      expect(rightWidthJump).toBeLessThanOrEqual(mouseupJump)
      expect(leftHeightJump).toBeLessThanOrEqual(mouseupJump)
      expect(rightHeightJump).toBeLessThanOrEqual(mouseupJump)
      expect(finalLeftText.lineCount).toBe(liveLeftText.lineCount)
      expect(finalRightText.lineCount).toBe(liveRightText.lineCount)
      expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
      expect(finalRightText.fontSize).toBe(liveRightText.fontSize)

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

  test('если продолжать тянуть угол после упора в минимальную ширину, выделение не расширяется по ширине рывком', async({
    selection,
    shapes
  }) => {
    const minimumSelectionSnapshot = await test.step('Сжать общее выделение из правого нижнего угла до минимального размера', () => {
      return selection.shrinkDiagonallyFromBottomRightToMinimum({
        minimumSize: SHAPE_MULTI_SCALING_MINIMUM_TARGET_SIZE
      })
    })
    const minimumLeftShape = await test.step('Получить состояние левого шейпа на минимальном размере', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const minimumRightShape = await test.step('Получить состояние правого шейпа на минимальном размере', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    const continuedSelectionSnapshot = await test.step('Продолжить тянуть угол дальше по диагонали', () => {
      return selection.dragActiveScaleHandleBy({
        deltaX: SHAPE_MULTI_SCALING_BEYOND_MINIMUM_DRAG_DELTA,
        deltaY: SHAPE_MULTI_SCALING_BEYOND_MINIMUM_DRAG_DELTA
      })
    })
    const continuedLeftShape = await test.step('Получить состояние левого шейпа после продолжения drag', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const continuedRightShape = await test.step('Получить состояние правого шейпа после продолжения drag', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    const finalSelectionSnapshot = await test.step('Отпустить мышь и получить итоговое состояние общего выделения', () => {
      return selection.finishScale()
    })
    const finalLeftShape = await test.step('Получить итоговое состояние левого шейпа', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const finalRightShape = await test.step('Получить итоговое состояние правого шейпа', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    await test.step('Проверить что продолжение drag не расширило выделение по ширине и шейпы остались корректными', () => {
      expect(continuedSelectionSnapshot.boundsWidth)
        .toBeGreaterThan(SHAPE_MULTI_SCALING_MINIMUM_TARGET_SIZE + SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(continuedSelectionSnapshot.boundsHeight)
        .toBeGreaterThan(SHAPE_MULTI_SCALING_MINIMUM_TARGET_SIZE + SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)

      expect(Math.abs(continuedSelectionSnapshot.boundsWidth - minimumSelectionSnapshot.boundsWidth))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(finalSelectionSnapshot.boundsWidth - continuedSelectionSnapshot.boundsWidth))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)

      expect(Math.abs(continuedLeftShape.groupBoundsWidth - minimumLeftShape.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(continuedRightShape.groupBoundsWidth - minimumRightShape.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(finalLeftShape.groupBoundsWidth - continuedLeftShape.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(finalRightShape.groupBoundsWidth - continuedRightShape.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(finalSelectionSnapshot.boundsHeight).toBeGreaterThan(0)
      expect(finalLeftShape.groupBoundsHeight).toBeGreaterThan(0)
      expect(finalRightShape.groupBoundsHeight).toBeGreaterThan(0)

      shapes.checkNodeInsideGroup({
        snapshot: continuedLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: continuedRightShape,
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

  test('после undo и redo несколько шейпов сохраняют тот же размер и те же переносы строк', async({
    history,
    selection,
    shapes
  }) => {
    await test.step('Сузить несколько шейпов справа и завершить изменение размера', async() => {
      await selection.scaleHorizontallyFromRight({
        scaleX: SHAPE_MULTI_SCALING_SCALE_X
      })
      await selection.finishScale()
      await history.flushPendingSave()
    })

    const resizedLeftShape = await test.step('Получить состояние левого шейпа после изменения размера', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const resizedRightShape = await test.step('Получить состояние правого шейпа после изменения размера', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })
    const resizedLeftText = await test.step('Получить текст в левом шейпе после изменения размера', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const resizedRightText = await test.step('Получить текст в правом шейпе после изменения размера', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    await test.step('Сделать undo и redo', async() => {
      await history.undo()
      await history.redo()
    })

    const restoredLeftShape = await test.step('Получить состояние левого шейпа после redo', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const restoredRightShape = await test.step('Получить состояние правого шейпа после redo', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })
    const restoredLeftText = await test.step('Получить текст в левом шейпе после redo', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const restoredRightText = await test.step('Получить текст в правом шейпе после redo', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    await test.step('Проверить что redo вернул тот же размер и те же переносы строк', () => {
      expect(resizedLeftText, 'текст в левом шейпе после resize должен существовать').not.toBeNull()
      expect(resizedRightText, 'текст в правом шейпе после resize должен существовать').not.toBeNull()
      expect(restoredLeftText, 'текст в левом шейпе после redo должен существовать').not.toBeNull()
      expect(restoredRightText, 'текст в правом шейпе после redo должен существовать').not.toBeNull()

      if (!resizedLeftText || !resizedRightText || !restoredLeftText || !restoredRightText) {
        throw new Error('текст в обоих шейпах должен существовать после resize и после redo')
      }

      expect(Math.abs(restoredLeftShape.groupBoundsWidth - resizedLeftShape.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(restoredRightShape.groupBoundsWidth - resizedRightShape.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(restoredLeftText.lineCount).toBe(resizedLeftText.lineCount)
      expect(restoredRightText.lineCount).toBe(resizedRightText.lineCount)
      expect(restoredLeftText.fontSize).toBe(resizedLeftText.fontSize)
      expect(restoredRightText.fontSize).toBe(resizedRightText.fontSize)

      shapes.checkNodeInsideGroup({
        snapshot: restoredLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: restoredRightShape,
        kind: 'text'
      })
    })
  })

  test('после массового сужения можно редактировать текст внутри одного шейпа без возврата старой ширины', async({
    selection,
    shapes
  }) => {
    await test.step('Сузить несколько шейпов справа и завершить изменение размера', async() => {
      await selection.scaleHorizontallyFromRight({
        scaleX: SHAPE_MULTI_SCALING_SCALE_X
      })
      await selection.finishScale()
    })

    const resizedLeftShape = await test.step('Получить состояние левого шейпа после изменения размера', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const resizedLeftText = await test.step('Получить текст в левом шейпе после изменения размера', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const resizedRightShape = await test.step('Получить состояние правого шейпа после изменения размера', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })

    await test.step('Изменить текст только в левом шейпе после массового resize', async() => {
      await shapes.enterTextEditing({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
      await shapes.updateEditingText({
        id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id,
        text: SHAPE_MULTI_SCALING_EDITED_TEXT
      })
      await shapes.exitTextEditing({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })

    const finalLeftShape = await test.step('Получить итоговое состояние левого шейпа после редактирования текста', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })
    const finalRightShape = await test.step('Получить итоговое состояние правого шейпа после редактирования текста', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    })
    const finalLeftText = await test.step('Получить итоговый текст в левом шейпе после редактирования', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
    })

    await test.step('Проверить что левый шейп сохранил текущую ширину, а текст просто перенёсся внутри неё', () => {
      expect(resizedLeftText, 'текст в левом шейпе после resize должен существовать').not.toBeNull()
      expect(finalLeftText, 'итоговый текст в левом шейпе должен существовать').not.toBeNull()

      if (!resizedLeftText || !finalLeftText) {
        throw new Error('текст в левом шейпе должен существовать до и после редактирования')
      }

      expect(finalLeftText.text).toBe(SHAPE_MULTI_SCALING_EDITED_TEXT)
      expect(finalLeftText.fontSize).toBe(resizedLeftText.fontSize)
      expect(finalLeftText.lineCount).toBeGreaterThan(resizedLeftText.lineCount)
      expect(Math.abs(finalLeftShape.groupBoundsWidth - resizedLeftShape.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(finalRightShape.groupBoundsWidth - resizedRightShape.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)

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
})

test.describe('Изменение размера нескольких шейпов разной высоты', () => {
  test.beforeEach(async({ editorModel, shapes }) => {
    const leftShape = await shapes.addAtBounds({
      presetKey: 'square',
      options: SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS
    })
    const rightShape = await shapes.addAtBounds({
      presetKey: 'square',
      options: SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS
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

  test('при сужении нескольких шейпов разной высоты справа текст переносится во время drag и размер не дёргается после mouseup', async({
    selection,
    shapes
  }) => {
    const { id: leftShapeId } = SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS
    const { id: rightShapeId } = SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS
    const { mouseupJump } = SHAPE_MULTI_SCALING_TOLERANCE

    const initialSelectionSnapshot = await test.step('Получить исходную ширину общего выделения', () => {
      return selection.getSnapshot()
    })
    const initialLeftText = await test.step('Получить исходное состояние текста в меньшем шейпе', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const initialRightText = await test.step('Получить исходное состояние текста в высоком шейпе', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    const liveSelectionSnapshot = await test.step('Сузить общее выделение справа во время drag', () => {
      return selection.scaleHorizontallyFromRight({
        scaleX: SHAPE_MULTI_SCALING_SCALE_X
      })
    })
    const liveLeftShape = await test.step('Получить состояние меньшего шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const liveRightShape = await test.step('Получить состояние высокого шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })
    const liveLeftText = await test.step('Получить текст в меньшем шейпе во время drag', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const liveRightText = await test.step('Получить текст в высоком шейпе во время drag', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    const finalSelectionSnapshot = await test.step('Отпустить мышь и получить итоговую ширину общего выделения', () => {
      return selection.finishScale()
    })
    const finalLeftShape = await test.step('Получить итоговое состояние меньшего шейпа', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const finalRightShape = await test.step('Получить итоговое состояние высокого шейпа', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })
    const finalLeftText = await test.step('Получить итоговый текст в меньшем шейпе', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const finalRightText = await test.step('Получить итоговый текст в высоком шейпе', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    await test.step('Проверить что во время drag текст переносится внутри шейпов', () => {
      expect(initialLeftText, 'текст в меньшем шейпе должен существовать').not.toBeNull()
      expect(initialRightText, 'текст в высоком шейпе должен существовать').not.toBeNull()
      expect(liveLeftText, 'текст в меньшем шейпе во время drag должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в высоком шейпе во время drag должен существовать').not.toBeNull()

      if (!initialLeftText || !initialRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать до и во время drag')
      }

      expect(liveSelectionSnapshot.boundsWidth)
        .toBeLessThan(initialSelectionSnapshot.boundsWidth - mouseupJump)
      expect(liveLeftText.lineCount).toBeGreaterThan(initialLeftText.lineCount)
      expect(liveRightText.lineCount).toBeGreaterThan(initialRightText.lineCount)
      expect(liveLeftText.fontSize).toBe(initialLeftText.fontSize)
      expect(liveRightText.fontSize).toBe(initialRightText.fontSize)

      shapes.checkNodeInsideGroup({
        snapshot: liveLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: liveRightShape,
        kind: 'text'
      })
    })

    await test.step('Проверить что после mouseup ширина не дёрнулась и переносы строк сохранились', () => {
      expect(liveLeftText, 'текст в меньшем шейпе во время drag должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в высоком шейпе во время drag должен существовать').not.toBeNull()
      expect(finalLeftText, 'итоговый текст в меньшем шейпе должен существовать').not.toBeNull()
      expect(finalRightText, 'итоговый текст в высоком шейпе должен существовать').not.toBeNull()

      if (!liveLeftText || !liveRightText || !finalLeftText || !finalRightText) {
        throw new Error('текст в обоих шейпах должен существовать во время drag и после mouseup')
      }

      const selectionWidthJump = Math.abs(finalSelectionSnapshot.boundsWidth - liveSelectionSnapshot.boundsWidth)
      const leftWidthJump = Math.abs(finalLeftShape.groupBoundsWidth - liveLeftShape.groupBoundsWidth)
      const rightWidthJump = Math.abs(finalRightShape.groupBoundsWidth - liveRightShape.groupBoundsWidth)
      const leftHeightJump = Math.abs(finalLeftShape.groupBoundsHeight - liveLeftShape.groupBoundsHeight)
      const rightHeightJump = Math.abs(finalRightShape.groupBoundsHeight - liveRightShape.groupBoundsHeight)

      expect(selectionWidthJump).toBeLessThanOrEqual(mouseupJump)
      expect(leftWidthJump).toBeLessThanOrEqual(mouseupJump)
      expect(rightWidthJump).toBeLessThanOrEqual(mouseupJump)
      expect(leftHeightJump).toBeLessThanOrEqual(mouseupJump)
      expect(rightHeightJump).toBeLessThanOrEqual(mouseupJump)
      expect(finalLeftText.lineCount).toBe(liveLeftText.lineCount)
      expect(finalRightText.lineCount).toBe(liveRightText.lineCount)
      expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
      expect(finalRightText.fontSize).toBe(liveRightText.fontSize)

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

  test('при уменьшении нескольких шейпов разной высоты снизу их высота меняется без деформации текста и без рывка после mouseup', async({
    selection,
    shapes
  }) => {
    const { id: leftShapeId } = SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS
    const { id: rightShapeId } = SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS
    const { mouseupJump } = SHAPE_MULTI_SCALING_TOLERANCE

    const initialSelectionSnapshot = await test.step('Получить исходную высоту общего выделения', () => {
      return selection.getSnapshot()
    })
    const initialLeftText = await test.step('Получить исходное состояние текста в меньшем шейпе', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const initialRightText = await test.step('Получить исходное состояние текста в высоком шейпе', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    const liveSelectionSnapshot = await test.step('Уменьшить общее выделение снизу во время drag', () => {
      return selection.scaleVerticallyFromBottom({
        scaleY: SHAPE_MULTI_SCALING_SCALE_Y
      })
    })
    const liveLeftShape = await test.step('Получить состояние меньшего шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const liveRightShape = await test.step('Получить состояние высокого шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })
    const liveLeftText = await test.step('Получить текст в меньшем шейпе во время drag', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const liveRightText = await test.step('Получить текст в высоком шейпе во время drag', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    const finalSelectionSnapshot = await test.step('Отпустить мышь и получить итоговое состояние общего выделения', () => {
      return selection.finishScale()
    })
    const finalLeftShape = await test.step('Получить итоговое состояние меньшего шейпа', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const finalRightShape = await test.step('Получить итоговое состояние высокого шейпа', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })
    const finalLeftText = await test.step('Получить итоговый текст в меньшем шейпе', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const finalRightText = await test.step('Получить итоговый текст в высоком шейпе', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    await test.step('Проверить что во время drag уменьшается только высота, а текст не деформируется', () => {
      expect(initialLeftText, 'текст в меньшем шейпе должен существовать').not.toBeNull()
      expect(initialRightText, 'текст в высоком шейпе должен существовать').not.toBeNull()
      expect(liveLeftText, 'текст в меньшем шейпе во время drag должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в высоком шейпе во время drag должен существовать').not.toBeNull()

      if (!initialLeftText || !initialRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать до и во время drag')
      }

      expect(liveSelectionSnapshot.boundsHeight)
        .toBeLessThan(initialSelectionSnapshot.boundsHeight - mouseupJump)
      expect(Math.abs(liveSelectionSnapshot.boundsWidth - initialSelectionSnapshot.boundsWidth))
        .toBeLessThanOrEqual(mouseupJump)
      expect(liveLeftText.fontSize).toBe(initialLeftText.fontSize)
      expect(liveRightText.fontSize).toBe(initialRightText.fontSize)
      expect(liveLeftText.lineCount).toBe(initialLeftText.lineCount)
      expect(liveRightText.lineCount).toBe(initialRightText.lineCount)

      shapes.checkNodeInsideGroup({
        snapshot: liveLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: liveRightShape,
        kind: 'text'
      })
    })

    await test.step('Проверить что после mouseup высота не дёрнулась и текст остался тем же', () => {
      expect(finalLeftText, 'итоговый текст в меньшем шейпе должен существовать').not.toBeNull()
      expect(finalRightText, 'итоговый текст в высоком шейпе должен существовать').not.toBeNull()

      if (!finalLeftText || !finalRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать до и после mouseup')
      }

      const selectionHeightJump = Math.abs(finalSelectionSnapshot.boundsHeight - liveSelectionSnapshot.boundsHeight)
      const leftHeightJump = Math.abs(finalLeftShape.groupBoundsHeight - liveLeftShape.groupBoundsHeight)
      const rightHeightJump = Math.abs(finalRightShape.groupBoundsHeight - liveRightShape.groupBoundsHeight)

      expect(selectionHeightJump).toBeLessThanOrEqual(mouseupJump)
      expect(leftHeightJump).toBeLessThanOrEqual(mouseupJump)
      expect(rightHeightJump).toBeLessThanOrEqual(mouseupJump)
      expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
      expect(finalRightText.fontSize).toBe(liveRightText.fontSize)
      expect(finalLeftText.lineCount).toBe(liveLeftText.lineCount)
      expect(finalRightText.lineCount).toBe(liveRightText.lineCount)

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

  // eslint-disable-next-line max-len
  test('при сужении нескольких шейпов разной высоты за правый нижний угол текст переносится во время drag и размер не дёргается после mouseup', async({
    selection,
    shapes
  }) => {
    const { id: leftShapeId } = SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS
    const { id: rightShapeId } = SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS
    const { mouseupJump } = SHAPE_MULTI_SCALING_TOLERANCE

    const initialSelectionSnapshot = await test.step('Получить исходный размер общего выделения', () => {
      return selection.getSnapshot()
    })
    const initialLeftText = await test.step('Получить исходное состояние текста в меньшем шейпе', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const initialRightText = await test.step('Получить исходное состояние текста в высоком шейпе', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    const liveSelectionSnapshot = await test.step('Сузить общее выделение из правого нижнего угла во время drag', () => {
      return selection.scaleDiagonallyFromBottomRight({
        scaleX: SHAPE_MULTI_SCALING_SCALE_X,
        scaleY: SHAPE_MULTI_SCALING_SCALE_Y
      })
    })
    const liveLeftShape = await test.step('Получить состояние меньшего шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const liveRightShape = await test.step('Получить состояние высокого шейпа во время drag', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })
    const liveLeftText = await test.step('Получить текст в меньшем шейпе во время drag', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const liveRightText = await test.step('Получить текст в высоком шейпе во время drag', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    const finalSelectionSnapshot = await test.step('Отпустить мышь и получить итоговое состояние общего выделения', () => {
      return selection.finishScale()
    })
    const finalLeftShape = await test.step('Получить итоговое состояние меньшего шейпа', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const finalRightShape = await test.step('Получить итоговое состояние высокого шейпа', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })
    const finalLeftText = await test.step('Получить итоговый текст в меньшем шейпе', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const finalRightText = await test.step('Получить итоговый текст в высоком шейпе', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    await test.step('Проверить что во время drag изменяются обе оси и текст переносится внутри шейпов', () => {
      expect(initialLeftText, 'текст в меньшем шейпе должен существовать').not.toBeNull()
      expect(initialRightText, 'текст в высоком шейпе должен существовать').not.toBeNull()
      expect(liveLeftText, 'текст в меньшем шейпе во время drag должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в высоком шейпе во время drag должен существовать').not.toBeNull()

      if (!initialLeftText || !initialRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать до и во время drag')
      }

      expect(liveSelectionSnapshot.boundsWidth)
        .toBeLessThan(initialSelectionSnapshot.boundsWidth - mouseupJump)
      expect(liveSelectionSnapshot.boundsHeight)
        .toBeLessThan(initialSelectionSnapshot.boundsHeight - mouseupJump)
      expect(liveLeftText.lineCount).toBeGreaterThan(initialLeftText.lineCount)
      expect(liveRightText.lineCount).toBeGreaterThan(initialRightText.lineCount)
      expect(liveLeftText.fontSize).toBe(initialLeftText.fontSize)
      expect(liveRightText.fontSize).toBe(initialRightText.fontSize)

      shapes.checkNodeInsideGroup({
        snapshot: liveLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: liveRightShape,
        kind: 'text'
      })
    })

    await test.step('Проверить что после mouseup размер не дёрнулся и переносы строк сохранились', () => {
      expect(liveLeftText, 'текст в меньшем шейпе во время drag должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в высоком шейпе во время drag должен существовать').not.toBeNull()
      expect(finalLeftText, 'итоговый текст в меньшем шейпе должен существовать').not.toBeNull()
      expect(finalRightText, 'итоговый текст в высоком шейпе должен существовать').not.toBeNull()

      if (!liveLeftText || !liveRightText || !finalLeftText || !finalRightText) {
        throw new Error('текст в обоих шейпах должен существовать во время drag и после mouseup')
      }

      const selectionWidthJump = Math.abs(finalSelectionSnapshot.boundsWidth - liveSelectionSnapshot.boundsWidth)
      const selectionHeightJump = Math.abs(finalSelectionSnapshot.boundsHeight - liveSelectionSnapshot.boundsHeight)
      const leftWidthJump = Math.abs(finalLeftShape.groupBoundsWidth - liveLeftShape.groupBoundsWidth)
      const rightWidthJump = Math.abs(finalRightShape.groupBoundsWidth - liveRightShape.groupBoundsWidth)
      const leftHeightJump = Math.abs(finalLeftShape.groupBoundsHeight - liveLeftShape.groupBoundsHeight)
      const rightHeightJump = Math.abs(finalRightShape.groupBoundsHeight - liveRightShape.groupBoundsHeight)

      expect(selectionWidthJump).toBeLessThanOrEqual(mouseupJump)
      expect(selectionHeightJump).toBeLessThanOrEqual(mouseupJump)
      expect(leftWidthJump).toBeLessThanOrEqual(mouseupJump)
      expect(rightWidthJump).toBeLessThanOrEqual(mouseupJump)
      expect(leftHeightJump).toBeLessThanOrEqual(mouseupJump)
      expect(rightHeightJump).toBeLessThanOrEqual(mouseupJump)
      expect(finalLeftText.lineCount).toBe(liveLeftText.lineCount)
      expect(finalRightText.lineCount).toBe(liveRightText.lineCount)
      expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
      expect(finalRightText.fontSize).toBe(liveRightText.fontSize)

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

  test('после undo и redo несколько шейпов разной высоты сохраняют тот же размер и те же переносы строк', async({
    history,
    selection,
    shapes
  }) => {
    const { id: leftShapeId } = SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS
    const { id: rightShapeId } = SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS

    await test.step('Сузить несколько шейпов разной высоты справа и завершить изменение размера', async() => {
      await selection.scaleHorizontallyFromRight({
        scaleX: SHAPE_MULTI_SCALING_SCALE_X
      })
      await selection.finishScale()
      await history.flushPendingSave()
    })

    const resizedLeftShape = await test.step('Получить состояние меньшего шейпа после изменения размера', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const resizedRightShape = await test.step('Получить состояние высокого шейпа после изменения размера', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })
    const resizedLeftText = await test.step('Получить текст в меньшем шейпе после изменения размера', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const resizedRightText = await test.step('Получить текст в высоком шейпе после изменения размера', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    await test.step('Сделать undo и redo', async() => {
      await history.undo()
      await history.redo()
    })

    const restoredLeftShape = await test.step('Получить состояние меньшего шейпа после redo', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const restoredRightShape = await test.step('Получить состояние высокого шейпа после redo', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })
    const restoredLeftText = await test.step('Получить текст в меньшем шейпе после redo', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const restoredRightText = await test.step('Получить текст в высоком шейпе после redo', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    await test.step('Проверить что redo вернул тот же размер и те же переносы строк', () => {
      expect(resizedLeftText, 'текст в меньшем шейпе после resize должен существовать').not.toBeNull()
      expect(resizedRightText, 'текст в высоком шейпе после resize должен существовать').not.toBeNull()
      expect(restoredLeftText, 'текст в меньшем шейпе после redo должен существовать').not.toBeNull()
      expect(restoredRightText, 'текст в высоком шейпе после redo должен существовать').not.toBeNull()

      if (!resizedLeftText || !resizedRightText || !restoredLeftText || !restoredRightText) {
        throw new Error('текст в обоих шейпах должен существовать после resize и после redo')
      }

      expect(Math.abs(restoredLeftShape.groupBoundsWidth - resizedLeftShape.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(restoredRightShape.groupBoundsWidth - resizedRightShape.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(restoredLeftText.lineCount).toBe(resizedLeftText.lineCount)
      expect(restoredRightText.lineCount).toBe(resizedRightText.lineCount)
      expect(restoredLeftText.fontSize).toBe(resizedLeftText.fontSize)
      expect(restoredRightText.fontSize).toBe(resizedRightText.fontSize)

      shapes.checkNodeInsideGroup({
        snapshot: restoredLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: restoredRightShape,
        kind: 'text'
      })
    })
  })

  test('если продолжать тянуть нижнюю ручку после упора в минимальную высоту, выделение не расширяется рывком', async({
    selection,
    shapes
  }) => {
    const { id: leftShapeId } = SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS
    const { id: rightShapeId } = SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS

    const minimumSelectionSnapshot = await test.step('Сжать общее выделение снизу до минимальной высоты', () => {
      return selection.shrinkVerticallyFromBottomToMinimum({
        minimumSize: SHAPE_MULTI_SCALING_MINIMUM_TARGET_SIZE
      })
    })
    const minimumLeftShape = await test.step('Получить состояние меньшего шейпа на минимальной высоте', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const minimumRightShape = await test.step('Получить состояние высокого шейпа на минимальной высоте', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })

    const continuedSelectionSnapshot = await test.step('Продолжить тянуть нижнюю ручку вверх после упора', () => {
      return selection.dragActiveScaleHandleBy({
        deltaX: 0,
        deltaY: SHAPE_MULTI_SCALING_BEYOND_MINIMUM_DRAG_DELTA
      })
    })
    const continuedLeftShape = await test.step('Получить состояние меньшего шейпа после продолжения drag', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const continuedRightShape = await test.step('Получить состояние высокого шейпа после продолжения drag', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })

    const finalSelectionSnapshot = await test.step('Отпустить мышь и получить итоговое состояние общего выделения', () => {
      return selection.finishScale()
    })
    const finalLeftShape = await test.step('Получить итоговое состояние меньшего шейпа', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const finalRightShape = await test.step('Получить итоговое состояние высокого шейпа', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })

    await test.step('Проверить что продолжение drag не расширило выделение по высоте и шейпы остались корректными', () => {
      expect(continuedSelectionSnapshot.boundsHeight)
        .toBeGreaterThan(SHAPE_MULTI_SCALING_MINIMUM_TARGET_SIZE + SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(continuedSelectionSnapshot.boundsWidth)
        .toBeGreaterThan(SHAPE_MULTI_SCALING_MINIMUM_TARGET_SIZE + SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)

      expect(Math.abs(continuedSelectionSnapshot.boundsHeight - minimumSelectionSnapshot.boundsHeight))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(finalSelectionSnapshot.boundsHeight - continuedSelectionSnapshot.boundsHeight))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)

      expect(Math.abs(continuedLeftShape.groupBoundsHeight - minimumLeftShape.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(continuedRightShape.groupBoundsHeight - minimumRightShape.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(finalLeftShape.groupBoundsHeight - continuedLeftShape.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(finalRightShape.groupBoundsHeight - continuedRightShape.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(finalSelectionSnapshot.boundsWidth).toBeGreaterThan(0)
      expect(finalLeftShape.groupBoundsWidth).toBeGreaterThan(0)
      expect(finalRightShape.groupBoundsWidth).toBeGreaterThan(0)

      shapes.checkNodeInsideGroup({
        snapshot: continuedLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: continuedRightShape,
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

  test('после массового сужения нескольких шейпов разной высоты можно редактировать текст без возврата старой ширины', async({
    selection,
    shapes
  }) => {
    const { id: leftShapeId } = SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS
    const { id: rightShapeId } = SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS

    await test.step('Сузить несколько шейпов разной высоты справа и завершить изменение размера', async() => {
      await selection.scaleHorizontallyFromRight({
        scaleX: SHAPE_MULTI_SCALING_SCALE_X
      })
      await selection.finishScale()
    })

    const resizedLeftShape = await test.step('Получить состояние меньшего шейпа после изменения размера', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const resizedLeftText = await test.step('Получить текст в меньшем шейпе после изменения размера', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const resizedRightShape = await test.step('Получить состояние высокого шейпа после изменения размера', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })

    await test.step('Изменить текст только в меньшем шейпе после массового resize', async() => {
      await shapes.enterTextEditing({ id: leftShapeId })
      await shapes.updateEditingText({
        id: leftShapeId,
        text: SHAPE_MULTI_SCALING_EDITED_TEXT
      })
      await shapes.exitTextEditing({ id: leftShapeId })
    })

    const finalLeftShape = await test.step('Получить итоговое состояние меньшего шейпа после редактирования текста', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const finalRightShape = await test.step('Получить итоговое состояние высокого шейпа после редактирования текста', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })
    const finalLeftText = await test.step('Получить итоговый текст в меньшем шейпе после редактирования', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })

    await test.step('Проверить что меньший шейп сохранил текущую ширину, а текст просто перенёсся внутри неё', () => {
      expect(resizedLeftText, 'текст в меньшем шейпе после resize должен существовать').not.toBeNull()
      expect(finalLeftText, 'итоговый текст в меньшем шейпе должен существовать').not.toBeNull()

      if (!resizedLeftText || !finalLeftText) {
        throw new Error('текст в меньшем шейпе должен существовать до и после редактирования')
      }

      expect(finalLeftText.text).toBe(SHAPE_MULTI_SCALING_EDITED_TEXT)
      expect(finalLeftText.fontSize).toBe(resizedLeftText.fontSize)
      expect(finalLeftText.lineCount).toBeGreaterThan(resizedLeftText.lineCount)
      expect(Math.abs(finalLeftShape.groupBoundsWidth - resizedLeftShape.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(finalRightShape.groupBoundsWidth - resizedRightShape.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)

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

  test('после сужения и обратного расширения справа нескольких шейпов разной высоты ширина не дёргается после mouseup', async({
    editorModel,
    selection,
    shapes
  }) => {
    const { id: leftShapeId } = SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS
    const { id: rightShapeId } = SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS

    await test.step('Сузить несколько шейпов разной высоты справа и завершить изменение размера', async() => {
      await selection.scaleHorizontallyFromRight({
        scaleX: SHAPE_MULTI_SCALING_SCALE_X
      })
      await selection.finishScale()
    })

    await test.step('Заново выделить оба шейпа перед обратным расширением', async() => {
      await editorModel.selectAllObjects()
    })

    const narrowedSelectionSnapshot = await test.step('Получить ширину выделения после сужения', () => {
      return selection.getSnapshot()
    })
    const narrowedLeftText = await test.step('Получить текст в меньшем шейпе после сужения', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const narrowedRightText = await test.step('Получить текст в высоком шейпе после сужения', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    const liveSelectionSnapshot = await test.step('Расширить общее выделение справа во время drag', () => {
      return selection.scaleHorizontallyFromRight({
        scaleX: SHAPE_MULTI_SCALING_EXPAND_SCALE_X
      })
    })
    const liveLeftShape = await test.step('Получить состояние меньшего шейпа во время обратного расширения', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const liveRightShape = await test.step('Получить состояние высокого шейпа во время обратного расширения', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })
    const liveLeftText = await test.step('Получить текст в меньшем шейпе во время обратного расширения', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const liveRightText = await test.step('Получить текст в высоком шейпе во время обратного расширения', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    await test.step('Проверить что во время обратного расширения ширина выросла и текст вернулся в одну строку', () => {
      expect(narrowedLeftText, 'текст в меньшем шейпе после сужения должен существовать').not.toBeNull()
      expect(narrowedRightText, 'текст в высоком шейпе после сужения должен существовать').not.toBeNull()
      expect(liveLeftText, 'текст в меньшем шейпе во время обратного расширения должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в высоком шейпе во время обратного расширения должен существовать').not.toBeNull()

      if (!narrowedLeftText || !narrowedRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать после сужения и во время обратного расширения')
      }

      expect(liveSelectionSnapshot.boundsWidth)
        .toBeGreaterThan(narrowedSelectionSnapshot.boundsWidth + SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(narrowedLeftText.lineCount).toBeGreaterThan(1)
      expect(narrowedRightText.lineCount).toBeGreaterThan(1)
      expect(liveLeftText.lineCount).toBe(1)
      expect(liveRightText.lineCount).toBe(1)
      expect(liveLeftText.fontSize).toBe(narrowedLeftText.fontSize)
      expect(liveRightText.fontSize).toBe(narrowedRightText.fontSize)

      shapes.checkNodeInsideGroup({
        snapshot: liveLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: liveRightShape,
        kind: 'text'
      })
    })

    const finalSelectionSnapshot = await test.step('Отпустить мышь и получить итоговое состояние общего выделения', async() => {
      return selection.finishScale()
    })
    const finalLeftShape = await test.step('Получить итоговое состояние меньшего шейпа после обратного расширения', () => {
      return shapes.getScaleSnapshot({ id: leftShapeId })
    })
    const finalRightShape = await test.step('Получить итоговое состояние высокого шейпа после обратного расширения', () => {
      return shapes.getScaleSnapshot({ id: rightShapeId })
    })
    const finalLeftText = await test.step('Получить итоговый текст в меньшем шейпе после обратного расширения', () => {
      return shapes.getTextNode({ id: leftShapeId })
    })
    const finalRightText = await test.step('Получить итоговый текст в высоком шейпе после обратного расширения', () => {
      return shapes.getTextNode({ id: rightShapeId })
    })

    await test.step('Проверить что после mouseup размер не дёрнулся и переносы строк сохранились', () => {
      expect(finalLeftText, 'итоговый текст в меньшем шейпе должен существовать').not.toBeNull()
      expect(finalRightText, 'итоговый текст в высоком шейпе должен существовать').not.toBeNull()

      if (!finalLeftText || !finalRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать до и после mouseup')
      }

      const selectionWidthJump = Math.abs(finalSelectionSnapshot.boundsWidth - liveSelectionSnapshot.boundsWidth)
      const leftWidthJump = Math.abs(finalLeftShape.groupBoundsWidth - liveLeftShape.groupBoundsWidth)
      const rightWidthJump = Math.abs(finalRightShape.groupBoundsWidth - liveRightShape.groupBoundsWidth)
      const leftHeightJump = Math.abs(finalLeftShape.groupBoundsHeight - liveLeftShape.groupBoundsHeight)
      const rightHeightJump = Math.abs(finalRightShape.groupBoundsHeight - liveRightShape.groupBoundsHeight)

      expect(selectionWidthJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(leftWidthJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(rightWidthJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(leftHeightJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(rightHeightJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(finalLeftText.lineCount).toBe(liveLeftText.lineCount)
      expect(finalRightText.lineCount).toBe(liveRightText.lineCount)
      expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
      expect(finalRightText.fontSize).toBe(liveRightText.fontSize)

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

  test('при уменьшении сверху меньший шейп остаётся у нижней границы выделения', async({
    selection,
    shapes
  }) => {
    const minimumSelection = await test.step('Сжать общее выделение сверху до минимальной высоты', () => {
      return selection.shrinkVerticallyFromTopToMinimum({
        minimumSize: SHAPE_MULTI_SCALING_MINIMUM_TARGET_SIZE
      })
    })
    const minimumLeftShape = await test.step('Получить состояние меньшего шейпа на минимальной высоте', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id })
    })
    const minimumRightShape = await test.step('Получить состояние высокого шейпа на минимальной высоте', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id })
    })

    const continuedSelection = await test.step('Продолжить тянуть верхнюю ручку вниз после упора', () => {
      return selection.dragActiveScaleHandleBy({
        deltaX: 0,
        deltaY: SHAPE_MULTI_SCALING_BEYOND_TOP_MINIMUM_DRAG_DELTA
      })
    })
    const continuedLeftShape = await test.step('Получить состояние меньшего шейпа после продолжения drag', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id })
    })
    const continuedRightShape = await test.step('Получить состояние высокого шейпа после продолжения drag', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id })
    })

    const finalSelection = await test.step('Отпустить мышь и получить итоговое состояние общего выделения', () => {
      return selection.finishScale()
    })
    const finalLeftShape = await test.step('Получить итоговое состояние меньшего шейпа', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id })
    })
    const finalRightShape = await test.step('Получить итоговое состояние высокого шейпа', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id })
    })

    await test.step('Проверить что меньший шейп не выпрыгнул вверх и не дёрнулся после mouseup', () => {
      const { mouseupJump } = SHAPE_MULTI_SCALING_TOLERANCE

      expect(minimumLeftShape.groupBoundsTop).toBeGreaterThanOrEqual(minimumSelection.boundsTop - mouseupJump)
      expect(minimumLeftShape.groupBoundsBottom).toBeLessThanOrEqual(minimumSelection.boundsBottom + mouseupJump)
      expect(Math.abs(minimumLeftShape.groupBoundsBottom - minimumSelection.boundsBottom))
        .toBeLessThanOrEqual(mouseupJump)

      expect(Math.abs(continuedSelection.boundsHeight - minimumSelection.boundsHeight))
        .toBeLessThanOrEqual(mouseupJump)
      expect(continuedLeftShape.groupBoundsTop).toBeGreaterThanOrEqual(continuedSelection.boundsTop - mouseupJump)
      expect(continuedLeftShape.groupBoundsBottom).toBeLessThanOrEqual(continuedSelection.boundsBottom + mouseupJump)
      expect(Math.abs(continuedLeftShape.groupBoundsBottom - continuedSelection.boundsBottom))
        .toBeLessThanOrEqual(mouseupJump)

      expect(Math.abs(finalSelection.boundsHeight - continuedSelection.boundsHeight))
        .toBeLessThanOrEqual(mouseupJump)
      expect(Math.abs(finalLeftShape.groupBoundsTop - continuedLeftShape.groupBoundsTop))
        .toBeLessThanOrEqual(mouseupJump)
      expect(Math.abs(finalLeftShape.groupBoundsBottom - continuedLeftShape.groupBoundsBottom))
        .toBeLessThanOrEqual(mouseupJump)

      expect(minimumRightShape.groupBoundsHeight).toBeGreaterThan(0)
      expect(continuedRightShape.groupBoundsHeight).toBeGreaterThan(0)
      expect(finalRightShape.groupBoundsHeight).toBeGreaterThan(0)

      shapes.checkNodeInsideGroup({
        snapshot: minimumLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: minimumRightShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: continuedLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: continuedRightShape,
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

  test('при уменьшении из правого верхнего угла меньший шейп остаётся внутри выделения', async({
    selection,
    shapes
  }) => {
    const minimumSelection = await test.step('Сжать общее выделение из правого верхнего угла до минимального размера', () => {
      return selection.shrinkDiagonallyFromTopRightToMinimum({
        minimumSize: SHAPE_MULTI_SCALING_MINIMUM_TARGET_SIZE
      })
    })
    const minimumLeftShape = await test.step('Получить состояние меньшего шейпа на минимальном размере', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id })
    })
    const minimumRightShape = await test.step('Получить состояние высокого шейпа на минимальном размере', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id })
    })

    const continuedSelection = await test.step('Продолжить тянуть угол влево и вниз после упора', () => {
      return selection.dragActiveScaleHandleBy({
        deltaX: SHAPE_MULTI_SCALING_BEYOND_MINIMUM_DRAG_DELTA,
        deltaY: SHAPE_MULTI_SCALING_BEYOND_TOP_MINIMUM_DRAG_DELTA
      })
    })
    const continuedLeftShape = await test.step('Получить состояние меньшего шейпа после продолжения drag', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id })
    })
    const continuedRightShape = await test.step('Получить состояние высокого шейпа после продолжения drag', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id })
    })

    const finalSelection = await test.step('Отпустить мышь и получить итоговое состояние общего выделения', () => {
      return selection.finishScale()
    })
    const finalLeftShape = await test.step('Получить итоговое состояние меньшего шейпа', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id })
    })
    const finalRightShape = await test.step('Получить итоговое состояние высокого шейпа', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id })
    })

    await test.step('Проверить что меньший шейп не вышел за рамку выделения и не дёрнулся после mouseup', () => {
      const { mouseupJump } = SHAPE_MULTI_SCALING_TOLERANCE

      expect(minimumLeftShape.groupBoundsTop).toBeGreaterThanOrEqual(minimumSelection.boundsTop - mouseupJump)
      expect(minimumLeftShape.groupBoundsBottom).toBeLessThanOrEqual(minimumSelection.boundsBottom + mouseupJump)
      expect(Math.abs(minimumLeftShape.groupBoundsBottom - minimumSelection.boundsBottom))
        .toBeLessThanOrEqual(mouseupJump)

      expect(Math.abs(continuedSelection.boundsWidth - minimumSelection.boundsWidth))
        .toBeLessThanOrEqual(mouseupJump)
      expect(Math.abs(continuedSelection.boundsHeight - minimumSelection.boundsHeight))
        .toBeLessThanOrEqual(mouseupJump)
      expect(continuedLeftShape.groupBoundsTop).toBeGreaterThanOrEqual(continuedSelection.boundsTop - mouseupJump)
      expect(continuedLeftShape.groupBoundsBottom).toBeLessThanOrEqual(continuedSelection.boundsBottom + mouseupJump)
      expect(Math.abs(continuedLeftShape.groupBoundsBottom - continuedSelection.boundsBottom))
        .toBeLessThanOrEqual(mouseupJump)

      expect(Math.abs(finalSelection.boundsWidth - continuedSelection.boundsWidth))
        .toBeLessThanOrEqual(mouseupJump)
      expect(Math.abs(finalSelection.boundsHeight - continuedSelection.boundsHeight))
        .toBeLessThanOrEqual(mouseupJump)
      expect(Math.abs(finalLeftShape.groupBoundsTop - continuedLeftShape.groupBoundsTop))
        .toBeLessThanOrEqual(mouseupJump)
      expect(Math.abs(finalLeftShape.groupBoundsBottom - continuedLeftShape.groupBoundsBottom))
        .toBeLessThanOrEqual(mouseupJump)

      expect(minimumRightShape.groupBoundsHeight).toBeGreaterThan(0)
      expect(continuedRightShape.groupBoundsHeight).toBeGreaterThan(0)
      expect(finalRightShape.groupBoundsHeight).toBeGreaterThan(0)

      shapes.checkNodeInsideGroup({
        snapshot: minimumLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: minimumRightShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: continuedLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: continuedRightShape,
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

  test('после сужения и обратного расширения сверху нескольких шейпов разной высоты высота не дёргается после mouseup', async({
    editorModel,
    selection,
    shapes
  }) => {
    await test.step('Сузить несколько шейпов сверху и завершить изменение размера', async() => {
      await selection.scaleVerticallyFromTop({
        scaleY: SHAPE_MULTI_SCALING_SCALE_Y
      })
      await selection.finishScale()
    })

    await test.step('Заново выделить оба шейпа перед обратным расширением', async() => {
      await editorModel.selectAllObjects()
    })

    const narrowedSelectionSnapshot = await test.step('Получить высоту выделения после сужения', () => {
      return selection.getSnapshot()
    })
    const narrowedLeftText = await test.step('Получить текст в меньшем шейпе после сужения', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id })
    })
    const narrowedRightText = await test.step('Получить текст в высоком шейпе после сужения', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id })
    })

    const liveSelectionSnapshot = await test.step('Расширить общее выделение сверху во время drag', () => {
      return selection.scaleVerticallyFromTop({
        scaleY: SHAPE_MULTI_SCALING_EXPAND_SCALE_Y
      })
    })
    const liveLeftShape = await test.step('Получить состояние меньшего шейпа во время обратного расширения', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id })
    })
    const liveRightShape = await test.step('Получить состояние высокого шейпа во время обратного расширения', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id })
    })
    const liveLeftText = await test.step('Получить текст в меньшем шейпе во время обратного расширения', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id })
    })
    const liveRightText = await test.step('Получить текст в высоком шейпе во время обратного расширения', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id })
    })

    await test.step('Проверить что во время обратного расширения высота выросла и текст остался внутри шейпов', () => {
      expect(narrowedLeftText, 'текст в меньшем шейпе после сужения должен существовать').not.toBeNull()
      expect(narrowedRightText, 'текст в высоком шейпе после сужения должен существовать').not.toBeNull()
      expect(liveLeftText, 'текст в меньшем шейпе во время обратного расширения должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в высоком шейпе во время обратного расширения должен существовать').not.toBeNull()

      if (!narrowedLeftText || !narrowedRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать после сужения и во время обратного расширения')
      }

      expect(liveSelectionSnapshot.boundsHeight)
        .toBeGreaterThan(narrowedSelectionSnapshot.boundsHeight + SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(liveLeftText.fontSize).toBe(narrowedLeftText.fontSize)
      expect(liveRightText.fontSize).toBe(narrowedRightText.fontSize)

      shapes.checkNodeInsideGroup({
        snapshot: liveLeftShape,
        kind: 'text'
      })
      shapes.checkNodeInsideGroup({
        snapshot: liveRightShape,
        kind: 'text'
      })
    })

    const finalSelectionSnapshot = await test.step('Отпустить мышь и получить итоговое состояние общего выделения', async() => {
      return selection.finishScale()
    })
    const finalLeftShape = await test.step('Получить итоговое состояние меньшего шейпа после обратного расширения', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id })
    })
    const finalRightShape = await test.step('Получить итоговое состояние высокого шейпа после обратного расширения', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id })
    })
    const finalLeftText = await test.step('Получить итоговый текст в меньшем шейпе после обратного расширения', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id })
    })
    const finalRightText = await test.step('Получить итоговый текст в высоком шейпе после обратного расширения', () => {
      return shapes.getTextNode({ id: SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id })
    })

    await test.step('Проверить что после mouseup размер не дёрнулся и текст остался тем же', () => {
      expect(finalLeftText, 'итоговый текст в меньшем шейпе должен существовать').not.toBeNull()
      expect(finalRightText, 'итоговый текст в высоком шейпе должен существовать').not.toBeNull()

      if (!finalLeftText || !finalRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать до и после mouseup')
      }

      const selectionHeightJump = Math.abs(finalSelectionSnapshot.boundsHeight - liveSelectionSnapshot.boundsHeight)
      const leftHeightJump = Math.abs(finalLeftShape.groupBoundsHeight - liveLeftShape.groupBoundsHeight)
      const rightHeightJump = Math.abs(finalRightShape.groupBoundsHeight - liveRightShape.groupBoundsHeight)
      const leftWidthJump = Math.abs(finalLeftShape.groupBoundsWidth - liveLeftShape.groupBoundsWidth)
      const rightWidthJump = Math.abs(finalRightShape.groupBoundsWidth - liveRightShape.groupBoundsWidth)

      expect(selectionHeightJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(leftHeightJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(rightHeightJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(leftWidthJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(rightWidthJump).toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
      expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
      expect(finalRightText.fontSize).toBe(liveRightText.fontSize)

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
})
