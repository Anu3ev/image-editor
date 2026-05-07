import {
  ShapePadding,
  ShapePaddingRatio,
  ShapePoint,
  ShapePreset,
  ShapeVerticalAlign,
  ShapeHorizontalAlign
} from './types'
import { normalizeShapeRounding } from './shape-rounding'

const DEFAULT_SHAPE_SIZE = 180

const DEFAULT_SHAPE_TEXT_INSET: ShapePaddingRatio = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
}

const MAX_SHAPE_TEXT_INSET_RATIO = 0.45

/**
 * Нормализует число до 4 знаков после запятой для стабильной сериализации.
 */
const normalizeNumber = ({ value }: { value: number }): number => Number(value.toFixed(4))

/**
 * Масштабирует исходный viewBox фигуры к дефолтному размеру пресета.
 */
const resolvePresetSize = ({
  width,
  height
}: {
  width: number
  height: number
}): {
  width: number
  height: number
} => {
  const scale = DEFAULT_SHAPE_SIZE / Math.max(width, height)

  return {
    width: normalizeNumber({ value: width * scale }),
    height: normalizeNumber({ value: height * scale })
  }
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
    internalTextInset: {
      top: 0.05,
      right: 0.05,
      bottom: 0.05,
      left: 0.05
    }
  },
  {
    key: 'pie',
    type: 'path',
    ...resolvePresetSize({
      width: 34,
      height: 34
    }),
    path: 'M34 17A17 17 0 1 1 17 0v17z'
  },
  {
    key: 'triangle',
    type: 'triangle',
    ...resolvePresetSize({
      width: 38,
      height: 31
    }),
    internalTextInset: {
      top: 0.34,
      right: 0.24,
      bottom: 0.12,
      left: 0.24
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
    internalTextInset: {
      top: 0.3,
      right: 0.24,
      bottom: 0.3,
      left: 0.24
    }
  },
  {
    key: 'pentagon',
    type: 'polygon',
    ...resolvePresetSize({
      width: 36,
      height: 33
    }),
    points: [
      { x: 50, y: 0 },
      { x: 100, y: 38.197 },
      { x: 80.9028, y: 100 },
      { x: 19.0972, y: 100 },
      { x: 0, y: 38.197 }
    ],
    internalTextInset: {
      top: 0.24,
      right: 0.08,
      bottom: 0.08,
      left: 0.08
    }
  },
  {
    key: 'hexagon',
    type: 'polygon',
    ...resolvePresetSize({
      width: 32,
      height: 36
    }),
    points: [
      { x: 50, y: 0 },
      { x: 100, y: 25 },
      { x: 100, y: 75 },
      { x: 50, y: 100 },
      { x: 0, y: 75 },
      { x: 0, y: 25 }
    ],
    internalTextInset: {
      top: 0.22,
      bottom: 0.22
    }
  },
  {
    key: 'star',
    type: 'polygon',
    ...resolvePresetSize({
      width: 38,
      height: 36
    }),
    points: [
      { x: 50, y: 0 },
      { x: 61.8026, y: 38.1944 },
      { x: 100, y: 38.1944 },
      { x: 69.0974, y: 61.8056 },
      { x: 80.9026, y: 100 },
      { x: 50, y: 76.3944 },
      { x: 19.0974, y: 100 },
      { x: 30.9026, y: 61.8056 },
      { x: 0, y: 38.1944 },
      { x: 38.1974, y: 38.1944 }
    ],
    internalTextInset: {
      top: 0.38,
      right: 0.3,
      bottom: 0.22,
      left: 0.3
    }
  },
  {
    key: 'star-16',
    type: 'polygon',
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    points: createStarPoints({
      spikes: 16,
      outerRadius: 50,
      innerRadius: 45,
      rotation: -Math.PI / 2
    }),
    internalTextInset: {
      top: 0.05,
      right: 0.05,
      bottom: 0.05,
      left: 0.05
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
      innerRadius: 19.1,
      rotation: -Math.PI / 2
    }),
    internalTextInset: {
      top: 0.32,
      right: 0.32,
      bottom: 0.32,
      left: 0.32
    }
  },
  {
    key: 'heart',
    type: 'path',
    ...resolvePresetSize({
      width: 36,
      height: 34
    }),
    path: [
      'M26 0c5.523 0 10 4.477 10 10l-.013.586',
      'C35.443 22.876 18.003 33.998 18 34c-.004-.003-18-11.48-18-24',
      'C0 4.477 4.477 0 10 0a9.99 9.99 0 0 1 8 3.999A9.99 9.99 0 0 1 26 0'
    ].join(' '),
    internalTextInset: {
      top: 0.1,
      right: 0.1,
      bottom: 0.16,
      left: 0.1
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
    internalTextInset: {
      top: 0.34,
      right: 0.42,
      bottom: 0.34,
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
    internalTextInset: {
      top: 0.1,
      right: 0.35,
      left: 0.35
    }
  },
  {
    key: 'arrow-right',
    type: 'polygon',
    ...resolvePresetSize({
      width: 36,
      height: 28
    }),
    points: [
      { x: 100, y: 50 },
      { x: 61.1111, y: 100 },
      { x: 61.1111, y: 71.4286 },
      { x: 0, y: 71.4286 },
      { x: 0, y: 28.5714 },
      { x: 61.1111, y: 28.5714 },
      { x: 61.1111, y: 0 }
    ],
    internalTextInset: {
      top: 0.3,
      right: 0.1,
      bottom: 0.3
    }
  },
  {
    key: 'arrow-left',
    type: 'polygon',
    ...resolvePresetSize({
      width: 36,
      height: 28
    }),
    points: [
      { x: 38.8889, y: 28.5714 },
      { x: 100, y: 28.5714 },
      { x: 100, y: 71.4286 },
      { x: 38.8889, y: 71.4286 },
      { x: 38.8889, y: 100 },
      { x: 0, y: 50 },
      { x: 38.8889, y: 0 }
    ],
    internalTextInset: {
      top: 0.3,
      bottom: 0.3,
      left: 0.1
    }
  },
  {
    key: 'arrow-up',
    type: 'polygon',
    ...resolvePresetSize({
      width: 28,
      height: 36
    }),
    points: [
      { x: 71.4286, y: 100 },
      { x: 28.5714, y: 100 },
      { x: 28.5714, y: 38.8889 },
      { x: 0, y: 38.8889 },
      { x: 50, y: 0 },
      { x: 100, y: 38.8889 },
      { x: 71.4286, y: 38.8889 }
    ],
    internalTextInset: {
      top: 0.12,
      right: 0.28,
      left: 0.28
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
    internalTextInset: {
      right: 0.35,
      bottom: 0.1,
      left: 0.35
    }
  },
  {
    key: 'arrow-down',
    type: 'polygon',
    ...resolvePresetSize({
      width: 28,
      height: 36
    }),
    points: [
      { x: 0, y: 61.1111 },
      { x: 28.5714, y: 61.1111 },
      { x: 28.5714, y: 0 },
      { x: 71.4286, y: 0 },
      { x: 71.4286, y: 61.1111 },
      { x: 100, y: 61.1111 },
      { x: 50, y: 100 }
    ],
    internalTextInset: {
      right: 0.28,
      bottom: 0.12,
      left: 0.28
    }
  },
  {
    key: 'arrow-up-down',
    type: 'polygon',
    ...resolvePresetSize({
      width: 20,
      height: 38
    }),
    points: [
      { x: 70, y: 73.6842 },
      { x: 100, y: 73.6842 },
      { x: 50, y: 100 },
      { x: 0, y: 73.6842 },
      { x: 30, y: 73.6842 },
      { x: 30, y: 26.3158 },
      { x: 0, y: 26.3158 },
      { x: 50, y: 0 },
      { x: 100, y: 26.3158 },
      { x: 70, y: 26.3158 }
    ],
    internalTextInset: {
      top: 0.1,
      right: 0.3,
      bottom: 0.1,
      left: 0.3
    }
  },
  {
    key: 'arrow-left-right',
    type: 'polygon',
    ...resolvePresetSize({
      width: 38,
      height: 20
    }),
    points: [
      { x: 100, y: 50 },
      { x: 73.6842, y: 100 },
      { x: 73.6842, y: 70 },
      { x: 26.3158, y: 70 },
      { x: 26.3158, y: 100 },
      { x: 0, y: 50 },
      { x: 26.3158, y: 0 },
      { x: 26.3158, y: 30 },
      { x: 73.6842, y: 30 },
      { x: 73.6842, y: 0 }
    ],
    internalTextInset: {
      top: 0.3,
      right: 0.08,
      bottom: 0.3,
      left: 0.08
    }
  },
  {
    key: 'banner',
    type: 'polygon',
    ...resolvePresetSize({
      width: 36,
      height: 24
    }),
    points: [
      { x: 0, y: 100 },
      { x: 0, y: 0 },
      { x: 77.7778, y: 0 },
      { x: 100, y: 50 },
      { x: 77.7778, y: 100 }
    ],
    internalTextInset: {
      right: 0.2
    }
  },
  {
    key: 'drop',
    type: 'path',
    ...resolvePresetSize({
      width: 26,
      height: 36
    }),
    path: 'M0 23C0 11 13 0 13 0s13 11 13 23c0 7.18-5.82 13-13 13S0 30.18 0 23',
    internalTextInset: {
      top: 0.24,
      right: 0.1,
      bottom: 0.1,
      left: 0.1
    }
  },
  {
    key: 'cross',
    type: 'polygon',
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    points: [
      { x: 67.6471, y: 32.3529 },
      { x: 100, y: 32.3529 },
      { x: 100, y: 67.6471 },
      { x: 67.6471, y: 67.6471 },
      { x: 67.6471, y: 100 },
      { x: 32.3529, y: 100 },
      { x: 32.3529, y: 67.6471 },
      { x: 0, y: 67.6471 },
      { x: 0, y: 32.3529 },
      { x: 32.3529, y: 32.3529 },
      { x: 32.3529, y: 0 },
      { x: 67.6471, y: 0 }
    ],
    internalTextInset: {
      top: 0.32,
      right: 0.32,
      bottom: 0.32,
      left: 0.32
    }
  },
  {
    key: 'ribbon',
    type: 'polygon',
    ...resolvePresetSize({
      width: 24,
      height: 34
    }),
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 50, y: 76.4706 },
      { x: 0, y: 100 }
    ],
    internalTextInset: {
      bottom: 0.22
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
    internalTextInset: {
      top: 0.1,
      right: 0.1,
      bottom: 0.1,
      left: 0.1
    }
  },
  {
    key: 'badge',
    type: 'path',
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    path: 'M24 6 H76 L94 24 V76 L76 94 H24 L6 76 V24 Z',
    internalTextInset: {
      top: 0.1,
      bottom: 0.1
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
    internalTextInset: {
      bottom: 0.24
    }
  },
  {
    key: 'tag',
    type: 'path',
    width: DEFAULT_SHAPE_SIZE,
    height: 130,
    path: 'M4 20 L64 20 L96 50 L64 80 L4 80 Z',
    internalTextInset: {
      right: 0.28
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
    internalTextInset: {
      top: 0.28,
      right: 0.5,
      bottom: 0.28
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
  const roundedValue = normalizeShapeRounding({ rounding })
  if (roundedValue <= 0) return preset.key

  if (preset.type === 'rect') return preset.key

  return preset.roundedVariant ?? preset.key
}

/**
 * Переводит ratio-вставку формы в пиксели для текущего размера шейпа.
 */
function resolveInternalShapeTextInsetPixels({
  value,
  size
}: {
  value: number
  size: number
}): number {
  const safeValue = Number.isFinite(value)
    ? Math.min(Math.max(value, 0), MAX_SHAPE_TEXT_INSET_RATIO)
    : 0
  const safeSize = Number.isFinite(size) && size > 0
    ? size
    : 0

  return safeSize * safeValue
}

/**
 * Возвращает внутренний отступ текстовой области, который задаётся самой формой.
 */
export const resolveInternalShapeTextInset = ({
  preset,
  width,
  height
}: {
  preset: ShapePreset
  width: number
  height: number
}): ShapePadding => {
  const presetInset = preset.internalTextInset ?? {}

  return {
    top: resolveInternalShapeTextInsetPixels({
      value: presetInset.top ?? DEFAULT_SHAPE_TEXT_INSET.top,
      size: height
    }),
    right: resolveInternalShapeTextInsetPixels({
      value: presetInset.right ?? DEFAULT_SHAPE_TEXT_INSET.right,
      size: width
    }),
    bottom: resolveInternalShapeTextInsetPixels({
      value: presetInset.bottom ?? DEFAULT_SHAPE_TEXT_INSET.bottom,
      size: height
    }),
    left: resolveInternalShapeTextInsetPixels({
      value: presetInset.left ?? DEFAULT_SHAPE_TEXT_INSET.left,
      size: width
    })
  }
}

/**
 * Проверяет, содержит ли path только линейные команды.
 */
function hasLinearPathCommandsOnly({ path }: { path: string }): boolean {
  const commands = path.match(/[a-zA-Z]/g) ?? []
  const linearCommands = new Set(['M', 'L', 'H', 'V', 'Z'])

  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index].toUpperCase()
    if (!linearCommands.has(command)) return false
  }

  return commands.length > 0
}

/**
 * Проверяет, поддерживает ли пресет скругление углов.
 */
export const isShapePresetRoundable = ({
  preset
}: {
  preset: ShapePreset
}): boolean => {
  if (preset.type === 'rect') return true
  if (preset.type === 'triangle') return true
  if (preset.type === 'polygon') return true
  if (preset.type === 'polyline') return true
  if (preset.type === 'ellipse') return false
  if (preset.type === 'svg') return false

  return hasLinearPathCommandsOnly({
    path: preset.path
  })
}
