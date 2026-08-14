import type { EditorTextbox } from '../types'

/** Размер шрифта и ключ, однозначно определяющий символ или строку. */
type TextScaleFontSizeEntry = Readonly<{
  key: string
  value: number
}>

/** Канонические свойства текста после одного шага углового скейлинга. */
export type TextCornerScaleCanonicalState = Readonly<{
  fontSize: number
  height: number
  inlineFontSizes: readonly TextScaleFontSizeEntry[]
  lineCount: number
  lineFontSizes: readonly TextScaleFontSizeEntry[]
  paddingBottom: number
  paddingLeft: number
  paddingRight: number
  paddingTop: number
  radiusBottomLeft: number
  radiusBottomRight: number
  radiusTopLeft: number
  radiusTopRight: number
  scaleX: number
  scaleY: number
  width: number
}>

/** Допуск сравнения канонических числовых свойств текста. */
const TEXT_CORNER_SCALE_STATE_EPSILON = 0.0000001

/** Собирает размеры шрифта посимвольных стилей в устойчивом порядке. */
function captureInlineFontSizes({
  textbox
}: {
  textbox: EditorTextbox
}): readonly TextScaleFontSizeEntry[] {
  const entries: TextScaleFontSizeEntry[] = []

  Object.entries(textbox.styles ?? {}).forEach(([lineIndex, lineStyles]) => {
    Object.entries(lineStyles ?? {}).forEach(([characterIndex, style]) => {
      if (typeof style?.fontSize !== 'number') return

      entries.push(Object.freeze({
        key: `${lineIndex}:${characterIndex}`,
        value: style.fontSize
      }))
    })
  })

  return Object.freeze(entries.sort((first, second) => first.key.localeCompare(second.key)))
}

/** Собирает размеры шрифта из настроек строк в устойчивом порядке. */
function captureLineFontSizes({
  textbox
}: {
  textbox: EditorTextbox
}): readonly TextScaleFontSizeEntry[] {
  const entries = Object.entries(textbox.lineFontDefaults ?? {})
    .filter((entry): entry is [string, { fontSize: number }] => {
      return typeof entry[1]?.fontSize === 'number'
    })
    .map(([lineIndex, defaults]) => Object.freeze({
      key: lineIndex,
      value: defaults.fontSize
    }))

  return Object.freeze(entries.sort((first, second) => first.key.localeCompare(second.key)))
}

/** Снимает фактически применённое каноническое состояние текста. */
export function captureTextCornerScaleCanonicalState({
  textbox
}: {
  textbox: EditorTextbox
}): TextCornerScaleCanonicalState {
  return Object.freeze({
    fontSize: textbox.fontSize ?? 16,
    height: textbox.height ?? textbox.calcTextHeight(),
    inlineFontSizes: captureInlineFontSizes({ textbox }),
    lineCount: Math.max(textbox.textLines?.length ?? 0, 1),
    lineFontSizes: captureLineFontSizes({ textbox }),
    paddingBottom: textbox.paddingBottom ?? 0,
    paddingLeft: textbox.paddingLeft ?? 0,
    paddingRight: textbox.paddingRight ?? 0,
    paddingTop: textbox.paddingTop ?? 0,
    radiusBottomLeft: textbox.radiusBottomLeft ?? 0,
    radiusBottomRight: textbox.radiusBottomRight ?? 0,
    radiusTopLeft: textbox.radiusTopLeft ?? 0,
    radiusTopRight: textbox.radiusTopRight ?? 0,
    scaleX: textbox.scaleX ?? 1,
    scaleY: textbox.scaleY ?? 1,
    width: textbox.width ?? textbox.calcTextWidth()
  })
}

/** Проверяет два списка размеров шрифта с учётом числовой погрешности. */
function areFontSizeEntriesEqual({
  actual,
  expected
}: {
  actual: readonly TextScaleFontSizeEntry[]
  expected: readonly TextScaleFontSizeEntry[]
}): boolean {
  return actual.length === expected.length && actual.every((entry, index) => {
    const expectedEntry = expected[index]

    return entry.key === expectedEntry?.key
      && Math.abs(entry.value - expectedEntry.value) <= TEXT_CORNER_SCALE_STATE_EPSILON
  })
}

/** Проверяет совпадение измеренного состояния с состоянием текста на холсте. */
export function areTextCornerScaleCanonicalStatesEqual({
  actual,
  expected
}: {
  actual: TextCornerScaleCanonicalState
  expected: TextCornerScaleCanonicalState
}): boolean {
  const numericKeys = [
    'fontSize',
    'height',
    'paddingBottom',
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'radiusBottomLeft',
    'radiusBottomRight',
    'radiusTopLeft',
    'radiusTopRight',
    'scaleX',
    'scaleY',
    'width'
  ] as const

  return actual.lineCount === expected.lineCount
    && numericKeys.every((key) => {
      return Math.abs(actual[key] - expected[key]) <= TEXT_CORNER_SCALE_STATE_EPSILON
    })
    && areFontSizeEntriesEqual({ actual: actual.inlineFontSizes, expected: expected.inlineFontSizes })
    && areFontSizeEntriesEqual({ actual: actual.lineFontSizes, expected: expected.lineFontSizes })
}
