import {
  resolveMinimumProportionalShapeScale,
  validateShapeTextLayoutForProportionalScaling
} from '../../../../src/editor/shape-manager/scaling/shape-scaling-layout'
import {
  createMeasuredAutoExpandTextbox,
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox
} from '../../../test-utils/shape-helpers'
import {
  createShapeScalingState
} from '../../../test-utils/shape-scaling-helpers'

describe('shape-scaling-layout', () => {
  it('при пропорциональном уменьшении допускает перенос по словам, пока текст помещается по высоте', () => {
    const shape = createMockShapeNode({
      width: 200,
      height: 200
    })
    const text = createMeasuredAutoExpandTextbox({
      text: 'TEST TEST TEST',
      width: 200,
      fontSize: 30
    })
    const group = createMockShapeGroup({
      shape,
      text,
      width: 200,
      height: 200,
      presetKey: ''
    })

    const constraint = validateShapeTextLayoutForProportionalScaling({
      group,
      text,
      width: 170,
      height: 120
    })

    expect(constraint.isValid).toBe(true)
    expect(constraint.requiresGraphemeSplit).toBe(false)
    expect(constraint.renderedLineCount).toBeGreaterThan(1)
    expect(constraint.measuredHeight).toBeLessThanOrEqual(120.5)
  })

  it('при пропорциональном уменьшении отклоняет candidate, если текст уже не помещается по высоте', () => {
    const shape = createMockShapeNode({
      width: 200,
      height: 200
    })
    const text = createMeasuredAutoExpandTextbox({
      text: 'TEST TEST TEST',
      width: 200,
      fontSize: 30
    })
    const group = createMockShapeGroup({
      shape,
      text,
      width: 200,
      height: 200,
      presetKey: ''
    })

    const constraint = validateShapeTextLayoutForProportionalScaling({
      group,
      text,
      width: 170,
      height: 60
    })

    expect(constraint.isValid).toBe(false)
    expect(constraint.requiresGraphemeSplit).toBe(false)
    expect(constraint.renderedLineCount).toBeGreaterThan(1)
    expect(constraint.measuredHeight).toBeGreaterThan(60.5)
  })

  it('подбирает minimum scale на границе валидного proportional layout', () => {
    const shape = createMockShapeNode({
      width: 200,
      height: 200
    })
    const text = createMockShapeTextbox({
      text: 'TEST TEST',
      width: 200,
      fontSize: 30
    })
    const group = createMockShapeGroup({
      shape,
      text,
      width: 200,
      height: 200,
      presetKey: ''
    })
    const state = createShapeScalingState({
      startWidth: 200,
      startHeight: 200
    })

    const minimum = resolveMinimumProportionalShapeScale({
      group,
      text,
      state
    })
    const validConstraint = validateShapeTextLayoutForProportionalScaling({
      group,
      text,
      width: state.startWidth * minimum.scale,
      height: state.startHeight * minimum.scale
    })
    const invalidBelowMinimum = validateShapeTextLayoutForProportionalScaling({
      group,
      text,
      width: state.startWidth * Math.max(0.01, minimum.scale - 0.01),
      height: state.startHeight * Math.max(0.01, minimum.scale - 0.01)
    })

    expect(validConstraint.isValid).toBe(true)
    expect(validConstraint.requiresGraphemeSplit).toBe(false)
    expect(invalidBelowMinimum.isValid).toBe(false)
    expect(minimum.minimumHeight).toBeCloseTo(validConstraint.measuredHeight, 4)
  })

  it('для пустого текста считает proportional candidate 1x1 валидным', () => {
    const shape = createMockShapeNode({
      width: 200,
      height: 200
    })
    const text = createMockShapeTextbox({
      text: '',
      width: 200,
      fontSize: 30
    })
    const group = createMockShapeGroup({
      shape,
      text,
      width: 200,
      height: 200,
      presetKey: ''
    })

    const constraint = validateShapeTextLayoutForProportionalScaling({
      group,
      text,
      width: 1,
      height: 1
    })

    expect(constraint.isValid).toBe(true)
    expect(constraint.measuredHeight).toBe(1)
    expect(constraint.renderedLineCount).toBe(0)
    expect(constraint.requiresGraphemeSplit).toBe(false)
  })

  it('для пустого текста сводит proportional minimum к геометрическому размеру 1px', () => {
    const shape = createMockShapeNode({
      width: 200,
      height: 200
    })
    const text = createMockShapeTextbox({
      text: '',
      width: 200,
      fontSize: 30
    })
    const group = createMockShapeGroup({
      shape,
      text,
      width: 200,
      height: 200,
      presetKey: ''
    })
    const state = createShapeScalingState({
      startWidth: 200,
      startHeight: 200
    })

    const minimum = resolveMinimumProportionalShapeScale({
      group,
      text,
      state
    })

    expect(minimum.scale).toBeCloseTo(0.005, 4)
    expect(minimum.minimumHeight).toBeCloseTo(1, 4)
  })
})
