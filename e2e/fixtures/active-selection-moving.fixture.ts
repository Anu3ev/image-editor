import { expect } from '@playwright/test'
import { test as editorTest } from './editor.fixture'
import type { EditorModel } from '../models/editor.model'
import type { ImageModel } from '../models/image/image.model'
import type {
  SelectionCompositionSnapshot,
  SelectionModel
} from '../models/selection/selection.model'
import type { ShapeModel } from '../models/shape/shape.model'
import type { SnappingModel } from '../models/snapping.model'
import type { TextModel } from '../models/text/text.model'
import type {
  MontageAreaBoundsInfo,
  SnappingObjectSnapshot
} from '../types'

/** Состав общего выделения для проверки унифицированного перемещения. */
export type ActiveSelectionCompositionKind = 'images' | 'mixed' | 'shapes' | 'texts'

/** Параметры сцены с одним из поддерживаемых составов общего выделения. */
export type ActiveSelectionCompositionOptions = Readonly<{
  kind: ActiveSelectionCompositionKind
  rotated?: boolean
  scaleBeforeMove?: boolean
}>

/** Сцена с общим выделением и близкими направляющими опорного шейпа. */
export type ActiveSelectionMovingSetup = Readonly<{
  childIds: readonly string[]
  initialComposition: SelectionCompositionSnapshot
  reference: SnappingObjectSnapshot
  referenceId: string
}>

/** Сцена для проверки горизонтальной равноудалённости общего выделения. */
export type ActiveSelectionHorizontalSpacingSetup = Readonly<{
  active: SelectionCompositionSnapshot
  expectedLeft: number
  left: SnappingObjectSnapshot
  right: SnappingObjectSnapshot
}>

/** Сцена для проверки вертикальной равноудалённости общего выделения. */
export type ActiveSelectionVerticalSpacingSetup = Readonly<{
  active: SelectionCompositionSnapshot
  bottom: SnappingObjectSnapshot
  expectedTop: number
  top: SnappingObjectSnapshot
}>

/** Модели, необходимые для создания сцены с общим выделением. */
type ActiveSelectionSceneModels = Readonly<{
  editorModel: EditorModel
  images: ImageModel
  selection: SelectionModel
  shapes: ShapeModel
  snapping: SnappingModel
  text: TextModel
}>

/** Общее выделение двух шейпов и границы монтажной области. */
type ShapeSelectionScene = Readonly<{
  active: SelectionCompositionSnapshot
  montage: MontageAreaBoundsInfo
}>

/** Дополнительные fixtures для перемещения общего выделения. */
interface ActiveSelectionMovingFixtures {
  activeSelectionMovingSetup: ActiveSelectionMovingSetup
  activeSelectionHorizontalSpacingSetup: ActiveSelectionHorizontalSpacingSetup
  activeSelectionVerticalSpacingSetup: ActiveSelectionVerticalSpacingSetup
  createActiveSelectionComposition: (
    options: ActiveSelectionCompositionOptions
  ) => Promise<ActiveSelectionMovingSetup>
}

/** Добавляет два шейпа, которые войдут в общее выделение. */
async function addShapeChildren({
  montage,
  rotated,
  shapes
}: {
  montage: MontageAreaBoundsInfo
  rotated: boolean
  shapes: ShapeModel
}): Promise<readonly [string, string]> {
  const childIds = ['selection-first-shape', 'selection-second-shape'] as const
  const bounds = [
    { left: montage.left + 70, top: montage.top + 90, width: 90, height: 80 },
    { left: montage.left + 210, top: montage.top + 180, width: 100, height: 70 }
  ] as const

  for (let index = 0; index < childIds.length; index += 1) {
    const shape = await shapes.addAtBounds({
      presetKey: 'square',
      options: {
        id: childIds[index],
        ...bounds[index],
        text: '',
        withoutSelection: true
      }
    })
    shapes.checkCreation({ shape, presetKey: 'square' })
  }

  if (rotated) {
    await shapes.setAngle({ id: childIds[0], angle: 25 })
    await shapes.setAngle({ id: childIds[1], angle: -20 })
  }

  return childIds
}

/** Добавляет два изображения и размещает их внутри монтажной области. */
async function addImageChildren({
  images,
  montage
}: {
  images: ImageModel
  montage: MontageAreaBoundsInfo
}): Promise<readonly string[]> {
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

  await images.moveBoundsTo({ id: first.id, left: montage.left + 70, top: montage.top + 80 })
  await images.moveBoundsTo({ id: second.id, left: montage.left + 230, top: montage.top + 180 })

  return [first.id, second.id]
}

/** Добавляет два отдельных текстовых объекта. */
async function addTextChildren({
  montage,
  text
}: {
  montage: MontageAreaBoundsInfo
  text: TextModel
}): Promise<readonly [string, string]> {
  const childIds = ['selection-first-text', 'selection-second-text'] as const
  const texts = [
    { id: childIds[0], text: 'Первый текст', left: montage.left + 70, top: montage.top + 90 },
    { id: childIds[1], text: 'Второй текст', left: montage.left + 220, top: montage.top + 190 }
  ] as const

  for (const options of texts) {
    const created = await text.add({
      ...options,
      originX: 'left',
      originY: 'top',
      width: 120,
      fontSize: 24,
      autoExpand: false
    })
    text.checkCreation({ textObject: created })
  }

  return childIds
}

/** Добавляет изображение, шейп и отдельный текст. */
async function addMixedChildren({
  images,
  montage,
  shapes,
  text
}: {
  images: ImageModel
  montage: MontageAreaBoundsInfo
  shapes: ShapeModel
  text: TextModel
}): Promise<readonly string[]> {
  const image = images.checkCreation({
    imageObject: await images.addFilledImage({ width: 80, height: 70, withoutSelection: true })
  })
  await images.moveBoundsTo({ id: image.id, left: montage.left + 60, top: montage.top + 80 })

  const shapeId = 'selection-mixed-shape'
  const shape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: shapeId,
      left: montage.left + 190,
      top: montage.top + 150,
      width: 90,
      height: 70,
      text: '',
      withoutSelection: true
    }
  })
  shapes.checkCreation({ shape, presetKey: 'square' })

  const textId = 'selection-mixed-text'
  const textObject = await text.add({
    id: textId,
    text: 'Отдельный текст',
    left: montage.left + 310,
    top: montage.top + 230,
    originX: 'left',
    originY: 'top',
    width: 120,
    fontSize: 24,
    autoExpand: false
  })
  text.checkCreation({ textObject })

  return [image.id, shapeId, textId]
}

/** Добавляет дочерние объекты указанного поддерживаемого состава. */
async function addCompositionChildren({
  kind,
  models,
  montage,
  rotated
}: {
  kind: ActiveSelectionCompositionKind
  models: ActiveSelectionSceneModels
  montage: MontageAreaBoundsInfo
  rotated: boolean
}): Promise<readonly string[]> {
  if (kind === 'shapes') return addShapeChildren({ montage, rotated, shapes: models.shapes })
  if (kind === 'images') return addImageChildren({ images: models.images, montage })
  if (kind === 'texts') return addTextChildren({ montage, text: models.text })

  return addMixedChildren({
    images: models.images,
    montage,
    shapes: models.shapes,
    text: models.text
  })
}

/** Добавляет опорный шейп, не меняя текущее общее выделение. */
async function addReferenceShape({
  id,
  height = 8,
  left,
  shapes,
  snapping,
  top,
  width = 8
}: {
  id: string
  height?: number
  left: number
  shapes: ShapeModel
  snapping: SnappingModel
  top: number
  width?: number
}): Promise<SnappingObjectSnapshot> {
  const reference = await shapes.addAtBounds({
    presetKey: 'square',
    options: { id, left, top, width, height, text: '', withoutSelection: true }
  })
  shapes.checkCreation({ shape: reference, presetKey: 'square' })

  return snapping.getObjectSnapshot({ id })
}

/** Создаёт сцену с поддерживаемым общим выделением и отдельным опорным шейпом. */
async function createCompositionScene({
  kind,
  models,
  rotated = false,
  scaleBeforeMove = false
}: {
  kind: ActiveSelectionCompositionKind
  models: ActiveSelectionSceneModels
  rotated?: boolean
  scaleBeforeMove?: boolean
}): Promise<ActiveSelectionMovingSetup> {
  const montage = await models.editorModel.getMontageAreaBounds()
  const childIds = await addCompositionChildren({ kind, models, montage, rotated })
  await models.editorModel.selectAllObjects()
  if (scaleBeforeMove) {
    await models.selection.scaling.scaleFromBottomRightBy({ deltaX: 40, deltaY: 30, pointerSteps: 3 })
  }

  const initialComposition = await models.selection.getCompositionSnapshot()
  const referenceId = `selection-${kind}-reference`
  const reference = await addReferenceShape({
    id: referenceId,
    left: montage.left + 100,
    top: montage.top + 280,
    shapes: models.shapes,
    snapping: models.snapping
  })

  expect(initialComposition.selection.type).toBe('activeselection')
  expect(initialComposition.children.map(({ id }) => id)).toEqual(expect.arrayContaining([...childIds]))

  return { childIds, initialComposition, reference, referenceId }
}

/** Создаёт общее выделение из двух шейпов для spacing-сцен. */
async function createShapeSelection(
  models: ActiveSelectionSceneModels
): Promise<ShapeSelectionScene> {
  const montage = await models.editorModel.getMontageAreaBounds()
  await addShapeChildren({ montage, rotated: false, shapes: models.shapes })
  await models.editorModel.selectAllObjects()
  const active = await models.selection.getCompositionSnapshot()

  expect(active.selection.type).toBe('activeselection')
  expect(active.children).toHaveLength(2)

  return { active, montage }
}

/** Создаёт сцену с двумя опорными шейпами по сторонам общего выделения. */
async function createHorizontalSpacingScene(
  models: ActiveSelectionSceneModels
): Promise<ActiveSelectionHorizontalSpacingSetup> {
  const { active, montage } = await createShapeSelection(models)

  const left = await addReferenceShape({
    id: 'selection-spacing-left',
    left: montage.left + 20,
    top: montage.top + 100,
    width: 60,
    height: 180,
    shapes: models.shapes,
    snapping: models.snapping
  })
  const right = await addReferenceShape({
    id: 'selection-spacing-right',
    left: montage.left + 350,
    top: montage.top + 100,
    width: 60,
    height: 180,
    shapes: models.shapes,
    snapping: models.snapping
  })
  const expectedLeft = left.boundsRight
    + ((right.boundsLeft - left.boundsRight - active.selection.boundsWidth) / 2)

  expect(expectedLeft).toBeGreaterThan(left.boundsRight)
  expect(expectedLeft + active.selection.boundsWidth).toBeLessThan(right.boundsLeft)

  return { active, expectedLeft, left, right }
}

/** Создаёт сцену с двумя опорными шейпами сверху и снизу общего выделения. */
async function createVerticalSpacingScene(
  models: ActiveSelectionSceneModels
): Promise<ActiveSelectionVerticalSpacingSetup> {
  const { active, montage } = await createShapeSelection(models)

  const top = await addReferenceShape({
    id: 'selection-spacing-top',
    left: montage.left + 100,
    top: montage.top + 30,
    width: 260,
    height: 50,
    shapes: models.shapes,
    snapping: models.snapping
  })
  const bottom = await addReferenceShape({
    id: 'selection-spacing-bottom',
    left: montage.left + 100,
    top: montage.top + 410,
    width: 260,
    height: 50,
    shapes: models.shapes,
    snapping: models.snapping
  })
  const expectedTop = top.boundsBottom
    + ((bottom.boundsTop - top.boundsBottom - active.selection.boundsHeight) / 2)

  expect(expectedTop).toBeGreaterThan(top.boundsBottom)
  expect(expectedTop + active.selection.boundsHeight).toBeLessThan(bottom.boundsTop)

  return { active, bottom, expectedTop, top }
}

/** Editor fixture со сценами для перемещения общего выделения. */
export const test = editorTest.extend<ActiveSelectionMovingFixtures>({
  createActiveSelectionComposition: async({
    editorModel,
    images,
    selection,
    shapes,
    snapping,
    text
  }, use) => {
    const models = { editorModel, images, selection, shapes, snapping, text }

    await use((options) => createCompositionScene({ ...options, models }))
  },

  activeSelectionMovingSetup: async({ createActiveSelectionComposition }, use) => {
    await use(await createActiveSelectionComposition({ kind: 'shapes' }))
  },

  activeSelectionHorizontalSpacingSetup: async({
    editorModel,
    images,
    selection,
    shapes,
    snapping,
    text
  }, use) => {
    await use(await createHorizontalSpacingScene({
      editorModel,
      images,
      selection,
      shapes,
      snapping,
      text
    }))
  },

  activeSelectionVerticalSpacingSetup: async({
    editorModel,
    images,
    selection,
    shapes,
    snapping,
    text
  }, use) => {
    await use(await createVerticalSpacingScene({
      editorModel,
      images,
      selection,
      shapes,
      snapping,
      text
    }))
  }
})

export { expect }
