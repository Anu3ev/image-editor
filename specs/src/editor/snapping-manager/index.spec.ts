import { Textbox } from 'fabric'
import SnappingManager from '../../../../src/editor/snapping-manager'
import {
  calculateHorizontalSpacing,
  calculateVerticalSpacing
} from '../../../../src/editor/snapping-manager/calculations'
import {
  MOVE_SNAP_STEP,
  SNAP_THRESHOLD
} from '../../../../src/editor/snapping-manager/constants'
import type { Bounds, SpacingPattern } from '../../../../src/editor/snapping-manager/types'
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

    const snappingManager = new SnappingManager({ editor })
    const snappingManagerState = snappingManager as any
    snappingManagerState._handleObjectMoving({ target: active })

    expect(active.left).toBe(Math.round(10.2 / MOVE_SNAP_STEP) * MOVE_SNAP_STEP)
    expect(active.top).toBe(Math.round(15.8 / MOVE_SNAP_STEP) * MOVE_SNAP_STEP)
    expect(active.setCoords).toHaveBeenCalled()
  })

  it('округляет координаты до шага MOVE_SNAP_STEP при перемещении с CTRL', () => {
    const { editor } = createSnappingTestContext()
    const active = createBoundsObject({ left: 21.6, top: 33.3, width: 30, height: 30, id: 'active' })

    const snappingManager = new SnappingManager({ editor })
    const snappingManagerState = snappingManager as any
    snappingManagerState._handleObjectMoving({
      target: active,
      e: { ctrlKey: true }
    })

    expect(active.left).toBe(Math.round(21.6 / MOVE_SNAP_STEP) * MOVE_SNAP_STEP)
    expect(active.top).toBe(Math.round(33.3 / MOVE_SNAP_STEP) * MOVE_SNAP_STEP)
    expect(active.setCoords).toHaveBeenCalled()
  })

  it('показывает равноудалённость, если половина свободного зазора не кратна шагу', () => {
    const { editor, objects } = createSnappingTestContext()
    const first = createBoundsObject({ left: 0, top: 0, width: 10, height: 10, id: 'obj-1' })
    const second = createBoundsObject({ left: 24, top: 0, width: 10, height: 10, id: 'obj-2' })
    const active = createBoundsObject({ left: 14, top: 0, width: 8, height: 10, id: 'active' })
    objects.push(first)
    objects.push(second)
    objects.push(active)

    const snappingManager = new SnappingManager({ editor })
    const snappingManagerState = snappingManager as any
    snappingManagerState._handleMouseDown({ target: active })
    snappingManagerState._handleObjectMoving({ target: active })

    const { activeSpacingGuides } = snappingManager as any
    expect(activeSpacingGuides.length).toBeGreaterThan(0)
    expect(activeSpacingGuides[0].distance).toBe(3)
  })

  it('показывает общий display-distance при неидеально делимом центральном зазоре', () => {
    const { editor, objects } = createSnappingTestContext()
    const first = createBoundsObject({ left: 0, top: 0, width: 10, height: 10, id: 'obj-1' })
    const second = createBoundsObject({ left: 75, top: 0, width: 10, height: 10, id: 'obj-2' })
    const active = createBoundsObject({ left: 33, top: 0, width: 20, height: 10, id: 'active' })
    objects.push(first)
    objects.push(second)
    objects.push(active)

    const snappingManager = new SnappingManager({ editor })
    const snappingManagerState = snappingManager as any
    snappingManagerState._handleMouseDown({ target: active })
    snappingManagerState._handleObjectMoving({ target: active })

    const { activeSpacingGuides } = snappingManager as any
    expect(activeSpacingGuides.length).toBeGreaterThan(0)
    expect(activeSpacingGuides[0].distance).toBe(23)
  })

  it('показывает равноудалённость по шагу и расстояние совпадает с фактическим зазором', () => {
    const { editor, objects } = createSnappingTestContext()
    const first = createBoundsObject({ left: 0, top: 0, width: 10, height: 10, id: 'obj-1' })
    const second = createBoundsObject({ left: 26, top: 0, width: 10, height: 10, id: 'obj-2' })
    const active = createBoundsObject({ left: 12, top: 0, width: 8, height: 10, id: 'active' })
    objects.push(first)
    objects.push(second)
    objects.push(active)

    const snappingManager = new SnappingManager({ editor })
    const snappingManagerState = snappingManager as any
    snappingManagerState._handleMouseDown({ target: active })
    snappingManagerState._handleObjectMoving({ target: active })

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

    const snappingManager = new SnappingManager({ editor })
    const snappingManagerState = snappingManager as any
    snappingManagerState._handleMouseDown({ target: active })
    snappingManagerState._handleObjectMoving({ target: active })

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

    const snappingManager = new SnappingManager({ editor })
    const snappingManagerState = snappingManager as any
    snappingManagerState._handleMouseDown({ target: active })
    snappingManagerState._handleObjectMoving({ target: active })

    expect(active.left).toBe(expectedPosition)

    const { activeSpacingGuides } = snappingManager as any
    expect(activeSpacingGuides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ distance: expectedGap })
      ])
    )
  })

  it('показывает одинаковый display-distance для разных объектов в вертикальной цепочке', () => {
    const { editor, objects } = createSnappingTestContext()
    const top = createBoundsObject({ left: 0, top: 0, width: 50, height: 50, id: 'top' })
    const middle = createBoundsObject({ left: 0, top: 91, width: 50, height: 50, id: 'middle' })
    const bottom = createBoundsObject({ left: 0, top: 182, width: 50, height: 50, id: 'bottom' })
    objects.push(top)
    objects.push(middle)
    objects.push(bottom)

    const middleSnappingManager = new SnappingManager({ editor });
    (middleSnappingManager as any)._handleMouseDown({ target: middle });
    (middleSnappingManager as any)._handleObjectMoving({ target: middle })
    const middleGuides = (middleSnappingManager as any).activeSpacingGuides
    const middleDistance = middleGuides[0]?.distance

    const topSnappingManager = new SnappingManager({ editor });
    (topSnappingManager as any)._handleMouseDown({ target: top });
    (topSnappingManager as any)._handleObjectMoving({ target: top })
    const topGuides = (topSnappingManager as any).activeSpacingGuides
    const topDistance = topGuides[0]?.distance

    expect(middleDistance).toBe(41)
    expect(topDistance).toBe(41)
  })

  it('показывает одинаковый display-distance в вертикальной цепочке при уменьшенном среднем объекте', () => {
    const { editor, objects } = createSnappingTestContext()
    const top = createBoundsObject({ left: 0, top: 0, width: 80, height: 80, id: 'top' })
    const middle = createBoundsObject({ left: 0, top: 109, width: 80, height: 40, id: 'middle' })
    const bottom = createBoundsObject({ left: 0, top: 177, width: 80, height: 80, id: 'bottom' })
    objects.push(top)
    objects.push(middle)
    objects.push(bottom)

    const middleSnappingManager = new SnappingManager({ editor });
    (middleSnappingManager as any)._handleMouseDown({ target: middle });
    (middleSnappingManager as any)._handleObjectMoving({ target: middle })
    const middleGuides = (middleSnappingManager as any).activeSpacingGuides
    const middleDistance = middleGuides[0]?.distance

    const bottomSnappingManager = new SnappingManager({ editor });
    (bottomSnappingManager as any)._handleMouseDown({ target: bottom });
    (bottomSnappingManager as any)._handleObjectMoving({ target: bottom })
    const bottomGuides = (bottomSnappingManager as any).activeSpacingGuides
    const bottomDistance = bottomGuides[0]?.distance

    expect(middleDistance).toBe(29)
    expect(bottomDistance).toBe(29)
  })

  it('не переносит левый референсный зазор на правую сторону без правой цепочки', () => {
    const { editor, objects } = createSnappingTestContext()
    const first = createBoundsObject({ left: 0, top: 0, width: 20, height: 20, id: 'obj-1' })
    const second = createBoundsObject({ left: 82, top: 0, width: 20, height: 20, id: 'obj-2' })
    const active = createBoundsObject({ left: 169, top: 0, width: 20, height: 20, id: 'active' })
    const right = createBoundsObject({ left: 251, top: 0, width: 20, height: 20, id: 'obj-3' })
    objects.push(first, second, right, active)

    const snappingManager = new SnappingManager({ editor })
    const snappingManagerState = snappingManager as any
    snappingManagerState._handleMouseDown({ target: active })
    snappingManagerState._handleObjectMoving({ target: active })

    expect(active.left).toBe(164)

    const activeBounds = getObjectBounds({ object: active })
    const rightBounds = getObjectBounds({ object: right })
    if (!activeBounds || !rightBounds) {
      throw new Error('Bounds не рассчитаны для проверки side ownership')
    }

    const rightGap = rightBounds.left - activeBounds.right
    expect(rightGap).toBe(67)

    const {
      activeSpacingGuides
    }: {
      activeSpacingGuides: Array<{
        activeEnd: number
        activeStart: number
        distance: number
      }>
    } = snappingManager as any
    expect(activeSpacingGuides).toHaveLength(1)
    expect(activeSpacingGuides[0].distance).toBe(62)
    expect(activeSpacingGuides[0].activeStart).toBe(second.left + second.width)
    expect(activeSpacingGuides[0].activeEnd).toBe(active.left)
    expect(activeSpacingGuides[0].activeEnd).not.toBe(rightBounds.left)
  })

  it('показывает левый и правый контекст, когда паттерн равноудалённости совместим', () => {
    const { editor, objects } = createSnappingTestContext()
    const first = createBoundsObject({ left: 0, top: 0, width: 20, height: 20, id: 'obj-1' })
    const second = createBoundsObject({ left: 82, top: 0, width: 20, height: 20, id: 'obj-2' })
    const active = createBoundsObject({ left: 164, top: 0, width: 20, height: 20, id: 'active' })
    const right = createBoundsObject({ left: 246, top: 0, width: 20, height: 20, id: 'obj-3' })
    objects.push(first, second, right, active)

    const snappingManager = new SnappingManager({ editor })
    const snappingManagerState = snappingManager as any
    snappingManagerState._handleMouseDown({ target: active })
    snappingManagerState._handleObjectMoving({ target: active })

    const firstBounds = getObjectBounds({ object: first })
    const secondBounds = getObjectBounds({ object: second })
    const activeBounds = getObjectBounds({ object: active })
    const rightBounds = getObjectBounds({ object: right })
    if (!firstBounds || !secondBounds || !activeBounds || !rightBounds) {
      throw new Error('Bounds не рассчитаны для проверки совместимого паттерна')
    }

    const {
      activeSpacingGuides
    }: {
      activeSpacingGuides: Array<{
        refStart: number
        refEnd: number
        activeStart: number
        activeEnd: number
        distance: number
      }>
    } = snappingManager as any
    expect(activeSpacingGuides.length).toBeGreaterThanOrEqual(2)

    let hasLeftReferenceGuide = false
    let hasRightActiveGuide = false
    for (const guide of activeSpacingGuides) {
      const isLeftReferenceGuide = guide.refStart === firstBounds.right
        && guide.refEnd === secondBounds.left
        && guide.distance === 62
      if (isLeftReferenceGuide) {
        hasLeftReferenceGuide = true
      }

      const isRightActiveGuide = guide.activeStart === activeBounds.right
        && guide.activeEnd === rightBounds.left
        && guide.distance === 62
      if (isRightActiveGuide) {
        hasRightActiveGuide = true
      }
    }

    expect(hasLeftReferenceGuide).toBe(true)
    expect(hasRightActiveGuide).toBe(true)
  })

  it('выбирает ближайший верхний референсный паттерн по вертикали и не даёт второй snap на 1px', () => {
    const activeBounds: Bounds = {
      left: 0,
      top: 200,
      right: 40,
      bottom: 240,
      centerX: 20,
      centerY: 220
    }
    const candidates: Bounds[] = [
      {
        left: 0,
        top: 120,
        right: 40,
        bottom: 158,
        centerX: 20,
        centerY: 139
      },
      {
        left: 0,
        top: 330,
        right: 40,
        bottom: 370,
        centerX: 20,
        centerY: 350
      }
    ]
    const patterns: SpacingPattern[] = [
      {
        type: 'vertical',
        axis: 20,
        start: 100,
        end: 143,
        distance: 43
      },
      {
        type: 'vertical',
        axis: 20,
        start: 146,
        end: 190,
        distance: 44
      },
      {
        type: 'vertical',
        axis: 20,
        start: 300,
        end: 350,
        distance: 50
      }
    ]

    const { delta, guides } = calculateVerticalSpacing({
      activeBounds,
      candidates,
      threshold: SNAP_THRESHOLD,
      patterns
    })

    expect(delta).toBe(2)
    expect(guides).toHaveLength(1)
    expect(guides[0]).toEqual(expect.objectContaining({
      refStart: 146,
      refEnd: 190,
      distance: 44
    }))

    let hasDistance43 = false
    for (const guide of guides) {
      if (guide.distance === 43) {
        hasDistance43 = true
      }
    }

    expect(hasDistance43).toBe(false)
  })

  it('сохраняет вертикальный snap для нижнего контекста, когда верхние референсы вне порога', () => {
    const activeBounds: Bounds = {
      left: 0,
      top: 248,
      right: 40,
      bottom: 288,
      centerX: 20,
      centerY: 268
    }
    const candidates: Bounds[] = [
      {
        left: 0,
        top: 120,
        right: 40,
        bottom: 158,
        centerX: 20,
        centerY: 139
      },
      {
        left: 0,
        top: 337,
        right: 40,
        bottom: 377,
        centerX: 20,
        centerY: 357
      }
    ]
    const patterns: SpacingPattern[] = [
      {
        type: 'vertical',
        axis: 20,
        start: 100,
        end: 143,
        distance: 43
      },
      {
        type: 'vertical',
        axis: 20,
        start: 146,
        end: 190,
        distance: 44
      },
      {
        type: 'vertical',
        axis: 20,
        start: 300,
        end: 350,
        distance: 50
      }
    ]

    const { delta, guides } = calculateVerticalSpacing({
      activeBounds,
      candidates,
      threshold: SNAP_THRESHOLD,
      patterns
    })

    expect(delta).toBe(-1)
    expect(guides).toHaveLength(1)
    expect(guides[0]).toEqual(expect.objectContaining({
      refStart: 300,
      refEnd: 350,
      distance: 50
    }))
  })

  it('выбирает ближайший левый референсный паттерн по горизонтали и не даёт второй snap на 1px', () => {
    const activeBounds: Bounds = {
      left: 200,
      top: 0,
      right: 240,
      bottom: 40,
      centerX: 220,
      centerY: 20
    }
    const candidates: Bounds[] = [
      {
        left: 120,
        top: 0,
        right: 158,
        bottom: 40,
        centerX: 139,
        centerY: 20
      },
      {
        left: 330,
        top: 0,
        right: 370,
        bottom: 40,
        centerX: 350,
        centerY: 20
      }
    ]
    const patterns: SpacingPattern[] = [
      {
        type: 'horizontal',
        axis: 20,
        start: 100,
        end: 143,
        distance: 43
      },
      {
        type: 'horizontal',
        axis: 20,
        start: 146,
        end: 190,
        distance: 44
      },
      {
        type: 'horizontal',
        axis: 20,
        start: 300,
        end: 350,
        distance: 50
      }
    ]

    const { delta, guides } = calculateHorizontalSpacing({
      activeBounds,
      candidates,
      threshold: SNAP_THRESHOLD,
      patterns
    })

    expect(delta).toBe(2)
    expect(guides).toHaveLength(1)
    expect(guides[0]).toEqual(expect.objectContaining({
      refStart: 146,
      refEnd: 190,
      distance: 44
    }))

    let hasDistance43 = false
    for (const guide of guides) {
      if (guide.distance === 43) {
        hasDistance43 = true
      }
    }

    expect(hasDistance43).toBe(false)
  })

  it('сохраняет горизонтальный snap для правого контекста, когда левые референсы вне порога', () => {
    const activeBounds: Bounds = {
      left: 248,
      top: 0,
      right: 288,
      bottom: 40,
      centerX: 268,
      centerY: 20
    }
    const candidates: Bounds[] = [
      {
        left: 120,
        top: 0,
        right: 158,
        bottom: 40,
        centerX: 139,
        centerY: 20
      },
      {
        left: 337,
        top: 0,
        right: 377,
        bottom: 40,
        centerX: 357,
        centerY: 20
      }
    ]
    const patterns: SpacingPattern[] = [
      {
        type: 'horizontal',
        axis: 20,
        start: 100,
        end: 143,
        distance: 43
      },
      {
        type: 'horizontal',
        axis: 20,
        start: 146,
        end: 190,
        distance: 44
      },
      {
        type: 'horizontal',
        axis: 20,
        start: 300,
        end: 350,
        distance: 50
      }
    ]

    const { delta, guides } = calculateHorizontalSpacing({
      activeBounds,
      candidates,
      threshold: SNAP_THRESHOLD,
      patterns
    })

    expect(delta).toBe(-1)
    expect(guides).toHaveLength(1)
    expect(guides[0]).toEqual(expect.objectContaining({
      refStart: 300,
      refEnd: 350,
      distance: 50
    }))
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

    const snappingManager = new SnappingManager({ editor })
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
    const snappingManager = new SnappingManager({ editor })
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
