import { Textbox, type ActiveSelection } from 'fabric'

import { BackgroundTextbox } from '../background-textbox'
import type { EditorTextbox } from '../types'

/** Tolerance for checking the canonical text transform inside a selection. */
const ACTIVE_SELECTION_TEXT_STATE_EPSILON = 0.000000001

/** Checks that a numeric text property remains in its canonical state. */
function isCanonicalValue({ value }: { value: number }): boolean {
  return Number.isFinite(value) && Math.abs(value) <= ACTIVE_SELECTION_TEXT_STATE_EPSILON
}

/** Checks a standalone text object before canonical scaling inside a selection. */
function isCanonicalSelectionText({
  selection,
  textbox
}: {
  selection: ActiveSelection
  textbox: EditorTextbox
}): boolean {
  const blockedState = [
    textbox.parent,
    textbox.path,
    textbox.isEditing,
    textbox.locked,
    textbox.lockScalingX,
    textbox.lockScalingY,
    textbox.flipX,
    textbox.flipY
  ].some(Boolean)
  if (blockedState || textbox.group !== selection || textbox.shapeNodeType === 'text') return false

  return [
    (textbox.scaleX ?? 1) - 1,
    (textbox.scaleY ?? 1) - 1,
    textbox.angle ?? 0,
    textbox.skewX ?? 0,
    textbox.skewY ?? 0,
    textbox.strokeWidth ?? 0
  ].every((value) => isCanonicalValue({ value }))
}

/**
 * Returns all supported standalone text objects from the selection.
 * Other object types are not considered an error, but unsupported standalone text rejects the entire set.
 */
export function resolveCanonicalActiveSelectionTexts({
  selection
}: {
  selection: ActiveSelection
}): readonly EditorTextbox[] | null {
  const texts: EditorTextbox[] = []

  for (const object of selection.getObjects()) {
    if (object instanceof Textbox && !(object instanceof BackgroundTextbox)) return null
    if (!(object instanceof BackgroundTextbox)) continue
    if (!isCanonicalSelectionText({ selection, textbox: object })) return null

    texts.push(object)
  }

  return texts.length > 0 ? Object.freeze(texts) : null
}
