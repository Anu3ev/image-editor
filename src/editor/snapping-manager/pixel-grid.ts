/* eslint-disable no-use-before-define -- Публичные pixel-grid функции держим выше private helpers. */
import {
  FabricImage,
  FabricObject,
  Textbox,
  Transform
} from 'fabric'

import {
  getObjectBounds,
  type ObjectBounds
} from '../utils/geometry'
import { MOVE_SNAP_STEP } from './constants'

/** Допуск сравнения guide с целой пиксельной координатой. */
const SNAP_GUARD_INTEGER_POSITION_EPSILON = 0.01

/** Допуск subpixel-дрейфа active edge вокруг guide после Fabric resize. */
const SNAP_GUARD_POSITION_EPSILON = 0.1

/** Допуск сравнения scale source-плоскости с scene-плоскостью. */
const SOURCE_DISPLAY_SCALE_EPSILON = 0.000001

/** Активное ребро, которое уже было приклеено к guide текущим scaling snap. */
export type ScalingStepSnapGuard = {
  type: 'vertical' | 'horizontal'
  edge: 'left' | 'right' | 'top' | 'bottom'
  position: number
}

/** Кандидат scale после округления display-size к целому пикселю. */
type ScalingStepCandidate = {
  scaleX: number
  scaleY: number
}

/** Положение кандидата относительно snapped guide. */
type ScalingStepCandidateSnapState = 'on-guide' | 'inside' | 'outside'

/** Fixed anchor, который нужно сохранять во время post-snap округления scale. */
type ScalingStepPlacement = {
  left: number
  top: number
  originX: FabricObject['originX']
  originY: FabricObject['originY']
}

/** Контракт восстановления fixed anchor во время одного шага pixel-grid округления. */
type ScalingStepPlacementPreserver = {
  placement: ScalingStepPlacement
  applyPlacement: (placement: ScalingStepPlacement) => void
}

/** Параметры выбора pixel-scale, который сохраняет активные snap guards. */
type GuardedScalingStepParams = {
  target: FabricObject
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  fallbackScale: ScalingStepCandidate
  isUniform: boolean
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards: ScalingStepSnapGuard[]
}

/** Оси scale, которые реально меняются в текущем Fabric transform. */
type ScalingAxisRoundingState = {
  shouldRoundScaleX: boolean
  shouldRoundScaleY: boolean
}

/** Объект, у которого display-size может жить в source-пикселях, а не в scene-пикселях. */
type SourceDisplaySizeTarget = FabricObject & {
  cropSourceScaleX?: number
  cropSourceScaleY?: number
}

/**
 * Возвращает true, если live-scaling объекта нужно округлять до целого пиксельного размера.
 * Для изображений и текста сохраняем их собственный runtime-контракт без дополнительной квантизации.
 */
export function shouldApplyPixelScalingStep({ target }: { target: FabricObject }): boolean {
  const targetType = typeof target.type === 'string' ? target.type.toLowerCase() : ''
  const isTextTarget = target instanceof Textbox
    || targetType === 'textbox'
    || targetType === 'background-textbox'

  return !(target instanceof FabricImage) && !isTextTarget
}

/**
 * Применяет шаг перемещения, округляя координаты объекта к сетке MOVE_SNAP_STEP.
 */
export function applyMovementStep({
  target,
  transform
}: {
  target: FabricObject
  transform?: Transform | null
}): void {
  const { left = 0, top = 0 } = target
  const snappedLeft = Math.round(left / MOVE_SNAP_STEP) * MOVE_SNAP_STEP
  const snappedTop = Math.round(top / MOVE_SNAP_STEP) * MOVE_SNAP_STEP
  const originalLeft = typeof transform?.original?.left === 'number'
    ? transform.original.left
    : null
  const originalTop = typeof transform?.original?.top === 'number'
    ? transform.original.top
    : null
  const shouldSnapX = originalLeft === null || originalLeft !== left
  const shouldSnapY = originalTop === null || originalTop !== top
  const updates: Partial<Record<'left' | 'top', number>> = {}

  if (shouldSnapX && snappedLeft !== left) {
    updates.left = snappedLeft
  }

  if (shouldSnapY && snappedTop !== top) {
    updates.top = snappedTop
  }

  if (!('left' in updates) && !('top' in updates)) return

  target.set(updates)
  target.setCoords()
}

/**
 * Возвращает эффективные размеры текстового объекта без масштаба.
 */
function resolveTextboxDimensions({ target }: { target: Textbox }): { width: number; height: number } {
  const {
    width = 0,
    height = 0,
    paddingTop = 0,
    paddingRight = 0,
    paddingBottom = 0,
    paddingLeft = 0,
    strokeWidth = 0
  } = target

  return {
    width: width + paddingLeft + paddingRight + strokeWidth,
    height: height + paddingTop + paddingBottom + strokeWidth
  }
}

/**
 * Возвращает базовые размеры из доменного display-size, если объект сам определяет такую геометрию.
 */
function resolveDisplaySizeDimensions({
  target,
  scaleX,
  scaleY
}: {
  target: FabricObject
  scaleX: number
  scaleY: number
}): { width: number; height: number } | null {
  const displaySize = target.getObjectDisplaySize?.()
  if (!displaySize) return null

  const absScaleX = Math.abs(scaleX)
  const absScaleY = Math.abs(scaleY)
  if (absScaleX <= 0 || absScaleY <= 0) return null
  if (!Number.isFinite(displaySize.width) || !Number.isFinite(displaySize.height)) return null
  if (displaySize.width <= 0 || displaySize.height <= 0) return null

  return {
    width: displaySize.width / absScaleX,
    height: displaySize.height / absScaleY
  }
}

/**
 * Возвращает эффективные размеры объекта без масштаба.
 */
function resolveEffectiveDimensions({
  target,
  scaleX,
  scaleY
}: {
  target: FabricObject
  scaleX: number
  scaleY: number
}): { width: number; height: number } {
  const displayDimensions = resolveDisplaySizeDimensions({
    target,
    scaleX,
    scaleY
  })
  if (displayDimensions) return displayDimensions

  if (target instanceof Textbox) {
    return resolveTextboxDimensions({ target })
  }

  const {
    width = 0,
    height = 0,
    strokeWidth = 0,
    strokeUniform = false
  } = target
  const strokeContribution = strokeUniform ? 0 : strokeWidth

  return {
    width: width + strokeContribution,
    height: height + strokeContribution
  }
}

/**
 * Округляет масштаб объекта так, чтобы его измеряемый размер в пикселях был целым числом.
 */
export function applyScalingStep({
  target,
  transform,
  preservePlacement,
  snapGuards = []
}: {
  target: FabricObject
  transform?: Transform | null
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards?: ScalingStepSnapGuard[]
}): void {
  const {
    scaleX: rawScaleX = 1,
    scaleY: rawScaleY = 1
  } = target

  const roundingState = resolveScalingAxisRoundingState({
    transform,
    rawScaleX,
    rawScaleY
  })
  if (!roundingState.shouldRoundScaleX && !roundingState.shouldRoundScaleY) return

  const { width: effectiveWidth, height: effectiveHeight } = resolveEffectiveDimensions({
    target,
    scaleX: rawScaleX,
    scaleY: rawScaleY
  })
  const snappedScale = resolveSnappedScalingStep({
    target,
    rawScaleX,
    rawScaleY,
    effectiveWidth,
    effectiveHeight,
    preservePlacement,
    snapGuards
  })
  const nextScale = resolveScaleForRoundedAxes({
    rawScaleX,
    rawScaleY,
    snappedScale,
    roundingState
  })

  const isAlreadySnapped = nextScale.scaleX === rawScaleX && nextScale.scaleY === rawScaleY

  if (isAlreadySnapped) return

  applyResolvedScalingStep({
    target,
    transform,
    preservePlacement,
    scale: nextScale
  })
}

/**
 * Возвращает оси, которые можно округлять в текущем scaling-step.
 */
function resolveScalingAxisRoundingState({
  transform,
  rawScaleX,
  rawScaleY
}: {
  transform?: Transform | null
  rawScaleX: number
  rawScaleY: number
}): ScalingAxisRoundingState {
  return {
    shouldRoundScaleX: shouldRoundScalingAxis({
      transform,
      axis: 'x',
      rawScale: rawScaleX
    }),
    shouldRoundScaleY: shouldRoundScalingAxis({
      transform,
      axis: 'y',
      rawScale: rawScaleY
    })
  }
}

/**
 * Оставляет raw scale на осях, которые Fabric transform не менял в этом шаге.
 */
function resolveScaleForRoundedAxes({
  rawScaleX,
  rawScaleY,
  snappedScale,
  roundingState
}: {
  rawScaleX: number
  rawScaleY: number
  snappedScale: ScalingStepCandidate
  roundingState: ScalingAxisRoundingState
}): ScalingStepCandidate {
  const nextScale = {
    ...snappedScale
  }

  if (!roundingState.shouldRoundScaleX) {
    nextScale.scaleX = rawScaleX
  }
  if (!roundingState.shouldRoundScaleY) {
    nextScale.scaleY = rawScaleY
  }

  return nextScale
}

/**
 * Применяет округлённый scale к Fabric target, transform и fixed placement.
 */
function applyResolvedScalingStep({
  target,
  transform,
  preservePlacement,
  scale
}: {
  target: FabricObject
  transform?: Transform | null
  preservePlacement?: ScalingStepPlacementPreserver
  scale: ScalingStepCandidate
}): void {
  target.set({
    scaleX: scale.scaleX,
    scaleY: scale.scaleY
  })

  if (preservePlacement) {
    preservePlacement.applyPlacement(preservePlacement.placement)
  }

  if (transform) {
    transform.scaleX = scale.scaleX
    transform.scaleY = scale.scaleY
  }

  target.setCoords()
}

/**
 * Возвращает true, если scale по оси реально изменился в текущем Fabric transform.
 */
function shouldRoundScalingAxis({
  transform,
  axis,
  rawScale
}: {
  transform?: Transform | null
  axis: 'x' | 'y'
  rawScale: number
}): boolean {
  if (!transform) return true

  const originalScale = axis === 'x'
    ? transform.original?.scaleX
    : transform.original?.scaleY
  if (typeof originalScale !== 'number') return true

  return originalScale !== rawScale
}

/**
 * Возвращает итоговый scale после pixel-rounding и ограничений активных snap-guide.
 */
function resolveSnappedScalingStep({
  target,
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight,
  preservePlacement,
  snapGuards
}: {
  target: FabricObject
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards: ScalingStepSnapGuard[]
}): ScalingStepCandidate {
  const roundedScale = resolveRoundedScalingStep({
    rawScaleX,
    rawScaleY,
    effectiveWidth,
    effectiveHeight
  })

  if (snapGuards.length === 0) return roundedScale

  return resolveGuardedScalingStep({
    target,
    rawScaleX,
    rawScaleY,
    effectiveWidth,
    effectiveHeight,
    fallbackScale: roundedScale,
    isUniform: rawScaleX === rawScaleY,
    preservePlacement,
    snapGuards
  })
}

/**
 * Возвращает ближайший scale, при котором display-size объекта становится целым.
 */
function resolveRoundedScalingStep({
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight
}: {
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
}): ScalingStepCandidate {
  if (rawScaleX === rawScaleY) {
    return resolveRoundedUniformScalingStep({
      rawScale: rawScaleX,
      effectiveWidth,
      effectiveHeight
    })
  }

  return {
    scaleX: resolveRoundedAxisScale({
      rawScale: rawScaleX,
      effectiveSize: effectiveWidth
    }),
    scaleY: resolveRoundedAxisScale({
      rawScale: rawScaleY,
      effectiveSize: effectiveHeight
    })
  }
}

/**
 * Возвращает uniform scale по той оси, где округление меньше двигает текущий scale.
 */
function resolveRoundedUniformScalingStep({
  rawScale,
  effectiveWidth,
  effectiveHeight
}: {
  rawScale: number
  effectiveWidth: number
  effectiveHeight: number
}): ScalingStepCandidate {
  const candidateFromWidth = resolveRoundedAxisScale({
    rawScale,
    effectiveSize: effectiveWidth
  })
  const candidateFromHeight = resolveRoundedAxisScale({
    rawScale,
    effectiveSize: effectiveHeight
  })
  const widthError = Math.abs(candidateFromWidth - rawScale)
  const heightError = Math.abs(candidateFromHeight - rawScale)
  const scale = widthError <= heightError ? candidateFromWidth : candidateFromHeight

  return {
    scaleX: scale,
    scaleY: scale
  }
}

/**
 * Возвращает scale одной оси для ближайшего целого display-size.
 */
function resolveRoundedAxisScale({
  rawScale,
  effectiveSize
}: {
  rawScale: number
  effectiveSize: number
}): number {
  if (effectiveSize <= 0) return rawScale

  return Math.max(1, Math.round(effectiveSize * rawScale)) / effectiveSize
}

/**
 * Возвращает ближайший pixel-scale, который не переносит snapped edge за его guide.
 */
function resolveGuardedScalingStep({
  target,
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight,
  fallbackScale,
  isUniform,
  preservePlacement,
  snapGuards
}: GuardedScalingStepParams): ScalingStepCandidate {
  if (shouldKeepCurrentIntegerGuideSnap({
    target,
    snapGuards
  })) {
    return {
      scaleX: rawScaleX,
      scaleY: rawScaleY
    }
  }

  const candidates = collectScalingStepCandidates({
    rawScaleX,
    rawScaleY,
    effectiveWidth,
    effectiveHeight,
    isUniform
  })
  const shouldPreferInsideCandidate = usesScaledDisplaySizeForSnapGuards({
    target,
    snapGuards
  })
  let onGuideCandidate: ScalingStepCandidate | null = null
  let insideCandidate: ScalingStepCandidate | null = null

  for (const candidate of candidates) {
    const snapState = resolveScalingStepCandidateSnapState({
      target,
      candidate,
      preservePlacement,
      snapGuards
    })

    if (snapState === 'on-guide') {
      if (!shouldPreferInsideCandidate) return candidate

      if (!onGuideCandidate) {
        onGuideCandidate = candidate
      }
    }
    if (snapState === 'inside' && !insideCandidate) {
      insideCandidate = candidate
    }
  }

  if (insideCandidate) return insideCandidate
  if (onGuideCandidate) return onGuideCandidate

  return fallbackScale
}

/**
 * Возвращает true, если raw scale уже удерживает edge на integer guide
 * и display-size объекта живёт в той же pixel-плоскости, что и сам guide.
 */
function shouldKeepCurrentIntegerGuideSnap({
  target,
  snapGuards
}: {
  target: FabricObject
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  if (usesScaledDisplaySizeForSnapGuards({ target, snapGuards })) return false

  const bounds = getObjectBounds({ object: target })
  if (!bounds) return false

  for (const snapGuard of snapGuards) {
    if (!isSnapGuardPositionPixelAligned({ snapGuard })) return false
    if (!isObjectBoundsOnSnapGuide({ bounds, snapGuard })) return false
    if (!hasValidRoundedBoundsSize({ bounds, snapGuard })) return false
  }

  return true
}

/**
 * Возвращает true, если active snap axis показывает размер в source-пикселях с отдельным scale.
 */
function usesScaledDisplaySizeForSnapGuards({
  target,
  snapGuards
}: {
  target: FabricObject
  snapGuards: ScalingStepSnapGuard[]
}): boolean {
  if (typeof target.getObjectDisplaySize !== 'function') return false

  const displayTarget = target as SourceDisplaySizeTarget
  const usesScaledX = snapGuards.some((snapGuard) => {
    return snapGuard.type === 'vertical' && !isSceneDisplayScale({
      scale: displayTarget.cropSourceScaleX
    })
  })
  const usesScaledY = snapGuards.some((snapGuard) => {
    return snapGuard.type === 'horizontal' && !isSceneDisplayScale({
      scale: displayTarget.cropSourceScaleY
    })
  })

  return usesScaledX || usesScaledY
}

/**
 * Возвращает true, если display-size axis совпадает со scene pixel axis.
 */
function isSceneDisplayScale({ scale }: { scale?: number }): boolean {
  const safeScale = Math.abs(scale ?? 1)

  return Math.abs(safeScale - 1) <= SOURCE_DISPLAY_SCALE_EPSILON
}

/**
 * Проверяет, что guide находится на целой пиксельной координате.
 */
function isSnapGuardPositionPixelAligned({
  snapGuard
}: {
  snapGuard: ScalingStepSnapGuard
}): boolean {
  const integerPosition = Math.round(snapGuard.position)

  return Math.abs(snapGuard.position - integerPosition) <= SNAP_GUARD_INTEGER_POSITION_EPSILON
}

/**
 * Проверяет, что фактический bounds-size по оси snapped edge можно показать как валидный пиксельный размер.
 */
function hasValidRoundedBoundsSize({
  bounds,
  snapGuard
}: {
  bounds: ObjectBounds
  snapGuard: ScalingStepSnapGuard
}): boolean {
  const boundsSize = snapGuard.type === 'vertical'
    ? bounds.right - bounds.left
    : bounds.bottom - bounds.top

  if (!Number.isFinite(boundsSize) || boundsSize <= 0) return false

  return Math.round(boundsSize) > 0
}

/**
 * Собирает кандидаты округления scale, начиная с ближайших к текущему raw-scale.
 */
function collectScalingStepCandidates({
  rawScaleX,
  rawScaleY,
  effectiveWidth,
  effectiveHeight,
  isUniform
}: {
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  isUniform: boolean
}): ScalingStepCandidate[] {
  const scaleXCandidates = collectAxisScaleCandidates({
    rawScale: rawScaleX,
    effectiveSize: effectiveWidth
  })
  const scaleYCandidates = collectAxisScaleCandidates({
    rawScale: rawScaleY,
    effectiveSize: effectiveHeight
  })

  if (isUniform) {
    return collectUniformScaleCandidates({
      scaleXCandidates,
      scaleYCandidates,
      rawScale: rawScaleX
    })
  }

  return collectAxisScaleCandidatePairs({
    scaleXCandidates,
    scaleYCandidates,
    rawScaleX,
    rawScaleY
  })
}

/**
 * Собирает scale-кандидаты одной оси через round/floor/ceil display-size.
 */
function collectAxisScaleCandidates({
  rawScale,
  effectiveSize
}: {
  rawScale: number
  effectiveSize: number
}): number[] {
  if (effectiveSize <= 0) return [rawScale]

  const scaleSign = rawScale < 0 ? -1 : 1
  const rawDisplaySize = Math.abs(rawScale) * effectiveSize
  const displaySizes = [
    Math.round(rawDisplaySize),
    Math.floor(rawDisplaySize),
    Math.ceil(rawDisplaySize)
  ]
  const candidates: number[] = []

  for (const displaySize of displaySizes) {
    const safeDisplaySize = Math.max(1, displaySize)
    addUniqueScaleCandidate({
      candidates,
      scale: (safeDisplaySize / effectiveSize) * scaleSign
    })
  }

  candidates.sort((first, second) => {
    return Math.abs(first - rawScale) - Math.abs(second - rawScale)
  })

  return candidates
}

/**
 * Добавляет scale-кандидат без дублей от round/floor/ceil на целом значении.
 */
function addUniqueScaleCandidate({
  candidates,
  scale
}: {
  candidates: number[]
  scale: number
}): void {
  if (!Number.isFinite(scale)) return
  if (candidates.includes(scale)) return

  candidates.push(scale)
}

/**
 * Собирает uniform scale-кандидаты из обеих осей.
 */
function collectUniformScaleCandidates({
  scaleXCandidates,
  scaleYCandidates,
  rawScale
}: {
  scaleXCandidates: number[]
  scaleYCandidates: number[]
  rawScale: number
}): ScalingStepCandidate[] {
  const scaleCandidates = [...scaleXCandidates]

  for (const scale of scaleYCandidates) {
    addUniqueScaleCandidate({
      candidates: scaleCandidates,
      scale
    })
  }

  scaleCandidates.sort((first, second) => {
    return Math.abs(first - rawScale) - Math.abs(second - rawScale)
  })

  return scaleCandidates.map((scale) => ({
    scaleX: scale,
    scaleY: scale
  }))
}

/**
 * Собирает пары scale-кандидатов для независимого scaling по осям.
 */
function collectAxisScaleCandidatePairs({
  scaleXCandidates,
  scaleYCandidates,
  rawScaleX,
  rawScaleY
}: {
  scaleXCandidates: number[]
  scaleYCandidates: number[]
  rawScaleX: number
  rawScaleY: number
}): ScalingStepCandidate[] {
  const candidates: ScalingStepCandidate[] = []

  for (const scaleX of scaleXCandidates) {
    for (const scaleY of scaleYCandidates) {
      candidates.push({ scaleX, scaleY })
    }
  }

  candidates.sort((first, second) => {
    const firstError = Math.abs(first.scaleX - rawScaleX) + Math.abs(first.scaleY - rawScaleY)
    const secondError = Math.abs(second.scaleX - rawScaleX) + Math.abs(second.scaleY - rawScaleY)

    return firstError - secondError
  })

  return candidates
}

/**
 * Определяет положение rounded scale относительно snapped guide.
 */
function resolveScalingStepCandidateSnapState({
  target,
  candidate,
  preservePlacement,
  snapGuards
}: {
  target: FabricObject
  candidate: ScalingStepCandidate
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards: ScalingStepSnapGuard[]
}): ScalingStepCandidateSnapState {
  const originalScaleX = target.scaleX ?? 1
  const originalScaleY = target.scaleY ?? 1
  let bounds: ObjectBounds | null = null

  try {
    target.set({
      scaleX: candidate.scaleX,
      scaleY: candidate.scaleY
    })

    if (preservePlacement) {
      preservePlacement.applyPlacement(preservePlacement.placement)
    } else {
      target.setCoords()
    }

    bounds = getObjectBounds({ object: target })
  } finally {
    target.set({
      scaleX: originalScaleX,
      scaleY: originalScaleY
    })

    if (preservePlacement) {
      preservePlacement.applyPlacement(preservePlacement.placement)
    } else {
      target.setCoords()
    }
  }

  if (!bounds) return 'outside'

  let isOnGuide = true
  for (const snapGuard of snapGuards) {
    if (!isObjectBoundsInsideSnapGuard({ bounds, snapGuard })) return 'outside'
    if (!isObjectBoundsOnSnapGuide({ bounds, snapGuard })) {
      isOnGuide = false
    }
  }

  return isOnGuide ? 'on-guide' : 'inside'
}

/**
 * Проверяет одно активное ребро относительно guide после округления.
 */
function isObjectBoundsInsideSnapGuard({
  bounds,
  snapGuard
}: {
  bounds: ObjectBounds
  snapGuard: ScalingStepSnapGuard
}): boolean {
  const { edge, position } = snapGuard

  if (edge === 'left') return bounds.left >= position - SNAP_GUARD_POSITION_EPSILON
  if (edge === 'right') return bounds.right <= position + SNAP_GUARD_POSITION_EPSILON
  if (edge === 'top') return bounds.top >= position - SNAP_GUARD_POSITION_EPSILON

  return bounds.bottom <= position + SNAP_GUARD_POSITION_EPSILON
}

/**
 * Проверяет, стоит ли active edge ровно на guide после округления.
 */
function isObjectBoundsOnSnapGuide({
  bounds,
  snapGuard
}: {
  bounds: ObjectBounds
  snapGuard: ScalingStepSnapGuard
}): boolean {
  const { edge, position } = snapGuard

  if (edge === 'left') return Math.abs(bounds.left - position) <= SNAP_GUARD_POSITION_EPSILON
  if (edge === 'right') return Math.abs(bounds.right - position) <= SNAP_GUARD_POSITION_EPSILON
  if (edge === 'top') return Math.abs(bounds.top - position) <= SNAP_GUARD_POSITION_EPSILON

  return Math.abs(bounds.bottom - position) <= SNAP_GUARD_POSITION_EPSILON
}
