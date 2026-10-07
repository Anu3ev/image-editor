/* eslint-disable no-use-before-define -- The public controller appears before internal result conversion helpers. */
import {
  ActiveSelection,
  FabricImage,
  Group,
  Textbox,
  type BasicTransformEvent,
  type FabricObject,
  type TPointerEvent
} from 'fabric'

import type { ImageEditor } from '../..'
import {
  createMovementGestureBaseline,
  createMovementGuideLines,
  type FinalMovementGeometry,
  type MovementRawIntent,
  type MovementSnapPlan,
  type MovementSnapVerification,
  type MovementTargetPosition
} from './movement-snapping-resolver'
import {
  MovementSnappingRuntime,
  type DuplicateMovementRuntimeStep
} from './movement-snapping-runtime'
import type {
  GuideLine,
  SpacingGuide
} from '../types'
import { getObjectExactBounds } from '../../utils/geometry'
import { isShapeGroup } from '../../shape-manager/domain/shape-reference'

/** Top-level objects already migrated to the shared movement logic. */
type SupportedMovementTarget = ActiveSelection | FabricImage | Group | Textbox

/** Canvas event for one movement step. */
type ObjectMovementTransformEvent = BasicTransformEvent<TPointerEvent> & {
  target?: FabricObject | null
  e?: TPointerEvent | null
}

/** The event remains on the legacy movement handling path. */
type UnhandledObjectMovementStep = Readonly<{
  handled: false
}>

/** The event was handled by the shared controller, including a step without guides. */
type HandledObjectMovementStep = Readonly<{
  handled: true
  guides: readonly GuideLine[]
  spacingGuides: readonly SpacingGuide[]
}>

/** Routing result for one movement step. */
type ObjectMovementStepResult = UnhandledObjectMovementStep | HandledObjectMovementStep

/** Immutable result for object types not yet migrated. */
const UNHANDLED_OBJECT_MOVEMENT_STEP: UnhandledObjectMovementStep = Object.freeze({
  handled: false
})

/**
 * Manages a shared snapping session when moving a single or composite object.
 * Other object types continue to use the legacy handling path.
 */
export class MovementSnappingController {
  private readonly _editor: ImageEditor

  private readonly _runtime = new MovementSnappingRuntime()

  private _activeTarget: SupportedMovementTarget | null = null

  /** Creates a movement controller for the current editor canvas. */
  constructor({
    editor
  }: {
    editor: ImageEditor
  }) {
    this._editor = editor
  }

  /** Starts a shared session only for a top-level object that has already been migrated. */
  startGesture({
    target
  }: {
    target?: FabricObject | null
  }): void {
    this.finishGesture()
    if (!this._isSupportedTarget(target)) return

    const bounds = getObjectExactBounds({ object: target })
    if (!bounds) {
      throw new Error('Object movement snapping requires exact target bounds')
    }

    const position = this._readTargetPosition({ target })
    const environment = this._editor.snappingManager.captureMovementSnapEnvironment({ activeObject: target })
    const baseline = createMovementGestureBaseline({
      bounds,
      position,
      environment
    })

    this._runtime.startSession({ baseline })
    this._activeTarget = target
  }

  /** Calculates, applies once, and verifies the current movement step. */
  handleObjectMoving({
    event
  }: {
    event: ObjectMovementTransformEvent
  }): ObjectMovementStepResult {
    const { target } = event
    const activeTarget = this._activeTarget
    if (!target || !activeTarget || target !== activeTarget) return UNHANDLED_OBJECT_MOVEMENT_STEP

    const marker = resolveMovementMarker({ event })
    const duplicate = this._runtime.getDuplicateStep({ marker })
    if (duplicate) return createDuplicateStepResult({ duplicate })

    const intent = this._createRawIntent({ target: activeTarget, event })
    const step = this._runtime.resolveMovementPlan({ marker, intent })
    if (step.kind === 'duplicate') return createDuplicateStepResult({ duplicate: step })

    this._applyMovementPlan({ target: activeTarget, plan: step.plan })
    const verification = this._runtime.verifyMovementPlan({
      token: step.token,
      finalGeometry: this._readFinalGeometry({ target: activeTarget })
    })

    return createHandledStepResult({ verification })
  }

  /** Idempotently clears temporary movement state. */
  finishGesture(): void {
    this._runtime.finishSession()
    this._activeTarget = null
  }

  /** Ends the session if the moving object or a child of the active selection is removed. */
  finishGestureForTarget({
    target
  }: {
    target: FabricObject
  }): boolean {
    const activeTarget = this._activeTarget
    const isActiveSelectionChild = activeTarget instanceof ActiveSelection
      && activeTarget.getObjects().includes(target)
    if (target !== activeTarget && !isActiveSelectionChild) return false

    this.finishGesture()

    return true
  }

  /** Allows regular movement of a supported top-level object. */
  private _isSupportedTarget(
    target?: FabricObject | null
  ): target is SupportedMovementTarget {
    if (!target || target.group) return false

    if (target instanceof ActiveSelection) {
      return this._isSupportedActiveSelection({ selection: target })
    }

    return target instanceof FabricImage || target instanceof Group || target instanceof Textbox
  }

  /** Checks the composition, parent relationships, and safe scale state of the active selection. */
  private _isSupportedActiveSelection({
    selection
  }: {
    selection: ActiveSelection
  }): boolean {
    const objects = selection.getObjects()
    if (objects.length < 2) return false
    if (
      objects.some((object) => object instanceof Textbox)
      && (selection.scaleX !== 1 || selection.scaleY !== 1)
    ) return false

    return objects.every((object) => {
      if (object.parent) return false

      return object instanceof FabricImage || object instanceof Textbox || isShapeGroup(object)
    })
  }

  /** Captures the object's position after Fabric movement but before snapping is applied. */
  private _createRawIntent({
    target,
    event
  }: {
    target: SupportedMovementTarget
    event: ObjectMovementTransformEvent
  }): MovementRawIntent {
    const bounds = getObjectExactBounds({ object: target })
    if (!bounds) {
      throw new Error('Object movement snapping requires exact raw bounds')
    }

    return {
      bounds,
      position: this._readTargetPosition({ target }),
      axes: {
        x: !target.lockMovementX,
        y: !target.lockMovementY
      },
      modifiers: {
        ctrlKey: Boolean(event.e?.ctrlKey)
      }
    }
  }

  /** Applies the calculated position once if it differs from the Fabric position. */
  private _applyMovementPlan({
    target,
    plan
  }: {
    target: SupportedMovementTarget
    plan: MovementSnapPlan
  }): void {
    const { left, top } = plan.nextPosition
    if (target.left === left && target.top === top) return

    target.set({ left, top })
    target.setCoords()
  }

  /** Reads the actual geometry after applying the plan exactly once. */
  private _readFinalGeometry({
    target
  }: {
    target: SupportedMovementTarget
  }): FinalMovementGeometry {
    const bounds = getObjectExactBounds({ object: target })
    if (!bounds) {
      throw new Error('Object movement snapping requires exact final bounds')
    }

    return {
      bounds,
      position: this._readTargetPosition({ target })
    }
  }

  /** Reads actual Fabric coordinates without substituting defaults. */
  private _readTargetPosition({
    target
  }: {
    target: SupportedMovementTarget
  }): MovementTargetPosition {
    if (!Number.isFinite(target.left) || !Number.isFinite(target.top)) {
      throw new Error('Object movement snapping requires finite target position')
    }

    return {
      left: target.left,
      top: target.top
    }
  }
}

/** Uses the browser event as the step marker, falling back to the canvas event. */
function resolveMovementMarker({
  event
}: {
  event: ObjectMovementTransformEvent
}): object {
  const { e } = event
  if ((typeof e === 'object' && e !== null) || typeof e === 'function') return e

  return event
}

/** Returns the already verified result without rereading the modified object. */
function createDuplicateStepResult({
  duplicate
}: {
  duplicate: DuplicateMovementRuntimeStep
}): HandledObjectMovementStep {
  if (!duplicate.verification) {
    throw new Error('Duplicate movement step cannot be handled before verification')
  }

  return createHandledStepResult({
    verification: duplicate.verification
  })
}

/** Converts the verified result to the SnappingManager rendering format. */
function createHandledStepResult({
  verification
}: {
  verification: MovementSnapVerification
}): HandledObjectMovementStep {
  return Object.freeze({
    handled: true,
    guides: Object.freeze(createMovementGuideLines({ guides: verification.guides })),
    spacingGuides: Object.freeze([...verification.spacingGuides])
  })
}
