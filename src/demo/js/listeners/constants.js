/** Палитра быстрых цветов заливки для текстовых объектов demo-редактора. */
export const TEXT_FILL_PALETTE = [
  '#000000',
  '#ffffff',
  '#f87171',
  '#fb923c',
  '#facc15',
  '#34d399',
  '#38bdf8',
  '#60a5fa',
  '#a855f7',
  '#f472b6'
]

/** Палитра быстрых цветов обводки для текстовых объектов demo-редактора. */
export const TEXT_STROKE_PALETTE = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#facc15',
  '#10b981',
  '#0ea5e9',
  '#2563eb',
  '#7c3aed',
  '#111827'
]

/** Палитра быстрых цветов заливки для shape-объектов demo-редактора. */
export const SHAPE_FILL_PALETTE = [
  '#B0B5BF',
  '#111827',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#a855f7'
]

/** Палитра быстрых цветов обводки для shape-объектов demo-редактора. */
export const SHAPE_STROKE_PALETTE = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#0ea5e9',
  '#2563eb',
  '#7c3aed',
  '#6b7280'
]

/** Последовательность значений выравнивания текста для циклического переключения кнопкой. */
export const ALIGN_SEQUENCE = ['left', 'center', 'right', 'justify']
/** Количество пробелов при сериализации JSON активного объекта. */
export const ACTIVE_OBJECT_JSON_SPACES = 2
/** Текст по умолчанию для создания нового текстового объекта. */
export const DEFAULT_TEXT_VALUE = 'Новый текст'

/**
 * Список дополнительных свойств Fabric-объектов, которые нужно сохранять
 * при сериализации активного объекта и шаблонов demo-редактора.
 */
export const OBJECT_SERIALIZATION_PROPS = [
  'id',
  'backgroundId',
  'customData',
  'backgroundType',
  'format',
  'contentType',
  'width',
  'height',
  'locked',
  'editable',
  'evented',
  'selectable',
  'lockMovementX',
  'lockMovementY',
  'lockRotation',
  'lockScalingX',
  'lockScalingY',
  'lockSkewingX',
  'lockSkewingY',
  'styles',
  'lineFontDefaults',
  'textCaseRaw',
  'uppercase',
  'autoExpand',
  'linethrough',
  'underline',
  'fontStyle',
  'fontWeight',
  'backgroundOpacity',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'radiusTopLeft',
  'radiusTopRight',
  'radiusBottomRight',
  'radiusBottomLeft',
  'shapeComposite',
  'shapePresetKey',
  'shapeBaseWidth',
  'shapeBaseHeight',
  'shapeManualBaseWidth',
  'shapeManualBaseHeight',
  'shapeAlignHorizontal',
  'shapeAlignVertical',
  'shapePaddingTop',
  'shapePaddingRight',
  'shapePaddingBottom',
  'shapePaddingLeft',
  'shapeFill',
  'shapeStroke',
  'shapeStrokeWidth',
  'shapeStrokeDashArray',
  'shapeOpacity',
  'shapeRounding',
  'shapeNodeType'
]
