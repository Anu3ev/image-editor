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

/** Данные отдельного текста и фигуры у двух границ выбранной угловой ручки. */
export type TextCornerScaleSetup = Readonly<{
  initial: TextCornerScaleSnapshot
  reference: SnappingObjectSnapshot
  referenceId: string
  snapPoint: Readonly<{ x: number; y: number }>
  textId: string
}>

/** Масштабированный текст и готовый шаблон для проверки восстановления геометрии. */
export type ScaledTextCornerTemplateSetup = Readonly<{
  committed: TextCornerScaleSnapshot
  live: TextCornerScaleSnapshot
  serializedTemplate: TemplateDefinition
  setup: TextCornerScaleSetup
}>

/** Данные известного сбоя при скейлинге повёрнутого текста за угловую ручку. */
export type RotatedTextCornerScaleSetup = Readonly<{
  initial: TextResizeSnapshot
  reference: SnappingObjectSnapshot
  textId: string
}>

/** Данные уменьшения текста до минимально допустимого размера рядом с недостижимой направляющей. */
export type MinimumTextCornerScaleSetup = Readonly<{
  initial: TextResizeSnapshot
  snapPoint: Readonly<{ x: number; y: number }>
  textId: string
}>

/** Зависимости проверки уменьшения текста до минимально допустимого размера. */
type MinimumTextCornerScaleSetupParams = Readonly<{
  shapes: ShapeModel
  snapping: SnappingModel
  text: TextModel
}>

/** Зависимости для подготовки повёрнутого текста у направляющей. */
type RotatedTextCornerScaleSetupParams = Readonly<{
  editorModel: EditorModel
  shapes: ShapeModel
  snapping: SnappingModel
  text: TextModel
}>

/** Параметры проверки одной угловой ручки отдельного текста. */
type TextCornerScaleSetupParams = RotatedTextCornerScaleSetupParams & Readonly<{
  centered?: boolean
  corner: TextCornerScaleHandle
}>

/** Зависимости подготовки масштабированного текста и его шаблона. */
type ScaledTextCornerTemplateSetupParams = TextCornerScaleSetupParams & Readonly<{
  template: TemplateModel
}>

/** Параметры опорной фигуры для уже существующего текста. */
type TextCornerScaleReferenceSetupParams = Readonly<{
  centered?: boolean
  corner: TextCornerScaleHandle
  shapes: ShapeModel
  snapping: SnappingModel
  text: TextModel
  textId: string
}>

/** Канонические свойства текста в сценариях углового скейлинга. */
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

/** Возвращает положение фигуры за двумя перемещаемыми границами выбранного угла. */
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

/** Рассчитывает ожидаемые границы пропорционального скейлинга из точного исходного снимка. */
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

/** Возвращает точку сцены, в которой обе перемещаемые границы совпадут с фигурой. */
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

/** Добавляет опорную фигуру у целевых границ уже существующего текста. */
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

/** Создаёт текст и ставит опорную фигуру вплотную к границам выбранной ручки. */
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

/** Создаёт текст, увеличивает его за угол и сохраняет выделение в шаблон. */
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

/** Создаёт текст и направляющие в точке, лежащей ниже его минимального размера. */
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

/** Создаёт повёрнутый текст и ставит опорную фигуру у его правой границы. */
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
