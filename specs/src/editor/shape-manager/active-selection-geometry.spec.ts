import {
  ActiveSelection,
  Group,
  Point,
  util
} from 'fabric'
import {
  applyRotatedActiveSelectionShapeGeometry,
  captureActiveSelectionCommittedFrame,
  captureRotatedActiveSelectionShapeGeometry
} from '../../../../src/editor/shape-manager/scaling/active-selection-geometry'

describe('геометрия повёрнутого шейпа в общем выделении', () => {
  it('сохраняет исходный центр и угол канонического повёрнутого шейпа', () => {
    const center = new Point(15, 25)
    const getRelativeCenterPoint = jest.fn(() => center)
    const group = new Group([])
    const selection = new ActiveSelection([])

    group.set({
      angle: -28,
      flipX: false,
      flipY: false,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0
    })
    group.getRelativeCenterPoint = getRelativeCenterPoint
    selection.set({
      flipX: false,
      flipY: false,
      skewX: 0,
      skewY: 0
    })

    const geometry = captureRotatedActiveSelectionShapeGeometry({ group, selection })

    expect(geometry).toEqual({ angle: -28, center })
    expect(getRelativeCenterPoint).toHaveBeenCalledTimes(1)
  })

  it('не включает компенсацию для неповёрнутого шейпа', () => {
    const getRelativeCenterPoint = jest.fn(() => new Point(15, 25))
    const group = new Group([])
    const selection = new ActiveSelection([])

    group.set({
      angle: 0,
      flipX: false,
      flipY: false,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0
    })
    group.getRelativeCenterPoint = getRelativeCenterPoint
    selection.set({
      flipX: false,
      flipY: false,
      skewX: 0,
      skewY: 0
    })

    expect(captureRotatedActiveSelectionShapeGeometry({ group, selection })).toBeNull()
    expect(getRelativeCenterPoint).not.toHaveBeenCalled()
  })

  it('не включает компенсацию для отражённой или наклонённой рамки', () => {
    const getRelativeCenterPoint = jest.fn(() => new Point(15, 25))
    const group = new Group([])
    const flippedSelection = new ActiveSelection([])
    const skewedSelection = new ActiveSelection([])

    group.set({
      angle: 21,
      flipX: false,
      flipY: false,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0
    })
    group.getRelativeCenterPoint = getRelativeCenterPoint
    flippedSelection.set({
      flipX: true,
      flipY: false,
      skewX: 0,
      skewY: 0
    })
    skewedSelection.set({
      flipX: false,
      flipY: false,
      skewX: 5,
      skewY: 0
    })

    expect(captureRotatedActiveSelectionShapeGeometry({ group, selection: flippedSelection })).toBeNull()
    expect(captureRotatedActiveSelectionShapeGeometry({ group, selection: skewedSelection })).toBeNull()
    expect(getRelativeCenterPoint).not.toHaveBeenCalled()
  })

  it('сохраняет видимый центр и угол при неравномерном масштабе общей рамки', () => {
    const group = new Group([], { angle: -28 })
    const selection = new ActiveSelection([], { angle: 15 })
    const selectionMatrix = [1.6, 0, 0, 0.7, 10, 20] as const
    const sceneMatrix = [1, 0, 0, 1, 34, 37.5] as const
    const localMatrix = [1, 0, 0, 1, 24, 17.5] as const
    const composeMatrix = jest.fn(() => sceneMatrix)
    const invertTransform = jest.fn(() => [1, 0, 0, 1, -10, -20] as const)
    const multiplyTransformMatrices = jest.fn(() => localMatrix)
    const applyTransformToObject = jest.fn()
    const setCoords = jest.spyOn(group, 'setCoords')
    const originalUtil = {
      applyTransformToObject: util.applyTransformToObject,
      composeMatrix: util.composeMatrix,
      invertTransform: util.invertTransform,
      multiplyTransformMatrices: util.multiplyTransformMatrices
    }

    group.getRelativeCenterPoint = jest.fn(() => new Point(15, 25))
    selection.calcTransformMatrix = jest.fn(() => [...selectionMatrix])
    Object.assign(util, {
      applyTransformToObject,
      composeMatrix,
      invertTransform,
      multiplyTransformMatrices
    })

    try {
      const geometry = captureRotatedActiveSelectionShapeGeometry({ group, selection })

      expect(geometry).not.toBeNull()
      if (!geometry) throw new Error('Для канонического повёрнутого шейпа должна существовать геометрия')

      applyRotatedActiveSelectionShapeGeometry({ geometry, group, selection })

      expect(composeMatrix).toHaveBeenCalledWith({
        angle: -13,
        translateX: 34,
        translateY: 37.5
      })
      expect(invertTransform).toHaveBeenCalledWith([...selectionMatrix])
      expect(multiplyTransformMatrices).toHaveBeenCalledWith(
        [1, 0, 0, 1, -10, -20],
        sceneMatrix
      )
      expect(applyTransformToObject).toHaveBeenCalledWith(group, localMatrix)
      expect(setCoords).toHaveBeenCalledTimes(1)
    } finally {
      Object.assign(util, originalUtil)
    }
  })

  it('сохраняет видимые размеры и преобразование рамки перед фиксацией', () => {
    const selection = new ActiveSelection([], {
      angle: 12,
      flipX: false,
      flipY: false,
      height: 180,
      left: 240,
      scaleX: 1.4,
      scaleY: 0.75,
      skewX: 0,
      skewY: 0,
      top: 320,
      width: 300
    })

    const frame = captureActiveSelectionCommittedFrame({ selection })

    expect(frame.center).toEqual(new Point(240, 320))
    expect(frame.width).toBeCloseTo(420, 5)
    expect(frame.height).toBeCloseTo(135, 5)
    expect(frame.transformState).toEqual({
      angle: 12,
      flipX: false,
      flipY: false,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0
    })
  })
})
