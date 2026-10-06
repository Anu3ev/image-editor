import { expect } from '@playwright/test'
import { test as activeSelectionScalingTest } from './active-selection-scaling.fixture'
import type { EditorModel } from '../models/editor.model'
import type { HistoryModel } from '../models/history.model'
import type { ImageModel } from '../models/image/image.model'
import type { SelectionModel } from '../models/selection/selection.model'
import type { ShapeModel } from '../models/shape/shape.model'
import type { TemplateModel } from '../models/template.model'
import type { TextModel } from '../models/text/text.model'
import type {
  MontageAreaBoundsInfo,
  SelectionCompositionSnapshot
} from '../types'

/** Rotated shape from the bug-reproduction scene and its placement in the artboard. */
type RotatedShapeFixtureData = Readonly<{
  angle: number
  id: string
  left: number
  originX: 'left' | 'right'
  text: string
  top: number
}>

/** Scene after saving and reapplying a mixed template. */
type RotatedShapeScaleSetup = Readonly<{
  initial: SelectionCompositionSnapshot
  shapeIds: readonly [string, string]
}>

/** Models required to prepare a scene with rotated shapes. */
type RotatedShapeScaleModels = Readonly<{
  editorModel: EditorModel
  history: HistoryModel
  images: ImageModel
  selection: SelectionModel
  shapes: ShapeModel
  template: TemplateModel
  text: TextModel
}>

/** Additional scene for scaling rotated shapes. */
interface RotatedShapeSelectionScalingFixtures {
  rotatedMixedShapeScaleSetup: RotatedShapeScaleSetup
  rotatedShapeScaleSetup: RotatedShapeScaleSetup
}

/** Dimensions of the two lower rotated shapes from the attached template. */
const ROTATED_SHAPE_WIDTH = 173
const ROTATED_SHAPE_HEIGHT = 49

/** Returns two rotated shapes from a simplified scene based on the attached template. */
function createRotatedShapeFixtureData({
  montage
}: {
  montage: MontageAreaBoundsInfo
}): readonly RotatedShapeFixtureData[] {
  expect(montage.width, 'монтажная область должна иметь положительную ширину').toBeGreaterThan(0)
  expect(montage.height, 'монтажная область должна иметь положительную высоту').toBeGreaterThan(0)

  return Object.freeze([
    {
      angle: -28,
      id: 'rotated-template-shape-left',
      left: montage.left + 90,
      originX: 'left',
      text: 'РЕГУЛИРУЕТ КРОВЯНОЕ ДАВЛЕНИЕ',
      top: montage.top + 350
    },
    {
      angle: 21,
      id: 'rotated-template-shape-right',
      left: montage.left + 425,
      originX: 'right',
      text: 'БЕЗ ДОБАВЛЕНИЯ КОНСЕРВАНТОВ',
      top: montage.top + 340
    }
  ])
}

/** Adds rotated shapes that reproduce the template's problematic geometry. */
async function addRotatedShapes({
  montage,
  shapes
}: {
  montage: MontageAreaBoundsInfo
  shapes: ShapeModel
}): Promise<void> {
  const shapeData = createRotatedShapeFixtureData({ montage })

  for (const options of shapeData) {
    const shape = await shapes.add({
      presetKey: 'square',
      options: {
        ...options,
        width: ROTATED_SHAPE_WIDTH,
        height: ROTATED_SHAPE_HEIGHT,
        shapeTextAutoExpand: false,
        textPadding: {
          top: 7,
          right: 11,
          bottom: 7,
          left: 11
        },
        textStyle: {
          fontSize: 11.3784
        },
        originY: 'center',
        withoutSelection: true
      }
    })

    const createdShape = shapes.checkCreation({ shape, presetKey: 'square' })

    expect(createdShape.id, 'шейп должен сохранить заданный id').toBe(options.id)
    await shapes.setAngle({ id: options.id, angle: options.angle })
  }
}

/** Adds an image and standalone text from the template's mixed composition. */
async function addMixedSelectionObjects({
  images,
  montage,
  text
}: {
  images: ImageModel
  montage: MontageAreaBoundsInfo
  text: TextModel
}): Promise<void> {
  const image = images.checkCreation({
    imageObject: await images.addFilledImage({
      width: 190,
      height: 210,
      withoutSelection: true
    })
  })
  await images.moveBoundsTo({
    id: image.id,
    left: montage.left + 160,
    top: montage.top + 100
  })
  const textObject = text.checkCreation({
    textObject: await text.add({
      id: 'rotated-template-heading',
      text: 'МОРСКАЯ СОЛЬ',
      left: montage.left + 130,
      top: montage.top + 35,
      originX: 'left',
      originY: 'top',
      width: 250,
      fontSize: 32,
      autoExpand: false
    })
  })

  expect(image.id.length, 'изображение должно иметь непустой id').toBeGreaterThan(0)
  expect(textObject.id, 'отдельный текст должен сохранить заданный id').toBe('rotated-template-heading')
}

/** Creates a mixed template and reapplies it before scaling begins. */
async function createRotatedMixedShapeScaleSetup({
  editorModel,
  history,
  images,
  selection,
  shapes,
  template,
  text
}: RotatedShapeScaleModels): Promise<RotatedShapeScaleSetup> {
  const montage = await editorModel.getMontageAreaBounds()

  await addRotatedShapes({ montage, shapes })
  await addMixedSelectionObjects({ images, montage, text })
  await editorModel.selectAllObjects()

  const serializedTemplate = await template.serializeSelection()
  expect(serializedTemplate, 'смешанное выделение должно сохраниться в шаблон').not.toBeNull()
  expect(serializedTemplate?.objects).toHaveLength(4)
  if (!serializedTemplate) throw new Error('Не удалось сохранить смешанное выделение в шаблон')

  await editorModel.canvas.clearCanvas()
  expect(await template.applyTemplate({ template: serializedTemplate })).toBe(4)
  await editorModel.selectAllObjects()
  const setupFlushed = await history.flushPendingSave()

  const initial = await selection.getCompositionSnapshot()
  const shapeIds = initial.children
    .filter(({ type }) => type === 'shape-group')
    .map(({ id }) => id)

  expect(initial.children).toHaveLength(4)
  expect(shapeIds).toHaveLength(2)
  expect(setupFlushed, 'fixture не должен оставлять отложенное сохранение').toBe(false)
  expect(initial.children.filter(({ type }) => type === 'shape-group').map(({ angle }) => angle).sort((a, b) => a - b))
    .toEqual([-28, 21])
  expect(initial.children.filter(({ type }) => type === 'shape-group').map(({ originX }) => originX).sort())
    .toEqual(['left', 'right'])
  if (shapeIds.length !== 2) throw new Error('После применения шаблона должны существовать два шейпа')

  return { initial, shapeIds: [shapeIds[0], shapeIds[1]] }
}

/** Creates an active selection containing only two prerotated shapes. */
async function createRotatedShapeScaleSetup({
  editorModel,
  history,
  selection,
  shapes
}: Pick<RotatedShapeScaleModels, 'editorModel' | 'history' | 'selection' | 'shapes'>): Promise<RotatedShapeScaleSetup> {
  const montage = await editorModel.getMontageAreaBounds()

  await addRotatedShapes({ montage, shapes })
  await editorModel.selectAllObjects()
  const setupFlushed = await history.flushPendingSave()

  const initial = await selection.getCompositionSnapshot()
  const shapeIds = initial.children.map(({ id }) => id)

  expect(initial.children).toHaveLength(2)
  expect(initial.children.every(({ type }) => type === 'shape-group')).toBe(true)
  expect(setupFlushed, 'fixture не должен оставлять отложенное сохранение').toBe(false)
  expect(initial.children.map(({ angle }) => angle).sort((a, b) => a - b)).toEqual([-28, 21])
  expect(initial.children.map(({ originX }) => originX).sort()).toEqual(['left', 'right'])
  if (shapeIds.length !== 2) throw new Error('Общее выделение должно содержать два повёрнутых шейпа')

  return { initial, shapeIds: [shapeIds[0], shapeIds[1]] }
}

/** Prepares active-selection scenes with two prerotated shapes. */
export const test = activeSelectionScalingTest.extend<RotatedShapeSelectionScalingFixtures>({
  rotatedMixedShapeScaleSetup: async({
    editorModel,
    history,
    images,
    selection,
    shapes,
    template,
    text
  }, use) => {
    const setup = await createRotatedMixedShapeScaleSetup({
      editorModel,
      history,
      images,
      selection,
      shapes,
      template,
      text
    })

    expect(setup.initial.selection.type).toBe('activeselection')
    expect(setup.shapeIds).toHaveLength(2)

    await use(setup)
  },

  rotatedShapeScaleSetup: async({
    editorModel,
    history,
    selection,
    shapes
  }, use) => {
    const setup = await createRotatedShapeScaleSetup({
      editorModel,
      history,
      selection,
      shapes
    })

    expect(setup.initial.selection.type).toBe('activeselection')
    expect(setup.shapeIds).toHaveLength(2)

    await use(setup)
  }
})

export { expect }
