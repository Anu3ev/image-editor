import {
  Point,
  util,
  type ActiveSelection,
  type FabricObject,
  type TMat2D,
  type Transform
} from 'fabric'
import { english, type Translate } from '../../i18n'
import type CanvasManager from '../../canvas-manager'
import type { ObjectPlacement } from '../../canvas-manager'
import {
  createRectangularScaleProjectionModes,
  createRectangularScaleValues,
  resolveRectangularScaleMultipliers,
  type RectangularScaleGestureMode,
  type RectangularScaleGestureProjection,
  type RectangularScaleMultipliers
} from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'
import type { ScaleProjectionModeInput } from '../../snapping-manager/scaling/scale-snapping-resolver'
import {
  createScaleProjection,
  resolveScaleProjection,
  type ScaleProjectionConstraint
} from '../../snapping-manager/scaling/scale-projection'
import type { ObjectBounds } from '../../utils/geometry'
import type {
  ActiveSelectionScaleDomainChildMeasurement,
  ActiveSelectionScaleDomainMeasurement,
  ActiveSelectionScaleDomainSource,
  ActiveSelectionScaleFrame
} from '../../selection-manager/scaling/active-selection-scale-domain-source'
import type { EditorTextbox, TextScaleBaseState } from '../types'
import {
  captureTextScaleBase,
  commitStandaloneTextboxScale,
  resolveMinimumTextScalingBounds
} from './text-scaling-materialization'
import { createTextScalingMeasurementTextbox } from './text-scaling-measurement'
import {
  areTextCornerScaleCanonicalStatesEqual,
  captureTextCornerScaleCanonicalState,
  type TextCornerScaleCanonicalState
} from './text-corner-scale-state'
import {
  createActiveSelectionTextScaleStepProjection,
  type ActiveSelectionTextScaleProjectionSample
} from './active-selection-scale-projection'
import {
  captureActiveSelectionScaleLiveState,
  restoreActiveSelectionScaleLiveState,
  type ActiveSelectionScaleLiveState
} from './active-selection-scale-live-state'

/** Point in the selection's immutable local plane. */
type ActiveSelectionTextScalePoint = Readonly<{ x: number; y: number }>

/** Canonical state and position of one text object at a measured step. */
export type ActiveSelectionTextScaleChildMeasurement = Readonly<{
  canonicalState: TextCornerScaleCanonicalState
  center: ActiveSelectionTextScalePoint
  target: EditorTextbox
}>

/** Linear geometry of a non-text child at a measured step. */
export type ActiveSelectionAffineScaleChildMeasurement = Readonly<{
  center: ActiveSelectionTextScalePoint
  scaleX: number
  scaleY: number
  target: FabricObject
}>

/** Exact canonical geometry of all children for one set of multipliers. */
export type ActiveSelectionTextScaleMeasurement = Readonly<{
  affineChildren: readonly ActiveSelectionAffineScaleChildMeasurement[]
  bounds: ObjectBounds
  children: readonly ActiveSelectionTextScaleChildMeasurement[]
  domainChildren: readonly ActiveSelectionScaleDomainChildMeasurement[]
  domainMeasurement: ActiveSelectionScaleDomainMeasurement | null
  frame: ActiveSelectionScaleFrame
  mode: RectangularScaleGestureMode
  multipliers: RectangularScaleMultipliers
  projection: ReturnType<typeof createActiveSelectionTextScaleStepProjection>
  values: readonly number[]
}>

/** Initial state of one live text object and one measurement copy. */
type ActiveSelectionTextScaleItem = Readonly<{
  base: TextScaleBaseState
  measurementTextbox: EditorTextbox
  placement: ObjectPlacement
  startCenter: ActiveSelectionTextScalePoint
  target: EditorTextbox
}>

/** Original non-text child geometry that changes linearly with the frame. */
type ActiveSelectionAffineScaleItem = Readonly<{
  height: number
  scaleX: number
  scaleY: number
  startCenter: ActiveSelectionTextScalePoint
  target: FabricObject
  width: number
}>

/** Canonical geometry before constructing the local linear projection. */
type ActiveSelectionTextCanonicalGeometry = Omit<ActiveSelectionTextScaleMeasurement, 'projection'>

/** Minimum multipliers permitted for all text objects in the selection. */
type ActiveSelectionTextMinimumMultipliers = Readonly<{
  font: number
  proportional: number
  width: number
}>

/** Immutable frame properties at gesture start. */
type ActiveSelectionTextScaleBaseline = Readonly<{
  angle: number
  fixedAnchor: ActiveSelectionTextScalePoint
  fixedAnchorLocal: ActiveSelectionTextScalePoint
  height: number
  matrix: TMat2D
  width: number
}>

/** Small step for building the local relationship between edges and multipliers. */
const ACTIVE_SELECTION_TEXT_SCALE_MEASUREMENT_STEP = 0.01

/** Maximum number of step increases when searching for distinguishable geometry. */
const MAX_ACTIVE_SELECTION_TEXT_SCALE_NEIGHBOR_STEPS = 8

/** Maximum number of refinements of canonical multipliers based on pointer position. */
const MAX_ACTIVE_SELECTION_TEXT_POINTER_REFINEMENT_STEPS = 8

/** Number of measurements retained between movements in one gesture. */
const ACTIVE_SELECTION_TEXT_SCALE_CACHE_SIZE = 16

/** Number of canonical geometries retained for the primary and neighboring measurements. */
const ACTIVE_SELECTION_TEXT_SCALE_GEOMETRY_CACHE_SIZE = 48

/** Tolerance for validating measured and applied geometry. */
const ACTIVE_SELECTION_TEXT_SCALE_MEASUREMENT_EPSILON = 0.000001

/** Creates exact bounds from four coordinates. */
function createBounds({
  t = english,
  bottom,
  left,
  right,
  top
}: {
  t?: Translate
  bottom: number
  left: number
  right: number
  top: number
}): ObjectBounds {
  if (![bottom, left, right, top].every(Number.isFinite) || right <= left || bottom <= top) {
    throw new Error(t('text.errors.invalidMeasuredSelectionSize'))
  }

  return Object.freeze({
    bottom,
    left,
    right,
    top,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2
  })
}

/** Creates a local frame for the measured selection relative to its original dimensions. */
function createSelectionScaleFrame({
  baseline,
  bounds
}: {
  baseline: ActiveSelectionTextScaleBaseline
  bounds: ObjectBounds
}): ActiveSelectionScaleFrame {
  const width = bounds.right - bounds.left
  const height = bounds.bottom - bounds.top

  return Object.freeze({
    center: Object.freeze({ x: bounds.centerX, y: bounds.centerY }),
    height,
    scaleX: width / baseline.width,
    scaleY: height / baseline.height,
    width
  })
}

/** Combines the exact bounds of all measured children in the selection. */
function mergeBounds({ t = english, bounds }: { t?: Translate; bounds: readonly ObjectBounds[] }): ObjectBounds {
  if (bounds.length < 2) throw new Error(t('text.errors.selectionMeasurementRequiresTwoObjects'))

  return createBounds({
    t,
    bottom: Math.max(...bounds.map(({ bottom }) => bottom)),
    left: Math.min(...bounds.map(({ left }) => left)),
    right: Math.max(...bounds.map(({ right }) => right)),
    top: Math.min(...bounds.map(({ top }) => top))
  })
}

/** Converts a Fabric anchor point into an offset from the frame center. */
function resolveOriginOffset({
  t = english,
  origin
}: {
  t?: Translate
  origin: Transform['originX'] | Transform['originY']
}): number {
  if (origin === 'left' || origin === 'top') return -0.5
  if (origin === 'right' || origin === 'bottom') return 0.5
  if (origin === 'center') return 0
  if (typeof origin === 'number' && Number.isFinite(origin)) return origin - 0.5

  throw new Error(t('text.errors.unsupportedSelectionScaleAnchor'))
}

/** Returns the offset that aligns the measured frame's fixed point with its position at gesture start. */
function resolveFrameTranslation({
  t = english,
  bounds,
  fixedAnchor,
  transform
}: {
  t?: Translate
  bounds: ObjectBounds
  fixedAnchor: ActiveSelectionTextScalePoint
  transform: Transform
}): ActiveSelectionTextScalePoint {
  const width = bounds.right - bounds.left
  const height = bounds.bottom - bounds.top
  const originX = bounds.centerX + (resolveOriginOffset({ t, origin: transform.originX }) * width)
  const originY = bounds.centerY + (resolveOriginOffset({ t, origin: transform.originY }) * height)

  return Object.freeze({ x: fixedAnchor.x - originX, y: fixedAnchor.y - originY })
}

/** Calculates the child's center relative to the original frame's fixed point. */
function resolveScaledChildCenter({
  fixedAnchor,
  multipliers,
  startCenter
}: {
  fixedAnchor: ActiveSelectionTextScalePoint
  multipliers: RectangularScaleMultipliers
  startCenter: ActiveSelectionTextScalePoint
}): ActiveSelectionTextScalePoint {
  return Object.freeze({
    x: fixedAnchor.x + ((startCenter.x - fixedAnchor.x) * multipliers.x),
    y: fixedAnchor.y + ((startCenter.y - fixedAnchor.y) * multipliers.y)
  })
}

/** Translates the measured domain geometry together with the final selection frame. */
function translateDomainChildren({
  t = english,
  children,
  translation
}: {
  t?: Translate
  children: readonly ActiveSelectionScaleDomainChildMeasurement[]
  translation: ActiveSelectionTextScalePoint
}): readonly ActiveSelectionScaleDomainChildMeasurement[] {
  return Object.freeze(children.map(({ bounds, center, target }) => Object.freeze({
    bounds: createBounds({
      t,
      bottom: bounds.bottom + translation.y,
      left: bounds.left + translation.x,
      right: bounds.right + translation.x,
      top: bounds.top + translation.y
    }),
    center: Object.freeze({
      x: center.x + translation.x,
      y: center.y + translation.y
    }),
    target
  })))
}

/** Projects the local frame through the selection's original rotation and position. */
function projectLocalBoundsToScene({
  t = english,
  bounds,
  matrix
}: {
  t?: Translate
  bounds: ObjectBounds
  matrix: TMat2D
}): ObjectBounds {
  const corners = [
    new Point(bounds.left, bounds.top),
    new Point(bounds.right, bounds.top),
    new Point(bounds.right, bounds.bottom),
    new Point(bounds.left, bounds.bottom)
  ].map((point) => point.transform(matrix))

  return createBounds({
    t,
    bottom: Math.max(...corners.map(({ y }) => y)),
    left: Math.min(...corners.map(({ x }) => x)),
    right: Math.max(...corners.map(({ x }) => x)),
    top: Math.min(...corners.map(({ y }) => y))
  })
}

/** Compares two finite numbers within the measurement tolerance. */
function areNumbersNear({ first, second }: { first: number; second: number }): boolean {
  return Number.isFinite(first)
    && Number.isFinite(second)
    && Math.abs(first - second) <= ACTIVE_SELECTION_TEXT_SCALE_MEASUREMENT_EPSILON
}

/** Checks that the measured frame reached all dimensions specified by the pointer. */
function didReachPointerFrameConstraints({
  constraints,
  geometry
}: {
  constraints: readonly ScaleProjectionConstraint[]
  geometry: ActiveSelectionTextCanonicalGeometry
}): boolean {
  return constraints.every(({ edge, position }) => {
    const actual = edge === 'right' ? geometry.frame.scaleX : geometry.frame.scaleY

    return areNumbersNear({ first: actual, second: position })
  })
}

/** Checks that remeasurement did not change the canonical multipliers. */
function haveSameCanonicalValues({
  first,
  second
}: {
  first: readonly number[]
  second: readonly number[]
}): boolean {
  if (first.length !== second.length) return false

  return first.every((value, index) => areNumbersNear({ first: value, second: second[index] }))
}

/** Measures and applies the canonical text geometry of a single selection. */
export default class ActiveSelectionTextScaleMeasurer {
  /** Translator bound to the owning editor instance. */
  private readonly t: Translate

  /** Non-text children that must retain linear resizing. */
  private readonly affineItems: readonly ActiveSelectionAffineScaleItem[]

  /** Immutable frame at gesture start. */
  private readonly baseline: ActiveSelectionTextScaleBaseline

  /** Canvas manager used when transferring calculated dimensions into text properties. */
  private readonly canvasManager: CanvasManager

  /** Domain geometry for children that cannot be treated as ordinary linear objects. */
  private readonly domainSource: ActiveSelectionScaleDomainSource | null

  /** Live text objects and their independent measurement copies. */
  private readonly items: readonly ActiveSelectionTextScaleItem[]

  /** Shared minimum multipliers for all text objects. */
  private readonly minimums: ActiveSelectionTextMinimumMultipliers

  /** Shared rectangular-projection modes for the current handle. */
  private readonly projectionModes: readonly ScaleProjectionModeInput[]

  /** Canonical-multiplier measurements used when refining snapping. */
  private readonly canonicalMeasurements = new Map<string, ActiveSelectionTextScaleMeasurement>()

  /** Measurements corresponding to the pointer position in the current gesture. */
  private readonly pointerMeasurements = new Map<string, ActiveSelectionTextScaleMeasurement>()

  /** Canonical geometry of primary and neighboring measurements without recalculating text. */
  private readonly canonicalGeometries = new Map<string, ActiveSelectionTextCanonicalGeometry>()

  /** Selection to which the session belongs. */
  private readonly selection: ActiveSelection

  /** Original Fabric transform. */
  private readonly transform: Transform

  /** Last confirmed measurement of the current gesture. */
  private lastConfirmedMeasurement: ActiveSelectionTextScaleMeasurement | null = null

  /** Measurement awaiting confirmation after shared guide validation. */
  private pendingMeasurement: ActiveSelectionTextScaleMeasurement | null = null

  /** Direct snapshot of live objects after the last confirmed step. */
  private confirmedLiveState: ActiveSelectionScaleLiveState

  /** Creates a measurer from the immutable start of a supported gesture. */
  constructor({
    t = english,
    affineChildren = [],
    canvasManager,
    children,
    domainSource = null,
    projection,
    selection,
    transform
  }: {
  t?: Translate
    affineChildren?: readonly FabricObject[]
    canvasManager: CanvasManager
    children: readonly EditorTextbox[]
    domainSource?: ActiveSelectionScaleDomainSource | null
    projection: RectangularScaleGestureProjection
    selection: ActiveSelection
    transform: Transform
  }) {
    this.t = t

    if (children.length < 1) throw new Error(this.t('text.errors.compositionScaleRequiresText'))
    if (children.length + affineChildren.length + (domainSource?.targets.length ?? 0) < 2) {
      throw new Error(this.t('text.errors.selectionScaleRequiresTwoObjects'))
    }

    this.canvasManager = canvasManager
    this.domainSource = domainSource
    this.selection = selection
    this.transform = transform
    this.projectionModes = createRectangularScaleProjectionModes({ t: this.t, projection })
    this.baseline = this._captureBaseline({ projection, selection })
    this.items = Object.freeze(children.map((target) => this._createItem({ target })))
    this.affineItems = Object.freeze(affineChildren.map((target) => this._createAffineItem({ target })))
    this.minimums = this._resolveMinimumMultipliers()
    this.confirmedLiveState = captureActiveSelectionScaleLiveState({
      affineChildren,
      selection,
      texts: children,
      transform
    })
  }

  /** Returns the exact canonical state for the current pointer multipliers. */
  public measure({
    mode,
    multipliers
  }: {
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
  }): ActiveSelectionTextScaleMeasurement {
    const requestedMultipliers = this._resolveSupportedMultipliers({ mode, multipliers })
    const requestedValues = createRectangularScaleValues({ mode, multipliers: requestedMultipliers })
    const key = this._createMeasurementKey({ mode, values: requestedValues })
    const cached = this.pointerMeasurements.get(key)
    if (cached) return cached

    const geometry = this._resolvePointerGeometry({
      mode,
      rawMultipliers: multipliers,
      requestedMultipliers
    })
    const measurement = this._measureCanonicalMultipliers({ mode, multipliers: geometry.multipliers })
    this._rememberMeasurement({ cache: this.pointerMeasurements, key, measurement })

    return measurement
  }

  /** Measures state using the refined plan's canonical values. */
  public measureValues({
    mode,
    values
  }: {
    mode: RectangularScaleGestureMode
    values: readonly number[]
  }): ActiveSelectionTextScaleMeasurement {
    return this._measureCanonicalMultipliers({
      mode,
      multipliers: resolveRectangularScaleMultipliers({
        t: this.t,
        projectionMode: mode,
        effectiveValues: values
      })
    })
  }

  /** Transfers the measured canonical state into live text objects and the frame once. */
  public apply({ measurement }: { measurement: ActiveSelectionTextScaleMeasurement }): void {
    try {
      this._applyMeasurement({ measurement })
      this.pendingMeasurement = measurement
    } catch (error) {
      try {
        this._restoreConfirmedLiveState()
      } catch {
        // The application error remains primary after attempting to restore all geometry owners.
      }
      throw error
    }
  }

  /** Checks whether at least one measured state has been confirmed. */
  public hasConfirmedMeasurement(): boolean {
    return this.lastConfirmedMeasurement !== null
  }

  /** Returns the current gesture's last confirmed state without remeasurement. */
  public getLastConfirmedMeasurement(): ActiveSelectionTextScaleMeasurement | null {
    return this.lastConfirmedMeasurement
  }

  /** Advances the pending measurement after shared validation of actual geometry. */
  public confirmAppliedMeasurement(): boolean {
    const measurement = this.pendingMeasurement
    if (!measurement) return false

    const confirmedLiveState = this._captureCurrentLiveState()

    if (measurement.domainMeasurement) {
      if (!this.domainSource) throw new Error(this.t('text.errors.geometryConfirmationRequiresSource'))

      this.domainSource.confirmAppliedState({ measurement: measurement.domainMeasurement })
    }

    this.confirmedLiveState = confirmedLiveState
    this.lastConfirmedMeasurement = measurement
    this.pendingMeasurement = null

    return true
  }

  /** Restores the last confirmed state or the gesture's original geometry. */
  public restoreConfirmedMeasurement(): boolean {
    this._restoreConfirmedLiveState()
    this.pendingMeasurement = null

    return true
  }

  /** Releases measurement text objects and the current gesture's cache. */
  public dispose(): void {
    this.canonicalGeometries.clear()
    this.canonicalMeasurements.clear()
    this.pointerMeasurements.clear()
    this.items.forEach(({ measurementTextbox }) => measurementTextbox.dispose())
    this.lastConfirmedMeasurement = null
    this.pendingMeasurement = null
  }

  /** Saves the current geometry of text, images, the frame, and the Fabric transform. */
  private _captureCurrentLiveState(): ActiveSelectionScaleLiveState {
    return captureActiveSelectionScaleLiveState({
      affineChildren: this.affineItems.map(({ target }) => target),
      selection: this.selection,
      texts: this.items.map(({ target }) => target),
      transform: this.transform
    })
  }

  /** Synchronously restores all geometry owners to the confirmed snapshot. */
  private _restoreConfirmedLiveState(): void {
    let didFail = false
    let firstFailure: unknown

    try {
      restoreActiveSelectionScaleLiveState({ state: this.confirmedLiveState })
    } catch (error) {
      didFail = true
      firstFailure = error
    }

    try {
      this.domainSource?.restoreConfirmedState()
    } catch (error) {
      if (!didFail) firstFailure = error
      didFail = true
    }

    if (didFail) throw firstFailure
  }

  /** Applies one previously validated measurement to all geometry owners. */
  private _applyMeasurement({
    measurement
  }: {
    measurement: ActiveSelectionTextScaleMeasurement
  }): void {
    const { frame } = measurement

    this._applySelectionFrame({ frame })
    this._applyTextMeasurements({ measurement })
    this._applyAffineMeasurements({ measurement })
    this._applyDomainMeasurement({ measurement })

    this.transform.scaleX = this.selection.scaleX
    this.transform.scaleY = this.selection.scaleY
    this.selection.setCoords()
    this._assertAppliedMeasurement({ measurement })
  }

  /** Applies the measurement frame relative to the original fixed point. */
  private _applySelectionFrame({ frame }: { frame: ActiveSelectionScaleFrame }): void {
    const fixedAnchor = new Point(this.baseline.fixedAnchor.x, this.baseline.fixedAnchor.y)
    this.selection.set({
      angle: this.baseline.angle,
      flipX: false,
      flipY: false,
      height: this.baseline.height,
      scaleX: frame.scaleX,
      scaleY: frame.scaleY,
      skewX: 0,
      skewY: 0,
      width: this.baseline.width
    })
    this.selection.setPositionByOrigin(fixedAnchor, this.transform.originX, this.transform.originY)
  }

  /** Applies the canonical state of each standalone text object. */
  private _applyTextMeasurements({
    measurement
  }: {
    measurement: ActiveSelectionTextScaleMeasurement
  }): void {
    const { frame } = measurement
    measurement.children.forEach((childMeasurement, index) => {
      const item = this.items[index]
      if (!item || item.target !== childMeasurement.target) {
        throw new Error(this.t('text.errors.measuredTextOrderMismatch'))
      }

      this._applyChildMeasurement({
        childMeasurement,
        frame,
        item,
        mode: measurement.mode
      })
    })
  }

  /** Applies linear image geometry within the selection. */
  private _applyAffineMeasurements({
    measurement
  }: {
    measurement: ActiveSelectionTextScaleMeasurement
  }): void {
    const { frame } = measurement
    measurement.affineChildren.forEach((childMeasurement, index) => {
      const item = this.affineItems[index]
      if (!item || item.target !== childMeasurement.target) {
        throw new Error(this.t('text.errors.affineGeometryOrderMismatch'))
      }

      this._applyAffineChildMeasurement({ childMeasurement, frame, item })
    })
  }

  /** Passes the calculated shape geometry to its domain owner. */
  private _applyDomainMeasurement({
    measurement
  }: {
    measurement: ActiveSelectionTextScaleMeasurement
  }): void {
    if (!measurement.domainMeasurement) return
    if (!this.domainSource) {
      throw new Error(this.t('text.errors.measuredGeometryRequiresApplicationSource'))
    }

    this.domainSource.apply({
      children: measurement.domainChildren,
      frame: measurement.frame,
      measurement: measurement.domainMeasurement
    })
  }

  /** Saves the original frame and maps the fixed point into its local plane. */
  private _captureBaseline({
    projection,
    selection
  }: {
    projection: RectangularScaleGestureProjection
    selection: ActiveSelection
  }): ActiveSelectionTextScaleBaseline {
    const matrix = [...selection.calcTransformMatrix()] as TMat2D
    if (!matrix.every(Number.isFinite)) throw new Error(this.t('text.errors.invalidSelectionMatrix'))

    const fixedAnchorLocal = new Point(projection.fixedAnchor.x, projection.fixedAnchor.y)
      .transform(util.invertTransform(matrix))

    return Object.freeze({
      angle: selection.angle ?? 0,
      fixedAnchor: Object.freeze({ ...projection.fixedAnchor }),
      fixedAnchorLocal: Object.freeze({ x: fixedAnchorLocal.x, y: fixedAnchorLocal.y }),
      height: selection.height,
      matrix,
      width: selection.width
    })
  }

  /** Creates a measurement copy and saves the live text object's original state. */
  private _createItem({ target }: { target: EditorTextbox }): ActiveSelectionTextScaleItem {
    const measurementTextbox = createTextScalingMeasurementTextbox({ t: this.t, target })

    return Object.freeze({
      base: captureTextScaleBase({ textbox: target }),
      measurementTextbox,
      placement: this.canvasManager.getObjectPlacement({ object: target }),
      startCenter: Object.freeze({ ...target.getRelativeCenterPoint() }),
      target
    })
  }

  /** Saves a non-text child's original dimensions and position in the selection's local plane. */
  private _createAffineItem({ target }: { target: FabricObject }): ActiveSelectionAffineScaleItem {
    const hasUnsupportedState = [
      target.parent,
      target.flipX,
      target.flipY,
      target.locked,
      target.lockScalingX,
      target.lockScalingY
    ].some(Boolean)
    const canonicalValues = [target.angle ?? 0, target.skewX ?? 0, target.skewY ?? 0, target.strokeWidth ?? 0]
    if (target.group !== this.selection || hasUnsupportedState
      || canonicalValues.some((value) => !areNumbersNear({ first: value, second: 0 }))) {
      throw new Error(this.t('text.errors.noncanonicalAffineChildTransform'))
    }

    const width = target.width * target.scaleX
    const height = target.height * target.scaleY
    if (![width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
      throw new Error(this.t('text.errors.invalidAffineChildSize'))
    }

    return Object.freeze({
      height,
      scaleX: target.scaleX,
      scaleY: target.scaleY,
      startCenter: Object.freeze({ ...target.getRelativeCenterPoint() }),
      target,
      width
    })
  }

  /** Returns the strictest width and font-size constraints across all text objects. */
  private _resolveMinimumMultipliers(): ActiveSelectionTextMinimumMultipliers {
    let width = 0
    let font = 0
    let proportional = 0

    this.items.forEach(({ base }) => {
      const minimum = resolveMinimumTextScalingBounds({ base })
      width = Math.max(width, minimum.widthScale)
      font = Math.max(font, minimum.fontScale)
      proportional = Math.max(proportional, minimum.proportionalScale)
    })

    return Object.freeze({ font, proportional, width })
  }

  /** Constrains multipliers by the minimum sizes of text and other domain objects. */
  private _resolveSupportedMultipliers({
    mode,
    multipliers
  }: {
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
  }): RectangularScaleMultipliers {
    if (mode === 'vertical') throw new Error(this.t('text.errors.verticalSelectionControlsHidden'))

    let resolved: RectangularScaleMultipliers
    if (mode === 'uniform') {
      const scale = Math.max(this.minimums.proportional, multipliers.x)
      resolved = Object.freeze({ x: scale, y: scale })
    } else if (mode === 'horizontal') {
      resolved = Object.freeze({ x: Math.max(this.minimums.width, multipliers.x), y: 1 })
    } else {
      resolved = Object.freeze({
        x: Math.max(this.minimums.width, multipliers.x),
        y: Math.max(this.minimums.font, multipliers.y)
      })
    }

    const domainMeasurement = this.domainSource?.measure({ mode, multipliers: resolved })
    if (!domainMeasurement) return resolved

    this._assertDomainMultipliers({ mode, requested: resolved, resolved: domainMeasurement.multipliers })

    return domainMeasurement.multipliers
  }

  /** Checks that the domain source only tightened the selected mode's constraints. */
  private _assertDomainMultipliers({
    mode,
    requested,
    resolved
  }: {
    mode: RectangularScaleGestureMode
    requested: RectangularScaleMultipliers
    resolved: RectangularScaleMultipliers
  }): void {
    if (![resolved.x, resolved.y].every(Number.isFinite) || Math.min(resolved.x, resolved.y) <= 0) {
      throw new Error(this.t('text.errors.invalidDomainMultipliers'))
    }
    if (resolved.x < requested.x - ACTIVE_SELECTION_TEXT_SCALE_MEASUREMENT_EPSILON
      || resolved.y < requested.y - ACTIVE_SELECTION_TEXT_SCALE_MEASUREMENT_EPSILON) {
      throw new Error(this.t('text.errors.domainWeakenedTextConstraints'))
    }
    if (mode === 'uniform' && !areNumbersNear({ first: resolved.x, second: resolved.y })) {
      throw new Error(this.t('text.errors.uniformScaleMultiplierMismatch'))
    }
    if (mode === 'horizontal' && !areNumbersNear({ first: resolved.y, second: 1 })) {
      throw new Error(this.t('text.errors.horizontalScaleChangedVerticalMultiplier'))
    }
  }

  /** Checks the order and membership of children measured by the domain source. */
  private _assertDomainChildren({
    measurement
  }: {
    measurement: ActiveSelectionScaleDomainMeasurement
  }): void {
    const sourceTargets = this.domainSource?.targets
    if (!sourceTargets || sourceTargets.length !== measurement.children.length) {
      throw new Error(this.t('text.errors.domainMeasurementMissingObjects'))
    }

    const matchesSource = measurement.children.every(({ target }, index) => {
      return target === sourceTargets[index]
    })
    if (!matchesSource) {
      throw new Error(this.t('text.errors.domainObjectOrderMismatch'))
    }
  }

  /** Returns the current handle's projection mode. */
  private _resolveProjectionMode({ mode }: { mode: RectangularScaleGestureMode }): ScaleProjectionModeInput {
    const projectionMode = this.projectionModes.find(({ id }) => id === mode)
    if (!projectionMode) throw new Error(this.t('text.errors.missingSelectedScaleProjection'))

    return projectionMode
  }

  /** Returns the complete measurement for exact canonical multipliers. */
  private _measureCanonicalMultipliers({
    mode,
    multipliers
  }: {
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
  }): ActiveSelectionTextScaleMeasurement {
    const appliedMultipliers = this._resolveSupportedMultipliers({ mode, multipliers })
    const values = createRectangularScaleValues({ mode, multipliers: appliedMultipliers })
    const key = this._createMeasurementKey({ mode, values })
    const cached = this.canonicalMeasurements.get(key)
    if (cached) return cached

    const geometry = this._measureCanonicalGeometry({ mode, multipliers: appliedMultipliers })
    const projectionMode = this._resolveProjectionMode({ mode })
    const samples = this._createProjectionSamples({ geometry, projectionMode })
    const projection = createActiveSelectionTextScaleStepProjection({
      t: this.t,
      bounds: geometry.bounds,
      projectionMode,
      samples,
      values: geometry.values
    })
    const measurement = Object.freeze({ ...geometry, projection })
    this._rememberMeasurement({ cache: this.canonicalMeasurements, key, measurement })

    return measurement
  }

  /** Saves a measurement and removes the oldest entry when the cache overflows. */
  private _rememberMeasurement({
    cache,
    key,
    measurement
  }: {
    cache: Map<string, ActiveSelectionTextScaleMeasurement>
    key: string
    measurement: ActiveSelectionTextScaleMeasurement
  }): void {
    cache.set(key, measurement)
    if (cache.size <= ACTIVE_SELECTION_TEXT_SCALE_CACHE_SIZE) return

    const oldestKey = cache.keys().next().value
    if (typeof oldestKey !== 'string') throw new Error(this.t('text.errors.emptySelectionMeasurementCache'))
    cache.delete(oldestKey)
  }

  /** Creates a measurement key that includes each text object's current auto-expansion mode. */
  private _createMeasurementKey({
    mode,
    values
  }: {
    mode: RectangularScaleGestureMode
    values: readonly number[]
  }): string {
    const autoExpandState = this.items
      .map(({ target }) => {
        return target.autoExpand === false ? 'fixed' : 'auto'
      })
      .join(':')

    return `${autoExpandState}:${mode}:${values.join(':')}`
  }

  /** Finds canonical multipliers that make the visible frame follow the pointer. */
  private _resolvePointerGeometry({
    mode,
    rawMultipliers,
    requestedMultipliers
  }: {
    mode: RectangularScaleGestureMode
    rawMultipliers: RectangularScaleMultipliers
    requestedMultipliers: RectangularScaleMultipliers
  }): ActiveSelectionTextCanonicalGeometry {
    const constraints = this._createPointerFrameConstraints({
      mode,
      rawMultipliers,
      requestedMultipliers
    })
    let geometry = this._measureCanonicalGeometry({ mode, multipliers: requestedMultipliers })
    if (constraints.length === 0) return geometry

    for (let step = 0; step < MAX_ACTIVE_SELECTION_TEXT_POINTER_REFINEMENT_STEPS; step += 1) {
      if (didReachPointerFrameConstraints({ constraints, geometry })) return geometry

      const nextMultipliers = this._resolvePointerCorrection({ constraints, geometry, mode })
      if (!nextMultipliers) return geometry

      const nextGeometry = this._measureCanonicalGeometry({ mode, multipliers: nextMultipliers })
      if (haveSameCanonicalValues({ first: nextGeometry.values, second: geometry.values })) return geometry
      geometry = nextGeometry
    }

    return geometry
  }

  /** Describes the frame dimensions that should correspond to the pointer position. */
  private _createPointerFrameConstraints({
    mode,
    rawMultipliers,
    requestedMultipliers
  }: {
    mode: RectangularScaleGestureMode
    rawMultipliers: RectangularScaleMultipliers
    requestedMultipliers: RectangularScaleMultipliers
  }): readonly ScaleProjectionConstraint[] {
    const constraints: ScaleProjectionConstraint[] = []
    const widthReachedMinimum = !areNumbersNear({ first: rawMultipliers.x, second: requestedMultipliers.x })
    const heightReachedMinimum = !areNumbersNear({ first: rawMultipliers.y, second: requestedMultipliers.y })

    if (!widthReachedMinimum) {
      constraints.push({ axis: 'x', edge: 'right', position: requestedMultipliers.x })
    }
    if (mode === 'free' && !heightReachedMinimum) {
      constraints.push({ axis: 'y', edge: 'bottom', position: requestedMultipliers.y })
    }

    return Object.freeze(constraints.map((constraint) => Object.freeze(constraint)))
  }

  /** Calculates the next multipliers from the local dependence of frame size on text. */
  private _resolvePointerCorrection({
    constraints,
    geometry,
    mode
  }: {
    constraints: readonly ScaleProjectionConstraint[]
    geometry: ActiveSelectionTextCanonicalGeometry
    mode: RectangularScaleGestureMode
  }): RectangularScaleMultipliers | null {
    const projectionMode = this._resolveProjectionMode({ mode })
    const samples = this._createNeighborGeometries({ geometry, projectionMode })
    const frameEdges = mode === 'free'
      ? (['right', 'bottom'] as const)
      : (['right'] as const)
    const projection = createScaleProjection({
      t: this.t,
      bounds: createBounds({
        t: this.t,
        bottom: geometry.frame.scaleY,
        left: 0,
        right: geometry.frame.scaleX,
        top: 0
      }),
      input: {
        variables: projectionMode.projection.variables,
        baselineValues: geometry.values,
        variableSceneWeights: projectionMode.projection.variableSceneWeights,
        edges: frameEdges.map((edge) => Object.freeze({
          edge,
          coefficients: Object.freeze(samples.map((sample, variableIndex) => {
            const current = edge === 'right' ? geometry.frame.scaleX : geometry.frame.scaleY
            const neighboring = edge === 'right' ? sample.frame.scaleX : sample.frame.scaleY
            const valueDelta = sample.values[variableIndex] - geometry.values[variableIndex]

            return (neighboring - current) / valueDelta
          }))
        }))
      }
    })
    const solution = resolveScaleProjection({
      t: this.t,
      projection,
      rawValues: geometry.values,
      constraints,
      epsilon: ACTIVE_SELECTION_TEXT_SCALE_MEASUREMENT_EPSILON
    })
    if (!solution) return null

    const multipliers = resolveRectangularScaleMultipliers({
      t: this.t,
      projectionMode: mode,
      effectiveValues: solution.values
    })

    return this._resolveSupportedMultipliers({ mode, multipliers })
  }

  /** Measures canonical text objects and the final frame without modifying the live selection. */
  private _measureCanonicalGeometry({
    mode,
    multipliers
  }: {
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
  }): ActiveSelectionTextCanonicalGeometry {
    const values = createRectangularScaleValues({ mode, multipliers })
    const key = this._createMeasurementKey({ mode, values })
    const cached = this.canonicalGeometries.get(key)
    if (cached) return cached

    const geometry = this._createCanonicalGeometry({ mode, multipliers })
    this.canonicalGeometries.set(key, geometry)
    if (this.canonicalGeometries.size > ACTIVE_SELECTION_TEXT_SCALE_GEOMETRY_CACHE_SIZE) {
      const oldestKey = this.canonicalGeometries.keys().next().value
      if (typeof oldestKey !== 'string') throw new Error(this.t('text.errors.emptyGeometryCache'))
      this.canonicalGeometries.delete(oldestKey)
    }

    return geometry
  }

  /** Calculates canonical text objects and the final frame for a new set of multipliers. */
  private _createCanonicalGeometry({
    mode,
    multipliers
  }: {
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
  }): ActiveSelectionTextCanonicalGeometry {
    const measuredChildren = this.items.map((item) => this._measureChild({ item, mode, multipliers }))
    const measuredAffineChildren = this.affineItems.map((item) => {
      return this._measureAffineChild({ item, multipliers })
    })
    const domainMeasurement = this._measureDomainGeometry({ mode, multipliers })
    const merged = mergeBounds({
      t: this.t,
      bounds: [
        ...measuredChildren.map(({ bounds }) => bounds),
        ...measuredAffineChildren.map(({ bounds }) => bounds),
        ...domainMeasurement?.children.map(({ bounds }) => bounds) ?? []
      ]
    })
    const translation = resolveFrameTranslation({
      t: this.t,
      bounds: merged,
      fixedAnchor: this.baseline.fixedAnchorLocal,
      transform: this.transform
    })
    const localBounds = createBounds({
      t: this.t,
      bottom: merged.bottom + translation.y,
      left: merged.left + translation.x,
      right: merged.right + translation.x,
      top: merged.top + translation.y
    })

    return Object.freeze({
      affineChildren: Object.freeze(measuredAffineChildren.map(({ bounds: _bounds, ...child }) => {
        return Object.freeze({
          ...child,
          center: Object.freeze({
            x: child.center.x + translation.x,
            y: child.center.y + translation.y
          })
        })
      })),
      bounds: projectLocalBoundsToScene({ t: this.t, bounds: localBounds, matrix: this.baseline.matrix }),
      children: Object.freeze(measuredChildren.map(({ bounds: _bounds, ...child }) => Object.freeze({
        ...child,
        center: Object.freeze({
          x: child.center.x + translation.x,
          y: child.center.y + translation.y
        })
      }))),
      domainChildren: translateDomainChildren({
        t: this.t,
        children: domainMeasurement?.children ?? [],
        translation
      }),
      domainMeasurement,
      frame: createSelectionScaleFrame({ baseline: this.baseline, bounds: localBounds }),
      mode,
      multipliers,
      values: createRectangularScaleValues({ mode, multipliers })
    })
  }

  /** Measures and validates additional-domain geometry for the selected multipliers. */
  private _measureDomainGeometry({
    mode,
    multipliers
  }: {
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
  }): ActiveSelectionScaleDomainMeasurement | null {
    const measurement = this.domainSource?.measure({ mode, multipliers }) ?? null
    if (!measurement) return null

    this._assertDomainChildren({ measurement })
    this._assertDomainMultipliers({
      mode,
      requested: multipliers,
      resolved: measurement.multipliers
    })
    const matchesRequested = areNumbersNear({ first: measurement.multipliers.x, second: multipliers.x })
      && areNumbersNear({ first: measurement.multipliers.y, second: multipliers.y })
    if (!matchesRequested) {
      throw new Error(this.t('text.errors.domainGeometryMultiplierMismatch'))
    }

    return measurement
  }

  /** Calculates a non-text child's linear geometry from the immutable gesture start. */
  private _measureAffineChild({
    item,
    multipliers
  }: {
    item: ActiveSelectionAffineScaleItem
    multipliers: RectangularScaleMultipliers
  }): ActiveSelectionAffineScaleChildMeasurement & Readonly<{ bounds: ObjectBounds }> {
    const center = resolveScaledChildCenter({
      fixedAnchor: this.baseline.fixedAnchorLocal,
      multipliers,
      startCenter: item.startCenter
    })
    const width = item.width * multipliers.x
    const height = item.height * multipliers.y

    return Object.freeze({
      bounds: createBounds({
        t: this.t,
        bottom: center.y + (height / 2),
        left: center.x - (width / 2),
        right: center.x + (width / 2),
        top: center.y - (height / 2)
      }),
      center,
      scaleX: item.scaleX * multipliers.x,
      scaleY: item.scaleY * multipliers.y,
      target: item.target
    })
  }

  /** Materializes one measurement text object from the immutable gesture start. */
  private _measureChild({
    item,
    mode,
    multipliers
  }: {
    item: ActiveSelectionTextScaleItem
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
  }): ActiveSelectionTextScaleChildMeasurement & Readonly<{ bounds: ObjectBounds }> {
    item.measurementTextbox.autoExpand = item.target.autoExpand !== false

    const center = resolveScaledChildCenter({
      fixedAnchor: this.baseline.fixedAnchorLocal,
      multipliers,
      startCenter: item.startCenter
    })

    commitStandaloneTextboxScale({
      textbox: item.measurementTextbox,
      canvasManager: this.canvasManager,
      base: item.base,
      widthScale: multipliers.x,
      heightScale: multipliers.y,
      placement: {
        left: center.x,
        top: center.y,
        originX: 'center',
        originY: 'center'
      },
      shouldScaleFontSize: multipliers.y !== 1,
      shouldScalePadding: multipliers.y !== 1,
      shouldScaleRadii: multipliers.y !== 1,
      shouldDisableAutoExpandOnHorizontalChange: mode === 'horizontal' || mode === 'free',
      shouldRoundDimensions: false
    })

    const bounds = item.measurementTextbox.getBoundingRect()

    return Object.freeze({
      bounds: createBounds({
        t: this.t,
        bottom: bounds.top + bounds.height,
        left: bounds.left,
        right: bounds.left + bounds.width,
        top: bounds.top
      }),
      canonicalState: captureTextCornerScaleCanonicalState({ textbox: item.measurementTextbox }),
      center,
      target: item.target
    })
  }

  /** Builds one distinguishable neighboring measurement for each degree of freedom. */
  private _createProjectionSamples({
    geometry,
    projectionMode
  }: {
    geometry: ActiveSelectionTextCanonicalGeometry
    projectionMode: ScaleProjectionModeInput
  }): readonly ActiveSelectionTextScaleProjectionSample[] {
    const samples = this._createNeighborGeometries({ geometry, projectionMode })

    return Object.freeze(samples.map(({ bounds, values }) => Object.freeze({ bounds, values })))
  }

  /** Builds one distinguishable neighboring measurement for each degree of freedom. */
  private _createNeighborGeometries({
    geometry,
    projectionMode
  }: {
    geometry: ActiveSelectionTextCanonicalGeometry
    projectionMode: ScaleProjectionModeInput
  }): readonly ActiveSelectionTextCanonicalGeometry[] {
    return Object.freeze(geometry.values.map((_value, variableIndex) => {
      return this._createNeighborGeometry({ geometry, projectionMode, variableIndex })
    }))
  }

  /** Finds a neighboring value at which at least one participating edge changes. */
  private _createNeighborGeometry({
    geometry,
    projectionMode,
    variableIndex
  }: {
    geometry: ActiveSelectionTextCanonicalGeometry
    projectionMode: ScaleProjectionModeInput
    variableIndex: number
  }): ActiveSelectionTextCanonicalGeometry {
    for (let step = 0; step < MAX_ACTIVE_SELECTION_TEXT_SCALE_NEIGHBOR_STEPS; step += 1) {
      const values = [...geometry.values]
      values[variableIndex] += ACTIVE_SELECTION_TEXT_SCALE_MEASUREMENT_STEP * (2 ** step)
      const multipliers = resolveRectangularScaleMultipliers({
        t: this.t,
        projectionMode: geometry.mode,
        effectiveValues: values
      })
      const sample = this._measureCanonicalGeometry({
        mode: geometry.mode,
        multipliers: this._resolveSupportedMultipliers({ mode: geometry.mode, multipliers })
      })
      const changesGeometry = projectionMode.projection.edges.some(({ edge }) => {
        return !areNumbersNear({ first: sample.bounds[edge], second: geometry.bounds[edge] })
      })

      if (changesGeometry) return sample
    }

    throw new Error(this.t('text.errors.noDistinctSelectionScaleGeometry'))
  }

  /** Applies canonical properties and compensates for the shared frame's temporary scale. */
  private _applyChildMeasurement({
    childMeasurement,
    frame,
    item,
    mode
  }: {
    childMeasurement: ActiveSelectionTextScaleChildMeasurement
    frame: ActiveSelectionScaleFrame
    item: ActiveSelectionTextScaleItem
    mode: RectangularScaleGestureMode
  }): void {
    const { target } = item
    target.set({ angle: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 })
    commitStandaloneTextboxScale({
      textbox: target,
      canvasManager: this.canvasManager,
      base: item.base,
      widthScale: childMeasurement.canonicalState.width / item.base.width,
      heightScale: childMeasurement.canonicalState.fontSize / item.base.fontSize,
      placement: item.placement,
      shouldScaleFontSize: childMeasurement.canonicalState.fontSize !== item.base.fontSize,
      shouldScalePadding: childMeasurement.canonicalState.fontSize !== item.base.fontSize,
      shouldScaleRadii: childMeasurement.canonicalState.fontSize !== item.base.fontSize,
      shouldDisableAutoExpandOnHorizontalChange: mode === 'horizontal' || mode === 'free',
      shouldRoundDimensions: false
    })

    target.set({ preserveExactTextGeometry: true })
    this._applyChildFrameCompensation({
      center: childMeasurement.center,
      frame,
      scaleX: 1,
      scaleY: 1,
      target
    })
  }

  /** Compensates for the shared frame's scale, preserving the linear child's calculated geometry. */
  private _applyAffineChildMeasurement({
    childMeasurement,
    frame,
    item
  }: {
    childMeasurement: ActiveSelectionAffineScaleChildMeasurement
    frame: ActiveSelectionScaleFrame
    item: ActiveSelectionAffineScaleItem
  }): void {
    this._applyChildFrameCompensation({
      center: childMeasurement.center,
      frame,
      scaleX: childMeasurement.scaleX,
      scaleY: childMeasurement.scaleY,
      target: item.target
    })
  }

  /** Compensates for the temporary frame, preserving the child's measured scale and center. */
  private _applyChildFrameCompensation({
    center,
    frame,
    scaleX,
    scaleY,
    target
  }: {
    center: ActiveSelectionTextScalePoint
    frame: ActiveSelectionScaleFrame
    scaleX: number
    scaleY: number
    target: FabricObject
  }): void {
    target.set({ scaleX: scaleX / frame.scaleX, scaleY: scaleY / frame.scaleY })
    target.setPositionByOrigin(new Point(
      (center.x - frame.center.x) / frame.scaleX,
      (center.y - frame.center.y) / frame.scaleY
    ), 'center', 'center')
    target.setCoords()
  }

  /** Checks the frame and canonical properties after a single application. */
  private _assertAppliedMeasurement({
    measurement
  }: {
    measurement: ActiveSelectionTextScaleMeasurement
  }): void {
    const bounds = this.selection.getBoundingRect()
    const actualBounds = createBounds({
      t: this.t,
      bottom: bounds.top + bounds.height,
      left: bounds.left,
      right: bounds.left + bounds.width,
      top: bounds.top
    })
    const boundsMatch = (['left', 'right', 'top', 'bottom'] as const).every((edge) => {
      return areNumbersNear({ first: actualBounds[edge], second: measurement.bounds[edge] })
    })
    if (!boundsMatch) throw new Error(this.t('text.errors.selectionFrameMeasurementMismatch'))

    const visibleChildrenBounds = this._readVisibleChildrenLocalBounds({ measurement })
    const expectedChildrenBounds = createBounds({
      t: this.t,
      bottom: measurement.frame.center.y + (measurement.frame.height / 2),
      left: measurement.frame.center.x - (measurement.frame.width / 2),
      right: measurement.frame.center.x + (measurement.frame.width / 2),
      top: measurement.frame.center.y - (measurement.frame.height / 2)
    })
    const visibleChildrenMatch = (['left', 'right', 'top', 'bottom'] as const).every((edge) => {
      return areNumbersNear({ first: visibleChildrenBounds[edge], second: expectedChildrenBounds[edge] })
    })
    if (!visibleChildrenMatch) {
      throw new Error(this.t('text.errors.visibleChildBoundsMismatch'))
    }

    measurement.children.forEach(({ canonicalState, target }) => {
      const expectedState = {
        ...canonicalState,
        scaleX: 1 / measurement.frame.scaleX,
        scaleY: 1 / measurement.frame.scaleY
      }
      const actualState = captureTextCornerScaleCanonicalState({ textbox: target })
      if (!areTextCornerScaleCanonicalStatesEqual({ actual: actualState, expected: expectedState })) {
        throw new Error(this.t('text.errors.liveCanonicalStateMismatch'))
      }
    })

    this._assertAppliedAffineChildren({ measurement })
  }

  /** Checks linear children's scale and position after applying the measurement. */
  private _assertAppliedAffineChildren({
    measurement
  }: {
    measurement: ActiveSelectionTextScaleMeasurement
  }): void {
    measurement.affineChildren.forEach((child) => {
      const expectedCenter = new Point(
        (child.center.x - measurement.frame.center.x) / measurement.frame.scaleX,
        (child.center.y - measurement.frame.center.y) / measurement.frame.scaleY
      )
      const actualCenter = child.target.getRelativeCenterPoint()
      const scaleMatches = areNumbersNear({
        first: child.target.scaleX,
        second: child.scaleX / measurement.frame.scaleX
      }) && areNumbersNear({
        first: child.target.scaleY,
        second: child.scaleY / measurement.frame.scaleY
      })
      const centerMatches = areNumbersNear({ first: actualCenter.x, second: expectedCenter.x })
        && areNumbersNear({ first: actualCenter.y, second: expectedCenter.y })
      if (!scaleMatches || !centerMatches) {
        throw new Error(this.t('text.errors.affineChildGeometryMismatch'))
      }
    })
  }

  /** Combines the visible bounds of all children in the selection's original local plane. */
  private _readVisibleChildrenLocalBounds({
    measurement
  }: {
    measurement: ActiveSelectionTextScaleMeasurement
  }): ObjectBounds {
    const inverseBaseline = util.invertTransform(this.baseline.matrix)
    const targets = [
      ...measurement.children.map(({ target }) => target),
      ...measurement.affineChildren.map(({ target }) => target),
      ...measurement.domainChildren.map(({ target }) => target)
    ]
    const points = targets.flatMap((target) => {
      return target.getCoords().map((point) => point.transform(inverseBaseline))
    })

    return createBounds({
      t: this.t,
      bottom: Math.max(...points.map(({ y }) => y)),
      left: Math.min(...points.map(({ x }) => x)),
      right: Math.max(...points.map(({ x }) => x)),
      top: Math.min(...points.map(({ y }) => y))
    })
  }
}
