import type { Textbox, TextboxProps } from 'fabric'
import { DIMENSION_EPSILON } from './constants'
import type { EditorTextbox } from './types'

/**
 * Возвращает ширину самой длинной строки текстового объекта.
 */
export const getLongestLineWidth = ({
  textbox,
  text
}: {
  textbox: EditorTextbox
  text: string
}): number => {
  const { textLines } = textbox as unknown as { textLines?: string[] }
  const lineCount = Array.isArray(textLines) && textLines.length > 0
    ? textLines.length
    : Math.max(text.split('\n').length, 1)

  let longestLineWidth = 0
  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    const lineWidth = textbox.getLineWidth(lineIndex)
    if (lineWidth > longestLineWidth) {
      longestLineWidth = lineWidth
    }
  }

  return longestLineWidth
}

/**
 * Сдвигает текстовый объект по X, чтобы он не выходил за пределы монтажной области.
 */
export const clampTextboxToMontage = ({
  textbox,
  montageLeft,
  montageRight
}: {
  textbox: EditorTextbox
  montageLeft: number
  montageRight: number
}): boolean => {
  textbox.setCoords()
  const bounds = textbox.getBoundingRect(false, true)
  const left = bounds.left ?? 0
  const right = left + (bounds.width ?? 0)
  const montageWidth = montageRight - montageLeft

  if (montageWidth > 0 && (bounds.width ?? 0) >= montageWidth - DIMENSION_EPSILON) {
    return false
  }

  let shiftX = 0
  if (left < montageLeft) {
    shiftX = montageLeft - left
  } else if (right > montageRight) {
    shiftX = montageRight - right
  }

  if (Math.abs(shiftX) <= DIMENSION_EPSILON) return false

  textbox.set({ left: (textbox.left ?? 0) + shiftX })
  return true
}

/**
 * Возвращает числовое значение размера, используя исходное значение или заранее вычисленное.
 */
const resolveDimension = (
  {
    rawValue,
    calculatedValue
  }: {
    rawValue: unknown
    calculatedValue?: unknown
  }
): number => {
  if (typeof rawValue === 'number') return rawValue

  if (typeof calculatedValue === 'number') {
    return calculatedValue
  }

  return 0
}

/**
 * Проверяет, есть ли среди стилей свойства, влияющие на перенос строк и высоту текста.
 */
export const hasLayoutAffectingStyles = ({
  stylesList
}: {
  stylesList: Array<Partial<TextboxProps>>
}): boolean => {
  const stylesCount = stylesList.length
  if (!stylesCount) return false

  for (let index = 0; index < stylesCount; index += 1) {
    const styles = stylesList[index]
    if (!styles) continue

    const {
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      lineHeight,
      charSpacing
    } = styles

    if (fontFamily !== undefined) return true
    if (fontSize !== undefined) return true
    if (fontWeight !== undefined) return true
    if (fontStyle !== undefined) return true
    if (lineHeight !== undefined) return true
    if (charSpacing !== undefined) return true
  }

  return false
}

/**
 * Округляет ширину и высоту текстового блока до ближайших целых значений.
 */
export const roundTextboxDimensions = (
  {
    textbox
  }: {
    textbox: EditorTextbox
  }
): boolean => {
  const { width: rawWidth, height: rawHeight, calcTextWidth, calcTextHeight } = textbox as Textbox

  const calculatedWidth = typeof calcTextWidth === 'function'
    ? calcTextWidth.call(textbox)
    : undefined
  const calculatedHeight = typeof calcTextHeight === 'function'
    ? calcTextHeight.call(textbox)
    : undefined

  const width = resolveDimension({
    rawValue: rawWidth,
    calculatedValue: calculatedWidth
  })
  const height = resolveDimension({
    rawValue: rawHeight,
    calculatedValue: calculatedHeight
  })

  const roundedWidth = Number.isFinite(width) ? Math.round(width) : null
  const roundedHeight = Number.isFinite(height) ? Math.round(height) : null
  const updates: Partial<EditorTextbox> = {}

  if (roundedWidth !== null && roundedWidth !== width) {
    updates.width = Math.max(0, roundedWidth)
  }

  if (roundedHeight !== null && roundedHeight !== height) {
    updates.height = Math.max(0, roundedHeight)
  }

  if (!Object.keys(updates).length) return false

  textbox.set(updates)
  return true
}
