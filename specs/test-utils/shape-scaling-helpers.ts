import { ActiveSelection, Point } from 'fabric'
import ShapeScalingController from '../../src/editor/shape-manager/scaling/shape-scaling'
import { getShapeNodes } from '../../src/editor/shape-manager/shape-utils'
import {
  createMockCanvas,
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox
} from './shape-helpers'

type GroupOriginX = 'left' | 'center' | 'right'
type GroupOriginY = 'top' | 'center' | 'bottom'
type ShapeScalingTestGroup = ReturnType<typeof createMockShapeGroup>
type ShapeScalingTransformTarget = ShapeScalingTestGroup | ActiveSelection
type ActiveSelectionShapeScalingSelection = ActiveSelection & {
  scaleX?: number
  scaleY?: number
  getPositionByOrigin: jest.Mock<Point, [originX: GroupOriginX, originY: GroupOriginY]>
  setPositionByOrigin: jest.Mock<void, [point: Point, originX: GroupOriginX, originY: GroupOriginY]>
  setCoords: jest.Mock
}

type ShapeScalingTransformOptions = {
  scaleX?: number
  scaleY?: number
  left?: number
  top?: number
  corner?: string
  originX?: GroupOriginX
  originY?: GroupOriginY
  action?: string
  signX?: number
  signY?: number
  target?: ShapeScalingTransformTarget
}

type ActiveSelectionShapeScalingShapeBounds = {
  left: number
  top: number
  width: number
  height: number
}

export type ShapeScalingTransformStub = {
  original: {
    scaleX: number
    scaleY: number
    left: number
    top: number
  }
  corner: string
  originX: GroupOriginX
  originY: GroupOriginY
  action?: string
  signX?: number
  signY?: number
  target?: ShapeScalingTransformTarget
}

export type ShapeGroupPositionByOriginMock = jest.Mock<
  void,
  [point: Point, originX: GroupOriginX, originY: GroupOriginY]
>

export type ShapeScalingTestSetup = {
  controller: ShapeScalingController
  canvas: ReturnType<typeof createMockCanvas>
  group: ShapeScalingTestGroup
  shape: ReturnType<typeof createMockShapeNode>
  text: ReturnType<typeof createMockShapeTextbox>
}

export type ActiveSelectionShapeScalingTestSetup = {
  controller: ShapeScalingController
  canvas: ReturnType<typeof createMockCanvas>
  groups: ShapeScalingTestGroup[]
  shapes: Array<ReturnType<typeof createMockShapeNode>>
  texts: Array<ReturnType<typeof createMockShapeTextbox>>
  selection: ActiveSelectionShapeScalingSelection
  nonShapeObject: {
    setCoords: jest.Mock
    shapeComposite?: boolean
  } | null
}

/**
 * Создаёт тестовый setup для ShapeScalingController с моками shape/text группы.
 */
export const createShapeScalingSetup = (): ShapeScalingTestSetup => {
  const canvas = createMockCanvas()
  const shape = createMockShapeNode({
    width: 200,
    height: 200
  })
  const text = createMockShapeTextbox({
    text: 'test text',
    width: 200,
    fontSize: 30
  })
  const group = createMockShapeGroup({
    shape,
    text,
    left: 480,
    top: 420,
    width: 200,
    height: 200
  })

  const getShapeNodesMock = getShapeNodes as jest.Mock
  getShapeNodesMock.mockReturnValue({
    shape,
    text
  })

  return {
    controller: new ShapeScalingController({
      canvas: canvas as never
    }),
    canvas,
    group,
    shape,
    text
  }
}

/**
 * Создаёт setup для ActiveSelection c несколькими shape-группами.
 */
export const createActiveSelectionShapeScalingSetup = ({
  includeNonShapeObject = false,
  shapeBounds
}: {
  includeNonShapeObject?: boolean
  shapeBounds?: ActiveSelectionShapeScalingShapeBounds[]
} = {}): ActiveSelectionShapeScalingTestSetup => {
  const canvas = createMockCanvas()
  const controller = new ShapeScalingController({
    canvas: canvas as never
  })
  const groups: ShapeScalingTestGroup[] = []
  const shapes: Array<ReturnType<typeof createMockShapeNode>> = []
  const texts: Array<ReturnType<typeof createMockShapeTextbox>> = []
  const groupNodes = new Map<ShapeScalingTestGroup, {
    shape: ReturnType<typeof createMockShapeNode>
    text: ReturnType<typeof createMockShapeTextbox>
  }>()

  for (let index = 0; index < 2; index += 1) {
    const bounds = shapeBounds?.[index]
    const width = bounds?.width ?? 200
    const height = bounds?.height ?? 200
    const shape = createMockShapeNode({
      width,
      height
    })
    const text = createMockShapeTextbox({
      text: `test text ${index + 1}`,
      width,
      fontSize: 30
    })
    const group = createMockShapeGroup({
      shape,
      text,
      left: bounds
        ? bounds.left + (bounds.width / 2)
        : 480 + (index * 140),
      top: bounds
        ? bounds.top + (bounds.height / 2)
        : 420,
      width,
      height
    })

    groups.push(group)
    shapes.push(shape)
    texts.push(text)
    groupNodes.set(group, {
      shape,
      text
    })
  }

  const nonShapeObject = includeNonShapeObject
    ? {
      setCoords: jest.fn(),
      shapeComposite: false
    }
    : null
  const selectionObjects = includeNonShapeObject && nonShapeObject
    ? [groups[0], nonShapeObject, groups[1]]
    : groups
  const selection = new ActiveSelection(selectionObjects as never[], {
    canvas: canvas as never
  }) as ActiveSelectionShapeScalingSelection
  selection.getPositionByOrigin = jest.fn((
    _originX: GroupOriginX,
    _originY: GroupOriginY
  ) => new Point(
    Number(selection.left) || 0,
    Number(selection.top) || 0
  ))
  selection.setPositionByOrigin = jest.fn((
    point: Point,
    _originX: GroupOriginX,
    _originY: GroupOriginY
  ) => {
    selection.left = point.x
    selection.top = point.y
  })
  selection.setCoords = jest.fn()

  const getShapeNodesMock = getShapeNodes as jest.Mock

  getShapeNodesMock.mockImplementation(({ group }: { group: ShapeScalingTestGroup }) => {
    return groupNodes.get(group) ?? {
      shape: null,
      text: null
    }
  })

  return {
    controller,
    canvas,
    groups,
    shapes,
    texts,
    selection,
    nonShapeObject
  }
}

/**
 * Возвращает transform-стаб для object:scaling/object:modified unit-сценариев.
 */
export const createShapeScalingTransform = ({
  scaleX = 1,
  scaleY = 1,
  left = 480,
  top = 420,
  corner = 'br',
  originX = 'left',
  originY = 'top',
  action,
  signX,
  signY,
  target
}: ShapeScalingTransformOptions = {}): ShapeScalingTransformStub => ({
  original: {
    scaleX,
    scaleY,
    left,
    top
  },
  corner,
  originX,
  originY,
  action,
  signX,
  signY,
  target
})

/**
 * Подменяет setPositionByOrigin у группы на реалистичный расчёт left/top через origin.
 */
export const mockShapeGroupPositionByOrigin = ({
  group
}: {
  group: ShapeScalingTestSetup['group']
}): ShapeGroupPositionByOriginMock => {
  const setPositionByOriginMock: ShapeGroupPositionByOriginMock = jest.fn((
    point: Point,
    originX: GroupOriginX,
    originY: GroupOriginY
  ) => {
    const width = (group.width ?? 0) * (group.scaleX ?? 1)
    const height = (group.height ?? 0) * (group.scaleY ?? 1)
    let nextLeft = point.x
    let nextTop = point.y

    if (originX === 'center') {
      nextLeft -= width / 2
    }
    if (originX === 'right') {
      nextLeft -= width
    }
    if (originY === 'center') {
      nextTop -= height / 2
    }
    if (originY === 'bottom') {
      nextTop -= height
    }

    group.left = nextLeft
    group.top = nextTop
  })

  group.setPositionByOrigin = setPositionByOriginMock as never

  return setPositionByOriginMock
}

/**
 * Подменяет canvas/group API так, чтобы scaling controller получил заданную локальную pointer-точку transform.
 */
export const mockShapeScalingLocalPointer = ({
  canvas,
  group,
  corner,
  localPoint
}: {
  canvas: ShapeScalingTestSetup['canvas'] & {
    getScenePoint?: jest.Mock
    getZoom?: jest.Mock
  }
  group: ShapeScalingTestSetup['group']
  corner: string
  localPoint: Point
}): void => {
  canvas.getScenePoint = jest.fn(() => ({
    x: localPoint.x,
    y: localPoint.y,
    rotate: jest.fn(() => new Point(localPoint.x, localPoint.y)),
    subtract: jest.fn(() => new Point(localPoint.x, localPoint.y))
  })) as never
  canvas.getZoom = jest.fn(() => 1) as never

  group.canvas = canvas as never
  group.getRelativeCenterPoint = jest.fn(() => new Point(0, 0)) as never
  group.translateToGivenOrigin = jest.fn(() => new Point(0, 0)) as never
  group.controls = {
    [corner]: {
      offsetX: 0,
      offsetY: 0
    }
  } as never
}
