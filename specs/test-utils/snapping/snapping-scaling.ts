import type { Bounds } from '../../../src/editor/snapping-manager/types'

/** Минимальный snap-result stub для unit-тестов scaling snap. */
type AxisSnapResultStub = {
  delta: number
  guidePosition: number | null
  candidate: {
    edge: 'left' | 'right' | 'top' | 'bottom'
    position: number
  } | null
}

/** Возвращает bounds прямоугольника с уже посчитанным центром. */
export function createScalingBounds({
  left,
  top,
  width,
  height
}: {
  left: number
  top: number
  width: number
  height: number
}): Bounds {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    centerX: left + (width / 2),
    centerY: top + (height / 2)
  }
}

/** Возвращает snap-result с привязкой к конкретной границе. */
export function createAxisSnapResult({
  edge,
  position,
  guidePosition,
  delta = guidePosition - position
}: {
  edge: 'left' | 'right' | 'top' | 'bottom'
  position: number
  guidePosition: number
  delta?: number
}): AxisSnapResultStub {
  return {
    delta,
    guidePosition,
    candidate: {
      edge,
      position
    }
  }
}

/** Возвращает snap-result без найденной направляющей. */
export function createEmptyAxisSnapResult(): AxisSnapResultStub {
  return {
    delta: 0,
    guidePosition: null,
    candidate: null
  }
}
