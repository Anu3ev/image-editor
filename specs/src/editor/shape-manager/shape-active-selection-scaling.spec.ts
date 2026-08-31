import * as shapeScalingLayout from '../../../../src/editor/shape-manager/scaling/shape-scaling-layout'
import {
  createActiveSelectionShapeScalingSetup,
  createShapeScalingTransform
} from '../../../test-utils/shape/scaling'
import {
  configureActiveSelectionScalingStateMocks
} from '../../../test-utils/shape/active-selection-scaling-state'

jest.mock('../../../../src/editor/shape-manager/layout/shape-layout', () => ({
  applyFixedWidthShapeTextLayout: jest.fn(),
  applyShapeTextLayout: jest.fn(),
  isShapeTextFrameFilled: jest.fn(() => false),
  measureShapeTextFrameLayout: jest.fn(),
  resolveMinimumShapeWidthForText: jest.fn(),
  resolveRequiredShapeHeightForText: jest.fn(),
  resolveShapeTextFixedWidthLayout: jest.fn()
}))

jest.mock('../../../../src/editor/shape-manager/creation/shape-node-factory', () => ({
  resizeShapeNode: jest.fn()
}))

jest.mock('../../../../src/editor/shape-manager/domain/shape-nodes', () => ({
  getShapeNodes: jest.fn()
}))

jest.mock('../../../../src/editor/shape-manager/domain/shape-reference', () => ({
  isShapeGroup: jest.fn()
}))

describe('скейлинг общего выделения из шейпов', () => {
  // eslint-disable-next-line max-len
  it('при незаметном изменении размера возвращает временную компоновку в каноническое состояние', () => {
    const { applyShapeTextLayoutMock } = configureActiveSelectionScalingStateMocks()
    const {
      controller,
      groups,
      selection,
      texts
    } = createActiveSelectionShapeScalingSetup()
    const scale = 1 + (shapeScalingLayout.SHAPE_SCALING_SCALE_EPSILON / 2)
    const transform = createShapeScalingTransform({
      target: selection,
      action: 'scaleX',
      corner: 'mr',
      originX: 'left',
      originY: 'center'
    }) as never

    selection.scaleX = scale
    selection.scaleY = 1
    controller.handleObjectScaling({
      target: selection,
      transform
    })

    expect(texts[0].scaleX).not.toBe(1)
    expect(texts[1].scaleX).not.toBe(1)

    groups.forEach((group) => {
      expect(controller.commitActiveSelectionGroupScaling({
        group,
        scaleX: scale,
        scaleY: 1,
        transform
      })).toBe(true)
    })

    expect(applyShapeTextLayoutMock).toHaveBeenCalledTimes(2)
    expect(texts[0].scaleX).toBe(1)
    expect(texts[0].scaleY).toBe(1)
    expect(texts[1].scaleX).toBe(1)
    expect(texts[1].scaleY).toBe(1)
  })
})
