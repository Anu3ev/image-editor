/* eslint-disable no-use-before-define -- The public controller appears before internal validation helpers. */
import {
  FabricImage,
  type FabricObject,
  type TPointerEvent,
  type Transform
} from 'fabric'
import { english, type Translate } from '../../i18n'

import type { ImageEditor } from '../..'
import {
  type RectangularScaleGestureMode,
  type RectangularScaleGestureProjection,
  type RectangularScaleGestureTransform,
  type RectangularScaleMultipliers,
  type RectangularScalePoint
} from './rectangular-scale-gesture-projection'
import type { ScaleRawIntent, VerifiedScaleGuide } from './scale-snapping-resolver'
import type { ScaleSnappingRuntime } from './scale-snapping-runtime'
import {
  applyRectangularScalePlan,
  readAppliedRectangularScaleMultipliers,
  readFinalRectangularScaleGeometry,
  resolveRectangularScaleStepInput,
  type RectangularScaleIntentSource
} from './rectangular-scale-interaction'
import {
  didSideScaleSwitchToSkew,
  isStandardRectangularScaleControl
} from './standard-scale-control'

/** Fabric event data required for one image scaling step. */
export type ImageScaleInteractionEvent = Readonly<{
  target?: FabricObject | null
  e?: TPointerEvent | null
  transform?: Transform | null
  pointer?: RectangularScalePoint
  scenePoint?: RectangularScalePoint
}>

/** Mouse-down event for which Fabric has already created the selected control's transform. */
export type ImageScaleStartEvent = ImageScaleInteractionEvent

/** `object:scaling` event for the current image scaling step. */
export type ImageScaleTransformEvent = ImageScaleInteractionEvent

/** `mouse:move` event that can replace a missing `object:scaling` event. */
export type ImageScaleMouseMoveEvent = ImageScaleInteractionEvent

/** The event should be handled by the legacy scaling owner. */
export type UnhandledImageScaleStep = Readonly<{
  handled: false
  didFinishSession: boolean
}>

/** The event was fully handled by the new image scaling owner. */
export type HandledImageScaleStep = Readonly<{
  handled: true
  guides: readonly VerifiedScaleGuide[]
  shouldPublishGuides: boolean
}>

/** Routing result for one image scaling step. */
export type ImageScaleStepResult = UnhandledImageScaleStep | HandledImageScaleStep

/** Image and Fabric transform properties that must not change during scaling. */
type ImageScaleProtectedState = Readonly<{
  action: Transform['action']
  angle: number
  controlKey: string
  cropX: number
  cropY: number
  flipX: boolean
  flipY: boolean
  height: number
  originX: Transform['originX']
  originY: Transform['originY']
  skewX: number
  skewY: number
  strokeUniform: boolean
  strokeWidth: number
  targetOriginX: FabricImage['originX']
  targetOriginY: FabricImage['originY']
  width: number
}>

/** Validated data for one supported image scaling gesture. */
type ImageScaleGesture = Readonly<{
  projectionTransform: RectangularScaleGestureTransform
  target: FabricImage
  transform: Transform
}>

/** Temporary state of one active image scaling gesture. */
type ImageScaleSession = Readonly<{
  projection: RectangularScaleGestureProjection
  protectedState: ImageScaleProtectedState
  runtime: ScaleSnappingRuntime
  target: FabricImage
  transform: Transform
}>

/** Immutable response when no active unified session exists. */
const UNHANDLED_IMAGE_SCALE_STEP: UnhandledImageScaleStep = Object.freeze({
  handled: false,
  didFinishSession: false
})

/** Tolerance for comparing scale factors and protected image properties. */
const IMAGE_SCALE_STATE_EPSILON = 0.000000001

/**
 * Owns the unified scaling session for a single top-level FabricImage.
 * Unsupported geometry states and nonstandard controls remain on the legacy path.
 */
export class ImageScaleSnappingController {
  /** Editor with canvas and shared snapping context. */
  private readonly _editor: ImageEditor

  /** Current supported gesture, or null for the legacy scenario. */
  private _session: ImageScaleSession | null = null

  /** Creates the image scaling owner for the current canvas. */
  constructor({
    editor
  }: {
    editor: ImageEditor
  }) {
    this._editor = editor
  }

  /** Captures the immutable initial state of a supported gesture. */
  startGesture({
    event
  }: {
    event: ImageScaleStartEvent
  }): boolean {
    this.finishGesture()

    const gesture = resolveImageScaleGesture({ event })
    const pointerStart = event.scenePoint ?? event.pointer
    if (!gesture || !pointerStart) return false

    const snappingSession = this._editor.snappingManager.startRectangularScaleSnappingSession({
      pointerStart,
      transform: gesture.projectionTransform
    })
    if (!snappingSession) return false

    const { projection, runtime } = snappingSession
    this._session = Object.freeze({
      projection,
      protectedState: captureProtectedImageScaleState(gesture),
      runtime,
      target: gesture.target,
      transform: gesture.transform
    })
    return true
  }

  /** Handles the raw scale already applied by the standard Fabric handler. */
  handleObjectScaling({
    event
  }: {
    event: ImageScaleTransformEvent
  }): ImageScaleStepResult {
    return this._handleScaleStep({
      event,
      intentSource: 'fabric-preview'
    })
  }

  /** Handles a new mouse movement if Fabric did not emit `object:scaling`. */
  handleCanvasMouseMove({
    event
  }: {
    event: ImageScaleMouseMoveEvent
  }): ImageScaleStepResult {
    return this._handleScaleStep({
      event,
      intentSource: 'pointer-projection'
    })
  }

  /** Idempotently ends the temporary scaling session and reports cleanup. */
  finishGesture(): boolean {
    const didCleanup = this._session?.runtime.finishSession().didCleanup ?? false
    this._session = null

    return didCleanup
  }

  /** Interrupts the active Fabric transform and ensures session cleanup. */
  interruptGesture({
    event
  }: {
    event?: TPointerEvent
  } = {}): boolean {
    if (!this._session) return false

    try {
      this._editor.canvas.endCurrentTransform(event)
    } finally {
      this.finishGesture()
    }

    return true
  }

  /** Ends the scaling session only if its active image was removed. */
  finishGestureForTarget({
    target
  }: {
    target: FabricObject
  }): boolean {
    if (!this._session || this._session.target !== target) return false

    this.finishGesture()

    return true
  }

  /** Performs one scaling step or delegates it entirely to the legacy owner. */
  private _handleScaleStep({
    event,
    intentSource
  }: {
    event: ImageScaleInteractionEvent
    intentSource: RectangularScaleIntentSource
  }): ImageScaleStepResult {
    const { _session: session } = this
    if (!session) return UNHANDLED_IMAGE_SCALE_STEP

    const marker = resolveScaleMarker({ event })
    const duplicate = session.runtime.getDuplicateStep({ marker })
    if (duplicate) return createDuplicateImageScaleStep({ t: this._editor.t, duplicate })

    const pointerEvent = event.e
    if (!pointerEvent) return this._continueWithLegacyScale()
    if (!doesEventBelongToSession({ event, session })) return this._continueWithLegacyScale()
    if (didSideScaleSwitchToSkew({
      controlKey: session.projection.controlKey,
      pointerEvent,
      target: session.target
    })) return this._finishBeforeSkew()
    if (!isSameImageScaleGesture({ session })) return this._continueWithLegacyScale()

    const stepInput = resolveRectangularScaleStepInput({
      canvas: this._editor.canvas,
      event,
      intentSource,
      projection: session.projection,
      target: session.target
    })
    if (!stepInput) return this._continueWithLegacyScale()

    return this._applyScaleStep({
      intent: stepInput.intent,
      marker,
      mode: stepInput.mode,
      session
    })
  }

  /** Calculates, applies once, and verifies the current image scaling step. */
  private _applyScaleStep({
    intent,
    marker,
    mode,
    session
  }: {
    intent: ScaleRawIntent
    marker: object
    mode: RectangularScaleGestureMode
    session: ImageScaleSession
  }): HandledImageScaleStep {
    const step = session.runtime.resolveScalePlan({ marker, intent })
    if (step.kind === 'duplicate') {
      throw new Error(this._editor.t('snapping.imageScale.stepBecameDuplicate'))
    }

    try {
      applyRectangularScalePlan({
        t: this._editor.t,
        plan: step.plan,
        projection: session.projection,
        target: session.target,
        transform: session.transform
      })
      const appliedMultipliers = readAppliedRectangularScaleMultipliers({
        t: this._editor.t,
        projection: session.projection,
        target: session.target
      })
      const finalGeometry = readFinalRectangularScaleGeometry({
        t: this._editor.t,
        mode,
        multipliers: appliedMultipliers,
        plan: step.plan,
        protectedStatePreserved: isProtectedImageScaleStatePreserved({
          mode,
          multipliers: appliedMultipliers,
          session
        }),
        target: session.target,
        transform: session.transform
      })
      const verification = session.runtime.verifyScalePlan({
        token: step.token,
        finalGeometry
      })
      if (didImageScaleChange({ multipliers: appliedMultipliers })) {
        session.transform.actionPerformed = true
      }

      return createHandledImageScaleStep({
        guides: verification.guides,
        shouldPublishGuides: true
      })
    } catch (error) {
      this.finishGesture()
      throw error
    }
  }

  /** Ends the unified session before starting the legacy scaling logic. */
  private _continueWithLegacyScale(): UnhandledImageScaleStep {
    return Object.freeze({
      handled: false,
      didFinishSession: this.finishGesture()
    })
  }

  /** Ends the session without running the legacy scaling logic over Fabric skewing. */
  private _finishBeforeSkew(): HandledImageScaleStep {
    return createHandledImageScaleStep({
      guides: [],
      shouldPublishGuides: this.finishGesture()
    })
  }
}

/** Validates `mouse:down` and returns data for supported image scaling. */
function resolveImageScaleGesture({
  event
}: {
  event: ImageScaleStartEvent
}): ImageScaleGesture | null {
  const { target, transform } = event
  if (!(target instanceof FabricImage) || !transform) return null
  if (transform.target !== target || !isSupportedImageScaleTarget({ target })) return null
  if (!isStandardRectangularScaleControl({ target, transform })) return null

  return Object.freeze({
    projectionTransform: Object.freeze({
      target,
      action: transform.action,
      corner: transform.corner,
      originX: transform.originX,
      originY: transform.originY,
      original: Object.freeze({
        scaleX: transform.original.scaleX,
        scaleY: transform.original.scaleY
      })
    }),
    target,
    transform
  })
}

/** Checks the domain and geometry constraints of the new scaling owner. */
function isSupportedImageScaleTarget({
  target
}: {
  target: FabricImage
}): boolean {
  const hasUnsupportedState = [
    target.group,
    target.parent,
    target.flipX,
    target.flipY,
    target.lockScalingX,
    target.lockScalingY
  ].some(Boolean)
  if (hasUnsupportedState) return false

  const finiteValues = [
    target.width,
    target.height,
    target.angle ?? 0,
    target.skewX ?? 0,
    target.skewY ?? 0,
    target.strokeWidth ?? 0,
    target.cropX ?? 0,
    target.cropY ?? 0
  ]
  if (!finiteValues.every(Number.isFinite)) return false
  if (target.width <= 0 || target.height <= 0) return false

  const skewValues = [target.skewX ?? 0, target.skewY ?? 0]
  if (!skewValues.every((value) => {
    return Math.abs(value) <= IMAGE_SCALE_STATE_EPSILON
  })) return false

  if (!target.strokeUniform) return true

  return Math.abs(target.strokeWidth ?? 0) <= IMAGE_SCALE_STATE_EPSILON
}

/** Captures canonical and geometric properties that must remain unchanged. */
function captureProtectedImageScaleState({
  target,
  transform
}: Pick<ImageScaleGesture, 'target' | 'transform'>): ImageScaleProtectedState {
  return Object.freeze({
    action: transform.action,
    angle: target.angle ?? 0,
    controlKey: transform.corner,
    cropX: target.cropX ?? 0,
    cropY: target.cropY ?? 0,
    flipX: Boolean(target.flipX),
    flipY: Boolean(target.flipY),
    height: target.height,
    originX: transform.originX,
    originY: transform.originY,
    skewX: target.skewX ?? 0,
    skewY: target.skewY ?? 0,
    strokeUniform: Boolean(target.strokeUniform),
    strokeWidth: target.strokeWidth ?? 0,
    targetOriginX: target.originX,
    targetOriginY: target.originY,
    width: target.width
  })
}

/** Checks that the event belongs to the original image and Fabric transform. */
function doesEventBelongToSession({
  event,
  session
}: {
  event: ImageScaleInteractionEvent
  session: ImageScaleSession
}): boolean {
  if (event.transform !== session.transform) return false
  if (event.target && event.target !== session.target) return false

  return true
}

/** Checks that Fabric has not switched the current gesture to another transform. */
function isSameImageScaleGesture({
  session
}: {
  session: ImageScaleSession
}): boolean {
  const { protectedState, target, transform } = session

  return transform.action === protectedState.action
    && transform.corner === protectedState.controlKey
    && transform.originX === protectedState.originX
    && transform.originY === protectedState.originY
    && areNumbersNear({ first: target.angle ?? 0, second: protectedState.angle })
    && areNumbersNear({ first: target.skewX ?? 0, second: protectedState.skewX })
    && areNumbersNear({ first: target.skewY ?? 0, second: protectedState.skewY })
    && Boolean(target.flipX) === protectedState.flipX
    && Boolean(target.flipY) === protectedState.flipY
}

/** Checks canonical image properties and unchanged scaling axes. */
function isProtectedImageScaleStatePreserved({
  mode,
  multipliers,
  session
}: {
  mode: RectangularScaleGestureMode
  multipliers: RectangularScaleMultipliers
  session: ImageScaleSession
}): boolean {
  if (!isCanonicalImageScaleStatePreserved({ session })) return false
  if (mode === 'horizontal') return areNumbersNear({ first: multipliers.y, second: 1 })
  if (mode === 'vertical') return areNumbersNear({ first: multipliers.x, second: 1 })
  if (mode === 'uniform') {
    return areNumbersNear({ first: multipliers.x, second: multipliers.y })
  }

  return true
}

/** Checks canonical and geometric properties that must remain unchanged. */
function isCanonicalImageScaleStatePreserved({
  session
}: {
  session: ImageScaleSession
}): boolean {
  const { protectedState, target } = session

  return isSameImageScaleGesture({ session })
    && areNumbersNear({ first: target.width, second: protectedState.width })
    && areNumbersNear({ first: target.height, second: protectedState.height })
    && areNumbersNear({ first: target.cropX ?? 0, second: protectedState.cropX })
    && areNumbersNear({ first: target.cropY ?? 0, second: protectedState.cropY })
    && areNumbersNear({ first: target.strokeWidth ?? 0, second: protectedState.strokeWidth })
    && Boolean(target.strokeUniform) === protectedState.strokeUniform
    && target.originX === protectedState.targetOriginX
    && target.originY === protectedState.targetOriginY
}

/** Checks whether scale on at least one axis has changed since the gesture began. */
function didImageScaleChange({
  multipliers
}: {
  multipliers: RectangularScaleMultipliers
}): boolean {
  return !areNumbersNear({ first: multipliers.x, second: 1 })
    || !areNumbersNear({ first: multipliers.y, second: 1 })
}

/** Compares two finite numbers within the protected state tolerance. */
function areNumbersNear({
  first,
  second
}: {
  first: number
  second: number
}): boolean {
  return Number.isFinite(first)
    && Number.isFinite(second)
    && Math.abs(first - second) <= IMAGE_SCALE_STATE_EPSILON
}

/** Uses the original pointer event as the step identifier, falling back to the canvas event. */
function resolveScaleMarker({
  event
}: {
  event: ImageScaleInteractionEvent
}): object {
  const { e } = event
  if ((typeof e === 'object' && e !== null) || typeof e === 'function') return e

  return event
}

/** Builds a response without republishing an already verified step. */
function createDuplicateImageScaleStep({
  t = english,
  duplicate
}: {
  t?: Translate
  duplicate: NonNullable<ReturnType<ScaleSnappingRuntime['getDuplicateStep']>>
}): HandledImageScaleStep {
  if (!duplicate.verification) {
    throw new Error(t('snapping.imageScale.duplicateStepVerificationRequired'))
  }

  return createHandledImageScaleStep({
    guides: duplicate.verification.guides,
    shouldPublishGuides: false
  })
}

/** Builds a SnappingManager response using only verified guides. */
function createHandledImageScaleStep({
  guides,
  shouldPublishGuides
}: {
  guides: readonly VerifiedScaleGuide[]
  shouldPublishGuides: boolean
}): HandledImageScaleStep {
  return Object.freeze({
    handled: true,
    guides: Object.freeze([...guides]),
    shouldPublishGuides
  })
}
