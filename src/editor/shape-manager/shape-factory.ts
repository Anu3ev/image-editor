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

/**
 * Применяет геометрию нужного размера к shape-объекту.
 */
export function resizeShapeNode({
  shape,
  width,
  height,
  rounding
}: {
  shape: ShapeNode
  width: number
  height: number
  rounding?: number
}): void {
  const safeWidth = Math.max(MIN_SIZE, width)
  const safeHeight = Math.max(MIN_SIZE, height)

  if (shape instanceof Rect) {
    const rounded = Math.max(0, rounding ?? 0)
    shape.set({
      width: safeWidth,
      height: safeHeight,
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
    scaleX: safeWidth / safeSourceWidth,
    scaleY: safeHeight / safeSourceHeight,
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
  const shape = await createShapeObjectByPreset({ preset })

  resizeShapeNode({
    shape,
    width,
    height,
    rounding
  })

  applyShapeStyle({
    shape,
    style
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
    strokeUniform: true
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
async function createShapeObjectByPreset({ preset }: { preset: ShapePreset }): Promise<ShapeNode> {
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

  if (preset.type === 'triangle') return new Triangle({
    width: 100,
    height: 100,
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0
  }) as ShapeNode

  if (preset.type === 'polygon') return createPolygonShape({
    points: preset.points,
    type: 'polygon'
  })

  if (preset.type === 'polyline') return createPolygonShape({
    points: preset.points,
    type: 'polyline'
  })

  if (preset.type === 'path') return new Path(preset.path, {
    originX: 'center',
    originY: 'center',
    left: 0,
    top: 0
  }) as ShapeNode

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
 * Создает Polygon/Polyline для пресета.
 */
function createPolygonShape({
  points,
  type
}: {
  points: ShapePoint[]
  type: 'polygon' | 'polyline'
}): ShapeNode {
  const hasPoints = points.length > 0
  const sourcePoints = hasPoints
    ? points
    : [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 }
    ]

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
