import {
  Ellipse,
  FabricObject,
  Group,
  Path,
  Polygon,
  Polyline,
  Rect,
  Triangle,
  loadSVGFromString,
  util
} from 'fabric'
import { nanoid } from 'nanoid'
import {
  ShapeFactoryInput,
  ShapeNode,
  ShapePoint,
  ShapePreset,
  ShapeVisualStyle
} from '../types'
import {
  normalizeShapeRounding,
  resolveShapeRoundingRatio
} from '../domain/shape-rounding'

/**
 * Минимальный размер shape-узла, который можно безопасно передать в Fabric.
 */
const MIN_SIZE = 1

/**
 * Минимальная длина ребра для построения rounded path без вырожденной геометрии.
 */
const MIN_EDGE_LENGTH = 0.0001

/**
 * Размер shape в пикселях.
 */
type ShapeSize = {
  width: number
  height: number
}

/**
 * Аргументы ресайза уже созданного shape-узла.
 */
type ResizeShapeNodeParams = ShapeSize & {
  shape: ShapeNode
  rounding?: number
  strokeWidth?: number
}

/**
 * Аргументы расчета внутреннего размера shape с учетом stroke.
 */
type ResolveInnerShapeSizeParams = ShapeSize & {
  strokeWidth?: number
}

/**
 * Аргументы создания shape-узла из пресета.
 */
type CreateShapeObjectByPresetParams = {
  preset: ShapePreset
  rounding?: number
}

/**
 * Общие аргументы для shape, которые могут использовать скругление.
 */
type CreateRoundedPathParams = {
  rounding?: number
}

/**
 * Аргументы создания path-shape из path-строки.
 */
type CreatePathShapeParams = {
  path: string
  rounding?: number
}

/**
 * Аргументы создания polygon/polyline-shape.
 */
type CreatePolygonShapeParams = {
  points: ShapePoint[]
  type: 'polygon' | 'polyline'
  rounding?: number
}

/**
 * Аргументы построения rounded path из линейного path.
 */
type CreateRoundedPathFromLinearPathParams = {
  path: string
  rounding: number
}

/**
 * Аргументы создания закругленного path по списку точек.
 */
type CreateRoundedPolygonPathShapeParams = {
  points: ShapePoint[]
  rounding: number
  closed: boolean
}

/**
 * Аргументы построения path-строки с закругленными вершинами.
 */
type BuildRoundedPathFromPointsParams = {
  points: ShapePoint[]
  roundingRatio: number
  closed: boolean
}

/**
 * Аргументы построения линейной path-строки без скруглений.
 */
type BuildLinearPathFromPointsParams = {
  points: ShapePoint[]
  closed: boolean
}

/**
 * Точки входа и выхода дуги скругления для одной вершины.
 */
type RoundedCornerPoints = {
  start: ShapePoint
  end: ShapePoint
}

/**
 * Аргументы расчета точек скругления для одной вершины.
 */
type ResolveRoundedCornerPointsParams = {
  previous: ShapePoint
  current: ShapePoint
  next: ShapePoint
  roundingRatio: number
}

/**
 * Аргументы создания shape из SVG-строки.
 */
type CreateShapeFromSvgParams = {
  svg: string
}

/**
 * Fabric-свойства, которые shape factory применяет к обычному shape-узлу.
 */
interface ShapeStyleNodeUpdates {
  strokeUniform: boolean
  strokeLineCap: 'round'
  strokeLineJoin: 'round'
  fill?: ShapeVisualStyle['fill']
  stroke?: ShapeVisualStyle['stroke']
  strokeWidth?: ShapeVisualStyle['strokeWidth']
  strokeDashArray?: ShapeVisualStyle['strokeDashArray']
  opacity?: ShapeVisualStyle['opacity']
}

/**
 * Нормализует число для стабильного path-представления.
 */
function normalizeNumber({ value }: { value: number }): number {
  return Number(value.toFixed(4))
}

/**
 * Проверяет, нужно ли строить rounded-path для фигуры.
 */
function shouldUseRoundedPath({ rounding }: CreateRoundedPathParams): boolean {
  return normalizeShapeRounding({ rounding }) > 0
}

/**
 * Возвращает внутренний размер фигуры с учетом толщины stroke.
 */
function resolveInnerShapeSize({
  width,
  height,
  strokeWidth
}: ResolveInnerShapeSizeParams): ShapeSize {
  const safeStrokeWidth = Math.max(0, strokeWidth ?? 0)
  const innerWidth = Math.max(MIN_SIZE, width - safeStrokeWidth)
  const innerHeight = Math.max(MIN_SIZE, height - safeStrokeWidth)

  return {
    width: innerWidth,
    height: innerHeight
  }
}

/**
 * Применяет геометрию нужного размера к shape-объекту.
 */
export function resizeShapeNode({
  shape,
  width,
  height,
  rounding,
  strokeWidth
}: ResizeShapeNodeParams): void {
  const safeWidth = Math.max(MIN_SIZE, width)
  const safeHeight = Math.max(MIN_SIZE, height)
  const innerSize = resolveInnerShapeSize({
    width: safeWidth,
    height: safeHeight,
    strokeWidth
  })

  if (shape instanceof Rect) {
    const rounded = Math.min(innerSize.width / 2, innerSize.height / 2)
      * resolveShapeRoundingRatio({ rounding })

    shape.set({
      width: innerSize.width,
      height: innerSize.height,
      rx: rounded,
      ry: rounded,
      scaleX: 1,
      scaleY: 1,
      left: 0,
      top: 0,
      originX: 'center',
      originY: 'center'
    })
    shape.setCoords()
    return
  }

  const {
    width: sourceWidth = MIN_SIZE,
    height: sourceHeight = MIN_SIZE
  } = shape
  const safeSourceWidth = Math.max(MIN_SIZE, sourceWidth)
  const safeSourceHeight = Math.max(MIN_SIZE, sourceHeight)

  shape.set({
    scaleX: innerSize.width / safeSourceWidth,
    scaleY: innerSize.height / safeSourceHeight,
    left: 0,
    top: 0,
    originX: 'center',
    originY: 'center'
  })
  shape.setCoords()
}

/**
 * Применяет визуальный стиль к одному shape-узлу без обхода вложенных групп.
 */
function applyShapeStyleToNode({
  shape,
  style
}: {
  shape: ShapeNode
  style: ShapeVisualStyle
}): void {
  const {
    fill,
    stroke,
    strokeWidth,
    strokeDashArray,
    opacity
  } = style

  const updates: ShapeStyleNodeUpdates = {
    strokeUniform: true,
    strokeLineCap: 'round',
    strokeLineJoin: 'round'
  }

  if (fill !== undefined) {
    updates.fill = fill
  }

  if (stroke !== undefined) {
    updates.stroke = stroke
  }

  if (strokeWidth !== undefined) {
    updates.strokeWidth = strokeWidth
  }

  if (strokeDashArray !== undefined) {
    updates.strokeDashArray = strokeDashArray
  }

  if (opacity !== undefined) {
    updates.opacity = opacity
  }

  shape.set(updates)
  shape.setCoords()
}

/**
 * Применяет fill/stroke/opacity к фигуре, включая SVG-группы.
 */
export function applyShapeStyle({
  shape,
  style
}: {
  shape: ShapeNode
  style: ShapeVisualStyle
}): void {
  const nodes = [shape]

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]

    if (node instanceof Group) {
      const objects = node.getObjects() as ShapeNode[]

      for (let objectIndex = 0; objectIndex < objects.length; objectIndex += 1) {
        nodes.push(objects[objectIndex])
      }

      if (style.opacity !== undefined) {
        node.set({ opacity: style.opacity })
      }

      node.setCoords()
      continue
    }

    applyShapeStyleToNode({
      shape: node,
      style
    })
  }
}

/**
 * Строит линейный path из точек без закруглений.
 */
function buildLinearPathFromPoints({
  points,
  closed
}: BuildLinearPathFromPointsParams): string {
  if (points.length === 0) return ''

  let pathData = `M ${normalizeNumber({ value: points[0].x })} ${normalizeNumber({ value: points[0].y })}`

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index]
    pathData += ` L ${normalizeNumber({ value: point.x })} ${normalizeNumber({ value: point.y })}`
  }

  if (closed) {
    pathData += ' Z'
  }

  return pathData
}

/**
 * Вычисляет начальную и конечную точки дуги скругления для одной вершины.
 */
function resolveRoundedCornerPoints({
  previous,
  current,
  next,
  roundingRatio
}: ResolveRoundedCornerPointsParams): RoundedCornerPoints {
  const vectorToPrevious = {
    x: previous.x - current.x,
    y: previous.y - current.y
  }
  const vectorToNext = {
    x: next.x - current.x,
    y: next.y - current.y
  }
  const previousLength = Math.hypot(vectorToPrevious.x, vectorToPrevious.y)
  const nextLength = Math.hypot(vectorToNext.x, vectorToNext.y)

  if (previousLength <= MIN_EDGE_LENGTH || nextLength <= MIN_EDGE_LENGTH) {
    return {
      start: {
        x: normalizeNumber({ value: current.x }),
        y: normalizeNumber({ value: current.y })
      },
      end: {
        x: normalizeNumber({ value: current.x }),
        y: normalizeNumber({ value: current.y })
      }
    }
  }

  const maxCornerRadius = Math.min(previousLength / 2, nextLength / 2)
  const cornerRadius = maxCornerRadius * roundingRatio

  const start = {
    x: normalizeNumber({
      value: current.x + (vectorToPrevious.x / previousLength) * cornerRadius
    }),
    y: normalizeNumber({
      value: current.y + (vectorToPrevious.y / previousLength) * cornerRadius
    })
  }
  const end = {
    x: normalizeNumber({
      value: current.x + (vectorToNext.x / nextLength) * cornerRadius
    }),
    y: normalizeNumber({
      value: current.y + (vectorToNext.y / nextLength) * cornerRadius
    })
  }

  return {
    start,
    end
  }
}

/**
 * Строит path-строку с закругленными вершинами из точек.
 */
function buildRoundedPathFromPoints({
  points,
  roundingRatio,
  closed
}: BuildRoundedPathFromPointsParams): string {
  const total = points.length
  if (total === 0) return ''

  if (!closed && total === 1) {
    const point = points[0]

    return `M ${normalizeNumber({ value: point.x })} ${normalizeNumber({ value: point.y })}`
  }

  if (roundingRatio <= 0) {
    return buildLinearPathFromPoints({
      points,
      closed
    })
  }

  if (closed) {
    const corners: RoundedCornerPoints[] = []

    for (let index = 0; index < total; index += 1) {
      const previousIndex = index === 0 ? total - 1 : index - 1
      const nextIndex = index === total - 1 ? 0 : index + 1

      corners.push(resolveRoundedCornerPoints({
        previous: points[previousIndex],
        current: points[index],
        next: points[nextIndex],
        roundingRatio
      }))
    }

    const firstCorner = corners[0]
    let pathData = `M ${firstCorner.start.x} ${firstCorner.start.y}`

    for (let index = 0; index < total; index += 1) {
      const current = points[index]
      const corner = corners[index]
      const nextCornerIndex = index === total - 1 ? 0 : index + 1
      const nextCorner = corners[nextCornerIndex]

      pathData += ` Q ${current.x} ${current.y} ${corner.end.x} ${corner.end.y}`
      pathData += ` L ${nextCorner.start.x} ${nextCorner.start.y}`
    }

    pathData += ' Z'
    return pathData
  }

  if (total === 2) {
    return buildLinearPathFromPoints({
      points,
      closed: false
    })
  }

  let pathData = `M ${normalizeNumber({ value: points[0].x })} ${normalizeNumber({ value: points[0].y })}`

  for (let index = 1; index < total - 1; index += 1) {
    const corner = resolveRoundedCornerPoints({
      previous: points[index - 1],
      current: points[index],
      next: points[index + 1],
      roundingRatio
    })

    pathData += ` L ${corner.start.x} ${corner.start.y}`
    pathData += ` Q ${points[index].x} ${points[index].y} ${corner.end.x} ${corner.end.y}`
  }

  const lastPoint = points[total - 1]
  pathData += ` L ${normalizeNumber({ value: lastPoint.x })} ${normalizeNumber({ value: lastPoint.y })}`

  return pathData
}

/**
 * Создает Path с закругленными углами по списку точек.
 */
function createRoundedPolygonPathShape({
  points,
  rounding,
  closed
}: CreateRoundedPolygonPathShapeParams): ShapeNode {
  const pathData = buildRoundedPathFromPoints({
    points,
    roundingRatio: resolveShapeRoundingRatio({ rounding }),
    closed
  })

  return new Path(pathData, {
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0
  }) as ShapeNode
}

/**
 * Создает Triangle или rounded-path вариант Triangle.
 */
function createTriangleShape({
  rounding
}: CreateRoundedPathParams): ShapeNode {
  if (!shouldUseRoundedPath({ rounding })) {
    return new Triangle({
      width: 100,
      height: 100,
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0
    }) as ShapeNode
  }

  const normalizedRounding = normalizeShapeRounding({ rounding })

  return createRoundedPolygonPathShape({
    points: [
      { x: 50, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ],
    rounding: normalizedRounding,
    closed: true
  })
}

/**
 * Создает базовый Path без модификации сегментов.
 */
function createBasePathShape({
  path
}: {
  path: string
}): ShapeNode {
  return new Path(path, {
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0
  }) as ShapeNode
}

/**
 * Пытается построить rounded-path из линейного Path (M/L/Z).
 */
function createRoundedPathFromLinearPath({
  path,
  rounding
}: CreateRoundedPathFromLinearPathParams): ShapeNode | null {
  const sourcePath = createBasePathShape({ path }) as Path
  const rawPath = sourcePath.path ?? []
  const simplifiedPath = util.makePathSimpler(rawPath)
  const points: ShapePoint[] = []
  let isClosed = false

  for (let index = 0; index < simplifiedPath.length; index += 1) {
    const command = simplifiedPath[index]
    if (!command) return null

    const commandTypeRaw = command[0]
    const commandType = typeof commandTypeRaw === 'string'
      ? commandTypeRaw.toUpperCase()
      : ''

    if (commandType === 'M' || commandType === 'L') {
      const x = Number(command[1])
      const y = Number(command[2])
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null
      }

      points.push({
        x,
        y
      })
      continue
    }

    if (commandType === 'Z') {
      isClosed = true
      continue
    }

    return null
  }

  if (points.length < 2) return null
  if (isClosed && points.length < 3) return null

  return createRoundedPolygonPathShape({
    points,
    rounding,
    closed: isClosed
  })
}

/**
 * Создает Path фигуру и пытается применить скругление для линейных контуров.
 */
function createPathShape({
  path,
  rounding
}: CreatePathShapeParams): ShapeNode {
  if (!shouldUseRoundedPath({ rounding })) {
    return createBasePathShape({ path })
  }

  const roundedPath = createRoundedPathFromLinearPath({
    path,
    rounding: normalizeShapeRounding({ rounding })
  })
  if (roundedPath) return roundedPath

  return createBasePathShape({ path })
}

/**
 * Создает Polygon/Polyline для пресета.
 */
function createPolygonShape({
  points,
  type,
  rounding
}: CreatePolygonShapeParams): ShapeNode {
  const sourcePoints = points.length > 0
    ? points
    : [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 }
    ]
  const normalizedRounding = normalizeShapeRounding({ rounding })

  if (normalizedRounding > 0) {
    if (type === 'polygon' && sourcePoints.length >= 3) {
      return createRoundedPolygonPathShape({
        points: sourcePoints,
        rounding: normalizedRounding,
        closed: true
      })
    }

    if (type === 'polyline' && sourcePoints.length >= 2) {
      return createRoundedPolygonPathShape({
        points: sourcePoints,
        rounding: normalizedRounding,
        closed: false
      })
    }
  }

  const ShapeClass = type === 'polyline' ? Polyline : Polygon

  return new ShapeClass(sourcePoints, {
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0
  }) as ShapeNode
}

/**
 * Создает shape из SVG-строки.
 */
async function createShapeFromSvg({
  svg
}: CreateShapeFromSvgParams): Promise<ShapeNode> {
  const svgData = await loadSVGFromString(svg)
  const grouped = util.groupSVGElements(
    svgData.objects as FabricObject[],
    svgData.options
  ) as ShapeNode

  grouped.set({
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0
  })
  grouped.setCoords()

  return grouped
}

/**
 * Создает базовый shape-object на основе типа пресета.
 */
async function createShapeObjectByPreset({
  preset,
  rounding
}: CreateShapeObjectByPresetParams): Promise<ShapeNode> {
  switch (preset.type) {
  case 'rect':
    return new Rect({
      width: 100,
      height: 100,
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0
    }) as ShapeNode
  case 'ellipse':
    return new Ellipse({
      rx: 50,
      ry: 50,
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0
    }) as ShapeNode
  case 'triangle':
    return createTriangleShape({ rounding })
  case 'polygon':
    return createPolygonShape({
      points: preset.points,
      type: 'polygon',
      rounding
    })
  case 'polyline':
    return createPolygonShape({
      points: preset.points,
      type: 'polyline',
      rounding
    })
  case 'path':
    return createPathShape({
      path: preset.path,
      rounding
    })
  case 'svg':
    return createShapeFromSvg({ svg: preset.svg })
  default:
    return new Rect({
      width: 100,
      height: 100,
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0
    }) as ShapeNode
  }
}

/**
 * Создает объект фигуры из пресета, назначает ему id и применяет стили.
 */
export async function createShapeNode({
  preset,
  width,
  height,
  style,
  rounding
}: ShapeFactoryInput): Promise<ShapeNode> {
  const shape = await createShapeObjectByPreset({
    preset,
    rounding
  })

  applyShapeStyle({
    shape,
    style
  })

  resizeShapeNode({
    shape,
    width,
    height,
    rounding,
    strokeWidth: style.strokeWidth
  })

  shape.set({
    id: `${shape.type}-${nanoid()}`,
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    shapeNodeType: 'shape'
  })

  return shape
}
