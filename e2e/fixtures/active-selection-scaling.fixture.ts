import { expect } from '@playwright/test'
import { test as editorTest } from './editor.fixture'
import type { EditorModel } from '../models/editor.model'
import type { ImageModel } from '../models/image/image.model'
import type { SelectionModel } from '../models/selection/selection.model'
import type { ShapeModel } from '../models/shape/shape.model'
import type { SnappingModel } from '../models/snapping.model'
import type {
  MontageAreaBoundsInfo,
  SelectionCompositionSnapshot,
  SnappingObjectSnapshot
} from '../types'

/** Ширина опорного шейпа в экранных пикселях. */
const ACTIVE_SELECTION_SCALE_REFERENCE_WIDTH_PX = 8

/** Расстояние от исходной левой границы выделения до опорного шейпа в экранных пикселях. */
const ACTIVE_SELECTION_SCALE_REFERENCE_GAP_PX = 40

/** Общая геометрия сцены для проверки скейлинга составного выделения. */
type ActiveSelectionScaleSetup = Readonly<{
  guides: Readonly<{
    bottom: number
    left: number
    right: number
    top: number
  }>
  initial: SelectionCompositionSnapshot
  leftReference: SnappingObjectSnapshot
  scenePixel: number
  targetMultiplier: number
}>

/** Сцена для проверки скейлинга общего выделения из изображений. */
export type ActiveSelectionImageScaleSetup = ActiveSelectionScaleSetup

/** Сцена для проверки скейлинга общего выделения из шейпов. */
export type ActiveSelectionShapeScaleSetup = ActiveSelectionScaleSetup & Readonly<{
  shapeIds: readonly [string, string]
}>

/** Дополнительные данные для скейлинга общего выделения. */
interface ActiveSelectionScalingFixtures {
  activeSelectionImageScaleSetup: ActiveSelectionImageScaleSetup
  activeSelectionShapeScaleSetup: ActiveSelectionShapeScaleSetup
}

/** Модели, необходимые для подготовки выделения из изображений. */
type ActiveSelectionImageModels = Readonly<{
  editorModel: EditorModel
  images: ImageModel
  selection: SelectionModel
}>

/** Модели, необходимые для подготовки выделения из шейпов. */
type ActiveSelectionShapeModels = Readonly<{
  editorModel: EditorModel
  selection: SelectionModel
  shapes: ShapeModel
}>

/** Геометрия четырёх опорных шейпов вокруг общего выделения. */
type ActiveSelectionScaleReferenceBounds = Readonly<{
  id: string
  left: number
  top: number
  width: number
  height: number
}>

/** Результат подготовки опорных направляющих. */
type ActiveSelectionScaleReferences = Readonly<{
  guides: ActiveSelectionScaleSetup['guides']
  leftReference: SnappingObjectSnapshot
  targetMultiplier: number
}>

/** Добавляет два шейпа с текстом и возвращает их обязательные id. */
async function addShapeSelectionObjects({
  montage,
  shapes
}: {
  montage: MontageAreaBoundsInfo
  shapes: ShapeModel
}): Promise<readonly [string, string]> {
  const bounds = [
    { left: montage.left + 110, top: montage.top + 105, width: 100, height: 90, text: 'Один' },
    { left: montage.left + 255, top: montage.top + 175, width: 110, height: 105, text: 'Два' }
  ] as const
  const ids: string[] = []

  for (const options of bounds) {
    const shape = shapes.checkCreation({
      shape: await shapes.addAtBounds({
        presetKey: 'square',
        options: { ...options, withoutSelection: true }
      }),
      presetKey: 'square'
    })

    expect(typeof shape.id, 'каждый шейп должен иметь id').toBe('string')
    ids.push(shape.id as string)
  }

  if (ids.length !== 2) throw new Error('Сцена должна содержать ровно два шейпа')

  return [ids[0] as string, ids[1] as string]
}

/** Создаёт и выделяет два изображения внутри монтажной области. */
async function createImageSelection({
  editorModel,
  images,
  selection
}: ActiveSelectionImageModels): Promise<Readonly<{
  initial: SelectionCompositionSnapshot
  montage: MontageAreaBoundsInfo
  scenePixel: number
}>> {
  const montage = await editorModel.getMontageAreaBounds()
  const { zoom } = await editorModel.getCanvasState()

  expect(Number.isFinite(zoom), 'масштаб холста должен быть конечным').toBe(true)
  expect(zoom, 'масштаб холста должен быть положительным').toBeGreaterThan(0)

  const first = images.checkCreation({
    imageObject: await images.addFilledImage({
      width: 90,
      height: 70,
      fill: '#ef476f',
      withoutSelection: true
    })
  })
  const second = images.checkCreation({
    imageObject: await images.addFilledImage({
      width: 80,
      height: 100,
      fill: '#06d6a0',
      withoutSelection: true
    })
  })

  await images.moveBoundsTo({ id: first.id, left: montage.left + 120, top: montage.top + 100 })
  await images.moveBoundsTo({ id: second.id, left: montage.left + 250, top: montage.top + 180 })
  await editorModel.selectAllObjects()

  const initial = await selection.getCompositionSnapshot()

  expect(initial.selection.type).toBe('activeselection')
  expect(initial.children).toHaveLength(2)

  return { initial, montage, scenePixel: 1 / zoom }
}

/** Создаёт и выделяет два шейпа с текстом внутри монтажной области. */
async function createShapeSelection({
  editorModel,
  selection,
  shapes
}: ActiveSelectionShapeModels): Promise<Readonly<{
  initial: SelectionCompositionSnapshot
  montage: MontageAreaBoundsInfo
  scenePixel: number
  shapeIds: readonly [string, string]
}>> {
  const montage = await editorModel.getMontageAreaBounds()
  const { zoom } = await editorModel.getCanvasState()

  expect(Number.isFinite(zoom), 'масштаб холста должен быть конечным').toBe(true)
  expect(zoom, 'масштаб холста должен быть положительным').toBeGreaterThan(0)

  const shapeIds = await addShapeSelectionObjects({ montage, shapes })

  await editorModel.selectAllObjects()

  const initial = await selection.getCompositionSnapshot()

  expect(initial.selection.type).toBe('activeselection')
  expect(initial.children).toHaveLength(2)

  return {
    initial,
    montage,
    scenePixel: 1 / zoom,
    shapeIds
  }
}

/** Рассчитывает четыре совместимые направляющие для одного пропорционального множителя. */
function createScaleReferenceBounds({
  initial,
  montage,
  scenePixel
}: {
  initial: SelectionCompositionSnapshot
  montage: MontageAreaBoundsInfo
  scenePixel: number
}): Readonly<{
  bounds: readonly ActiveSelectionScaleReferenceBounds[]
  targetMultiplier: number
}> {
  const gap = ACTIVE_SELECTION_SCALE_REFERENCE_GAP_PX * scenePixel
  const thickness = ACTIVE_SELECTION_SCALE_REFERENCE_WIDTH_PX * scenePixel
  const targetMultiplier = (initial.selection.boundsWidth + gap) / initial.selection.boundsWidth

  if (!Number.isFinite(targetMultiplier) || targetMultiplier <= 1) {
    throw new Error('Множитель контрольного скейлинга должен быть конечным и больше единицы')
  }
  if (!Number.isFinite(thickness) || thickness <= 0) {
    throw new Error('Толщина опорного шейпа должна быть положительной')
  }

  return {
    targetMultiplier,
    bounds: Object.freeze([
      {
        id: 'active-selection-scale-left-reference',
        left: initial.selection.boundsLeft - gap,
        top: montage.centerY,
        width: thickness,
        height: thickness
      },
      {
        id: 'active-selection-scale-right-reference',
        left: initial.selection.boundsLeft + (initial.selection.boundsWidth * targetMultiplier),
        top: montage.centerY,
        width: thickness,
        height: thickness
      },
      {
        id: 'active-selection-scale-top-reference',
        left: montage.centerX,
        top: initial.selection.boundsBottom - (initial.selection.boundsHeight * targetMultiplier),
        width: thickness,
        height: thickness
      },
      {
        id: 'active-selection-scale-bottom-reference',
        left: montage.centerX,
        top: initial.selection.boundsTop + (initial.selection.boundsHeight * targetMultiplier),
        width: thickness,
        height: thickness
      }
    ])
  }
}

/** Добавляет опорные шейпы и возвращает их точные направляющие. */
async function addScaleReferences({
  bounds,
  initial,
  scenePixel,
  shapes,
  snapping,
  targetMultiplier
}: {
  bounds: readonly ActiveSelectionScaleReferenceBounds[]
  initial: SelectionCompositionSnapshot
  scenePixel: number
  shapes: ShapeModel
  snapping: SnappingModel
  targetMultiplier: number
}): Promise<ActiveSelectionScaleReferences> {
  for (const referenceBounds of bounds) {
    const shape = await shapes.addAtBounds({
      presetKey: 'square',
      options: { ...referenceBounds, text: '', withoutSelection: true }
    })
    shapes.checkCreation({ shape, presetKey: 'square' })
  }

  const references = await Promise.all(bounds.map(({ id }) => {
    return snapping.getObjectSnapshot({ id })
  }))
  const [leftReference, rightReference, topReference, bottomReference] = references
  const guides = {
    bottom: bottomReference.boundsTop,
    left: leftReference.boundsLeft,
    right: rightReference.boundsLeft,
    top: topReference.boundsTop
  }

  expect(leftReference.boundsRight).toBeLessThan(initial.selection.boundsLeft)
  expect(leftReference.boundsWidth / scenePixel).toBeCloseTo(ACTIVE_SELECTION_SCALE_REFERENCE_WIDTH_PX, 5)
  expect((initial.selection.boundsRight - guides.left) / initial.selection.boundsWidth)
    .toBeCloseTo(targetMultiplier, 5)
  expect((guides.right - initial.selection.boundsLeft) / initial.selection.boundsWidth)
    .toBeCloseTo(targetMultiplier, 5)
  expect((initial.selection.boundsBottom - guides.top) / initial.selection.boundsHeight)
    .toBeCloseTo(targetMultiplier, 5)
  expect((guides.bottom - initial.selection.boundsTop) / initial.selection.boundsHeight)
    .toBeCloseTo(targetMultiplier, 5)

  return { guides, leftReference, targetMultiplier }
}

/** Создаёт выделение из двух изображений и совместимые опорные направляющие. */
export const test = editorTest.extend<ActiveSelectionScalingFixtures>({
  activeSelectionImageScaleSetup: async({
    editorModel,
    history,
    images,
    selection,
    shapes,
    snapping
  }, use) => {
    const { initial, montage, scenePixel } = await createImageSelection({
      editorModel,
      images,
      selection
    })
    const referenceBounds = createScaleReferenceBounds({ initial, montage, scenePixel })
    const { guides, leftReference, targetMultiplier } = await addScaleReferences({
      ...referenceBounds,
      initial,
      scenePixel,
      shapes,
      snapping
    })
    const setupFlushed = await history.flushPendingSave()

    expect((initial.selection.boundsRight - guides.left) / initial.selection.boundsWidth)
      .toBeCloseTo(targetMultiplier, 5)
    expect(setupFlushed, 'fixture не должен оставлять отложенное сохранение').toBe(false)

    await use({
      guides,
      initial,
      leftReference,
      scenePixel,
      targetMultiplier
    })
  },

  activeSelectionShapeScaleSetup: async({
    editorModel,
    history,
    selection,
    shapes,
    snapping
  }, use) => {
    const {
      initial,
      montage,
      scenePixel,
      shapeIds
    } = await createShapeSelection({ editorModel, selection, shapes })
    const referenceBounds = createScaleReferenceBounds({ initial, montage, scenePixel })
    const { guides, leftReference, targetMultiplier } = await addScaleReferences({
      ...referenceBounds,
      initial,
      scenePixel,
      shapes,
      snapping
    })
    const setupFlushed = await history.flushPendingSave()

    expect((initial.selection.boundsRight - guides.left) / initial.selection.boundsWidth)
      .toBeCloseTo(targetMultiplier, 5)
    expect(setupFlushed, 'fixture не должен оставлять отложенное сохранение').toBe(false)

    await use({
      guides,
      initial,
      leftReference,
      scenePixel,
      shapeIds,
      targetMultiplier
    })
  }
})

export { expect }
