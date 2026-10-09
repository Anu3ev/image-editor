import type { EditorTextbox } from '../types'

/** Minimum canonical width of a standalone Textbox. */
export const MINIMUM_TEXT_WIDTH = 1

/**
 * Applies canonical width, leaving height to be determined by line wrapping.
 * BackgroundTextbox rounds dimensions inside initDimensions.
 * After recalculation, preserves the minimum line width and leaves larger widths fractional.
 */
export function applyCanonicalTextboxWidth({
  textbox,
  width
}: {
  textbox: EditorTextbox
  width: number
}): number {
  if (!Number.isFinite(width)) {
    throw new Error('Textbox width must be a finite number')
  }

  const nextWidth = Math.max(MINIMUM_TEXT_WIDTH, width)
  textbox.autoExpand = false
  textbox.set({ width: nextWidth })
  const appliedWidth = Math.max(nextWidth, textbox.dynamicMinWidth)

  textbox.width = appliedWidth
  textbox.dirty = true

  return appliedWidth
}
