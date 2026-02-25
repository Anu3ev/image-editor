import { getObjectBounds, snapObjectToPixelGrid } from '../../../../src/editor/utils/geometry'
import { createBoundsObject, createPixelGridObject } from '../../../test-utils/editor-helpers'

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

describe('snapObjectToPixelGrid', () => {
  it('округляет дробные left и top до целых', () => {
    const obj = createPixelGridObject({ left: 164.2, top: 87.7 })

    snapObjectToPixelGrid({ object: obj })

    expect(obj.left).toBe(164)
    expect(obj.top).toBe(88)
  })

  it('пересчитывает scaleX/scaleY для целых визуальных размеров', () => {
    const obj = createPixelGridObject({
      width: 150,
      height: 200,
      scaleX: 0.337,
      scaleY: 0.437
    })

    snapObjectToPixelGrid({ object: obj })

    const visualWidth = obj.width * obj.scaleX
    const visualHeight = obj.height * obj.scaleY

    expect(visualWidth).toBeCloseTo(Math.round(visualWidth), 10)
    expect(visualHeight).toBeCloseTo(Math.round(visualHeight), 10)
  })

  it('не меняет scale для Textbox', () => {
    const obj = createPixelGridObject({
      left: 10.3,
      top: 20.7,
      width: 150,
      height: 80,
      scaleX: 0.337,
      scaleY: 0.437,
      type: 'Textbox'
    })

    snapObjectToPixelGrid({ object: obj })

    expect(obj.left).toBe(10)
    expect(obj.top).toBe(21)
    expect(obj.scaleX).toBe(0.337)
    expect(obj.scaleY).toBe(0.437)
  })

  it('учитывает strokeWidth при strokeUniform=false', () => {
    const obj = createPixelGridObject({
      width: 100,
      height: 100,
      scaleX: 0.33,
      scaleY: 0.43,
      strokeWidth: 2,
      strokeUniform: false
    })

    snapObjectToPixelGrid({ object: obj })

    const effectiveWidth = 100 + 2
    const effectiveHeight = 100 + 2
    const visualWidth = effectiveWidth * obj.scaleX
    const visualHeight = effectiveHeight * obj.scaleY

    expect(Math.round(visualWidth)).toBe(visualWidth)
    expect(Math.round(visualHeight)).toBe(visualHeight)
  })

  it('не учитывает strokeWidth при strokeUniform=true', () => {
    const obj = createPixelGridObject({
      width: 100,
      height: 100,
      scaleX: 0.337,
      scaleY: 0.437,
      strokeWidth: 4,
      strokeUniform: true
    })

    snapObjectToPixelGrid({ object: obj })

    const visualWidth = 100 * obj.scaleX
    const visualHeight = 100 * obj.scaleY

    expect(Math.round(visualWidth)).toBe(visualWidth)
    expect(Math.round(visualHeight)).toBe(visualHeight)
  })

  it('не уменьшает визуальный размер ниже 1px', () => {
    const obj = createPixelGridObject({
      width: 100,
      height: 100,
      scaleX: 0.001,
      scaleY: 0.002
    })

    snapObjectToPixelGrid({ object: obj })

    const visualWidth = obj.width * obj.scaleX
    const visualHeight = obj.height * obj.scaleY

    expect(visualWidth).toBeGreaterThanOrEqual(1)
    expect(visualHeight).toBeGreaterThanOrEqual(1)
  })

  it('вызывает setCoords после снапа', () => {
    const obj = createPixelGridObject({ left: 10.5, top: 20.5 })

    snapObjectToPixelGrid({ object: obj })

    expect(obj.setCoords).toHaveBeenCalled()
  })

  it('не трогает scale если визуальные размеры уже целые', () => {
    const obj = createPixelGridObject({
      left: 100,
      top: 200,
      width: 100,
      height: 100,
      scaleX: 0.5,
      scaleY: 0.5
    })

    snapObjectToPixelGrid({ object: obj })

    expect(obj.scaleX).toBe(0.5)
    expect(obj.scaleY).toBe(0.5)
  })
})
