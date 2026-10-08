import type { Transform } from 'fabric'
import type CanvasManager from '../../canvas-manager'
import type { ObjectPlacement } from '../../canvas-manager'
import { getObjectExactBounds, type ObjectBounds } from '../../utils/geometry'
import type { ScaleStepProjectionInput } from '../../snapping-manager/scaling/scale-snapping-resolver'
import type { EditorTextbox, TextScaleBaseState } from '../types'
import {
  captureTextScaleBase,
  commitStandaloneTextboxScale,
  resolveMinimumTextScalingBounds
} from './text-scaling-materialization'
import { createTextScalingMeasurementTextbox } from './text-scaling-measurement'
import {
  createTextCornerScaleStepProjection,
  type TextCornerScaleGestureProjection,
  type TextCornerScaleProjectionSample
} from './text-corner-scale-projection'
import {
  captureTextCornerScaleCanonicalState,
  type TextCornerScaleCanonicalState
} from './text-corner-scale-state'

/** Small step used to build the local dependence of bounds on the multiplier. */
const TEXT_CORNER_SCALE_MEASUREMENT_STEP = 0.01

/** Maximum number of step increases when searching for distinguishable local text geometry. */
const MAX_TEXT_CORNER_SCALE_NEIGHBOR_STEPS = 8

/** Number of recent measurements retained between refinements of one pointer movement. */
const TEXT_CORNER_SCALE_MEASUREMENT_CACHE_SIZE = 2

/** Tolerance within which a measured edge is considered fixed. */
const TEXT_CORNER_SCALE_EDGE_EPSILON = 0.000000001

/** Exact text geometry at the proportional multiplier being checked. */
export type TextCornerScaleMeasurement = Readonly<{
  canonicalState: TextCornerScaleCanonicalState
  projection: ScaleStepProjectionInput
  scale: number
}>

/** Returns the corner-scaling fixed point's position. */
function createFixedAnchorPlacement({
  gesture,
  transform
}: {
  gesture: TextCornerScaleGestureProjection
  transform: Transform
}): ObjectPlacement {
  return {
    left: gesture.fixedAnchor.x,
    top: gesture.fixedAnchor.y,
    originX: transform.originX,
    originY: transform.originY
  }
}

/** Measures canonical text geometry without changing the object on the canvas. */
export default class TextCornerScaleMeasurer {
  /** Base properties of the measurement text object. */
  private readonly base: TextScaleBaseState

  /** Coordinate manager required by shared text materialization. */
  private readonly canvasManager: CanvasManager

  /** Fixed point and rectangular projection of the current gesture. */
  private readonly gesture: TextCornerScaleGestureProjection

  /** Minimum multiplier that preserves valid text dimensions. */
  private readonly minimumScale: number

  /** Recent multiplier measurements from oldest to newest. */
  private readonly measurements = new Map<number, TextCornerScaleMeasurement>()

  /** Original text position. */
  private readonly placement: ObjectPlacement

  /** Separate Textbox that is not added to the canvas. */
  private readonly textbox: EditorTextbox

  /** The transform is needed only to restore the fixed point. */
  private readonly transform: Transform

  /** Creates an independent measurement Textbox with the canvas object's original properties. */
  constructor({
    canvasManager,
    gesture,
    target,
    transform
  }: {
  canvasManager: CanvasManager
    gesture: TextCornerScaleGestureProjection
    target: EditorTextbox
    transform: Transform
  }) {
    this.canvasManager = canvasManager
    this.gesture = gesture
    this.placement = canvasManager.getObjectPlacement({ object: target })
    this.textbox = createTextScalingMeasurementTextbox({ target })
    this.base = captureTextScaleBase({ textbox: this.textbox })
    this.minimumScale = resolveMinimumTextScalingBounds({ base: this.base }).proportionalScale
    this.transform = transform
  }

  /** Returns exact bounds after applying the multiplier being checked. */
  public measure({ scale }: { scale: number }): TextCornerScaleMeasurement {
    const appliedScale = Math.max(this.minimumScale, scale)
    const cached = this.measurements.get(appliedScale)
    if (cached) {
      this.measurements.delete(appliedScale)
      this.measurements.set(appliedScale, cached)

      return cached
    }

    const { bounds, canonicalState } = this._measureCanonicalState({ scale: appliedScale })
    const samples = this._resolveProjectionSamples({ bounds, scale: appliedScale })

    const projection = createTextCornerScaleStepProjection({
      bounds,
      gesture: this.gesture,
      samples,
      scale: appliedScale
    })
    if (!projection) throw new Error('Could not build the text scaling projection')

    const measurement = Object.freeze({ canonicalState, projection, scale: appliedScale })
    this.measurements.set(appliedScale, measurement)
    if (this.measurements.size > TEXT_CORNER_SCALE_MEASUREMENT_CACHE_SIZE) {
      const oldestScale = this.measurements.keys().next().value
      if (typeof oldestScale !== 'number') throw new Error('The text measurement cache must not be empty')

      this.measurements.delete(oldestScale)
    }

    return measurement
  }

  /** Finds neighboring multipliers at which the local text geometry changes. */
  private _resolveProjectionSamples({
    bounds,
    scale
  }: {
    bounds: ObjectBounds
    scale: number
  }): readonly TextCornerScaleProjectionSample[] {
    for (let step = 0; step < MAX_TEXT_CORNER_SCALE_NEIGHBOR_STEPS; step += 1) {
      const delta = TEXT_CORNER_SCALE_MEASUREMENT_STEP * (2 ** step)
      const lowerScale = Math.max(this.minimumScale, scale - delta)
      const candidateScales = lowerScale < scale
        ? [lowerScale, scale + delta]
        : [scale + delta]
      const samples = candidateScales.map((candidateScale) => Object.freeze({
        bounds: this._measureBounds({ scale: candidateScale }),
        scale: candidateScale
      }))
      const changesGeometry = samples.some((sample) => {
        return this.gesture.movingEdges.some((edge) => {
          return Math.abs(sample.bounds[edge] - bounds[edge]) > TEXT_CORNER_SCALE_EDGE_EPSILON
        })
      })
      if (changesGeometry) return Object.freeze(samples)
    }

    throw new Error('Could not find distinguishable text corner scaling geometry')
  }

  /** Applies the specified multiplier and returns exact text bounds. */
  private _measureBounds({ scale }: { scale: number }): ObjectBounds {
    return this._measureCanonicalState({ scale }).bounds
  }

  /** Applies the specified multiplier and returns bounds together with canonical text properties. */
  private _measureCanonicalState({
    scale
  }: {
    scale: number
  }): Readonly<{ bounds: ObjectBounds; canonicalState: TextCornerScaleCanonicalState }> {
    commitStandaloneTextboxScale({
      textbox: this.textbox,
      canvasManager: this.canvasManager,
      base: this.base,
      widthScale: scale,
      heightScale: scale,
      placement: this.placement,
      anchorPlacement: createFixedAnchorPlacement({
        gesture: this.gesture,
        transform: this.transform
      }),
      shouldScaleFontSize: true,
      shouldScalePadding: true,
      shouldScaleRadii: true,
      shouldRoundDimensions: false
    })

    const bounds = getObjectExactBounds({ object: this.textbox })
    if (!bounds) throw new Error('Could not measure the text geometry after scaling')

    return Object.freeze({
      canonicalState: captureTextCornerScaleCanonicalState({ textbox: this.textbox }),
      bounds
    })
  }

  /** Releases the measurement Textbox's internal resources. */
  public dispose(): void {
    this.measurements.clear()
    this.textbox.dispose()
  }
}
