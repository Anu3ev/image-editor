import { Textbox, type ActiveSelection } from 'fabric'

import { BackgroundTextbox } from '../background-textbox'
import type { EditorTextbox } from '../types'

/** Допуск проверки канонического преобразования текста внутри общего выделения. */
const ACTIVE_SELECTION_TEXT_STATE_EPSILON = 0.000000001

/** Проверяет, что числовое свойство текста осталось в каноническом состоянии. */
function isCanonicalValue({ value }: { value: number }): boolean {
  return Number.isFinite(value) && Math.abs(value) <= ACTIVE_SELECTION_TEXT_STATE_EPSILON
}

/** Проверяет отдельный текст перед каноническим скейлингом внутри общего выделения. */
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
 * Возвращает все поддерживаемые отдельные тексты из общего выделения.
 * Наличие других типов объектов не считается ошибкой, но неподдерживаемый отдельный текст отклоняет весь набор.
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
