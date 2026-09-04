import { expect } from '@playwright/test'
import { test as editorTest } from './editor.fixture'
import type { EditorModel } from '../models/editor.model'
import type { HistoryModel } from '../models/history.model'
import type { ImageModel } from '../models/image/image.model'
import type { SelectionModel } from '../models/selection/selection.model'
import type { ShapeModel } from '../models/shape/shape.model'
import type { SnappingModel } from '../models/snapping.model'
import type { TextModel } from '../models/text/text.model'
import type {
  MontageAreaBoundsInfo,
  SelectionCompositionSnapshot,
  SnappingObjectSnapshot
} from '../types'
import { ACTIVE_SELECTION_TEXT_SCALE_SEEDS } from './data/active-selection-scaling.data'

/** Ширина опорного шейпа в экранных пикселях. */
const ACTIVE_SELECTION_SCALE_REFERENCE_WIDTH_PX = 8

/** Расстояние от исходной левой границы выделения до опорного шейпа в экранных пикселях. */
const ACTIVE_SELECTION_SCALE_REFERENCE_GAP_PX = 40

/** Смещение текстовой сцены вниз для подхода верхней грани к центру монтажной области. */
const ACTIVE_SELECTION_MONTAGE_TEXT_VERTICAL_OFFSET = 170

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
type ActiveSelectionImageScaleSetup = ActiveSelectionScaleSetup

/** Сцена для проверки скейлинга общего выделения из шейпов. */
type ActiveSelectionShapeScaleSetup = ActiveSelectionScaleSetup & Readonly<{
  shapeIds: readonly [string, string]
}>

/** Сцена для проверки скейлинга общего выделения из отдельных текстов. */
type ActiveSelectionTextScaleSetup = ActiveSelectionScaleSetup & Readonly<{
  textIds: readonly [string, string]
}>

/** Сцена с текстовым выделением для прилипания к направляющим монтажной области. */
type ActiveSelectionMontageTextScaleSetup = Readonly<{
  initial: SelectionCompositionSnapshot
  montage: MontageAreaBoundsInfo
  scenePixel: number
}>

/** Сцена со смешанным выделением, которое пока остаётся на прежнем пути скейлинга. */
type ActiveSelectionMixedScaleSetup = Readonly<{
  imageId: string
  initial: SelectionCompositionSnapshot
  shapeId: string
  textId: string
}>

/** Сцена с изображением и двумя отдельными текстами. */
type ActiveSelectionImageTextScaleSetup = Readonly<{
  imageIds: readonly [string]
  initial: SelectionCompositionSnapshot
  montage: MontageAreaBoundsInfo
  scenePixel: number
  textIds: readonly [string, string]
}>

/** Дополнительные данные для скейлинга общего выделения. */
interface ActiveSelectionScalingFixtures {
  activeSelectionAutoExpandTextScaleSetup: ActiveSelectionTextScaleSetup
  activeSelectionImageScaleSetup: ActiveSelectionImageScaleSetup
  activeSelectionImageTextScaleSetup: ActiveSelectionImageTextScaleSetup
  activeSelectionMixedScaleSetup: ActiveSelectionMixedScaleSetup
  activeSelectionMontageTextScaleSetup: ActiveSelectionMontageTextScaleSetup
  activeSelectionShapeScaleSetup: ActiveSelectionShapeScaleSetup
  activeSelectionTextScaleSetup: ActiveSelectionTextScaleSetup
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

/** Модели, необходимые для подготовки выделения из отдельных текстов. */
type ActiveSelectionTextModels = Readonly<{
  autoExpand: boolean
  editorModel: EditorModel
  selection: SelectionModel
  text: TextModel
}>

/** Параметры подготовки выделения из отдельных текстов. */
type ActiveSelectionTextSetupParams = ActiveSelectionTextModels & Readonly<{
  verticalOffset?: number
}>

/** Модели для подготовки текстовой сцены с опорными направляющими. */
type ActiveSelectionTextScaleFixtureModels = ActiveSelectionTextModels & Readonly<{
  history: HistoryModel
  shapes: ShapeModel
  snapping: SnappingModel
}>

/** Модели, необходимые для подготовки смешанного выделения. */
type ActiveSelectionMixedModels = Readonly<{
  editorModel: EditorModel
  images: ImageModel
  selection: SelectionModel
  shapes: ShapeModel
  text: TextModel
}>

/** Модели, необходимые для подготовки выделения из изображения и текстов. */
type ActiveSelectionImageTextModels = Readonly<{
  editorModel: EditorModel
  images: ImageModel
  selection: SelectionModel
  text: TextModel
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

/** Монтажная область и размер одного экранного пикселя в координатах сцены. */
type ActiveSelectionScaleScene = Readonly<{
  montage: MontageAreaBoundsInfo
  scenePixel: number
}>

/** Возвращает геометрию сцены с проверенным масштабом холста. */
async function getActiveSelectionScaleScene({
  editorModel
}: {
  editorModel: EditorModel
}): Promise<ActiveSelectionScaleScene> {
  const montage = await editorModel.getMontageAreaBounds()
  const { zoom } = await editorModel.getCanvasState()

  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new Error('Масштаб холста должен быть конечным и положительным')
  }

  return { montage, scenePixel: 1 / zoom }
}

/** Выделяет все подготовленные объекты и возвращает проверенный снимок общего выделения. */
async function selectAllAndGetComposition({
  editorModel,
  expectedChildren,
  selection
}: {
  editorModel: EditorModel
  expectedChildren: number
  selection: SelectionModel
}): Promise<SelectionCompositionSnapshot> {
  if (!Number.isInteger(expectedChildren) || expectedChildren < 2) {
    throw new Error('Общее выделение должно содержать минимум два объекта')
  }

  await editorModel.selectAllObjects()
  const snapshot = await selection.getCompositionSnapshot()

  if (snapshot.selection.type !== 'activeselection') {
    throw new Error('Подготовленные объекты должны образовать общее выделение')
  }
  if (snapshot.children.length !== expectedChildren) {
    throw new Error(`Общее выделение должно содержать ${expectedChildren} объекта`)
  }

  return snapshot
}

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
  const { montage, scenePixel } = await getActiveSelectionScaleScene({ editorModel })

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
  const initial = await selectAllAndGetComposition({ editorModel, expectedChildren: 2, selection })

  return { initial, montage, scenePixel }
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
  const { montage, scenePixel } = await getActiveSelectionScaleScene({ editorModel })

  const shapeIds = await addShapeSelectionObjects({ montage, shapes })
  const initial = await selectAllAndGetComposition({ editorModel, expectedChildren: 2, selection })

  return {
    initial,
    montage,
    scenePixel,
    shapeIds
  }
}

/** Добавляет два текста с разной геометрией внутри монтажной области. */
async function addTextSelectionObjects({
  autoExpand,
  montage,
  text,
  verticalOffset = 0
}: {
  autoExpand: boolean
  montage: MontageAreaBoundsInfo
  text: TextModel
  verticalOffset?: number
}): Promise<readonly [string, string]> {
  if (!Number.isFinite(verticalOffset)) throw new Error('Вертикальное смещение текстов должно быть конечным')

  const ids: string[] = []
  for (const seed of ACTIVE_SELECTION_TEXT_SCALE_SEEDS) {
    const created = text.checkCreation({
      textObject: await text.add({
        ...seed.options,
        autoExpand,
        left: montage.left + seed.leftOffset,
        top: montage.top + seed.topOffset + verticalOffset,
        originX: 'left',
        originY: 'top'
      })
    })

    if (created.id !== seed.options.id) throw new Error('Текст сцены должен сохранить заданный id')
    ids.push(created.id)
  }

  if (ids.length !== 2) throw new Error('Сцена должна содержать ровно два текста')

  return [ids[0] as string, ids[1] as string]
}

/** Создаёт и выделяет два текста с разной геометрией внутри монтажной области. */
async function createTextSelection({
  autoExpand,
  editorModel,
  selection,
  text,
  verticalOffset = 0
}: ActiveSelectionTextSetupParams): Promise<Readonly<{
  initial: SelectionCompositionSnapshot
  montage: MontageAreaBoundsInfo
  scenePixel: number
  textIds: readonly [string, string]
}>> {
  const { montage, scenePixel } = await getActiveSelectionScaleScene({ editorModel })
  const textIds = await addTextSelectionObjects({ autoExpand, montage, text, verticalOffset })
  const initial = await selectAllAndGetComposition({ editorModel, expectedChildren: 2, selection })

  return {
    initial,
    montage,
    scenePixel,
    textIds
  }
}

/** Создаёт и выделяет изображение и два отдельных текста. */
async function createImageTextSelection({
  editorModel,
  images,
  selection,
  text
}: ActiveSelectionImageTextModels): Promise<ActiveSelectionImageTextScaleSetup> {
  const { montage, scenePixel } = await getActiveSelectionScaleScene({ editorModel })
  const textIds = await addTextSelectionObjects({ autoExpand: false, montage, text })
  const image = images.checkCreation({
    imageObject: await images.addFilledImage({ width: 210, height: 180, withoutSelection: true })
  })

  await images.moveBoundsTo({ id: image.id, left: montage.left + 170, top: montage.top + 145 })
  const initial = await selectAllAndGetComposition({ editorModel, expectedChildren: 3, selection })

  return { imageIds: [image.id], initial, montage, scenePixel, textIds }
}

/** Создаёт и выделяет изображение, шейп и отдельный текст. */
async function createMixedSelection({
  editorModel,
  images,
  selection,
  shapes,
  text
}: ActiveSelectionMixedModels): Promise<ActiveSelectionMixedScaleSetup> {
  const montage = await editorModel.getMontageAreaBounds()
  const image = images.checkCreation({
    imageObject: await images.addFilledImage({ width: 120, height: 90, withoutSelection: true })
  })
  const shapeId = 'mixed-selection-shape'
  const textId = 'mixed-selection-text'
  const shape = shapes.checkCreation({
    shape: await shapes.addAtBounds({
      presetKey: 'square',
      options: {
        id: shapeId,
        left: montage.left + 75,
        top: montage.top + 95,
        width: 105,
        height: 85,
        withoutSelection: true
      }
    }),
    presetKey: 'square'
  })
  const textbox = text.checkCreation({
    textObject: await text.add({
      id: textId,
      text: 'Отдельный текст',
      left: montage.right - 225,
      top: montage.bottom - 155,
      originX: 'left',
      originY: 'top',
      width: 145,
      fontSize: 32,
      autoExpand: false
    })
  })

  await images.moveBoundsTo({ id: image.id, left: montage.left + 205, top: montage.top + 155 })
  const initial = await selectAllAndGetComposition({ editorModel, expectedChildren: 3, selection })

  expect(shape.id).toBe(shapeId)
  expect(textbox.id).toBe(textId)

  return { imageId: image.id, initial, shapeId, textId }
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

/** Создаёт выделение из текстов с опорными направляющими для скейлинга. */
async function createTextScaleSetupWithReferences(
  models: ActiveSelectionTextScaleFixtureModels
): Promise<ActiveSelectionTextScaleSetup> {
  const {
    initial,
    montage,
    scenePixel,
    textIds
  } = await createTextSelection(models)
  const referenceBounds = createScaleReferenceBounds({ initial, montage, scenePixel })
  const { guides, leftReference, targetMultiplier } = await addScaleReferences({
    ...referenceBounds,
    initial,
    scenePixel,
    shapes: models.shapes,
    snapping: models.snapping
  })
  const setupFlushed = await models.history.flushPendingSave()

  expect(setupFlushed, 'fixture не должен оставлять отложенное сохранение').toBe(false)

  return {
    guides,
    initial,
    leftReference,
    scenePixel,
    targetMultiplier,
    textIds
  }
}

/** Создаёт выделение из двух изображений и совместимые опорные направляющие. */
export const test = editorTest.extend<ActiveSelectionScalingFixtures>({
  activeSelectionAutoExpandTextScaleSetup: async({
    editorModel,
    history,
    selection,
    shapes,
    snapping,
    text
  }, use) => {
    await use(await createTextScaleSetupWithReferences({
      autoExpand: true,
      editorModel,
      history,
      selection,
      shapes,
      snapping,
      text
    }))
  },

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

  activeSelectionMixedScaleSetup: async({
    editorModel,
    history,
    images,
    selection,
    shapes,
    text
  }, use) => {
    const setup = await createMixedSelection({ editorModel, images, selection, shapes, text })
    const setupFlushed = await history.flushPendingSave()

    expect(setupFlushed, 'fixture не должен оставлять отложенное сохранение').toBe(false)

    await use(setup)
  },

  activeSelectionImageTextScaleSetup: async({
    editorModel,
    history,
    images,
    selection,
    text
  }, use) => {
    const setup = await createImageTextSelection({ editorModel, images, selection, text })
    const setupFlushed = await history.flushPendingSave()

    expect(setupFlushed, 'fixture не должна оставлять отложенное сохранение').toBe(false)
    expect(setup.initial.children, 'fixture должна создать изображение и два текста').toHaveLength(3)

    await use(setup)
  },

  activeSelectionMontageTextScaleSetup: async({
    editorModel,
    history,
    selection,
    text
  }, use) => {
    const setup = await createTextSelection({
      autoExpand: true,
      editorModel,
      selection,
      text,
      verticalOffset: ACTIVE_SELECTION_MONTAGE_TEXT_VERTICAL_OFFSET
    })
    const setupFlushed = await history.flushPendingSave()

    expect(setup.initial.children, 'fixture должна создать два текста').toHaveLength(2)
    expect(setup.initial.selection.boundsTop).toBeGreaterThan(setup.montage.centerY)
    expect(setup.initial.selection.boundsBottom).toBeLessThan(setup.montage.bottom)
    expect(setupFlushed, 'fixture не должен оставлять отложенное сохранение').toBe(false)

    await use(setup)
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
  },

  activeSelectionTextScaleSetup: async({
    editorModel,
    history,
    selection,
    shapes,
    snapping,
    text
  }, use) => {
    await use(await createTextScaleSetupWithReferences({
      autoExpand: false,
      editorModel,
      history,
      selection,
      shapes,
      snapping,
      text
    }))
  }
})

export { expect }
