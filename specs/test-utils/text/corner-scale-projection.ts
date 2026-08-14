import {
  createScaleProjection,
  projectScaleEdgePositions,
  type ScaleProjection
} from '../../../src/editor/snapping-manager/scaling/scale-projection'
import type { ScaleStepProjectionInput } from '../../../src/editor/snapping-manager/scaling/scale-snapping-resolver'
import { createTextCornerScaleStepProjection } from '../../../src/editor/text-manager/scaling/text-corner-scale-projection'
import type { ObjectBounds } from '../../../src/editor/utils/geometry'
import { createTextCornerScaleInteractionHarness } from './corner-scale-interaction'

/** Исходные и измеренные данные одного шага углового скейлинга текста. */
type MeasuredTextCornerScaleProjectionSetup = Readonly<{
  measuredBounds: ObjectBounds
  originalProjection: ScaleProjection
  previousBounds: ObjectBounds
  previousScale: number
  scale: number
  step: ScaleStepProjectionInput
}>

/** Создаёт исходную и локальную проекции для проверки измеренного шага текста. */
export function createMeasuredTextCornerScaleProjectionSetup(): MeasuredTextCornerScaleProjectionSetup {
  const { baselineBounds, fixedAnchor, gesture } = createTextCornerScaleInteractionHarness()
  const scale = 1.25
  const originalProjection = createScaleProjection({
    bounds: baselineBounds,
    input: gesture.projectionMode.projection
  })
  const originalPositions = projectScaleEdgePositions({
    projection: originalProjection,
    values: [scale]
  })
  if (originalPositions.right === null || originalPositions.bottom === null) {
    throw new Error('Исходная проекция должна описывать правую и нижнюю границы')
  }

  const measuredRight = originalPositions.right + 3.25
  const measuredBottom = originalPositions.bottom - 1.75
  const measuredBounds = Object.freeze({
    left: fixedAnchor.x,
    right: measuredRight,
    top: fixedAnchor.y,
    bottom: measuredBottom,
    centerX: fixedAnchor.x + ((measuredRight - fixedAnchor.x) / 2),
    centerY: fixedAnchor.y + ((measuredBottom - fixedAnchor.y) / 2)
  })
  const previousScale = 1.24
  const previousRight = measuredBounds.right - 2.5
  const previousBottom = measuredBounds.bottom - 0.75
  const previousBounds = Object.freeze({
    ...measuredBounds,
    right: previousRight,
    bottom: previousBottom,
    centerX: measuredBounds.left + ((previousRight - measuredBounds.left) / 2),
    centerY: measuredBounds.top + ((previousBottom - measuredBounds.top) / 2)
  })
  const step = createTextCornerScaleStepProjection({
    bounds: measuredBounds,
    gesture,
    samples: [Object.freeze({ bounds: previousBounds, scale: previousScale })],
    scale
  })
  if (!step) throw new Error('Проекция измеренного шага должна существовать')

  return Object.freeze({ measuredBounds, originalProjection, previousBounds, previousScale, scale, step })
}
