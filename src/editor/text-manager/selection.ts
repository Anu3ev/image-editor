import type { TextSelectionRange } from '../utils/text'
import type { EditorTextbox } from './types'

/**
 * Returns character ranges for each text line, excluding newline characters.
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
 * Clamps the selection range to the text length and normalizes its order.
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
 * Expands the selection to cover all lines it intersects in full.
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
 * Returns indexes of lines intersecting the character range.
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
 * Returns indexes of lines fully covered by the character range.
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
 * Returns the index of the first difference between strings.
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
 * Calculates the line index for a character position.
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
 * Returns a line's starting character index from its line index.
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
