import type { EditorTextbox } from '../types'

/** Минимальная каноническая ширина отдельного Textbox. */
export const MINIMUM_TEXT_WIDTH = 1

/**
 * Применяет каноническую ширину и оставляет высоту результатом переноса строк.
 * BackgroundTextbox округляет размеры внутри initDimensions.
 * После пересчёта сохраняет минимальную ширину строки, а большую ширину оставляет дробной.
 */
export function applyCanonicalTextboxWidth({
  textbox,
  width
}: {
  textbox: EditorTextbox
  width: number
}): number {
  if (!Number.isFinite(width)) {
    throw new Error('Ширина Textbox должна быть конечным числом')
  }

  const nextWidth = Math.max(MINIMUM_TEXT_WIDTH, width)
  textbox.autoExpand = false
  textbox.set({ width: nextWidth })
  const appliedWidth = Math.max(nextWidth, textbox.dynamicMinWidth)

  textbox.width = appliedWidth
  textbox.dirty = true

  return appliedWidth
}
