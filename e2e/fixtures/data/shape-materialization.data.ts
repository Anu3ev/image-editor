import type { CanvasFullState } from '../../../src/editor/history-manager'
import { SHAPE_TEMPLATE_WITH_LONG_TEXT_IN_FIGURE } from './shape-template-text-style.data'

/** Идентификатор фигуры в общих materialization-сценариях. */
export const SHAPE_MATERIALIZATION_SOURCE_ID = 'shape-materialization-source'

/** Идентификатор вспомогательной фигуры для group → ungroup. */
export const SHAPE_MATERIALIZATION_AUXILIARY_ID = 'shape-materialization-auxiliary'

/** Идентификатор фигуры, восстановленной из initialState. */
export const SHAPE_MATERIALIZATION_INITIAL_STATE_ID = 'shape-materialization-initial-state'

/** Длинный текст, который остаётся перенесённым после добавления двух отступов. */
export const SHAPE_MATERIALIZATION_TEXT = 'AAAAAAAAAAAAAA'

/** Размер текста в materialization-сценариях. */
export const SHAPE_MATERIALIZATION_FONT_SIZE = 48

/** Значение левого и правого отступов в materialization-сценариях. */
export const SHAPE_MATERIALIZATION_HORIZONTAL_PADDING = 50

/** Допустимое расхождение размеров после materialization. */
export const SHAPE_MATERIALIZATION_SIZE_TOLERANCE = 1.5

/** Сохранённая ширина фигуры из initialState. */
export const SHAPE_MATERIALIZATION_INITIAL_WIDTH = 449

/** Сохранённая высота фигуры из initialState. */
export const SHAPE_MATERIALIZATION_INITIAL_HEIGHT = 180

/** Узкая монтажная область, в которой fitObject ограничивается по высоте. */
export const SHAPE_MATERIALIZATION_FIT_RESOLUTION = {
  width: 512,
  height: 120
} as const

/** Служебная монтажная область initialState. */
const SHAPE_MATERIALIZATION_MONTAGE_OBJECT = {
  id: 'montage-area',
  type: 'Rect',
  version: '7.2.0',
  originX: 'center',
  originY: 'center',
  left: 256,
  top: 256,
  width: 512,
  height: 512,
  fill: '#ffffff',
  stroke: null,
  strokeWidth: 0,
  selectable: false,
  evented: false,
  hasBorders: false,
  hasControls: false,
  objectCaching: false,
  noScaleCache: true
} as const

/**
 * Возвращает валидные source-узлы из существующей сериализованной shape fixture.
 */
function resolveShapeMaterializationSource(): {
  group: Record<string, unknown>
  objects: Record<string, unknown>[]
  } {
  const sourceGroup = SHAPE_TEMPLATE_WITH_LONG_TEXT_IN_FIGURE.objects[0]
  const sourceObjects = sourceGroup?.objects

  if (!sourceGroup || !Array.isArray(sourceObjects)) {
    throw new Error('Shape template fixture должен содержать shape-group с дочерними узлами')
  }

  const shapeObjects = sourceObjects.filter(
    (object: unknown): object is Record<string, unknown> => typeof object === 'object' && object !== null
  )

  if (shapeObjects.length !== sourceObjects.length) {
    throw new Error('Все дочерние узлы shape template fixture должны быть объектами')
  }

  return {
    group: sourceGroup,
    objects: shapeObjects
  }
}

/**
 * Приводит дочерние узлы fixture к тексту и размерам initialState-сценария.
 */
function createShapeMaterializationObjects({
  sourceObjects
}: {
  sourceObjects: Record<string, unknown>[]
}): Record<string, unknown>[] {
  return sourceObjects.map((object) => {
    if (object.shapeNodeType === 'shape') {
      return {
        ...object,
        width: SHAPE_MATERIALIZATION_INITIAL_WIDTH,
        height: SHAPE_MATERIALIZATION_INITIAL_HEIGHT,
        left: 0,
        top: 0
      }
    }

    if (object.shapeNodeType === 'text') {
      return {
        ...object,
        text: SHAPE_MATERIALIZATION_TEXT,
        textCaseRaw: SHAPE_MATERIALIZATION_TEXT,
        fontSize: SHAPE_MATERIALIZATION_FONT_SIZE,
        lineFontDefaults: {}
      }
    }

    return object
  })
}

/**
 * Собирает shape-группу с уже выбранными внешними размерами.
 */
function createShapeMaterializationGroup(): Record<string, unknown> {
  const {
    group: sourceGroup,
    objects: sourceObjects
  } = resolveShapeMaterializationSource()
  const materializedObjects = createShapeMaterializationObjects({
    sourceObjects
  })

  return {
    ...sourceGroup,
    id: SHAPE_MATERIALIZATION_INITIAL_STATE_ID,
    width: SHAPE_MATERIALIZATION_INITIAL_WIDTH,
    height: SHAPE_MATERIALIZATION_INITIAL_HEIGHT,
    originX: 'center',
    originY: 'center',
    left: 256,
    top: 256,
    shapeBaseWidth: SHAPE_MATERIALIZATION_INITIAL_WIDTH,
    shapeBaseHeight: SHAPE_MATERIALIZATION_INITIAL_HEIGHT,
    shapeManualBaseWidth: 180,
    shapeManualBaseHeight: SHAPE_MATERIALIZATION_INITIAL_HEIGHT,
    shapeReplaceBoxWidth: SHAPE_MATERIALIZATION_INITIAL_WIDTH,
    shapeReplaceBoxHeight: SHAPE_MATERIALIZATION_INITIAL_HEIGHT,
    shapeTextAutoExpand: true,
    shapePaddingRight: SHAPE_MATERIALIZATION_HORIZONTAL_PADDING,
    shapePaddingLeft: SHAPE_MATERIALIZATION_HORIZONTAL_PADDING,
    objects: materializedObjects
  }
}

/**
 * Собирает initialState с одной materialized shape-группой.
 */
function createShapeMaterializationInitialState(): CanvasFullState {
  return {
    version: '7.2.0',
    width: 512,
    height: 512,
    clipPath: null,
    objects: [
      SHAPE_MATERIALIZATION_MONTAGE_OBJECT,
      createShapeMaterializationGroup()
    ]
  }
}

/** InitialState для проверки сохранения внешних размеров shape-группы. */
export const SHAPE_MATERIALIZATION_INITIAL_STATE = createShapeMaterializationInitialState()
