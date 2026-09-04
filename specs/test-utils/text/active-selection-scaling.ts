import type { RectangularScaleControlKey } from '../../../src/editor/snapping-manager/scaling/rectangular-scale-gesture-projection'
import {
  createScaleGestureBaseline,
  FREE_SCALE_HOLD_STATE,
  resolveScaleSnapPlan,
  type PlannedScaleConstraint,
  type ScaleSnapPlan,
  type ScaleSnapTransition
} from '../../../src/editor/snapping-manager/scaling/scale-snapping-resolver'
import ActiveSelectionTextScaleMeasurer, {
  type ActiveSelectionTextScaleMeasurement
} from '../../../src/editor/text-manager/scaling/active-selection-scale-measurer'
import { createActiveSelectionTextScaleStepProjection } from '../../../src/editor/text-manager/scaling/active-selection-scale-projection'
import type { ObjectBounds } from '../../../src/editor/utils/geometry'
import { BackgroundTextbox } from '../../../src/editor/text-manager/background-textbox'
import {
  captureTextScaleBase,
  resolveMinimumTextScalingBounds
} from '../../../src/editor/text-manager/scaling/text-scaling-materialization'
import {
  createTextActiveSelectionScaleHarness,
  type TextActiveSelectionScaleHarness
} from '../selection/active-selection-scale-interaction'

/** Реальный измеритель и геометрия одного тестового выделения из текстов. */
export type ActiveSelectionTextScaleMeasurerSetup = Readonly<{
  harness: TextActiveSelectionScaleHarness
  measurer: ActiveSelectionTextScaleMeasurer
}>

/** Общие минимальные множители всех текстов тестового выделения. */
export type ActiveSelectionTextScaleMinimums = Readonly<{
  font: number
  proportional: number
  width: number
}>

/** Данные двухмерной локальной проекции с заранее известными коэффициентами. */
export type ActiveSelectionTextScaleProjectionSetup = Readonly<{
  expectedBottomCoefficients: readonly number[]
  expectedRightCoefficients: readonly number[]
  step: ReturnType<typeof createActiveSelectionTextScaleStepProjection>
  values: readonly number[]
}>

/** Создаёт точные границы из положения правой и нижней граней. */
function createBounds({ bottom, right }: { bottom: number; right: number }): ObjectBounds {
  const left = 100
  const top = 80

  return Object.freeze({
    bottom,
    centerX: left + ((right - left) / 2),
    centerY: top + ((bottom - top) / 2),
    left,
    right,
    top
  })
}

/** Создаёт ограничение одной направляющей для текстового уточнения плана. */
function createConstraint({
  axis,
  position,
  transition
}: {
  axis: 'x' | 'y'
  position: number
  transition: ScaleSnapTransition
}): PlannedScaleConstraint {
  const edge = axis === 'x' ? 'right' : 'bottom'

  return Object.freeze({
    axis,
    candidate: Object.freeze({
      axis,
      category: 'edge',
      edge,
      id: `${axis}-guide`,
      position,
      snapshotIndex: axis === 'x' ? 0 : 1
    }),
    expectedPosition: position,
    transition
  })
}

/** Устанавливает в Fabric mock перенос строк, зависящий от ширины и размера шрифта. */
export function installTextWrappingMeasurementContract(): jest.SpyInstance {
  return jest.spyOn(BackgroundTextbox.prototype, 'initDimensions').mockImplementation(function(
    this: BackgroundTextbox
  ): void {
    const fontSize = this.fontSize ?? 16
    const lineHeight = this.lineHeight ?? 1
    const padding = (this.paddingLeft ?? 0) + (this.paddingRight ?? 0)
    const contentWidth = Math.max((this.width ?? 1) - padding, 1)
    const glyphsPerLine = Math.max(Math.floor(contentWidth / (fontSize * 0.5)), 1)
    const sourceLines = (this.text ?? '').split('\n')
    const lineCount = sourceLines.reduce((total, line) => {
      return total + Math.max(Math.ceil([...line].length / glyphsPerLine), 1)
    }, 0)

    this.textLines = Array.from({ length: lineCount }, (_value, index) => `line-${index}`)
    this.height = lineCount * fontSize * lineHeight
  })
}

/** Создаёт реальный измеритель выбранной боковой или угловой ручки. */
export function createActiveSelectionTextScaleMeasurerSetup({
  controlKey = 'mr',
  uniformScaling = true
}: {
  controlKey?: RectangularScaleControlKey
  uniformScaling?: boolean
} = {}): ActiveSelectionTextScaleMeasurerSetup {
  const harness = createTextActiveSelectionScaleHarness({ controlKey, uniformScaling })
  const measurer = new ActiveSelectionTextScaleMeasurer({
    canvasManager: harness.editor.canvasManager,
    children: harness.children,
    projection: harness.projection,
    selection: harness.target,
    transform: harness.transform
  })

  return Object.freeze({ harness, measurer })
}

/** Рассчитывает самый строгий минимум среди всех текстов выделения. */
export function resolveActiveSelectionTextScaleMinimums({
  children
}: {
  children: TextActiveSelectionScaleHarness['children']
}): ActiveSelectionTextScaleMinimums {
  const minimums = children.map((textbox) => {
    return resolveMinimumTextScalingBounds({ base: captureTextScaleBase({ textbox }) })
  })

  return Object.freeze({
    font: Math.max(...minimums.map(({ fontScale }) => fontScale)),
    proportional: Math.max(...minimums.map(({ proportionalScale }) => proportionalScale)),
    width: Math.max(...minimums.map(({ widthScale }) => widthScale))
  })
}

/** Создаёт план с одной или двумя кандидатами для реального текстового уточнения. */
export function createActiveSelectionTextScalePlan({
  measurement,
  transition = 'acquired',
  xPosition,
  yPosition
}: {
  measurement: ActiveSelectionTextScaleMeasurement
  transition?: ScaleSnapTransition
  xPosition?: number
  yPosition?: number
}): ScaleSnapPlan {
  const baseline = createScaleGestureBaseline({
    bounds: measurement.bounds,
    candidates: Object.freeze([]),
    fixedAnchor: { x: measurement.bounds.left, y: measurement.bounds.top },
    projectionModes: [{
      id: measurement.mode,
      projection: measurement.projection.projection
    }],
    zoom: 1
  })
  const plan = resolveScaleSnapPlan({
    baseline,
    holdState: FREE_SCALE_HOLD_STATE,
    intent: {
      modifiers: { ctrlKey: false, shiftKey: false },
      projectionMode: measurement.mode,
      values: measurement.values
    }
  })

  const constraints = Object.freeze({
    x: xPosition === undefined ? null : createConstraint({ axis: 'x', position: xPosition, transition }),
    y: yPosition === undefined ? null : createConstraint({ axis: 'y', position: yPosition, transition })
  })

  return Object.freeze({
    ...plan,
    constraints: transition === 'held' ? constraints : plan.constraints,
    refinementCandidates: constraints
  })
}

/** Создаёт двухмерную проекцию, в которой обе переменные влияют на обе грани. */
export function createActiveSelectionTextScaleProjectionSetup(): ActiveSelectionTextScaleProjectionSetup {
  const bounds = createBounds({ bottom: 200, right: 300 })
  const values = Object.freeze([1, 1])
  const expectedRightCoefficients = Object.freeze([300, 20])
  const expectedBottomCoefficients = Object.freeze([50, 200])
  const step = createActiveSelectionTextScaleStepProjection({
    bounds,
    projectionMode: {
      id: 'free',
      projection: {
        baselineValues: values,
        edges: [
          { coefficients: expectedRightCoefficients, edge: 'right' },
          { coefficients: expectedBottomCoefficients, edge: 'bottom' }
        ],
        variables: ['scale-x', 'scale-y'],
        variableSceneWeights: [200, 120]
      }
    },
    samples: [
      { bounds: createBounds({ bottom: 205, right: 330 }), values: [1.1, 1] },
      { bounds: createBounds({ bottom: 240, right: 304 }), values: [1, 1.2] }
    ],
    values
  })

  return Object.freeze({ expectedBottomCoefficients, expectedRightCoefficients, step, values })
}
