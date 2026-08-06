import { resolveMovementSpacingCorrection } from '../../../../../src/editor/snapping-manager/movement/movement-spacing-correction'
import { ACTIVE_MOVEMENT_SPACING_SOURCE_ID } from '../../../../../src/editor/snapping-manager/movement/spacing-chains'
import { createAmbiguousSpacingChainScenario } from '../../../../test-utils/snapping/movement-spacing-correction'

it('выбирает цепочку основного интервала, когда активный объект входит в две цепочки', () => {
  const {
    activeBounds,
    movedBounds,
    baseline,
    leftChain,
    rightChain,
    primarySelection
  } = createAmbiguousSpacingChainScenario()
  const correction = resolveMovementSpacingCorrection({
    axis: 'x',
    baseline,
    bounds: movedBounds,
    threshold: 5,
    selections: [primarySelection],
    primarySelection
  })

  expect(leftChain.intervals.some(({ beforeId, afterId }) => {
    return beforeId === ACTIVE_MOVEMENT_SPACING_SOURCE_ID
      || afterId === ACTIVE_MOVEMENT_SPACING_SOURCE_ID
  })).toBe(true)
  expect(rightChain.intervals.some(({ beforeId, afterId }) => {
    return beforeId === ACTIVE_MOVEMENT_SPACING_SOURCE_ID
      || afterId === ACTIVE_MOVEMENT_SPACING_SOURCE_ID
  })).toBe(true)
  expect(correction.chain).toBe(rightChain)
  expect(correction.chain).not.toBe(leftChain)
  expect(correction.delta).toBe(-2)
  expect(movedBounds.left + correction.delta).toBe(activeBounds.left)
})
