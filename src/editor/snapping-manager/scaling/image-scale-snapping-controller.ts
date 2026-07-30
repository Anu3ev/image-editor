/* eslint-disable no-use-before-define -- Публичный controller расположен перед внутренними проверками. */
import {
  FabricImage,
  Point,
  controlsUtils,
  type Control,
  type FabricObject,
  type TPointerEvent,
  type Transform
} from 'fabric'

import type { ImageEditor } from '../..'
import { getObjectExactBounds, type ObjectBounds } from '../../utils/geometry'
import {
  createRectangularScaleGestureProjection,
  createRectangularScaleProjectionModes,
  createRectangularScaleValues,
  resolveRectangularScaleMovingEdges,
  resolveRectangularScaleMultipliers,
  resolveRectangularScalePointerMultipliers,
  type RectangularScaleGestureMode,
  type RectangularScaleGestureProjection,
  type RectangularScaleGestureTransform,
  type RectangularScaleMultipliers,
  type RectangularScalePoint
} from './rectangular-scale-gesture-projection'
import {
  createScaleGestureBaseline,
  type FinalScaleGeometry,
  type PlannedScaleConstraint,
  type ScaleRawIntent,
  type ScaleSnapPlan,
  type ScaleScenePoint,
  type VerifiedScaleGuide
} from './scale-snapping-resolver'
import { ScaleSnappingRuntime } from './scale-snapping-runtime'

/** Данные Fabric-события, необходимые для одного шага scale изображения. */
export type ImageScaleInteractionEvent = Readonly<{
  target?: FabricObject | null
  e?: TPointerEvent | null
  transform?: Transform | null
  pointer?: RectangularScalePoint
  scenePoint?: RectangularScalePoint
}>

/** Mouse-событие, на котором Fabric уже создал transform выбранной ручки. */
export type ImageScaleStartEvent = ImageScaleInteractionEvent

/** Canvas `object:scaling` одного live scale-step изображения. */
export type ImageScaleTransformEvent = ImageScaleInteractionEvent

/** Canvas `mouse:move`, который может быть fallback одного live scale-step. */
export type ImageScaleMouseMoveEvent = ImageScaleInteractionEvent

/** Событие должен обработать legacy scale owner. */
export type UnhandledImageScaleStep = Readonly<{
  handled: false
  didFinishSession: boolean
}>

/** Событие полностью обработано новым Image scale owner. */
export type HandledImageScaleStep = Readonly<{
  handled: true
  guides: readonly VerifiedScaleGuide[]
  shouldPublishGuides: boolean
}>

/** Результат маршрутизации одного Image scale-step. */
export type ImageScaleStepResult = UnhandledImageScaleStep | HandledImageScaleStep

/** Свойства Image и Fabric transform, которые scale не должен менять. */
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

/** Проверенные данные одного поддерживаемого Image scale-жеста. */
type ImageScaleGesture = Readonly<{
  projectionTransform: RectangularScaleGestureTransform
  target: FabricImage
  transform: Transform
}>

/** Transient-состояние одного активного Image scale-жеста. */
type ImageScaleSession = Readonly<{
  projection: RectangularScaleGestureProjection
  protectedState: ImageScaleProtectedState
  runtime: ScaleSnappingRuntime
  target: FabricImage
  transform: Transform
}>

/** Источник raw scale для текущего pointer step. */
type ImageScaleIntentSource = 'fabric-preview' | 'pointer-projection'

/** Неизменяемый ответ при отсутствии активной unified-сессии. */
const UNHANDLED_IMAGE_SCALE_STEP: UnhandledImageScaleStep = Object.freeze({
  handled: false,
  didFinishSession: false
})

/** Допуск при сравнении scale и защищённых свойств Image. */
const IMAGE_SCALE_STATE_EPSILON = 0.000000001

/** Эталонные Fabric controls, с которыми совместим unified Image scale. */
const STANDARD_IMAGE_SCALE_CONTROLS: Readonly<Record<string, Control>> = Object.freeze(
  controlsUtils.createObjectDefaultControls()
)

/**
 * Владеет unified scale-сессией одиночного top-level FabricImage.
 * Неподдерживаемые affine и custom-control сценарии остаются на legacy path.
 */
export class ImageScaleSnappingController {
  /** Редактор с canvas и общим окружением прилипания. */
  private readonly _editor: ImageEditor

  /** Текущий поддержанный жест или null для legacy-сценария. */
  private _session: ImageScaleSession | null = null

  /** Создаёт Image scale owner для canvas текущего редактора. */
  constructor({
    editor
  }: {
    editor: ImageEditor
  }) {
    this._editor = editor
  }

  /** Фиксирует immutable baseline поддержанного Image scale-жеста. */
  startGesture({
    event
  }: {
    event: ImageScaleStartEvent
  }): boolean {
    this.finishGesture()

    const gesture = resolveImageScaleGesture({ event })
    const pointerStart = event.scenePoint ?? event.pointer
    if (!gesture || !pointerStart) return false

    gesture.target.setCoords()
    const projection = createRectangularScaleGestureProjection({
      transform: gesture.projectionTransform,
      pointerStart
    })
    if (!projection) return false

    const projectionModes = createRectangularScaleProjectionModes({ projection })
    const environment = this._editor.snappingManager.captureScaleSnapEnvironment({
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
    this._session = Object.freeze({
      projection,
      protectedState: captureProtectedImageScaleState(gesture),
      runtime,
      target: gesture.target,
      transform: gesture.transform
    })

    return true
  }

  /** Обрабатывает raw scale, уже применённый стандартным Fabric handler. */
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

  /** Обрабатывает новый mouse marker, если Fabric не отправил `object:scaling`. */
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

  /** Идемпотентно завершает transient scale-сессию и сообщает о выполненной очистке. */
  finishGesture(): boolean {
    const didCleanup = this._session?.runtime.finishSession().didCleanup ?? false
    this._session = null

    return didCleanup
  }

  /** Завершает scale-сессию, только если удалён её активный Image. */
  finishGestureForTarget({
    target
  }: {
    target: FabricObject
  }): boolean {
    if (!this._session || this._session.target !== target) return false

    this.finishGesture()

    return true
  }

  /** Выполняет один scale-step либо передаёт его прежнему владельцу без частичного apply. */
  private _handleScaleStep({
    event,
    intentSource
  }: {
    event: ImageScaleInteractionEvent
    intentSource: ImageScaleIntentSource
  }): ImageScaleStepResult {
    const { _session: session } = this
    if (!session) return UNHANDLED_IMAGE_SCALE_STEP

    const marker = resolveScaleMarker({ event })
    const duplicate = session.runtime.getDuplicateStep({ marker })
    if (duplicate) return createDuplicateImageScaleStep({ duplicate })

    const pointerEvent = event.e
    if (!pointerEvent) return this._continueWithLegacyScale()
    if (!doesEventBelongToSession({ event, session })) return this._continueWithLegacyScale()
    if (isSideSkewStep({ session, pointerEvent })) return this._finishBeforeSkew()
    if (!isSameImageScaleGesture({ session })) return this._continueWithLegacyScale()

    const mode = resolveImageScaleMode({
      projection: session.projection,
      pointerEvent,
      editor: this._editor
    })
    const multipliers = resolveImageScaleRawMultipliers({
      event,
      intentSource,
      mode,
      session
    })
    if (!multipliers || multipliers.x <= 0 || multipliers.y <= 0) {
      return this._continueWithLegacyScale()
    }

    return this._applyScaleStep({
      marker,
      mode,
      multipliers,
      pointerEvent,
      session
    })
  }

  /** Рассчитывает, применяет один раз и проверяет текущий Image scale-step. */
  private _applyScaleStep({
    marker,
    mode,
    multipliers,
    pointerEvent,
    session
  }: {
    marker: object
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
    pointerEvent: TPointerEvent
    session: ImageScaleSession
  }): HandledImageScaleStep {
    const intent = createImageScaleRawIntent({
      mode,
      multipliers,
      pointerEvent
    })
    const step = session.runtime.resolveScalePlan({ marker, intent })
    if (step.kind === 'duplicate') {
      throw new Error('Image scale marker became duplicate after the initial runtime check')
    }

    try {
      this._applyScalePlan({ plan: step.plan, session })
      const finalGeometry = readFinalImageScaleGeometry({
        mode,
        plan: step.plan,
        session
      })
      const verification = session.runtime.verifyScalePlan({
        token: step.token,
        finalGeometry
      })
      if (didImageScaleChange({ session })) session.transform.actionPerformed = true

      return createHandledImageScaleStep({
        guides: verification.guides,
        shouldPublishGuides: true
      })
    } catch (error) {
      this.finishGesture()
      throw error
    }
  }

  /** Применяет оба рассчитанных multiplier относительно исходного Fabric scale. */
  private _applyScalePlan({
    plan,
    session
  }: {
    plan: ScaleSnapPlan
    session: ImageScaleSession
  }): void {
    const multipliers = resolveRectangularScaleMultipliers({
      projectionMode: plan.projectionMode,
      effectiveValues: plan.effectiveValues
    })
    if (multipliers.x <= 0 || multipliers.y <= 0) {
      throw new Error('Image scale plan must contain positive multipliers')
    }

    const scaleX = session.projection.originalScales.x * multipliers.x
    const scaleY = session.projection.originalScales.y * multipliers.y
    session.target.set({ scaleX, scaleY })
    session.transform.scaleX = session.target.scaleX
    session.transform.scaleY = session.target.scaleY
    session.target.setPositionByOrigin(
      new Point(session.projection.fixedAnchor.x, session.projection.fixedAnchor.y),
      session.transform.originX,
      session.transform.originY
    )
    session.target.setCoords()
  }

  /** Завершает unified-сессию до запуска существующего legacy scale path. */
  private _continueWithLegacyScale(): UnhandledImageScaleStep {
    return Object.freeze({
      handled: false,
      didFinishSession: this.finishGesture()
    })
  }

  /** Завершает scale-сессию и не запускает legacy scale поверх Fabric skew. */
  private _finishBeforeSkew(): HandledImageScaleStep {
    return createHandledImageScaleStep({
      guides: [],
      shouldPublishGuides: this.finishGesture()
    })
  }
}

/** Проверяет mouse:down и возвращает данные поддержанного Image scale. */
function resolveImageScaleGesture({
  event
}: {
  event: ImageScaleStartEvent
}): ImageScaleGesture | null {
  const { target, transform } = event
  if (!(target instanceof FabricImage) || !transform) return null
  if (transform.target !== target || !isSupportedImageScaleTarget({ target })) return null
  if (!isStandardImageScaleControl({ target, transform })) return null

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

/** Проверяет handler и геометрию активной ручки по стандартному Fabric-контракту. */
function isStandardImageScaleControl({
  target,
  transform
}: {
  target: FabricImage
  transform: Transform
}): boolean {
  const control = target.controls[transform.corner]
  const standardControl = STANDARD_IMAGE_SCALE_CONTROLS[transform.corner]
  if (!control || !standardControl) return false

  const behaviorMatches = [
    control.actionHandler === standardControl.actionHandler,
    control.getActionHandler === standardControl.getActionHandler,
    control.positionHandler === standardControl.positionHandler,
    control.getTransformAnchorPoint === standardControl.getTransformAnchorPoint,
    control.transformAnchorPoint === standardControl.transformAnchorPoint
  ]
  if (!behaviorMatches.every(Boolean)) return false

  const geometryPairs = [
    [control.x, standardControl.x],
    [control.y, standardControl.y],
    [control.offsetX, standardControl.offsetX],
    [control.offsetY, standardControl.offsetY]
  ]

  return geometryPairs.every(([value, standardValue]) => {
    return areNumbersNear({ first: value, second: standardValue })
  })
}

/** Проверяет доменные и affine-ограничения нового Image scale owner. */
function isSupportedImageScaleTarget({
  target
}: {
  target: FabricImage
}): boolean {
  const hasUnsupportedState = [
    target.group,
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

/** Сохраняет canonical и affine свойства, которые scale не должен менять. */
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

/** Проверяет принадлежность события исходным target и Fabric transform. */
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

/** Проверяет, что Fabric не переключил текущий жест на другой transform. */
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

/** Проверяет, что модификатор переключил боковую ручку со scale на skew. */
function isSideSkewStep({
  session,
  pointerEvent
}: {
  session: ImageScaleSession
  pointerEvent: TPointerEvent
}): boolean {
  const { controlKey } = session.projection
  const isSideControl = controlKey === 'ml'
    || controlKey === 'mr'
    || controlKey === 'mt'
    || controlKey === 'mb'
  if (!isSideControl) return false

  const altActionKey = session.target.canvas?.altActionKey
  if (!altActionKey) return false

  return Reflect.get(pointerEvent, altActionKey) === true
}

/** Выбирает scale-режим по ручке и текущей настройке proportional scale Fabric. */
function resolveImageScaleMode({
  projection,
  pointerEvent,
  editor
}: {
  projection: RectangularScaleGestureProjection
  pointerEvent: TPointerEvent
  editor: ImageEditor
}): RectangularScaleGestureMode {
  const { controlKey } = projection
  if (controlKey === 'ml' || controlKey === 'mr') return 'horizontal'
  if (controlKey === 'mt' || controlKey === 'mb') return 'vertical'

  const { uniformScaling, uniScaleKey } = editor.canvas
  const uniformIsToggled = Boolean(
    uniScaleKey && Reflect.get(pointerEvent, uniScaleKey) === true
  )
  const usesUniformScale = (uniformScaling && !uniformIsToggled)
    || (!uniformScaling && uniformIsToggled)

  return usesUniformScale ? 'uniform' : 'free'
}

/** Читает raw multiplier из Fabric preview или исходной pointer-проекции. */
function resolveImageScaleRawMultipliers({
  event,
  intentSource,
  mode,
  session
}: {
  event: ImageScaleInteractionEvent
  intentSource: ImageScaleIntentSource
  mode: RectangularScaleGestureMode
  session: ImageScaleSession
}): RectangularScaleMultipliers | null {
  if (intentSource === 'pointer-projection') {
    if (!event.scenePoint) return null

    return resolveRectangularScalePointerMultipliers({
      projection: session.projection,
      pointer: event.scenePoint,
      mode
    })
  }

  const multipliers = readFabricPreviewMultipliers({ session })
  if (!multipliers) return null
  if (mode === 'uniform' && !areNumbersNear({
    first: multipliers.x,
    second: multipliers.y
  })) return null

  return multipliers
}

/** Читает оба scale multiplier относительно immutable начала жеста. */
function readFabricPreviewMultipliers({
  session
}: {
  session: ImageScaleSession
}): RectangularScaleMultipliers | null {
  const { originalScales } = session.projection
  const x = session.target.scaleX / originalScales.x
  const y = session.target.scaleY / originalScales.y
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null

  return Object.freeze({ x, y })
}

/** Формирует raw intent общего resolver для выбранного Image scale-режима. */
function createImageScaleRawIntent({
  mode,
  multipliers,
  pointerEvent
}: {
  mode: RectangularScaleGestureMode
  multipliers: RectangularScaleMultipliers
  pointerEvent: TPointerEvent
}): ScaleRawIntent {
  return Object.freeze({
    projectionMode: mode,
    values: createRectangularScaleValues({ mode, multipliers }),
    modifiers: Object.freeze({
      ctrlKey: 'ctrlKey' in pointerEvent && pointerEvent.ctrlKey === true,
      shiftKey: 'shiftKey' in pointerEvent && pointerEvent.shiftKey === true
    })
  })
}

/** Читает точные границы, fixed anchor и multiplier после единственного apply. */
function readFinalImageScaleGeometry({
  mode,
  plan,
  session
}: {
  mode: RectangularScaleGestureMode
  plan: ScaleSnapPlan
  session: ImageScaleSession
}): FinalScaleGeometry {
  const bounds = getObjectExactBounds({ object: session.target })
  if (!bounds) throw new Error('Image scale snapping requires exact final bounds')

  const anchor = session.target.getPointByOrigin(
    session.transform.originX,
    session.transform.originY
  )
  const multipliers = readRequiredAppliedMultipliers({ session })

  return Object.freeze({
    bounds,
    fixedAnchor: createScaleScenePoint({ point: anchor }),
    measuredValues: createRectangularScaleValues({ mode, multipliers }),
    domainVerdict: Object.freeze({
      x: didReachScaleConstraint({
        bounds,
        constraint: plan.constraints.x,
        epsilon: plan.verificationEpsilon
      }) ? 'satisfied' : 'blocked',
      y: didReachScaleConstraint({
        bounds,
        constraint: plan.constraints.y,
        epsilon: plan.verificationEpsilon
      }) ? 'satisfied' : 'blocked',
      protectedState: isProtectedImageScaleStatePreserved({
        mode,
        multipliers,
        session
      }) ? 'preserved' : 'changed'
    })
  })
}

/** Возвращает применённые множители или завершает шаг на нарушении Fabric state. */
function readRequiredAppliedMultipliers({
  session
}: {
  session: ImageScaleSession
}): RectangularScaleMultipliers {
  const multipliers = readFabricPreviewMultipliers({ session })
  if (!multipliers || multipliers.x <= 0 || multipliers.y <= 0) {
    throw new Error('Image scale must contain positive applied multipliers')
  }

  return multipliers
}

/** Проверяет, что итоговая грань дошла до выбранной направляющей. */
function didReachScaleConstraint({
  bounds,
  constraint,
  epsilon
}: {
  bounds: ObjectBounds
  constraint: PlannedScaleConstraint | null
  epsilon: number
}): boolean {
  if (!constraint) return true

  return Math.abs(bounds[constraint.candidate.edge] - constraint.expectedPosition) <= epsilon
}

/** Проверяет canonical свойства Image и неактивные степени свободы scale. */
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

/** Проверяет canonical и affine свойства, которые applicator не должен менять. */
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

/** Проверяет, отличается ли хотя бы одна scale-ось от начала gesture. */
function didImageScaleChange({
  session
}: {
  session: ImageScaleSession
}): boolean {
  const multipliers = readRequiredAppliedMultipliers({ session })

  return !areNumbersNear({ first: multipliers.x, second: 1 })
    || !areNumbersNear({ first: multipliers.y, second: 1 })
}

/** Сравнивает два конечных числа в пределах допуска protected state. */
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

/** Копирует конечную точку в координатах canvas-сцены. */
function createScaleScenePoint({
  point
}: {
  point: RectangularScalePoint
}): ScaleScenePoint {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error('Image scale scene point must contain finite coordinates')
  }

  return Object.freeze({ x: point.x, y: point.y })
}

/** Выбирает native pointer event как marker или использует canvas event в тестах. */
function resolveScaleMarker({
  event
}: {
  event: ImageScaleInteractionEvent
}): object {
  const { e } = event
  if ((typeof e === 'object' && e !== null) || typeof e === 'function') return e

  return event
}

/** Формирует ответ без повторной публикации уже проверенного runtime-step. */
function createDuplicateImageScaleStep({
  duplicate
}: {
  duplicate: NonNullable<ReturnType<ScaleSnappingRuntime['getDuplicateStep']>>
}): HandledImageScaleStep {
  if (!duplicate.verification) {
    throw new Error('Duplicate Image scale step cannot be handled before verification')
  }

  return createHandledImageScaleStep({
    guides: duplicate.verification.guides,
    shouldPublishGuides: false
  })
}

/** Формирует ответ SnappingManager только из проверенных направляющих. */
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
