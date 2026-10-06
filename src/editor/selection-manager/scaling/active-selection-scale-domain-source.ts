import type { FabricObject } from 'fabric'

import type {
  RectangularScaleGestureMode,
  RectangularScaleMultipliers,
  RectangularScalePoint
} from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'
import type { ObjectBounds } from '../../utils/geometry'

/** Actual geometry of one child, calculated by its domain manager. */
export type ActiveSelectionScaleDomainChildMeasurement = Readonly<{
  bounds: ObjectBounds
  center: RectangularScalePoint
  target: FabricObject
}>

/** Domain object geometry after applying valid canonical multipliers. */
export type ActiveSelectionScaleDomainMeasurement = Readonly<{
  children: readonly ActiveSelectionScaleDomainChildMeasurement[]
  multipliers: RectangularScaleMultipliers
}>

/** Final temporary frame compensating for domain object geometry during scaling. */
export type ActiveSelectionScaleFrame = Readonly<{
  center: RectangularScalePoint
  height: number
  scaleX: number
  scaleY: number
  width: number
}>

/**
 * Source of nonlinear domain object geometry within an active selection.
 * Calculation occurs before live objects are changed; application occurs once using the completed overall frame.
 */
export type ActiveSelectionScaleDomainSource = Readonly<{
  /** Applies the measurement atomically or preserves the previous geometry of all domain objects. */
  apply({
    children,
    frame,
    measurement
  }: {
    children: readonly ActiveSelectionScaleDomainChildMeasurement[]
    frame: ActiveSelectionScaleFrame
    measurement: ActiveSelectionScaleDomainMeasurement
  }): void
  /** Records the applied measurement only after the overall result has been validated. */
  confirmAppliedState({
    measurement
  }: {
    measurement: ActiveSelectionScaleDomainMeasurement
  }): void
  /** Calculates achievable geometry without changing live objects. */
  measure({
    mode,
    multipliers
  }: {
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
  }): ActiveSelectionScaleDomainMeasurement
  /** Synchronously restores domain objects to the last confirmed state. */
  restoreConfirmedState(): void
  /** Contains domain objects in an order that remains fixed for the current session. */
  targets: readonly FabricObject[]
}>
