import {
  createScaleGestureBaseline,
  FREE_SCALE_HOLD_STATE,
  resolveScaleSnapPlan,
  type ScaleSnapPlan
} from '../../../src/editor/snapping-manager/scaling/scale-snapping-resolver'
import type { TextCornerScaleMeasurement } from '../../../src/editor/text-manager/scaling/text-corner-scale-measurer'
import type { ObjectBounds } from '../../../src/editor/utils/geometry'

/** Создаёт точные границы измеренного текста с заданными подвижными гранями. */
function createBounds({
  bottom = 140,
  right
}: {
  bottom?: number
  right: number
}): ObjectBounds {
  const left = 200
  const top = 100

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
export function createTextCornerScaleSnapPlan(): ScaleSnapPlan {
  const baseline = createScaleGestureBaseline({
    bounds: createBounds({ right: 300 }),
    fixedAnchor: { x: 200, y: 120 },
    projectionModes: [{
      id: 'uniform',
      projection: {
        variables: ['uniform-scale'],
        baselineValues: [1],
        variableSceneWeights: [100],
        edges: [{ edge: 'right', coefficients: [100] }]
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
      projectionMode: 'uniform',
      values: [1.02],
      modifiers: { ctrlKey: false, shiftKey: false }
    }
  })
}

/** Добавляет к тестовому плану потенциальную направляющую для нижней грани. */
export function createTextCornerScaleSnapPlanWithSecondAxis(): ScaleSnapPlan {
  const plan = createTextCornerScaleSnapPlan()
  const xConstraint = plan.refinementCandidates.x
  if (!xConstraint) throw new Error('Тестовый план должен содержать направляющую по X')

  return Object.freeze({
    ...plan,
    refinementCandidates: Object.freeze({
      x: xConstraint,
      y: Object.freeze({
        ...xConstraint,
        axis: 'y' as const,
        candidate: Object.freeze({
          ...xConstraint.candidate,
          axis: 'y' as const,
          edge: 'bottom' as const,
          position: 145
        }),
        expectedPosition: 145
      })
    })
  })
}

/** Создаёт измерение с заданным множителем и положением подвижных граней. */
export function createTextCornerScaleMeasurement({
  bottom = 140,
  bottomCoefficient = 100,
  rightCoefficient = 100,
  scale,
  right
}: {
  bottom?: number
  bottomCoefficient?: number
  rightCoefficient?: number
  scale: number
  right: number
}): TextCornerScaleMeasurement {
  return Object.freeze({
    canonicalState: Object.freeze({
      fontSize: 16 * scale,
      height: bottom - 100,
      inlineFontSizes: Object.freeze([]),
      lineCount: 1,
      lineFontSizes: Object.freeze([]),
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      paddingTop: 0,
      radiusBottomLeft: 0,
      radiusBottomRight: 0,
      radiusTopLeft: 0,
      radiusTopRight: 0,
      scaleX: 1,
      scaleY: 1,
      width: right - 200
    }),
    scale,
    projection: Object.freeze({
      bounds: createBounds({ bottom, right }),
      projection: Object.freeze({
        variables: Object.freeze(['uniform-scale'] as const),
        baselineValues: Object.freeze([scale]),
        variableSceneWeights: Object.freeze([100]),
        edges: Object.freeze([
          {
            edge: 'right' as const,
            coefficients: Object.freeze([rightCoefficient])
          },
          {
            edge: 'bottom' as const,
            coefficients: Object.freeze([bottomCoefficient])
          }
        ])
      })
    })
  })
}
