import type { TextboxProps } from 'fabric'
import type {
  LineFontDefault,
  LineFontDefaults
} from './background-textbox'
import type {
  EditorTextbox,
  LineFontDefaultUpdate
} from './types'
import {
  DIMENSION_EPSILON,
  MIN_TEXTBOX_FONT_SIZE
} from './constants'

type TextboxLineStyle = Partial<TextboxProps>
type TextboxLineStyles = Record<string, TextboxLineStyle>

/**
 * Создаёт Fabric style-объект из lineFontDefaults.
 */
export const createLineDefaultStyle = ({
  lineDefaults
}: {
  lineDefaults: LineFontDefault
}): TextboxLineStyle => {
  const styles: TextboxLineStyle = {}

  if (lineDefaults.fontFamily !== undefined) {
    styles.fontFamily = lineDefaults.fontFamily
  }

  if (lineDefaults.fontSize !== undefined) {
    styles.fontSize = lineDefaults.fontSize
  }

  if (lineDefaults.fontWeight !== undefined) {
    styles.fontWeight = lineDefaults.fontWeight
  }

  if (lineDefaults.fontStyle !== undefined) {
    styles.fontStyle = lineDefaults.fontStyle
  }

  if (lineDefaults.underline !== undefined) {
    styles.underline = lineDefaults.underline
  }

  if (lineDefaults.linethrough !== undefined) {
    styles.linethrough = lineDefaults.linethrough
  }

  if (lineDefaults.fill !== undefined) {
    styles.fill = lineDefaults.fill
  }

  if (lineDefaults.stroke !== undefined) {
    styles.stroke = lineDefaults.stroke
  }

  if (lineDefaults.strokeWidth !== undefined) {
    styles.strokeWidth = lineDefaults.strokeWidth
  }

  return styles
}

/**
 * Обновляет lineFontDefaults для указанных строк, изменяя только заданные поля.
 */
export const applyLineDefaultUpdates = ({
  textbox,
  lineIndices,
  updates
}: {
  textbox: EditorTextbox
  lineIndices: number[]
  updates: LineFontDefaultUpdate
}): boolean => {
  if (!lineIndices.length) return false

  const {
    fill,
    fontFamily,
    fontSize,
    fontStyle,
    fontWeight,
    linethrough,
    stroke,
    strokeWidth,
    underline
  } = updates
  const hasUpdates = fill !== undefined
    || fontFamily !== undefined
    || fontSize !== undefined
    || fontStyle !== undefined
    || fontWeight !== undefined
    || linethrough !== undefined
    || stroke !== undefined
    || strokeWidth !== undefined
    || underline !== undefined
  if (!hasUpdates) return false

  const { lineFontDefaults } = textbox
  let nextLineDefaults = lineFontDefaults ?? {}
  let lineDefaultsChanged = false
  let lineDefaultsCloned = false

  for (let index = 0; index < lineIndices.length; index += 1) {
    const lineIndex = lineIndices[index]
    if (!Number.isFinite(lineIndex)) continue

    const currentLineDefaults = lineDefaultsCloned
      ? nextLineDefaults[lineIndex]
      : lineFontDefaults?.[lineIndex]
    const nextLineDefault: LineFontDefault = currentLineDefaults
      ? { ...currentLineDefaults }
      : {}
    let lineChanged = false

    if (fontFamily !== undefined && currentLineDefaults?.fontFamily !== fontFamily) {
      nextLineDefault.fontFamily = fontFamily
      lineChanged = true
    }

    if (fontSize !== undefined && currentLineDefaults?.fontSize !== fontSize) {
      nextLineDefault.fontSize = fontSize
      lineChanged = true
    }

    if (fontWeight !== undefined && currentLineDefaults?.fontWeight !== fontWeight) {
      nextLineDefault.fontWeight = fontWeight
      lineChanged = true
    }

    if (fontStyle !== undefined && currentLineDefaults?.fontStyle !== fontStyle) {
      nextLineDefault.fontStyle = fontStyle
      lineChanged = true
    }

    if (underline !== undefined && currentLineDefaults?.underline !== underline) {
      nextLineDefault.underline = underline
      lineChanged = true
    }

    if (linethrough !== undefined && currentLineDefaults?.linethrough !== linethrough) {
      nextLineDefault.linethrough = linethrough
      lineChanged = true
    }

    if (fill !== undefined && currentLineDefaults?.fill !== fill) {
      nextLineDefault.fill = fill
      lineChanged = true
    }

    if (stroke !== undefined) {
      if (stroke === null) {
        if (currentLineDefaults?.stroke !== undefined) {
          delete nextLineDefault.stroke
          lineChanged = true
        }
      }

      if (stroke !== null && currentLineDefaults?.stroke !== stroke) {
        nextLineDefault.stroke = stroke
        lineChanged = true
      }
    }

    if (strokeWidth !== undefined && currentLineDefaults?.strokeWidth !== strokeWidth) {
      nextLineDefault.strokeWidth = strokeWidth
      lineChanged = true
    }

    if (!lineChanged) {
      continue
    }

    if (!lineDefaultsCloned) {
      nextLineDefaults = { ...nextLineDefaults }
      lineDefaultsCloned = true
    }

    nextLineDefaults[lineIndex] = nextLineDefault
    lineDefaultsChanged = true
  }

  if (lineDefaultsChanged) {
    textbox.lineFontDefaults = nextLineDefaults
  }

  return lineDefaultsChanged
}

/**
 * Убирает из inline-стилей свойства, которые были перенесены из удалённого line default.
 */
export const removeLineDefaultStyles = ({
  lineStyles,
  lineDefaults
}: {
  lineDefaults: LineFontDefault
  lineStyles?: TextboxLineStyles
}): { lineStyles?: TextboxLineStyles; changed: boolean } => {
  if (!lineStyles) return { lineStyles, changed: false }

  const defaultStyles = createLineDefaultStyle({ lineDefaults })
  const defaultStyleKeys = Object.keys(defaultStyles) as Array<keyof TextboxProps>
  if (!defaultStyleKeys.length) return { lineStyles, changed: false }

  let nextLineStyles = lineStyles
  let lineStylesCloned = false
  let stylesChanged = false

  for (const key in lineStyles) {
    if (!Object.prototype.hasOwnProperty.call(lineStyles, key)) continue

    const currentStyle = lineStyles[key]
    if (!currentStyle) continue

    let nextStyle = currentStyle
    let styleChanged = false

    for (let index = 0; index < defaultStyleKeys.length; index += 1) {
      const property = defaultStyleKeys[index]
      if (!property) continue
      if (currentStyle[property] !== defaultStyles[property]) continue

      if (!styleChanged) {
        nextStyle = { ...currentStyle }
        styleChanged = true
      }

      delete nextStyle[property]
    }

    if (!styleChanged) continue

    if (!lineStylesCloned) {
      nextLineStyles = { ...lineStyles }
      lineStylesCloned = true
    }

    if (Object.keys(nextStyle).length) {
      nextLineStyles[key] = nextStyle
    } else {
      delete nextLineStyles[key]
    }

    stylesChanged = true
  }

  if (!stylesChanged) {
    return { lineStyles, changed: false }
  }

  const hasStyles = Object.keys(nextLineStyles).length > 0

  return {
    lineStyles: hasStyles ? nextLineStyles : undefined,
    changed: true
  }
}

/**
 * Синхронизирует inline-стили строки с lineFontDefaults, заполняя пропуски.
 */
export const syncLineDefaultStyles = ({
  lineText,
  lineStyles,
  lineDefaults
}: {
  lineText: string
  lineStyles?: TextboxLineStyles
  lineDefaults: LineFontDefault
}): { lineStyles?: TextboxLineStyles; changed: boolean } => {
  const lineLength = lineText.length
  if (lineLength === 0) {
    return { lineStyles, changed: false }
  }

  const defaultStyles = createLineDefaultStyle({ lineDefaults })
  const defaultStyleKeys = Object.keys(defaultStyles) as Array<keyof TextboxProps>

  if (!defaultStyleKeys.length) {
    return { lineStyles, changed: false }
  }

  let nextLineStyles = lineStyles
  let stylesChanged = false
  let stylesCloned = false

  if (lineStyles) {
    for (const key in lineStyles) {
      if (!Object.prototype.hasOwnProperty.call(lineStyles, key)) continue
      const numericIndex = Number(key)
      const isNumericIndex = Number.isInteger(numericIndex)
      const isValidIndex = isNumericIndex
        && numericIndex >= 0
        && numericIndex < lineLength

      if (isValidIndex) continue

      if (!stylesCloned) {
        nextLineStyles = { ...lineStyles }
        stylesCloned = true
      }

      if (nextLineStyles && Object.prototype.hasOwnProperty.call(nextLineStyles, key)) {
        delete nextLineStyles[key]
      }

      stylesChanged = true
    }
  }

  for (let charIndex = 0; charIndex < lineLength; charIndex += 1) {
    const currentLineStyles = nextLineStyles ?? lineStyles
    const currentStyle = currentLineStyles ? currentLineStyles[charIndex] : undefined

    if (!currentStyle) {
      if (!nextLineStyles) {
        nextLineStyles = {}
        stylesCloned = true
      }

      if (!stylesCloned) {
        nextLineStyles = { ...nextLineStyles }
        stylesCloned = true
      }

      nextLineStyles[charIndex] = { ...defaultStyles }
      stylesChanged = true
      continue
    }

    const hasMissingDefaultStyle = defaultStyleKeys
      .some((property) => currentStyle[property] === undefined)
    if (!hasMissingDefaultStyle) {
      continue
    }

    if (!nextLineStyles) {
      nextLineStyles = {}
      stylesCloned = true
    }

    if (!stylesCloned) {
      nextLineStyles = { ...nextLineStyles }
      stylesCloned = true
    }

    nextLineStyles[charIndex] = {
      ...defaultStyles,
      ...currentStyle
    }
    stylesChanged = true
  }

  return {
    lineStyles: nextLineStyles,
    changed: stylesChanged
  }
}

/**
 * Создаёт копию lineFontDefaults для безопасных обновлений.
 */
export const cloneLineFontDefaults = ({
  lineFontDefaults
}: {
  lineFontDefaults?: LineFontDefaults
}): LineFontDefaults | undefined => {
  if (!lineFontDefaults) return undefined

  const clonedDefaults: LineFontDefaults = {}
  for (const key in lineFontDefaults) {
    if (!Object.prototype.hasOwnProperty.call(lineFontDefaults, key)) continue
    const numericIndex = Number(key)
    if (!Number.isFinite(numericIndex)) continue
    const lineDefault = lineFontDefaults[numericIndex]
    if (!lineDefault) continue
    clonedDefaults[numericIndex] = { ...lineDefault }
  }

  return clonedDefaults
}

/**
 * Масштабирует fontSize в lineFontDefaults по заданному коэффициенту,
 * не позволяя ему уйти ниже минимального размера текста.
 */
export const scaleLineFontDefaults = ({
  lineFontDefaults,
  scale
}: {
  lineFontDefaults?: LineFontDefaults
  scale: number
}): LineFontDefaults | undefined => {
  if (!lineFontDefaults) return undefined
  if (!Number.isFinite(scale)) return undefined
  if (Math.abs(scale - 1) < DIMENSION_EPSILON) return undefined

  const scaledDefaults: LineFontDefaults = {}
  let hasEntries = false
  let hasScaledFontSize = false

  for (const key in lineFontDefaults) {
    if (!Object.prototype.hasOwnProperty.call(lineFontDefaults, key)) continue
    const numericIndex = Number(key)
    if (!Number.isFinite(numericIndex)) continue
    const lineDefault = lineFontDefaults[numericIndex]
    if (!lineDefault) continue

    const nextLineDefault: LineFontDefault = { ...lineDefault }
    if (typeof lineDefault.fontSize === 'number') {
      const minimumFontSize = Math.min(MIN_TEXTBOX_FONT_SIZE, lineDefault.fontSize)
      nextLineDefault.fontSize = Math.max(minimumFontSize, lineDefault.fontSize * scale)
      hasScaledFontSize = true
    }

    scaledDefaults[numericIndex] = nextLineDefault
    hasEntries = true
  }

  if (!hasEntries || !hasScaledFontSize) return undefined

  return scaledDefaults
}
