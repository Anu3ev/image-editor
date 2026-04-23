import { Rect } from 'fabric'
import { nanoid } from 'nanoid'
import {
  createShapeNode,
  resizeShapeNode
} from '../../../../src/editor/shape-manager/shape-factory'

jest.mock('nanoid')

describe('shape-factory', () => {
  const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>

  beforeEach(() => {
    jest.clearAllMocks()
    mockNanoid.mockImplementation(() => 'shape-node-id')
  })

  it('при создании фигуры задаёт id внутреннему объекту фигуры', async() => {
    const shape = await createShapeNode({
      preset: {
        key: 'square',
        type: 'rect',
        width: 100,
        height: 100
      },
      width: 120,
      height: 80,
      style: {
        fill: '#ffffff',
        stroke: null,
        strokeWidth: 0
      }
    })

    expect(shape.id).toEqual(expect.stringContaining('shape-node-id'))
    expect(shape.shapeNodeType).toBe('shape')
  })

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
