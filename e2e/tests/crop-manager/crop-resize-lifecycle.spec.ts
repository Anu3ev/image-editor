import type { Page } from '@playwright/test'

import { test, expect } from '../../fixtures/editor.fixture'
import {
  EDGE_IMAGE_CROP_ASPECT_MIDDLE_GUIDE_SIZE,
  EDGE_IMAGE_CROP_INSIDE_SNAP_DRAG_PIXELS,
  EDGE_IMAGE_CROP_SOURCE_SIZE
} from '../../fixtures/data/crop-size-indicator.data'
import {
  CropResizeLifecycleTrace,
  type CropResizeLifecycleTraceEntry,
  type CropResizeLifecycleTraceResult,
  type CropResizeLifecycleTraceSnapshot,
  type CropResizeLifecycleTraceStage
} from '../../helpers/browser/crop-resize-lifecycle-trace.helper'
import { waitForCanvasRender } from '../../helpers/canvas-render.helper'
import type { CropModel } from '../../models/crop/crop.model'
import type { EditorModel } from '../../models/editor.model'
import type { HistoryModel } from '../../models/history.model'
import type { ImageModel } from '../../models/image/image.model'
import type { SnappingModel } from '../../models/snapping.model'
import type {
  CropImageSourceInfo,
  CropStateInfo,
  ObjectSizeIndicatorInfo,
  SnappingGuideState
} from '../../types'

/** History state before and after changing the crop frame. */
type CropResizeHistorySnapshot = {
  serializedState: string
  patchCount: number
}

/** State of one live step with guides and the indicator. */
type CropResizeLiveStep = {
  state: CropStateInfo
  guides: SnappingGuideState
  indicator: ObjectSizeIndicatorInfo
}

/** State after a real mouseup. */
type CropResizeMouseupState = CropResizeLiveStep & {
  history: CropResizeHistorySnapshot
}

/** Apply result before checking undo/redo. */
type AppliedCropResizeState = {
  source: CropImageSourceInfo
  history: CropResizeHistorySnapshot
}

/** Prepared image crop with active event recording. */
type ActiveCropResizeScenario = {
  imageId: string
  initialSource: CropImageSourceInfo
  historyBefore: CropResizeHistorySnapshot
  initialState: CropStateInfo
  traceBaseline: CropResizeLifecycleTraceSnapshot
  traceRecorder: CropResizeLifecycleTrace
}

/** All observable states of the verification crop-frame change. */
type CropResizeScenarioResult = Omit<ActiveCropResizeScenario, 'traceRecorder'> & {
  snapped: CropResizeLiveStep
  held: CropResizeLiveStep
  mouseup: CropResizeMouseupState
  applied: AppliedCropResizeState
  sourceAfterUndo: CropImageSourceInfo
  sourceAfterRedo: CropImageSourceInfo
  trace: CropResizeLifecycleTraceResult
}

/** Models required for the complete crop-frame change scenario. */
type CropResizeScenarioModels = {
  page: Page
  editorModel: EditorModel
  crop: CropModel
  images: ImageModel
  snapping: SnappingModel
  history: HistoryModel
}

/** Reads history through the public e2e model and checks the response shape. */
async function readHistorySnapshot(params: {
  history: HistoryModel
}): Promise<CropResizeHistorySnapshot> {
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

/** Creates an image, starts cropping, and begins temporary event recording. */
async function startCropResizeScenario(
  params: Pick<CropResizeScenarioModels, 'page' | 'crop' | 'images' | 'history'>
): Promise<ActiveCropResizeScenario> {
  const { page, crop, images, history } = params
  const image = images.checkCreation({
    imageObject: await images.addFilledImage(EDGE_IMAGE_CROP_SOURCE_SIZE)
  })
  const initialSource = await crop.getImageSourceInfo({ id: image.id })
  const historyBefore = await readHistorySnapshot({ history })
  const initialState = await crop.startImageCrop({
    id: image.id,
    allowFrameOverflow: false,
    preserveAspectRatio: true
  })
  const traceRecorder = new CropResizeLifecycleTrace(page)
  const traceBaseline = await traceRecorder.start()

  expect(initialState.options.allowFrameOverflow).toBe(false)
  expect(initialState.options.preserveAspectRatio).toBe(true)
  expect(traceBaseline.cropRect).toEqual(initialState.rect)

  return {
    imageId: image.id,
    initialSource,
    historyBefore,
    initialState,
    traceBaseline,
    traceRecorder
  }
}

/** Brings the top-right corner to the image-center guide with one mousemove. */
async function dragCropToMiddleGuide(
  params: Pick<CropResizeScenarioModels, 'editorModel' | 'crop' | 'snapping'>
): Promise<CropResizeLiveStep> {
  const { editorModel, crop, snapping } = params
  const state = await crop.dragFrameControlBySourcePixels({
    control: 'tr',
    deltaX: -(EDGE_IMAGE_CROP_SOURCE_SIZE.width - EDGE_IMAGE_CROP_ASPECT_MIDDLE_GUIDE_SIZE.width),
    deltaY: EDGE_IMAGE_CROP_SOURCE_SIZE.height - EDGE_IMAGE_CROP_ASPECT_MIDDLE_GUIDE_SIZE.height,
    pointerSteps: 1
  })
  const guides = await snapping.getGuideState()
  const indicator = await editorModel.requireObjectSizeIndicator()

  expect(state.mode).toBe('image')
  expect(indicator.visible).toBe(true)

  return { state, guides, indicator }
}

/** Performs one microstep within the snapping threshold without ending the active drag. */
async function holdCropInsideSnapThreshold(
  params: Pick<CropResizeScenarioModels, 'editorModel' | 'crop' | 'snapping'>
): Promise<CropResizeLiveStep> {
  const { editorModel, crop, snapping } = params
  const state = await crop.continueFrameResizeBySourcePixels({
    deltaX: -EDGE_IMAGE_CROP_INSIDE_SNAP_DRAG_PIXELS,
    deltaY: EDGE_IMAGE_CROP_INSIDE_SNAP_DRAG_PIXELS,
    pointerSteps: 1
  })
  const guides = await snapping.getGuideState()
  const indicator = await editorModel.requireObjectSizeIndicator()

  expect(state.mode).toBe('image')
  expect(indicator.visible).toBe(true)

  return { state, guides, indicator }
}

/** Finishes resizing with a real mouseup and reads state before apply. */
async function releaseCropResize(
  params: Pick<CropResizeScenarioModels, 'page' | 'editorModel' | 'crop' | 'snapping' | 'history'>
): Promise<CropResizeMouseupState> {
  const { page, editorModel, crop, snapping, history } = params

  await page.mouse.up()
  await waitForCanvasRender({ page })

  const state = await crop.requireState()
  const guides = await snapping.getGuideState()
  const indicator = await editorModel.getObjectSizeIndicator()
  const historySnapshot = await readHistorySnapshot({ history })

  expect(state.mode).toBe('image')
  expect(indicator.visible).toBe(false)

  return {
    state,
    guides,
    indicator,
    history: historySnapshot
  }
}

/** Applies the crop and reads saved image and history data. */
async function applyCropResize(params: {
  crop: CropModel
  history: HistoryModel
  imageId: string
}): Promise<AppliedCropResizeState> {
  const { crop, history, imageId } = params

  await crop.apply()

  const source = await crop.getImageSourceInfo({ id: imageId })
  const historySnapshot = await readHistorySnapshot({ history })

  expect(await crop.isActive()).toBe(false)
  expect(source.width).toBeGreaterThan(0)

  return {
    source,
    history: historySnapshot
  }
}

/** Ensures the mouse is released, recording is finished, and cropping is closed. */
async function finishCropResizeTrace(params: {
  page: Page
  crop: CropModel
  traceRecorder: CropResizeLifecycleTrace
  pointerMayBeDown: boolean
}): Promise<CropResizeLifecycleTraceResult> {
  const { page, crop, traceRecorder, pointerMayBeDown } = params
  let trace: CropResizeLifecycleTraceResult | null = null

  try {
    if (pointerMayBeDown) {
      await page.mouse.up()
      await waitForCanvasRender({ page })
    }
  } finally {
    try {
      trace = await traceRecorder.finish()
    } finally {
      if (await crop.isActive()) await crop.cancel()
    }
  }

  expect(trace, 'трассировка изменения crop frame должна быть завершена').not.toBeNull()
  expect(await crop.isActive(), 'crop должен быть закрыт после очистки').toBe(false)
  if (!trace) throw new Error('Не удалось завершить трассировку изменения crop frame')

  return trace
}

/** Checks the applied crop through real undo and redo. */
async function restoreCropThroughHistory(params: {
  crop: CropModel
  history: HistoryModel
  imageId: string
}): Promise<{
  sourceAfterUndo: CropImageSourceInfo
  sourceAfterRedo: CropImageSourceInfo
}> {
  const { crop, history, imageId } = params

  await history.undo()
  const sourceAfterUndo = await crop.getImageSourceInfo({ id: imageId })
  await history.redo()
  const sourceAfterRedo = await crop.getImageSourceInfo({ id: imageId })

  expect(sourceAfterUndo.id).toBe(imageId)
  expect(sourceAfterRedo.id).toBe(imageId)

  return { sourceAfterUndo, sourceAfterRedo }
}

/** Runs the complete crop-frame change scenario with mandatory cleanup. */
async function runCropResizeScenario(
  models: CropResizeScenarioModels
): Promise<CropResizeScenarioResult> {
  const activeScenario = await startCropResizeScenario(models)
  const { traceRecorder } = activeScenario
  let pointerMayBeDown = false
  let interaction: Pick<CropResizeScenarioResult, 'snapped' | 'held' | 'mouseup' | 'applied'> | null = null
  let trace: CropResizeLifecycleTraceResult | null = null

  try {
    pointerMayBeDown = true
    const snapped = await dragCropToMiddleGuide(models)
    const held = await holdCropInsideSnapThreshold(models)
    const mouseup = await releaseCropResize(models)
    pointerMayBeDown = false
    const applied = await applyCropResize({
      crop: models.crop,
      history: models.history,
      imageId: activeScenario.imageId
    })

    interaction = { snapped, held, mouseup, applied }
  } finally {
    trace = await finishCropResizeTrace({
      page: models.page,
      crop: models.crop,
      traceRecorder,
      pointerMayBeDown
    })
  }

  expect(interaction, 'crop interaction должен завершиться до history-проверки').not.toBeNull()
  expect(trace, 'трассировка crop должна завершиться до проверки history').not.toBeNull()
  if (!interaction || !trace) throw new Error('Сценарий изменения crop frame не был завершён')

  const restored = await restoreCropThroughHistory({
    crop: models.crop,
    history: models.history,
    imageId: activeScenario.imageId
  })

  return {
    imageId: activeScenario.imageId,
    initialSource: activeScenario.initialSource,
    historyBefore: activeScenario.historyBefore,
    initialState: activeScenario.initialState,
    traceBaseline: activeScenario.traceBaseline,
    ...interaction,
    ...restored,
    trace
  }
}

/** Finds the single stage record by the original DOM event's ID. */
function requireTraceEntry(params: {
  trace: CropResizeLifecycleTraceResult
  stage: CropResizeLifecycleTraceStage
  sourceEventId: number | null
}): CropResizeLifecycleTraceEntry {
  const { trace, stage, sourceEventId } = params
  const matches = trace.entries.filter((entry) => {
    return entry.stage === stage && entry.sourceEventId === sourceEventId
  })

  expect(matches, `${stage} должен встретиться один раз для события ${sourceEventId}`).toHaveLength(1)
  expect(matches[0]?.sourceEventId).toBe(sourceEventId)
  if (!matches[0]) throw new Error(`Не найден этап ${stage} для события ${sourceEventId}`)

  return matches[0]
}

/** Checks the processing order of one mousemove during a crop-frame change. */
function expectResizeStepOrder(params: {
  trace: CropResizeLifecycleTraceResult
  sourceEventId: number
}): void {
  const { trace, sourceEventId } = params
  const canvasScaling = requireTraceEntry({ trace, sourceEventId, stage: 'canvas:object:scaling' })
  const cropChanged = requireTraceEntry({ trace, sourceEventId, stage: 'canvas:editor:crop:changed' })
  const targetScaling = requireTraceEntry({ trace, sourceEventId, stage: 'target:scaling' })
  const canvasMove = requireTraceEntry({ trace, sourceEventId, stage: 'canvas:mouse:move' })
  const targetMove = requireTraceEntry({ trace, sourceEventId, stage: 'target:mousemove' })

  expect(canvasScaling.order).toBeLessThan(cropChanged.order)
  expect(cropChanged.order).toBeLessThan(targetScaling.order)
  expect(targetScaling.order).toBeLessThan(canvasMove.order)
  expect(canvasMove.order).toBeLessThan(targetMove.order)
  expect(canvasMove.frame).toEqual(targetScaling.frame)
  expect(canvasMove.cropRect).toEqual(targetScaling.cropRect)
}

/** Checks the relationship and order of events from two real mousemoves. */
function expectResizeMoveLifecycle(trace: CropResizeLifecycleTraceResult): void {
  const scalingEntries = trace.entries.filter((entry) => entry.stage === 'canvas:object:scaling')

  expect(scalingEntries, 'трассировка должна содержать шаг прилипания и шаг удержания').toHaveLength(2)
  expect(scalingEntries.every((entry) => typeof entry.sourceEventId === 'number')).toBe(true)
  const firstEventId = scalingEntries[0]?.sourceEventId
  const secondEventId = scalingEntries[1]?.sourceEventId
  if (typeof firstEventId !== 'number' || typeof secondEventId !== 'number') {
    throw new Error('Оба mousemove должны иметь ID исходного DOM-события')
  }

  expect(firstEventId).not.toBe(secondEventId)
  expectResizeStepOrder({ trace, sourceEventId: firstEventId })
  expectResizeStepOrder({ trace, sourceEventId: secondEventId })
}

/** Checks the modified → crop update → mouseup order and temporary UI cleanup. */
function expectMouseupLifecycle(params: {
  trace: CropResizeLifecycleTraceResult
  expectedRect: CropStateInfo['rect']
}): void {
  const { trace, expectedRect } = params
  const modifiedEntries = trace.entries.filter((entry) => entry.stage === 'canvas:object:modified')

  expect(modifiedEntries, 'трассировка должна содержать один modified после mouseup').toHaveLength(1)
  expect(typeof modifiedEntries[0]?.sourceEventId).toBe('number')
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
  expect(canvasUp.cropRect).toEqual(expectedRect)
  expect(canvasUp.guides).toEqual({ guides: [], spacingGuides: [] })
  expect(canvasUp.indicator.visible).toBe(false)
}

/** Checks snapping, holding, and exact dimensions in source-image pixels. */
function expectSnapHoldGeometry(result: CropResizeScenarioResult): void {
  const expectedSize = EDGE_IMAGE_CROP_ASPECT_MIDDLE_GUIDE_SIZE

  expect(result.initialState.rect.width).toBe(EDGE_IMAGE_CROP_SOURCE_SIZE.width)
  expect(result.initialState.rect.height).toBe(EDGE_IMAGE_CROP_SOURCE_SIZE.height)
  expect(result.snapped.guides.guides).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: 'horizontal' })
  ]))
  expect(result.held.guides.guides).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: 'horizontal' })
  ]))
  expect(result.snapped.state.rect.width).toBe(expectedSize.width)
  expect(result.snapped.state.rect.height).toBe(expectedSize.height)
  expect(result.held.state.rect).toEqual(result.snapped.state.rect)
  expect(result.held.state.rect.top + result.held.state.rect.height)
    .toBe(EDGE_IMAGE_CROP_SOURCE_SIZE.height)
  expect(result.snapped.indicator).toEqual(expect.objectContaining(expectedSize))
  expect(result.held.indicator).toEqual(expect.objectContaining(expectedSize))
}

/** Checks that geometry and the indicator do not jump after mouseup. */
function expectMouseupParity(result: CropResizeScenarioResult): void {
  expect(result.mouseup.state.rect).toEqual(result.held.state.rect)
  expect(result.mouseup.state.frame).toEqual(result.held.state.frame)
  expect(result.mouseup.guides).toEqual({ guides: [], spacingGuides: [] })
  expect(result.mouseup.indicator.visible).toBe(false)
  expect(result.trace.final.cropRect).toBeNull()
  expect(result.trace.final.guides).toEqual({ guides: [], spacingGuides: [] })
  expect(result.trace.final.indicator.visible).toBe(false)
}

/** Checks that no history is added during the drag and one step is added after apply. */
function expectHistoryLifecycle(result: CropResizeScenarioResult): void {
  const appliedEvents = result.trace.entries.filter((entry) => {
    return entry.stage === 'canvas:editor:crop:applied'
  })

  expect(result.mouseup.history.serializedState).toBe(result.historyBefore.serializedState)
  expect(result.mouseup.history.patchCount).toBe(result.historyBefore.patchCount)
  expect(result.traceBaseline.historyPatchCount).toBe(result.historyBefore.patchCount)
  expect(result.applied.history.patchCount).toBe(result.historyBefore.patchCount + 1)
  expect(appliedEvents, 'apply должен опубликовать одно crop-событие').toHaveLength(1)
  expect(appliedEvents[0]?.sourceEventId).toBeNull()
  expect(appliedEvents[0]?.historyPatchCount).toBe(result.applied.history.patchCount)
  expect(result.trace.final.historyPatchCount).toBe(result.applied.history.patchCount)
}

/** Checks that undo/redo restore the source image's crop. */
function expectCropSourceHistory(result: CropResizeScenarioResult): void {
  const expectedSize = EDGE_IMAGE_CROP_ASPECT_MIDDLE_GUIDE_SIZE

  expect(result.applied.source.width).toBe(expectedSize.width)
  expect(result.applied.source.height).toBe(expectedSize.height)
  expect(result.sourceAfterUndo).toEqual(result.initialSource)
  expect(result.sourceAfterRedo).toEqual(result.applied.source)
}

test('не сдвигает пропорциональный crop после прилипания к середине изображения и сохраняет undo/redo', async({
  page,
  editorModel,
  crop,
  images,
  snapping,
  history
}) => {
  const result = await test.step('Пройти snap, удержание, mouseup, apply, undo и redo', async() => {
    return runCropResizeScenario({
      page,
      editorModel,
      crop,
      images,
      snapping,
      history
    })
  })

  await test.step('Проверить геометрию и индикатор во время удержания', () => {
    expectSnapHoldGeometry(result)
  })

  await test.step('Проверить отсутствие сдвига и временного UI после mouseup', () => {
    expectMouseupParity(result)
    expectMouseupLifecycle({ trace: result.trace, expectedRect: result.mouseup.state.rect })
  })

  await test.step('Проверить связь и порядок Fabric-событий двух mousemove', () => {
    expectResizeMoveLifecycle(result.trace)
  })

  await test.step('Проверить history на live, apply, undo и redo', () => {
    expectHistoryLifecycle(result)
    expectCropSourceHistory(result)
  })
})
