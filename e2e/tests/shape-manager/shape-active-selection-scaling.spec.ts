import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_MULTI_SCALING_EDITED_TEXT,
  SHAPE_MULTI_SCALING_EXPAND_SCALE_X,
  SHAPE_MULTI_SCALING_LEFT_OPTIONS,
  SHAPE_MULTI_SCALING_RIGHT_OPTIONS,
  SHAPE_MULTI_SCALING_SCALE_X,
  SHAPE_MULTI_SCALING_SCALE_Y,
  SHAPE_MULTI_SCALING_TOLERANCE
} from '../../fixtures/data/shape-multi-scaling.data'

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
