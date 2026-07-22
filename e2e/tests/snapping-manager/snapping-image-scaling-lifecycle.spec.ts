import { test, expect } from '../../fixtures/editor.fixture'
import type { HistoryModel } from '../../models/history.model'
import type { ImageModel } from '../../models/image.model'
import type {
  ScaleInteractionTrace,
  ScaleInteractionTraceModel,
  ScaleTraceState
} from '../../models/scale-interaction-trace.model'
import type { SnappingObjectSnapshot } from '../../types'

/** Геометрия и scale-поля, которые должны совпадать на всех этапах жеста. */
const IMAGE_GEOMETRY_FIELDS = [
  'boundsLeft', 'boundsTop', 'boundsWidth', 'boundsHeight',
  'boundsRight', 'boundsBottom', 'width', 'height', 'scaleX', 'scaleY'
] as const

/** Точность сравнения после redo: Fabric округляет scale до четырёх знаков. */
const HISTORY_ROUNDTRIP_GEOMETRY_PRECISION = 2

/** Исходное состояние изображения и истории перед движением ручки. */
interface ImageScaleSetup {
  baseline: SnappingObjectSnapshot
  imageId: string
  traceBaseline: ScaleTraceState
}

/** Состояния изображения и запись событий после завершения скейлинга. */
interface ImageScaleGesture {
  committed: SnappingObjectSnapshot
  historySaved: boolean
  live: SnappingObjectSnapshot
  trace: ScaleInteractionTrace
}

/** Добавляет изображение и начинает скейлинг за правую ручку. */
async function startImageScale(params: {
  images: ImageModel
  scaleInteractionTrace: ScaleInteractionTraceModel
}): Promise<ImageScaleSetup> {
  const { images, scaleInteractionTrace } = params
  const imageObject = await images.addFilledImage({
    width: 333,
    height: 222
  })
  const image = images.checkCreation({ imageObject })
  const baseline = await images.getSnapshot({ id: image.id })
  const started = await images.startScaleFromRightHandle({ id: image.id })
  const traceBaseline = await scaleInteractionTrace.startImageScaleTrace({ id: image.id })

  expect(started.boundsWidth).toBe(baseline.boundsWidth)
  expect(started.boundsHeight).toBe(baseline.boundsHeight)

  return {
    baseline,
    imageId: image.id,
    traceBaseline
  }
}

/** Увеличивает изображение одним движением мыши и завершает скейлинг. */
async function finishImageScale(params: {
  history: HistoryModel
  images: ImageModel
  scaleInteractionTrace: ScaleInteractionTraceModel
  setup: ImageScaleSetup
}): Promise<ImageScaleGesture> {
  const { history, images, scaleInteractionTrace, setup } = params
  const live = await images.dragActiveScaleHandleBy({
    deltaX: 24,
    deltaY: 0,
    pointerSteps: 1
  })
  const committed = await images.finishScale({ id: setup.imageId })
  const historySaved = await history.flushPendingSave()
  const trace = await scaleInteractionTrace.finishImageScaleTrace()

  expect(live.boundsWidth).toBeGreaterThan(setup.baseline.boundsWidth)
  expect(historySaved, 'после object:modified изменение должно попасть в историю').toBe(true)

  return {
    committed,
    historySaved,
    live,
    trace
  }
}

/** Проверяет порядок и данные событий одного движения мыши. */
function expectPointerEventSequence(params: { trace: ScaleInteractionTrace }): void {
  const [scaling, mouseMove, modified, mouseUp] = params.trace.events

  expect(params.trace.events.map(({ name }) => name)).toEqual([
    'object:scaling',
    'mouse:move',
    'object:modified',
    'mouse:up'
  ])
  expect(params.trace.events.filter(({ name }) => name === 'object:modified')).toHaveLength(1)
  expect(params.trace.events.filter(({ name }) => name === 'mouse:up')).toHaveLength(1)

  if (!scaling || !mouseMove || !modified || !mouseUp) {
    throw new Error('Запись скейлинга изображения должна содержать четыре события Fabric')
  }

  expect(scaling.pointerEventId).not.toBeNull()
  expect(mouseMove.pointerEventId).toBe(scaling.pointerEventId)
  expect(modified.pointerEventId).not.toBe(scaling.pointerEventId)
  expect(mouseUp.pointerEventId).toBe(modified.pointerEventId)
  expect(mouseMove.pointer).toEqual(scaling.pointer)
  expect(mouseUp.pointer).toEqual(modified.pointer)
  expect(scaling.pointer).toEqual(expect.objectContaining({
    type: 'mousemove',
    button: 0,
    buttons: 1,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false
  }))
  expect(mouseUp.pointer).toEqual(expect.objectContaining({
    type: 'mouseup',
    button: 0,
    buttons: 0
  }))
  expect(scaling.transform).toEqual(expect.objectContaining({
    action: 'scaleX',
    corner: 'mr',
    originX: 'left',
    originY: 0.5
  }))
  expect(mouseMove.transform).toEqual(scaling.transform)
  expect(mouseUp.transform).toEqual(modified.transform)
}

/** Проверяет размер, гайды и индикатор до и после mouseup. */
function expectStableScaleResult(params: {
  baseline: SnappingObjectSnapshot
  gesture: ImageScaleGesture
}): void {
  const { baseline, gesture } = params
  const [scaling, mouseMove, modified, mouseUp] = gesture.trace.events

  if (!scaling || !mouseMove || !modified || !mouseUp) {
    throw new Error('Запись скейлинга должна существовать для проверки итоговой геометрии')
  }

  for (const event of [scaling, mouseMove, modified, mouseUp]) {
    for (const field of IMAGE_GEOMETRY_FIELDS) {
      expect(event.snapshot[field]).toBe(gesture.committed[field])
    }
  }

  expect(gesture.live).toEqual(gesture.committed)
  expect(gesture.trace.final.snapshot).toEqual(mouseUp.snapshot)
  expect(gesture.committed.width).toBe(baseline.width)
  expect(gesture.committed.height).toBe(baseline.height)
  expect(gesture.committed.scaleX).toBeGreaterThan(baseline.scaleX)
  expect(gesture.committed.scaleY).toBe(baseline.scaleY)
  expect(scaling.guideState).toEqual({ guides: [], spacingGuides: [] })
  expect(mouseMove.guideState).toEqual(scaling.guideState)
  expect(scaling.indicator).toEqual(expect.objectContaining({
    visible: true,
    width: Math.round(gesture.live.boundsWidth),
    height: Math.round(gesture.live.boundsHeight)
  }))
  expect(modified.indicator.visible).toBe(false)
  expect(mouseUp.indicator).toEqual(modified.indicator)
  expect(gesture.trace.final.guideState).toEqual({ guides: [], spacingGuides: [] })
  expect(gesture.trace.final.indicator.visible).toBe(false)
}

/** Проверяет одну запись в истории и восстановление размера через undo/redo. */
async function expectHistoryRoundtrip(params: {
  gesture: ImageScaleGesture
  history: HistoryModel
  images: ImageModel
  setup: ImageScaleSetup
}): Promise<void> {
  const { gesture, history, images, setup } = params

  expect(gesture.historySaved).toBe(true)
  expect(gesture.trace.final.history.patchCount).toBe(setup.traceBaseline.history.patchCount + 1)
  expect(gesture.trace.final.history.currentIndex).toBe(setup.traceBaseline.history.currentIndex + 1)
  expect(gesture.trace.final.history.serializedSnapshot)
    .not.toBe(setup.traceBaseline.history.serializedSnapshot)
  const baselinePatchCount = setup.traceBaseline.history.patchCount

  expect(gesture.trace.events.map(({ history: eventHistory }) => eventHistory.patchCount))
    .toEqual([
      baselinePatchCount,
      baselinePatchCount,
      baselinePatchCount,
      baselinePatchCount
    ])

  await history.undo()

  const restored = await images.getSnapshot({ id: setup.imageId })
  for (const field of IMAGE_GEOMETRY_FIELDS) {
    expect(restored[field]).toBeCloseTo(setup.baseline[field], 5)
  }

  await history.redo()

  const redone = await images.getSnapshot({ id: setup.imageId })
  for (const field of IMAGE_GEOMETRY_FIELDS) {
    expect(redone[field]).toBeCloseTo(
      gesture.committed[field],
      HISTORY_ROUNDTRIP_GEOMETRY_PRECISION
    )
  }
}

test.describe('Изменение ширины изображения правой ручкой', () => {
  test('увеличивает изображение без скачка после mouseup и восстанавливает результат через undo/redo', async({
    editorModel,
    history,
    images
  }) => {
    const setup = await test.step('Добавить изображение и зажать правую ручку', () => startImageScale({
      images,
      scaleInteractionTrace: editorModel.scaleInteractionTrace
    }))

    const gesture = await test.step('Увеличить изображение и отпустить мышь', () => finishImageScale({
      history,
      images,
      scaleInteractionTrace: editorModel.scaleInteractionTrace,
      setup
    }))

    await test.step('Проверить порядок событий одного движения мыши', () => {
      expectPointerEventSequence({ trace: gesture.trace })
    })

    await test.step('Проверить размер, гайды и индикатор до и после mouseup', () => {
      expectStableScaleResult({ baseline: setup.baseline, gesture })
    })

    await test.step('Проверить одно изменение в истории и undo/redo', () => expectHistoryRoundtrip({
      gesture,
      history,
      images,
      setup
    }))
  })
})
