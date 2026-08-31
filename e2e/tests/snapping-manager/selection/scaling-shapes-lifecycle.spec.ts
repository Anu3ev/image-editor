import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'
import type { ShapeScaleSnapshot } from '../../../types'

/** Поля шейпа, которые должны восстанавливаться через undo и redo. */
const SHAPE_HISTORY_FIELDS = [
  'width',
  'height',
  'scaleX',
  'scaleY',
  'groupBoundsLeft',
  'groupBoundsTop',
  'groupBoundsWidth',
  'groupBoundsHeight'
] as const satisfies readonly (keyof ShapeScaleSnapshot)[]

/** Точность сравнения геометрии после сериализации в истории. */
const HISTORY_GEOMETRY_PRECISION = 2

test('после mouseup сохраняет геометрию шейпов и скрывает индикатор и направляющие', async({
  activeSelectionShapeScaleSetup: setup,
  editorModel,
  selection,
  shapes,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom }
  })

  const live = await selection.getCompositionSnapshot()
  const liveShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
  const liveTexts = await Promise.all(setup.shapeIds.map((id) => shapes.getTextNode({ id })))
  const indicator = await editorModel.requireObjectSizeIndicator()
  const liveGuides = await snapping.getGuideState()
  const committed = await selection.scaling.finish()
  const afterMouseUp = await selection.getCompositionSnapshot()
  const committedShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
  const committedTexts = await Promise.all(setup.shapeIds.map((id) => shapes.getTextNode({ id })))

  expect(indicator.width).toBe(Math.round(live.selection.boundsWidth))
  expect(indicator.height).toBe(Math.round(live.selection.boundsHeight))
  expect(liveGuides.guides).toHaveLength(2)
  expect(committed.boundsLeft).toBeCloseTo(live.selection.boundsLeft, 5)
  expect(committed.boundsTop).toBeCloseTo(live.selection.boundsTop, 5)
  expect(committed.boundsRight).toBeCloseTo(live.selection.boundsRight, 5)
  expect(committed.boundsBottom).toBeCloseTo(live.selection.boundsBottom, 5)
  expect(afterMouseUp.selection.boundsLeft).toBeCloseTo(live.selection.boundsLeft, 5)
  expect(afterMouseUp.selection.boundsTop).toBeCloseTo(live.selection.boundsTop, 5)
  expect(afterMouseUp.selection.boundsRight).toBeCloseTo(live.selection.boundsRight, 5)
  expect(afterMouseUp.selection.boundsBottom).toBeCloseTo(live.selection.boundsBottom, 5)
  expect((await editorModel.getObjectSizeIndicator()).visible).toBe(false)
  const clearedGuides = await snapping.getGuideState()

  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)

  for (const [index, shape] of committedShapes.entries()) {
    const liveShape = liveShapes[index]
    const liveText = liveTexts[index]
    const committedText = committedTexts[index]
    if (!liveShape || !liveText || !committedText) {
      throw new Error('Состояние до и после mouseup должно содержать оба шейпа и их текст')
    }

    expect(shape.groupBoundsWidth).toBeCloseTo(liveShape.groupBoundsWidth, 5)
    expect(shape.groupBoundsHeight).toBeCloseTo(liveShape.groupBoundsHeight, 5)
    expect(shape.width).toBeCloseTo(shape.groupBoundsWidth, 5)
    expect(shape.height).toBeCloseTo(shape.groupBoundsHeight, 5)
    expect(shape.scaleX).toBeCloseTo(1, 10)
    expect(shape.scaleY).toBeCloseTo(1, 10)
    expect(committedText.fontSize).toBe(liveText.fontSize)
    expect(committedText.lineCount).toBe(liveText.lineCount)
  }
})

test('один скейлинг создаёт одну запись в истории и восстанавливает оба шейпа', async({
  activeSelectionShapeScaleSetup: setup,
  history,
  selection,
  shapes
}) => {
  const baselineShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
  const baselineTexts = await Promise.all(setup.shapeIds.map((id) => shapes.getTextNode({ id })))
  const historyBefore = await history.getPosition()

  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom }
  })
  await selection.scaling.finish()

  const committedShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
  const committedTexts = await Promise.all(setup.shapeIds.map((id) => shapes.getTextNode({ id })))
  const saved = await history.flushPendingSave()
  const historyAfter = await history.getPosition()

  expect(saved, 'завершённый скейлинг должен сохраниться в истории').toBe(true)
  expect(historyAfter.patchCount).toBe(historyBefore.patchCount + 1)
  expect(historyAfter.currentIndex).toBe(historyBefore.currentIndex + 1)

  await history.undo()
  const undoneShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
  const undoneTexts = await Promise.all(setup.shapeIds.map((id) => shapes.getTextNode({ id })))
  await history.redo()
  const redoneShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
  const redoneTexts = await Promise.all(setup.shapeIds.map((id) => shapes.getTextNode({ id })))

  for (const [index, baselineShape] of baselineShapes.entries()) {
    const committedShape = committedShapes[index]
    const undoneShape = undoneShapes[index]
    const redoneShape = redoneShapes[index]
    const baselineText = baselineTexts[index]
    const committedText = committedTexts[index]
    const undoneText = undoneTexts[index]
    const redoneText = redoneTexts[index]
    if (!committedShape || !undoneShape || !redoneShape
      || !baselineText || !committedText || !undoneText || !redoneText) {
      throw new Error('История должна содержать оба шейпа и их текст')
    }

    for (const field of SHAPE_HISTORY_FIELDS) {
      expect(undoneShape[field]).toBeCloseTo(baselineShape[field], HISTORY_GEOMETRY_PRECISION)
      expect(redoneShape[field]).toBeCloseTo(committedShape[field], HISTORY_GEOMETRY_PRECISION)
    }
    expect(undoneText).toMatchObject({ fontSize: baselineText.fontSize, lineCount: baselineText.lineCount })
    expect(redoneText).toMatchObject({ fontSize: committedText.fontSize, lineCount: committedText.lineCount })
  }
})

test('после отмены указателя очищает направляющие и начинает новую сессию', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  shapes,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'ml' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.left, y: setup.initial.selection.centerY }
  })

  expect((await snapping.getGuideState()).guides).toHaveLength(1)

  await selection.scaling.cancelWithPointerEvent()

  const clearedGuides = await snapping.getGuideState()
  const cancelledShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))

  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
  for (const shape of cancelledShapes) {
    expect(shape.scaleX).toBeCloseTo(1, 10)
    expect(shape.scaleY).toBeCloseTo(1, 10)
  }

  const current = await selection.getCompositionSnapshot()
  await selection.scaling.startFromControl({ control: 'mr' })
  const reacquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: current.selection.centerY }
  })
  const guides = await snapping.getGuideState()

  expect(reacquired.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(guides.guides).toEqual([{
    type: 'vertical',
    position: setup.guides.right
  }])

  await selection.scaling.finish()
})

test('перед удалением шейпа фиксирует видимый размер остальных объектов выделения', async({
  activeSelectionShapeScaleSetup: setup,
  editorModel,
  selection,
  shapes,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom }
  })

  const liveShape = await shapes.getScaleSnapshot({ id: setup.shapeIds[1] })
  const liveText = await shapes.getTextNode({ id: setup.shapeIds[1] })
  const removed = await editorModel.deleteObject({ id: setup.shapeIds[0] })

  await selection.scaling.releasePointerAfterExternalEnd()

  const remainingShape = await shapes.getScaleSnapshot({ id: setup.shapeIds[1] })
  const remainingText = await shapes.getTextNode({ id: setup.shapeIds[1] })
  const guides = await snapping.getGuideState()
  if (!liveText || !remainingText) {
    throw new Error('Оставшийся шейп должен сохранить текст до и после удаления другого объекта')
  }

  expect(removed).toBe(true)
  expect(remainingShape.width).toBeCloseTo(liveShape.groupBoundsWidth, 5)
  expect(remainingShape.height).toBeCloseTo(liveShape.groupBoundsHeight, 5)
  expect(remainingShape.groupBoundsLeft).toBeCloseTo(liveShape.groupBoundsLeft, 5)
  expect(remainingShape.groupBoundsTop).toBeCloseTo(liveShape.groupBoundsTop, 5)
  expect(remainingShape.scaleX).toBeCloseTo(1, 10)
  expect(remainingShape.scaleY).toBeCloseTo(1, 10)
  expect(remainingText.fontSize).toBe(liveText.fontSize)
  expect(remainingText.lineCount).toBe(liveText.lineCount)
  expect(guides.guides).toHaveLength(0)
  expect(guides.spacingGuides).toHaveLength(0)
})

test('при удалении через ShapeManager фиксирует размер и снимает устаревшее общее выделение', async({
  activeSelectionShapeScaleSetup: setup,
  editorModel,
  selection,
  shapes,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom }
  })

  const liveShape = await shapes.getScaleSnapshot({ id: setup.shapeIds[1] })
  const liveText = await shapes.getTextNode({ id: setup.shapeIds[1] })
  const removed = await shapes.remove({ id: setup.shapeIds[0] })

  await selection.scaling.releasePointerAfterExternalEnd()

  const remainingShape = await shapes.getScaleSnapshot({ id: setup.shapeIds[1] })
  const remainingText = await shapes.getTextNode({ id: setup.shapeIds[1] })
  const activeObject = await editorModel.getActiveObject()
  const objects = await editorModel.getObjects()
  const guides = await snapping.getGuideState()
  if (!liveText || !remainingText) {
    throw new Error('Оставшийся шейп должен сохранить текст после удаления через ShapeManager')
  }

  expect(removed).toBe(true)
  expect(activeObject).toBeNull()
  expect(objects.some(({ id }) => id === setup.shapeIds[0])).toBe(false)
  expect(remainingShape.width).toBeCloseTo(liveShape.groupBoundsWidth, 5)
  expect(remainingShape.height).toBeCloseTo(liveShape.groupBoundsHeight, 5)
  expect(remainingShape.scaleX).toBeCloseTo(1, 10)
  expect(remainingShape.scaleY).toBeCloseTo(1, 10)
  expect(remainingText.fontSize).toBe(liveText.fontSize)
  expect(remainingText.lineCount).toBe(liveText.lineCount)
  expect(guides.guides).toHaveLength(0)
  expect(guides.spacingGuides).toHaveLength(0)
})
