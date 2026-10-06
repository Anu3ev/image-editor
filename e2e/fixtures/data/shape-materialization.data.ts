import type { CanvasFullState } from '../../../src/editor/history-manager'
import { SHAPE_TEMPLATE_WITH_LONG_TEXT_IN_FIGURE } from './shape-template-text-style.data'

/** Shape ID in shared materialization scenarios. */
export const SHAPE_MATERIALIZATION_SOURCE_ID = 'shape-materialization-source'

/** Auxiliary shape ID for group → ungroup. */
export const SHAPE_MATERIALIZATION_AUXILIARY_ID = 'shape-materialization-auxiliary'

/** ID of the shape restored from initialState. */
export const SHAPE_MATERIALIZATION_INITIAL_STATE_ID = 'shape-materialization-initial-state'

/** Long text that remains wrapped after adding two padding values. */
export const SHAPE_MATERIALIZATION_TEXT = 'AAAAAAAAAAAAAA'

/** Text size in materialization scenarios. */
export const SHAPE_MATERIALIZATION_FONT_SIZE = 48

/** Left and right padding value in materialization scenarios. */
export const SHAPE_MATERIALIZATION_HORIZONTAL_PADDING = 50

/** Allowed dimension difference after materialization. */
export const SHAPE_MATERIALIZATION_SIZE_TOLERANCE = 1.5

/** Saved shape width from initialState. */
export const SHAPE_MATERIALIZATION_INITIAL_WIDTH = 449

/** Saved shape height from initialState. */
export const SHAPE_MATERIALIZATION_INITIAL_HEIGHT = 180

/** Narrow artboard in which fitObject is constrained by height. */
export const SHAPE_MATERIALIZATION_FIT_RESOLUTION = {
  width: 512,
  height: 120
} as const

/** Auxiliary initialState artboard. */
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
 * Returns valid source nodes from an existing serialized shape fixture.
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
 * Adjusts fixture child nodes to the text and dimensions of the initialState scenario.
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
 * Builds a shape group with preselected outer dimensions.
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
 * Builds an initialState with one materialized shape group.
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

/** InitialState for testing preservation of a shape group's outer dimensions. */
export const SHAPE_MATERIALIZATION_INITIAL_STATE = createShapeMaterializationInitialState()
