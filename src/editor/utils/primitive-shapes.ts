import {
  Canvas,
  Circle,
  CircleProps,
  FabricObject,
  Rect,
  RectProps,
  Triangle
} from 'fabric'
import { nanoid } from 'nanoid'
import { snapObjectToPixelGrid } from './geometry'

type PrimitiveShapeFlags = {
  withoutSelection?: boolean
  withoutAdding?: boolean
}

/**
 * Центрирует, снапает и при необходимости добавляет примитивный объект на canvas.
 */
function finalizePrimitiveShape<T extends FabricObject>({
  canvas,
  object,
  left,
  top,
  flags
}: {
  canvas: Canvas
  object: T
  left?: number
  top?: number
  flags: PrimitiveShapeFlags
}): T {
  const {
    withoutSelection,
    withoutAdding
  } = flags

  if (!left && !top) {
    canvas.centerObject(object)
  }

  snapObjectToPixelGrid({ object })

  if (withoutAdding) return object

  canvas.add(object)

  if (!withoutSelection) {
    canvas.setActiveObject(object)
  }

  canvas.renderAll()
  return object
}

/**
 * Добавляет прямоугольник на canvas или возвращает созданный объект без добавления.
 */
export const addRectangleToCanvas = ({
  canvas,
  options = {},
  flags = {}
}: {
  canvas: Canvas
  options?: Partial<RectProps>
  flags?: PrimitiveShapeFlags
}): Rect => {
  const {
    id = `rect-${nanoid()}`,
    left,
    top,
    width = 100,
    height = 100,
    fill = 'blue',
    ...rest
  } = options
  const rect = new Rect({
    id,
    left,
    top,
    width,
    height,
    fill,
    ...rest
  })

  return finalizePrimitiveShape({
    canvas,
    object: rect,
    left,
    top,
    flags
  })
}

/**
 * Добавляет круг на canvas или возвращает созданный объект без добавления.
 */
export const addCircleToCanvas = ({
  canvas,
  options = {},
  flags = {}
}: {
  canvas: Canvas
  options?: Partial<CircleProps>
  flags?: PrimitiveShapeFlags
}): Circle => {
  const {
    id = `circle-${nanoid()}`,
    left,
    top,
    radius = 50,
    fill = 'green',
    ...rest
  } = options
  const circle = new Circle({
    id,
    left,
    top,
    fill,
    radius,
    ...rest
  })

  return finalizePrimitiveShape({
    canvas,
    object: circle,
    left,
    top,
    flags
  })
}

/**
 * Добавляет треугольник на canvas или возвращает созданный объект без добавления.
 */
export const addTriangleToCanvas = ({
  canvas,
  options = {},
  flags = {}
}: {
  canvas: Canvas
  options?: Partial<FabricObject>
  flags?: PrimitiveShapeFlags
}): Triangle => {
  const {
    id = `triangle-${nanoid()}`,
    left,
    top,
    width = 100,
    height = 100,
    fill = 'yellow',
    ...rest
  } = options
  const triangle = new Triangle({
    id,
    left,
    top,
    fill,
    width,
    height,
    ...rest
  })

  return finalizePrimitiveShape({
    canvas,
    object: triangle,
    left,
    top,
    flags
  })
}
