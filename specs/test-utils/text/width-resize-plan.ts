import {
  createScaleGestureBaseline,
  FREE_SCALE_HOLD_STATE,
  resolveScaleSnapPlan,
  type ScaleSnapPlan
} from '../../../src/editor/snapping-manager/scaling/scale-snapping-resolver'
import type { TextWidthResizeMeasurement } from '../../../src/editor/text-manager/scaling/text-width-resize-measurer'
import type { ObjectBounds } from '../../../src/editor/utils/geometry'

/** Создаёт точные границы измеренного текста. */
function createBounds({ right }: { right: number }): ObjectBounds {
  const left = 200
  const top = 100
  const bottom = 140

  return Object.freeze({
    left,
    right,
    top,
    bottom,
    centerX: left + ((right - left) / 2),
    centerY: top + ((bottom - top) / 2)
  })
}

/** Создаёт план, который должен поставить правую грань текста на координату 304. */
export function createTextWidthSnapPlan(): ScaleSnapPlan {
  const bounds = createBounds({ right: 300 })
  const baseline = createScaleGestureBaseline({
    bounds,
    fixedAnchor: { x: 200, y: 120 },
    projectionModes: [{
      id: 'text-width',
      projection: {
        variables: ['text-width'],
        baselineValues: [100],
        variableSceneWeights: [1],
        edges: [{ edge: 'right', coefficients: [1] }]
      }
    }],
    candidates: [{
      id: 'right-guide',
      axis: 'x',
      edge: 'right',
      position: 304,
      category: 'edge'
    }],
    zoom: 1
  })

  return resolveScaleSnapPlan({
    baseline,
    holdState: FREE_SCALE_HOLD_STATE,
    intent: {
      projectionMode: 'text-width',
      values: [102],
      modifiers: { ctrlKey: false, shiftKey: false }
    }
  })
}

/** Создаёт измерение с заданной шириной и положением правой грани. */
export function createTextWidthMeasurement({
  width,
  right
}: {
  width: number
  right: number
}): TextWidthResizeMeasurement {
  return Object.freeze({
    width,
    projection: Object.freeze({
      bounds: createBounds({ right }),
      projection: Object.freeze({
        variables: Object.freeze(['text-width'] as const),
        baselineValues: Object.freeze([width]),
        variableSceneWeights: Object.freeze([1]),
        edges: Object.freeze([{ edge: 'right' as const, coefficients: Object.freeze([1]) }])
      })
    })
  })
}
