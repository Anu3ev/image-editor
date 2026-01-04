import type { ObjectBounds } from '../utils/geometry'

export type Bounds = ObjectBounds

export type MeasurementGuide = {
  type: 'vertical' | 'horizontal'
  axis: number
  start: number
  end: number
  distance: number
}
