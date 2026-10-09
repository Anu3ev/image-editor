import {
  Control,
  Point,
  controlsUtils,
  type Canvas,
  type CanvasEvents,
  type Rect,
  type TPointerEvent,
  type TPointerEventInfo,
  type Transform
} from 'fabric'

import type SnappingManager from '../../snapping-manager'
import {
  createRectangularScaleValues,
  resolveRectangularScalePointerMultipliers,
  type RectangularScaleGestureMode,
  type RectangularScaleMultipliers
} from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'
import type { FinalScaleGeometry, ScaleSnapPlan } from '../../snapping-manager/scaling/scale-snapping-resolver'
import { CropFrame } from '../domain/crop-frame'
import { resolveCropFrameResizePreserveAspectRatio } from '../domain/crop-resize-mode'
import { applyCropFrameTransformState, getCropFrameTransformState } from '../domain/crop-frame-transform-state'
import {
  createCropScaleSession,
  resolveCropScaledRect,
  resolveCropScaleSize,
  type CropScaleSession
} from './crop-scale-session'
import type { CropFrameTransformState } from '../types'
import {
  createCropMovementSession,
  resolveCropMovementIntent,
  resolveCropMovementPosition,
  type CropMovementSession
} from './crop-movement-session'

/** Eight handles that use a unified crop size application path. */
const SCALE_CONTROLS = ['tl', 'tr', 'bl', 'br', 'ml', 'mr', 'mt', 'mb'] as const

/** Crop frame action with the original event and pointer in scene coordinates. */
interface CropInteractionStep {
  event: TPointerEvent
  transform: Transform
  x: number
  y: number
}

/** Owns crop frame movement and resizing before the first Fabric mutation. */
export class CropFrameInteraction {
  /** Canvas on which the gesture starts and ends. */
  private readonly canvas: Canvas

  /** Crop area of the current editing mode. */
  private readonly frame: CropFrame

  /** Shared environment calculation and publication of validated guides. */
  private readonly snapping: SnappingManager

  /** Original handles to restore when crop mode ends. */
  private readonly controls: Rect['controls']

  /** Immutable starting state of the current gesture and the last validated result. */
  private session: CropScaleSession | CropMovementSession | null = null

  /** Connects the owner to all handles and the full crop gesture lifecycle. */
  constructor({
    canvas,
    frame,
    snapping
  }: {
    canvas: Canvas
    frame: Rect
    snapping: SnappingManager
  }) {
    if (!(frame instanceof CropFrame)) throw new Error('Crop interaction requires a CropFrame')

    this.canvas = canvas
    this.frame = frame
    this.snapping = snapping
    this.controls = frame.controls
    this.installControls()
    canvas.on('mouse:down', this.startGesture)
    canvas.on('mouse:up', this.finishGesture)
    canvas.on('object:removed', this.handleObjectRemoved)
    canvas.on('selection:created', this.interruptGesture)
    canvas.on('selection:cleared', this.interruptGesture)
    canvas.on('selection:updated', this.interruptGesture)
    window.addEventListener('blur', this.interruptGesture)
    window.addEventListener('pointercancel', this.interruptGesture)
    window.addEventListener('touchcancel', this.interruptGesture)
  }

  /** Indicates to CropManager that the current result has already been constrained and validated. */
  public ownsTransform(transform?: Transform | null): boolean {
    return Boolean(this.session && this.session.transform === transform)
  }

  /** Removes subscriptions and temporary handles even if crop gesture completion fails. */
  public destroy(): void {
    try {
      this.interruptGesture()
    } finally {
      this.frame.controls = this.controls
      this.canvas.off('mouse:down', this.startGesture)
      this.canvas.off('mouse:up', this.finishGesture)
      this.canvas.off('object:removed', this.handleObjectRemoved)
      this.canvas.off('selection:created', this.interruptGesture)
      this.canvas.off('selection:cleared', this.interruptGesture)
      this.canvas.off('selection:updated', this.interruptGesture)
      window.removeEventListener('blur', this.interruptGesture)
      window.removeEventListener('pointercancel', this.interruptGesture)
      window.removeEventListener('touchcancel', this.interruptGesture)
    }
  }

  /** Runs the calculation before the legacy handler, retaining it for unsupported geometry. */
  private installControls(): void {
    const controls = { ...this.controls }
    for (const key of SCALE_CONTROLS) {
      const original = controls[key]
      const action = controlsUtils.wrapWithFireEvent('scaling', (event, transform, x, y) => {
        return this.applyScaleStep({ event, transform, x, y })
      })
      controls[key] = new Control({
        ...original,
        actionHandler: (event, transform, x, y) => {
          if (this.ownsTransform(transform)) return action(event, transform, x, y)

          return original.actionHandler?.(event, transform, x, y) ?? false
        }
      })
    }
    this.frame.controls = controls
  }

  /** Captures geometry on mousedown before handles or the source clamp run. */
  private readonly startGesture = (event: TPointerEventInfo<TPointerEvent>): void => {
    this.finishGesture()
    const { transform } = event
    if (!transform || transform.target !== this.frame) return
    if (transform.action === 'drag') {
      this.session = createCropMovementSession({ frame: this.frame, transform, snapping: this.snapping })
      if (!this.session) return
      transform.actionHandler = controlsUtils.wrapWithFireEvent('moving', (nativeEvent, current, x, y) => {
        return this.applyMovementStep({ event: nativeEvent, transform: current, x, y })
      })
      return
    }
    if (!SCALE_CONTROLS.some((key) => key === transform.corner)) return

    this.session = createCropScaleSession({ frame: this.frame, transform, snapping: this.snapping })
  }

  /** Applies one original event; repeated delivery does not change the crop area. */
  private applyScaleStep({ event, transform, x, y }: CropInteractionStep): boolean {
    const { session } = this
    if (!session || session.kind !== 'scale' || session.transform !== transform) return false
    if (session.runtime.getDuplicateStep({ marker: event })) return false

    try {
      const preserveRatio = resolveCropFrameResizePreserveAspectRatio({ target: this.frame, shiftKey: event.shiftKey })
      let mode: RectangularScaleGestureMode = 'uniform'
      if (!preserveRatio) {
        mode = 'free'
        if (transform.action === 'scaleX') mode = 'horizontal'
        if (transform.action === 'scaleY') mode = 'vertical'
      }
      const raw = resolveRectangularScalePointerMultipliers({ projection: session.projection, pointer: { x, y }, mode })
      const minimum = Math.max(session.minimum.x, session.minimum.y)
      const multipliers = raw ?? { x: minimum, y: minimum }
      const step = session.runtime.resolveScalePlan({
        marker: event,
        intent: {
          projectionMode: mode,
          values: createRectangularScaleValues({ mode, multipliers }),
          modifiers: { ctrlKey: event.ctrlKey, shiftKey: event.shiftKey }
        }
      })
      if (step.kind !== 'planned') return false

      const applied = resolveCropScaleSize({ session, plan: step.plan })
      this.applySize({ session, multipliers: applied })
      const verification = session.runtime.verifyScalePlan({
        token: step.token,
        finalGeometry: this.readFinalGeometry({ session, mode, plan: step.plan })
      })
      session.confirmed = getCropFrameTransformState({ frame: this.frame })
      this.snapping.markStepHandled({ marker: event })
      this.snapping.publishVerifiedScaleGuides({ guides: verification.guides })
      return true
    } catch (error) {
      return this.abortFailedGesture({ error, confirmed: session.confirmed })
    }
  }

  /** Calculates, constrains, applies, and validates one original mouse event. */
  private applyMovementStep({ event, transform, x, y }: CropInteractionStep): boolean {
    const { session } = this
    if (!session || session.kind !== 'movement' || session.transform !== transform) return false
    if (session.runtime.getDuplicateStep({ marker: event })) return false

    try {
      const intent = resolveCropMovementIntent({ session, pointer: new Point(x, y), ctrlKey: event.ctrlKey })
      const step = session.runtime.resolveMovementPlan({ marker: event, intent })
      if (step.kind !== 'planned') return false
      const position = resolveCropMovementPosition({ session, position: step.plan.nextPosition })
      this.frame.set(position)
      this.frame.setCoords()
      const verification = session.runtime.verifyMovementPlan({
        token: step.token,
        finalGeometry: {
          bounds: this.frame.getObjectSnappingBounds(),
          position: { left: this.frame.left, top: this.frame.top }
        }
      })
      session.confirmed = getCropFrameTransformState({ frame: this.frame })
      this.snapping.markStepHandled({ marker: event })
      this.snapping.publishVerifiedMovementGuides(verification)
      return true
    } catch (error) {
      return this.abortFailedGesture({ error, confirmed: session.confirmed })
    }
  }

  /** Applies the final source rect once around the fixed source point. */
  private applySize({
    session,
    multipliers
  }: {
    session: CropScaleSession
    multipliers: RectangularScaleMultipliers
  }): void {
    const { frame, projection, transform } = session
    const source = frame.cropSource
    if (!source) throw new Error('The crop resize operation lost its source')

    const rect = resolveCropScaledRect({ session, multipliers })
    const center = new Point(rect.left + (rect.width / 2), rect.top + (rect.height / 2))
      .transform(source.calcTransformMatrix())
    frame.set({
      scaleX: projection.originalScales.x * multipliers.x,
      scaleY: projection.originalScales.y * multipliers.y
    })
    frame.setPositionByOrigin(center, 'center', 'center')
    frame.setCoords()
    transform.scaleX = frame.scaleX
    transform.scaleY = frame.scaleY
  }

  /** Validates the exact edges and fixed point without the decorative stroke. */
  private readFinalGeometry({
    session,
    mode,
    plan
  }: {
    session: CropScaleSession
    mode: RectangularScaleGestureMode
    plan: ScaleSnapPlan
  }): FinalScaleGeometry {
    const { frame, projection } = session
    const bounds = frame.getObjectSnappingBounds()
    const anchor = new Point(
      (projection.origin.x - 0.5) * frame.width,
      (projection.origin.y - 0.5) * frame.height
    ).transform(frame.calcTransformMatrix())

    return {
      bounds,
      fixedAnchor: anchor,
      measuredValues: createRectangularScaleValues({
        mode,
        multipliers: {
          x: frame.scaleX / projection.originalScales.x,
          y: frame.scaleY / projection.originalScales.y
        }
      }),
      domainVerdict: {
        x: !plan.constraints.x || Math.abs(bounds[plan.constraints.x.candidate.edge]
          - plan.constraints.x.expectedPosition) <= plan.verificationEpsilon ? 'satisfied' : 'blocked',
        y: !plan.constraints.y || Math.abs(bounds[plan.constraints.y.candidate.edge]
          - plan.constraints.y.expectedPosition) <= plan.verificationEpsilon ? 'satisfied' : 'blocked',
        protectedState: frame.width === session.transform.width && frame.height === session.transform.height
          ? 'preserved' : 'changed'
      }
    }
  }

  /** Ends the gesture after modified, preserving the last validated geometry. */
  private readonly finishGesture = (): void => {
    const { session } = this
    if (!session) return
    if (session.kind === 'movement') session.transform.actionHandler = session.originalHandler
    session.runtime.finishSession()
    this.session = null
    if (session.kind === 'scale') {
      this.snapping.publishVerifiedScaleGuides({ guides: [] })
      return
    }
    this.snapping.publishVerifiedMovementGuides({ guides: [], spacingGuides: [] })
  }

  /** Clears the gesture even if restoration fails, preserving the original cause of the failure. */
  private abortFailedGesture({ error, confirmed }: { error: unknown; confirmed: CropFrameTransformState }): never {
    try {
      try {
        applyCropFrameTransformState({ frame: this.frame, state: confirmed })
      } finally {
        this.interruptGesture()
      }
    } catch {
      // A restoration error must not mask the original action error.
    }
    throw error
  }

  /** Removing the frame or its source ends only the associated transform. */
  private readonly handleObjectRemoved = ({ target }: CanvasEvents['object:removed']): void => {
    if (target === this.frame || target === this.frame.cropSource) this.interruptGesture()
  }

  /** Interrupts the transform before clearing the session so that modified does not trigger the legacy clamp. */
  private readonly interruptGesture = (): void => {
    if (!this.session) return
    try {
      this.canvas.endCurrentTransform()
    } finally {
      this.finishGesture()
    }
  }
}
