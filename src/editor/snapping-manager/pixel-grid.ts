/* eslint-disable no-use-before-define -- Публичные pixel-grid функции держим выше private helpers. */
import { FabricImage, FabricObject, Textbox, Transform } from 'fabric'

import {
  resolveGuardedScalingStep,
  type ScalingStepCandidate,
  type ScalingStepPlacementPreserver
} from './scaling/scaling-step-snap-guards'
import type { ScalingStepSnapGuard } from './scaling/scaling-snap-guard'
import { MOVE_SNAP_STEP } from './constants'

export type { ScalingStepSnapGuard } from './scaling/scaling-snap-guard'

/** Применение пиксельного шага с необязательной фиксацией опорной точки и направляющих. */
export interface ScalingStepOptions {
  target: FabricObject
  transform?: Transform | null
  preservePlacement?: ScalingStepPlacementPreserver
  snapGuards?: ScalingStepSnapGuard[]
}

/** Исходный scale и измеряемые размеры одного шага округления. */
export interface ScalingStepRounding extends ScalingAxisRoundingState {
  rawScaleX: number
  rawScaleY: number
  effectiveWidth: number
  effectiveHeight: number
  fallbackScale: ScalingStepCandidate
  isUniform: boolean
}

/** Оси scale, которые реально меняются в текущем Fabric transform. */
type ScalingAxisRoundingState = {
  shouldRoundScaleX: boolean
  shouldRoundScaleY: boolean
}

/** Оси movement-step, которые можно округлять к pixel-grid. */
type MovementStepRoundingOptions = {
  roundX?: boolean
  roundY?: boolean
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
  transform,
  roundX = true,
  roundY = true
}: {
  target: FabricObject
  transform?: Transform | null
} & MovementStepRoundingOptions): void {
  if (!roundX && !roundY) return

  const {
    left = 0,
    top = 0
  } = target
  const originalLeft = typeof transform?.original?.left === 'number'
    ? transform.original.left
    : null
  const originalTop = typeof transform?.original?.top === 'number'
    ? transform.original.top
    : null
  const shouldSnapX = roundX && (originalLeft === null || originalLeft !== left)
  const shouldSnapY = roundY && (originalTop === null || originalTop !== top)

  applyResolvedMovementStep({
    target,
    left,
    top,
    shouldSnapX,
    shouldSnapY
  })
}

/**
 * Применяет рассчитанное округление координат к target.
 */
function applyResolvedMovementStep({
  target,
  left,
  top,
  shouldSnapX,
  shouldSnapY
}: {
  target: FabricObject
  left: number
  top: number
  shouldSnapX: boolean
  shouldSnapY: boolean
}): void {
  const snappedLeft = Math.round(left / MOVE_SNAP_STEP) * MOVE_SNAP_STEP
  const snappedTop = Math.round(top / MOVE_SNAP_STEP) * MOVE_SNAP_STEP
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

/** Возвращает размеры объекта без масштаба в пикселях canvas. */
function resolveEffectiveDimensions({ target }: { target: FabricObject }): { width: number; height: number } {
  if (target instanceof Textbox) return resolveTextboxDimensions({ target })

  const { width = 0, height = 0, strokeWidth = 0, strokeUniform = false } = target
  const strokeContribution = strokeUniform ? 0 : strokeWidth

  return { width: width + strokeContribution, height: height + strokeContribution }
}

/** Округляет размер объекта в пикселях canvas с учётом удерживаемых направляющих. */
export function applyScalingStep({
  target, transform, preservePlacement, snapGuards = []
}: ScalingStepOptions): void {
  const rounding = captureScalingStepRounding({ target, transform })
  if (!rounding) return

  const scale = snapGuards.length === 0
    ? rounding.fallbackScale
    : resolveGuardedScalingStep({ target, ...rounding, preservePlacement, snapGuards })

  applyScalingStepCandidate({ target, transform, preservePlacement, rounding, scale })
}

/** Собирает размер, оси округления и ближайший пиксельный scale без изменения объекта. */
export function captureScalingStepRounding({
  target, transform, dimensions = resolveEffectiveDimensions({ target })
}: {
  target: FabricObject
  transform?: Transform | null
  dimensions?: { width: number; height: number }
}): ScalingStepRounding | null {
  const { scaleX: rawScaleX = 1, scaleY: rawScaleY = 1 } = target
  const axes = resolveScalingAxisRoundingState({ transform, rawScaleX, rawScaleY })
  if (!axes.shouldRoundScaleX && !axes.shouldRoundScaleY) return null

  const effectiveWidth = dimensions.width
  const effectiveHeight = dimensions.height
  return {
    ...axes,
    rawScaleX,
    rawScaleY,
    effectiveWidth,
    effectiveHeight,
    isUniform: rawScaleX === rawScaleY,
    fallbackScale: resolveRoundedScalingStep({ rawScaleX, rawScaleY, effectiveWidth, effectiveHeight })
  }
}

/** Применяет выбранный scale только по активным осям, сохраняя опорную точку. */
export function applyScalingStepCandidate({
  target, transform, preservePlacement, rounding, scale
}: {
  target: FabricObject
  transform?: Transform | null
  preservePlacement?: ScalingStepPlacementPreserver
  rounding: ScalingStepRounding
  scale: ScalingStepCandidate
}): void {
  const scaleX = rounding.shouldRoundScaleX ? scale.scaleX : rounding.rawScaleX
  const scaleY = rounding.shouldRoundScaleY ? scale.scaleY : rounding.rawScaleY
  if (scaleX === rounding.rawScaleX && scaleY === rounding.rawScaleY) return

  target.set({ scaleX, scaleY })
  if (preservePlacement) preservePlacement.applyPlacement(preservePlacement.placement)
  if (transform) {
    transform.scaleX = scaleX
    transform.scaleY = scaleY
  }
  target.setCoords()
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
