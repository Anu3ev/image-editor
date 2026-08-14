import { BackgroundTextbox, type BackgroundTextboxProps } from '../background-textbox'
import { cloneLineFontDefaults } from '../line-defaults'
import type { EditorTextbox } from '../types'
import { applyCanonicalTextboxWidth } from './text-width-materialization'

/** Настройки отдельного Textbox, который используется только для измерения геометрии. */
type TextScalingMeasurementOptions = Readonly<{
  autoExpand?: boolean
}>

/** Создаёт независимую копию посимвольных стилей для измерительного Textbox. */
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

/** Собирает свойства, которые влияют на перенос строк и внешнюю геометрию текста. */
function createMeasurementTextboxOptions({
  target,
  autoExpand
}: {
  target: EditorTextbox
  autoExpand: boolean
}): BackgroundTextboxProps {
  return {
    left: target.left,
    top: target.top,
    originX: target.originX,
    originY: target.originY,
    angle: target.angle,
    scaleX: target.scaleX,
    scaleY: target.scaleY,
    width: target.width,
    minWidth: target.minWidth,
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
    autoExpand
  }
}

/** Создаёт Textbox для расчётов, не добавляя его на холст и не меняя исходный объект. */
export function createTextScalingMeasurementTextbox({
  target,
  options = {}
}: {
  target: EditorTextbox
  options?: TextScalingMeasurementOptions
}): EditorTextbox {
  const autoExpand = options.autoExpand ?? (target.autoExpand !== false)
  const textbox = new BackgroundTextbox(
    target.text ?? '',
    createMeasurementTextboxOptions({ target, autoExpand })
  )
  const { width } = target

  if (typeof width === 'number' && Number.isFinite(width)) {
    applyCanonicalTextboxWidth({ textbox, width })
    textbox.autoExpand = autoExpand
  }

  return textbox
}
