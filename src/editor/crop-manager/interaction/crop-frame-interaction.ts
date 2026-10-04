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

/** Восемь ручек, использующих единое применение crop-размера. */
const SCALE_CONTROLS = ['tl', 'tr', 'bl', 'br', 'ml', 'mr', 'mt', 'mb'] as const

/** Действие crop-рамки с исходным событием и указателем в координатах сцены. */
interface CropInteractionStep {
  event: TPointerEvent
  transform: Transform
  x: number
  y: number
}

/** Владеет перемещением и размером crop-рамки до первого изменения Fabric. */
export class CropFrameInteraction {
  /** Холст, на котором начинается и завершается жест. */
  private readonly canvas: Canvas

  /** Crop-область текущего режима редактирования. */
  private readonly frame: CropFrame

  /** Общий расчёт окружения и публикация проверенных направляющих. */
  private readonly snapping: SnappingManager

  /** Исходные ручки для восстановления при завершении crop-режима. */
  private readonly controls: Rect['controls']

  /** Неизменяемое начало текущего жеста и последний подтверждённый результат. */
  private session: CropScaleSession | CropMovementSession | null = null

  /** Подключает владельца ко всем ручкам и полному жизненному циклу crop-жеста. */
  constructor({ canvas, frame, snapping }: { canvas: Canvas; frame: Rect; snapping: SnappingManager }) {
    if (!(frame instanceof CropFrame)) throw new Error('Взаимодействие crop требует CropFrame')

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

  /** Показывает CropManager, что текущий результат уже ограничен и проверен. */
  public ownsTransform(transform?: Transform | null): boolean {
    return Boolean(this.session && this.session.transform === transform)
  }

  /** Снимает подписки и временные ручки даже при ошибке завершения crop-жеста. */
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

  /** Подключает вычисление до прежнего обработчика, сохраняя его для неподдерживаемой геометрии. */
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

  /** Фиксирует геометрию на mousedown до работы ручек или source clamp. */
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

  /** Применяет одно исходное событие; повторная доставка не меняет crop-область. */
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

  /** Рассчитывает, ограничивает, применяет и проверяет одно исходное событие мыши. */
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

  /** Применяет итоговый source-rect один раз вокруг неподвижной source-точки. */
  private applySize({
    session,
    multipliers
  }: {
    session: CropScaleSession
    multipliers: RectangularScaleMultipliers
  }): void {
    const { frame, projection, transform } = session
    const source = frame.cropSource
    if (!source) throw new Error('Crop resize потерял источник')

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

  /** Проверяет точные грани и неподвижную точку без декоративной обводки. */
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

  /** Завершает жест после modified, сохраняя последнюю подтверждённую геометрию. */
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

  /** Очищает жест даже при ошибке восстановления и сохраняет исходную причину сбоя. */
  private abortFailedGesture({ error, confirmed }: { error: unknown; confirmed: CropFrameTransformState }): never {
    try {
      try {
        applyCropFrameTransformState({ frame: this.frame, state: confirmed })
      } finally {
        this.interruptGesture()
      }
    } catch {
      // Ошибка восстановления не должна скрывать исходную ошибку действия.
    }
    throw error
  }

  /** Удаление рамки или её источника завершает только связанное с ними преобразование. */
  private readonly handleObjectRemoved = ({ target }: CanvasEvents['object:removed']): void => {
    if (target === this.frame || target === this.frame.cropSource) this.interruptGesture()
  }

  /** Прерывает transform до очистки сессии, чтобы modified не запустил прежний clamp. */
  private readonly interruptGesture = (): void => {
    if (!this.session) return
    try {
      this.canvas.endCurrentTransform()
    } finally {
      this.finishGesture()
    }
  }
}
