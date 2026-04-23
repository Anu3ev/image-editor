import type {
  TextStyle,
  TextStyleDeclaration
} from 'fabric'
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
import {
  getFirstDiffIndex,
  getLineIndexByCharIndex,
  getLineStartIndex
} from './selection'

type TextboxStyles = TextStyle
type TextboxLineStyle = TextStyleDeclaration
type TextboxLineStyles = TextboxStyles[string]
type DeletedLineDefaultsCleanup = {
  lineIndex: number
  lineDefaults: LineFontDefault[]
}
type LineFontDefaultsTextChangeResult = {
  lineFontDefaults?: LineFontDefaults
  changed: boolean
  deletedLineDefaultsCleanup?: DeletedLineDefaultsCleanup
}
type LineFontDefaultsSyncResult = {
  lineFontDefaults?: LineFontDefaults
  lineFontDefaultsChanged: boolean
  styles: TextboxStyles
  stylesChanged: boolean
}

/**
 * Сдвигает lineFontDefaults вниз после вставки одной или нескольких строк.
 */
const resolveLineFontDefaultsAfterLineInsertion = ({
  deltaLines,
  diffIndex,
  lineFontDefaults,
  lineIndexOld,
  previousText
}: {
  deltaLines: number
  diffIndex: number
  lineFontDefaults: LineFontDefaults
  lineIndexOld: number
  previousText: string
}): LineFontDefaultsTextChangeResult => {
  const lineStartOld = getLineStartIndex({
    text: previousText,
    lineIndex: lineIndexOld
  })
  let shiftStartIndex = lineIndexOld + 1
  if (diffIndex === lineStartOld) {
    shiftStartIndex = lineIndexOld
  }

  const shiftedDefaults: LineFontDefaults = {}
  for (const key in lineFontDefaults) {
    if (!Object.prototype.hasOwnProperty.call(lineFontDefaults, key)) continue
    const numericIndex = Number(key)
    if (!Number.isFinite(numericIndex)) continue
    const lineDefault = lineFontDefaults[numericIndex]
    if (!lineDefault) continue

    const nextIndex = numericIndex >= shiftStartIndex
      ? numericIndex + deltaLines
      : numericIndex
    shiftedDefaults[nextIndex] = { ...lineDefault }
  }

  return {
    lineFontDefaults: shiftedDefaults,
    changed: true
  }
}

/**
 * Удаляет lineFontDefaults исчезнувших строк и сдвигает оставшиеся вверх.
 */
const resolveLineFontDefaultsAfterLineRemoval = ({
  deltaLines,
  diffIndex,
  lineFontDefaults,
  lineIndexOld,
  previousLines,
  previousText
}: {
  deltaLines: number
  diffIndex: number
  lineFontDefaults: LineFontDefaults
  lineIndexOld: number
  previousLines: string[]
  previousText: string
}): LineFontDefaultsTextChangeResult => {
  const removedLinesCount = Math.abs(deltaLines)
  let removedLineStart = lineIndexOld
  const oldChar = previousText[diffIndex]

  if (oldChar === '\n') {
    const lineText = previousLines[lineIndexOld] ?? ''
    if (lineText.length > 0) {
      removedLineStart = lineIndexOld + 1
    }
  }

  const removedLineEnd = removedLineStart + removedLinesCount - 1
  const shiftedDefaults: LineFontDefaults = {}
  const removedLineDefaults: LineFontDefault[] = []

  for (let lineIndex = removedLineStart; lineIndex <= removedLineEnd; lineIndex += 1) {
    const removedLineDefault = lineFontDefaults[lineIndex]
    if (removedLineDefault) {
      removedLineDefaults.push(removedLineDefault)
    }
  }

  for (const key in lineFontDefaults) {
    if (!Object.prototype.hasOwnProperty.call(lineFontDefaults, key)) continue
    const numericIndex = Number(key)
    if (!Number.isFinite(numericIndex)) continue
    const lineDefault = lineFontDefaults[numericIndex]
    if (!lineDefault) continue

    if (numericIndex < removedLineStart) {
      shiftedDefaults[numericIndex] = { ...lineDefault }
    }

    if (numericIndex > removedLineEnd) {
      shiftedDefaults[numericIndex + deltaLines] = { ...lineDefault }
    }
  }

  return {
    lineFontDefaults: shiftedDefaults,
    changed: true,
    deletedLineDefaultsCleanup: {
      lineIndex: removedLineStart,
      lineDefaults: removedLineDefaults
    }
  }
}

/**
 * Пересчитывает lineFontDefaults только для структурного изменения строк.
 */
const resolveLineFontDefaultsAfterTextChange = ({
  lineFontDefaults,
  previousText,
  currentText
}: {
  currentText: string
  lineFontDefaults?: LineFontDefaults
  previousText: string
}): LineFontDefaultsTextChangeResult => {
  if (!lineFontDefaults || !Object.keys(lineFontDefaults).length) {
    return {
      lineFontDefaults,
      changed: false
    }
  }

  const previousLines = previousText.split('\n')
  const currentLines = currentText.split('\n')
  const deltaLines = currentLines.length - previousLines.length
  if (deltaLines === 0) {
    return {
      lineFontDefaults,
      changed: false
    }
  }

  const diffIndex = getFirstDiffIndex({
    previous: previousText,
    next: currentText
  })
  const lineIndexOld = getLineIndexByCharIndex({
    text: previousText,
    charIndex: diffIndex
  })

  if (deltaLines > 0) {
    return resolveLineFontDefaultsAfterLineInsertion({
      deltaLines,
      diffIndex,
      lineFontDefaults,
      lineIndexOld,
      previousText
    })
  }

  return resolveLineFontDefaultsAfterLineRemoval({
    deltaLines,
    diffIndex,
    lineFontDefaults,
    lineIndexOld,
    previousLines,
    previousText
  })
}

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
  const defaultStyleKeys = Object.keys(defaultStyles) as Array<keyof TextboxLineStyle>
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
 * Удаляет из inline styles служебные значения строки, которая была полностью удалена.
 */
const removeDeletedLineDefaultStyles = ({
  cleanup,
  lineCount,
  styles
}: {
  cleanup?: DeletedLineDefaultsCleanup
  lineCount: number
  styles: TextboxStyles
}): { styles: TextboxStyles; changed: boolean } => {
  if (!cleanup) return { styles, changed: false }
  if (cleanup.lineIndex >= lineCount) return { styles, changed: false }

  let cleanupLineStyles: TextboxLineStyles | undefined = styles[cleanup.lineIndex]
  let cleanupChanged = false

  for (let index = 0; index < cleanup.lineDefaults.length; index += 1) {
    const lineDefaultsForCleanup = cleanup.lineDefaults[index]
    if (!lineDefaultsForCleanup) continue

    const cleanupResult = removeLineDefaultStyles({
      lineStyles: cleanupLineStyles,
      lineDefaults: lineDefaultsForCleanup
    })
    if (!cleanupResult.changed) continue

    cleanupLineStyles = cleanupResult.lineStyles
    cleanupChanged = true
  }

  if (!cleanupChanged) {
    return { styles, changed: false }
  }

  const nextStyles = { ...styles }

  if (cleanupLineStyles) {
    nextStyles[cleanup.lineIndex] = cleanupLineStyles
  } else {
    delete nextStyles[cleanup.lineIndex]
  }

  return {
    styles: nextStyles,
    changed: true
  }
}

/**
 * Собирает глобальные текстовые стили textbox в формате line defaults.
 */
const createGlobalLineDefaults = ({
  textbox
}: {
  textbox: EditorTextbox
}): LineFontDefault => {
  const {
    fontFamily,
    fontSize,
    fontStyle,
    fontWeight,
    fill: rawFill,
    stroke: rawStroke,
    strokeWidth,
    linethrough,
    underline
  } = textbox
  const globalLineDefaults: LineFontDefault = {}
  const fill = typeof rawFill === 'string' ? rawFill : undefined
  const stroke = typeof rawStroke === 'string' ? rawStroke : undefined

  if (fontFamily !== undefined) {
    globalLineDefaults.fontFamily = fontFamily
  }

  if (fontSize !== undefined) {
    globalLineDefaults.fontSize = fontSize
  }

  if (fontWeight !== undefined) {
    globalLineDefaults.fontWeight = fontWeight
  }

  if (fontStyle !== undefined) {
    globalLineDefaults.fontStyle = fontStyle
  }

  if (underline !== undefined) {
    globalLineDefaults.underline = underline
  }

  if (linethrough !== undefined) {
    globalLineDefaults.linethrough = linethrough
  }

  if (fill !== undefined) {
    globalLineDefaults.fill = fill
  }

  if (stroke !== undefined) {
    globalLineDefaults.stroke = stroke
  }

  if (strokeWidth !== undefined) {
    globalLineDefaults.strokeWidth = strokeWidth
  }

  return globalLineDefaults
}

/**
 * Разрешает line defaults для пустой строки от ближайшего line default или глобальных стилей textbox.
 */
const createEmptyLineDefaults = ({
  sourceDefaults,
  globalLineDefaults
}: {
  globalLineDefaults: LineFontDefault
  sourceDefaults?: LineFontDefault
}): LineFontDefault => {
  const resolvedDefaults: LineFontDefault = {}

  if (sourceDefaults?.fontFamily !== undefined) {
    resolvedDefaults.fontFamily = sourceDefaults.fontFamily
  } else if (globalLineDefaults.fontFamily !== undefined) {
    resolvedDefaults.fontFamily = globalLineDefaults.fontFamily
  }

  if (sourceDefaults?.fontSize !== undefined) {
    resolvedDefaults.fontSize = sourceDefaults.fontSize
  } else if (globalLineDefaults.fontSize !== undefined) {
    resolvedDefaults.fontSize = globalLineDefaults.fontSize
  }

  if (sourceDefaults?.fontWeight !== undefined) {
    resolvedDefaults.fontWeight = sourceDefaults.fontWeight
  } else if (globalLineDefaults.fontWeight !== undefined) {
    resolvedDefaults.fontWeight = globalLineDefaults.fontWeight
  }

  if (sourceDefaults?.fontStyle !== undefined) {
    resolvedDefaults.fontStyle = sourceDefaults.fontStyle
  } else if (globalLineDefaults.fontStyle !== undefined) {
    resolvedDefaults.fontStyle = globalLineDefaults.fontStyle
  }

  if (sourceDefaults?.underline !== undefined) {
    resolvedDefaults.underline = sourceDefaults.underline
  } else if (globalLineDefaults.underline !== undefined) {
    resolvedDefaults.underline = globalLineDefaults.underline
  }

  if (sourceDefaults?.linethrough !== undefined) {
    resolvedDefaults.linethrough = sourceDefaults.linethrough
  } else if (globalLineDefaults.linethrough !== undefined) {
    resolvedDefaults.linethrough = globalLineDefaults.linethrough
  }

  if (sourceDefaults?.fill !== undefined) {
    resolvedDefaults.fill = sourceDefaults.fill
  } else if (globalLineDefaults.fill !== undefined) {
    resolvedDefaults.fill = globalLineDefaults.fill
  }

  if (sourceDefaults?.stroke !== undefined) {
    resolvedDefaults.stroke = sourceDefaults.stroke
  } else if (globalLineDefaults.stroke !== undefined) {
    resolvedDefaults.stroke = globalLineDefaults.stroke
  }

  if (sourceDefaults?.strokeWidth !== undefined) {
    resolvedDefaults.strokeWidth = sourceDefaults.strokeWidth
  } else if (resolvedDefaults.stroke !== undefined && globalLineDefaults.strokeWidth !== undefined) {
    resolvedDefaults.strokeWidth = globalLineDefaults.strokeWidth
  }

  return resolvedDefaults
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
  const defaultStyleKeys = Object.keys(defaultStyles) as Array<keyof TextboxLineStyle>

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
 * Синхронизирует lineFontDefaults и inline styles с текущим набором строк текста.
 */
const syncLineFontDefaultsWithCurrentLines = ({
  deletedLineDefaultsCleanup,
  globalLineDefaults,
  lineFontDefaults,
  lines,
  styles
}: {
  deletedLineDefaultsCleanup?: DeletedLineDefaultsCleanup
  globalLineDefaults: LineFontDefault
  lineFontDefaults?: LineFontDefaults
  lines: string[]
  styles?: TextboxStyles
}): LineFontDefaultsSyncResult => {
  let nextLineDefaults = lineFontDefaults
  let lineDefaultsChanged = false
  let lineDefaultsCloned = false
  let nextStyles = styles
  let stylesChanged = false
  let stylesCloned = false
  let lastLineDefaults: LineFontDefault | undefined

  const cleanupResult = removeDeletedLineDefaultStyles({
    styles: nextStyles ?? {},
    lineCount: lines.length,
    cleanup: deletedLineDefaultsCleanup
  })
  if (cleanupResult.changed) {
    nextStyles = cleanupResult.styles
    stylesChanged = true
    stylesCloned = true
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const lineText = lines[lineIndex] ?? ''
    const storedLineDefaults = nextLineDefaults ? nextLineDefaults[lineIndex] : undefined

    if (storedLineDefaults) {
      lastLineDefaults = storedLineDefaults
    }

    const hasLineText = lineText.length !== 0
    if (hasLineText) {
      if (storedLineDefaults) {
        const syncResult = syncLineDefaultStyles({
          lineText,
          lineStyles: nextStyles ? nextStyles[lineIndex] : undefined,
          lineDefaults: storedLineDefaults
        })

        if (syncResult.changed) {
          if (!nextStyles) {
            nextStyles = {}
            stylesCloned = true
          }

          if (!stylesCloned) {
            nextStyles = { ...nextStyles }
            stylesCloned = true
          }

          if (syncResult.lineStyles) {
            nextStyles[lineIndex] = syncResult.lineStyles
          }

          if (!syncResult.lineStyles && nextStyles[lineIndex]) {
            delete nextStyles[lineIndex]
          }

          stylesChanged = true
        }
      }

      continue
    }

    const sourceDefaults = storedLineDefaults ?? lastLineDefaults
    const resolvedDefaults = createEmptyLineDefaults({
      sourceDefaults,
      globalLineDefaults
    })

    if (!storedLineDefaults && Object.keys(resolvedDefaults).length) {
      if (!nextLineDefaults) {
        nextLineDefaults = {}
        lineDefaultsCloned = true
      }

      if (!lineDefaultsCloned) {
        nextLineDefaults = { ...nextLineDefaults }
        lineDefaultsCloned = true
      }

      nextLineDefaults[lineIndex] = resolvedDefaults
      lineDefaultsChanged = true
      lastLineDefaults = resolvedDefaults
    }

    if (storedLineDefaults) {
      lastLineDefaults = storedLineDefaults
    }

    const allowedStyles = createLineDefaultStyle({ lineDefaults: resolvedDefaults })
    const hasAllowedStyles = Object.keys(allowedStyles).length > 0
    if (hasAllowedStyles || (nextStyles && nextStyles[lineIndex])) {
      if (!nextStyles) {
        nextStyles = {}
        stylesCloned = true
      }

      if (!stylesCloned) {
        nextStyles = { ...nextStyles }
        stylesCloned = true
      }

      if (hasAllowedStyles) {
        nextStyles[lineIndex] = { 0: allowedStyles }
      }

      if (!hasAllowedStyles && nextStyles[lineIndex]) {
        delete nextStyles[lineIndex]
      }

      stylesChanged = true
    }
  }

  return {
    lineFontDefaults: nextLineDefaults,
    lineFontDefaultsChanged: lineDefaultsChanged,
    styles: nextStyles ?? {},
    stylesChanged
  }
}

/**
 * Возвращает следующие lineFontDefaults и Fabric styles после изменения текста, не мутируя textbox.
 */
export const syncLineFontDefaultsAfterTextChange = ({
  currentText,
  previousText,
  textbox
}: {
  currentText: string
  previousText: string
  textbox: EditorTextbox
}): LineFontDefaultsSyncResult => {
  const lineDefaultsChange = resolveLineFontDefaultsAfterTextChange({
    lineFontDefaults: textbox.lineFontDefaults,
    previousText,
    currentText
  })
  const currentLinesSync = syncLineFontDefaultsWithCurrentLines({
    lines: currentText.split('\n'),
    styles: textbox.styles,
    lineFontDefaults: lineDefaultsChange.lineFontDefaults,
    deletedLineDefaultsCleanup: lineDefaultsChange.deletedLineDefaultsCleanup,
    globalLineDefaults: createGlobalLineDefaults({ textbox })
  })

  return {
    ...currentLinesSync,
    lineFontDefaultsChanged: lineDefaultsChange.changed || currentLinesSync.lineFontDefaultsChanged
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
