import ShapeLifecycleController from '../../../../src/editor/shape-manager/lifecycle/shape-lifecycle-controller'
import {
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox
} from '../../../test-utils/shape/factories'

describe('shape-lifecycle', () => {
  it('getSnapshot сохраняет значение скругления и отдельно считает текущий размер после scale', () => {
    const shape = createMockShapeNode({
      width: 200,
      height: 120
    })
    const text = createMockShapeTextbox({
      text: 'shape text',
      width: 200
    })
    const group = createMockShapeGroup({
      shape,
      text,
      width: 200,
      height: 120
    })

    group.shapeBaseWidth = 200
    group.shapeBaseHeight = 120
    group.shapeManualBaseWidth = 180
    group.shapeManualBaseHeight = 100
    group.shapeRounding = 50
    group.scaleX = 2
    group.scaleY = 3

    const snapshot = ShapeLifecycleController.getSnapshot({
      group
    })

    expect(snapshot.rounding).toBe(50)
    expect(snapshot.baseWidth).toBe(200)
    expect(snapshot.baseHeight).toBe(120)
    expect(snapshot.manualBaseWidth).toBe(180)
    expect(snapshot.manualBaseHeight).toBe(100)
    expect(snapshot.currentWidth).toBe(400)
    expect(snapshot.currentHeight).toBe(360)
  })
})
