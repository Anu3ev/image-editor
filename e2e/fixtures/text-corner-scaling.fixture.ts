import type { EditorModel } from '../models/editor.model'
import type { ShapeModel } from '../models/shape/shape.model'
import type { SnappingModel } from '../models/snapping.model'
import type { TextModel } from '../models/text/text.model'
import type { SnappingObjectSnapshot, TextResizeSnapshot } from '../types'

/** Сцена известного сбоя при скейлинге повёрнутого текста за угловую ручку. */
export type RotatedTextCornerScaleSetup = Readonly<{
  initial: TextResizeSnapshot
  reference: SnappingObjectSnapshot
  textId: string
}>

/** Зависимости для подготовки повёрнутого текста у направляющей. */
type RotatedTextCornerScaleSetupParams = Readonly<{
  editorModel: EditorModel
  shapes: ShapeModel
  snapping: SnappingModel
  text: TextModel
}>

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
  const referenceShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'reference-shape',
      left: initial.boundsRight,
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
