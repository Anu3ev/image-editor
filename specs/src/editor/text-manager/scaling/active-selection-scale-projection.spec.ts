import { createActiveSelectionTextScaleProjectionSetup } from '../../../../test-utils/text/active-selection-scaling'

it('строит независимые коэффициенты обеих осей по соседним измерениям', () => {
  const {
    expectedBottomCoefficients,
    expectedRightCoefficients,
    step,
    values
  } = createActiveSelectionTextScaleProjectionSetup()
  const rightEdge = step.projection.edges.find(({ edge }) => edge === 'right')
  const bottomEdge = step.projection.edges.find(({ edge }) => edge === 'bottom')

  expect(rightEdge).toBeDefined()
  expect(bottomEdge).toBeDefined()
  if (!rightEdge || !bottomEdge) throw new Error('Проекция должна описывать правую и нижнюю границы')

  expectedRightCoefficients.forEach((expected, index) => {
    expect(rightEdge.coefficients[index]).toBeCloseTo(expected, 9)
  })
  expectedBottomCoefficients.forEach((expected, index) => {
    expect(bottomEdge.coefficients[index]).toBeCloseTo(expected, 9)
  })
  expect(rightEdge.coefficients[1]).not.toBe(0)
  expect(bottomEdge.coefficients[0]).not.toBe(0)
  expect(step.projection.baselineValues).toEqual(values)
  expect(Object.isFrozen(step.projection.edges)).toBe(true)
})
