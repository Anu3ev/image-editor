import { Textbox } from 'fabric'
import SnappingManager from '../../../../src/editor/snapping-manager'
import { MOVE_SNAP_STEP } from '../../../../src/editor/snapping-manager/constants'
import { getObjectBounds } from '../../../../src/editor/utils/geometry'
import { createBoundsObject, createSnappingTestContext } from '../../../test-utils/editor-helpers'

type OriginX = 'left' | 'center' | 'right'
type OriginY = 'top' | 'center' | 'bottom'
type SpacingAxis = 'vertical' | 'horizontal'

/**
 * Создаёт мок объекта для тестирования масштабирования со снапом.
 */
const createScalingObject = ({
  left,
  top,
  width,
  height,
  scaleX = 1,
  scaleY = 1,
  originX = 'left',
  originY = 'top',
  angle = 0
}: {
  left: number
  top: number
  width: number
  height: number
  scaleX?: number
  scaleY?: number
  originX?: OriginX
  originY?: OriginY
  angle?: number
}) => {
  const obj: any = {
    left,
    top,
    width,
    height,
    scaleX,
    scaleY,
    originX,
    originY,
    angle,
    visible: true,
    set: (props: Partial<Record<string, number | string>>) => {
      Object.assign(obj, props)
    },
    setCoords: jest.fn(),
    getBoundingRect: () => {
      const {
        left: objLeft = 0,
        top: objTop = 0,
        width: rawWidth = 0,
        height: rawHeight = 0,
        scaleX: currentScaleX = 1,
        scaleY: currentScaleY = 1
      } = obj
      const resolvedWidth = rawWidth * currentScaleX
      const resolvedHeight = rawHeight * currentScaleY

      return {
        left: objLeft,
        top: objTop,
        width: resolvedWidth,
        height: resolvedHeight
      }
    },
    getRelativeCenterPoint: () => {
      const {
        left: objLeft = 0,
        top: objTop = 0,
        width: rawWidth = 0,
        height: rawHeight = 0,
        scaleX: currentScaleX = 1,
        scaleY: currentScaleY = 1
      } = obj
      const resolvedWidth = rawWidth * currentScaleX
      const resolvedHeight = rawHeight * currentScaleY

      return {
        x: objLeft + (resolvedWidth / 2),
        y: objTop + (resolvedHeight / 2)
      }
    },
    translateToOriginPoint: (point: { x: number; y: number }, nextOriginX: OriginX, nextOriginY: OriginY) => {
      const {
        width: rawWidth = 0,
        height: rawHeight = 0,
        scaleX: currentScaleX = 1,
        scaleY: currentScaleY = 1
      } = obj
      const resolvedWidth = rawWidth * currentScaleX
      const resolvedHeight = rawHeight * currentScaleY

      let nextX = point.x
      let nextY = point.y

      if (nextOriginX === 'left') {
        nextX -= resolvedWidth / 2
      }
      if (nextOriginX === 'right') {
        nextX += resolvedWidth / 2
      }
      if (nextOriginY === 'top') {
        nextY -= resolvedHeight / 2
      }
      if (nextOriginY === 'bottom') {
        nextY += resolvedHeight / 2
      }

      return {
        x: nextX,
        y: nextY
      }
    },
    setPositionByOrigin: jest.fn()
  }

  return obj
}

/**
 * Создаёт сценарий равноудалённости с перекрывающим объектом на выбранной оси.
 */
const createSpacingScenario = ({ axis }: { axis: SpacingAxis }) => {
  const { editor, objects, canvas } = createSnappingTestContext()
  canvas.getZoom.mockReturnValue(2)
  const expectedGap = 24

  if (axis === 'vertical') {
    const first = createBoundsObject({ left: 0, top: 0, width: 20, height: 20, id: 'obj-1' })
    const active = createBoundsObject({ left: 0, top: 46, width: 20, height: 20, id: 'active' })
    const third = createBoundsObject({ left: 0, top: 88, width: 20, height: 20, id: 'obj-2' })
    const blocker = createBoundsObject({ left: 0, top: 60, width: 40, height: 40, id: 'blocker' })
    objects.push(first, third, blocker, active)

    return {
      editor,
      active,
      expectedGap,
      expectedPosition: 44
    }
  }

  const first = createBoundsObject({ left: 0, top: 0, width: 20, height: 20, id: 'obj-1' })
  const active = createBoundsObject({ left: 46, top: 0, width: 20, height: 20, id: 'active' })
  const third = createBoundsObject({ left: 88, top: 0, width: 20, height: 20, id: 'obj-2' })
  const blocker = createBoundsObject({ left: 60, top: 0, width: 40, height: 20, id: 'blocker' })
  objects.push(first, third, blocker, active)

  return {
    editor,
    active,
    expectedGap,
    expectedPosition: 44
  }
}

describe('SnappingManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('кеширует интервалы между пересекающимися по ширине объектами независимо от их размеров', () => {
    const { editor, objects } = createSnappingTestContext()
    const first = createBoundsObject({ left: 0, top: 0, width: 40, height: 30, id: 'obj-1' })
    const second = createBoundsObject({ left: 10, top: 100, width: 160, height: 20, id: 'obj-2' })
    const active = createBoundsObject({ left: 5, top: 180, width: 60, height: 40, id: 'active' })
    objects.push(first, second, active)

    const snappingManager = new SnappingManager({ editor });
    (snappingManager as any)._handleMouseDown({ target: active })

    const { spacingPatterns, cachedTargetBounds } = snappingManager as any
    expect(cachedTargetBounds).toHaveLength(2)
    expect(spacingPatterns.vertical).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          distance: 70,
          start: 30,
          end: 100
        })
      ])
    )
  })

  it('подтягивает активный объект к кешированному расстоянию с учётом перекрытия по ширине', () => {
    const { editor, canvas, objects } = createSnappingTestContext()
    const first = createBoundsObject({ left: 0, top: 0, width: 40, height: 30, id: 'obj-1' })
    const second = createBoundsObject({ left: 10, top: 100, width: 160, height: 20, id: 'obj-2' })
    const active = createBoundsObject({ left: 5, top: 188, width: 20, height: 50, id: 'active' })
    objects.push(first, second, active)

    const snappingManager = new SnappingManager({ editor });
    (snappingManager as any)._handleMouseDown({ target: active });
    (snappingManager as any)._handleObjectMoving({ target: active })

    expect(active.top).toBe(190)

    const { activeSpacingGuides } = snappingManager as any
    expect(activeSpacingGuides.length).toBeGreaterThan(0)
    expect(activeSpacingGuides[0]).toEqual(expect.objectContaining({ distance: 70 }))
    expect(canvas.requestRenderAll).toHaveBeenCalled()
  })

  it('округляет координаты до шага MOVE_SNAP_STEP после перемещения', () => {
    const { editor } = createSnappingTestContext()
    const active = createBoundsObject({ left: 10.2, top: 15.8, width: 20, height: 20, id: 'active' })

    const snappingManager = new SnappingManager({ editor });
    (snappingManager as any)._handleObjectMoving({ target: active })

    expect(active.left).toBe(Math.round(10.2 / MOVE_SNAP_STEP) * MOVE_SNAP_STEP)
    expect(active.top).toBe(Math.round(15.8 / MOVE_SNAP_STEP) * MOVE_SNAP_STEP)
    expect(active.setCoords).toHaveBeenCalled()
  })

  it('округляет координаты до шага MOVE_SNAP_STEP при перемещении с CTRL', () => {
    const { editor } = createSnappingTestContext()
    const active = createBoundsObject({ left: 21.6, top: 33.3, width: 30, height: 30, id: 'active' })

    const snappingManager = new SnappingManager({ editor });
    (snappingManager as any)._handleObjectMoving({
      target: active,
      e: { ctrlKey: true }
    })

    expect(active.left).toBe(Math.round(21.6 / MOVE_SNAP_STEP) * MOVE_SNAP_STEP)
    expect(active.top).toBe(Math.round(33.3 / MOVE_SNAP_STEP) * MOVE_SNAP_STEP)
    expect(active.setCoords).toHaveBeenCalled()
  })

  it('не показывает равноудалённость, если половина свободного зазора не кратна шагу', () => {
    const { editor, objects } = createSnappingTestContext()
    const first = createBoundsObject({ left: 0, top: 0, width: 10, height: 10, id: 'obj-1' })
    const second = createBoundsObject({ left: 24, top: 0, width: 10, height: 10, id: 'obj-2' })
    const active = createBoundsObject({ left: 14, top: 0, width: 8, height: 10, id: 'active' })
    objects.push(first)
    objects.push(second)
    objects.push(active)

    const snappingManager = new SnappingManager({ editor });
    (snappingManager as any)._handleMouseDown({ target: active });
    (snappingManager as any)._handleObjectMoving({ target: active })

    const { activeSpacingGuides } = snappingManager as any
    expect(activeSpacingGuides).toHaveLength(0)
  })

  it('показывает равноудалённость по шагу и расстояние совпадает с фактическим зазором', () => {
    const { editor, objects } = createSnappingTestContext()
    const first = createBoundsObject({ left: 0, top: 0, width: 10, height: 10, id: 'obj-1' })
    const second = createBoundsObject({ left: 26, top: 0, width: 10, height: 10, id: 'obj-2' })
    const active = createBoundsObject({ left: 12, top: 0, width: 8, height: 10, id: 'active' })
    objects.push(first)
    objects.push(second)
    objects.push(active)

    const snappingManager = new SnappingManager({ editor });
    (snappingManager as any)._handleMouseDown({ target: active });
    (snappingManager as any)._handleObjectMoving({ target: active })

    const { activeSpacingGuides } = snappingManager as any
    expect(activeSpacingGuides.length).toBeGreaterThan(0)

    const guide = activeSpacingGuides[0]
    const { distance } = guide
    const activeBounds = getObjectBounds({ object: active })
    const firstBounds = getObjectBounds({ object: first })
    const secondBounds = getObjectBounds({ object: second })

    if (!activeBounds || !firstBounds || !secondBounds) {
      throw new Error('Bounds не рассчитаны для теста равноудалённости')
    }

    const { left: activeLeft, right: activeRight } = activeBounds
    const { right: firstRight } = firstBounds
    const { left: secondLeft } = secondBounds
    const gapLeft = activeLeft - firstRight
    const gapRight = secondLeft - activeRight

    expect(gapLeft).toBe(distance)
    expect(gapRight).toBe(distance)
    expect(distance % MOVE_SNAP_STEP).toBe(0)
  })

  it('снапит равноудалённость по вертикали при перекрывающем объекте между кругами', () => {
    const scenario = createSpacingScenario({ axis: 'vertical' })
    const {
      editor,
      active,
      expectedGap,
      expectedPosition
    } = scenario

    const snappingManager = new SnappingManager({ editor });
    (snappingManager as any)._handleMouseDown({ target: active });
    (snappingManager as any)._handleObjectMoving({ target: active })

    expect(active.top).toBe(expectedPosition)

    const { activeSpacingGuides } = snappingManager as any
    expect(activeSpacingGuides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ distance: expectedGap })
      ])
    )
  })

  it('снапит равноудалённость по горизонтали при перекрывающем объекте между кругами', () => {
    const scenario = createSpacingScenario({ axis: 'horizontal' })
    const {
      editor,
      active,
      expectedGap,
      expectedPosition
    } = scenario

    const snappingManager = new SnappingManager({ editor });
    (snappingManager as any)._handleMouseDown({ target: active });
    (snappingManager as any)._handleObjectMoving({ target: active })

    expect(active.left).toBe(expectedPosition)

    const { activeSpacingGuides } = snappingManager as any
    expect(activeSpacingGuides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ distance: expectedGap })
      ])
    )
  })

  it('масштабирует объект по X с прилипаниями и фиксирует origin', () => {
    const { editor, objects } = createSnappingTestContext()
    const active = createScalingObject({
      left: 296,
      top: 100,
      width: 100,
      height: 50,
      originX: 'left',
      originY: 'top'
    })
    objects.push(active)

    const snappingManager = new SnappingManager({ editor });
    const snappingManagerState = snappingManager as any
    snappingManagerState.anchors = { vertical: [400], horizontal: [] }
    snappingManagerState._handleObjectScaling({
      target: active,
      transform: {
        corner: 'mr',
        action: 'scaleX',
        originX: 'left',
        originY: 'top',
        scaleX: 1,
        scaleY: 1
      }
    })

    expect(active.scaleX).toBeCloseTo(1.04, 4)
    expect(active.setPositionByOrigin).toHaveBeenCalledWith(
      expect.objectContaining({ x: 296, y: 100 }),
      'left',
      'top'
    )

    const { activeGuides } = snappingManager as any
    expect(activeGuides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'vertical',
          position: 400
        })
      ])
    )
  })

  it('применяет snap для текстового ресайза по горизонтали и фиксирует правый край', () => {
    const { editor, canvas } = createSnappingTestContext()
    const snappingManager = new SnappingManager({ editor });
    const snappingManagerState = snappingManager as any
    snappingManagerState.anchors = { vertical: [200], horizontal: [] }
    const textbox = new Textbox('Test', {
      left: 204,
      top: 50,
      width: 100
    })

    textbox.canvas = canvas as any

    snappingManager.applyTextResizingSnap({
      target: textbox,
      transform: {
        corner: 'ml',
        originX: 'right',
        originY: 'top'
      } as any,
      event: null
    })

    expect(textbox.width).toBe(104)
    expect(textbox.left).toBe(200)

    const { activeGuides } = snappingManager as any
    expect(activeGuides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'vertical',
          position: 200
        })
      ])
    )
  })
})
