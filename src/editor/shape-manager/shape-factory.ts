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
import {
  ShapeFactoryInput,
  ShapeNode,
  ShapePoint,
  ShapePreset,
  ShapeVisualStyle
} from './types'

const MIN_SIZE = 1
const MIN_EDGE_LENGTH = 0.0001

/**
 * Применяет геометрию нужного размера к shape-объекту.
 */
export function resizeShapeNode({
  shape,
  width,
  height,
  rounding,
  strokeWidth
}: {
  shape: ShapeNode
  width: number
  height: number
  rounding?: number
  strokeWidth?: number
}): void {
  const safeWidth = Math.max(MIN_SIZE, width)
  const safeHeight = Math.max(MIN_SIZE, height)
  const innerSize = resolveInnerShapeSize({
    width: safeWidth,
    height: safeHeight,
    strokeWidth
  })

  if (shape instanceof Rect) {
    const rounded = Math.max(0, rounding ?? 0)
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
 * Создает объект фигуры из пресета и применяет к нему стили.
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
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    shapeNodeType: 'shape'
  })

  return shape
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
  const {
    fill,
    stroke,
    strokeWidth,
    strokeDashArray,
    opacity
  } = style

  if (shape instanceof Group) {
    const objects = shape.getObjects() as ShapeNode[]

    for (let index = 0; index < objects.length; index += 1) {
      applyShapeStyle({
        shape: objects[index],
        style
      })
    }

    if (opacity !== undefined) {
      shape.set({ opacity })
    }

    shape.setCoords()
    return
  }

  const updates: Partial<FabricObject> & {
    strokeDashArray?: number[] | null
  } = {
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
 * Создает базовый shape-object на основе типа пресета.
 */
async function createShapeObjectByPreset({
  preset,
  rounding
}: {
  preset: ShapePreset
  rounding?: number
}): Promise<ShapeNode> {
  if (preset.type === 'rect') return new Rect({
    width: 100,
    height: 100,
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0
  }) as ShapeNode

  if (preset.type === 'ellipse') return new Ellipse({
    rx: 50,
    ry: 50,
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0
  }) as ShapeNode

  if (preset.type === 'triangle') return createTriangleShape({
    rounding
  })

  if (preset.type === 'polygon') return createPolygonShape({
    points: preset.points,
    type: 'polygon',
    rounding
  })

  if (preset.type === 'polyline') return createPolygonShape({
    points: preset.points,
    type: 'polyline',
    rounding
  })

  if (preset.type === 'path') return createPathShape({
    path: preset.path,
    rounding
  })

  if (preset.type === 'svg') return createShapeFromSvg({ svg: preset.svg })

  return new Rect({
    width: 100,
    height: 100,
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0
  }) as ShapeNode
}

/**
 * Возвращает внутренний размер фигуры с учетом толщины stroke.
 */
function resolveInnerShapeSize({
  width,
  height,
  strokeWidth
}: {
  width: number
  height: number
  strokeWidth?: number
}): {
  width: number
  height: number
} {
  const safeStrokeWidth = Math.max(0, strokeWidth ?? 0)
  const innerWidth = Math.max(MIN_SIZE, width - safeStrokeWidth)
  const innerHeight = Math.max(MIN_SIZE, height - safeStrokeWidth)

  return {
    width: innerWidth,
    height: innerHeight
  }
}

/**
 * Создает Triangle или rounded-path вариант Triangle.
 */
function createTriangleShape({
  rounding
}: {
  rounding?: number
}): ShapeNode {
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

  return createRoundedPolygonPathShape({
    points: [
      { x: 50, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ],
    rounding: Math.max(0, rounding ?? 0),
    closed: true
  })
}

/**
 * Создает Path фигуру и пытается применить скругление для линейных контуров.
 */
function createPathShape({
  path,
  rounding
}: {
  path: string
  rounding?: number
}): ShapeNode {
  if (!shouldUseRoundedPath({ rounding })) {
    return createBasePathShape({ path })
  }

  const roundedPath = createRoundedPathFromLinearPath({
    path,
    rounding: Math.max(0, rounding ?? 0)
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
}: {
  points: ShapePoint[]
  type: 'polygon' | 'polyline'
  rounding?: number
}): ShapeNode {
  const hasPoints = points.length > 0
  const sourcePoints = hasPoints
    ? points
    : [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 }
    ]

  const shouldCreateRoundedPath = shouldUseRoundedPath({
    rounding
  })

  if (shouldCreateRoundedPath) {
    if (type === 'polygon' && sourcePoints.length >= 3) {
      return createRoundedPolygonPathShape({
        points: sourcePoints,
        rounding: Math.max(0, rounding ?? 0),
        closed: true
      })
    }

    if (type === 'polyline' && sourcePoints.length >= 2) {
      return createRoundedPolygonPathShape({
        points: sourcePoints,
        rounding: Math.max(0, rounding ?? 0),
        closed: false
      })
    }
  }

  if (type === 'polyline') {
    return new Polyline(sourcePoints, {
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0
    }) as ShapeNode
  }

  return new Polygon(sourcePoints, {
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0
  }) as ShapeNode
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
}: {
  path: string
  rounding: number
}): ShapeNode | null {
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
 * Создает Path с закругленными углами по списку точек.
 */
function createRoundedPolygonPathShape({
  points,
  rounding,
  closed
}: {
  points: ShapePoint[]
  rounding: number
  closed: boolean
}): ShapeNode {
  const pathData = buildRoundedPathFromPoints({
    points,
    radius: rounding,
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
 * Строит path-строку с закругленными вершинами из точек.
 */
function buildRoundedPathFromPoints({
  points,
  radius,
  closed
}: {
  points: ShapePoint[]
  radius: number
  closed: boolean
}): string {
  const total = points.length
  if (total === 0) return ''

  if (!closed && total === 1) {
    const point = points[0]
    return `M ${normalizeNumber({ value: point.x })} ${normalizeNumber({ value: point.y })}`
  }

  const safeRadius = Math.max(0, radius)
  if (safeRadius <= 0) {
    return buildLinearPathFromPoints({
      points,
      closed
    })
  }

  if (closed) {
    const corners: Array<{
      start: ShapePoint
      end: ShapePoint
    }> = []

    for (let index = 0; index < total; index += 1) {
      const previousIndex = index === 0 ? total - 1 : index - 1
      const nextIndex = index === total - 1 ? 0 : index + 1
      const corner = resolveRoundedCornerPoints({
        previous: points[previousIndex],
        current: points[index],
        next: points[nextIndex],
        radius: safeRadius
      })
      corners.push(corner)
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
      radius: safeRadius
    })

    pathData += ` L ${corner.start.x} ${corner.start.y}`
    pathData += ` Q ${points[index].x} ${points[index].y} ${corner.end.x} ${corner.end.y}`
  }

  const lastPoint = points[total - 1]
  pathData += ` L ${normalizeNumber({ value: lastPoint.x })} ${normalizeNumber({ value: lastPoint.y })}`

  return pathData
}

/**
 * Строит линейный path из точек без закруглений.
 */
function buildLinearPathFromPoints({
  points,
  closed
}: {
  points: ShapePoint[]
  closed: boolean
}): string {
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
  radius
}: {
  previous: ShapePoint
  current: ShapePoint
  next: ShapePoint
  radius: number
}): {
  start: ShapePoint
  end: ShapePoint
} {
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

  const cornerRadius = Math.min(
    Math.max(0, radius),
    previousLength / 2,
    nextLength / 2
  )

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
 * Проверяет, нужно ли строить rounded-path для фигуры.
 */
function shouldUseRoundedPath({ rounding }: { rounding?: number }): boolean {
  return Math.max(0, rounding ?? 0) > 0
}

/**
 * Нормализует число для стабильного path-представления.
 */
function normalizeNumber({ value }: { value: number }): number {
  return Number(value.toFixed(4))
}

/**
 * Создает shape из SVG-строки.
 */
async function createShapeFromSvg({ svg }: { svg: string }): Promise<ShapeNode> {
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
