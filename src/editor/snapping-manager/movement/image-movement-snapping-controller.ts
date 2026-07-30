/* eslint-disable no-use-before-define -- Публичный controller расположен перед внутренними преобразованиями результата. */
import {
  FabricImage,
  type BasicTransformEvent,
  type FabricObject,
  type TPointerEvent
} from 'fabric'

import type { ImageEditor } from '../..'
import {
  createMovementSnapEnvironment,
  type MovementSnapCandidateSource
} from './movement-snap-candidates'
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
import {
  collectExcludedObjects,
  shouldIgnoreObject
} from '../../utils/object-filter'

/** Canvas-событие одного live movement-step. */
export type ImageMovementTransformEvent = BasicTransformEvent<TPointerEvent> & {
  target?: FabricObject | null
  e?: TPointerEvent | null
}

/** Событие обработает legacy movement owner. */
export type UnhandledImageMovementStep = Readonly<{
  handled: false
}>

/** Событие обработано новым movement owner, включая отсутствие guide. */
export type HandledImageMovementStep = Readonly<{
  handled: true
  guides: readonly GuideLine[]
  spacingGuides: readonly SpacingGuide[]
}>

/** Результат маршрутизации одного movement-step. */
export type ImageMovementStepResult = UnhandledImageMovementStep | HandledImageMovementStep

/** Неизменяемый результат для target-ов, которые ещё не мигрированы. */
const UNHANDLED_IMAGE_MOVEMENT_STEP: UnhandledImageMovementStep = Object.freeze({
  handled: false
})

/**
 * Владеет unified movement-сессией одиночного изображения.
 * Остальные target-ы до следующих этапов продолжают использовать legacy owner.
 */
export class ImageMovementSnappingController {
  private readonly _editor: ImageEditor

  private readonly _runtime = new MovementSnappingRuntime()

  private _activeTarget: FabricImage | null = null

  /** Создаёт movement owner для canvas текущего редактора. */
  constructor({
    editor
  }: {
    editor: ImageEditor
  }) {
    this._editor = editor
  }

  /** Начинает unified-сессию только для поддержанного одиночного изображения. */
  startGesture({
    target
  }: {
    target?: FabricObject | null
  }): boolean {
    this.finishGesture()
    if (!this._isSupportedTarget(target)) return false

    const bounds = getObjectExactBounds({ object: target })
    if (!bounds) {
      throw new Error('Image movement snapping requires exact target bounds')
    }

    const position = this._readTargetPosition({ target })
    const environment = this._captureEnvironment({ activeObject: target })
    const baseline = createMovementGestureBaseline({
      bounds,
      position,
      environment
    })

    this._runtime.startSession({ baseline })
    this._activeTarget = target

    return true
  }

  /** Рассчитывает, применяет один раз и проверяет текущий Image movement-step. */
  handleObjectMoving({
    event
  }: {
    event: ImageMovementTransformEvent
  }): ImageMovementStepResult {
    const { target } = event
    const activeTarget = this._activeTarget
    if (!target || !activeTarget || target !== activeTarget) return UNHANDLED_IMAGE_MOVEMENT_STEP

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

  /** Идемпотентно очищает transient movement-состояние. */
  finishGesture(): void {
    this._runtime.finishSession()
    this._activeTarget = null
  }

  /** Возвращает true только для top-level FabricImage текущей фазы. */
  private _isSupportedTarget(
    target?: FabricObject | null
  ): target is FabricImage {
    return target instanceof FabricImage && !target.group
  }

  /** Создаёт raw intent до любой post-Fabric мутации текущего шага. */
  private _createRawIntent({
    target,
    event
  }: {
    target: FabricImage
    event: ImageMovementTransformEvent
  }): MovementRawIntent {
    const bounds = getObjectExactBounds({ object: target })
    if (!bounds) {
      throw new Error('Image movement snapping requires exact raw bounds')
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

  /** Применяет одну итоговую target translation, если plan изменил raw position. */
  private _applyMovementPlan({
    target,
    plan
  }: {
    target: FabricImage
    plan: MovementSnapPlan
  }): void {
    const { left, top } = plan.nextPosition
    if (target.left === left && target.top === top) return

    target.set({ left, top })
    target.setCoords()
  }

  /** Читает фактическую геометрию после единственного применения плана. */
  private _readFinalGeometry({
    target
  }: {
    target: FabricImage
  }): FinalMovementGeometry {
    const bounds = getObjectExactBounds({ object: target })
    if (!bounds) {
      throw new Error('Image movement snapping requires exact final bounds')
    }

    return {
      bounds,
      position: this._readTargetPosition({ target })
    }
  }

  /** Читает конечные Fabric left/top без fallback-нормализации. */
  private _readTargetPosition({
    target
  }: {
    target: FabricImage
  }): MovementTargetPosition {
    if (!Number.isFinite(target.left) || !Number.isFinite(target.top)) {
      throw new Error('Image movement snapping requires finite target position')
    }

    return {
      left: target.left,
      top: target.top
    }
  }

  /** Фиксирует exact bounds неподвижных целей и montage один раз на gesture. */
  private _captureEnvironment({
    activeObject
  }: {
    activeObject: FabricImage
  }) {
    const sources = this._collectCandidateSources({ activeObject })
    const montageBounds = getObjectExactBounds({ object: this._editor.montageArea })
    if (montageBounds) {
      sources.push({
        id: 'montage-area',
        bounds: montageBounds,
        edgeCategory: 'domain-boundary'
      })
    }

    return createMovementSnapEnvironment({
      sources,
      zoom: this._editor.canvas.getZoom() || 1
    })
  }

  /** Собирает стабильные цели обычного и равноудалённого прилипания. */
  private _collectCandidateSources({
    activeObject
  }: {
    activeObject: FabricImage
  }): MovementSnapCandidateSource[] {
    const excluded = collectExcludedObjects({ activeObject })
    const sources: MovementSnapCandidateSource[] = []

    this._editor.canvas.forEachObject((object) => {
      if (shouldIgnoreObject({ object, excluded })) return

      const bounds = getObjectExactBounds({ object })
      if (!bounds) return

      sources.push({
        id: `object:${sources.length}:${object.id ?? object.type}`,
        bounds,
        useForSpacing: true
      })
    })

    return sources
  }
}

/** Выбирает native event как marker или использует canvas event для тестового пути. */
function resolveMovementMarker({
  event
}: {
  event: ImageMovementTransformEvent
}): object {
  const { e } = event
  if ((typeof e === 'object' && e !== null) || typeof e === 'function') return e

  return event
}

/** Возвращает уже подтверждённый результат, не читая повторно изменённый target. */
function createDuplicateStepResult({
  duplicate
}: {
  duplicate: DuplicateMovementRuntimeStep
}): HandledImageMovementStep {
  if (!duplicate.verification) {
    throw new Error('Duplicate movement step cannot be handled before verification')
  }

  return createHandledStepResult({
    verification: duplicate.verification
  })
}

/** Преобразует verification в renderer-контракт SnappingManager. */
function createHandledStepResult({
  verification
}: {
  verification: MovementSnapVerification
}): HandledImageMovementStep {
  return Object.freeze({
    handled: true,
    guides: Object.freeze(createMovementGuideLines({ guides: verification.guides })),
    spacingGuides: Object.freeze([...verification.spacingGuides])
  })
}
