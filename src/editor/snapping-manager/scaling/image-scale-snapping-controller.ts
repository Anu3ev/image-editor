/* eslint-disable no-use-before-define -- Публичный контроллер расположен перед внутренними проверками. */
import {
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
} from './rectangular-scale-gesture-projection'
import {
  createScaleGestureBaseline,
  type ScaleRawIntent,
  type VerifiedScaleGuide
} from './scale-snapping-resolver'
import { ScaleSnappingRuntime } from './scale-snapping-runtime'
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

/** Данные Fabric-события, необходимые для одного шага скейлинга изображения. */
export type ImageScaleInteractionEvent = Readonly<{
  target?: FabricObject | null
  e?: TPointerEvent | null
  transform?: Transform | null
  pointer?: RectangularScalePoint
  scenePoint?: RectangularScalePoint
}>

/** Событие нажатия мыши, для которого Fabric уже создал преобразование выбранной ручки. */
export type ImageScaleStartEvent = ImageScaleInteractionEvent

/** Событие `object:scaling` для одного текущего шага скейлинга изображения. */
export type ImageScaleTransformEvent = ImageScaleInteractionEvent

/** Событие `mouse:move`, которое может заменить отсутствующий `object:scaling`. */
export type ImageScaleMouseMoveEvent = ImageScaleInteractionEvent

/** Событие должен обработать прежний владелец скейлинга. */
export type UnhandledImageScaleStep = Readonly<{
  handled: false
  didFinishSession: boolean
}>

/** Событие полностью обработано новым владельцем скейлинга изображения. */
export type HandledImageScaleStep = Readonly<{
  handled: true
  guides: readonly VerifiedScaleGuide[]
  shouldPublishGuides: boolean
}>

/** Результат маршрутизации одного шага скейлинга изображения. */
export type ImageScaleStepResult = UnhandledImageScaleStep | HandledImageScaleStep

/** Свойства изображения и преобразования Fabric, которые не должны меняться при скейлинге. */
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

/** Проверенные данные одного поддерживаемого жеста скейлинга изображения. */
type ImageScaleGesture = Readonly<{
  projectionTransform: RectangularScaleGestureTransform
  target: FabricImage
  transform: Transform
}>

/** Временное состояние одного активного жеста скейлинга изображения. */
type ImageScaleSession = Readonly<{
  projection: RectangularScaleGestureProjection
  protectedState: ImageScaleProtectedState
  runtime: ScaleSnappingRuntime
  target: FabricImage
  transform: Transform
}>

/** Неизменяемый ответ при отсутствии активной унифицированной сессии. */
const UNHANDLED_IMAGE_SCALE_STEP: UnhandledImageScaleStep = Object.freeze({
  handled: false,
  didFinishSession: false
})

/** Допуск при сравнении коэффициентов масштаба и защищённых свойств изображения. */
const IMAGE_SCALE_STATE_EPSILON = 0.000000001

/**
 * Владеет унифицированной сессией скейлинга одиночного верхнеуровневого FabricImage.
 * Неподдерживаемые геометрические состояния и нестандартные ручки остаются на прежнем пути.
 */
export class ImageScaleSnappingController {
  /** Редактор с холстом и общим окружением прилипания. */
  private readonly _editor: ImageEditor

  /** Текущий поддерживаемый жест или null для прежнего сценария. */
  private _session: ImageScaleSession | null = null

  /** Создаёт владельца скейлинга изображения для текущего холста. */
  constructor({
    editor
  }: {
    editor: ImageEditor
  }) {
    this._editor = editor
  }

  /** Фиксирует неизменяемое исходное состояние поддерживаемого жеста. */
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

  /** Обрабатывает исходный масштаб, уже применённый стандартным обработчиком Fabric. */
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

  /** Обрабатывает новое движение мыши, если Fabric не отправил `object:scaling`. */
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

  /** Идемпотентно завершает временную сессию скейлинга и сообщает об очистке. */
  finishGesture(): boolean {
    const didCleanup = this._session?.runtime.finishSession().didCleanup ?? false
    this._session = null

    return didCleanup
  }

  /** Прерывает активное преобразование Fabric и гарантированно очищает сессию. */
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

  /** Завершает сессию скейлинга, только если удалено её активное изображение. */
  finishGestureForTarget({
    target
  }: {
    target: FabricObject
  }): boolean {
    if (!this._session || this._session.target !== target) return false

    this.finishGesture()

    return true
  }

  /** Выполняет один шаг скейлинга либо целиком передаёт его прежнему владельцу. */
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
    if (duplicate) return createDuplicateImageScaleStep({ duplicate })

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

  /** Рассчитывает, один раз применяет и проверяет текущий шаг скейлинга изображения. */
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
      throw new Error('Шаг скейлинга изображения стал повторным после начальной проверки сессии')
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

  /** Завершает унифицированную сессию до запуска прежней логики скейлинга. */
  private _continueWithLegacyScale(): UnhandledImageScaleStep {
    return Object.freeze({
      handled: false,
      didFinishSession: this.finishGesture()
    })
  }

  /** Завершает сессию и не запускает прежнюю логику скейлинга поверх наклона Fabric. */
  private _finishBeforeSkew(): HandledImageScaleStep {
    return createHandledImageScaleStep({
      guides: [],
      shouldPublishGuides: this.finishGesture()
    })
  }
}

/** Проверяет `mouse:down` и возвращает данные поддерживаемого скейлинга изображения. */
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

/** Проверяет доменные и геометрические ограничения нового владельца скейлинга. */
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

/** Сохраняет канонические и геометрические свойства, которые не должны меняться. */
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

/** Проверяет принадлежность события исходному изображению и преобразованию Fabric. */
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

/** Проверяет, что Fabric не переключил текущий жест на другое преобразование. */
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

/** Проверяет канонические свойства изображения и неизменяемые оси скейлинга. */
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

/** Проверяет канонические и геометрические свойства, которые не должны меняться. */
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

/** Проверяет, изменился ли масштаб хотя бы по одной оси относительно начала жеста. */
function didImageScaleChange({
  multipliers
}: {
  multipliers: RectangularScaleMultipliers
}): boolean {
  return !areNumbersNear({ first: multipliers.x, second: 1 })
    || !areNumbersNear({ first: multipliers.y, second: 1 })
}

/** Сравнивает два конечных числа в пределах допуска защищённого состояния. */
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

/** Использует исходное событие указателя как идентификатор шага, а при его отсутствии — событие холста. */
function resolveScaleMarker({
  event
}: {
  event: ImageScaleInteractionEvent
}): object {
  const { e } = event
  if ((typeof e === 'object' && e !== null) || typeof e === 'function') return e

  return event
}

/** Формирует ответ без повторной публикации уже проверенного шага. */
function createDuplicateImageScaleStep({
  duplicate
}: {
  duplicate: NonNullable<ReturnType<ScaleSnappingRuntime['getDuplicateStep']>>
}): HandledImageScaleStep {
  if (!duplicate.verification) {
    throw new Error('Повторный шаг скейлинга изображения не может завершиться до проверки результата')
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
