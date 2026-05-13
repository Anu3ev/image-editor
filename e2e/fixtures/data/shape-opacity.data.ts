import type {
  ShapeAddParams,
  ShapePresetKey,
  TextAddParams
} from '../../types'

/** Пресет фигуры для e2e-сценариев прозрачности. */
export const SHAPE_OPACITY_PRESET: ShapePresetKey = 'square'

/** Текст внутри фигуры для проверки прозрачности shape и текста. */
export const SHAPE_OPACITY_TEXT = 'TEST'

/** Прозрачность по умолчанию, которая должна примениться и к фигуре, и к тексту. */
export const SHAPE_OPACITY_VALUE = 0.3

/** Прозрачность, которая должна примениться только к фигуре. */
export const SHAPE_SHAPE_ONLY_OPACITY_VALUE = 0.4

/** Идентификатор shape-группы для проверки opacity общего выделения. */
export const SHAPE_ACTIVE_SELECTION_OPACITY_SHAPE_ID = 'shape-active-selection-opacity-shape'

/** Идентификатор обычного текста для проверки opacity общего выделения. */
export const SHAPE_ACTIVE_SELECTION_OPACITY_TEXT_ID = 'shape-active-selection-opacity-text'

/** Прозрачность, применяемая ко всем объектам общего выделения. */
export const SHAPE_ACTIVE_SELECTION_OPACITY_VALUE = 0.45

/** Shape-группа для проверки opacity общего выделения. */
export const SHAPE_ACTIVE_SELECTION_OPACITY_SHAPE_ADD_PARAMS = {
  presetKey: SHAPE_OPACITY_PRESET,
  options: {
    id: SHAPE_ACTIVE_SELECTION_OPACITY_SHAPE_ID,
    left: 170,
    top: 150,
    width: 180,
    height: 120,
    text: SHAPE_OPACITY_TEXT,
    textStyle: {
      fontSize: 48
    }
  }
} satisfies ShapeAddParams

/** Обычный текст для проверки opacity общего выделения. */
export const SHAPE_ACTIVE_SELECTION_OPACITY_TEXT_ADD_PARAMS = {
  id: SHAPE_ACTIVE_SELECTION_OPACITY_TEXT_ID,
  left: 430,
  top: 150,
  width: 180,
  fontSize: 48,
  text: 'TEXT'
} satisfies TextAddParams

/** Пресет фигуры для demo-сценария с opacity controls. */
export const SHAPE_DEMO_OPACITY_PRESET: ShapePresetKey = 'square'

/** Значение слайдера demo opacity controls в процентах. */
export const SHAPE_DEMO_OPACITY_PERCENT = 40

/** Ожидаемая прозрачность новой фигуры из demo controls. */
export const SHAPE_DEMO_OPACITY_VALUE = SHAPE_DEMO_OPACITY_PERCENT / 100
