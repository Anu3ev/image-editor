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
  type ScaleRawIntent
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

/** Свойства выделения и преобразования Fabric, которые должны сохраниться во время жеста. */
type ActiveSelectionScaleProtectedState = Readonly<{
  action: Transform['action']
  angle: number
  children: readonly ProtectedSelectionImageState[]
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

/** Проверенные данные поддерживаемого жеста выделения из изображений. */
type ActiveSelectionScaleGesture = Readonly<{
  projectionTransform: RectangularScaleGestureTransform
  target: ActiveSelection
  transform: Transform
}>

/** Временное состояние одного жеста скейлинга общего выделения. */
type ActiveSelectionScaleSession = Readonly<{
  projection: RectangularScaleGestureProjection
  protectedState: ActiveSelectionScaleProtectedState
  runtime: ScaleSnappingRuntime
  target: ActiveSelection
  transform: Transform
}>

/** Допуск сравнения защищённых числовых свойств выделения. */
const ACTIVE_SELECTION_SCALE_STATE_EPSILON = 0.000000001

/**
 * Владеет общей сессией скейлинга ActiveSelection, состоящего только из изображений.
 * Выделения другого состава пока используют прежнюю логику.
 */
export default class ActiveSelectionScaleInteractionController {
  /** Редактор с холстом и общим окружением прилипания. */
  private readonly editor: ImageEditor

  /** Текущий поддерживаемый жест или null для прежнего пути. */
  private session: ActiveSelectionScaleSession | null = null

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
    this._finishAndClearGuides()
  }

  /** Фиксирует исходную геометрию поддерживаемого общего выделения. */
  public startGesture({
    event
  }: {
    event: ActiveSelectionScaleInteractionEvent
  }): boolean {
    this._finishAndClearGuides()

    const gesture = resolveActiveSelectionScaleGesture({ event })
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

    const { didCleanup } = session.runtime.finishSession()
    this.session = null

    return didCleanup
  }

  /** Завершает жест при удалении выделения или одного из его изображений. */
  public finishGestureForTarget({ target }: { target: FabricObject }): boolean {
    const { session } = this
    if (!session) return false
    const belongsToSelection = session.protectedState.children.some((child) => child.target === target)
    if (target !== session.target && !belongsToSelection) return false

    return this.finishGesture()
  }

  /** Завершает преобразование Fabric после внешнего прерывания указателя. */
  public interruptGesture({ event }: { event?: PointerEvent | TouchEvent } = {}): boolean {
    if (!this.session) return false

    try {
      this.editor.canvas.endCurrentTransform(event)
    } finally {
      this._finishAndClearGuides()
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

    const stepInput = resolveRectangularScaleStepInput({
      canvas: this.editor.canvas,
      event,
      intentSource,
      projection: session.projection,
      target: session.target
    })
    if (!stepInput) return this._continueWithExistingScaling()

    return this._applyScaleStep({
      intent: stepInput.intent,
      marker,
      mode: stepInput.mode,
      session
    })
  }

  /** Рассчитывает, один раз применяет и проверяет текущий шаг общего выделения. */
  private _applyScaleStep({
    intent,
    marker,
    mode,
    session
  }: {
    intent: ScaleRawIntent
    marker: object
    mode: RectangularScaleGestureMode
    session: ActiveSelectionScaleSession
  }): boolean {
    const step = session.runtime.resolveScalePlan({ marker, intent })
    if (step.kind === 'duplicate') {
      throw new Error('Шаг ActiveSelection стал повторным после начальной проверки сессии')
    }

    try {
      applyRectangularScalePlan({
        plan: step.plan,
        projection: session.projection,
        target: session.target,
        transform: session.transform
      })
      const appliedMultipliers = readAppliedRectangularScaleMultipliers({
        projection: session.projection,
        target: session.target
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
      this._finishAndClearGuides()
      throw error
    }
  }

  /** Завершает общую сессию перед продолжением прежнего пути Fabric. */
  private _continueWithExistingScaling(): false {
    this._finishAndClearGuides()

    return false
  }

  /** Завершает сессию, не запуская прежнюю логику скейлинга поверх наклона Fabric. */
  private _finishBeforeSkew({ marker }: { marker: object }): true {
    this._finishAndClearGuides()
    this.editor.snappingManager.markScaleStepHandled({ marker })

    return true
  }

  /** Завершает активную сессию и очищает её направляющие. */
  private _finishAndClearGuides(): boolean {
    if (!this.finishGesture()) return false

    this.editor.snappingManager.publishVerifiedScaleGuides({ guides: [] })

    return true
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
    this._finishAndClearGuides()
  }

  /** Завершает преобразование после отмены события указателя. */
  private readonly _handlePointerCancel = (event: PointerEvent | TouchEvent): void => {
    this.interruptGesture({ event })
  }

  /** Завершает преобразование, когда окно теряет фокус. */
  private readonly _handleWindowBlur = (): void => {
    this.interruptGesture()
  }

  /** Очищает сессию при удалении выделения или одного из его изображений. */
  private readonly _handleObjectRemoved = ({
    target
  }: {
    target?: FabricObject | null
  }): void => {
    if (!target || !this.finishGestureForTarget({ target })) return

    this.editor.snappingManager.publishVerifiedScaleGuides({ guides: [] })
  }
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

  return Object.freeze({
    projection,
    protectedState: captureProtectedActiveSelectionState(gesture),
    runtime,
    target: gesture.target,
    transform: gesture.transform
  })
}

/** Проверяет `mouse:down` и возвращает данные поддерживаемого общего выделения. */
function resolveActiveSelectionScaleGesture({
  event
}: {
  event: ActiveSelectionScaleInteractionEvent
}): ActiveSelectionScaleGesture | null {
  const { target, transform } = event
  if (!(target instanceof ActiveSelection) || !transform) return null
  if (transform.target !== target || !isSupportedImageSelection({ target })) return null
  if (!isStandardRectangularScaleControl({ target, transform })) return null

  const originalScaleX = transform.original?.scaleX
  const originalScaleY = transform.original?.scaleY
  if (typeof originalScaleX !== 'number' || !Number.isFinite(originalScaleX) || originalScaleX <= 0) return null
  if (typeof originalScaleY !== 'number' || !Number.isFinite(originalScaleY) || originalScaleY <= 0) return null

  return Object.freeze({
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

/** Проверяет состав и геометрическое состояние выделения, поддерживаемого на текущем этапе. */
function isSupportedImageSelection({ target }: { target: ActiveSelection }): boolean {
  const objects = target.getObjects()
  if (objects.length < 2) return false
  if (objects.some((object) => !(object instanceof FabricImage) || Boolean(object.parent))) return false

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

/** Сохраняет свойства выделения и локальную геометрию его изображений. */
function captureProtectedActiveSelectionState({
  target,
  transform
}: ActiveSelectionScaleGesture): ActiveSelectionScaleProtectedState {
  return Object.freeze({
    action: transform.action,
    angle: target.angle ?? 0,
    children: Object.freeze(target.getObjects().map((object) => {
      return captureProtectedSelectionImageState({ target: object as FabricImage })
    })),
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

/** Проверяет, что общее преобразование не изменило локальные свойства выделения и изображений. */
function isCanonicalActiveSelectionStatePreserved({
  session
}: {
  session: ActiveSelectionScaleSession
}): boolean {
  const { protectedState, target } = session
  const children = target.getObjects()
  if (children.length !== protectedState.children.length) return false

  return isSameActiveSelectionScaleGesture({ session })
    && areNumbersNear({ first: target.width, second: protectedState.width })
    && areNumbersNear({ first: target.height, second: protectedState.height })
    && target.originX === protectedState.targetOriginX
    && target.originY === protectedState.targetOriginY
    && Boolean(target.lockScalingFlip) === protectedState.lockScalingFlip
    && protectedState.children.every((state, index) => {
      return children[index] === state.target && isProtectedSelectionImageStatePreserved({ state })
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
