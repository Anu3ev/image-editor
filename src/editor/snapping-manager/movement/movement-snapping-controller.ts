/* eslint-disable no-use-before-define -- Публичный контроллер расположен перед внутренними преобразованиями результата. */
import {
  FabricImage,
  Textbox,
  type BasicTransformEvent,
  type FabricObject,
  type TPointerEvent
} from 'fabric'

import type { ImageEditor } from '../..'
import {
  createMovementSnapEnvironment,
  type MovementSnapCandidateSource,
  type MovementSnapEnvironment
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
import { isShapeGroup } from '../../shape-manager/domain/shape-reference'
import type { ShapeGroup } from '../../shape-manager/types'

/** Верхнеуровневые объекты, уже переведённые на общую логику перемещения. */
type SupportedMovementTarget = FabricImage | ShapeGroup | Textbox

/** Событие canvas для одного шага перемещения. */
type ObjectMovementTransformEvent = BasicTransformEvent<TPointerEvent> & {
  target?: FabricObject | null
  e?: TPointerEvent | null
}

/** Событие остаётся на прежнем пути обработки перемещения. */
type UnhandledObjectMovementStep = Readonly<{
  handled: false
}>

/** Событие обработано общим контроллером, включая шаг без направляющих. */
type HandledObjectMovementStep = Readonly<{
  handled: true
  guides: readonly GuideLine[]
  spacingGuides: readonly SpacingGuide[]
}>

/** Результат маршрутизации одного шага перемещения. */
type ObjectMovementStepResult = UnhandledObjectMovementStep | HandledObjectMovementStep

/** Неизменяемый результат для типов объектов, которые ещё не перенесены. */
const UNHANDLED_OBJECT_MOVEMENT_STEP: UnhandledObjectMovementStep = Object.freeze({
  handled: false
})

/**
 * Управляет общей сессией прилипания при перемещении изображения, шейпа или отдельного текста.
 * Остальные типы объектов продолжают использовать прежний путь обработки.
 */
export class MovementSnappingController {
  private readonly _editor: ImageEditor

  private readonly _runtime = new MovementSnappingRuntime()

  private _activeTarget: SupportedMovementTarget | null = null

  /** Создаёт контроллер перемещения для canvas текущего редактора. */
  constructor({
    editor
  }: {
    editor: ImageEditor
  }) {
    this._editor = editor
  }

  /** Начинает общую сессию только для уже перенесённого верхнеуровневого объекта. */
  startGesture({
    target
  }: {
    target?: FabricObject | null
  }): void {
    this.finishGesture()
    if (!this._isSupportedTarget(target)) return

    const bounds = getObjectExactBounds({ object: target })
    if (!bounds) {
      throw new Error('Object movement snapping requires exact target bounds')
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
  }

  /** Рассчитывает, один раз применяет и проверяет текущий шаг перемещения. */
  handleObjectMoving({
    event
  }: {
    event: ObjectMovementTransformEvent
  }): ObjectMovementStepResult {
    const { target } = event
    const activeTarget = this._activeTarget
    if (!target || !activeTarget || target !== activeTarget) return UNHANDLED_OBJECT_MOVEMENT_STEP

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

  /** Идемпотентно очищает временное состояние перемещения. */
  finishGesture(): void {
    this._runtime.finishSession()
    this._activeTarget = null
  }

  /** Завершает сессию, если с canvas удалён перемещаемый объект. */
  finishGestureForTarget({
    target
  }: {
    target: FabricObject
  }): boolean {
    if (target !== this._activeTarget) return false

    this.finishGesture()

    return true
  }

  /** Разрешает обычное перемещение одиночного изображения, шейпа или отдельного текста. */
  private _isSupportedTarget(
    target?: FabricObject | null
  ): target is SupportedMovementTarget {
    if (!target || target.group) return false

    return target instanceof FabricImage || target instanceof Textbox || isShapeGroup(target)
  }

  /** Фиксирует положение объекта после перемещения Fabric, но до применения прилипания. */
  private _createRawIntent({
    target,
    event
  }: {
    target: SupportedMovementTarget
    event: ObjectMovementTransformEvent
  }): MovementRawIntent {
    const bounds = getObjectExactBounds({ object: target })
    if (!bounds) {
      throw new Error('Object movement snapping requires exact raw bounds')
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

  /** Один раз применяет рассчитанную позицию, если она отличается от позиции Fabric. */
  private _applyMovementPlan({
    target,
    plan
  }: {
    target: SupportedMovementTarget
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
    target: SupportedMovementTarget
  }): FinalMovementGeometry {
    const bounds = getObjectExactBounds({ object: target })
    if (!bounds) {
      throw new Error('Object movement snapping requires exact final bounds')
    }

    return {
      bounds,
      position: this._readTargetPosition({ target })
    }
  }

  /** Читает фактические координаты Fabric без подстановки значений по умолчанию. */
  private _readTargetPosition({
    target
  }: {
    target: SupportedMovementTarget
  }): MovementTargetPosition {
    if (!Number.isFinite(target.left) || !Number.isFinite(target.top)) {
      throw new Error('Object movement snapping requires finite target position')
    }

    return {
      left: target.left,
      top: target.top
    }
  }

  /** Один раз фиксирует точные границы неподвижных объектов и монтажной области. */
  private _captureEnvironment({
    activeObject
  }: {
    activeObject: SupportedMovementTarget
  }): MovementSnapEnvironment {
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
    activeObject: SupportedMovementTarget
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

/** Выбирает браузерное событие как маркер шага или использует событие canvas. */
function resolveMovementMarker({
  event
}: {
  event: ObjectMovementTransformEvent
}): object {
  const { e } = event
  if ((typeof e === 'object' && e !== null) || typeof e === 'function') return e

  return event
}

/** Возвращает уже подтверждённый результат, не читая повторно изменённый объект. */
function createDuplicateStepResult({
  duplicate
}: {
  duplicate: DuplicateMovementRuntimeStep
}): HandledObjectMovementStep {
  if (!duplicate.verification) {
    throw new Error('Duplicate movement step cannot be handled before verification')
  }

  return createHandledStepResult({
    verification: duplicate.verification
  })
}

/** Преобразует проверенный результат в формат отрисовки SnappingManager. */
function createHandledStepResult({
  verification
}: {
  verification: MovementSnapVerification
}): HandledObjectMovementStep {
  return Object.freeze({
    handled: true,
    guides: Object.freeze(createMovementGuideLines({ guides: verification.guides })),
    spacingGuides: Object.freeze([...verification.spacingGuides])
  })
}
