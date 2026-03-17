import { Point } from 'fabric'
import ShapeScalingController from '../../src/editor/shape-manager/shape-scaling'
import { getShapeNodes } from '../../src/editor/shape-manager/shape-utils'
import {
  createMockCanvas,
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox
} from './shape-helpers'

type GroupOriginX = 'left' | 'center' | 'right'
type GroupOriginY = 'top' | 'center' | 'bottom'

type ShapeScalingTransformOptions = {
  scaleX?: number
  scaleY?: number
  left?: number
  top?: number
  corner?: string
  originX?: GroupOriginX
  originY?: GroupOriginY
}

export type ShapeScalingTestSetup = {
  controller: ShapeScalingController
  canvas: ReturnType<typeof createMockCanvas>
  group: ReturnType<typeof createMockShapeGroup>
  shape: ReturnType<typeof createMockShapeNode>
  text: ReturnType<typeof createMockShapeTextbox>
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
 * Возвращает transform-стаб для object:scaling/object:modified unit-сценариев.
 */
export const createShapeScalingTransform = ({
  scaleX = 1,
  scaleY = 1,
  left = 480,
  top = 420,
  corner = 'br',
  originX = 'left',
  originY = 'top'
}: ShapeScalingTransformOptions = {}): never => ({
  original: {
    scaleX,
    scaleY,
    left,
    top
  },
  corner,
  originX,
  originY
} as never)

/**
 * Подменяет setPositionByOrigin у группы на реалистичный расчёт left/top через origin.
 */
export const mockShapeGroupPositionByOrigin = ({
  group
}: {
  group: ShapeScalingTestSetup['group']
}): void => {
  group.setPositionByOrigin = jest.fn((
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
  }) as never
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
