import {
  ShapePadding,
  ShapePoint,
  ShapePreset,
  ShapeVerticalAlign,
  ShapeHorizontalAlign
} from './types'

const DEFAULT_SHAPE_SIZE = 180

const DEFAULT_SHAPE_PADDING: ShapePadding = {
  top: 0.2,
  right: 0.2,
  bottom: 0.2,
  left: 0.2
}

/**
 * Нормализует число до 4 знаков после запятой для стабильной сериализации.
 */
const normalizeNumber = ({ value }: { value: number }): number => Number(value.toFixed(4))

/**
 * Создает точки правильного многоугольника в системе координат 0..100.
 */
const createRegularPolygonPoints = ({
  sides,
  radius = 50,
  centerX = 50,
  centerY = 50,
  rotation = -Math.PI / 2
}: {
  sides: number
  radius?: number
  centerX?: number
  centerY?: number
  rotation?: number
}): ShapePoint[] => {
  const points: ShapePoint[] = []

  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + (index * Math.PI * 2) / sides
    points.push({
      x: normalizeNumber({ value: centerX + radius * Math.cos(angle) }),
      y: normalizeNumber({ value: centerY + radius * Math.sin(angle) })
    })
  }

  return points
}

/**
 * Создает точки звезды в системе координат 0..100.
 */
const createStarPoints = ({
  spikes,
  outerRadius = 50,
  innerRadius = 22,
  centerX = 50,
  centerY = 50,
  rotation = -Math.PI / 2
}: {
  spikes: number
  outerRadius?: number
  innerRadius?: number
  centerX?: number
  centerY?: number
  rotation?: number
}): ShapePoint[] => {
  const points: ShapePoint[] = []
  const totalPoints = spikes * 2

  for (let index = 0; index < totalPoints; index += 1) {
    const isOuter = index % 2 === 0
    const radius = isOuter ? outerRadius : innerRadius
    const angle = rotation + (index * Math.PI) / spikes

    points.push({
      x: normalizeNumber({ value: centerX + radius * Math.cos(angle) }),
      y: normalizeNumber({ value: centerY + radius * Math.sin(angle) })
    })
  }

  return points
}

const shapePresetsList: ShapePreset[] = [
  {
    key: 'circle',
    type: 'ellipse',
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    textPadding: {
      top: 0.24,
      right: 0.24,
      bottom: 0.24,
      left: 0.24
    }
  },
  {
    key: 'triangle',
    type: 'triangle',
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    textPadding: {
      top: 0.38,
      right: 0.2,
      bottom: 0.14,
      left: 0.2
    }
  },
  {
    key: 'square',
    type: 'rect',
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE
  },
  {
    key: 'diamond',
    type: 'polygon',
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    points: [
      { x: 50, y: 0 },
      { x: 100, y: 50 },
      { x: 50, y: 100 },
      { x: 0, y: 50 }
    ],
    textPadding: {
      top: 0.3,
      right: 0.3,
      bottom: 0.3,
      left: 0.3
    }
  },
  {
    key: 'pentagon',
    type: 'polygon',
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    points: createRegularPolygonPoints({
      sides: 5,
      radius: 50,
      rotation: -Math.PI / 2
    }),
    textPadding: {
      top: 0.28,
      right: 0.2,
      bottom: 0.2,
      left: 0.2
    }
  },
  {
    key: 'hexagon',
    type: 'polygon',
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    points: createRegularPolygonPoints({
      sides: 6,
      radius: 50,
      rotation: 0
    }),
    textPadding: {
      top: 0.24,
      right: 0.2,
      bottom: 0.24,
      left: 0.2
    }
  },
  {
    key: 'star',
    type: 'polygon',
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    points: createStarPoints({
      spikes: 5,
      outerRadius: 50,
      innerRadius: 21,
      rotation: -Math.PI / 2
    }),
    textPadding: {
      top: 0.32,
      right: 0.32,
      bottom: 0.32,
      left: 0.32
    }
  },
  {
    key: 'sparkle',
    type: 'polygon',
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    points: createStarPoints({
      spikes: 4,
      outerRadius: 50,
      innerRadius: 16,
      rotation: -Math.PI / 2
    }),
    textPadding: {
      top: 0.34,
      right: 0.34,
      bottom: 0.34,
      left: 0.34
    }
  },
  {
    key: 'heart',
    type: 'path',
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    path: [
      'M50 92 C20 74 4 56 4 35',
      'C4 19 16 8 30 8 C40 8 47 12 50 18',
      'C53 12 60 8 70 8 C84 8 96 19 96 35',
      'C96 56 80 74 50 92 Z'
    ].join(' '),
    textPadding: {
      top: 0.3,
      right: 0.28,
      bottom: 0.22,
      left: 0.28
    }
  },
  {
    key: 'arrow-right-fat',
    type: 'polygon',
    width: DEFAULT_SHAPE_SIZE,
    height: 130,
    points: [
      { x: 0, y: 38 },
      { x: 58, y: 38 },
      { x: 58, y: 14 },
      { x: 100, y: 50 },
      { x: 58, y: 86 },
      { x: 58, y: 62 },
      { x: 0, y: 62 }
    ],
    textPadding: {
      top: 0.24,
      right: 0.42,
      bottom: 0.24,
      left: 0.16
    }
  },
  {
    key: 'arrow-up-fat',
    type: 'polygon',
    width: 130,
    height: DEFAULT_SHAPE_SIZE,
    points: [
      { x: 38, y: 100 },
      { x: 38, y: 42 },
      { x: 14, y: 42 },
      { x: 50, y: 0 },
      { x: 86, y: 42 },
      { x: 62, y: 42 },
      { x: 62, y: 100 }
    ],
    textPadding: {
      top: 0.4,
      right: 0.24,
      bottom: 0.16,
      left: 0.24
    }
  },
  {
    key: 'arrow-right',
    type: 'polygon',
    width: DEFAULT_SHAPE_SIZE,
    height: 120,
    points: [
      { x: 0, y: 42 },
      { x: 66, y: 42 },
      { x: 66, y: 22 },
      { x: 100, y: 50 },
      { x: 66, y: 78 },
      { x: 66, y: 58 },
      { x: 0, y: 58 }
    ],
    textPadding: {
      top: 0.24,
      right: 0.4,
      bottom: 0.24,
      left: 0.14
    }
  },
  {
    key: 'arrow-down-fat',
    type: 'polygon',
    width: 130,
    height: DEFAULT_SHAPE_SIZE,
    points: [
      { x: 38, y: 0 },
      { x: 38, y: 58 },
      { x: 14, y: 58 },
      { x: 50, y: 100 },
      { x: 86, y: 58 },
      { x: 62, y: 58 },
      { x: 62, y: 0 }
    ],
    textPadding: {
      top: 0.16,
      right: 0.24,
      bottom: 0.4,
      left: 0.24
    }
  },
  {
    key: 'arrow-up-down',
    type: 'polygon',
    width: 130,
    height: DEFAULT_SHAPE_SIZE,
    points: [
      { x: 50, y: 0 },
      { x: 82, y: 34 },
      { x: 62, y: 34 },
      { x: 62, y: 66 },
      { x: 82, y: 66 },
      { x: 50, y: 100 },
      { x: 18, y: 66 },
      { x: 38, y: 66 },
      { x: 38, y: 34 },
      { x: 18, y: 34 }
    ],
    textPadding: {
      top: 0.38,
      right: 0.26,
      bottom: 0.38,
      left: 0.26
    }
  },
  {
    key: 'arrow-left-right',
    type: 'polygon',
    width: DEFAULT_SHAPE_SIZE,
    height: 130,
    points: [
      { x: 0, y: 50 },
      { x: 30, y: 18 },
      { x: 30, y: 38 },
      { x: 70, y: 38 },
      { x: 70, y: 18 },
      { x: 100, y: 50 },
      { x: 70, y: 82 },
      { x: 70, y: 62 },
      { x: 30, y: 62 },
      { x: 30, y: 82 }
    ],
    textPadding: {
      top: 0.26,
      right: 0.34,
      bottom: 0.26,
      left: 0.34
    }
  },
  {
    key: 'drop',
    type: 'path',
    width: 140,
    height: DEFAULT_SHAPE_SIZE,
    path: 'M50 0 C68 18 88 41 88 62 C88 84 71 100 50 100 C29 100 12 84 12 62 C12 41 32 18 50 0 Z',
    textPadding: {
      top: 0.3,
      right: 0.27,
      bottom: 0.2,
      left: 0.27
    }
  },
  {
    key: 'cross',
    type: 'polygon',
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    points: [
      { x: 36, y: 0 },
      { x: 64, y: 0 },
      { x: 64, y: 36 },
      { x: 100, y: 36 },
      { x: 100, y: 64 },
      { x: 64, y: 64 },
      { x: 64, y: 100 },
      { x: 36, y: 100 },
      { x: 36, y: 64 },
      { x: 0, y: 64 },
      { x: 0, y: 36 },
      { x: 36, y: 36 }
    ],
    textPadding: {
      top: 0.34,
      right: 0.34,
      bottom: 0.34,
      left: 0.34
    }
  },
  {
    key: 'gear',
    type: 'polygon',
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    points: createStarPoints({
      spikes: 14,
      outerRadius: 50,
      innerRadius: 40,
      rotation: -Math.PI / 2
    }),
    textPadding: {
      top: 0.28,
      right: 0.28,
      bottom: 0.28,
      left: 0.28
    }
  },
  {
    key: 'badge',
    type: 'path',
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    path: 'M24 6 H76 L94 24 V76 L76 94 H24 L6 76 V24 Z',
    textPadding: {
      top: 0.24,
      right: 0.24,
      bottom: 0.24,
      left: 0.24
    }
  },
  {
    key: 'bookmark',
    type: 'polygon',
    width: 130,
    height: DEFAULT_SHAPE_SIZE,
    points: [
      { x: 18, y: 0 },
      { x: 82, y: 0 },
      { x: 82, y: 100 },
      { x: 50, y: 74 },
      { x: 18, y: 100 }
    ],
    textPadding: {
      top: 0.2,
      right: 0.22,
      bottom: 0.34,
      left: 0.22
    }
  },
  {
    key: 'tag',
    type: 'path',
    width: DEFAULT_SHAPE_SIZE,
    height: 130,
    path: 'M4 20 L64 20 L96 50 L64 80 L4 80 Z',
    textPadding: {
      top: 0.24,
      right: 0.34,
      bottom: 0.24,
      left: 0.18
    }
  },
  {
    key: 'moon',
    type: 'path',
    width: 150,
    height: DEFAULT_SHAPE_SIZE,
    path: [
      'M68 4 C36 4 10 30 10 62',
      'C10 94 36 120 68 120 C85 120 100 112 111 100',
      'C82 102 58 78 58 48 C58 28 68 12 84 4',
      'C79 4 74 4 68 4 Z'
    ].join(' '),
    textPadding: {
      top: 0.28,
      right: 0.34,
      bottom: 0.28,
      left: 0.2
    }
  }
]

export const DEFAULT_SHAPE_PRESET_KEY = 'circle'

export const SHAPE_DEFAULT_HORIZONTAL_ALIGN: ShapeHorizontalAlign = 'center'

export const SHAPE_DEFAULT_VERTICAL_ALIGN: ShapeVerticalAlign = 'middle'

const shapePresetDictionary: Record<string, ShapePreset> = {}

for (let index = 0; index < shapePresetsList.length; index += 1) {
  const preset = shapePresetsList[index]
  shapePresetDictionary[preset.key] = preset
}

export const SHAPE_PRESETS: Record<string, ShapePreset> = shapePresetDictionary

/**
 * Возвращает пресет фигуры по ключу.
 */
export const getShapePreset = ({
  presetKey
}: {
  presetKey: string
}): ShapePreset | null => SHAPE_PRESETS[presetKey] ?? null

/**
 * Возвращает итоговый ключ пресета с учетом ограничений скругления.
 */
export const resolvePresetKeyForRounding = ({
  preset,
  rounding
}: {
  preset: ShapePreset
  rounding?: number
}): string => {
  const roundedValue = typeof rounding === 'number' ? rounding : 0
  if (roundedValue <= 0) return preset.key

  if (preset.type === 'rect') return preset.key

  return preset.roundedVariant ?? preset.key
}

/**
 * Возвращает итоговые отступы текстовой области внутри фигуры.
 */
export const resolveShapePadding = ({
  preset,
  overridePadding
}: {
  preset: ShapePreset
  overridePadding?: Partial<ShapePadding>
}): ShapePadding => {
  const presetPadding = preset.textPadding ?? {}

  return {
    top: overridePadding?.top ?? presetPadding.top ?? DEFAULT_SHAPE_PADDING.top,
    right: overridePadding?.right ?? presetPadding.right ?? DEFAULT_SHAPE_PADDING.right,
    bottom: overridePadding?.bottom ?? presetPadding.bottom ?? DEFAULT_SHAPE_PADDING.bottom,
    left: overridePadding?.left ?? presetPadding.left ?? DEFAULT_SHAPE_PADDING.left
  }
}
