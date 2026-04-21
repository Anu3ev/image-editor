import { Rect } from 'fabric'
import { resizeShapeNode } from '../../../../src/editor/shape-manager/shape-factory'

describe('shape-factory', () => {
  it('для Rect пересчитывает визуальный радиус от текущего размера при том же значении скругления', () => {
    const shape = new Rect({
      width: 100,
      height: 100,
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0
    })

    resizeShapeNode({
      shape,
      width: 200,
      height: 200,
      rounding: 50
    })

    expect(shape.rx).toBe(50)
    expect(shape.ry).toBe(50)

    resizeShapeNode({
      shape,
      width: 400,
      height: 400,
      rounding: 50
    })

    expect(shape.rx).toBe(100)
    expect(shape.ry).toBe(100)
  })

  it('для Rect ограничивает визуальный радиус текущим размером даже при слишком большом значении скругления', () => {
    const shape = new Rect({
      width: 100,
      height: 100,
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0
    })

    resizeShapeNode({
      shape,
      width: 100,
      height: 320,
      rounding: 999999
    })

    expect(shape.rx).toBe(50)
    expect(shape.ry).toBe(50)
  })
})
