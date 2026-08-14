import { Point } from 'fabric'
import type { EditorTextbox } from '../types'
import type { ScaleStepProjectionInput } from '../../snapping-manager/scaling/scale-snapping-resolver'
import { applyCanonicalTextboxWidth } from './text-width-materialization'
import { createTextScalingMeasurementTextbox } from './text-scaling-measurement'
import {
  createTextWidthResizeStepProjection,
  type TextWidthResizeGestureProjection
} from './text-width-resize-projection'

/** Точная геометрия Textbox при проверяемой ширине. */
export type TextWidthResizeMeasurement = Readonly<{
  projection: ScaleStepProjectionInput
  width: number
}>

/** Измеряет перенос строк вне живого объекта текущего взаимодействия. */
export default class TextWidthResizeMeasurer {
  /** Отдельный Textbox, который не добавляется на холст. */
  private readonly textbox: EditorTextbox

  /** Исходная геометрия и неподвижная точка текущего жеста. */
  private readonly gesture: TextWidthResizeGestureProjection

  /** Создаёт измерительный Textbox с копией свойств живого объекта. */
  constructor({
    target,
    gesture
  }: {
    target: EditorTextbox
    gesture: TextWidthResizeGestureProjection
  }) {
    this.gesture = gesture
    this.textbox = createTextScalingMeasurementTextbox({
      target,
      options: { autoExpand: false }
    })
  }

  /** Возвращает точную геометрию после переноса строк при заданной ширине. */
  public measure({ width }: { width: number }): TextWidthResizeMeasurement {
    const appliedWidth = applyCanonicalTextboxWidth({ textbox: this.textbox, width })
    const {
      anchorOriginX,
      anchorOriginY,
      fixedAnchor
    } = this.gesture
    this.textbox.setPositionByOrigin(
      new Point(fixedAnchor.x, fixedAnchor.y),
      anchorOriginX,
      anchorOriginY
    )
    this.textbox.setCoords()

    const projection = createTextWidthResizeStepProjection({
      textbox: this.textbox,
      gesture: this.gesture
    })
    if (!projection) {
      throw new Error('Не удалось измерить геометрию Textbox после переноса строк')
    }

    return Object.freeze({ projection, width: appliedWidth })
  }

  /** Освобождает внутренние ресурсы измерительного Textbox. */
  public dispose(): void {
    this.textbox.dispose()
  }
}
