import type { TextboxProps } from 'fabric'
import type {
  LineFontDefault,
  LineFontDefaults
} from './background-textbox'
import type {
  EditorTextbox,
  LineFontDefaultUpdate
} from './types'
import { DIMENSION_EPSILON } from './constants'

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
    fontFamily,
    fontSize,
    fill,
    stroke
  } = updates
  const hasUpdates = fontFamily !== undefined
    || fontSize !== undefined
    || fill !== undefined
    || stroke !== undefined
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
 * Синхронизирует inline-стили строки с lineFontDefaults, заполняя пропуски.
 */
export const syncLineDefaultStyles = ({
  lineText,
  lineStyles,
  lineDefaults
}: {
  lineText: string
  lineStyles?: Record<string, TextboxProps>
  lineDefaults: LineFontDefault
}): { lineStyles?: Record<string, TextboxProps>; changed: boolean } => {
  const lineLength = lineText.length
  if (lineLength === 0) {
    return { lineStyles, changed: false }
  }

  const {
    fontFamily,
    fontSize,
    fill,
    stroke
  } = lineDefaults
  const hasDefaults = fontFamily !== undefined
    || fontSize !== undefined
    || fill !== undefined
    || stroke !== undefined
  if (!hasDefaults) {
    return { lineStyles, changed: false }
  }

  const defaultStyles: Partial<TextboxProps> = {}
  if (fontFamily !== undefined) {
    defaultStyles.fontFamily = fontFamily
  }

  if (fontSize !== undefined) {
    defaultStyles.fontSize = fontSize
  }

  if (fill !== undefined) {
    defaultStyles.fill = fill
  }

  if (stroke !== undefined) {
    defaultStyles.stroke = stroke
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

    let nextCharStyles: TextboxProps | null = null

    if (fontFamily !== undefined && currentStyle.fontFamily === undefined) {
      nextCharStyles = { ...currentStyle }
      nextCharStyles.fontFamily = fontFamily
    }

    if (fontSize !== undefined && currentStyle.fontSize === undefined) {
      if (!nextCharStyles) {
        nextCharStyles = { ...currentStyle }
      }
      nextCharStyles.fontSize = fontSize
    }

    if (fill !== undefined && currentStyle.fill === undefined) {
      if (!nextCharStyles) {
        nextCharStyles = { ...currentStyle }
      }
      nextCharStyles.fill = fill
    }

    if (stroke !== undefined && currentStyle.stroke === undefined) {
      if (!nextCharStyles) {
        nextCharStyles = { ...currentStyle }
      }
      nextCharStyles.stroke = stroke
    }

    if (!nextCharStyles) {
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

    nextLineStyles[charIndex] = nextCharStyles
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
 * Масштабирует fontSize в lineFontDefaults по заданному коэффициенту.
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
      nextLineDefault.fontSize = Math.max(1, lineDefault.fontSize * scale)
      hasScaledFontSize = true
    }

    scaledDefaults[numericIndex] = nextLineDefault
    hasEntries = true
  }

  if (!hasEntries || !hasScaledFontSize) return undefined

  return scaledDefaults
}
