import { test, expect } from '../../fixtures/editor.fixture'
import type {
  ScaleInteractionTrace,
  ScaleTraceChildSnapshot,
  ScaleTraceEvent,
  ScaleTraceState
} from '../../models/scale-interaction-trace.model'
import type { EditorModel } from '../../models/editor.model'
import type { ShapeModel } from '../../models/shape/shape.model'
import type { ShapeScaleSnapshot, SnappingObjectSnapshot } from '../../types'

/** Допуск дрейфа неподвижного угла из-за округления координат указателя браузером. */
const ACTIVE_SELECTION_ANCHOR_TOLERANCE = 0.1

/** Коэффициент, который даёт один реальный drag правой нижней ручки в этом сценарии. */
const EXPECTED_SELECTION_SCALE = 1.2

/** Точность сравнения геометрии во время drag без сериализации history. */
const LIVE_GEOMETRY_PRECISION = 10

/** Точность позиции после сериализации history с четырьмя знаками после запятой. */
const HISTORY_GEOMETRY_PRECISION = 3

/** Ожидаемый порядок Fabric-событий одного реального scale-жеста. */
const EXPECTED_EVENT_ORDER = [
  'object:scaling',
  'mouse:move',
  'object:modified',
  'object:modified',
  'mouse:up'
] as const

/** Пустое состояние обычных и spacing-гайдов вне snap-цели. */
const EMPTY_GUIDE_STATE = { guides: [], spacingGuides: [] } as const

/** События двух последовательных этапов фиксации ActiveSelection на mouseup. */
interface ActiveSelectionScaleEvents {
  scaling: ScaleTraceEvent
  mouseMove: ScaleTraceEvent
  childrenScaled: ScaleTraceEvent
  childrenResized: ScaleTraceEvent
  mouseUp: ScaleTraceEvent
}

/** Размер и scale шейпа в записанном состоянии. */
interface ShapeSizeAndScaleState {
  width: number
  height: number
  scaleX: number
  scaleY: number
}

/** Проверяет порядок событий и возвращает их в именованной форме. */
function resolveActiveSelectionScaleEvents(
  trace: ScaleInteractionTrace
): ActiveSelectionScaleEvents {
  expect(trace.events.map(({ name }) => name), 'Fabric events должны идти в наблюдаемом порядке')
    .toEqual(EXPECTED_EVENT_ORDER)
  expect(
    trace.events.filter(({ name }) => name === 'object:modified'),
    'ActiveSelection должен эмитить два observable modified events'
  ).toHaveLength(2)

  const [scaling, mouseMove, childrenScaled, childrenResized, mouseUp] = trace.events
  if (!scaling || !mouseMove || !childrenScaled || !childrenResized || !mouseUp) {
    throw new Error('Запись scale общего выделения должна содержать пять событий')
  }

  return { scaling, mouseMove, childrenScaled, childrenResized, mouseUp }
}

/** Проверяет, какие события Fabric относятся к одному движению или отпусканию мыши. */
function expectPointerEventSequence(events: ActiveSelectionScaleEvents): void {
  const { scaling, mouseMove, childrenScaled, childrenResized, mouseUp } = events

  expect(scaling.pointerEventId, 'первое движение мыши должно получить номер 1').toBe(1)
  expect(mouseMove.pointerEventId, 'scaling и mouse:move должны относиться к одному движению мыши').toBe(1)
  expect(scaling.pointer, 'первое событие scale должно содержать зажатый mousemove').toMatchObject({
    type: 'mousemove',
    button: 0,
    buttons: 1,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false
  })
  expect(mouseMove.pointer, 'оба события scale должны содержать одно движение мыши').toEqual(scaling.pointer)
  expect(scaling.pointer.clientX, 'mousemove должен содержать clientX').not.toBeNull()
  expect(scaling.pointer.clientY, 'mousemove должен содержать clientY').not.toBeNull()

  expect(childrenScaled.pointerEventId, 'первый modified возникает без события указателя').toBeNull()
  expect(childrenScaled.pointer.type, 'у первого modified не должно быть типа события указателя').toBeNull()
  expect(childrenResized.pointerEventId, 'mouseup должен получить следующий номер').toBe(2)
  expect(mouseUp.pointerEventId, 'второй modified и mouse:up должны относиться к одному mouseup').toBe(2)
  expect(childrenResized.pointer, 'второй modified должен содержать отпущенный mouseup').toMatchObject({
    type: 'mouseup',
    button: 0,
    buttons: 0
  })
  expect(mouseUp.pointer, 'оба события mouseup должны содержать одно событие указателя').toEqual(childrenResized.pointer)
  expect(childrenScaled.transform, 'первый modified должен содержать активный scale transform')
    .toEqual(scaling.transform)
  expect(childrenResized.transform, 'второй modified должен содержать тот же scale transform')
    .toEqual(scaling.transform)
  expect(mouseUp.transform, 'после modified Fabric должен очистить текущий transform').toBeNull()
}

/** Проверяет собственный размер и scale шейпа. */
function expectShapeSizeAndScale(params: {
  snapshot: ShapeSizeAndScaleState
  width: number
  height: number
  scale: number
}): void {
  const { snapshot, width, height, scale } = params

  expect(snapshot.width, 'собственная width шейпа должна соответствовать ожидаемому этапу')
    .toBeCloseTo(width, LIVE_GEOMETRY_PRECISION)
  expect(snapshot.height, 'собственная height шейпа должна соответствовать ожидаемому этапу')
    .toBeCloseTo(height, LIVE_GEOMETRY_PRECISION)
  expect(snapshot.scaleX, 'scaleX шейпа должен соответствовать ожидаемому этапу')
    .toBeCloseTo(scale, LIVE_GEOMETRY_PRECISION)
  expect(snapshot.scaleY, 'scaleY шейпа должен соответствовать ожидаемому этапу')
    .toBeCloseTo(scale, LIVE_GEOMETRY_PRECISION)
}

/** Проверяет, что при drag правой нижней ручки левый верхний угол не смещается. */
function expectTopLeftUnchanged(params: {
  baseline: SnappingObjectSnapshot
  snapshot: SnappingObjectSnapshot
}): void {
  const { baseline, snapshot } = params

  expect(Math.abs(snapshot.boundsLeft - baseline.boundsLeft), 'левый край не должен заметно смещаться')
    .toBeLessThanOrEqual(ACTIVE_SELECTION_ANCHOR_TOLERANCE)
  expect(Math.abs(snapshot.boundsTop - baseline.boundsTop), 'верхний край не должен заметно смещаться')
    .toBeLessThanOrEqual(ACTIVE_SELECTION_ANCHOR_TOLERANCE)
}

/** Проверяет геометрию общего выделения и шейпов во время drag. */
function expectSelectionDuringDrag(params: {
  baseline: ScaleTraceState
  live: SnappingObjectSnapshot
  events: ActiveSelectionScaleEvents
}): void {
  const { baseline, live, events } = params
  const liveEvents = [events.scaling, events.mouseMove]
  const [baselineLeft, baselineRight] = baseline.childSnapshots
  if (!baselineLeft || !baselineRight) throw new Error('Baseline должен содержать два шейпа')

  for (const event of liveEvents) {
    expectTopLeftUnchanged({ baseline: baseline.snapshot, snapshot: event.snapshot })
    expect(event.snapshot.width, 'во время drag собственная width выделения не должна меняться')
      .toBe(baseline.snapshot.width)
    expect(event.snapshot.height, 'во время drag собственная height выделения не должна меняться')
      .toBe(baseline.snapshot.height)
    expect(event.snapshot.scaleX, 'во время drag ширина выделения должна меняться через scaleX')
      .toBeCloseTo(EXPECTED_SELECTION_SCALE, LIVE_GEOMETRY_PRECISION)
    expect(event.snapshot.scaleY, 'во время drag высота выделения должна меняться через scaleY')
      .toBeCloseTo(EXPECTED_SELECTION_SCALE, LIVE_GEOMETRY_PRECISION)
    expect(event.childSnapshots.map(({ id }) => id), 'порядок двух дочерних объектов должен быть стабильным')
      .toEqual(['left-shape', 'right-shape'])

    const [left, right] = event.childSnapshots
    if (!left || !right) throw new Error('Live event должен содержать два шейпа')

    expectShapeSizeAndScale({ snapshot: left, width: baselineLeft.width, height: baselineLeft.height, scale: 1 })
    expectShapeSizeAndScale({ snapshot: right, width: baselineRight.width, height: baselineRight.height, scale: 1 })
    expect(left.boundsWidth, 'визуальная ширина левого шейпа должна учитывать selection scale')
      .toBeCloseTo(baselineLeft.boundsWidth * EXPECTED_SELECTION_SCALE, LIVE_GEOMETRY_PRECISION)
    expect(right.boundsHeight, 'визуальная высота правого шейпа должна учитывать selection scale')
      .toBeCloseTo(baselineRight.boundsHeight * EXPECTED_SELECTION_SCALE, LIVE_GEOMETRY_PRECISION)
  }

  expect(live, 'состояние после движения мыши должно совпадать с событием mouse:move')
    .toEqual(events.mouseMove.snapshot)
  expect(events.scaling.snapshot, 'scaling и mouse:move должны содержать одно состояние выделения')
    .toEqual(events.mouseMove.snapshot)
}

/** Проверяет перенос scale с ActiveSelection на дочерние шейпы. */
function expectScaleTransferredToShapes(params: {
  baseline: ScaleTraceState
  events: ActiveSelectionScaleEvents
}): void {
  const { baseline, events } = params
  const { scaling, childrenScaled } = events
  const [baselineLeft, baselineRight] = baseline.childSnapshots
  const [scaledLeft, scaledRight] = childrenScaled.childSnapshots
  if (!baselineLeft || !baselineRight || !scaledLeft || !scaledRight) {
    throw new Error('Первый modified должен содержать два шейпа')
  }

  expect(childrenScaled.childSnapshots, 'первый modified должен сохранить оба шейпа').toHaveLength(2)
  expectShapeSizeAndScale({
    snapshot: scaledLeft,
    width: baselineLeft.width,
    height: baselineLeft.height,
    scale: EXPECTED_SELECTION_SCALE
  })
  expectShapeSizeAndScale({
    snapshot: scaledRight,
    width: baselineRight.width,
    height: baselineRight.height,
    scale: EXPECTED_SELECTION_SCALE
  })
  expect(childrenScaled.snapshot, 'первый modified должен оставить scale на ActiveSelection')
    .toEqual(scaling.snapshot)
}

/** Проверяет запись scale в собственные размеры шейпов после mouseup. */
function expectScaleSavedInShapeSizes(params: {
  baseline: ScaleTraceState
  committed: SnappingObjectSnapshot
  trace: ScaleInteractionTrace
  events: ActiveSelectionScaleEvents
}): void {
  const { baseline, committed, trace, events } = params
  const { scaling, childrenResized, mouseUp } = events
  const [baselineLeft, baselineRight] = baseline.childSnapshots
  const [resizedLeft, resizedRight] = childrenResized.childSnapshots
  if (!baselineLeft || !baselineRight || !resizedLeft || !resizedRight) {
    throw new Error('Второй modified должен содержать два шейпа')
  }

  expect(childrenResized.childSnapshots, 'второй modified должен сохранить оба шейпа').toHaveLength(2)
  expectShapeSizeAndScale({
    snapshot: resizedLeft,
    width: baselineLeft.width * EXPECTED_SELECTION_SCALE,
    height: baselineLeft.height * EXPECTED_SELECTION_SCALE,
    scale: 1
  })
  expectShapeSizeAndScale({
    snapshot: resizedRight,
    width: baselineRight.width * EXPECTED_SELECTION_SCALE,
    height: baselineRight.height * EXPECTED_SELECTION_SCALE,
    scale: 1
  })
  expect(childrenResized.snapshot.width, 'второй modified должен записать видимую ширину в собственную width')
    .toBeCloseTo(scaling.snapshot.boundsWidth, LIVE_GEOMETRY_PRECISION)
  expect(childrenResized.snapshot.scaleX, 'второй modified должен сбросить selection scaleX').toBe(1)
  expect(childrenResized.snapshot.scaleY, 'второй modified должен сбросить selection scaleY').toBe(1)
  expect(mouseUp.snapshot, 'mouse:up должен сохранить состояние второго modified').toEqual(childrenResized.snapshot)
  expect(mouseUp.childSnapshots, 'mouse:up не должен повторно менять размеры дочерних объектов')
    .toEqual(childrenResized.childSnapshots)
  expect(committed, 'публичный finishScale должен вернуть mouseup-состояние').toEqual(mouseUp.snapshot)
  expect(trace.final.snapshot, 'итоговое состояние выделения должно совпасть с mouseup').toEqual(mouseUp.snapshot)
  expect(trace.final.childSnapshots, 'итоговые состояния шейпов должны совпасть с mouseup')
    .toEqual(mouseUp.childSnapshots)
  expectTopLeftUnchanged({ baseline: baseline.snapshot, snapshot: trace.final.snapshot })
}

/** Проверяет гайды и индикатор размеров до и после mouseup. */
function expectScaleFeedback(params: {
  trace: ScaleInteractionTrace
  events: ActiveSelectionScaleEvents
}): void {
  const { trace, events } = params

  for (const event of [events.scaling, events.mouseMove]) {
    expect(event.guideState, 'в выбранной геометрии гайды не должны появляться').toEqual(EMPTY_GUIDE_STATE)
    expect(event.indicator.visible, 'индикатор размеров должен быть виден во время drag').toBe(true)
    expect(event.indicator.width, 'индикатор должен показывать видимую ширину')
      .toBe(Math.round(event.snapshot.boundsWidth))
    expect(event.indicator.height, 'индикатор должен показывать видимую высоту')
      .toBe(Math.round(event.snapshot.boundsHeight))
  }

  for (const event of [events.childrenScaled, events.childrenResized, events.mouseUp]) {
    expect(event.guideState, 'завершение scale не должно оставлять гайды').toEqual(EMPTY_GUIDE_STATE)
    expect(event.indicator.visible, 'индикатор должен скрыться до завершения mouseup').toBe(false)
    expect(event.indicator.width, 'у скрытого индикатора не должно быть ширины').toBeNull()
    expect(event.indicator.height, 'у скрытого индикатора не должно быть высоты').toBeNull()
  }

  expect(trace.final.guideState, 'после жеста гайды должны быть очищены').toEqual(EMPTY_GUIDE_STATE)
  expect(trace.final.indicator.visible, 'после жеста индикатор должен оставаться скрытым').toBe(false)
}

/** Проверяет, что scale-жест создаёт одну запись в history. */
function expectSingleHistoryChange(params: {
  trace: ScaleInteractionTrace
  flushed: boolean
}): void {
  const { trace, flushed } = params
  const { history: baselineHistory } = trace.baseline

  for (const event of trace.events) {
    expect(event.history.patchCount, 'до сохранения события scale не должны добавлять запись в history')
      .toBe(baselineHistory.patchCount)
    expect(event.history.currentIndex, 'до сохранения события scale не должны двигать позицию history')
      .toBe(baselineHistory.currentIndex)
  }

  expect(flushed, 'отложенное сохранение scale-жеста должно выполниться').toBe(true)
  expect(trace.final.history.patchCount, 'весь жест должен добавить одну запись в history')
    .toBe(baselineHistory.patchCount + 1)
  expect(trace.final.history.currentIndex, 'весь жест должен сдвинуть позицию history один раз')
    .toBe(baselineHistory.currentIndex + 1)
  expect(trace.final.history.serializedSnapshot, 'сохранённое состояние после жеста должно измениться')
    .not.toBe(baselineHistory.serializedSnapshot)
}

/** Сравнивает собственный размер и bounds шейпа на canvas. */
function expectShapeMatchesSnapshot(params: {
  actual: ShapeScaleSnapshot
  expected: ShapeScaleSnapshot
}): void {
  const { actual, expected } = params

  expect(actual.width, 'history должна восстановить собственную width')
    .toBeCloseTo(expected.width, HISTORY_GEOMETRY_PRECISION)
  expect(actual.height, 'history должна восстановить собственную height')
    .toBeCloseTo(expected.height, HISTORY_GEOMETRY_PRECISION)
  expect(actual.scaleX, 'history должна восстановить scaleX').toBeCloseTo(expected.scaleX, 10)
  expect(actual.scaleY, 'history должна восстановить scaleY').toBeCloseTo(expected.scaleY, 10)
  expect(actual.groupBoundsLeft, 'history должна восстановить левый край на canvas')
    .toBeCloseTo(expected.groupBoundsLeft, HISTORY_GEOMETRY_PRECISION)
  expect(actual.groupBoundsTop, 'history должна восстановить верхний край на canvas')
    .toBeCloseTo(expected.groupBoundsTop, HISTORY_GEOMETRY_PRECISION)
  expect(actual.groupBoundsWidth, 'history должна восстановить видимую ширину')
    .toBeCloseTo(expected.groupBoundsWidth, HISTORY_GEOMETRY_PRECISION)
  expect(actual.groupBoundsHeight, 'history должна восстановить видимую высоту')
    .toBeCloseTo(expected.groupBoundsHeight, HISTORY_GEOMETRY_PRECISION)
}

/** Сравнивает восстановленный шейп с его состоянием на mouseup. */
function expectShapeMatchesRecordedChild(params: {
  actual: ShapeScaleSnapshot
  expected: ScaleTraceChildSnapshot
}): void {
  const { actual, expected } = params

  expect(actual.width, 'redo должна восстановить собственную width')
    .toBeCloseTo(expected.width, HISTORY_GEOMETRY_PRECISION)
  expect(actual.height, 'redo должна восстановить собственную height')
    .toBeCloseTo(expected.height, HISTORY_GEOMETRY_PRECISION)
  expect(actual.scaleX, 'redo должна восстановить scaleX').toBeCloseTo(expected.scaleX, 10)
  expect(actual.scaleY, 'redo должна восстановить scaleY').toBeCloseTo(expected.scaleY, 10)
  expect(actual.groupBoundsLeft, 'redo должна восстановить левый край на canvas')
    .toBeCloseTo(expected.boundsLeft, HISTORY_GEOMETRY_PRECISION)
  expect(actual.groupBoundsTop, 'redo должна восстановить верхний край на canvas')
    .toBeCloseTo(expected.boundsTop, HISTORY_GEOMETRY_PRECISION)
  expect(actual.groupBoundsWidth, 'redo должна восстановить видимую ширину')
    .toBeCloseTo(expected.boundsWidth, HISTORY_GEOMETRY_PRECISION)
  expect(actual.groupBoundsHeight, 'redo должна восстановить видимую высоту')
    .toBeCloseTo(expected.boundsHeight, HISTORY_GEOMETRY_PRECISION)
}

/** Проверяет размеры и положение двух шейпов после undo/redo. */
function expectUndoRedoGeometry(params: {
  baseline: ShapeScaleSnapshot[]
  committed: ScaleTraceChildSnapshot[]
  undone: ShapeScaleSnapshot[]
  redone: ShapeScaleSnapshot[]
}): void {
  const { baseline, committed, undone, redone } = params

  expect(baseline, 'исходное состояние должно содержать два шейпа').toHaveLength(2)
  expect(committed, 'состояние после mouseup должно содержать два шейпа').toHaveLength(2)
  expect(undone, 'undo должен оставить два шейпа').toHaveLength(2)
  expect(redone, 'redo должен оставить два шейпа').toHaveLength(2)

  const [baselineLeft, baselineRight] = baseline
  const [committedLeft, committedRight] = committed
  const [undoneLeft, undoneRight] = undone
  const [redoneLeft, redoneRight] = redone
  if (!baselineLeft || !baselineRight || !committedLeft || !committedRight
    || !undoneLeft || !undoneRight || !redoneLeft || !redoneRight) {
    throw new Error('Каждое history-состояние должно содержать оба шейпа')
  }

  // left/top зависят от ActiveSelection, поэтому положение сравнивается по bounds на canvas.
  expectShapeMatchesSnapshot({ actual: undoneLeft, expected: baselineLeft })
  expectShapeMatchesSnapshot({ actual: undoneRight, expected: baselineRight })
  expectShapeMatchesRecordedChild({ actual: redoneLeft, expected: committedLeft })
  expectShapeMatchesRecordedChild({ actual: redoneRight, expected: committedRight })
}

/** Создаёт два шейпа и возвращает их состояния внутри общего выделения. */
async function createTwoShapeSelection(params: {
  editorModel: EditorModel
  shapes: ShapeModel
}): Promise<ShapeScaleSnapshot[]> {
  const { editorModel, shapes } = params
  const montage = await editorModel.getMontageAreaBounds()
  const leftShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'left-shape',
      left: montage.left + 90,
      top: montage.top + 120,
      width: 80,
      height: 60,
      text: ''
    }
  })
  const rightShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'right-shape',
      left: montage.left + 250,
      top: montage.top + 210,
      width: 100,
      height: 70,
      text: ''
    }
  })

  shapes.checkCreation({ shape: leftShape, presetKey: 'square' })
  shapes.checkCreation({ shape: rightShape, presetKey: 'square' })
  if (!leftShape || !rightShape) throw new Error('Добавление должно вернуть оба созданных шейпа')

  expect(leftShape.id, 'первый шейп должен сохранить заданный id').toBe('left-shape')
  expect(rightShape.id, 'второй шейп должен сохранить заданный id').toBe('right-shape')
  await editorModel.selectAllObjects()

  return Promise.all([
    shapes.getScaleSnapshot({ id: 'left-shape' }),
    shapes.getScaleSnapshot({ id: 'right-shape' })
  ])
}

test.describe('Изменение размера двух выделенных фигур', () => {
  test('увеличивает оба шейпа без сдвига левого верхнего угла и восстанавливает их через undo/redo', async({
    editorModel,
    history,
    selection,
    shapes
  }) => {
    const baselineChildren = await createTwoShapeSelection({ editorModel, shapes })
    const baseline = await selection.getSnapshot()
    const started = await selection.startScaleFromControl({ control: 'br' })
    const traceBaseline = await editorModel.scaleInteractionTrace.startActiveSelectionScaleTrace({
      childIds: ['left-shape', 'right-shape']
    })
    const live = await selection.dragActiveScaleHandleBy({
      deltaX: 30,
      deltaY: 20,
      pointerSteps: 1
    })
    const committed = await selection.finishScale()
    const flushed = await history.flushPendingSave()
    const trace = await editorModel.scaleInteractionTrace.finishActiveSelectionScaleTrace()
    const events = resolveActiveSelectionScaleEvents(trace)

    expect(started, 'mousedown не должен менять геометрию выделения').toEqual(baseline)
    expect(traceBaseline, 'исходное состояние записи должно совпадать с состоянием после mousedown')
      .toEqual(trace.baseline)
    expectPointerEventSequence(events)
    expectSelectionDuringDrag({ baseline: trace.baseline, live, events })
    expectScaleTransferredToShapes({ baseline: trace.baseline, events })
    expectScaleSavedInShapeSizes({ baseline: trace.baseline, committed, trace, events })
    expectScaleFeedback({ trace, events })
    expectSingleHistoryChange({ trace, flushed })

    await history.undo()
    const undone = await Promise.all([
      shapes.getScaleSnapshot({ id: 'left-shape' }),
      shapes.getScaleSnapshot({ id: 'right-shape' })
    ])
    await history.redo()
    const redone = await Promise.all([
      shapes.getScaleSnapshot({ id: 'left-shape' }),
      shapes.getScaleSnapshot({ id: 'right-shape' })
    ])

    expectUndoRedoGeometry({
      baseline: baselineChildren,
      committed: trace.final.childSnapshots,
      undone,
      redone
    })
  })
})
