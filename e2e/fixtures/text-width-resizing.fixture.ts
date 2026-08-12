import type { EditorModel } from '../models/editor.model'
import type { ShapeModel } from '../models/shape/shape.model'
import type { SnappingModel } from '../models/snapping.model'
import type { TemplateModel } from '../models/template.model'
import type { TextModel } from '../models/text/text.model'
import type {
  SnappingObjectSnapshot,
  TextResizeGuideAxis,
  TextResizeSide,
  TextResizeSnapshot
} from '../types'

/** Внешняя грань объекта, которой управляет выбранная боковая ручка. */
export type TextWidthResizeMovingEdge = 'boundsBottom' | 'boundsLeft' | 'boundsRight' | 'boundsTop'

/** Готовая сцена для проверки прилипания при изменении ширины текста. */
export type TextWidthResizeSetup = Readonly<{
  guidePosition: number
  initial: TextResizeSnapshot
  movingEdge: TextWidthResizeMovingEdge
  reference: SnappingObjectSnapshot
  referenceId: string
  textId: string
}>

/** Сцена, в которой прилипание меняет перенос строк в отдельном тексте. */
export type TextWrapSnapCorrectionSetup = Readonly<{
  initial: TextResizeSnapshot
  probeInitial: TextResizeSnapshot
  rawWidth: number
  reference: SnappingObjectSnapshot
  targetId: string
  wrappedProbe: TextResizeSnapshot
}>

/** Сцена с текстом, созданным напрямую и восстановленным из шаблона. */
export type TextResizeCreationSetup = Readonly<{
  directTextId: string
  reference: SnappingObjectSnapshot
  templateTextId: string
}>

/** Исходные состояния текста до сужения после сохранения и повторного применения шаблона. */
export type TextResizeTemplateRoundtripSetup = Readonly<{
  sourceInitial: TextResizeSnapshot
  templateInitial: TextResizeSnapshot
}>

/** Параметры сцены с текстом и отдельной опорной фигурой. */
type TextWidthResizeSetupParams = Readonly<{
  angle: number
  axis: TextResizeGuideAxis
  editorModel: EditorModel
  shapes: ShapeModel
  side: TextResizeSide
  snapping: SnappingModel
  text: TextModel
}>

/** Зависимости для подготовки сцены с переносом строк у направляющей. */
type TextWrapSnapCorrectionSetupParams = Readonly<{
  editorModel: EditorModel
  shapes: ShapeModel
  snapping: SnappingModel
  text: TextModel
}>

/** Зависимости для сравнения двух способов создания текста. */
type TextResizeCreationSetupParams = Readonly<{
  shapes: ShapeModel
  snapping: SnappingModel
  text: TextModel
}>

/** Зависимости для подготовки текста и его повторно применённого шаблона. */
type TextResizeTemplateRoundtripSetupParams = Readonly<{
  editorModel: EditorModel
  template: TemplateModel
  text: TextModel
}>

/** Определяет грань видимой рамки и знак её смещения при изменении ширины. */
function resolveMovingEdge({
  angle,
  axis,
  side
}: {
  angle: number
  axis: TextResizeGuideAxis
  side: TextResizeSide
}): Readonly<{
  coefficient: number
  edge: TextWidthResizeMovingEdge
}> {
  const radians = angle * (Math.PI / 180)
  const direction = side === 'right' ? 1 : -1
  const coefficient = (axis === 'x' ? Math.cos(radians) : Math.sin(radians)) * direction
  if (Math.abs(coefficient) <= 0.000000001) {
    throw new Error('Выбранная боковая ручка не двигает грань по заданной оси')
  }

  if (axis === 'x') {
    return { coefficient, edge: coefficient > 0 ? 'boundsRight' : 'boundsLeft' }
  }

  return { coefficient, edge: coefficient > 0 ? 'boundsBottom' : 'boundsTop' }
}

/** Возвращает положение опорной фигуры и её грань с нужной направляющей. */
function resolveReferencePlacement({
  axis,
  guidePosition,
  movingEdge,
  montageLeft,
  montageTop
}: {
  axis: TextResizeGuideAxis
  guidePosition: number
  montageLeft: number
  montageTop: number
  movingEdge: TextWidthResizeMovingEdge
}): Readonly<{
  left: number
  sourceEdge: 'boundsBottom' | 'boundsLeft' | 'boundsRight' | 'boundsTop'
  top: number
}> {
  if (axis === 'x') {
    const usesLeftGuide = movingEdge === 'boundsRight'

    return {
      left: usesLeftGuide ? guidePosition : guidePosition - 40,
      sourceEdge: usesLeftGuide ? 'boundsLeft' : 'boundsRight',
      top: montageTop + 30
    }
  }

  const usesTopGuide = movingEdge === 'boundsBottom'

  return {
    left: montageLeft + 30,
    sourceEdge: usesTopGuide ? 'boundsTop' : 'boundsBottom',
    top: usesTopGuide ? guidePosition : guidePosition - 40
  }
}

/** Добавляет и поворачивает текст с заметными защищёнными визуальными свойствами. */
async function createResizeText({
  angle,
  montageLeft,
  montageTop,
  text,
  textId
}: {
  angle: number
  montageLeft: number
  montageTop: number
  text: TextModel
  textId: string
}): Promise<TextResizeSnapshot> {
  const createdText = await text.add({
    id: textId,
    text: 'Текст',
    left: montageLeft + 200,
    top: montageTop + 210,
    width: 260,
    fontSize: 28,
    autoExpand: false,
    paddingTop: 7,
    paddingRight: 11,
    paddingBottom: 13,
    paddingLeft: 17,
    radiusTopLeft: 3,
    radiusTopRight: 5,
    radiusBottomRight: 7,
    radiusBottomLeft: 9
  })
  text.checkCreation({ textObject: createdText })
  text.checkCreation({ textObject: await text.rotate({ id: textId, angle }) })

  return text.getResizeSnapshot({ id: textId })
}

/** Создаёт короткий текст и направляющую на пути выбранной боковой ручки. */
export async function createTextWidthResizeSetup({
  angle,
  axis,
  editorModel,
  shapes,
  side,
  snapping,
  text
}: TextWidthResizeSetupParams): Promise<TextWidthResizeSetup> {
  const montage = await editorModel.getMontageAreaBounds()
  const textId = `side-resize-${side}-${axis}`
  const referenceId = 'side-resize-reference'
  const initial = await createResizeText({
    angle,
    montageLeft: montage.left,
    montageTop: montage.top,
    text,
    textId
  })
  const { coefficient, edge: movingEdge } = resolveMovingEdge({ angle, axis, side })
  const desiredGuide = initial[movingEdge] - (Math.sign(coefficient) * 50)
  const placement = resolveReferencePlacement({
    axis,
    guidePosition: desiredGuide,
    montageLeft: montage.left,
    montageTop: montage.top,
    movingEdge
  })
  const shape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: referenceId,
      left: placement.left,
      top: placement.top,
      width: 40,
      height: 40,
      text: ''
    }
  })
  shapes.checkCreation({ shape, presetKey: 'square' })

  const reference = await snapping.getObjectSnapshot({ id: referenceId })

  return Object.freeze({
    guidePosition: reference[placement.sourceEdge],
    initial,
    movingEdge,
    reference,
    referenceId,
    textId
  })
}

/** Подбирает ширину переноса строк и создаёт рядом направляющую, до которой текст не доходит без прилипания. */
export async function createTextWrapSnapCorrectionSetup({
  editorModel,
  shapes,
  snapping,
  text
}: TextWrapSnapCorrectionSetupParams): Promise<TextWrapSnapCorrectionSetup> {
  const montage = await editorModel.getMontageAreaBounds()
  const probe = await text.addRegressionText({
    left: montage.left + 40,
    top: montage.top + 80
  })
  text.checkCreation({ textObject: probe })
  if (typeof probe.id !== 'string') throw new Error('У проверочного текста должен существовать id')

  const probeInitial = await text.getResizeSnapshot({ id: probe.id })
  const wrappedProbe = await text.resizeFromRightUntilTextWraps({ id: probe.id, ctrlKey: true })
  await text.finishResize({ id: probe.id })

  const target = await text.addRegressionText({
    left: montage.left + 210,
    top: montage.top + 280
  })
  text.checkCreation({ textObject: target })
  if (typeof target.id !== 'string') throw new Error('У тестового текста должен существовать id')

  const targetId = target.id
  const initial = await text.getResizeSnapshot({ id: targetId })
  const guidePosition = initial.boundsRight + ((wrappedProbe.width + 2) - initial.width)
  const referenceId = 'text-wrap-reference'
  const referenceShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: referenceId,
      left: guidePosition,
      top: montage.top + 20,
      width: 40,
      height: 40,
      text: ''
    }
  })
  shapes.checkCreation({ shape: referenceShape, presetKey: 'square' })

  const reference = await snapping.getObjectSnapshot({ id: referenceId })
  const snappedWidth = initial.width + reference.boundsLeft - initial.boundsRight

  return Object.freeze({
    initial,
    probeInitial,
    rawWidth: snappedWidth - 3,
    reference,
    targetId,
    wrappedProbe
  })
}

/** Создаёт опорную фигуру и одинаковый текст двумя публичными способами. */
export async function createTextResizeCreationSetup({
  shapes,
  snapping,
  text
}: TextResizeCreationSetupParams): Promise<TextResizeCreationSetup> {
  const referenceId = 'reference-shape'
  shapes.checkCreation({
    shape: await shapes.add({
      presetKey: 'square',
      options: {
        id: referenceId,
        left: 340,
        top: 220,
        width: 80,
        height: 80,
        text: ''
      }
    }),
    presetKey: 'square'
  })
  const directText = text.checkCreation({
    textObject: await text.addRegressionText({ left: 281, top: 352 })
  })
  const templateText = text.checkCreation({ textObject: await text.applyRegressionTemplate() })
  if (typeof directText.id !== 'string') throw new Error('У текста, созданного напрямую, должен существовать id')
  if (typeof templateText.id !== 'string') throw new Error('У текста из шаблона должен существовать id')

  return Object.freeze({
    directTextId: directText.id,
    reference: await snapping.getObjectSnapshot({ id: referenceId }),
    templateTextId: templateText.id
  })
}

/** Сохраняет текст в шаблон, применяет его повторно и разносит два объекта по вертикали. */
export async function createTextResizeTemplateRoundtripSetup({
  editorModel,
  template,
  text
}: TextResizeTemplateRoundtripSetupParams): Promise<TextResizeTemplateRoundtripSetup> {
  text.checkCreation({ textObject: await text.addRegressionText({ top: 96 }) })
  await text.select({ objectIndex: 0 })

  const serializedTemplate = await template.serializeSelection()
  if (!serializedTemplate) throw new Error('Выделенный текст должен сохраниться в шаблон')

  const insertedCount = await template.applyTemplate({ template: serializedTemplate })
  if (insertedCount !== 1) throw new Error('Из шаблона должен быть добавлен один текстовый объект')
  await editorModel.checkObjectCount({ count: 2 })

  const sourceInitial = await text.getResizeSnapshot({ objectIndex: 0 })
  await text.updateStyle({
    objectIndex: 1,
    style: {
      left: sourceInitial.left,
      top: sourceInitial.top + 90
    }
  })

  return Object.freeze({
    sourceInitial,
    templateInitial: await text.getResizeSnapshot({ objectIndex: 1 })
  })
}
