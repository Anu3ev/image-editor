import { ActiveSelection, Point } from 'fabric'

type PlacementOriginX = 'left' | 'center' | 'right'
type PlacementOriginY = 'top' | 'center' | 'bottom'

type PlacementMatrix = [number, number, number, number, number, number]

type PlacementGroup = ActiveSelection & {
  calcTransformMatrix: jest.Mock<PlacementMatrix, []>
}

type PlacementPoint = {
  x: number
  y: number
  transform: (matrix: PlacementMatrix) => Point
}

type PlacementTestObject = {
  id: string
  type: string
  left: number
  top: number
  width: number
  height: number
  originX: PlacementOriginX
  originY: PlacementOriginY
  scaleX: number
  scaleY: number
  strokeWidth: number
  strokeUniform: boolean
  visible: boolean
  group?: PlacementGroup | null
  set: jest.Mock
  setCoords: jest.Mock
  setXY: jest.Mock
  setPositionByOrigin: jest.Mock
  getPointByOrigin: jest.Mock
  getBoundingRect: jest.Mock
  toDatalessObject: jest.Mock
}

/**
 * Возвращает эффективные размеры объекта с учётом scale.
 */
const getScaledDimensions = ({ object }: { object: PlacementTestObject }) => ({
  width: object.width * object.scaleX,
  height: object.height * object.scaleY
})

/**
 * Возвращает центр объекта из сохранённого placement по текущему origin.
 */
const resolveLocalCenterPoint = ({
  object
}: {
  object: PlacementTestObject
}) => {
  const { width, height } = getScaledDimensions({ object })
  let x = object.left
  let y = object.top

  if (object.originX === 'left') {
    x += width / 2
  } else if (object.originX === 'right') {
    x -= width / 2
  }

  if (object.originY === 'top') {
    y += height / 2
  } else if (object.originY === 'bottom') {
    y -= height / 2
  }

  return {
    x,
    y
  }
}

/**
 * Пересчитывает точку объекта для заданного origin в локальной системе координат.
 */
const resolveLocalPointByOrigin = ({
  object,
  originX,
  originY
}: {
  object: PlacementTestObject
  originX: PlacementOriginX
  originY: PlacementOriginY
}) => {
  const { width, height } = getScaledDimensions({ object })
  const center = resolveLocalCenterPoint({ object })
  let x = center.x
  let y = center.y

  if (originX === 'left') {
    x -= width / 2
  } else if (originX === 'right') {
    x += width / 2
  }

  if (originY === 'top') {
    y -= height / 2
  } else if (originY === 'bottom') {
    y += height / 2
  }

  return {
    x,
    y
  }
}

/**
 * Преобразует scene placement в локальные координаты объекта по заданному origin.
 */
const applyPointByOrigin = ({
  object,
  point,
  originX,
  originY
}: {
  object: PlacementTestObject
  point: { x: number; y: number }
  originX: PlacementOriginX
  originY: PlacementOriginY
}) => {
  object.left = point.x
  object.top = point.y
  object.originX = originX
  object.originY = originY
}

/**
 * Переводит локальную точку объекта в scene coordinates через matrix родителя.
 */
const createTransformablePoint = ({
  x,
  y
}: {
  x: number
  y: number
}): PlacementPoint => ({
  x,
  y,
  transform: (matrix: PlacementMatrix) => {
    const offsetX = matrix[4] ?? 0
    const offsetY = matrix[5] ?? 0

    return new Point(x + offsetX, y + offsetY)
  }
})

/**
 * Возвращает point объекта в scene coordinates для заданного origin.
 */
export const getScenePointByOrigin = ({
  object,
  originX = object.originX,
  originY = object.originY
}: {
  object: PlacementTestObject
  originX?: PlacementOriginX
  originY?: PlacementOriginY
}): Point => {
  const localPoint = object.getPointByOrigin(originX, originY) as PlacementPoint

  if (!object.group) {
    return new Point(localPoint.x, localPoint.y)
  }

  return localPoint.transform(object.group.calcTransformMatrix())
}

/**
 * Создаёт объект, который различает local и scene coordinates.
 */
export const createPlacementTestObject = ({
  id,
  type = 'rect',
  left,
  top,
  width,
  height,
  originX = 'left',
  originY = 'top',
  scaleX = 1,
  scaleY = 1,
  strokeWidth = 0,
  strokeUniform = true
}: {
  id: string
  type?: string
  left: number
  top: number
  width: number
  height: number
  originX?: PlacementOriginX
  originY?: PlacementOriginY
  scaleX?: number
  scaleY?: number
  strokeWidth?: number
  strokeUniform?: boolean
}): PlacementTestObject => {
  const object = {
    id,
    type,
    left,
    top,
    width,
    height,
    originX,
    originY,
    scaleX,
    scaleY,
    strokeWidth,
    strokeUniform,
    visible: true,
    group: null,
    set: jest.fn((updates: Record<string, unknown>) => {
      Object.assign(object, updates)
    }),
    setCoords: jest.fn(),
    setXY: jest.fn((point: Point, nextOriginX: PlacementOriginX, nextOriginY: PlacementOriginY) => {
      const nextPoint = object.group
        ? {
          x: point.x - object.group.calcTransformMatrix()[4],
          y: point.y - object.group.calcTransformMatrix()[5]
        }
        : point

      applyPointByOrigin({
        object,
        point: nextPoint,
        originX: nextOriginX,
        originY: nextOriginY
      })
    }),
    setPositionByOrigin: jest.fn((point: Point, nextOriginX: PlacementOriginX, nextOriginY: PlacementOriginY) => {
      applyPointByOrigin({
        object,
        point,
        originX: nextOriginX,
        originY: nextOriginY
      })
    }),
    getPointByOrigin: jest.fn((nextOriginX: PlacementOriginX, nextOriginY: PlacementOriginY) => {
      const localPoint = resolveLocalPointByOrigin({
        object,
        originX: nextOriginX,
        originY: nextOriginY
      })

      return createTransformablePoint(localPoint)
    }),
    getBoundingRect: jest.fn(() => {
      const scenePoint = getScenePointByOrigin({
        object,
        originX: 'left',
        originY: 'top'
      })
      const { width: scaledWidth, height: scaledHeight } = getScaledDimensions({ object })

      return {
        left: scenePoint.x,
        top: scenePoint.y,
        width: scaledWidth,
        height: scaledHeight
      }
    }),
    toDatalessObject: jest.fn(() => ({
      id: object.id,
      type: object.type,
      left: object.left,
      top: object.top,
      width: object.width,
      height: object.height,
      originX: object.originX,
      originY: object.originY,
      scaleX: object.scaleX,
      scaleY: object.scaleY,
      strokeWidth: object.strokeWidth,
      strokeUniform: object.strokeUniform
    }))
  }

  return object
}

/**
 * Создаёт выделение из нескольких объектов с translation-only transform.
 */
export const createPlacementSelection = ({
  objects,
  offsetX,
  offsetY
}: {
  objects: PlacementTestObject[]
  offsetX: number
  offsetY: number
}): PlacementGroup => {
  const selection = new ActiveSelection(objects, {}) as PlacementGroup
  selection.calcTransformMatrix = jest.fn(() => [1, 0, 0, 1, offsetX, offsetY])

  for (let index = 0; index < objects.length; index += 1) {
    objects[index].group = selection
  }

  return selection
}

/**
 * Восстанавливает placement-aware объект из сериализованного шаблонного состояния.
 */
export const createRevivedTemplateObject = ({
  serialized
}: {
  serialized: Record<string, unknown>
}): PlacementTestObject => {
  return createPlacementTestObject({
    id: typeof serialized.id === 'string' ? serialized.id : 'revived-object',
    type: typeof serialized.type === 'string' ? serialized.type : 'rect',
    left: typeof serialized.left === 'number' ? serialized.left : 0,
    top: typeof serialized.top === 'number' ? serialized.top : 0,
    width: typeof serialized.width === 'number' ? serialized.width : 1,
    height: typeof serialized.height === 'number' ? serialized.height : 1,
    originX: (serialized.originX as PlacementOriginX | undefined) ?? 'left',
    originY: (serialized.originY as PlacementOriginY | undefined) ?? 'top',
    scaleX: typeof serialized.scaleX === 'number' ? serialized.scaleX : 1,
    scaleY: typeof serialized.scaleY === 'number' ? serialized.scaleY : 1,
    strokeWidth: typeof serialized.strokeWidth === 'number' ? serialized.strokeWidth : 0,
    strokeUniform: typeof serialized.strokeUniform === 'boolean' ? serialized.strokeUniform : true
  })
}
