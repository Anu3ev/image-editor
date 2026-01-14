import type { TextSelectionRange } from '../utils/text'
import type { EditorTextbox } from './types'

/**
 * Возвращает диапазоны символов для каждой строки текста без учёта символов переноса.
 */
export const getLineRanges = ({
  textbox
}: {
  textbox: EditorTextbox
}): TextSelectionRange[] => {
  const text = textbox.text ?? ''
  if (!text.length) return []

  const lines = text.split('\n')
  const ranges: TextSelectionRange[] = []
  let offset = 0

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? ''
    const start = offset
    const end = offset + line.length
    offset = end + 1
    ranges.push({ start, end })
  }

  return ranges
}

/**
 * Клампит диапазон выделения к длине текста и нормализует порядок.
 */
export const clampSelectionRange = ({
  range,
  text
}: {
  range: TextSelectionRange | null
  text: string
}): TextSelectionRange | null => {
  if (!range) return null

  const textLength = text.length
  if (textLength <= 0) return null

  const { start: rawStart, end: rawEnd } = range
  const startValue = Number.isFinite(rawStart) ? rawStart : 0
  const endValue = Number.isFinite(rawEnd) ? rawEnd : startValue

  const clampedStart = Math.max(0, Math.min(startValue, textLength))
  const clampedEnd = Math.max(0, Math.min(endValue, textLength))
  const start = Math.min(clampedStart, clampedEnd)
  const end = Math.max(clampedStart, clampedEnd)

  if (start === end) return null

  return { start, end }
}

/**
 * Расширяет выделение до полных строк, которые оно пересекает.
 */
export const expandRangeToFullLines = ({
  textbox,
  range
}: {
  textbox: EditorTextbox
  range: TextSelectionRange
}): TextSelectionRange => {
  const lineRanges = getLineRanges({ textbox })
  if (!lineRanges.length) return range

  let { start } = range
  let { end } = range

  for (let index = 0; index < lineRanges.length; index += 1) {
    const lineRange = lineRanges[index]
    if (!lineRange) continue

    const { start: lineStart, end: lineEnd } = lineRange
    const intersectsLine = range.end > lineStart && range.start < lineEnd
    if (!intersectsLine) continue

    start = Math.min(start, lineStart)
    end = Math.max(end, lineEnd)
  }

  return { start, end }
}

/**
 * Возвращает индексы строк, пересекающихся с диапазоном символов.
 */
export const getLineIndicesForRange = ({
  textbox,
  range
}: {
  textbox: EditorTextbox
  range: TextSelectionRange
}): number[] => {
  const text = textbox.text ?? ''
  if (!text.length) return []

  const { start, end } = range
  const lines = text.split('\n')
  const lineIndices: number[] = []
  let offset = 0

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? ''
    const lineStart = offset
    const lineEnd = offset + line.length
    const intersectsLine = end > lineStart && start < lineEnd
    if (intersectsLine) {
      lineIndices.push(lineIndex)
    }
    offset = lineEnd + 1
  }

  return lineIndices
}

/**
 * Возвращает индексы строк, полностью покрытых диапазоном символов.
 */
export const getFullLineIndicesForRange = ({
  textbox,
  range
}: {
  textbox: EditorTextbox
  range: TextSelectionRange
}): number[] => {
  const text = textbox.text ?? ''
  if (!text.length) return []

  const { start, end } = range
  const lines = text.split('\n')
  const lineIndices: number[] = []
  let offset = 0

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? ''
    const lineStart = offset
    const lineEnd = offset + line.length
    const coversLine = start <= lineStart && end >= lineEnd
    if (coversLine) {
      lineIndices.push(lineIndex)
    }
    offset = lineEnd + 1
  }

  return lineIndices
}

/**
 * Возвращает индекс первого отличия между строками.
 */
export const getFirstDiffIndex = ({
  previous,
  next
}: {
  previous: string
  next: string
}): number => {
  const minLength = Math.min(previous.length, next.length)
  for (let index = 0; index < minLength; index += 1) {
    if (previous[index] !== next[index]) return index
  }

  return minLength
}

/**
 * Вычисляет индекс строки для позиции символа.
 */
export const getLineIndexByCharIndex = ({
  text,
  charIndex
}: {
  text: string
  charIndex: number
}): number => {
  const safeIndex = Math.max(0, Math.min(charIndex, text.length))
  let lineIndex = 0

  for (let index = 0; index < safeIndex; index += 1) {
    if (text[index] === '\n') {
      lineIndex += 1
    }
  }

  return lineIndex
}

/**
 * Возвращает индекс начала строки по её индексу.
 */
export const getLineStartIndex = ({
  text,
  lineIndex
}: {
  text: string
  lineIndex: number
}): number => {
  if (lineIndex <= 0) return 0

  let currentLine = 0
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== '\n') continue

    currentLine += 1
    if (currentLine === lineIndex) return index + 1
  }

  return text.length
}
