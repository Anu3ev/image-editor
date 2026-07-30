import { test, expect } from '../../../fixtures/editor.fixture'
import type { EditorModel } from '../../../models/editor.model'
import type {
  ScaleInteractionTrace,
  ScaleTraceChildSnapshot,
  ScaleTraceState
} from '../../../models/scale-interaction-trace.model'
import type {
  SelectionModel,
  SelectionScaleCapability,
  SelectionScaleGestureResult
} from '../../../models/selection.model'
import type {
  CropStateInfo,
  SnappingObjectSnapshot
} from '../../../types'

/** Допуск на округление координат реальной ручки до целых client coordinates. */
const ANCHOR_TOLERANCE = 0.25

/** Допуск на округление bounds дочернего объекта после mouseup. */
const MOUSEUP_BOUNDS_TOLERANCE = 1

/** Короткий drag, достаточный для заметного увеличения составного объекта. */
const SHORT_SCALE_DRAG = { deltaX: 24, deltaY: 18, pointerSteps: 1 } as const

/** Все стандартные scale-ручки Fabric-объекта. */
const ALL_SCALE_HANDLES = ['tl', 'tr', 'br', 'bl', 'ml', 'mt', 'mr', 'mb'] as const

/** Scale-ручки общего выделения, в котором отдельный текст запрещает вертикальный resize. */
const TEXT_SELECTION_SCALE_HANDLES = ['tl', 'tr', 'br', 'bl', 'ml', 'mr'] as const

/** События scale, при котором составной объект сохраняет scaleX и scaleY. */
const DIRECT_SCALE_EVENTS = ['object:scaling', 'mouse:move', 'object:modified', 'mouse:up'] as const

/** События scale с переносом результата в размеры дочерних объектов. */
const RESIZED_CHILD_SCALE_EVENTS = [
  'object:scaling',
  'mouse:move',
  'object:modified',
  'object:modified',
  'mouse:up'
] as const

/** Результат одного scale-жеста общего выделения. */
interface CommonSelectionScaleResult {
  capability: SelectionScaleCapability
  gesture: SelectionScaleGestureResult
  trace: ScaleInteractionTrace
}

/** Ожидаемые ручки и состав активного объекта. */
interface ExpectedSelectionControls {
  childIds: string[]
  handles: readonly string[]
  targetId: string | null
  targetType: string
}

/** Возвращает id активной crop-рамки. */
function requireCropFrameId(state: CropStateInfo): string {
  expect(state.frame.id, 'активный crop frame должен иметь id').not.toBeNull()
  expect(typeof state.frame.id, 'id активного crop frame должен быть строкой').toBe('string')
  if (typeof state.frame.id !== 'string') throw new Error('Активный crop frame должен иметь строковый id')

  return state.frame.id
}

/** Масштабирует текущее общее выделение коротким drag и записывает события. */
async function scaleCommonSelection(params: {
  childIds: string[]
  editorModel: EditorModel
  selection: SelectionModel
}): Promise<CommonSelectionScaleResult> {
  const { childIds, editorModel, selection } = params

  expect(childIds.length, 'общее выделение должно содержать минимум два объекта').toBeGreaterThanOrEqual(2)
  expect(new Set(childIds).size, 'id объектов общего выделения должны отличаться').toBe(childIds.length)

  const capability = await selection.getScaleCapability()
  const recordedBaseline = await editorModel.scaleInteractionTrace.startActiveSelectionScaleTrace({ childIds })
  const gesture = await selection.scaleFromBottomRightBy(SHORT_SCALE_DRAG)
  const trace = await editorModel.scaleInteractionTrace.finishActiveSelectionScaleTrace()

  expect(recordedBaseline, 'начало записи должно вернуть исходное состояние').toEqual(trace.baseline)
  expect(gesture.started, 'mousedown не должен менять исходную геометрию').toEqual(trace.baseline.snapshot)

  return { capability, gesture, trace }
}

/** Проверяет доступные ручки и точный состав активного объекта. */
function expectSelectionControls(params: {
  actual: SelectionScaleCapability
  expected: ExpectedSelectionControls
}): void {
  const { actual, expected } = params

  expect(actual.targetType, 'тип активного объекта должен соответствовать сценарию')
    .toBe(expected.targetType)
  expect(actual.targetId, 'id активного объекта должен соответствовать сценарию')
    .toBe(expected.targetId)
  expect([...actual.childIds].sort(), 'активный объект должен содержать ожидаемые дочерние объекты')
    .toEqual([...expected.childIds].sort())
  expect(actual.availableScaleHandles, 'активный объект должен предоставлять ожидаемые scale-ручки')
    .toEqual(expected.handles)
  expect(actual.snapshot.type, 'состояние должно относиться к тому же активному объекту')
    .toBe(expected.targetType)
  expect(actual.snapshot.boundsWidth, 'область выделения должна иметь положительную ширину')
    .toBeGreaterThan(0)
}

/** Проверяет рост выделения без сдвига левого верхнего угла и скачка после mouseup. */
function expectSelectionScaleGeometry(params: {
  result: CommonSelectionScaleResult
  eventOrder: readonly string[]
}): void {
  const { result, eventOrder } = params
  const { capability, gesture, trace } = result
  const scaling = trace.events[0]
  const mouseUp = trace.events[trace.events.length - 1]
  if (!scaling || !mouseUp) throw new Error('Запись scale должна содержать scaling и mouseup')

  expect(trace.events.map(({ name }) => name), 'scale должен пройти через наблюдаемый порядок событий')
    .toEqual(eventOrder)
  expect(gesture.started, 'scale должен начаться с состояния активного объекта').toEqual(capability.snapshot)
  expect(Math.abs(scaling.snapshot.boundsLeft - trace.baseline.snapshot.boundsLeft), 'левый край не должен смещаться')
    .toBeLessThanOrEqual(ANCHOR_TOLERANCE)
  expect(Math.abs(scaling.snapshot.boundsTop - trace.baseline.snapshot.boundsTop), 'верхний край не должен смещаться')
    .toBeLessThanOrEqual(ANCHOR_TOLERANCE)
  expect(scaling.snapshot.boundsWidth, 'во время drag выделение должно стать шире')
    .toBeGreaterThan(trace.baseline.snapshot.boundsWidth)
  expect(scaling.snapshot.boundsHeight, 'во время drag выделение должно стать выше')
    .toBeGreaterThan(trace.baseline.snapshot.boundsHeight)
  expect(mouseUp.name, 'последним событием должен быть mouseup').toBe('mouse:up')
  expect(mouseUp.snapshot, 'mouseup должен содержать итоговое состояние').toEqual(trace.final.snapshot)
  expect(gesture.committed, 'finishScale должен вернуть итоговое состояние записи')
    .toEqual(trace.final.snapshot)
  expect(scaling.indicator.visible, 'во время drag индикатор размеров должен быть виден').toBe(true)
  expect(trace.final.indicator.visible, 'после mouseup индикатор размеров должен скрыться').toBe(false)
}

/** Находит состояние дочернего объекта по id. */
function requireChild(params: {
  children: ScaleTraceChildSnapshot[]
  id: string
}): ScaleTraceChildSnapshot {
  expect(params.id, 'для поиска дочернего объекта нужен непустой id').not.toHaveLength(0)

  const child = params.children.find(({ id }) => id === params.id)
  expect(child, `запись должна содержать дочерний объект ${params.id}`).toBeDefined()
  if (!child) throw new Error(`Состояние дочернего объекта ${params.id} должно существовать`)

  return child
}

/** Проверяет, что bounds дочернего объекта находятся внутри составного объекта на canvas. */
function expectChildInsideContainer(params: {
  child: ScaleTraceChildSnapshot
  container: SnappingObjectSnapshot
}): void {
  const { child, container } = params

  expect(child.boundsLeft, `${child.id}: левый край должен находиться внутри составного объекта`)
    .toBeGreaterThanOrEqual(container.boundsLeft - ANCHOR_TOLERANCE)
  expect(child.boundsTop, `${child.id}: верхний край должен находиться внутри составного объекта`)
    .toBeGreaterThanOrEqual(container.boundsTop - ANCHOR_TOLERANCE)
  expect(child.boundsRight, `${child.id}: правый край должен находиться внутри составного объекта`)
    .toBeLessThanOrEqual(container.boundsRight + ANCHOR_TOLERANCE)
  expect(child.boundsBottom, `${child.id}: нижний край должен находиться внутри составного объекта`)
    .toBeLessThanOrEqual(container.boundsBottom + ANCHOR_TOLERANCE)
}

/** Проверяет рост дочерних объектов во время drag и отсутствие скачка после mouseup. */
function expectChildrenScaleWithoutMouseupJump(trace: ScaleInteractionTrace): void {
  const scaling = trace.events[0]
  if (!scaling) throw new Error('Запись scale должна содержать object:scaling')

  expect(scaling.childSnapshots, 'состояние во время drag должно сохранить число дочерних объектов')
    .toHaveLength(trace.baseline.childSnapshots.length)
  expect(trace.final.childSnapshots, 'состояние после mouseup должно сохранить число дочерних объектов')
    .toHaveLength(trace.baseline.childSnapshots.length)

  for (const baselineChild of trace.baseline.childSnapshots) {
    const liveChild = requireChild({ children: scaling.childSnapshots, id: baselineChild.id })
    const finalChild = requireChild({ children: trace.final.childSnapshots, id: baselineChild.id })

    expectChildInsideContainer({ child: baselineChild, container: trace.baseline.snapshot })
    expectChildInsideContainer({ child: liveChild, container: scaling.snapshot })
    expectChildInsideContainer({ child: finalChild, container: trace.final.snapshot })
    expect(liveChild.boundsWidth, `${baselineChild.id}: видимая ширина должна увеличиться во время scale`)
      .toBeGreaterThan(baselineChild.boundsWidth)
    expect(liveChild.boundsHeight, `${baselineChild.id}: видимая высота должна увеличиться во время scale`)
      .toBeGreaterThan(baselineChild.boundsHeight)
    expect(Math.abs(finalChild.boundsWidth - liveChild.boundsWidth), `${baselineChild.id}: mouseup не должен менять ширину`)
      .toBeLessThanOrEqual(MOUSEUP_BOUNDS_TOLERANCE)
    expect(Math.abs(finalChild.boundsHeight - liveChild.boundsHeight), `${baselineChild.id}: mouseup не должен менять высоту`)
      .toBeLessThanOrEqual(MOUSEUP_BOUNDS_TOLERANCE)
  }
}

/** Возвращает события переноса scale и записи результата в размеры дочерних объектов. */
function resolveChildResizeEvents(trace: ScaleInteractionTrace): {
  childrenScaled: ScaleTraceState
  childrenResized: ScaleTraceState
} {
  const modified = trace.events.filter(({ name }) => name === 'object:modified')

  expect(modified, 'перенос scale в размеры должен создать два modified-события').toHaveLength(2)
  expect(modified[0]?.pointerEventId, 'первый modified должен произойти до mouseup').toBeNull()

  const [childrenScaled, childrenResized] = modified
  if (!childrenScaled || !childrenResized) {
    throw new Error('Оба события изменения дочерних объектов должны существовать')
  }

  return { childrenScaled, childrenResized }
}

/** Проверяет перенос scale дочернего объекта в его собственные размеры. */
function expectChildScaleSavedInSize(params: {
  baseline: ScaleTraceChildSnapshot
  scaled: ScaleTraceChildSnapshot
  resized: ScaleTraceChildSnapshot
}): void {
  const { baseline, scaled, resized } = params

  expect(scaled.width, `${baseline.id}: первый modified должен сохранить собственную width`)
    .toBeCloseTo(baseline.width, 10)
  expect(scaled.height, `${baseline.id}: первый modified должен сохранить собственную height`)
    .toBeCloseTo(baseline.height, 10)
  expect(scaled.scaleX, `${baseline.id}: первый modified должен перенести scaleX на дочерний объект`)
    .toBeGreaterThan(1)
  expect(scaled.scaleY, `${baseline.id}: первый modified должен перенести scaleY на дочерний объект`)
    .toBeGreaterThan(1)
  expect(resized.width, `${baseline.id}: mouseup должен увеличить собственную width`).toBeGreaterThan(baseline.width)
  expect(resized.height, `${baseline.id}: mouseup должен увеличить собственную height`)
    .toBeGreaterThan(baseline.height)
  expect(resized.scaleX, `${baseline.id}: после mouseup scaleX должен сброситься`).toBe(1)
  expect(resized.scaleY, `${baseline.id}: после mouseup scaleY должен сброситься`).toBe(1)
}

/** Проверяет запись scale в размеры всех шейпов или отдельных текстов. */
function expectAllChildScalesSavedInSizes(trace: ScaleInteractionTrace): void {
  const { childrenScaled, childrenResized } = resolveChildResizeEvents(trace)

  expect(trace.final.snapshot.scaleX, 'после mouseup выделение должно сбросить scaleX').toBe(1)
  expect(trace.final.snapshot.scaleY, 'после mouseup выделение должно сбросить scaleY').toBe(1)

  for (const baseline of trace.baseline.childSnapshots) {
    expectChildScaleSavedInSize({
      baseline,
      scaled: requireChild({ children: childrenScaled.childSnapshots, id: baseline.id }),
      resized: requireChild({ children: childrenResized.childSnapshots, id: baseline.id })
    })
  }
}

/** Проверяет, что выделение изображений или Fabric Group сохраняет результат в scale. */
function expectContainerKeepsScale(trace: ScaleInteractionTrace): void {
  const modified = trace.events.filter(({ name }) => name === 'object:modified')

  expect(modified, 'Fabric scale должен создать одно modified-событие').toHaveLength(1)
  expect(trace.final.snapshot.scaleX, 'составной объект должен сохранить scaleX').toBeGreaterThan(1)
  expect(trace.final.snapshot.scaleY, 'составной объект должен сохранить scaleY').toBeGreaterThan(1)

  for (const baseline of trace.baseline.childSnapshots) {
    const finalChild = requireChild({ children: trace.final.childSnapshots, id: baseline.id })

    expect(finalChild.width, `${baseline.id}: собственная width не должна меняться`).toBeCloseTo(baseline.width, 10)
    expect(finalChild.height, `${baseline.id}: собственная height не должна меняться`).toBeCloseTo(baseline.height, 10)
    expect(finalChild.scaleX, `${baseline.id}: локальный scaleX не должен меняться`).toBeCloseTo(baseline.scaleX, 10)
    expect(finalChild.scaleY, `${baseline.id}: локальный scaleY не должен меняться`).toBeCloseTo(baseline.scaleY, 10)
  }
}

/** Проверяет результат scale изображения, шейпа и отдельного текста в одном выделении. */
function expectMixedSelectionScaleResult(params: {
  imageId: string
  shapeId: string
  textId: string
  trace: ScaleInteractionTrace
}): void {
  const { imageId, shapeId, textId, trace } = params
  const { childrenScaled, childrenResized } = resolveChildResizeEvents(trace)
  const baselineShape = requireChild({ children: trace.baseline.childSnapshots, id: shapeId })
  const resizedShape = requireChild({ children: childrenResized.childSnapshots, id: shapeId })

  expect(trace.final.snapshot.scaleX, 'смешанное выделение должно сбросить scaleX').toBe(1)
  expect(resizedShape.width, 'шейп должен записать видимую ширину в собственную width')
    .toBeGreaterThan(baselineShape.width)
  expect(resizedShape.scaleX, 'шейп должен сбросить scaleX').toBe(1)

  for (const id of [imageId, textId]) {
    const baseline = requireChild({ children: trace.baseline.childSnapshots, id })
    const scaledChild = requireChild({ children: childrenScaled.childSnapshots, id })
    const finalChild = requireChild({ children: childrenResized.childSnapshots, id })

    expect(scaledChild.width, `${id}: первый modified должен сохранить собственную width`)
      .toBeCloseTo(baseline.width, 10)
    expect(finalChild.width, `${id}: mouseup должен сохранить собственную width`).toBeCloseTo(baseline.width, 10)
    expect(finalChild.height, `${id}: mouseup должен сохранить собственную height`).toBeCloseTo(baseline.height, 10)
    expect(finalChild.scaleX, `${id}: видимый размер должен остаться в scaleX`).toBeGreaterThan(1)
  }
}

test.describe('Скейлинг разных объектов в общем выделении', () => {
  test('увеличивает два шейпа и сохраняет их размер после mouseup', async({
    editorModel,
    selection,
    shapes
  }) => {
    const montage = await editorModel.getMontageAreaBounds()
    const first = await shapes.addAtBounds({
      presetKey: 'square',
      options: { id: 'shape-first', left: montage.left + 80, top: montage.top + 100, width: 90, height: 70 }
    })
    const second = await shapes.addAtBounds({
      presetKey: 'square',
      options: { id: 'shape-second', left: montage.left + 260, top: montage.top + 190, width: 110, height: 80 }
    })
    shapes.checkCreation({ shape: first, presetKey: 'square' })
    shapes.checkCreation({ shape: second, presetKey: 'square' })
    await editorModel.selectAllObjects()

    const childIds = ['shape-first', 'shape-second']
    const result = await scaleCommonSelection({ childIds, editorModel, selection })

    expectSelectionControls({
      actual: result.capability,
      expected: { childIds, handles: ALL_SCALE_HANDLES, targetId: null, targetType: 'activeselection' }
    })
    expectSelectionScaleGeometry({ result, eventOrder: RESIZED_CHILD_SCALE_EVENTS })
    expectChildrenScaleWithoutMouseupJump(result.trace)
    expectAllChildScalesSavedInSizes(result.trace)
  })

  test('увеличивает два изображения и сохраняет их размер после mouseup', async({
    editorModel,
    images,
    selection
  }) => {
    const first = images.checkCreation({
      imageObject: await images.addFilledImage({ width: 180, height: 100, fill: '#f00', withoutSelection: true })
    })
    const second = images.checkCreation({
      imageObject: await images.addFilledImage({ width: 100, height: 180, fill: '#0f0', withoutSelection: true })
    })
    await editorModel.selectAllObjects()

    const childIds = [first.id, second.id]
    const result = await scaleCommonSelection({ childIds, editorModel, selection })

    expectSelectionControls({
      actual: result.capability,
      expected: { childIds, handles: ALL_SCALE_HANDLES, targetId: null, targetType: 'activeselection' }
    })
    expectSelectionScaleGeometry({ result, eventOrder: DIRECT_SCALE_EVENTS })
    expectChildrenScaleWithoutMouseupJump(result.trace)
    expectContainerKeepsScale(result.trace)
  })

  test('увеличивает два отдельных текста без верхней и нижней боковых ручек', async({
    editorModel,
    selection,
    text
  }) => {
    const montage = await editorModel.getMontageAreaBounds()
    const first = text.checkCreation({
      textObject: await text.add({
        id: 'text-first',
        text: 'Первый',
        left: montage.left + 100,
        top: montage.top + 120,
        originX: 'left',
        originY: 'top',
        width: 120,
        fontSize: 30,
        autoExpand: false
      })
    })
    const second = text.checkCreation({
      textObject: await text.add({
        id: 'text-second',
        text: 'Второй',
        left: montage.left + 260,
        top: montage.top + 210,
        originX: 'left',
        originY: 'top',
        width: 130,
        fontSize: 34,
        autoExpand: false
      })
    })
    expect(first.id, 'первый текст должен сохранить заданный id').toBe('text-first')
    expect(second.id, 'второй текст должен сохранить заданный id').toBe('text-second')
    await editorModel.selectAllObjects()

    const childIds = ['text-first', 'text-second']
    const result = await scaleCommonSelection({ childIds, editorModel, selection })

    expectSelectionControls({
      actual: result.capability,
      expected: { childIds, handles: TEXT_SELECTION_SCALE_HANDLES, targetId: null, targetType: 'activeselection' }
    })
    expectSelectionScaleGeometry({ result, eventOrder: RESIZED_CHILD_SCALE_EVENTS })
    expectChildrenScaleWithoutMouseupJump(result.trace)
    expectAllChildScalesSavedInSizes(result.trace)
  })

  test('увеличивает изображение, шейп и отдельный текст в одном выделении', async({
    editorModel,
    images,
    selection,
    shapes,
    text
  }) => {
    const montage = await editorModel.getMontageAreaBounds()
    const image = images.checkCreation({
      imageObject: await images.addFilledImage({ width: 180, height: 120, withoutSelection: true })
    })
    const shapeId = 'mixed-shape'
    const textId = 'mixed-text'
    const shape = await shapes.addAtBounds({
      presetKey: 'square',
      options: { id: shapeId, left: montage.left + 70, top: montage.top + 90, width: 100, height: 80 }
    })
    const textObject = await text.add({
      id: textId,
      text: 'Текст',
      left: montage.right - 230,
      top: montage.bottom - 160,
      originX: 'left',
      originY: 'top',
      width: 150,
      fontSize: 32,
      autoExpand: false
    })
    shapes.checkCreation({ shape, presetKey: 'square' })
    text.checkCreation({ textObject })
    await editorModel.selectAllObjects()

    const childIds = [image.id, shapeId, textId]
    const result = await scaleCommonSelection({ childIds, editorModel, selection })

    expectSelectionControls({
      actual: result.capability,
      expected: { childIds, handles: TEXT_SELECTION_SCALE_HANDLES, targetId: null, targetType: 'activeselection' }
    })
    expectSelectionScaleGeometry({ result, eventOrder: RESIZED_CHILD_SCALE_EVENTS })
    expectChildrenScaleWithoutMouseupJump(result.trace)
    expectMixedSelectionScaleResult({ imageId: image.id, shapeId, textId, trace: result.trace })
  })

  test('обычная группа масштабируется через угловые и боковые ручки', async({
    editorModel,
    grouping,
    selection,
    shapes
  }) => {
    const montage = await editorModel.getMontageAreaBounds()
    const first = await shapes.addAtBounds({
      presetKey: 'square',
      options: { id: 'group-first', left: montage.left + 100, top: montage.top + 100, width: 90, height: 70 }
    })
    const second = await shapes.addAtBounds({
      presetKey: 'square',
      options: { id: 'group-second', left: montage.left + 260, top: montage.top + 190, width: 110, height: 80 }
    })
    shapes.checkCreation({ shape: first, presetKey: 'square' })
    shapes.checkCreation({ shape: second, presetKey: 'square' })
    await editorModel.selectAllObjects()
    const group = await grouping.groupActiveSelection()
    expect(group.id, 'публичная группировка должна вернуть id созданной группы').toBeDefined()
    if (typeof group.id !== 'string') throw new Error('Созданная группа должна иметь строковый id')

    const childIds = ['group-first', 'group-second']
    const capability = await selection.getScaleCapability()
    await editorModel.scaleInteractionTrace.startGroupScaleTrace({ childIds })
    const gesture = await selection.scaleFromBottomRightBy(SHORT_SCALE_DRAG)
    const trace = await editorModel.scaleInteractionTrace.finishGroupScaleTrace()
    const result = { capability, gesture, trace }

    expectSelectionControls({
      actual: capability,
      expected: { childIds, handles: ALL_SCALE_HANDLES, targetId: group.id, targetType: 'group' }
    })
    expectSelectionScaleGeometry({ result, eventOrder: DIRECT_SCALE_EVENTS })
    expectChildrenScaleWithoutMouseupJump(trace)
    expectContainerKeepsScale(trace)
  })

  test('при настройках по умолчанию общее выделение завершает crop и не включает временную рамку', async({
    crop,
    editorModel,
    images,
    selection,
    shapes
  }) => {
    const montage = await editorModel.getMontageAreaBounds()
    const image = images.checkCreation({
      imageObject: await images.addFilledImage({ width: 220, height: 160, withoutSelection: true })
    })
    const shape = await shapes.addAtBounds({
      presetKey: 'square',
      options: { id: 'default-crop-neighbor', left: montage.left + 60, top: montage.top + 70, width: 80, height: 60 }
    })
    shapes.checkCreation({ shape, presetKey: 'square' })

    const state = await crop.startImageCrop({ id: image.id })
    const frameId = requireCropFrameId(state)
    const frameCapability = await selection.getScaleCapability()
    await editorModel.selectAllObjects()
    const selectionCapability = await selection.getScaleCapability()

    expectSelectionControls({
      actual: frameCapability,
      expected: { childIds: [], handles: ALL_SCALE_HANDLES, targetId: frameId, targetType: 'rect' }
    })
    expect(await crop.isActive(), 'selectAll должен завершить crop с настройками по умолчанию').toBe(false)
    expectSelectionControls({
      actual: selectionCapability,
      expected: {
        childIds: [image.id, 'default-crop-neighbor'],
        handles: ALL_SCALE_HANDLES,
        targetId: null,
        targetType: 'activeselection'
      }
    })
    expect(selectionCapability.childIds, 'временная crop-рамка не должна остаться в общем выделении')
      .not.toContain(frameId)
  })

  test('при сохранении crop после потери выделения временная рамка доступна общему выделению', async({
    crop,
    editorModel,
    images,
    selection,
    shapes
  }) => {
    const montage = await editorModel.getMontageAreaBounds()
    const image = images.checkCreation({
      imageObject: await images.addFilledImage({ width: 220, height: 160, withoutSelection: true })
    })
    const shape = await shapes.addAtBounds({
      presetKey: 'square',
      options: { id: 'persistent-crop-neighbor', left: montage.left + 60, top: montage.top + 70, width: 80, height: 60 }
    })
    shapes.checkCreation({ shape, presetKey: 'square' })

    const state = await crop.startImageCrop({ id: image.id, cancelOnSelectionClear: false })
    const frameId = requireCropFrameId(state)
    const frameCapability = await selection.getScaleCapability()
    await editorModel.selectAllObjects()
    const selectionCapability = await selection.getScaleCapability()

    expectSelectionControls({
      actual: frameCapability,
      expected: { childIds: [], handles: ALL_SCALE_HANDLES, targetId: frameId, targetType: 'rect' }
    })
    expect(await crop.isActive(), 'crop с cancelOnSelectionClear: false должен оставаться активным').toBe(true)
    expectSelectionControls({
      actual: selectionCapability,
      expected: {
        childIds: [image.id, 'persistent-crop-neighbor', frameId],
        handles: ALL_SCALE_HANDLES,
        targetId: null,
        targetType: 'activeselection'
      }
    })
    expect(selectionCapability.childIds, 'общее выделение должно содержать рамку активной crop-области')
      .toContain(frameId)
  })
})
