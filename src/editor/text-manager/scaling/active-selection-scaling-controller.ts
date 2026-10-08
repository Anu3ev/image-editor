import {
  ActiveSelection,
  FabricImage,
  type Canvas,
  type FabricObject,
  type Transform
} from 'fabric'
import type CanvasManager from '../../canvas-manager'
import type {
  RectangularScaleGestureMode,
  RectangularScaleGestureProjection,
  RectangularScaleMultipliers
} from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'
import type { ScaleSnapPlan } from '../../snapping-manager/scaling/scale-snapping-resolver'
import type { EditorTextbox } from '../types'
import type {
  ActiveSelectionScaleDomainSource
} from '../../selection-manager/scaling/active-selection-scale-domain-source'
import { resolveCanonicalActiveSelectionTexts } from './active-selection-text-children'
import ActiveSelectionTextScaleMeasurer, {
  type ActiveSelectionTextScaleMeasurement
} from './active-selection-scale-measurer'
import {
  resolveActiveSelectionTextScaleStep,
  type ResolvedActiveSelectionTextScaleStep
} from './active-selection-scale-plan'

/** Handles actually displayed for a selection containing text. */
const ACTIVE_SELECTION_TEXT_SCALE_CONTROLS = Object.freeze(new Set([
  'tl',
  'tr',
  'bl',
  'br',
  'ml',
  'mr'
]))

/** Tolerance for checking canonical text and frame state. */
const ACTIVE_SELECTION_TEXT_SCALE_STATE_EPSILON = 0.000000001

/** Temporary state of one supported gesture on a selection containing text. */
type ActiveSelectionTextScalingSession = Readonly<{
  children: readonly FabricObject[]
  measurer: ActiveSelectionTextScaleMeasurer
  selection: ActiveSelection
  texts: readonly EditorTextbox[]
  transform: Transform
}>

/** Supported children of a selection whose nonlinear geometry is defined by text. */
type ActiveSelectionTextScalingContent = Readonly<{
  affineChildren: readonly FabricImage[]
  children: readonly FabricObject[]
  texts: readonly EditorTextbox[]
}>

/** Checks whether a number matches the expected canonical value. */
function isNear({ actual, expected }: { actual: number; expected: number }): boolean {
  return Number.isFinite(actual)
    && Number.isFinite(expected)
    && Math.abs(actual - expected) <= ACTIVE_SELECTION_TEXT_SCALE_STATE_EPSILON
}

/** Returns a canonical image that can change linearly with the shared frame. */
function resolveSupportedAffineImage({
  selection,
  target
}: {
  selection: ActiveSelection
  target: FabricObject
}): FabricImage | null {
  if (!(target instanceof FabricImage)) return null
  if (target.group !== selection) return null

  const protectedState = [
    target.parent,
    target.flipX,
    target.flipY,
    target.locked,
    target.lockScalingX,
    target.lockScalingY
  ]
  if (protectedState.some(Boolean)) return null

  const dimensions = [
    target.width,
    target.height,
    target.scaleX,
    target.scaleY
  ]
  if (!dimensions.every(Number.isFinite) || Math.min(...dimensions) <= 0) return null

  const transformValues = [
    target.angle ?? 0,
    target.skewX ?? 0,
    target.skewY ?? 0,
    target.strokeWidth ?? 0
  ]
  const isCanonical = transformValues.every((actual) => isNear({ actual, expected: 0 }))

  return isCanonical ? target : null
}

/** Returns supported text, images, and explicitly supplied domain objects. */
function resolveSupportedSelectionContent({
  domainTargets = [],
  selection
}: {
  domainTargets?: readonly FabricObject[]
  selection: ActiveSelection
}): ActiveSelectionTextScalingContent | null {
  if (!isNear({ actual: selection.scaleX ?? 1, expected: 1 })) return null
  if (!isNear({ actual: selection.scaleY ?? 1, expected: 1 })) return null

  const objects = selection.getObjects()
  if (objects.length < 2) return null

  const texts = resolveCanonicalActiveSelectionTexts({ selection })
  if (!texts) return null
  const textSet = new Set<FabricObject>(texts)
  const domainTargetSet = new Set(domainTargets)
  if (domainTargetSet.size !== domainTargets.length) return null
  if (domainTargets.some((target) => target.group !== selection || textSet.has(target))) return null
  const affineChildren: FabricImage[] = []
  for (const object of objects) {
    if (textSet.has(object) || domainTargetSet.has(object)) continue

    const image = resolveSupportedAffineImage({ selection, target: object })
    if (!image) return null
    affineChildren.push(image)
  }
  if (domainTargets.some((target) => !objects.includes(target))) return null

  return Object.freeze({
    affineChildren: Object.freeze(affineChildren),
    children: Object.freeze([...objects]),
    texts
  })
}

/** Manages a selection whose nonlinear geometry is defined by text objects. */
export default class TextActiveSelectionScalingController {
  /** The editor's Fabric canvas. */
  private readonly canvas: Canvas

  /** Canvas manager used when transferring calculated dimensions into text properties. */
  private readonly canvasManager: CanvasManager

  /** The single active session of the current temporary selection. */
  private session: ActiveSelectionTextScalingSession | null = null

  /** Creates the owner of the text portion of selection scaling. */
  constructor({
    canvas,
    canvasManager
  }: {
  canvas: Canvas
    canvasManager: CanvasManager
  }) {
    this.canvas = canvas
    this.canvasManager = canvasManager
  }

  /** Checks a canonical selection of text, images, and optional domain objects. */
  public supportsScaling({
    domainTargets,
    selection
  }: {
    domainTargets?: readonly FabricObject[]
    selection: ActiveSelection
  }): boolean {
    return resolveSupportedSelectionContent({ domainTargets, selection }) !== null
  }

  /** Captures the immutable start of a supported gesture before the first Fabric mutation. */
  public beginScaling({
    domainSource,
    projection,
    selection,
    transform
  }: {
    domainSource?: ActiveSelectionScaleDomainSource | null
    projection: RectangularScaleGestureProjection
    selection: ActiveSelection
    transform: Transform
  }): boolean {
    const content = resolveSupportedSelectionContent({
      domainTargets: domainSource?.targets,
      selection
    })
    if (!content || transform.target !== selection) return false
    if (!ACTIVE_SELECTION_TEXT_SCALE_CONTROLS.has(transform.corner)) return false
    if (this.session) throw new Error('A scaling session for the selection containing text has already started')

    const measurer = new ActiveSelectionTextScaleMeasurer({
      affineChildren: content.affineChildren,
      canvasManager: this.canvasManager,
      children: content.texts,
      domainSource,
      projection,
      selection,
      transform
    })
    this.session = Object.freeze({
      children: content.children,
      measurer,
      selection,
      texts: content.texts,
      transform
    })

    return true
  }

  /** Measures canonical geometry from the current pointer position. */
  public measureScale({
    mode,
    multipliers,
    selection
  }: {
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
    selection: ActiveSelection
  }): ActiveSelectionTextScaleMeasurement {
    return this._getSession({ selection }).measurer.measure({ mode, multipliers })
  }

  /** Refines the shared plan using actual bounds and wrapping of all text objects. */
  public resolveScaleStep({
    mode,
    plan,
    pointerMeasurement,
    selection
  }: {
    mode: RectangularScaleGestureMode
    plan: ScaleSnapPlan
    pointerMeasurement: ActiveSelectionTextScaleMeasurement
    selection: ActiveSelection
  }): ResolvedActiveSelectionTextScaleStep {
    const { measurer } = this._getSession({ selection })

    return resolveActiveSelectionTextScaleStep({
      measurer,
      mode,
      plan,
      pointerMeasurement
    })
  }

  /** Applies the measured state to child objects and the shared frame once. */
  public applyScalePreview({
    measurement,
    selection
  }: {
    measurement: ActiveSelectionTextScaleMeasurement
    selection: ActiveSelection
  }): RectangularScaleMultipliers {
    const { measurer } = this._getSession({ selection })
    measurer.apply({ measurement })
    this.canvas.requestRenderAll()

    return measurement.multipliers
  }

  /** Confirms the applied step after shared validation of actual geometry. */
  public confirmScalePreview({ selection }: { selection: ActiveSelection }): boolean {
    const { measurer } = this._getSession({ selection })

    return measurer.confirmAppliedMeasurement()
  }

  /** Checks calculated child geometry, preserving the snapshot until the overall commit is complete. */
  public commitScaling({
    selection
  }: {
    selection: ActiveSelection
  }): boolean {
    const { session } = this
    if (!session || session.selection !== selection) return false
    if (!session.measurer.hasConfirmedMeasurement()) {
      throw new Error('Committing a selection containing text requires a previously confirmed state')
    }

    const failures: unknown[] = []
    try {
      if (this.canvas.getActiveObject() === selection) {
        throw new Error('SelectionManager must remove the temporary frame before committing text objects')
      }
      this._assertCommittedTexts({ texts: session.texts })
    } catch (error) {
      failures.push(error)
    }

    for (const child of session.children) {
      try {
        child.setCoords()
      } catch (error) {
        failures.push(error)
      }
    }
    const [firstFailure] = failures
    if (failures.length > 0) throw firstFailure

    return true
  }

  /** Clears measurements from an interrupted or completed gesture. */
  public clearScaling({ selection }: { selection: ActiveSelection }): boolean {
    if (this.session?.selection !== selection) return false

    this._clearSession({ selection })

    return true
  }

  /** Checks that the current session has already confirmed calculated geometry. */
  public hasConfirmedScalePreview({ selection }: { selection: ActiveSelection }): boolean {
    if (this.session?.selection !== selection) return false

    return this.session.measurer.hasConfirmedMeasurement()
  }

  /** Restores the current gesture's last confirmed or original state. */
  public restoreScalePreview({ selection }: { selection: ActiveSelection }): boolean {
    if (this.session?.selection !== selection) return false

    const restored = this.session.measurer.restoreConfirmedMeasurement()
    if (restored) this.canvas.requestRenderAll()

    return restored
  }

  /** Releases the measurer when TextManager is destroyed. */
  public destroy(): void {
    if (!this.session) return

    this._clearSession({ selection: this.session.selection })
  }

  /** Returns the required active session for the supplied selection. */
  private _getSession({ selection }: { selection: ActiveSelection }): ActiveSelectionTextScalingSession {
    const { session } = this
    if (!session || session.selection !== selection) {
      throw new Error('Scaling a selection containing text must start from the original session')
    }

    return session
  }

  /** Checks that the temporary frame's scale has been fully transferred into canonical text properties. */
  private _assertCommittedTexts({ texts }: { texts: readonly EditorTextbox[] }): void {
    for (const child of texts) {
      const affineValues = [
        (child.scaleX ?? 1) - 1,
        (child.scaleY ?? 1) - 1,
        child.angle ?? 0,
        child.skewX ?? 0,
        child.skewY ?? 0
      ]
      if (!affineValues.every((value) => isNear({ actual: value, expected: 0 }))) {
        throw new Error('Each text object must have a canonical transform after commit')
      }
    }
  }

  /** Releases the measurer and removes the supplied selection's session. */
  private _clearSession({ selection }: { selection: ActiveSelection }): void {
    const { session } = this
    if (!session || session.selection !== selection) return

    session.measurer.dispose()
    this.session = null
  }
}
