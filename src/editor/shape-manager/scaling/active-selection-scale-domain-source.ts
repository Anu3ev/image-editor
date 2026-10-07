import type {
  ActiveSelection,
  Transform
} from 'fabric'
import { english, type Translate } from '../../i18n'

import type {
  RectangularScaleGestureMode,
  RectangularScaleMultipliers
} from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'
import type {
  ActiveSelectionScaleDomainChildMeasurement,
  ActiveSelectionScaleDomainMeasurement,
  ActiveSelectionScaleDomainSource,
  ActiveSelectionScaleFrame
} from '../../selection-manager/scaling/active-selection-scale-domain-source'
import type { ShapeGroup } from '../types'
import type ShapeActiveSelectionScalingController from './active-selection-scaling-controller'
import {
  captureShapeScalingGeometry,
  restoreShapeScalingSnapshots,
  type ShapeScalingGeometrySnapshot
} from './shape-scaling-geometry-snapshot'

/** Number of shape measurements retained between movements in a single gesture. */
const ACTIVE_SELECTION_SHAPE_DOMAIN_CACHE_SIZE = 48

/** Session-scoped source of actual shape geometry for shared measurement of a mixed selection. */
export default class ShapeActiveSelectionScaleDomainSource implements ActiveSelectionScaleDomainSource {
  /** Translator bound to the owning editor instance. */
  private readonly t: Translate

  /** Controller that calculates and applies internal shape layout. */
  private readonly controller: ShapeActiveSelectionScalingController

  /** Original selection for the current gesture. */
  private readonly selection: ActiveSelection

  /** Original Fabric transform for the current gesture. */
  private readonly transform: Transform

  /** Calculated states reused when refining the same geometry. */
  private readonly measurements = new Map<string, ActiveSelectionScaleDomainMeasurement>()

  /** Shape geometry after the last step confirmed by the shared owner. */
  private confirmedGeometry: readonly ShapeScalingGeometrySnapshot[]

  /** Measurement corresponding to the confirmed internal shape layout. */
  private confirmedMeasurement: ActiveSelectionScaleDomainMeasurement | null = null

  /** Shapes owned by the source in their original selection order. */
  public readonly targets: readonly ShapeGroup[]

  /** Captures the immutable start of the domain session before the first Fabric mutation. */
  constructor({
    t = english,
    controller,
    selection,
    targets,
    transform
  }: {
  t?: Translate
    controller: ShapeActiveSelectionScalingController
    selection: ActiveSelection
    targets: readonly ShapeGroup[]
    transform: Transform
  }) {
    this.t = t

    if (targets.length === 0) throw new Error(this.t('shape.errors.mixedCompositionRequiresShape'))

    this.controller = controller
    this.selection = selection
    this.targets = Object.freeze([...targets])
    this.transform = transform
    this.confirmedGeometry = this._captureGeometry()

    if (!controller.beginDomainScaling({ selection, transform })) {
      throw new Error(this.t('shape.errors.domainScaleSessionNotStarted'))
    }
  }

  /** Returns cached actual geometry for the supplied multipliers. */
  public measure({
    mode,
    multipliers
  }: {
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
  }): ActiveSelectionScaleDomainMeasurement {
    const key = `${mode}:${multipliers.x}:${multipliers.y}`
    const cached = this.measurements.get(key)
    if (cached) return cached

    const measurement = this.controller.measureDomainScale({
      mode,
      multipliers,
      selection: this.selection,
      transform: this.transform
    })
    this.measurements.set(key, measurement)
    if (this.measurements.size > ACTIVE_SELECTION_SHAPE_DOMAIN_CACHE_SIZE) {
      const oldestKey = this.measurements.keys().next().value
      if (typeof oldestKey !== 'string') throw new Error(this.t('shape.errors.emptyMeasurementCache'))
      this.measurements.delete(oldestKey)
    }

    return measurement
  }

  /** Atomically applies the calculated layout to live shapes and the shared frame. */
  public apply({
    children,
    frame,
    measurement
  }: {
    children: readonly ActiveSelectionScaleDomainChildMeasurement[]
    frame: ActiveSelectionScaleFrame
    measurement: ActiveSelectionScaleDomainMeasurement
  }): void {
    const previousGeometry = this._captureGeometry()

    try {
      this.controller.applyDomainScale({
        children,
        frame,
        measurement,
        selection: this.selection
      })
    } catch (error) {
      try {
        this._restoreState({ snapshots: previousGeometry })
      } catch {
        // The live-state application error remains primary after attempting to roll back all changes.
      }
      throw error
    }
  }

  /** Saves geometry only after validating the overall applied result. */
  public confirmAppliedState({
    measurement
  }: {
    measurement: ActiveSelectionScaleDomainMeasurement
  }): void {
    const confirmedGeometry = this._captureGeometry()

    this.controller.confirmDomainScale({ measurement, selection: this.selection })
    this.confirmedGeometry = confirmedGeometry
    this.confirmedMeasurement = measurement
  }

  /** Restores shapes and internal commit state to the last confirmed step. */
  public restoreConfirmedState(): void {
    this._restoreState({ snapshots: this.confirmedGeometry })
  }

  /** Saves the exact mutable geometry of all shapes in the current session. */
  private _captureGeometry(): readonly ShapeScalingGeometrySnapshot[] {
    return Object.freeze(this.targets.map((group) => captureShapeScalingGeometry({ t: this.t, group })))
  }

  /** Attempts to restore the geometry and internal state of all domain owners. */
  private _restoreState({
    snapshots
  }: {
    snapshots: readonly ShapeScalingGeometrySnapshot[]
  }): void {
    let didFail = false
    let firstFailure: unknown

    try {
      restoreShapeScalingSnapshots({ t: this.t, snapshots })
    } catch (error) {
      didFail = true
      firstFailure = error
    }

    try {
      this._restoreConfirmedControllerState()
    } catch (error) {
      if (!didFail) firstFailure = error
      didFail = true
    }

    if (didFail) throw firstFailure
  }

  /** Restores internal commit scales to the confirmed measurement, if one exists. */
  private _restoreConfirmedControllerState(): void {
    if (!this.confirmedMeasurement) return

    this.controller.confirmDomainScale({
      measurement: this.confirmedMeasurement,
      selection: this.selection
    })
  }
}
