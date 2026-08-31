/* eslint-disable no-use-before-define -- Публичный контроллер расположен перед внутренними проверками. */
import {
  ActiveSelection,
  FabricImage,
  type FabricObject,
  type TPointerEvent,
  type Transform
} from 'fabric'

import type { ImageEditor } from '../..'
import {
  createRectangularScaleGestureProjection,
  createRectangularScaleProjectionModes,
  resolveRectangularScaleMovingEdges,
  type RectangularScaleGestureMode,
  type RectangularScaleGestureProjection,
  type RectangularScaleGestureTransform,
  type RectangularScaleMultipliers,
  type RectangularScalePoint
} from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'
import {
  createScaleGestureBaseline,
  type ScaleRawIntent,
  type ScaleSnapPlan
} from '../../snapping-manager/scaling/scale-snapping-resolver'
import { ScaleSnappingRuntime } from '../../snapping-manager/scaling/scale-snapping-runtime'
import {
  applyRectangularScalePlan,
  readAppliedRectangularScaleMultipliers,
  readFinalRectangularScaleGeometry,
  resolveRectangularScaleStepInput,
  type RectangularScaleIntentSource
} from '../../snapping-manager/scaling/rectangular-scale-interaction'
import {
  didSideScaleSwitchToSkew,
  isStandardRectangularScaleControl
} from '../../snapping-manager/scaling/standard-scale-control'

/** Данные Fabric-события, необходимые для скейлинга общего выделения. */
export type ActiveSelectionScaleInteractionEvent = Readonly<{
  target?: FabricObject | null
  e?: TPointerEvent | null
  transform?: Transform | null
  pointer?: RectangularScalePoint
  scenePoint?: RectangularScalePoint
}>

/** Локальные свойства изображения, которые не должно менять общее преобразование выделения. */
type ProtectedSelectionImageState = Readonly<{
  angle: number
  cropX: number
  cropY: number
  flipX: boolean
  flipY: boolean
  height: number
  left: number
  originX: FabricImage['originX']
  originY: FabricImage['originY']
  scaleX: number
  scaleY: number
  skewX: number
  skewY: number
  target: FabricImage
  top: number
  width: number
}>

/** Свойства шейпа, которые не должна менять компоновка во время общего скейлинга. */
type ProtectedSelectionShapeState = Readonly<{
  angle: number
  flipX: boolean
  flipY: boolean
  originX: FabricObject['originX']
  originY: FabricObject['originY']
  scaleX: number
  scaleY: number
  skewX: number
  skewY: number
  target: FabricObject
}>

/** Состав выделения определяет доменное применение рассчитанного масштаба. */
type ActiveSelectionScaleComposition = Readonly<{
  children: readonly ProtectedSelectionImageState[]
  kind: 'images'
}> | Readonly<{
  children: readonly ProtectedSelectionShapeState[]
  kind: 'shapes'
}>

/** Свойства выделения и преобразования Fabric, которые должны сохраниться во время жеста. */
type ActiveSelectionScaleProtectedState = Readonly<{
  action: Transform['action']
  angle: number
  composition: ActiveSelectionScaleComposition
  controlKey: string
  flipX: boolean
  flipY: boolean
  height: number
  lockScalingFlip: boolean
  originX: Transform['originX']
  originY: Transform['originY']
  skewX: number
  skewY: number
  targetOriginX: ActiveSelection['originX']
  targetOriginY: ActiveSelection['originY']
  width: number
}>

/** Проверенные данные поддерживаемого жеста общего выделения. */
type ActiveSelectionScaleGesture = Readonly<{
  compositionKind: ActiveSelectionScaleComposition['kind']
  projectionTransform: RectangularScaleGestureTransform
  target: ActiveSelection
  transform: Transform
}>

/** Текущий этап обработки одного жеста скейлинга общего выделения. */
type ActiveSelectionScaleSessionPhase = 'unified' | 'legacy-passthrough' | 'skew-passthrough'

/** Способ фиксации шейпов после общей сессии скейлинга. */
export type ActiveSelectionShapeCommitMode = 'canonical-scale' | 'fabric-transform'

/** Временное состояние одного жеста скейлинга общего выделения. */
type ActiveSelectionScaleSession = {
  hasSkewStep: boolean
  phase: ActiveSelectionScaleSessionPhase
  readonly projection: RectangularScaleGestureProjection
  readonly protectedState: ActiveSelectionScaleProtectedState
  readonly runtime: ScaleSnappingRuntime
  readonly target: ActiveSelection
  readonly transform: Transform
}

/** Допуск сравнения защищённых числовых свойств выделения. */
const ACTIVE_SELECTION_SCALE_STATE_EPSILON = 0.000000001

/**
 * Владеет общей сессией скейлинга ActiveSelection из изображений или шейпов.
 * Остальные составы пока используют прежнюю логику.
 */
export default class ActiveSelectionScaleInteractionController {
  /** Редактор с холстом и общим окружением прилипания. */
  private readonly editor: ImageEditor

  /** Текущий поддерживаемый жест или null для прежнего пути. */
  private session: ActiveSelectionScaleSession | null = null

  /** Сессия шейпов, которую ShapeManager сейчас фиксирует через `object:modified`. */
  private shapeCommitSession: ActiveSelectionScaleSession | null = null

  /** Создаёт владельца скейлинга общего выделения. */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /** Подписывает владельца скейлинга общего выделения на события Fabric. */
  public bind(): void {
    const { canvas } = this.editor

    canvas.on('mouse:down', this._handleMouseDown)
    canvas.on('mouse:move', this._handleMouseMove)
    canvas.on('object:scaling', this._handleObjectScaling)
    canvas.on('mouse:up', this._handleInteractionFinished)
    canvas.on('object:removed', this._handleObjectRemoved)
    canvas.on('selection:created', this._handleInteractionFinished)
    canvas.on('selection:updated', this._handleInteractionFinished)
    canvas.on('selection:cleared', this._handleInteractionFinished)

    window.addEventListener('pointercancel', this._handlePointerCancel)
    window.addEventListener('touchcancel', this._handlePointerCancel)
    window.addEventListener('blur', this._handleWindowBlur)
  }

  /** Снимает подписки и очищает временную сессию скейлинга. */
  public destroy(): void {
    const { canvas } = this.editor

    if (this.session) {
      this.interruptGesture()
    }

    canvas.off('mouse:down', this._handleMouseDown)
    canvas.off('mouse:move', this._handleMouseMove)
    canvas.off('object:scaling', this._handleObjectScaling)
    canvas.off('mouse:up', this._handleInteractionFinished)
    canvas.off('object:removed', this._handleObjectRemoved)
    canvas.off('selection:created', this._handleInteractionFinished)
    canvas.off('selection:updated', this._handleInteractionFinished)
    canvas.off('selection:cleared', this._handleInteractionFinished)

    window.removeEventListener('pointercancel', this._handlePointerCancel)
    window.removeEventListener('touchcancel', this._handlePointerCancel)
    window.removeEventListener('blur', this._handleWindowBlur)
    this._cancelAndClearGuides()
  }

  /** Фиксирует исходную геометрию поддерживаемого общего выделения. */
  public startGesture({
    event
  }: {
    event: ActiveSelectionScaleInteractionEvent
  }): boolean {
    this._cancelAndClearGuides()

    const gesture = resolveActiveSelectionScaleGesture({ editor: this.editor, event })
    const pointerStart = event.scenePoint ?? event.pointer
    if (!gesture || !pointerStart) return false

    gesture.target.setCoords()
    const projection = createRectangularScaleGestureProjection({
      transform: gesture.projectionTransform,
      pointerStart
    })
    if (!projection) return false

    this.session = createActiveSelectionScaleSession({
      editor: this.editor,
      gesture,
      projection
    })

    return true
  }

  /** Обрабатывает множители, уже применённые Fabric к общему выделению. */
  public handleObjectScaling({
    event
  }: {
    event: ActiveSelectionScaleInteractionEvent
  }): boolean {
    return this._handleScaleStep({ event, intentSource: 'fabric-preview' })
  }

  /** Обрабатывает движение указателя, если Fabric не отправил `object:scaling`. */
  public handleCanvasMouseMove({
    event
  }: {
    event: ActiveSelectionScaleInteractionEvent
  }): boolean {
    return this._handleScaleStep({ event, intentSource: 'pointer-projection' })
  }

  /** Идемпотентно завершает временную сессию скейлинга. */
  public finishGesture(): boolean {
    const { session } = this
    if (!session) return false

    session.runtime.finishSession()
    this.session = null
    if (this.shapeCommitSession === session) {
      this.shapeCommitSession = null
    }

    return true
  }

  /** Защищает фиксацию шейпов от промежуточных событий смены выделения. */
  public beginShapeSelectionCommit({
    selection
  }: {
    selection: ActiveSelection
  }): ActiveSelectionShapeCommitMode | null {
    const { session } = this
    if (!session || session.target !== selection) return null
    if (session.protectedState.composition.kind !== 'shapes') return null
    if (this.shapeCommitSession) {
      throw new Error('Фиксация общего выделения из шейпов уже выполняется')
    }

    this.shapeCommitSession = session

    return session.hasSkewStep ? 'fabric-transform' : 'canonical-scale'
  }

  /** Завершает общую сессию после фиксации геометрии или преобразования шейпов. */
  public finishShapeSelectionCommit({ selection }: { selection: ActiveSelection }): boolean {
    const { shapeCommitSession } = this
    if (!shapeCommitSession || shapeCommitSession.target !== selection) return false

    this.shapeCommitSession = null

    return this._finishAndClearGuides()
  }

  /** Завершает жест при удалении выделения или одного из его дочерних объектов. */
  public finishGestureForTarget({ target }: { target: FabricObject }): boolean {
    const { session } = this
    if (!session) return false
    const belongsToSelection = session.protectedState.composition.children
      .some((child) => child.target === target)
    if (target !== session.target && !belongsToSelection) return false

    return this._cancelAndClearGuides()
  }

  /** Обрабатывает шаг шейпов до прежнего обработчика ShapeManager. */
  public handleShapeSelectionScaleStep({
    event,
    intentSource
  }: {
    event: ActiveSelectionScaleInteractionEvent
    intentSource: RectangularScaleIntentSource
  }): boolean {
    const { session } = this
    if (!session || session.protectedState.composition.kind !== 'shapes') return false
    if (!doesEventBelongToSession({ event, session })) return false

    return this._handleScaleStep({ event, intentSource })
  }

  /** Завершает преобразование Fabric после внешнего прерывания указателя. */
  public interruptGesture({ event }: { event?: PointerEvent | TouchEvent } = {}): boolean {
    if (!this.session) return false

    try {
      this.editor.canvas.endCurrentTransform(event)
    } finally {
      this._cancelAndClearGuides()
    }

    return true
  }

  /** Выполняет один общий шаг либо передаёт событие прежней логике без частичного применения. */
  private _handleScaleStep({
    event,
    intentSource
  }: {
    event: ActiveSelectionScaleInteractionEvent
    intentSource: RectangularScaleIntentSource
  }): boolean {
    const { session } = this
    if (!session) return false
    if (session.phase === 'legacy-passthrough') {
      return this._handleLegacyPassthroughStep({ event, session })
    }
    if (session.phase === 'skew-passthrough') {
      return this._handleSkewPassthroughStep({ event, session })
    }

    const marker = resolveScaleMarker({ event })
    const duplicate = session.runtime.getDuplicateStep({ marker })
    if (duplicate) {
      if (!duplicate.verification) {
        throw new Error('Повторный шаг ActiveSelection не может завершиться до проверки результата')
      }
      this.editor.snappingManager.markScaleStepHandled({ marker })
      return true
    }

    const pointerEvent = event.e
    if (!pointerEvent) return this._continueWithExistingScaling()
    if (!doesEventBelongToSession({ event, session })) return this._continueWithExistingScaling()
    if (didSideScaleSwitchToSkew({
      controlKey: session.projection.controlKey,
      pointerEvent,
      target: session.target
    })) return this._finishBeforeSkew({ marker })
    if (!isSameActiveSelectionScaleGesture({ session })) return this._continueWithExistingScaling()

    const shapeControlMode = session.protectedState.composition.kind === 'shapes'
      ? this.editor.shapeManager.resolveActiveSelectionScaleControlMode({
        selection: session.target,
        transform: session.transform,
        event: pointerEvent
      })
      : null
    const stepInput = resolveRectangularScaleStepInput({
      canvas: this.editor.canvas,
      event,
      intentSource,
      mode: shapeControlMode ?? undefined,
      projection: session.projection,
      target: session.target
    })
    if (!stepInput) return this._continueWithExistingScaling()

    return this._applyScaleStep({
      intent: stepInput.intent,
      marker,
      mode: stepInput.mode,
      pointerEvent,
      session
    })
  }

  /** Снова блокирует расчёт скейлинга шейпов, если боковая ручка вернулась к наклону. */
  private _handleLegacyPassthroughStep({
    event,
    session
  }: {
    event: ActiveSelectionScaleInteractionEvent
    session: ActiveSelectionScaleSession
  }): boolean {
    if (!doesEventBelongToSession({ event, session })) return false

    const pointerEvent = event.e
    if (!pointerEvent || !didSideScaleSwitchToSkew({
      controlKey: session.projection.controlKey,
      pointerEvent,
      target: session.target
    })) return false

    session.phase = 'skew-passthrough'
    session.hasSkewStep = true
    this.editor.snappingManager.markScaleStepHandled({ marker: resolveScaleMarker({ event }) })
    this.editor.snappingManager.publishVerifiedScaleGuides({ guides: [] })

    return true
  }

  /** Не даёт ShapeManager повторно применить скейлинг, пока Fabric выполняет наклон боковой ручкой. */
  private _handleSkewPassthroughStep({
    event,
    session
  }: {
    event: ActiveSelectionScaleInteractionEvent
    session: ActiveSelectionScaleSession
  }): boolean {
    if (!doesEventBelongToSession({ event, session })) return false

    const pointerEvent = event.e
    const remainsSkew = !pointerEvent || didSideScaleSwitchToSkew({
      controlKey: session.projection.controlKey,
      pointerEvent,
      target: session.target
    })
    if (!remainsSkew) {
      session.phase = 'legacy-passthrough'
      return false
    }

    this.editor.snappingManager.markScaleStepHandled({ marker: resolveScaleMarker({ event }) })

    return true
  }

  /** Рассчитывает, один раз применяет и проверяет текущий шаг общего выделения. */
  private _applyScaleStep({
    intent,
    marker,
    mode,
    pointerEvent,
    session
  }: {
    intent: ScaleRawIntent
    marker: object
    mode: RectangularScaleGestureMode
    pointerEvent: TPointerEvent
    session: ActiveSelectionScaleSession
  }): boolean {
    const step = session.runtime.resolveScalePlan({ marker, intent })
    if (step.kind === 'duplicate') {
      throw new Error('Шаг ActiveSelection стал повторным после начальной проверки сессии')
    }

    try {
      const appliedMultipliers = applyActiveSelectionScalePlan({
        editor: this.editor,
        plan: step.plan,
        pointerEvent,
        projection: session.projection,
        protectedState: session.protectedState,
        target: session.target,
        transform: session.transform
      })
      const finalGeometry = readFinalRectangularScaleGeometry({
        mode,
        multipliers: appliedMultipliers,
        plan: step.plan,
        protectedStatePreserved: isProtectedActiveSelectionStatePreserved({
          mode,
          multipliers: appliedMultipliers,
          session
        }),
        target: session.target,
        transform: session.transform
      })
      const verification = session.runtime.verifyScalePlan({ token: step.token, finalGeometry })
      if (didActiveSelectionScaleChange({ multipliers: appliedMultipliers })) {
        session.transform.actionPerformed = true
      }

      this.editor.snappingManager.markScaleStepHandled({ marker })
      this.editor.snappingManager.publishVerifiedScaleGuides({ guides: verification.guides })

      return true
    } catch (error) {
      this._cancelAndClearGuides()
      throw error
    }
  }

  /** Завершает общую сессию перед продолжением прежнего пути Fabric. */
  private _continueWithExistingScaling(): false {
    const { session } = this
    if (session?.protectedState.composition.kind === 'shapes') {
      session.runtime.finishSession()
      session.phase = 'legacy-passthrough'
      this.editor.snappingManager.publishVerifiedScaleGuides({ guides: [] })

      return false
    }

    this._finishAndClearGuides()

    return false
  }

  /** Отключает прилипание перед наклоном, но сохраняет владельца завершающего события. */
  private _finishBeforeSkew({ marker }: { marker: object }): true {
    const { session } = this
    if (!session) {
      throw new Error('Переход к наклону требует активной сессии общего выделения')
    }

    if (session.protectedState.composition.kind === 'shapes') {
      session.runtime.finishSession()
      session.phase = 'skew-passthrough'
      session.hasSkewStep = true
      this.editor.snappingManager.publishVerifiedScaleGuides({ guides: [] })
    } else {
      this._finishAndClearGuides()
    }
    this.editor.snappingManager.markScaleStepHandled({ marker })

    return true
  }

  /** Завершает активную сессию и очищает её направляющие. */
  private _finishAndClearGuides(): boolean {
    if (!this.finishGesture()) return false

    this.editor.snappingManager.publishVerifiedScaleGuides({ guides: [] })

    return true
  }

  /** Очищает общую сессию и оставшееся временное состояние шейпов. */
  private _cancelAndClearGuides(): boolean {
    const { session } = this
    if (!session) return false

    this._clearShapePreviewState({ session })

    return this._finishAndClearGuides()
  }

  /** Очищает временные данные ShapeManager, если сессия принадлежит шейпам. */
  private _clearShapePreviewState({
    session
  }: {
    session: ActiveSelectionScaleSession
  }): void {
    if (session.protectedState.composition.kind !== 'shapes') return

    this.editor.shapeManager.clearActiveSelectionScalePreviewState({
      selection: session.target,
      children: session.protectedState.composition.children.map(({ target }) => target)
    })
  }

  /** Начинает новый поддерживаемый жест на `mouse:down`. */
  private readonly _handleMouseDown = (event: ActiveSelectionScaleInteractionEvent): void => {
    this.startGesture({ event })
  }

  /** Выполняет запасной шаг по движению указателя. */
  private readonly _handleMouseMove = (event: ActiveSelectionScaleInteractionEvent): void => {
    this.handleCanvasMouseMove({ event })
  }

  /** Выполняет шаг после предварительного преобразования Fabric. */
  private readonly _handleObjectScaling = (event: ActiveSelectionScaleInteractionEvent): void => {
    this.handleObjectScaling({ event })
  }

  /** Очищает сессию на любом терминальном событии. */
  private readonly _handleInteractionFinished = (): void => {
    const { session } = this
    if (session && this.shapeCommitSession === session) return

    this._cancelAndClearGuides()
  }

  /** Завершает преобразование после отмены события указателя. */
  private readonly _handlePointerCancel = (event: PointerEvent | TouchEvent): void => {
    this.interruptGesture({ event })
  }

  /** Завершает преобразование, когда окно теряет фокус. */
  private readonly _handleWindowBlur = (): void => {
    this.interruptGesture()
  }

  /** Очищает сессию при удалении выделения или одного из его дочерних объектов. */
  private readonly _handleObjectRemoved = ({
    target
  }: {
    target?: FabricObject | null
  }): void => {
    if (!target) return

    this.finishGestureForTarget({ target })
  }
}

/** Применяет общий план и передаёт шейпам расчёт их компоновки. */
function applyActiveSelectionScalePlan({
  editor,
  plan,
  pointerEvent,
  projection,
  protectedState,
  target,
  transform
}: {
  editor: ImageEditor
  plan: ScaleSnapPlan
  pointerEvent: TPointerEvent
  projection: RectangularScaleGestureProjection
  protectedState: ActiveSelectionScaleProtectedState
  target: ActiveSelection
  transform: Transform
}): RectangularScaleMultipliers {
  applyRectangularScalePlan({ plan, projection, target, transform })

  if (protectedState.composition.kind === 'shapes') {
    const appliedScale = editor.shapeManager.applyActiveSelectionScalePreview({
      selection: target,
      transform,
      event: pointerEvent
    })
    if (!appliedScale) {
      throw new Error('Поддерживаемое выделение из шейпов должно принять рассчитанный масштаб')
    }
    if (
      !areNumbersNear({ first: target.scaleX, second: appliedScale.scaleX })
      || !areNumbersNear({ first: target.scaleY, second: appliedScale.scaleY })
    ) {
      throw new Error('Масштаб выделения должен совпасть с результатом ShapeManager')
    }
  }

  return readAppliedRectangularScaleMultipliers({ projection, target })
}

/** Создаёт сессию расчёта и неизменяемое окружение текущего жеста. */
function createActiveSelectionScaleSession({
  editor,
  gesture,
  projection
}: {
  editor: ImageEditor
  gesture: ActiveSelectionScaleGesture
  projection: RectangularScaleGestureProjection
}): ActiveSelectionScaleSession {
  const projectionModes = createRectangularScaleProjectionModes({ projection })
  const environment = editor.snappingManager.captureScaleSnapEnvironment({
    activeObject: gesture.target,
    targetEdges: resolveRectangularScaleMovingEdges({ projectionModes })
  })
  const baseline = createScaleGestureBaseline({
    bounds: projection.baselineBounds,
    fixedAnchor: projection.fixedAnchor,
    projectionModes,
    candidates: environment.candidates,
    zoom: environment.zoom
  })
  const runtime = new ScaleSnappingRuntime()
  runtime.startSession({ baseline })

  return {
    hasSkewStep: false,
    phase: 'unified',
    projection,
    protectedState: captureProtectedActiveSelectionState(gesture),
    runtime,
    target: gesture.target,
    transform: gesture.transform
  }
}

/** Проверяет `mouse:down` и возвращает данные поддерживаемого общего выделения. */
function resolveActiveSelectionScaleGesture({
  editor,
  event
}: {
  editor: ImageEditor
  event: ActiveSelectionScaleInteractionEvent
}): ActiveSelectionScaleGesture | null {
  const { target, transform } = event
  if (!(target instanceof ActiveSelection) || !transform) return null
  if (transform.target !== target || !isSupportedActiveSelectionGeometry({ target })) return null

  const compositionKind = resolveActiveSelectionScaleCompositionKind({ editor, target })
  if (!compositionKind) return null
  const shapeControlMode = compositionKind === 'shapes'
    ? editor.shapeManager.resolveActiveSelectionScaleControlMode({
      selection: target,
      transform,
      event: event.e
    })
    : null
  const usesSupportedControl = isStandardRectangularScaleControl({ target, transform })
    || shapeControlMode !== null
  if (!usesSupportedControl) return null

  const originalScaleX = transform.original?.scaleX
  const originalScaleY = transform.original?.scaleY
  if (typeof originalScaleX !== 'number' || !Number.isFinite(originalScaleX) || originalScaleX <= 0) return null
  if (typeof originalScaleY !== 'number' || !Number.isFinite(originalScaleY) || originalScaleY <= 0) return null

  return Object.freeze({
    compositionKind,
    projectionTransform: Object.freeze({
      target,
      action: transform.action,
      corner: transform.corner,
      originX: transform.originX,
      originY: transform.originY,
      original: Object.freeze({ scaleX: originalScaleX, scaleY: originalScaleY })
    }),
    target,
    transform
  })
}

/** Возвращает поддерживаемый однородный состав общего выделения. */
function resolveActiveSelectionScaleCompositionKind({
  editor,
  target
}: {
  editor: ImageEditor
  target: ActiveSelection
}): ActiveSelectionScaleComposition['kind'] | null {
  if (isSupportedImageSelection({ target })) return 'images'
  if (editor.shapeManager.supportsActiveSelectionScaling({ selection: target })) return 'shapes'

  return null
}

/** Проверяет состав выделения только из прямых изображений. */
function isSupportedImageSelection({ target }: { target: ActiveSelection }): boolean {
  const objects = target.getObjects()
  if (objects.length < 2) return false
  if (objects.some((object) => !(object instanceof FabricImage) || Boolean(object.parent))) return false

  return true
}

/** Проверяет общую геометрию выделения до определения его доменного состава. */
function isSupportedActiveSelectionGeometry({ target }: { target: ActiveSelection }): boolean {
  const hasUnsupportedState = [
    target.group,
    target.parent,
    target.flipX,
    target.flipY,
    target.locked,
    target.lockScalingX,
    target.lockScalingY
  ].some(Boolean)
  if (hasUnsupportedState) return false

  const finiteValues = [
    target.width,
    target.height,
    target.angle ?? 0,
    target.skewX ?? 0,
    target.skewY ?? 0
  ]
  if (!finiteValues.every(Number.isFinite) || target.width <= 0 || target.height <= 0) return false

  return Math.abs(target.skewX ?? 0) <= ACTIVE_SELECTION_SCALE_STATE_EPSILON
    && Math.abs(target.skewY ?? 0) <= ACTIVE_SELECTION_SCALE_STATE_EPSILON
}

/** Сохраняет свойства выделения и защищённое состояние его дочерних объектов. */
function captureProtectedActiveSelectionState({
  target,
  transform,
  compositionKind
}: ActiveSelectionScaleGesture): ActiveSelectionScaleProtectedState {
  return Object.freeze({
    action: transform.action,
    angle: target.angle ?? 0,
    composition: captureProtectedSelectionComposition({ compositionKind, target }),
    controlKey: transform.corner,
    flipX: Boolean(target.flipX),
    flipY: Boolean(target.flipY),
    height: target.height,
    lockScalingFlip: Boolean(target.lockScalingFlip),
    originX: transform.originX,
    originY: transform.originY,
    skewX: target.skewX ?? 0,
    skewY: target.skewY ?? 0,
    targetOriginX: target.originX,
    targetOriginY: target.originY,
    width: target.width
  })
}

/** Сохраняет защищённые свойства дочерних объектов с учётом состава выделения. */
function captureProtectedSelectionComposition({
  compositionKind,
  target
}: {
  compositionKind: ActiveSelectionScaleComposition['kind']
  target: ActiveSelection
}): ActiveSelectionScaleComposition {
  if (compositionKind === 'images') {
    return Object.freeze({
      children: Object.freeze(target.getObjects().map((object) => {
        return captureProtectedSelectionImageState({ target: object as FabricImage })
      })),
      kind: 'images'
    })
  }

  return Object.freeze({
    children: Object.freeze(target.getObjects().map((object) => {
      return captureProtectedSelectionShapeState({ target: object })
    })),
    kind: 'shapes'
  })
}

/** Сохраняет локальные свойства одного изображения внутри общего выделения. */
function captureProtectedSelectionImageState({
  target
}: {
  target: FabricImage
}): ProtectedSelectionImageState {
  return Object.freeze({
    angle: target.angle ?? 0,
    cropX: target.cropX ?? 0,
    cropY: target.cropY ?? 0,
    flipX: Boolean(target.flipX),
    flipY: Boolean(target.flipY),
    height: target.height,
    left: target.left,
    originX: target.originX,
    originY: target.originY,
    scaleX: target.scaleX,
    scaleY: target.scaleY,
    skewX: target.skewX ?? 0,
    skewY: target.skewY ?? 0,
    target,
    top: target.top,
    width: target.width
  })
}

/** Сохраняет свойства одного шейпа, которые не зависят от текущей компоновки. */
function captureProtectedSelectionShapeState({
  target
}: {
  target: FabricObject
}): ProtectedSelectionShapeState {
  return Object.freeze({
    angle: target.angle ?? 0,
    flipX: Boolean(target.flipX),
    flipY: Boolean(target.flipY),
    originX: target.originX,
    originY: target.originY,
    scaleX: target.scaleX,
    scaleY: target.scaleY,
    skewX: target.skewX ?? 0,
    skewY: target.skewY ?? 0,
    target
  })
}

/** Проверяет принадлежность события исходному выделению и преобразованию Fabric. */
function doesEventBelongToSession({
  event,
  session
}: {
  event: ActiveSelectionScaleInteractionEvent
  session: ActiveSelectionScaleSession
}): boolean {
  if (event.transform !== session.transform) return false
  if (event.target && event.target !== session.target) return false

  return true
}

/** Проверяет, что Fabric не переключил активный жест на другое преобразование. */
function isSameActiveSelectionScaleGesture({
  session
}: {
  session: ActiveSelectionScaleSession
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

/** Проверяет свойства выделения, детей и неактивные степени свободы. */
function isProtectedActiveSelectionStatePreserved({
  mode,
  multipliers,
  session
}: {
  mode: RectangularScaleGestureMode
  multipliers: RectangularScaleMultipliers
  session: ActiveSelectionScaleSession
}): boolean {
  if (!isCanonicalActiveSelectionStatePreserved({ session })) return false
  if (mode === 'horizontal') return areNumbersNear({ first: multipliers.y, second: 1 })
  if (mode === 'vertical') return areNumbersNear({ first: multipliers.x, second: 1 })
  if (mode === 'uniform') return areNumbersNear({ first: multipliers.x, second: multipliers.y })

  return true
}

/** Проверяет общие свойства выделения и защищённые свойства его состава. */
function isCanonicalActiveSelectionStatePreserved({
  session
}: {
  session: ActiveSelectionScaleSession
}): boolean {
  const { protectedState, target } = session
  const { composition } = protectedState
  const children = target.getObjects()
  if (children.length !== composition.children.length) return false

  return isSameActiveSelectionScaleGesture({ session })
    && areNumbersNear({ first: target.width, second: protectedState.width })
    && areNumbersNear({ first: target.height, second: protectedState.height })
    && target.originX === protectedState.targetOriginX
    && target.originY === protectedState.targetOriginY
    && Boolean(target.lockScalingFlip) === protectedState.lockScalingFlip
    && isProtectedSelectionCompositionPreserved({ children, composition })
}

/** Проверяет неизменяемые свойства изображений или шейпов внутри выделения. */
function isProtectedSelectionCompositionPreserved({
  children,
  composition
}: {
  children: FabricObject[]
  composition: ActiveSelectionScaleComposition
}): boolean {
  if (composition.kind === 'images') {
    return composition.children.every((state, index) => {
      return children[index] === state.target && isProtectedSelectionImageStatePreserved({ state })
    })
  }

  return composition.children.every((state, index) => {
    return children[index] === state.target && isProtectedSelectionShapeStatePreserved({ state })
  })
}

/** Проверяет локальные свойства одного изображения после общего преобразования выделения. */
function isProtectedSelectionImageStatePreserved({
  state
}: {
  state: ProtectedSelectionImageState
}): boolean {
  const { target } = state

  return areNumbersNear({ first: target.left, second: state.left })
    && areNumbersNear({ first: target.top, second: state.top })
    && areNumbersNear({ first: target.width, second: state.width })
    && areNumbersNear({ first: target.height, second: state.height })
    && areNumbersNear({ first: target.scaleX, second: state.scaleX })
    && areNumbersNear({ first: target.scaleY, second: state.scaleY })
    && areNumbersNear({ first: target.angle ?? 0, second: state.angle })
    && areNumbersNear({ first: target.skewX ?? 0, second: state.skewX })
    && areNumbersNear({ first: target.skewY ?? 0, second: state.skewY })
    && areNumbersNear({ first: target.cropX ?? 0, second: state.cropX })
    && areNumbersNear({ first: target.cropY ?? 0, second: state.cropY })
    && Boolean(target.flipX) === state.flipX
    && Boolean(target.flipY) === state.flipY
    && target.originX === state.originX
    && target.originY === state.originY
}

/** Проверяет свойства шейпа, которые компоновка во время жеста не должна менять. */
function isProtectedSelectionShapeStatePreserved({
  state
}: {
  state: ProtectedSelectionShapeState
}): boolean {
  const { target } = state

  return areNumbersNear({ first: target.scaleX, second: state.scaleX })
    && areNumbersNear({ first: target.scaleY, second: state.scaleY })
    && areNumbersNear({ first: target.angle ?? 0, second: state.angle })
    && areNumbersNear({ first: target.skewX ?? 0, second: state.skewX })
    && areNumbersNear({ first: target.skewY ?? 0, second: state.skewY })
    && Boolean(target.flipX) === state.flipX
    && Boolean(target.flipY) === state.flipY
    && target.originX === state.originX
    && target.originY === state.originY
}

/** Проверяет, изменился ли масштаб хотя бы по одной оси относительно начала жеста. */
function didActiveSelectionScaleChange({
  multipliers
}: {
  multipliers: RectangularScaleMultipliers
}): boolean {
  return !areNumbersNear({ first: multipliers.x, second: 1 })
    || !areNumbersNear({ first: multipliers.y, second: 1 })
}

/** Использует исходное событие указателя как идентификатор шага, а при его отсутствии — событие холста. */
function resolveScaleMarker({
  event
}: {
  event: ActiveSelectionScaleInteractionEvent
}): object {
  const { e } = event
  if ((typeof e === 'object' && e !== null) || typeof e === 'function') return e

  return event
}

/** Сравнивает конечные числа в пределах допуска защищённого состояния. */
function areNumbersNear({
  first,
  second
}: {
  first: number
  second: number
}): boolean {
  return Number.isFinite(first)
    && Number.isFinite(second)
    && Math.abs(first - second) <= ACTIVE_SELECTION_SCALE_STATE_EPSILON
}
