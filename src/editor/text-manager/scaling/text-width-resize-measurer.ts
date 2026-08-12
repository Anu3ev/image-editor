import { Point } from 'fabric'
import { BackgroundTextbox, type BackgroundTextboxProps } from '../background-textbox'
import type { EditorTextbox } from '../types'
import { cloneLineFontDefaults } from '../line-defaults'
import type { ScaleStepProjectionInput } from '../../snapping-manager/scaling/scale-snapping-resolver'
import { applyCanonicalTextboxWidth } from './text-width-materialization'
import {
  createTextWidthResizeStepProjection,
  type TextWidthResizeGestureProjection
} from './text-width-resize-projection'

/** Точная геометрия Textbox при проверяемой ширине. */
export type TextWidthResizeMeasurement = Readonly<{
  projection: ScaleStepProjectionInput
  width: number
}>

/** Создаёт копию посимвольных стилей для независимого измерительного Textbox. */
function cloneTextboxStyles({ textbox }: { textbox: EditorTextbox }): EditorTextbox['styles'] {
  const styles: NonNullable<EditorTextbox['styles']> = {}

  Object.entries(textbox.styles ?? {}).forEach(([lineIndex, lineStyles]) => {
    if (!lineStyles) return

    const clonedLineStyles: typeof lineStyles = {}
    Object.entries(lineStyles).forEach(([characterIndex, characterStyle]) => {
      if (!characterStyle) return

      clonedLineStyles[characterIndex] = { ...characterStyle }
    })
    styles[lineIndex] = clonedLineStyles
  })

  return styles
}

/** Собирает свойства, влияющие на перенос строк и точную геометрию текста. */
function createMeasurementTextboxOptions({
  target,
  gesture
}: {
  target: EditorTextbox
  gesture: TextWidthResizeGestureProjection
}): BackgroundTextboxProps {
  return {
    left: target.left,
    top: target.top,
    originX: target.originX,
    originY: target.originY,
    angle: target.angle,
    scaleX: target.scaleX,
    scaleY: target.scaleY,
    width: gesture.baselineWidth,
    fontFamily: target.fontFamily,
    fontSize: target.fontSize,
    fontStyle: target.fontStyle,
    fontWeight: target.fontWeight,
    lineHeight: target.lineHeight,
    charSpacing: target.charSpacing,
    textAlign: target.textAlign,
    direction: target.direction,
    splitByGrapheme: target.splitByGrapheme,
    fill: target.fill,
    stroke: target.stroke,
    strokeWidth: target.strokeWidth,
    strokeUniform: target.strokeUniform,
    paintFirst: target.paintFirst,
    styles: cloneTextboxStyles({ textbox: target }),
    lineFontDefaults: cloneLineFontDefaults({ lineFontDefaults: target.lineFontDefaults }),
    backgroundColor: target.backgroundColor,
    backgroundOpacity: target.backgroundOpacity,
    paddingTop: target.paddingTop,
    paddingRight: target.paddingRight,
    paddingBottom: target.paddingBottom,
    paddingLeft: target.paddingLeft,
    radiusTopLeft: target.radiusTopLeft,
    radiusTopRight: target.radiusTopRight,
    radiusBottomRight: target.radiusBottomRight,
    radiusBottomLeft: target.radiusBottomLeft,
    autoExpand: false
  }
}

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
    this.textbox = new BackgroundTextbox(
      target.text ?? '',
      createMeasurementTextboxOptions({ target, gesture })
    )
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
