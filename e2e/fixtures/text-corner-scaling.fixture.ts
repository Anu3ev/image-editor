import type { EditorModel } from '../models/editor.model'
import type { ShapeModel } from '../models/shape/shape.model'
import type { SnappingModel } from '../models/snapping.model'
import type { TemplateModel } from '../models/template.model'
import type { TextModel } from '../models/text/text.model'
import {
  TEXT_CORNER_SCALE_BELOW_MINIMUM_MULTIPLIER,
  TEXT_CORNER_SCALE_TARGET_MULTIPLIER,
  TEXT_MINIMUM_SCALING_ADD_OPTIONS
} from './data/text-resizing.data'
import type {
  SnappingObjectSnapshot,
  TemplateDefinition,
  TextAddParams,
  TextCornerScaleHandle,
  TextCornerScaleSnapshot,
  TextResizeSnapshot
} from '../types'

/** Standalone-text and shape data at the two boundaries of the selected corner handle. */
export type TextCornerScaleSetup = Readonly<{
  initial: TextCornerScaleSnapshot
  reference: SnappingObjectSnapshot
  referenceId: string
  snapPoint: Readonly<{ x: number; y: number }>
  textId: string
}>

/** Scaled text and a prepared template for testing geometry restoration. */
export type ScaledTextCornerTemplateSetup = Readonly<{
  committed: TextCornerScaleSnapshot
  live: TextCornerScaleSnapshot
  serializedTemplate: TemplateDefinition
  setup: TextCornerScaleSetup
}>

/** Data for a known failure when scaling rotated text with a corner handle. */
export type RotatedTextCornerScaleSetup = Readonly<{
  initial: TextResizeSnapshot
  reference: SnappingObjectSnapshot
  textId: string
}>

/** Data for shrinking text to its minimum allowed size near an unreachable guide. */
export type MinimumTextCornerScaleSetup = Readonly<{
  initial: TextResizeSnapshot
  snapPoint: Readonly<{ x: number; y: number }>
  textId: string
}>

/** Dependencies for testing text shrinking to its minimum allowed size. */
type MinimumTextCornerScaleSetupParams = Readonly<{
  shapes: ShapeModel
  snapping: SnappingModel
  text: TextModel
}>

/** Dependencies for preparing rotated text near a guide. */
type RotatedTextCornerScaleSetupParams = Readonly<{
  editorModel: EditorModel
  shapes: ShapeModel
  snapping: SnappingModel
  text: TextModel
}>

/** Options for testing one standalone-text corner handle. */
type TextCornerScaleSetupParams = RotatedTextCornerScaleSetupParams & Readonly<{
  centered?: boolean
  corner: TextCornerScaleHandle
}>

/** Dependencies for preparing scaled text and its template. */
type ScaledTextCornerTemplateSetupParams = TextCornerScaleSetupParams & Readonly<{
  template: TemplateModel
}>

/** Reference-shape options for existing text. */
type TextCornerScaleReferenceSetupParams = Readonly<{
  centered?: boolean
  corner: TextCornerScaleHandle
  shapes: ShapeModel
  snapping: SnappingModel
  text: TextModel
  textId: string
}>

/** Canonical text properties in corner-scaling scenarios. */
const TEXT_CORNER_SCALE_OPTIONS = Object.freeze({
  text: 'A',
  width: 180,
  fontSize: 100,
  autoExpand: false,
  paddingTop: 7,
  paddingRight: 11,
  paddingBottom: 13,
  paddingLeft: 17,
  radiusTopLeft: 3,
  radiusTopRight: 5,
  radiusBottomRight: 7,
  radiusBottomLeft: 9
}) satisfies TextAddParams

/** Returns the shape's position beyond the two moving boundaries of the selected corner. */
function resolveReferencePlacement({
  centered,
  corner,
  initial,
  scaled,
  size
}: {
  centered: boolean
  corner: TextCornerScaleHandle
  initial: TextResizeSnapshot
  scaled: Readonly<{
    boundsHeight: number
    boundsWidth: number
  }>
  size: number
}): Readonly<{ left: number; top: number }> {
  const centerX = initial.boundsLeft + (initial.boundsWidth / 2)
  const centerY = initial.boundsTop + (initial.boundsHeight / 2)
  const scaledLeft = centered
    ? centerX - (scaled.boundsWidth / 2)
    : initial.boundsRight - scaled.boundsWidth
  const scaledRight = centered
    ? centerX + (scaled.boundsWidth / 2)
    : initial.boundsLeft + scaled.boundsWidth
  const scaledTop = centered
    ? centerY - (scaled.boundsHeight / 2)
    : initial.boundsBottom - scaled.boundsHeight
  const scaledBottom = centered
    ? centerY + (scaled.boundsHeight / 2)
    : initial.boundsTop + scaled.boundsHeight
  const left = corner === 'tl' || corner === 'bl'
    ? scaledLeft - size
    : scaledRight
  const top = corner === 'tl' || corner === 'tr'
    ? scaledTop - size
    : scaledBottom

  return Object.freeze({ left, top })
}

/** Calculates expected proportional-scaling bounds from the exact initial snapshot. */
function resolveScaledTextCornerBounds({
  initial,
  scale
}: {
  initial: TextResizeSnapshot
  scale: number
}): Readonly<{ boundsHeight: number; boundsWidth: number }> {
  return Object.freeze({
    boundsHeight: initial.boundsHeight * scale,
    boundsWidth: initial.boundsWidth * scale
  })
}

/** Returns the scene point where both moving boundaries align with the shape. */
function resolveSnapPoint({
  corner,
  reference
}: {
  corner: TextCornerScaleHandle
  reference: SnappingObjectSnapshot
}): Readonly<{ x: number; y: number }> {
  const x = corner === 'tl' || corner === 'bl'
    ? reference.boundsRight
    : reference.boundsLeft
  const y = corner === 'tl' || corner === 'tr'
    ? reference.boundsBottom
    : reference.boundsTop

  return Object.freeze({ x, y })
}

/** Adds a reference shape at the target boundaries of existing text. */
export async function createTextCornerScaleReferenceSetup({
  centered = false,
  corner,
  shapes,
  snapping,
  text,
  textId
}: TextCornerScaleReferenceSetupParams): Promise<TextCornerScaleSetup> {
  const initial = await text.scaling.getSnapshot({ id: textId })
  const scaled = resolveScaledTextCornerBounds({
    initial,
    scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER
  })
  const referenceSize = 40
  const placement = resolveReferencePlacement({
    centered,
    corner,
    initial,
    scaled,
    size: referenceSize
  })
  const referenceId = `${textId}-corner-scale-reference-${corner}`
  const referenceShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: referenceId,
      left: placement.left,
      top: placement.top,
      width: referenceSize,
      height: referenceSize,
      text: ''
    }
  })
  shapes.checkCreation({ shape: referenceShape, presetKey: 'square' })

  const reference = await snapping.getObjectSnapshot({ id: referenceId })

  return Object.freeze({
    initial,
    reference,
    referenceId,
    snapPoint: resolveSnapPoint({ corner, reference }),
    textId
  })
}

/** Creates text and places a reference shape right against the selected handle's boundaries. */
export async function createTextCornerScaleSetup({
  centered = false,
  corner,
  editorModel,
  shapes,
  snapping,
  text
}: TextCornerScaleSetupParams): Promise<TextCornerScaleSetup> {
  const montage = await editorModel.getMontageAreaBounds()
  const textId = `corner-scale-text-${corner}`
  const created = await text.add({
    ...TEXT_CORNER_SCALE_OPTIONS,
    id: textId,
    left: montage.left + 180,
    top: montage.top + 190
  })
  text.checkCreation({ textObject: created })

  return createTextCornerScaleReferenceSetup({
    centered,
    corner,
    shapes,
    snapping,
    text,
    textId
  })
}

/** Creates text, enlarges it with a corner handle, and saves the selection to a template. */
export async function createScaledTextCornerTemplateSetup({
  centered = false,
  corner,
  editorModel,
  shapes,
  snapping,
  template,
  text
}: ScaledTextCornerTemplateSetupParams): Promise<ScaledTextCornerTemplateSetup> {
  const setup = await createTextCornerScaleSetup({
    centered,
    corner,
    editorModel,
    shapes,
    snapping,
    text
  })
  await text.scaling.start({ corner, centered, id: setup.textId })
  const live = await text.scaling.dragToScale({ scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER })
  const committed = await text.scaling.finish({ id: setup.textId })
  const selected = await text.select({ id: setup.textId })
  if (selected?.id !== setup.textId) throw new Error('Исходный текст должен остаться выбранным перед сериализацией')

  const serializedTemplate = await template.serializeSelection()
  if (!serializedTemplate) throw new Error('Выбранный текст должен сохраниться в шаблон')

  return Object.freeze({ committed, live, serializedTemplate, setup })
}

/** Creates text and guides at a point below its minimum size. */
export async function createMinimumTextCornerScaleSetup({
  shapes,
  snapping,
  text
}: MinimumTextCornerScaleSetupParams): Promise<MinimumTextCornerScaleSetup> {
  const textId = 'minimum-corner-scale-text'
  const created = await text.add({ ...TEXT_MINIMUM_SCALING_ADD_OPTIONS, id: textId })
  text.checkCreation({ textObject: created })

  const initial = await text.getResizeSnapshot({ id: textId })
  const referenceId = 'minimum-corner-scale-reference'
  const referenceShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: referenceId,
      left: initial.boundsLeft + (initial.boundsWidth * TEXT_CORNER_SCALE_BELOW_MINIMUM_MULTIPLIER),
      top: initial.boundsTop + (initial.boundsHeight * TEXT_CORNER_SCALE_BELOW_MINIMUM_MULTIPLIER),
      width: 40,
      height: 40,
      text: ''
    }
  })
  shapes.checkCreation({ shape: referenceShape, presetKey: 'square' })
  const reference = await snapping.getObjectSnapshot({ id: referenceId })

  return Object.freeze({
    initial,
    snapPoint: Object.freeze({ x: reference.boundsLeft, y: reference.boundsTop }),
    textId
  })
}

/** Creates rotated text and places a reference shape at its right boundary. */
export async function createRotatedTextCornerScaleSetup({
  editorModel,
  shapes,
  snapping,
  text
}: RotatedTextCornerScaleSetupParams): Promise<RotatedTextCornerScaleSetup> {
  const montage = await editorModel.getMontageAreaBounds()
  const textId = 'rotated-text'
  const created = await text.add({
    id: textId,
    text: 'Новый заголовок',
    left: montage.left + 150,
    top: montage.top + 190,
    width: 220,
    fontSize: 32,
    autoExpand: false
  })
  text.checkCreation({ textObject: created })
  text.checkCreation({ textObject: await text.rotate({ id: textId, angle: 55 }) })

  const initial = await text.getResizeSnapshot({ id: textId })
  const referenceGap = 24
  const referenceShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'reference-shape',
      left: initial.boundsRight + referenceGap,
      top: montage.top + 20,
      width: 40,
      height: 40,
      text: ''
    }
  })
  shapes.checkCreation({ shape: referenceShape, presetKey: 'square' })

  return Object.freeze({
    initial,
    reference: await snapping.getObjectSnapshot({ id: 'reference-shape' }),
    textId
  })
}
