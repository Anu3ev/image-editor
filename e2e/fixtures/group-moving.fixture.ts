import { expect } from '@playwright/test'
import { test as editorTest } from './editor.fixture'
import type { EditorModel } from '../models/editor.model'
import type { GroupingModel } from '../models/grouping.model'
import type { ImageModel } from '../models/image/image.model'
import type {
  SelectionCompositionSnapshot,
  SelectionModel
} from '../models/selection/selection.model'
import type { ShapeModel } from '../models/shape/shape.model'
import type { SnappingModel } from '../models/snapping.model'
import type {
  MontageAreaBoundsInfo,
  SnappingObjectSnapshot
} from '../types'

/** Дополнительная подготовка верхнеуровневой группы перед перемещением. */
export type GroupMovingOptions = Readonly<{
  groupAngle?: number
  rotatedChildren?: boolean
  scaleBeforeMove?: boolean
}>

/** Сцена с верхнеуровневой группой и близкими направляющими опорного шейпа. */
export type GroupMovingSetup = Readonly<{
  childIds: readonly [string, string]
  groupId: string
  initialComposition: SelectionCompositionSnapshot
  reference: SnappingObjectSnapshot
  referenceId: string
}>

/** Сцена для проверки горизонтальной равноудалённости группы. */
export type GroupHorizontalSpacingSetup = Readonly<{
  expectedLeft: number
  group: SelectionCompositionSnapshot
  groupId: string
  left: SnappingObjectSnapshot
  right: SnappingObjectSnapshot
}>

/** Сцена для проверки вертикальной равноудалённости группы. */
export type GroupVerticalSpacingSetup = Readonly<{
  bottom: SnappingObjectSnapshot
  expectedTop: number
  group: SelectionCompositionSnapshot
  groupId: string
  top: SnappingObjectSnapshot
}>

/** Модели, необходимые для создания сцены с верхнеуровневой группой. */
type GroupMovingSceneModels = Readonly<{
  editorModel: EditorModel
  grouping: GroupingModel
  images: ImageModel
  selection: SelectionModel
  shapes: ShapeModel
  snapping: SnappingModel
}>

/** Созданная группа до добавления объектов, относительно которых она будет прилипать. */
type GroupScene = Readonly<{
  childIds: readonly [string, string]
  groupId: string
  initialComposition: SelectionCompositionSnapshot
  montage: MontageAreaBoundsInfo
}>

/** Дополнительные fixtures для перемещения верхнеуровневой группы. */
interface GroupMovingFixtures {
  createGroupMovingSetup: (options?: GroupMovingOptions) => Promise<GroupMovingSetup>
  groupHorizontalSpacingSetup: GroupHorizontalSpacingSetup
  groupMovingSetup: GroupMovingSetup
  groupVerticalSpacingSetup: GroupVerticalSpacingSetup
}

/** Добавляет шейп и изображение, которые войдут в обычную Fabric-группу. */
async function addGroupChildren({
  images,
  montage,
  rotatedChildren,
  shapes
}: {
  images: ImageModel
  montage: MontageAreaBoundsInfo
  rotatedChildren: boolean
  shapes: ShapeModel
}): Promise<readonly [string, string]> {
  const shapeId = 'group-shape-child'
  const shape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: shapeId,
      left: montage.left + 70,
      top: montage.top + 90,
      width: 90,
      height: 80,
      text: '',
      withoutSelection: true
    }
  })
  const image = images.checkCreation({
    imageObject: await images.addFilledImage({
      width: 100,
      height: 70,
      fill: '#06d6a0',
      withoutSelection: true
    })
  })

  shapes.checkCreation({ shape, presetKey: 'square' })
  await images.moveBoundsTo({
    id: image.id,
    left: montage.left + 210,
    top: montage.top + 180
  })

  if (rotatedChildren) {
    await shapes.setAngle({ id: shapeId, angle: 25 })
    await images.setAngle({ id: image.id, angle: -20 })
  }

  return [shapeId, image.id]
}

/** Добавляет опорный шейп, не меняя активную группу. */
async function addReferenceShape({
  height,
  id,
  left,
  shapes,
  snapping,
  top,
  width
}: {
  height: number
  id: string
  left: number
  shapes: ShapeModel
  snapping: SnappingModel
  top: number
  width: number
}): Promise<SnappingObjectSnapshot> {
  const shape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id,
      left,
      top,
      width,
      height,
      text: '',
      withoutSelection: true
    }
  })

  shapes.checkCreation({ shape, presetKey: 'square' })

  return snapping.getObjectSnapshot({ id })
}

/** Создаёт верхнеуровневую группу и применяет запрошенные преобразования. */
async function createGroupedObjects({
  models,
  options = {}
}: {
  models: GroupMovingSceneModels
  options?: GroupMovingOptions
}): Promise<GroupScene> {
  const montage = await models.editorModel.getMontageAreaBounds()
  const childIds = await addGroupChildren({
    images: models.images,
    montage,
    rotatedChildren: options.rotatedChildren ?? false,
    shapes: models.shapes
  })

  await models.editorModel.selectAllObjects()
  const group = await models.grouping.groupActiveSelection()
  const { id: groupId } = group

  expect(groupId, 'у созданной группы должен быть id').toBeTruthy()
  if (!groupId) throw new Error('Созданная группа должна получить строковый id')

  if (options.scaleBeforeMove) {
    await models.selection.scaling.scaleFromBottomRightBy({
      deltaX: 40,
      deltaY: 30,
      pointerSteps: 3
    })
  }
  if (options.groupAngle !== undefined) {
    await models.grouping.setAngle({ id: groupId, angle: options.groupAngle })
  }

  const initialComposition = await models.selection.getCompositionSnapshot()

  expect(initialComposition.selection.type).toBe('group')
  expect(initialComposition.children.map(({ id }) => id))
    .toEqual(expect.arrayContaining([...childIds]))

  return { childIds, groupId, initialComposition, montage }
}

/** Создаёт группу из шейпа и изображения и отдельный объект с конкурирующими направляющими. */
async function createGroupMovingScene({
  models,
  options
}: {
  models: GroupMovingSceneModels
  options?: GroupMovingOptions
}): Promise<GroupMovingSetup> {
  const groupScene = await createGroupedObjects({ models, options })
  const { montage } = groupScene
  const referenceId = 'group-movement-reference'
  const reference = await addReferenceShape({
    id: referenceId,
    left: montage.left + 100,
    top: montage.top + 320,
    width: 8,
    height: 8,
    shapes: models.shapes,
    snapping: models.snapping
  })

  return {
    childIds: groupScene.childIds,
    groupId: groupScene.groupId,
    initialComposition: groupScene.initialComposition,
    reference,
    referenceId
  }
}

/** Создаёт группу между двумя горизонтальными опорными объектами. */
async function createHorizontalSpacingScene(
  models: GroupMovingSceneModels
): Promise<GroupHorizontalSpacingSetup> {
  const groupScene = await createGroupedObjects({ models })
  const { initialComposition: group, montage } = groupScene
  const left = await addReferenceShape({
    id: 'group-spacing-left',
    left: montage.left + 10,
    top: montage.top + 60,
    width: 50,
    height: 330,
    shapes: models.shapes,
    snapping: models.snapping
  })
  const right = await addReferenceShape({
    id: 'group-spacing-right',
    left: montage.left + 430,
    top: montage.top + 60,
    width: 50,
    height: 330,
    shapes: models.shapes,
    snapping: models.snapping
  })
  const expectedLeft = left.boundsRight
    + ((right.boundsLeft - left.boundsRight - group.selection.boundsWidth) / 2)

  expect(expectedLeft).toBeGreaterThan(left.boundsRight)
  expect(expectedLeft + group.selection.boundsWidth).toBeLessThan(right.boundsLeft)

  return { expectedLeft, group, groupId: groupScene.groupId, left, right }
}

/** Создаёт группу между двумя вертикальными опорными объектами. */
async function createVerticalSpacingScene(
  models: GroupMovingSceneModels
): Promise<GroupVerticalSpacingSetup> {
  const groupScene = await createGroupedObjects({ models })
  const { initialComposition: group, montage } = groupScene
  const top = await addReferenceShape({
    id: 'group-spacing-top',
    left: montage.left + 50,
    top: montage.top + 10,
    width: 400,
    height: 50,
    shapes: models.shapes,
    snapping: models.snapping
  })
  const bottom = await addReferenceShape({
    id: 'group-spacing-bottom',
    left: montage.left + 50,
    top: montage.top + 430,
    width: 400,
    height: 50,
    shapes: models.shapes,
    snapping: models.snapping
  })
  const expectedTop = top.boundsBottom
    + ((bottom.boundsTop - top.boundsBottom - group.selection.boundsHeight) / 2)

  expect(expectedTop).toBeGreaterThan(top.boundsBottom)
  expect(expectedTop + group.selection.boundsHeight).toBeLessThan(bottom.boundsTop)

  return { bottom, expectedTop, group, groupId: groupScene.groupId, top }
}

/** Editor fixture со сценой для перемещения верхнеуровневой группы. */
export const test = editorTest.extend<GroupMovingFixtures>({
  createGroupMovingSetup: async({
    editorModel,
    grouping,
    images,
    selection,
    shapes,
    snapping
  }, use) => {
    const models = { editorModel, grouping, images, selection, shapes, snapping }

    await use((options) => createGroupMovingScene({ models, options }))
  },

  groupMovingSetup: async({
    createGroupMovingSetup
  }, use) => {
    await use(await createGroupMovingSetup())
  },

  groupHorizontalSpacingSetup: async({
    editorModel,
    grouping,
    images,
    selection,
    shapes,
    snapping
  }, use) => {
    await use(await createHorizontalSpacingScene({
      editorModel,
      grouping,
      images,
      selection,
      shapes,
      snapping
    }))
  },

  groupVerticalSpacingSetup: async({
    editorModel,
    grouping,
    images,
    selection,
    shapes,
    snapping
  }, use) => {
    await use(await createVerticalSpacingScene({
      editorModel,
      grouping,
      images,
      selection,
      shapes,
      snapping
    }))
  }
})

export { expect }
