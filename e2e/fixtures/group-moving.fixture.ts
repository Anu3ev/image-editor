import { expect } from '@playwright/test'
import { test as editorTest } from './editor.fixture'
import type { EditorModel } from '../models/editor.model'
import type { GroupingModel } from '../models/grouping.model'
import type { ImageModel } from '../models/image/image.model'
import type { SelectionModel } from '../models/selection/selection.model'
import type { ShapeModel } from '../models/shape/shape.model'
import type { SnappingModel } from '../models/snapping.model'
import type {
  MontageAreaBoundsInfo,
  SelectionCompositionSnapshot,
  SnappingObjectSnapshot
} from '../types'

/** Additional preparation of the top-level group before movement. */
export type GroupMovingOptions = Readonly<{
  groupAngle?: number
  rotatedChildren?: boolean
  scaleBeforeMove?: boolean
}>

/** Scene with a top-level group and nearby reference-shape guides. */
export type GroupMovingSetup = Readonly<{
  childIds: readonly [string, string]
  groupId: string
  initialComposition: SelectionCompositionSnapshot
  reference: SnappingObjectSnapshot
  referenceId: string
}>

/** Scene for testing horizontal equal spacing of a group. */
export type GroupHorizontalSpacingSetup = Readonly<{
  expectedLeft: number
  group: SelectionCompositionSnapshot
  groupId: string
  left: SnappingObjectSnapshot
  right: SnappingObjectSnapshot
}>

/** Scene for testing vertical equal spacing of a group. */
export type GroupVerticalSpacingSetup = Readonly<{
  bottom: SnappingObjectSnapshot
  expectedTop: number
  group: SelectionCompositionSnapshot
  groupId: string
  top: SnappingObjectSnapshot
}>

/** Models required to create a scene with a top-level group. */
type GroupMovingSceneModels = Readonly<{
  editorModel: EditorModel
  grouping: GroupingModel
  images: ImageModel
  selection: SelectionModel
  shapes: ShapeModel
  snapping: SnappingModel
}>

/** Created group before adding objects to which it will snap. */
type GroupScene = Readonly<{
  childIds: readonly [string, string]
  groupId: string
  initialComposition: SelectionCompositionSnapshot
  montage: MontageAreaBoundsInfo
}>

/** Additional fixtures for moving a top-level group. */
interface GroupMovingFixtures {
  createGroupMovingSetup: (options?: GroupMovingOptions) => Promise<GroupMovingSetup>
  groupHorizontalSpacingSetup: GroupHorizontalSpacingSetup
  groupMovingSetup: GroupMovingSetup
  groupVerticalSpacingSetup: GroupVerticalSpacingSetup
}

/** Adds a shape and an image to include in a regular Fabric group. */
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

/** Adds a reference shape without changing the active group. */
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

/** Creates a top-level group and applies the requested transformations. */
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

/** Creates a group of a shape and an image, and a separate object with competing guides. */
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

/** Creates a group between two horizontal reference objects. */
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

/** Creates a group between two vertical reference objects. */
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

/** Editor fixture with a scene for moving a top-level group. */
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
