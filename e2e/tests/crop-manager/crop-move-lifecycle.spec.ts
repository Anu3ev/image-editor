import type { Page } from '@playwright/test'

import { test, expect } from '../../fixtures/editor.fixture'
import {
  BLOCKED_CROP_DRAG_OFFSET,
  BLOCKED_CROP_DRAG_SHAPE_POSITION,
  BLOCKED_CROP_IMAGE_SIZE,
  BLOCKED_CROP_REFERENCE_SHAPE_SIZE
} from '../../fixtures/data/crop-frame-guides.data'
import {
  beginCropFrameMoveWithMouse,
  CropMoveLifecycleTrace,
  finishCropFrameMoveWithMouse,
  type CropMoveLifecycleTraceEntry,
  type CropMoveLifecycleTraceResult,
  type CropMoveLifecycleTraceStage
} from '../../helpers/browser/crop-move-lifecycle-trace.helper'
import { waitForCanvasRender } from '../../helpers/canvas-render.helper'
import type { CropModel } from '../../models/crop/crop.model'
import type { HistoryModel } from '../../models/history.model'
import type { ImageModel } from '../../models/image.model'
import type { ShapeModel } from '../../models/shape/shape.model'
import type { SnappingModel } from '../../models/snapping.model'
import type {
  CropImageSourceInfo,
  CropStateInfo,
  SnappingGuideState
} from '../../types'

/** Размер crop frame для переноса внутри исходного изображения. */
const CROP_MOVE_FRAME_SIZE = {
  width: 100,
  height: 100
} as const

/** Состояние history до и после переноса crop frame. */
type CropMoveHistorySnapshot = {
  serializedState: string
  patchCount: number
}

/** Сцена с изображением и shape у потенциальной ложной направляющей. */
type CropMoveScene = {
  imageId: string
  initialSource: CropImageSourceInfo
  historyBefore: CropMoveHistorySnapshot
}

/** Активный crop с рассчитанным смещением за правую границу изображения. */
type ActiveCropMoveSession = {
  initialState: CropStateInfo
  expectedFrameLeft: number
  expectedRectLeft: number
  dragDeltaX: number
  traceRecorder: CropMoveLifecycleTrace
}

/** Одно наблюдаемое состояние реального переноса crop frame. */
type CropMoveGestureState = {
  state: CropStateInfo
  guides: SnappingGuideState
  history: CropMoveHistorySnapshot
}

/** Live-состояние и результат после mouseup для одного drag. */
type CropMoveGesture = {
  live: CropMoveGestureState
  mouseup: CropMoveGestureState
}

/** Общие наблюдаемые состояния законченного переноса crop frame. */
interface CropMoveScenarioResult {
  imageId: string
  initialSource: CropImageSourceInfo
  historyBefore: CropMoveHistorySnapshot
  initialState: CropStateInfo
  expectedFrameLeft: number
  expectedRectLeft: number
  dragDeltaX: number
  live: CropMoveGestureState
  mouseup: CropMoveGestureState
  trace: CropMoveLifecycleTraceResult
}

/** Результат переноса crop frame, завершённого через cancel. */
interface CanceledCropMoveResult extends CropMoveScenarioResult {
  historyAfterCancel: CropMoveHistorySnapshot
  sourceAfterCancel: CropImageSourceInfo
}

/** Результат переноса crop frame после apply, undo и redo. */
interface AppliedCropMoveResult extends CropMoveScenarioResult {
  historyAfterApply: CropMoveHistorySnapshot
  sourceAfterApply: CropImageSourceInfo
  sourceAfterUndo: CropImageSourceInfo
  sourceAfterRedo: CropImageSourceInfo
}

/** Модели, необходимые для контрольного переноса crop frame. */
type CropMoveScenarioModels = {
  page: Page
  crop: CropModel
  history: HistoryModel
  images: ImageModel
  shapes: ShapeModel
  snapping: SnappingModel
}

/** Читает history через публичную e2e-модель и проверяет форму ответа. */
async function readHistorySnapshot(params: {
  history: HistoryModel
}): Promise<CropMoveHistorySnapshot> {
  const rawState = await params.history.getSerializedState()

  expect(rawState, 'history snapshot должен существовать').not.toBeNull()
  expect(typeof rawState, 'history snapshot должен быть объектом').toBe('object')
  if (!rawState || typeof rawState !== 'object') {
    throw new Error('History snapshot должен быть объектом')
  }

  const patches = (rawState as { patches?: unknown }).patches
  const serializedState = JSON.stringify(rawState)
  expect(Array.isArray(patches), 'history snapshot должен содержать patches').toBe(true)
  expect(serializedState, 'serialized history snapshot не должен быть пустым').not.toHaveLength(0)
  if (!Array.isArray(patches) || !serializedState) {
    throw new Error('History snapshot должен содержать сериализуемый массив patches')
  }

  return {
    serializedState,
    patchCount: patches.length
  }
}

/** Создаёт изображение и shape там, где могла бы появиться ложная направляющая. */
async function createCropMoveScene(
  models: Pick<CropMoveScenarioModels, 'images' | 'shapes' | 'crop' | 'history'>
): Promise<CropMoveScene> {
  const { images, shapes, crop, history } = models
  const image = images.checkCreation({
    imageObject: await images.addFilledImage(BLOCKED_CROP_IMAGE_SIZE)
  })
  const imageSnapshot = await images.getSnapshot({ id: image.id })
  const shape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      left: imageSnapshot.boundsRight + BLOCKED_CROP_DRAG_SHAPE_POSITION.left,
      top: imageSnapshot.boundsTop + BLOCKED_CROP_DRAG_SHAPE_POSITION.top,
      width: BLOCKED_CROP_REFERENCE_SHAPE_SIZE.width,
      height: BLOCKED_CROP_REFERENCE_SHAPE_SIZE.height
    }
  })
  const initialSource = await crop.getImageSourceInfo({ id: image.id })
  const historyBefore = await readHistorySnapshot({ history })

  expect(shape, 'shape для проверки ложной направляющей должен существовать').not.toBeNull()
  expect(shape?.id, 'у shape для проверки ложной направляющей должен быть id').toBeDefined()
  expect(initialSource.width).toBe(BLOCKED_CROP_IMAGE_SIZE.width)
  expect(initialSource.height).toBe(BLOCKED_CROP_IMAGE_SIZE.height)

  return {
    imageId: image.id,
    initialSource,
    historyBefore
  }
}

/** Запускает crop, уменьшает frame и рассчитывает движение за правую границу изображения. */
async function startCropMoveSession(params: {
  page: Page
  crop: CropModel
  imageId: string
}): Promise<ActiveCropMoveSession> {
  const { page, crop, imageId } = params

  await crop.startImageCrop({
    id: imageId,
    allowFrameOverflow: false
  })
  const initialState = await crop.setSize(CROP_MOVE_FRAME_SIZE)
  const frameScaleX = Math.abs(initialState.frame.scaleX)
  const sourceBoundaryDeltaX = (
    BLOCKED_CROP_IMAGE_SIZE.width - initialState.rect.left - initialState.rect.width
  ) * frameScaleX
  const traceRecorder = new CropMoveLifecycleTrace(page)
  const baseline = await traceRecorder.start()

  expect(frameScaleX, 'scaleX crop frame должен быть положительным').toBeGreaterThan(0)
  expect(sourceBoundaryDeltaX, 'crop frame должен находиться левее правой границы изображения').toBeGreaterThan(0)
  expect(baseline.cropRect).toEqual(initialState.rect)

  return {
    initialState,
    expectedFrameLeft: initialState.frame.left + sourceBoundaryDeltaX,
    expectedRectLeft: BLOCKED_CROP_IMAGE_SIZE.width - CROP_MOVE_FRAME_SIZE.width,
    dragDeltaX: sourceBoundaryDeltaX + BLOCKED_CROP_DRAG_OFFSET.deltaX,
    traceRecorder
  }
}

/** Выполняет полный drag мышью и читает состояния до и после mouseup. */
async function performCropMoveWithMouse(params: {
  page: Page
  crop: CropModel
  snapping: SnappingModel
  history: HistoryModel
  dragDeltaX: number
}): Promise<CropMoveGesture> {
  const { page, crop, snapping, history, dragDeltaX } = params
  let pointerMayBeDown = false

  try {
    pointerMayBeDown = true
    await beginCropFrameMoveWithMouse({
      page,
      deltaX: dragDeltaX,
      deltaY: 0,
      pointerSteps: 1
    })
    const live = {
      state: await crop.requireState(),
      guides: await snapping.getGuideState(),
      history: await readHistorySnapshot({ history })
    }

    await finishCropFrameMoveWithMouse({ page })
    pointerMayBeDown = false
    const mouseup = {
      state: await crop.requireState(),
      guides: await snapping.getGuideState(),
      history: await readHistorySnapshot({ history })
    }

    expect(live.state.mode).toBe('image')
    expect(mouseup.state.mode).toBe('image')

    return { live, mouseup }
  } finally {
    if (pointerMayBeDown) {
      await page.mouse.up()
      await waitForCanvasRender({ page })
    }
  }
}

/** Завершает трассировку и при ошибке гарантированно закрывает crop. */
async function finishCropMoveTrace(params: {
  crop: CropModel
  traceRecorder: CropMoveLifecycleTrace
}): Promise<CropMoveLifecycleTraceResult> {
  const { crop, traceRecorder } = params
  let trace: CropMoveLifecycleTraceResult | null = null

  try {
    if (await crop.isActive()) await crop.cancel()
  } finally {
    trace = await traceRecorder.finish()
  }

  expect(trace, 'трассировка переноса crop frame должна быть завершена').not.toBeNull()
  expect(await crop.isActive(), 'crop должен быть закрыт после завершения трассировки').toBe(false)
  if (!trace) throw new Error('Не удалось завершить трассировку переноса crop frame')

  return trace
}

/** Выполняет контрольный перенос crop frame и завершает его через cancel. */
async function runCanceledCropMove(models: CropMoveScenarioModels): Promise<CanceledCropMoveResult> {
  const scene = await createCropMoveScene(models)
  const session = await startCropMoveSession({
    page: models.page,
    crop: models.crop,
    imageId: scene.imageId
  })
  let gesture: CropMoveGesture | null = null
  let historyAfterCancel: CropMoveHistorySnapshot | null = null
  let sourceAfterCancel: CropImageSourceInfo | null = null
  let trace: CropMoveLifecycleTraceResult | null = null

  try {
    gesture = await performCropMoveWithMouse({ ...models, dragDeltaX: session.dragDeltaX })
    await models.crop.cancel()
    historyAfterCancel = await readHistorySnapshot({ history: models.history })
    sourceAfterCancel = await models.crop.getImageSourceInfo({ id: scene.imageId })
  } finally {
    trace = await finishCropMoveTrace({ crop: models.crop, traceRecorder: session.traceRecorder })
  }

  expect(gesture, 'перенос crop должен завершиться до проверки cancel').not.toBeNull()
  expect(historyAfterCancel, 'history после crop cancel должен существовать').not.toBeNull()
  expect(sourceAfterCancel, 'данные изображения после crop cancel должны существовать').not.toBeNull()
  expect(trace, 'трассировка cancel должна существовать').not.toBeNull()
  if (!gesture || !historyAfterCancel || !sourceAfterCancel || !trace) {
    throw new Error('Сценарий переноса crop frame с cancel не был завершён')
  }

  return {
    ...scene,
    initialState: session.initialState,
    expectedFrameLeft: session.expectedFrameLeft,
    expectedRectLeft: session.expectedRectLeft,
    dragDeltaX: session.dragDeltaX,
    ...gesture,
    historyAfterCancel,
    sourceAfterCancel,
    trace
  }
}

/** Выполняет контрольный перенос crop frame через apply, undo и redo. */
async function runAppliedCropMove(models: CropMoveScenarioModels): Promise<AppliedCropMoveResult> {
  const scene = await createCropMoveScene(models)
  const session = await startCropMoveSession({
    page: models.page,
    crop: models.crop,
    imageId: scene.imageId
  })
  let gesture: CropMoveGesture | null = null
  let historyAfterApply: CropMoveHistorySnapshot | null = null
  let sourceAfterApply: CropImageSourceInfo | null = null
  let trace: CropMoveLifecycleTraceResult | null = null

  try {
    gesture = await performCropMoveWithMouse({ ...models, dragDeltaX: session.dragDeltaX })
    await models.crop.apply()
    historyAfterApply = await readHistorySnapshot({ history: models.history })
    sourceAfterApply = await models.crop.getImageSourceInfo({ id: scene.imageId })
  } finally {
    trace = await finishCropMoveTrace({ crop: models.crop, traceRecorder: session.traceRecorder })
  }

  expect(gesture, 'перенос crop должен завершиться до проверки apply').not.toBeNull()
  expect(historyAfterApply, 'history после crop apply должен существовать').not.toBeNull()
  expect(sourceAfterApply, 'данные изображения после crop apply должны существовать').not.toBeNull()
  expect(trace, 'трассировка apply должна существовать').not.toBeNull()
  if (!gesture || !historyAfterApply || !sourceAfterApply || !trace) {
    throw new Error('Сценарий переноса crop frame с apply не был завершён')
  }

  await models.history.undo()
  const sourceAfterUndo = await models.crop.getImageSourceInfo({ id: scene.imageId })
  await models.history.redo()
  const sourceAfterRedo = await models.crop.getImageSourceInfo({ id: scene.imageId })

  return {
    ...scene,
    initialState: session.initialState,
    expectedFrameLeft: session.expectedFrameLeft,
    expectedRectLeft: session.expectedRectLeft,
    dragDeltaX: session.dragDeltaX,
    ...gesture,
    historyAfterApply,
    sourceAfterApply,
    sourceAfterUndo,
    sourceAfterRedo,
    trace
  }
}

/** Находит единственную запись этапа по ID исходного DOM-события. */
function requireTraceEntry(params: {
  trace: CropMoveLifecycleTraceResult
  stage: CropMoveLifecycleTraceStage
  sourceEventId: number | null
}): CropMoveLifecycleTraceEntry {
  const { trace, stage, sourceEventId } = params
  const matches = trace.entries.filter((entry) => {
    return entry.stage === stage && entry.sourceEventId === sourceEventId
  })

  expect(matches, `${stage} должен встретиться один раз для события ${sourceEventId}`).toHaveLength(1)
  expect(matches[0]?.sourceEventId).toBe(sourceEventId)
  if (!matches[0]) throw new Error(`Не найден этап ${stage} для события ${sourceEventId}`)

  return matches[0]
}

/** Проверяет порядок обновления crop для одного шага переноса. */
function expectMoveUpdateOrder(params: {
  trace: CropMoveLifecycleTraceResult
  expectedRect: CropStateInfo['rect']
}): void {
  const { trace, expectedRect } = params
  const movingEntries = trace.entries.filter((entry) => entry.stage === 'canvas:object:moving')

  expect(movingEntries, 'трассировка должна содержать один object:moving').toHaveLength(1)
  expect(typeof movingEntries[0]?.sourceEventId).toBe('number')
  const sourceEventId = movingEntries[0]?.sourceEventId
  if (typeof sourceEventId !== 'number') throw new Error('Перенос crop frame должен иметь ID исходного DOM-события')

  const canvasMoving = requireTraceEntry({ trace, sourceEventId, stage: 'canvas:object:moving' })
  const cropChanged = requireTraceEntry({ trace, sourceEventId, stage: 'canvas:editor:crop:changed' })
  const targetMoving = requireTraceEntry({ trace, sourceEventId, stage: 'target:moving' })
  const canvasMove = requireTraceEntry({ trace, sourceEventId, stage: 'canvas:mouse:move' })
  const targetMove = requireTraceEntry({ trace, sourceEventId, stage: 'target:mousemove' })

  expect(canvasMoving.order).toBeLessThan(cropChanged.order)
  expect(cropChanged.order).toBeLessThan(targetMoving.order)
  expect(targetMoving.order).toBeLessThan(canvasMove.order)
  expect(canvasMove.order).toBeLessThan(targetMove.order)
  expect(canvasMoving.frame.left).toBeGreaterThan(targetMoving.frame.left)
  expect(canvasMoving.frame.top).toBe(targetMoving.frame.top)
  expect(canvasMove.frame).toEqual(targetMoving.frame)
  expect(canvasMove.cropRect).toEqual(expectedRect)
  expect(canvasMoving.guides).toEqual({ guides: [], spacingGuides: [] })
  expect(canvasMove.guides).toEqual({ guides: [], spacingGuides: [] })
}

/** Проверяет порядок modified → обновление crop → mouseup и итоговую геометрию. */
function expectMoveMouseupLifecycle(params: {
  trace: CropMoveLifecycleTraceResult
  expectedState: CropStateInfo
}): void {
  const { trace, expectedState } = params
  const modifiedEntries = trace.entries.filter((entry) => entry.stage === 'canvas:object:modified')
  const movementEntry = trace.entries.find((entry) => entry.stage === 'canvas:object:moving')

  expect(modifiedEntries, 'трассировка должна содержать один modified после mouseup').toHaveLength(1)
  expect(typeof modifiedEntries[0]?.sourceEventId).toBe('number')
  expect(movementEntry, 'трассировка должна содержать object:moving до mouseup').toBeDefined()
  const sourceEventId = modifiedEntries[0]?.sourceEventId
  if (typeof sourceEventId !== 'number') throw new Error('Mouseup должен иметь ID исходного DOM-события')

  const canvasModified = requireTraceEntry({ trace, sourceEventId, stage: 'canvas:object:modified' })
  const cropChanged = requireTraceEntry({ trace, sourceEventId, stage: 'canvas:editor:crop:changed' })
  const targetModified = requireTraceEntry({ trace, sourceEventId, stage: 'target:modified' })
  const canvasUp = requireTraceEntry({ trace, sourceEventId, stage: 'canvas:mouse:up' })
  const targetUp = requireTraceEntry({ trace, sourceEventId, stage: 'target:mouseup' })

  expect(canvasModified.order).toBeLessThan(cropChanged.order)
  expect(cropChanged.order).toBeLessThan(targetModified.order)
  expect(targetModified.order).toBeLessThan(canvasUp.order)
  expect(canvasUp.order).toBeLessThan(targetUp.order)
  expect(canvasUp.sourceEventId).not.toBe(movementEntry?.sourceEventId)
  expect(canvasUp.cropRect).toEqual(expectedState.rect)
  expect(canvasUp.frame).toEqual(expect.objectContaining({
    left: expectedState.frame.left,
    top: expectedState.frame.top
  }))
  expect(canvasUp.guides).toEqual({ guides: [], spacingGuides: [] })
}

/** Проверяет ограничение по границе изображения и отсутствие скачка после mouseup. */
function expectClampedMoveGeometry(result: {
  initialState: CropStateInfo
  expectedFrameLeft: number
  expectedRectLeft: number
  live: CropMoveGestureState
  mouseup: CropMoveGestureState
}): void {
  expect(result.initialState.rect.width).toBe(CROP_MOVE_FRAME_SIZE.width)
  expect(result.initialState.rect.height).toBe(CROP_MOVE_FRAME_SIZE.height)
  expect(result.live.state.rect.left).toBe(result.expectedRectLeft)
  expect(result.live.state.rect.top).toBe(result.initialState.rect.top)
  expect(result.live.state.rect.width).toBe(result.initialState.rect.width)
  expect(result.live.state.rect.height).toBe(result.initialState.rect.height)
  expect(result.live.state.frame.left).toBeCloseTo(result.expectedFrameLeft, 6)
  expect(result.live.state.frame.top).toBeCloseTo(result.initialState.frame.top, 6)
  expect(result.mouseup.state.rect).toEqual(result.live.state.rect)
  expect(result.mouseup.state.frame).toEqual(result.live.state.frame)
  expect(result.live.guides).toEqual({ guides: [], spacingGuides: [] })
  expect(result.mouseup.guides).toEqual({ guides: [], spacingGuides: [] })
}

/** Проверяет, что live-перенос и cancel не создают history и не применяют crop. */
function expectCanceledMoveHistory(result: CanceledCropMoveResult): void {
  const cancelledEvents = result.trace.entries.filter((entry) => {
    return entry.stage === 'canvas:editor:crop:cancelled'
  })
  const appliedEvents = result.trace.entries.filter((entry) => {
    return entry.stage === 'canvas:editor:crop:applied'
  })

  expect(result.live.history.serializedState).toBe(result.historyBefore.serializedState)
  expect(result.mouseup.history.serializedState).toBe(result.historyBefore.serializedState)
  expect(result.historyAfterCancel.serializedState).toBe(result.historyBefore.serializedState)
  expect(result.live.history.patchCount).toBe(result.historyBefore.patchCount)
  expect(result.mouseup.history.patchCount).toBe(result.historyBefore.patchCount)
  expect(result.historyAfterCancel.patchCount).toBe(result.historyBefore.patchCount)
  expect(result.trace.baseline.historyPatchCount).toBe(result.historyBefore.patchCount)
  expect(result.sourceAfterCancel).toEqual(result.initialSource)
  expect(cancelledEvents, 'cancel должен опубликовать одно crop-событие').toHaveLength(1)
  expect(cancelledEvents[0]?.sourceEventId).toBeNull()
  expect(cancelledEvents[0]?.historyPatchCount).toBe(result.historyBefore.patchCount)
  expect(appliedEvents).toHaveLength(0)
  expect(result.trace.final.cropRect).toBeNull()
  expect(result.trace.final.guides).toEqual({ guides: [], spacingGuides: [] })
}

/** Проверяет один history-шаг на apply и точное восстановление через undo/redo. */
function expectAppliedMoveHistory(result: AppliedCropMoveResult): void {
  const appliedEvents = result.trace.entries.filter((entry) => {
    return entry.stage === 'canvas:editor:crop:applied'
  })
  const cancelledEvents = result.trace.entries.filter((entry) => {
    return entry.stage === 'canvas:editor:crop:cancelled'
  })

  expect(result.live.history.serializedState).toBe(result.historyBefore.serializedState)
  expect(result.mouseup.history.serializedState).toBe(result.historyBefore.serializedState)
  expect(result.live.history.patchCount).toBe(result.historyBefore.patchCount)
  expect(result.mouseup.history.patchCount).toBe(result.historyBefore.patchCount)
  expect(result.trace.baseline.historyPatchCount).toBe(result.historyBefore.patchCount)
  expect(result.historyAfterApply.patchCount).toBe(result.historyBefore.patchCount + 1)
  expect(result.sourceAfterApply.width).toBe(CROP_MOVE_FRAME_SIZE.width)
  expect(result.sourceAfterApply.height).toBe(CROP_MOVE_FRAME_SIZE.height)
  expect(result.sourceAfterApply.cropX).toBe(result.expectedRectLeft)
  expect(result.sourceAfterApply.cropY).toBe(result.initialState.rect.top)
  expect(appliedEvents, 'apply должен опубликовать одно crop-событие').toHaveLength(1)
  expect(appliedEvents[0]?.sourceEventId).toBeNull()
  expect(appliedEvents[0]?.historyPatchCount).toBe(result.historyAfterApply.patchCount)
  expect(cancelledEvents).toHaveLength(0)
  expect(result.sourceAfterUndo).toEqual(result.initialSource)
  expect(result.sourceAfterRedo).toEqual(result.sourceAfterApply)
  expect(result.trace.final.cropRect).toBeNull()
  expect(result.trace.final.guides).toEqual({ guides: [], spacingGuides: [] })
  expect(result.trace.final.historyPatchCount).toBe(result.historyAfterApply.patchCount)
}

test('при отмене переноса за границу изображения не сохраняет crop и ложные направляющие', async({
  page,
  crop,
  history,
  images,
  shapes,
  snapping
}) => {
  const result = await runCanceledCropMove({ page, crop, history, images, shapes, snapping })

  expectClampedMoveGeometry(result)
  expectMoveUpdateOrder({ trace: result.trace, expectedRect: result.live.state.rect })
  expectMoveMouseupLifecycle({ trace: result.trace, expectedState: result.mouseup.state })
  expectCanceledMoveHistory(result)
})

test('при применении переноса к границе изображения сохраняет один шаг и восстанавливает undo/redo', async({
  page,
  crop,
  history,
  images,
  shapes,
  snapping
}) => {
  const result = await runAppliedCropMove({ page, crop, history, images, shapes, snapping })

  expectClampedMoveGeometry(result)
  expectMoveUpdateOrder({ trace: result.trace, expectedRect: result.live.state.rect })
  expectMoveMouseupLifecycle({ trace: result.trace, expectedState: result.mouseup.state })
  expectAppliedMoveHistory(result)
})
