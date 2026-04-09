import type { ShapePresetKey } from '../../types'

/** Пресет фигуры для e2e-сценариев прозрачности. */
export const SHAPE_OPACITY_PRESET: ShapePresetKey = 'square'

/** Текст внутри фигуры для проверки прозрачности shape и текста. */
export const SHAPE_OPACITY_TEXT = 'TEST'

/** Прозрачность по умолчанию, которая должна примениться и к фигуре, и к тексту. */
export const SHAPE_OPACITY_VALUE = 0.3

/** Прозрачность, которая должна примениться только к фигуре. */
export const SHAPE_SHAPE_ONLY_OPACITY_VALUE = 0.4

/** Пресет фигуры для demo-сценария с opacity controls. */
export const SHAPE_DEMO_OPACITY_PRESET: ShapePresetKey = 'square'

/** Значение слайдера demo opacity controls в процентах. */
export const SHAPE_DEMO_OPACITY_PERCENT = 40

/** Ожидаемая прозрачность новой фигуры из demo controls. */
export const SHAPE_DEMO_OPACITY_VALUE = SHAPE_DEMO_OPACITY_PERCENT / 100
