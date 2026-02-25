import { getObjectBounds } from '../../../../src/editor/utils/geometry'
import { createBoundsObject } from '../../../test-utils/editor-helpers'

describe('getObjectBounds', () => {
  it('возвращает null для null-объекта', () => {
    expect(getObjectBounds({ object: null })).toBeNull()
  })

  it('возвращает null для undefined-объекта', () => {
    expect(getObjectBounds({ object: undefined })).toBeNull()
  })

  it('сохраняет точные left и top из getBoundingRect', () => {
    const obj = createBoundsObject({ left: 10, top: 20, width: 50, height: 30 })
    obj.getBoundingRect.mockReturnValue({ left: 10.3, top: 20.7, width: 50, height: 30 })

    const bounds = getObjectBounds({ object: obj })

    expect(bounds?.left).toBe(10.3)
    expect(bounds?.top).toBe(20.7)
  })

  it('округляет width и height до ближайшего целого и вычисляет right/bottom от них', () => {
    const obj = createBoundsObject({ left: 100, top: 200, width: 33, height: 43 })
    obj.getBoundingRect.mockReturnValue({ left: 100.3, top: 200.7, width: 33.6, height: 43.4 })

    const bounds = getObjectBounds({ object: obj })

    expect(bounds?.left).toBe(100.3)
    expect(bounds?.top).toBe(200.7)
    expect(bounds?.right).toBe(100.3 + 34)
    expect(bounds?.bottom).toBe(200.7 + 43)
  })

  it('даёт одинаковую округлённую ширину для одинаковых объектов на разных позициях', () => {
    const objA = createBoundsObject({ left: 0, top: 0, width: 100, height: 100 })
    objA.getBoundingRect.mockReturnValue({ left: 100.3, top: 0, width: 33.33, height: 43.33 })

    const objB = createBoundsObject({ left: 0, top: 0, width: 100, height: 100 })
    objB.getBoundingRect.mockReturnValue({ left: 200.7, top: 0, width: 33.33, height: 43.33 })

    const boundsA = getObjectBounds({ object: objA })
    const boundsB = getObjectBounds({ object: objB })

    const roundedWidthA = Math.round((boundsA?.right ?? 0) - (boundsA?.left ?? 0))
    const roundedWidthB = Math.round((boundsB?.right ?? 0) - (boundsB?.left ?? 0))

    expect(roundedWidthA).toBe(roundedWidthB)
  })

  it('даёт одинаковую высоту для одинаковых объектов на разных позициях', () => {
    const objA = createBoundsObject({ left: 0, top: 0, width: 100, height: 100 })
    objA.getBoundingRect.mockReturnValue({ left: 0, top: 50.2, width: 100, height: 43.6 })

    const objB = createBoundsObject({ left: 0, top: 0, width: 100, height: 100 })
    objB.getBoundingRect.mockReturnValue({ left: 0, top: 150.8, width: 100, height: 43.6 })

    const boundsA = getObjectBounds({ object: objA })
    const boundsB = getObjectBounds({ object: objB })

    const heightA = (boundsA?.bottom ?? 0) - (boundsA?.top ?? 0)
    const heightB = (boundsB?.bottom ?? 0) - (boundsB?.top ?? 0)

    expect(heightA).toBe(heightB)
  })

  it('вычисляет centerX и centerY от округлённых размеров', () => {
    const obj = createBoundsObject({ left: 0, top: 0, width: 50, height: 30 })
    obj.getBoundingRect.mockReturnValue({ left: 10, top: 20, width: 50, height: 30 })

    const bounds = getObjectBounds({ object: obj })

    expect(bounds?.centerX).toBe(10 + 25)
    expect(bounds?.centerY).toBe(20 + 15)
  })

  it('возвращает null при ошибке в getBoundingRect', () => {
    const obj: any = {
      setCoords: jest.fn(),
      getBoundingRect: jest.fn(() => { throw new Error('fail') })
    }

    expect(getObjectBounds({ object: obj })).toBeNull()
  })
})
