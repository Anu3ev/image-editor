import { Textbox, type TextboxProps } from 'fabric'

export type TextSelectionRange = {
  start: number
  end: number
}

/**
 * Возвращает выделение текста, если оно непустое.
 */
export const getSelectionRange = ({ textbox }: { textbox: Textbox }): TextSelectionRange | null => {
  if (!textbox.isEditing) return null

  const selectionStart = textbox.selectionStart ?? 0
  const selectionEnd = textbox.selectionEnd ?? selectionStart
  if (selectionStart === selectionEnd) return null

  return {
    start: Math.min(selectionStart, selectionEnd),
    end: Math.max(selectionStart, selectionEnd)
  }
}

/**
 * Возвращает диапазон полного текста.
 */
export const getFullTextRange = ({ textbox }: { textbox: Textbox }): TextSelectionRange | null => {
  const length = textbox.text?.length ?? 0
  if (length <= 0) return null

  return { start: 0, end: length }
}

/**
 * Проверяет, охватывает ли выделение весь текст.
 */
export const isFullTextSelection = (
  { textbox, range }: { textbox: Textbox; range: TextSelectionRange | null }
): boolean => {
  if (!range) return false

  const textLength = textbox.text?.length ?? 0
  if (textLength <= 0) return false

  return range.start <= 0 && range.end >= textLength
}

/**
 * Применяет стили к указанному диапазону текста.
 */
export const applyStylesToRange = ({
  textbox,
  styles,
  range
}: {
  textbox: Textbox
  styles: Partial<TextboxProps>
  range: TextSelectionRange
}): boolean => {
  if (!styles || !Object.keys(styles).length) return false
  const { start, end } = range
  if (end <= start) return false

  textbox.setSelectionStyles(styles, start, end)
  return true
}

/**
 * Возвращает стиль выделенного диапазона.
 */
export const getSelectionStyleValue = <T extends keyof TextboxProps>({
  textbox,
  range,
  property
}: {
  textbox: Textbox
  range: TextSelectionRange | null
  property: T
}): TextboxProps[T] | undefined => {
  if (!range) return undefined

  const styles = textbox.getSelectionStyles(
    range.start,
    range.end,
    true
  ) as Array<Partial<TextboxProps>>

  if (!styles.length) return undefined
  return styles[0]?.[property]
}

/**
 * Возвращает цвет обводки, если ширина больше нуля.
 */
export const resolveStrokeColor = (
  { strokeColor, width }: { strokeColor?: string; width: number }
): string | undefined => {
  if (width <= 0) return undefined

  return strokeColor ?? '#000000'
}

/**
 * Нормализует ширину обводки в неотрицательное значение.
 */
export const resolveStrokeWidth = ({ width = 0 }: { width?: number }): number => {
  if (!width) return 0

  return Math.max(0, width)
}

/**
 * Безопасно переводит строку в верхний регистр.
 */
export const toUpperCaseSafe = ({ value }: { value: string }): string => (
  typeof value === 'string' ? value.toLocaleUpperCase() : ''
)
