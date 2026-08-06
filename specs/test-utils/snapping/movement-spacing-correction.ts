import type { ObjectBounds } from '../../../src/editor/utils/geometry'
import type { ResolvedSpacingSelection } from '../../../src/editor/snapping-manager/movement/spacing'
import type { MovementGestureBaseline } from '../../../src/editor/snapping-manager/movement/movement-snapping-resolver'
import type { MovementSpacingChain } from '../../../src/editor/snapping-manager/movement/spacing-chains'
import {
  createMovementBaseline,
  createMovementBounds
} from './movement-snapping-core'

/** Геометрия для выбора между двумя цепочками одного активного объекта. */
export type AmbiguousSpacingChainScenario = Readonly<{
  activeBounds: ObjectBounds
  movedBounds: ObjectBounds
  baseline: MovementGestureBaseline
  leftChain: MovementSpacingChain
  rightChain: MovementSpacingChain
  primarySelection: ResolvedSpacingSelection
}>

/** Собирает основной spacing-вариант по опорному интервалу правой цепочки. */
function createRightChainSelection({
  activeBounds,
  fourthBounds,
  rightChain
}: {
  activeBounds: ObjectBounds
  fourthBounds: ObjectBounds
  rightChain: MovementSpacingChain
}): ResolvedSpacingSelection {
  const reference = rightChain.intervals.find(({ beforeId, afterId }) => {
    return beforeId === 'fourth' && afterId === 'fifth'
  })
  if (!reference) throw new Error('В правой цепочке должен быть опорный интервал')

  return {
    guide: {
      type: reference.type,
      axis: reference.axis,
      refStart: reference.start,
      refEnd: reference.end,
      activeStart: activeBounds.right,
      activeEnd: fourthBounds.left,
      distance: rightChain.displayDistance
    },
    identity: {
      kind: 'reference',
      side: 'after',
      before: null,
      after: fourthBounds,
      pattern: {
        type: reference.type,
        axis: reference.axis,
        start: reference.start,
        end: reference.end,
        distance: reference.exactDistance
      }
    },
    isPrimary: true
  }
}

/** Создаёт сценарий, где active завершает цепочку 10 слева и начинает цепочку 20 справа. */
export function createAmbiguousSpacingChainScenario(): AmbiguousSpacingChainScenario {
  const firstBounds = createMovementBounds({ left: 0, top: 0, width: 10, height: 10 })
  const secondBounds = createMovementBounds({ left: 20, top: 0, width: 10, height: 10 })
  const activeBounds = createMovementBounds({ left: 40, top: 0, width: 10, height: 10 })
  const fourthBounds = createMovementBounds({ left: 70, top: 0, width: 10, height: 10 })
  const fifthBounds = createMovementBounds({ left: 100, top: 0, width: 10, height: 10 })
  const baseline = createMovementBaseline({
    bounds: activeBounds,
    sources: [
      { id: 'first', bounds: firstBounds, useForSpacing: true },
      { id: 'second', bounds: secondBounds, useForSpacing: true },
      { id: 'fourth', bounds: fourthBounds, useForSpacing: true },
      { id: 'fifth', bounds: fifthBounds, useForSpacing: true }
    ]
  })
  const [leftChain, rightChain] = baseline.spacingChains.horizontal
  if (!leftChain || !rightChain) throw new Error('Активный объект должен входить в две цепочки')

  return {
    activeBounds,
    movedBounds: createMovementBounds({ left: 42, top: 0, width: 10, height: 10 }),
    baseline,
    leftChain,
    rightChain,
    primarySelection: createRightChainSelection({ activeBounds, fourthBounds, rightChain })
  }
}
