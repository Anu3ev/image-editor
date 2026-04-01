import type { ShapeAddParams } from '../../types'

/** Id основной фигуры для e2e-сценариев блокировки и редактирования текста. */
export const SHAPE_LOCKING_TARGET_ID = 'shape-locking-target'

/** Id второй фигуры для сценариев с выделением всех объектов. */
export const SHAPE_LOCKING_SECONDARY_ID = 'shape-locking-secondary'

/** Базовая фигура для e2e-сценариев блокировки текста внутри фигуры. */
export const SHAPE_LOCKING_BASE_OPTIONS: NonNullable<ShapeAddParams['options']> = {
  id: SHAPE_LOCKING_TARGET_ID,
  left: 140,
  top: 110,
  originX: 'left',
  originY: 'top',
  width: 220,
  height: 180,
  text: 'Alpha Beta',
  textStyle: {
    fontSize: 72
  }
}

/** Вторая фигура для проверки восстановления выделения после select all. */
export const SHAPE_LOCKING_SECONDARY_OPTIONS: NonNullable<ShapeAddParams['options']> = {
  id: SHAPE_LOCKING_SECONDARY_ID,
  left: 420,
  top: 120,
  originX: 'left',
  originY: 'top',
  width: 180,
  height: 140,
  text: 'Second',
  textStyle: {
    fontSize: 56
  }
}
