import { Point } from 'fabric'
import type { EditorTextbox } from '../types'
import type { ScaleStepProjectionInput } from '../../snapping-manager/scaling/scale-snapping-resolver'
import { applyCanonicalTextboxWidth } from './text-width-materialization'
import { createTextScalingMeasurementTextbox } from './text-scaling-measurement'
import {
  createTextWidthResizeStepProjection,
  type TextWidthResizeGestureProjection
} from './text-width-resize-projection'

/** Exact Textbox geometry at the width being checked. */
export type TextWidthResizeMeasurement = Readonly<{
  projection: ScaleStepProjectionInput
  width: number
}>

/** Measures line wrapping outside the current interaction's live object. */
export default class TextWidthResizeMeasurer {
  /** Separate Textbox that is not added to the canvas. */
  private readonly textbox: EditorTextbox

  /** Original geometry and fixed point of the current gesture. */
  private readonly gesture: TextWidthResizeGestureProjection

  /** Creates a measurement Textbox with a copy of the live object's properties. */
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

  /** Returns exact geometry after wrapping lines at the given width. */
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

  /** Releases the measurement Textbox's internal resources. */
  public dispose(): void {
    this.textbox.dispose()
  }
}
