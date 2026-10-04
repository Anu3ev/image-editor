/* eslint-disable no-use-before-define -- Публичный контроллер расположен перед внутренними проверками. */
import {
  ActiveSelection,
  type FabricObject,
  type Point,
  type TPointerEvent,
  type Transform
} from 'fabric'

import type { ImageEditor } from '../..'
import { errorCodes } from '../../error-manager/error-codes'
import {
  resolveRectangularScalePointerMultipliers,
  type RectangularScaleGestureMode,
  type RectangularScaleGestureProjection,
  type RectangularScaleMultipliers
} from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'
import {
  type ScaleRawIntent,
  type ScaleSnapPlan
} from '../../snapping-manager/scaling/scale-snapping-resolver'
import {
  type ScaleSnappingRuntime,
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
import { didSideScaleSwitchToSkew } from '../../snapping-manager/scaling/standard-scale-control'
import {
  areActiveSelectionScaleValuesNear,
  isActiveSelectionScaleGesturePreserved,
  isActiveSelectionScaleProtectedStatePreserved,
  type ActiveSelectionScaleProtectedState
} from './active-selection-scale-composition'
import {
  createActiveSelectionScaleSession,
  doesEventBelongToSession,
  resolveActiveSelectionScaleGesture,
  type ActiveSelectionScaleInteractionEvent,
  type ActiveSelectionScaleSession
} from './active-selection-scale-session'

/** Измерение канонического состояния выделения с текстами для одного шага. */
type ActiveSelectionTextScaleMeasurement = ReturnType<
  ImageEditor['textManager']['measureActiveSelectionScale']
>

/** Подготовленная фиксация шейпов внутри общей транзакции. */
type ActiveSelectionShapePreparedCommit = ReturnType<
  ImageEditor['shapeManager']['prepareActiveSelectionScaleCommit']
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

  /** Исходные рамки, фиксацию которых уже забрал общий владелец. */
  private readonly coordinatedTextDrivenSelections = new WeakSet<ActiveSelection>()

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

  /** Снимает подписки и очищает сессию, даже если Fabric не смог завершить преобразование. */
  public destroy(): void {
    const { canvas } = this.editor

    try {
      if (this.session) this.interruptGesture()
    } finally {
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

    const session = createActiveSelectionScaleSession({
      editor: this.editor,
      gesture,
      pointerStart
    })
    if (!session) return false

    this.session = session

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
    if (!isTextDrivenComposition({ session })) return false
    if (this.commitSession) throw new Error('Фиксация общего выделения уже выполняется другим доменом')

    this.commitSession = Object.freeze({ kind: 'texts', session })

    return true
  }

  /** Завершает общую сессию после канонической фиксации дочерних текстов. */
  public finishTextSelectionCommit({ selection }: { selection: ActiveSelection }): boolean {
    return this._finishSelectionCommit({ kind: 'texts', selection })
  }

  /** Проверяет, должен ли ShapeManager пропустить отдельную фиксацию смешанного состава. */
  public shouldSkipShapeSelectionCommit({
    selection
  }: {
    selection: ActiveSelection
  }): boolean {
    const { session } = this

    if (this.coordinatedTextDrivenSelections.has(selection)) return true

    return session?.target === selection
      && session.protectedState.composition.kind === 'mixed'
      && session.phase === 'unified'
  }

  /** Один раз снимает рамку, фиксирует текст и шейпы и восстанавливает общее выделение. */
  public commitTextDrivenSelectionScale({
    selection,
    transform
  }: {
    selection: ActiveSelection
    transform?: Transform | null
  }): boolean {
    if (!this.beginTextSelectionCommit({ selection })) return false

    const { commitSession } = this
    if (!commitSession) throw new Error('Фиксация текстового состава должна иметь защищённую сессию')
    this.coordinatedTextDrivenSelections.add(selection)

    let shapeCommit: ActiveSelectionShapePreparedCommit | null
    try {
      shapeCommit = this._prepareTextDrivenChildrenCommit({
        selection,
        session: commitSession.session,
        transform
      })
    } catch (error) {
      this._abortFailedTextDrivenCommit({
        selection,
        session: commitSession.session,
        transform
      })
      throw error
    }

    const finalizationFailure = this._finishCommittedTextDrivenSelection({
      selection,
      session: commitSession.session,
      shapeCommit
    })
    if (finalizationFailure) {
      this._reportTextDrivenCommitFinalizationFailure({ error: finalizationFailure })
    }

    return true
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
    if (!session || !['shapes', 'mixed'].includes(session.protectedState.composition.kind)) return false
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
      this.editor.snappingManager.markStepHandled({ marker })
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

    return this._applyScaleStep({
      event,
      intentSource,
      marker,
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
    this.editor.snappingManager.markStepHandled({ marker: resolveScaleMarker({ event }) })
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

    this.editor.snappingManager.markStepHandled({ marker: resolveScaleMarker({ event }) })

    return true
  }

  /** Рассчитывает, один раз применяет и проверяет текущий шаг общего выделения. */
  private _applyScaleStep({
    event,
    intentSource,
    marker,
    pointerEvent,
    session
  }: {
    event: ActiveSelectionScaleInteractionEvent
    intentSource: RectangularScaleIntentSource
    marker: object
    pointerEvent: TPointerEvent
    session: ActiveSelectionScaleSession
  }): boolean {
    try {
      const stepInput = resolveActiveSelectionScaleStepInput({
        editor: this.editor,
        event,
        intentSource,
        pointerEvent,
        session
      })
      if (!stepInput) return this._continueWithExistingScaling()

      const step = session.runtime.resolveScalePlan({
        marker,
        intent: stepInput.intent,
        stepProjection: stepInput.textMeasurement?.projection
      })
      if (step.kind === 'duplicate') {
        throw new Error('Шаг ActiveSelection стал повторным после начальной проверки сессии')
      }
      const verification = this._applyAndVerifyScaleStep({
        plan: step.plan,
        mode: stepInput.mode,
        pointerEvent,
        session,
        textMeasurement: stepInput.textMeasurement,
        token: step.token
      })

      if (isTextDrivenComposition({ session })) {
        const confirmed = this.editor.textManager.confirmActiveSelectionScalePreview({
          selection: session.target
        })
        if (!confirmed) throw new Error('Проверенный текстовый шаг должен стать подтверждённым')
      }

      session.hasVerifiedStep = true
      this.editor.snappingManager.markStepHandled({ marker })
      this.editor.snappingManager.publishVerifiedScaleGuides({ guides: verification.guides })

      return true
    } catch (error) {
      try {
        this._abortFailedScaleStep({ pointerEvent, session })
      } catch {
        // Причина ошибки шага не должна подменяться ошибкой завершения сессии.
      }
      throw error
    }
  }

  /** Восстанавливает подтверждённую геометрию и завершает преобразование Fabric после ошибки шага. */
  private _abortFailedScaleStep({
    pointerEvent,
    session
  }: {
    pointerEvent: TPointerEvent
    session: ActiveSelectionScaleSession
  }): void {
    if (!session.hasVerifiedStep) session.transform.actionPerformed = false

    try {
      if (isTextDrivenComposition({ session })) {
        try {
          const restored = this.editor.textManager.restoreActiveSelectionScalePreview({
            selection: session.target
          })
          if (!restored) session.transform.actionPerformed = false
        } catch {
          session.transform.actionPerformed = false
        }
      }
    } finally {
      try {
        this.editor.canvas.endCurrentTransform(pointerEvent)
      } catch {
        session.target.isMoving = false
        if (Reflect.get(this.editor.canvas, '_currentTransform') === session.transform) {
          Reflect.set(this.editor.canvas, '_currentTransform', null)
        }
      } finally {
        try {
          this.editor.historyManager.endAction({ reason: 'object-transform' })
        } finally {
          if (this.session === session) this._cancelAndClearGuides()
        }
      }
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

    if (session && isTextDrivenComposition({ session })
      && this.editor.textManager.hasConfirmedActiveSelectionScale({ selection: session.target })) {
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
    } else if (isTextDrivenComposition({ session })
      && this.editor.textManager.hasConfirmedActiveSelectionScale({ selection: session.target })) {
      this._finishAppliedTextGesture({ session, pointerEvent })
    } else {
      this._cancelAndClearGuides()
    }
    this.editor.snappingManager.markStepHandled({ marker })

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

  /** Подготавливает канонические свойства всех объектов и восстанавливает общее выделение. */
  private _prepareTextDrivenChildrenCommit({
    selection,
    session,
    transform
  }: {
    selection: ActiveSelection
    session: ActiveSelectionScaleSession
    transform?: Transform | null
  }): ActiveSelectionShapePreparedCommit | null {
    const { composition } = session.protectedState
    const children = composition.children.map(({ target }) => target)
    const shapeChildren = composition.children
      .filter((child) => child.kind === 'shape')
      .map(({ target }) => target)
    const angle = selection.angle ?? 0
    const center = selection.getCenterPoint()
    let shapeCommit: ActiveSelectionShapePreparedCommit | null = null

    try {
      selection.set({ angle: 0 })
      selection.setPositionByOrigin(center, 'center', 'center')
      selection.setCoords()
      this._discardSelectionDuringCommit({ selection, transform })

      const committedText = this.editor.textManager.commitActiveSelectionScaling({ selection })
      if (!committedText) throw new Error('TextManager должен зафиксировать измеренную геометрию текста')

      if (composition.kind === 'mixed') {
        shapeCommit = this.editor.shapeManager.prepareActiveSelectionScaleCommit({
          children: shapeChildren,
          selection,
          transform
        })
      }
      this._restoreTextDrivenSelectionAfterCommit({ angle, center, children })
    } catch (error) {
      try {
        this._restoreTextDrivenCommitState({ children, selection })
      } catch {
        // Ошибка подготовки остаётся основной после попытки восстановить весь состав.
      }
      throw error
    }

    return shapeCommit
  }

  /** Возвращает исходную рамку и все объекты к последнему подтверждённому состоянию. */
  private _restoreTextDrivenCommitState({
    children,
    selection
  }: {
    children: readonly FabricObject[]
    selection: ActiveSelection
  }): void {
    const failures: unknown[] = []

    try {
      this._restoreOriginalSelectionTopology({ children, selection })
    } catch (error) {
      failures.push(error)
    }
    try {
      const restored = this.editor.textManager.restoreActiveSelectionScalePreview({ selection })
      if (!restored) throw new Error('TextManager должен восстановить подтверждённое состояние')
    } catch (error) {
      failures.push(error)
    }
    try {
      selection.setCoords()
      this.editor.canvas.setActiveObject(selection)
      this.editor.canvas.requestRenderAll()
    } catch (error) {
      failures.push(error)
    }

    const [firstFailure] = failures
    if (failures.length > 0) throw firstFailure
  }

  /** Возвращает все объекты из новой рамки в исходный ActiveSelection и проверяет их порядок. */
  private _restoreOriginalSelectionTopology({
    children,
    selection
  }: {
    children: readonly FabricObject[]
    selection: ActiveSelection
  }): void {
    const { canvas } = this.editor
    const activeObject = canvas.getActiveObject()

    if (activeObject instanceof ActiveSelection && activeObject !== selection) {
      canvas.discardActiveObject()
    }

    const attachedChildren = new Set(selection.getObjects())
    const missingChildren = children.filter((child) => !attachedChildren.has(child))
    if (missingChildren.length > 0) selection.add(...missingChildren)

    const restoredChildren = selection.getObjects()
    const hasOriginalOrder = restoredChildren.length === children.length
      && restoredChildren.every((child, index) => child === children[index])
    if (!hasOriginalOrder) throw new Error('Откат должен восстановить исходный порядок объектов')
  }

  /** Завершает доменные сессии только после успешной подготовки геометрии и новой рамки. */
  private _finishTextDrivenDomainCommits({
    selection,
    shapeCommit
  }: {
    selection: ActiveSelection
    shapeCommit: ActiveSelectionShapePreparedCommit | null
  }): void {
    const failures: unknown[] = []

    if (shapeCommit) {
      try {
        this.editor.shapeManager.finishActiveSelectionScaleCommit({ commit: shapeCommit })
      } catch (error) {
        failures.push(error)
      }
    }
    try {
      this.editor.textManager.clearActiveSelectionScaling({ selection })
    } catch (error) {
      failures.push(error)
    }

    const [firstFailure] = failures
    if (failures.length > 0) throw firstFailure
  }

  /** Завершает фиксацию после точки, в которой геометрия и новая рамка уже применены. */
  private _finishCommittedTextDrivenSelection({
    selection,
    session,
    shapeCommit
  }: {
    selection: ActiveSelection
    session: ActiveSelectionScaleSession
    shapeCommit: ActiveSelectionShapePreparedCommit | null
  }): unknown | null {
    const failures: unknown[] = []

    try {
      this._finishTextDrivenDomainCommits({ selection, shapeCommit })
    } catch (error) {
      failures.push(error)
    }
    try {
      const didFinish = this.finishTextSelectionCommit({ selection })
      if (!didFinish) failures.push(new Error('Общая текстовая сессия должна завершиться после фиксации'))
    } catch (error) {
      failures.push(error)
    }

    if (failures.length > 0) this._forceFinishCommitSession({ selection, session })

    return failures.length > 0
      ? failures[0] ?? new Error('Не удалось завершить фиксацию общего выделения')
      : null
  }

  /** Очищает откатываемую транзакцию и освобождает прерванное преобразование Fabric. */
  private _abortFailedTextDrivenCommit({
    selection,
    session,
    transform
  }: {
    selection: ActiveSelection
    session: ActiveSelectionScaleSession
    transform?: Transform | null
  }): void {
    try {
      this._clearDomainPreviewState({ session })
    } catch {
      // Исходная ошибка фиксации остаётся основной после попытки очистить оба домена.
    }

    this._forceFinishCommitSession({ selection, session })
    this.coordinatedTextDrivenSelections.delete(selection)
    this._releaseFailedCommitTransform({ selection, transform })
  }

  /** Гарантированно удаляет временную сессию и направляющие после ошибки её завершения. */
  private _forceFinishCommitSession({
    selection,
    session
  }: {
    selection: ActiveSelection
    session: ActiveSelectionScaleSession
  }): void {
    if (session.target !== selection) return

    try {
      session.runtime.finishSession()
    } catch {
      // Остальное временное состояние всё равно должно быть очищено.
    }
    if (this.session === session) this.session = null
    this.commitSession = null
    try {
      this.editor.snappingManager.publishVerifiedScaleGuides({ guides: [] })
    } catch {
      // Ошибка очистки направляющих не должна оставлять общую сессию активной.
    }
  }

  /** Передаёт ошибку после точки фиксации через штатный канал, не прерывая Fabric и историю. */
  private _reportTextDrivenCommitFinalizationFailure({ error }: { error: unknown }): void {
    try {
      this.editor.errorManager.emitError({
        code: errorCodes.SELECTION_MANAGER.SCALE_COMMIT_FINALIZATION_FAILED,
        data: { error },
        message: 'Не удалось полностью завершить фиксацию общего выделения',
        method: 'commitTextDrivenSelectionScale',
        origin: 'SelectionManager'
      })
    } catch {
      // Ошибка подписчика не должна прерывать уже зафиксированное преобразование.
    }
  }

  /** Пытается обновить координаты каждого ребёнка и восстановить общую рамку после фиксации. */
  private _restoreTextDrivenSelectionAfterCommit({
    angle,
    center,
    children
  }: {
    angle: number
    center: Point
    children: readonly FabricObject[]
  }): void {
    const failures: unknown[] = []

    for (const child of children) {
      try {
        child.setCoords()
      } catch (error) {
        failures.push(error)
      }
    }
    try {
      this._restoreSelectionAfterCommit({ angle, center, children })
    } catch (error) {
      failures.push(error)
    }

    const [firstFailure] = failures
    if (failures.length > 0) throw firstFailure
  }

  /** Снимает временную рамку, не завершая повторно уже обрабатываемое преобразование Fabric. */
  private _discardSelectionDuringCommit({
    selection,
    transform
  }: {
    selection: ActiveSelection
    transform?: Transform | null
  }): void {
    const { canvas } = this.editor
    const currentTransform = Reflect.get(canvas, '_currentTransform')
    const isCurrentTransform = currentTransform
      && currentTransform === transform
      && transform?.target === selection

    if (isCurrentTransform) Reflect.set(canvas, '_currentTransform', null)
    try {
      canvas.discardActiveObject()
    } finally {
      if (isCurrentTransform) Reflect.set(canvas, '_currentTransform', currentTransform)
    }
  }

  /** Освобождает transform и завершает историю, если ошибка прервала обработчик Fabric. */
  private _releaseFailedCommitTransform({
    selection,
    transform
  }: {
    selection: ActiveSelection
    transform?: Transform | null
  }): void {
    const { canvas } = this.editor
    const currentTransform = Reflect.get(canvas, '_currentTransform')
    if (!transform || transform.target !== selection || currentTransform !== transform) return

    selection.isMoving = false
    Reflect.set(canvas, '_currentTransform', null)
    try {
      this.editor.historyManager.endAction({ reason: 'object-transform' })
    } catch {
      // Исходная ошибка фиксации остаётся основной после попытки завершить историю.
    }
  }

  /** Создаёт одну каноническую рамку с исходным поворотом после фиксации всех доменов. */
  private _restoreSelectionAfterCommit({
    angle,
    center,
    children
  }: {
    angle: number
    center: Point
    children: readonly FabricObject[]
  }): void {
    const { canvas } = this.editor
    const restored = new ActiveSelection([...children], { canvas })
    restored.set({ angle, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 })
    restored.setPositionByOrigin(center, 'center', 'center')
    restored.setCoords()
    canvas.setActiveObject(restored)
    canvas.requestRenderAll()
  }

  /** Очищает общую сессию и промежуточное состояние менеджера объекта. */
  private _cancelAndClearGuides(): boolean {
    const { session } = this
    if (!session) return false

    let finished = false
    try {
      this._clearDomainPreviewState({ session })
    } finally {
      finished = this._finishAndClearGuides()
    }

    return finished
  }

  /** Очищает временные данные менеджера, которому принадлежит состав выделения. */
  private _clearDomainPreviewState({
    session
  }: {
    session: ActiveSelectionScaleSession
  }): void {
    const { composition } = session.protectedState
    if (composition.kind === 'mixed') {
      try {
        this.editor.textManager.clearActiveSelectionScaling({ selection: session.target })
      } finally {
        this.editor.shapeManager.clearActiveSelectionScalePreviewState({
          selection: session.target,
          children: composition.children
            .filter((child) => child.kind === 'shape')
            .map(({ target }) => target)
        })
      }

      return
    }
    if (composition.kind === 'texts') {
      this.editor.textManager.clearActiveSelectionScaling({ selection: session.target })
      return
    }
    if (composition.kind !== 'shapes') return

    this.editor.shapeManager.clearActiveSelectionScalePreviewState({
      selection: session.target,
      children: composition.children
        .filter((child) => child.kind === 'shape')
        .map(({ target }) => target)
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

/** Проверяет состав, общая рамка которого рассчитывается по канонической геометрии текста. */
function isTextDrivenComposition({
  session
}: {
  session: ActiveSelectionScaleSession
}): boolean {
  const { kind } = session.protectedState.composition

  return kind === 'texts' || kind === 'mixed'
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
  if (composition.kind === 'texts' || composition.kind === 'mixed') {
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

  const shapeControlMode = session.protectedState.composition.kind === 'mixed'
    ? editor.shapeManager.resolveActiveSelectionScaleControlMode({
      selection: session.target,
      transform: session.transform,
      event: pointerEvent
    })
    : null
  const mode = shapeControlMode ?? resolveRectangularScaleGestureMode({
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
  if (protectedState.composition.kind === 'texts' || protectedState.composition.kind === 'mixed') {
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
