import type { ShapeAddParams } from '../../types'

/** ID of the main shape for text-locking and editing e2e scenarios. */
export const SHAPE_LOCKING_TARGET_ID = 'shape-locking-target'

/** ID of the second shape for select-all scenarios. */
export const SHAPE_LOCKING_SECONDARY_ID = 'shape-locking-secondary'

/** Base shape for e2e scenarios that lock text inside a shape. */
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

/** Second shape for testing selection restoration after select all. */
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
