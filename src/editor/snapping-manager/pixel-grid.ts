import {
  FabricImage,
  FabricObject,
  Textbox,
  Transform
} from 'fabric'

import { MOVE_SNAP_STEP } from './constants'

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
 * Возвращает эффективные размеры объекта без масштаба.
 */
function resolveEffectiveDimensions({ target }: { target: FabricObject }): { width: number; height: number } {
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
 * Округляет масштаб объекта так, чтобы его визуальный размер в пикселях был целым числом.
 */
export function applyScalingStep({
  target,
  transform
}: {
  target: FabricObject
  transform?: Transform | null
}): void {
  const {
    scaleX: rawScaleX = 1,
    scaleY: rawScaleY = 1
  } = target
  const { width: effectiveWidth, height: effectiveHeight } = resolveEffectiveDimensions({ target })
  const isUniform = rawScaleX === rawScaleY

  let snappedScaleX = rawScaleX
  let snappedScaleY = rawScaleY

  if (isUniform) {
    const candidateFromWidth = effectiveWidth > 0
      ? Math.max(1, Math.round(effectiveWidth * rawScaleX)) / effectiveWidth
      : rawScaleX
    const candidateFromHeight = effectiveHeight > 0
      ? Math.max(1, Math.round(effectiveHeight * rawScaleY)) / effectiveHeight
      : rawScaleY
    const errorX = Math.abs(candidateFromWidth - rawScaleX)
    const errorY = Math.abs(candidateFromHeight - rawScaleY)
    const uniformScale = errorX <= errorY ? candidateFromWidth : candidateFromHeight

    snappedScaleX = uniformScale
    snappedScaleY = uniformScale
  }

  if (!isUniform) {
    snappedScaleX = effectiveWidth > 0
      ? Math.max(1, Math.round(effectiveWidth * rawScaleX)) / effectiveWidth
      : rawScaleX
    snappedScaleY = effectiveHeight > 0
      ? Math.max(1, Math.round(effectiveHeight * rawScaleY)) / effectiveHeight
      : rawScaleY
  }

  const isAlreadySnapped = snappedScaleX === rawScaleX && snappedScaleY === rawScaleY

  if (isAlreadySnapped) return

  target.set({
    scaleX: snappedScaleX,
    scaleY: snappedScaleY
  })

  if (transform) {
    transform.scaleX = snappedScaleX
    transform.scaleY = snappedScaleY
  }

  target.setCoords()
}
