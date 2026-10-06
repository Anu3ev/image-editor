import { ActiveSelection, Point } from 'fabric'

type PlacementOriginX = 'left' | 'center' | 'right'
type PlacementOriginY = 'top' | 'center' | 'bottom'

type PlacementMatrix = [number, number, number, number, number, number]

type PlacementGroup = ActiveSelection & {
  calcOwnMatrix: jest.Mock<PlacementMatrix, []>
  calcTransformMatrix: jest.Mock<PlacementMatrix, []>
}

type PlacementPoint = {
  x: number
  y: number
  transform: (matrix: PlacementMatrix) => Point
}

export type PlacementTestObject = {
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
  customData?: object
  group?: PlacementGroup | null
  set: jest.Mock
  setCoords: jest.Mock
  setXY: jest.Mock
  setPositionByOrigin: jest.Mock
  getPointByOrigin: jest.Mock
  getBoundingRect: jest.Mock
  toDatalessObject: jest.Mock
}

/** Test image with controllable source dimensions and crop state. */
export type PlacementImageTestObject = PlacementTestObject & {
  cropX: number
  cropY: number
  getElement: jest.Mock
  getOriginalSize: jest.Mock<{ width: number, height: number }, []>
  hasCrop: jest.Mock<boolean, []>
}

/** Test image parameters with controllable position and source dimensions. */
type PlacementTestImageOptions = {
  id: string
  left: number
  top: number
  width: number
  height: number
  originX?: PlacementOriginX
  originY?: PlacementOriginY
  scaleX?: number
  scaleY?: number
  cropX?: number
  cropY?: number
  cropped?: boolean
  customData?: object
  intrinsicWidth: number
  intrinsicHeight: number
}

/**
 * Returns the object's effective dimensions, accounting for scale.
 */
const getScaledDimensions = ({ object }: { object: PlacementTestObject }) => ({
  width: object.width * object.scaleX,
  height: object.height * object.scaleY
})

/**
 * Returns the object's center from its saved placement using the current origin.
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
 * Recalculates the object's point for the specified origin in local coordinates.
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
 * Converts scene placement to the object's local coordinates using the specified origin.
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
 * Converts the object's local point to scene coordinates using the parent's matrix.
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
 * Returns the object's point in scene coordinates for the specified origin.
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
 * Creates an object that distinguishes between local and scene coordinates.
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
  const object: PlacementTestObject = {
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
    toDatalessObject: jest.fn((): Record<string, unknown> => ({
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
 * Creates a multi-object selection with a translation-only transform.
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
  const selection = new ActiveSelection(objects as never, {}) as PlacementGroup
  selection.calcOwnMatrix = jest.fn(() => [1, 0, 0, 1, offsetX, offsetY])
  selection.calcTransformMatrix = jest.fn(() => [1, 0, 0, 1, offsetX, offsetY])

  for (let index = 0; index < objects.length; index += 1) {
    objects[index].group = selection
  }

  return selection
}

/**
 * Creates an object from serialized template state.
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

/**
 * Creates an image element with the specified source dimensions.
 */
function createPlacementImageElement({
  width,
  height
}: {
  width: number
  height: number
}): HTMLImageElement {
  const element = document.createElement('img')

  Object.defineProperties(element, {
    naturalWidth: { configurable: true, get: () => width },
    naturalHeight: { configurable: true, get: () => height },
    width: { configurable: true, get: () => width },
    height: { configurable: true, get: () => height }
  })

  return element
}

/**
 * Creates a test image with controllable position and source dimensions.
 */
export const createPlacementTestImage = ({
  id,
  left,
  top,
  width,
  height,
  originX = 'left',
  originY = 'top',
  scaleX = 1,
  scaleY = 1,
  cropX = 0,
  cropY = 0,
  cropped = false,
  customData,
  intrinsicWidth,
  intrinsicHeight
}: PlacementTestImageOptions): PlacementImageTestObject => {
  const image = createPlacementTestObject({
    id,
    type: 'image',
    left,
    top,
    width,
    height,
    originX,
    originY,
    scaleX,
    scaleY
  }) as PlacementImageTestObject
  const element = createPlacementImageElement({
    width: intrinsicWidth,
    height: intrinsicHeight
  })
  const serializeBaseObject = image.toDatalessObject

  image.cropX = cropX
  image.cropY = cropY
  image.customData = customData
  image.getElement = jest.fn(() => element)
  image.getOriginalSize = jest.fn(() => ({
    width: intrinsicWidth,
    height: intrinsicHeight
  }))
  image.hasCrop = jest.fn(() => cropped)
  image.toDatalessObject = jest.fn(() => ({
    ...serializeBaseObject(),
    cropX: image.cropX,
    cropY: image.cropY
  }))

  return image
}
