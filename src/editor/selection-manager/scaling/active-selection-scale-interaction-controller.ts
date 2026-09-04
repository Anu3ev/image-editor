/* eslint-disable no-use-before-define -- Публичный контроллер расположен перед внутренними проверками. */
import {
  ActiveSelection,
  type FabricObject,
  type TPointerEvent,
  type Transform
} from 'fabric'

import type { ImageEditor } from '../..'
import {
  createRectangularScaleGestureProjection,
  createRectangularScaleProjectionModes,
  resolveRectangularScaleMovingEdges,
  resolveRectangularScalePointerMultipliers,
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
import {
  ScaleSnappingRuntime,
  type ScalePlanToken
} from '../../snapping-manager/scaling/scale-snapping-runtime'
import {
  applyRectangularScalePlan,
  createRectangularScaleIntent,
  readAppliedRectangularScaleMultipliers,
  readFinalRectangularScaleGeometry,
  resolveRectangularScaleGestureMode,
  resolveRectangularScaleStepInput,
  type RectangularScaleIntentSource
} from '../../snapping-manager/scaling/rectangular-scale-interaction'
import {
  didSideScaleSwitchToSkew,
  isStandardRectangularScaleControl
} from '../../snapping-manager/scaling/standard-scale-control'
import {
  areActiveSelectionScaleValuesNear,
  captureActiveSelectionScaleProtectedState,
  isActiveSelectionScaleGesturePreserved,
  isActiveSelectionScaleProtectedStatePreserved,
  isSupportedActiveSelectionScaleGeometry,
  resolveActiveSelectionScaleCompositionKind,
  type ActiveSelectionScaleComposition,
  type ActiveSelectionScaleProtectedState
} from './active-selection-scale-composition'

/** Данные Fabric-события, необходимые для скейлинга общего выделения. */
export type ActiveSelectionScaleInteractionEvent = Readonly<{
  target?: FabricObject | null
  e?: TPointerEvent | null
  transform?: Transform | null
  pointer?: RectangularScalePoint
  scenePoint?: RectangularScalePoint
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

/** Измерение канонического состояния выделения с текстами для одного шага. */
type ActiveSelectionTextScaleMeasurement = ReturnType<
  ImageEditor['textManager']['measureActiveSelectionScale']
>

/** Проверенные исходные данные одного шага поддерживаемого общего выделения. */
type ActiveSelectionScaleStepInput = Readonly<{
  intent: ScaleRawIntent
  mode: RectangularScaleGestureMode
  textMeasurement: ActiveSelectionTextScaleMeasurement | null
}>

/** План после необязательного уточнения по канонической геометрии текстов. */
type ResolvedActiveSelectionScalePlan = Readonly<{
  plan: ScaleSnapPlan
  textMeasurement: ActiveSelectionTextScaleMeasurement | null
}>

/** Текущий домен, который выполняет каноническую фиксацию общего выделения. */
type ActiveSelectionScaleCommitKind = 'shapes' | 'texts'

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

/**
 * Владеет общей сессией скейлинга ActiveSelection из изображений, шейпов или состава с текстом.
 * Остальные составы пока используют прежнюю логику.
 */
export default class ActiveSelectionScaleInteractionController {
  /** Редактор с холстом и общим окружением прилипания. */
  private readonly editor: ImageEditor

  /** Текущий поддерживаемый жест или null для прежнего пути. */
  private session: ActiveSelectionScaleSession | null = null

  /** Сессия, которую доменный менеджер сейчас фиксирует через `object:modified`. */
  private commitSession: Readonly<{
    kind: ActiveSelectionScaleCommitKind
    session: ActiveSelectionScaleSession
  }> | null = null

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
    if (this.commitSession?.session === session) {
      this.commitSession = null
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
    if (this.commitSession) {
      throw new Error('Фиксация общего выделения из шейпов уже выполняется')
    }

    this.commitSession = Object.freeze({ kind: 'shapes', session })

    return session.hasSkewStep ? 'fabric-transform' : 'canonical-scale'
  }

  /** Завершает общую сессию после фиксации геометрии или преобразования шейпов. */
  public finishShapeSelectionCommit({ selection }: { selection: ActiveSelection }): boolean {
    return this._finishSelectionCommit({ kind: 'shapes', selection })
  }

  /** Защищает каноническую фиксацию текстов от внутренних событий смены выделения. */
  public beginTextSelectionCommit({ selection }: { selection: ActiveSelection }): boolean {
    const { session } = this
    if (!session || session.target !== selection) return false
    if (session.protectedState.composition.kind !== 'texts') return false
    if (this.commitSession) throw new Error('Фиксация общего выделения уже выполняется другим доменом')

    this.commitSession = Object.freeze({ kind: 'texts', session })

    return true
  }

  /** Завершает общую сессию после канонической фиксации дочерних текстов. */
  public finishTextSelectionCommit({ selection }: { selection: ActiveSelection }): boolean {
    return this._finishSelectionCommit({ kind: 'texts', selection })
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
    })) return this._finishBeforeSkew({ marker, pointerEvent })
    if (!isActiveSelectionScaleGesturePreserved({
      protectedState: session.protectedState,
      target: session.target,
      transform: session.transform
    })) return this._continueWithExistingScaling()

    const stepInput = resolveActiveSelectionScaleStepInput({
      editor: this.editor,
      event,
      intentSource,
      pointerEvent,
      session
    })
    if (!stepInput) return this._continueWithExistingScaling()

    return this._applyScaleStep({
      intent: stepInput.intent,
      marker,
      mode: stepInput.mode,
      pointerEvent,
      session,
      textMeasurement: stepInput.textMeasurement
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
    session,
    textMeasurement
  }: {
    intent: ScaleRawIntent
    marker: object
    mode: RectangularScaleGestureMode
    pointerEvent: TPointerEvent
    session: ActiveSelectionScaleSession
    textMeasurement: ActiveSelectionTextScaleMeasurement | null
  }): boolean {
    const step = session.runtime.resolveScalePlan({
      marker,
      intent,
      stepProjection: textMeasurement?.projection
    })
    if (step.kind === 'duplicate') {
      throw new Error('Шаг ActiveSelection стал повторным после начальной проверки сессии')
    }

    try {
      const verification = this._applyAndVerifyScaleStep({
        plan: step.plan,
        mode,
        pointerEvent,
        session,
        textMeasurement,
        token: step.token
      })

      this.editor.snappingManager.markScaleStepHandled({ marker })
      this.editor.snappingManager.publishVerifiedScaleGuides({ guides: verification.guides })

      return true
    } catch (error) {
      this._cancelAndClearGuides()
      throw error
    }
  }

  /** Применяет уточнённый план и проверяет фактическую геометрию выделения. */
  private _applyAndVerifyScaleStep({
    mode,
    plan,
    pointerEvent,
    session,
    textMeasurement,
    token
  }: {
    mode: RectangularScaleGestureMode
    plan: ScaleSnapPlan
    pointerEvent: TPointerEvent
    session: ActiveSelectionScaleSession
    textMeasurement: ActiveSelectionTextScaleMeasurement | null
    token: ScalePlanToken
  }): ReturnType<ScaleSnappingRuntime['verifyScalePlan']> {
    const resolved = this._resolveDomainScalePlan({
      mode,
      plan,
      runtime: session.runtime,
      selection: session.target,
      textMeasurement,
      token
    })
    const multipliers = applyActiveSelectionScalePlan({
      editor: this.editor,
      plan: resolved.plan,
      pointerEvent,
      projection: session.projection,
      protectedState: session.protectedState,
      target: session.target,
      textMeasurement: resolved.textMeasurement,
      transform: session.transform
    })
    const finalGeometry = readFinalRectangularScaleGeometry({
      mode,
      multipliers,
      plan: resolved.plan,
      protectedStatePreserved: isActiveSelectionScaleProtectedStatePreserved({
        mode,
        multipliers,
        protectedState: session.protectedState,
        target: session.target,
        transform: session.transform
      }),
      target: session.target,
      transform: session.transform
    })

    if (didActiveSelectionScaleChange({ multipliers })) session.transform.actionPerformed = true

    return session.runtime.verifyScalePlan({ token, finalGeometry })
  }

  /** Уточняет план только для состава, чья каноническая геометрия нелинейна. */
  private _resolveDomainScalePlan({
    mode,
    plan,
    runtime,
    selection,
    textMeasurement,
    token
  }: {
    mode: RectangularScaleGestureMode
    plan: ScaleSnapPlan
    runtime: ScaleSnappingRuntime
    selection: ActiveSelection
    textMeasurement: ActiveSelectionTextScaleMeasurement | null
    token: ScalePlanToken
  }): ResolvedActiveSelectionScalePlan {
    if (!textMeasurement) return Object.freeze({ plan, textMeasurement: null })

    const resolved = this.editor.textManager.resolveActiveSelectionScaleStep({
      mode,
      plan,
      pointerMeasurement: textMeasurement,
      selection
    })
    const refinedPlan = resolved.refinement
      ? runtime.refineScalePlan({ token, refinement: resolved.refinement })
      : plan

    return Object.freeze({
      plan: refinedPlan,
      textMeasurement: resolved.measurement
    })
  }

  /** Завершает общую сессию перед продолжением прежнего пути Fabric. */
  private _continueWithExistingScaling(): boolean {
    const { session } = this
    if (session?.protectedState.composition.kind === 'shapes') {
      session.runtime.finishSession()
      session.phase = 'legacy-passthrough'
      this.editor.snappingManager.publishVerifiedScaleGuides({ guides: [] })

      return false
    }

    if (session?.protectedState.composition.kind === 'texts'
      && this.editor.textManager.hasAppliedActiveSelectionScale({ selection: session.target })) {
      return this._finishAppliedTextGesture({ session })
    }

    this._cancelAndClearGuides()

    return false
  }

  /** Обрабатывает попытку включить наклон боковой ручкой и очищает направляющие скейлинга. */
  private _finishBeforeSkew({
    marker,
    pointerEvent
  }: {
    marker: object
    pointerEvent: TPointerEvent
  }): true {
    const { session } = this
    if (!session) {
      throw new Error('Переход к наклону требует активной сессии общего выделения')
    }

    if (session.protectedState.composition.kind === 'shapes') {
      session.runtime.finishSession()
      session.phase = 'skew-passthrough'
      session.hasSkewStep = true
      this.editor.snappingManager.publishVerifiedScaleGuides({ guides: [] })
    } else if (session.protectedState.composition.kind === 'texts'
      && this.editor.textManager.hasAppliedActiveSelectionScale({ selection: session.target })) {
      this._finishAppliedTextGesture({ session, pointerEvent })
    } else {
      this._cancelAndClearGuides()
    }
    this.editor.snappingManager.markScaleStepHandled({ marker })

    return true
  }

  /** Фиксирует уже применённый текстовый шаг до передачи управления другому преобразованию. */
  private _finishAppliedTextGesture({
    session,
    pointerEvent
  }: {
    session: ActiveSelectionScaleSession
    pointerEvent?: TPointerEvent
  }): true {
    const restored = this.editor.textManager.restoreActiveSelectionScalePreview({
      selection: session.target
    })
    if (!restored) throw new Error('Досрочное завершение должно восстановить последний текстовый шаг')

    this.editor.canvas.endCurrentTransform(pointerEvent)
    if (this.session === session) {
      throw new Error('Досрочное завершение текстового скейлинга должно зафиксировать активную сессию')
    }

    return true
  }

  /** Завершает активную сессию и очищает её направляющие. */
  private _finishAndClearGuides(): boolean {
    if (!this.finishGesture()) return false

    this.editor.snappingManager.publishVerifiedScaleGuides({ guides: [] })

    return true
  }

  /** Завершает фиксацию только для того домена и выделения, которые её начали. */
  private _finishSelectionCommit({
    kind,
    selection
  }: {
    kind: ActiveSelectionScaleCommitKind
    selection: ActiveSelection
  }): boolean {
    const { commitSession } = this
    if (!commitSession || commitSession.kind !== kind || commitSession.session.target !== selection) return false

    this.commitSession = null

    return this._finishAndClearGuides()
  }

  /** Очищает общую сессию и промежуточное состояние менеджера объекта. */
  private _cancelAndClearGuides(): boolean {
    const { session } = this
    if (!session) return false

    this._clearDomainPreviewState({ session })

    return this._finishAndClearGuides()
  }

  /** Очищает временные данные менеджера, которому принадлежит состав выделения. */
  private _clearDomainPreviewState({
    session
  }: {
    session: ActiveSelectionScaleSession
  }): void {
    const { composition } = session.protectedState
    if (composition.kind === 'texts') {
      this.editor.textManager.clearActiveSelectionScaling({ selection: session.target })
      return
    }
    if (composition.kind !== 'shapes') return

    this.editor.shapeManager.clearActiveSelectionScalePreviewState({
      selection: session.target,
      children: composition.children.map(({ target }) => target)
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
    if (session && this.commitSession?.session === session) return

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

/** Возвращает исходные данные шага с учётом точной геометрии выбранных объектов. */
function resolveActiveSelectionScaleStepInput({
  editor,
  event,
  intentSource,
  pointerEvent,
  session
}: {
  editor: ImageEditor
  event: ActiveSelectionScaleInteractionEvent
  intentSource: RectangularScaleIntentSource
  pointerEvent: TPointerEvent
  session: ActiveSelectionScaleSession
}): ActiveSelectionScaleStepInput | null {
  const { composition } = session.protectedState
  if (composition.kind === 'texts') {
    return resolveTextSelectionScaleStepInput({
      editor,
      event,
      intentSource,
      pointerEvent,
      session
    })
  }

  const shapeMode = composition.kind === 'shapes'
    ? editor.shapeManager.resolveActiveSelectionScaleControlMode({
      selection: session.target,
      transform: session.transform,
      event: pointerEvent
    })
    : null
  const stepInput = resolveRectangularScaleStepInput({
    canvas: editor.canvas,
    event,
    intentSource,
    mode: shapeMode ?? undefined,
    projection: session.projection,
    target: session.target
  })
  if (!stepInput) return null

  return Object.freeze({ ...stepInput, textMeasurement: null })
}

/** Измеряет текстовый шаг от положения указателя, не используя предварительно изменённую рамку Fabric. */
function resolveTextSelectionScaleStepInput({
  editor,
  event,
  intentSource,
  pointerEvent,
  session
}: {
  editor: ImageEditor
  event: ActiveSelectionScaleInteractionEvent
  intentSource: RectangularScaleIntentSource
  pointerEvent: TPointerEvent
  session: ActiveSelectionScaleSession
}): ActiveSelectionScaleStepInput | null {
  const pointer = intentSource === 'fabric-preview' ? event.pointer : event.scenePoint
  if (!pointer) return null

  const mode = resolveRectangularScaleGestureMode({
    canvas: editor.canvas,
    pointerEvent,
    projection: session.projection
  })
  const rawMultipliers = resolveRectangularScalePointerMultipliers({
    projection: session.projection,
    pointer,
    mode
  }) ?? (mode === 'uniform' ? Object.freeze({ x: 0, y: 0 }) : null)
  if (!rawMultipliers) return null

  const textMeasurement = editor.textManager.measureActiveSelectionScale({
    mode,
    multipliers: rawMultipliers,
    selection: session.target
  })

  return Object.freeze({
    intent: createRectangularScaleIntent({
      mode,
      multipliers: textMeasurement.multipliers,
      pointerEvent
    }),
    mode,
    textMeasurement
  })
}

/** Применяет общий план и передаёт изменение размеров менеджеру соответствующего типа объектов. */
function applyActiveSelectionScalePlan({
  editor,
  plan,
  pointerEvent,
  projection,
  protectedState,
  target,
  textMeasurement,
  transform
}: {
  editor: ImageEditor
  plan: ScaleSnapPlan
  pointerEvent: TPointerEvent
  projection: RectangularScaleGestureProjection
  protectedState: ActiveSelectionScaleProtectedState
  target: ActiveSelection
  textMeasurement: ActiveSelectionTextScaleMeasurement | null
  transform: Transform
}): RectangularScaleMultipliers {
  if (protectedState.composition.kind === 'texts') {
    if (!textMeasurement) {
      throw new Error('План выделения с текстами должен содержать измеренное каноническое состояние')
    }

    return editor.textManager.applyActiveSelectionScalePreview({
      measurement: textMeasurement,
      selection: target
    })
  }

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
      !areActiveSelectionScaleValuesNear({ first: target.scaleX, second: appliedScale.scaleX })
      || !areActiveSelectionScaleValuesNear({ first: target.scaleY, second: appliedScale.scaleY })
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

  if (gesture.compositionKind === 'texts') {
    const started = editor.textManager.beginActiveSelectionScaling({
      projection,
      selection: gesture.target,
      transform: gesture.transform
    })
    if (!started) {
      runtime.finishSession()
      throw new Error('Поддерживаемое выделение с текстами должно начать сессию TextManager')
    }
  }

  return {
    hasSkewStep: false,
    phase: 'unified',
    projection,
    protectedState: captureActiveSelectionScaleProtectedState({
      compositionKind: gesture.compositionKind,
      target: gesture.target,
      transform: gesture.transform
    }),
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
  if (transform.target !== target || !isSupportedActiveSelectionScaleGeometry({ target })) return null

  const compositionKind = resolveActiveSelectionScaleCompositionKind({ editor, target })
  if (!compositionKind) return null
  if (compositionKind === 'texts' && (transform.corner === 'mt' || transform.corner === 'mb')) return null
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

/** Проверяет, изменился ли масштаб хотя бы по одной оси относительно начала жеста. */
function didActiveSelectionScaleChange({
  multipliers
}: {
  multipliers: RectangularScaleMultipliers
}): boolean {
  return !areActiveSelectionScaleValuesNear({ first: multipliers.x, second: 1 })
    || !areActiveSelectionScaleValuesNear({ first: multipliers.y, second: 1 })
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
