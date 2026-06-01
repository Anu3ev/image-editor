/* eslint-disable no-use-before-define -- публичный контракт модуля держится выше внутренних расчётов. */
import {
  FabricObject,
  Textbox,
  Transform,
  TPointerEvent
} from 'fabric'

import type {
  AnchorBuckets,
  Bounds,
  GuideLine
} from './types'

type AxisSnapEdge = 'left' | 'right' | 'top' | 'bottom'

type AxisSnapCandidate = {
  edge: AxisSnapEdge
  position: number
}

type AxisSnapResult = {
  delta: number
  guidePosition: number | null
  candidate: AxisSnapCandidate | null
}

export type ScalingAxisState = {
  isCornerHandle: boolean
  shouldSnapX: boolean
  shouldSnapY: boolean
}

type CropFrameSnapTarget = FabricObject & {
  cropSource?: FabricObject | null
  preserveAspectRatio?: boolean
}

export type ScalingTransformState = {
  originX: Transform['originX']
  originY: Transform['originY']
  scaleX: number
  scaleY: number
}

export type ScaleAxisSnapState = {
  verticalSnap: AxisSnapResult
  horizontalSnap: AxisSnapResult
}

export type ScaleUpdatePlan = {
  guides: GuideLine[]
  nextScaleX: number | null
  nextScaleY: number | null
}

export type TextResizeSnapPlan = {
  guide: GuideLine
  nextWidth: number
}

type ScaleSnapContext = {
  target: FabricObject
  bounds: Bounds
  originX: Transform['originX']
  originY: Transform['originY']
  scaleX: number
  scaleY: number
  verticalSnap: AxisSnapResult
  horizontalSnap: AxisSnapResult
}

interface ScaleUpdatePlanParams extends ScaleSnapContext {
  shouldUseUniformScaleSnap: boolean
}

type AxisScaleUpdate = {
  guide: GuideLine
  nextScale: number
}

type UniformScaleResult = {
  guide: GuideLine
  scaleFactor: number
}

/**
 * Определяет активные оси масштабирования по углу и действию трансформации.
 */
export function resolveScalingAxisState({ transform }: { transform: Transform }): ScalingAxisState {
  const { corner = '', action = '' } = transform
  const isHorizontalHandle = corner === 'ml' || corner === 'mr' || action === 'scaleX'
  const isVerticalHandle = corner === 'mt' || corner === 'mb' || action === 'scaleY'
  const isCornerHandle = corner === 'tl'
    || corner === 'tr'
    || corner === 'bl'
    || corner === 'br'
    || action === 'scale'

  return {
    isCornerHandle,
    shouldSnapX: isHorizontalHandle || isCornerHandle,
    shouldSnapY: isVerticalHandle || isCornerHandle
  }
}

/** Возвращает активные origin и scale из transform с fallback в состояние target. */
export function resolveScalingTransformState({
  target,
  transform
}: {
  target: FabricObject
  transform: Transform
}): ScalingTransformState {
  const {
    originX: transformOriginX,
    originY: transformOriginY
  } = transform
  const {
    originX: targetOriginX = 'left',
    originY: targetOriginY = 'top',
    scaleX = 1,
    scaleY = 1
  } = target

  return {
    originX: transformOriginX ?? targetOriginX,
    originY: transformOriginY ?? targetOriginY,
    scaleX,
    scaleY
  }
}

/** Возвращает true, если snap текущего scaling-step должен менять обе scale-оси единым множителем. */
export function shouldUseUniformScaleSnap({
  target,
  event,
  isCornerHandle
}: {
  target: FabricObject
  event: { e?: TPointerEvent | null }
  isCornerHandle: boolean
}): boolean {
  if (isCornerHandle) return true

  const cropTarget = target as CropFrameSnapTarget
  if (!cropTarget.cropSource) return false

  const preserveAspectRatio = cropTarget.preserveAspectRatio ?? true
  if (!event.e?.shiftKey) return preserveAspectRatio

  return !preserveAspectRatio
}

/** Находит активные axis-snap кандидаты для текущего scaling-step. */
export function resolveScaleAxisSnaps({
  bounds,
  originX,
  originY,
  shouldSnapX,
  shouldSnapY,
  threshold,
  anchors
}: {
  bounds: Bounds
  originX: Transform['originX']
  originY: Transform['originY']
  shouldSnapX: boolean
  shouldSnapY: boolean
  threshold: number
  anchors: AnchorBuckets
}): ScaleAxisSnapState | null {
  const verticalCandidates = collectVerticalSnapCandidates({
    bounds,
    originX,
    shouldSnapX
  })
  const horizontalCandidates = collectHorizontalSnapCandidates({
    bounds,
    originY,
    shouldSnapY
  })
  const verticalSnap = findAxisSnapCandidate({
    anchors: anchors.vertical,
    candidates: verticalCandidates,
    threshold
  })
  const horizontalSnap = findAxisSnapCandidate({
    anchors: anchors.horizontal,
    candidates: horizontalCandidates,
    threshold
  })

  if (verticalSnap.guidePosition === null && horizontalSnap.guidePosition === null) {
    return null
  }

  return {
    verticalSnap,
    horizontalSnap
  }
}

/** Рассчитывает scale-обновления и соответствующие направляющие для текущего scaling-step. */
export function resolveScaleUpdatePlan(params: ScaleUpdatePlanParams): ScaleUpdatePlan | null {
  if (params.shouldUseUniformScaleSnap) {
    return resolveUniformScaleUpdatePlan(params)
  }

  return resolveAxisScaleUpdatePlan(params)
}

/** Рассчитывает snap-план для горизонтального изменения ширины текстового объекта. */
export function resolveTextResizeSnapPlan({
  target,
  bounds,
  originX,
  verticalAnchors,
  threshold
}: {
  target: Textbox
  bounds: Bounds
  originX: Transform['originX']
  verticalAnchors: number[]
  threshold: number
}): TextResizeSnapPlan | null {
  const verticalCandidates = collectVerticalSnapCandidates({
    bounds,
    originX,
    shouldSnapX: true
  })
  const verticalSnap = findAxisSnapCandidate({
    anchors: verticalAnchors,
    candidates: verticalCandidates,
    threshold
  })

  const { guidePosition } = verticalSnap
  if (guidePosition === null) return null

  const desiredWidth = resolveDesiredWidth({
    bounds,
    originX,
    snap: verticalSnap
  })
  if (desiredWidth === null) return null

  const nextWidth = resolveTextWidthForBounds({
    target,
    boundsWidth: desiredWidth
  })
  if (nextWidth === null) return null

  return {
    nextWidth,
    guide: {
      type: 'vertical',
      position: guidePosition
    }
  }
}

function resolveUniformScaleUpdatePlan({
  bounds,
  originX,
  originY,
  scaleX,
  scaleY,
  verticalSnap,
  horizontalSnap
}: ScaleSnapContext): ScaleUpdatePlan | null {
  const uniformResult = resolveUniformScale({
    bounds,
    originX,
    originY,
    verticalSnap,
    horizontalSnap
  })

  if (!uniformResult) return null

  const { guide, scaleFactor } = uniformResult

  return {
    guides: [guide],
    nextScaleX: scaleX * scaleFactor,
    nextScaleY: scaleY * scaleFactor
  }
}

function resolveAxisScaleUpdatePlan(params: ScaleSnapContext): ScaleUpdatePlan | null {
  const scaleXUpdate = resolveScaleXUpdate(params)
  const scaleYUpdate = resolveScaleYUpdate(params)

  if (!scaleXUpdate && !scaleYUpdate) return null

  const guides: GuideLine[] = []
  let nextScaleX: number | null = null
  let nextScaleY: number | null = null

  if (scaleXUpdate) {
    guides.push(scaleXUpdate.guide)
    nextScaleX = scaleXUpdate.nextScale
  }

  if (scaleYUpdate) {
    guides.push(scaleYUpdate.guide)
    nextScaleY = scaleYUpdate.nextScale
  }

  return {
    guides,
    nextScaleX,
    nextScaleY
  }
}

function resolveScaleXUpdate({
  target,
  bounds,
  originX,
  scaleX,
  scaleY,
  verticalSnap
}: ScaleSnapContext): AxisScaleUpdate | null {
  const { guidePosition } = verticalSnap
  if (guidePosition === null) return null

  const desiredWidth = resolveDesiredWidth({
    bounds,
    originX,
    snap: verticalSnap
  })
  if (desiredWidth === null) return null

  const { angle = 0 } = target
  const { width: baseWidth, height: baseHeight } = resolveBaseDimensions({ target })
  const absNextScaleX = resolveScaleForWidth({
    desiredWidth,
    baseWidth,
    baseHeight,
    scaleY: Math.abs(scaleY) || 1,
    angle
  })
  if (absNextScaleX === null) return null

  return {
    nextScale: absNextScaleX * (scaleX < 0 ? -1 : 1),
    guide: {
      type: 'vertical',
      position: guidePosition
    }
  }
}

function resolveScaleYUpdate({
  target,
  bounds,
  originY,
  scaleX,
  scaleY,
  horizontalSnap
}: ScaleSnapContext): AxisScaleUpdate | null {
  const { guidePosition } = horizontalSnap
  if (guidePosition === null) return null

  const desiredHeight = resolveDesiredHeight({
    bounds,
    originY,
    snap: horizontalSnap
  })
  if (desiredHeight === null) return null

  const { angle = 0 } = target
  const { width: baseWidth, height: baseHeight } = resolveBaseDimensions({ target })
  const absNextScaleY = resolveScaleForHeight({
    desiredHeight,
    baseWidth,
    baseHeight,
    scaleX: Math.abs(scaleX) || 1,
    angle
  })
  if (absNextScaleY === null) return null

  return {
    nextScale: absNextScaleY * (scaleY < 0 ? -1 : 1),
    guide: {
      type: 'horizontal',
      position: guidePosition
    }
  }
}

/**
 * Собирает кандидаты на вертикальное прилипания по текущему originX.
 */
function collectVerticalSnapCandidates({
  bounds,
  originX,
  shouldSnapX
}: {
  bounds: Bounds
  originX: Transform['originX']
  shouldSnapX: boolean
}): AxisSnapCandidate[] {
  const candidates: AxisSnapCandidate[] = []
  if (!shouldSnapX) return candidates

  const { left, right } = bounds
  let resolvedOriginX: 'left' | 'center' | 'right' = 'left'
  if (originX === 'center' || originX === 'right') {
    resolvedOriginX = originX
  }

  if (resolvedOriginX === 'left') {
    candidates.push({
      edge: 'right',
      position: right
    })
  }

  if (resolvedOriginX === 'right') {
    candidates.push({
      edge: 'left',
      position: left
    })
  }

  if (resolvedOriginX === 'center') {
    candidates.push({
      edge: 'left',
      position: left
    })
    candidates.push({
      edge: 'right',
      position: right
    })
  }

  return candidates
}

/**
 * Собирает кандидаты на горизонтальное прилипания по текущему originY.
 */
function collectHorizontalSnapCandidates({
  bounds,
  originY,
  shouldSnapY
}: {
  bounds: Bounds
  originY: Transform['originY']
  shouldSnapY: boolean
}): AxisSnapCandidate[] {
  const candidates: AxisSnapCandidate[] = []
  if (!shouldSnapY) return candidates

  const { top, bottom } = bounds
  let resolvedOriginY: 'top' | 'center' | 'bottom' = 'top'
  if (originY === 'center' || originY === 'bottom') {
    resolvedOriginY = originY
  }

  if (resolvedOriginY === 'top') {
    candidates.push({
      edge: 'bottom',
      position: bottom
    })
  }

  if (resolvedOriginY === 'bottom') {
    candidates.push({
      edge: 'top',
      position: top
    })
  }

  if (resolvedOriginY === 'center') {
    candidates.push({
      edge: 'top',
      position: top
    })
    candidates.push({
      edge: 'bottom',
      position: bottom
    })
  }

  return candidates
}

/**
 * Находит ближайший кандидат прилипания с учетом порога и возвращает дельту.
 */
function findAxisSnapCandidate({
  anchors,
  candidates,
  threshold
}: {
  anchors: number[]
  candidates: AxisSnapCandidate[]
  threshold: number
}): AxisSnapResult {
  let nearestDelta = 0
  let nearestDistance = threshold + 1
  let guidePosition: number | null = null
  let candidate: AxisSnapCandidate | null = null

  for (const snapCandidate of candidates) {
    const { position } = snapCandidate

    for (const anchor of anchors) {
      const distance = Math.abs(anchor - position)
      if (distance > threshold || distance >= nearestDistance) continue

      nearestDelta = anchor - position
      nearestDistance = distance
      guidePosition = anchor
      candidate = snapCandidate
    }
  }

  return {
    delta: nearestDelta,
    guidePosition,
    candidate
  }
}

/**
 * Рассчитывает коэффициент равномерного масштаба и соответствующий гайд.
 */
function resolveUniformScale({
  bounds,
  originX,
  originY,
  verticalSnap,
  horizontalSnap
}: {
  bounds: Bounds
  originX: Transform['originX']
  originY: Transform['originY']
  verticalSnap: AxisSnapResult
  horizontalSnap: AxisSnapResult
}): UniformScaleResult | null {
  const scaleFactorX = resolveUniformScaleFactorForWidth({
    bounds,
    originX,
    snap: verticalSnap
  })
  const scaleFactorY = resolveUniformScaleFactorForHeight({
    bounds,
    originY,
    snap: horizontalSnap
  })
  const chosenAxis = chooseUniformScaleAxis({
    scaleFactorX,
    scaleFactorY,
    verticalSnap,
    horizontalSnap
  })

  if (chosenAxis === 'x' && scaleFactorX !== null && verticalSnap.guidePosition !== null) {
    return {
      scaleFactor: scaleFactorX,
      guide: {
        type: 'vertical',
        position: verticalSnap.guidePosition
      }
    }
  }

  if (chosenAxis === 'y' && scaleFactorY !== null && horizontalSnap.guidePosition !== null) {
    return {
      scaleFactor: scaleFactorY,
      guide: {
        type: 'horizontal',
        position: horizontalSnap.guidePosition
      }
    }
  }

  return null
}

function resolveUniformScaleFactorForWidth({
  bounds,
  originX,
  snap
}: {
  bounds: Bounds
  originX: Transform['originX']
  snap: AxisSnapResult
}): number | null {
  const { left, right } = bounds
  const currentWidth = right - left
  if (snap.guidePosition === null || currentWidth <= 0) return null

  const desiredWidth = resolveDesiredWidth({ bounds, originX, snap })
  if (desiredWidth === null) return null

  const factor = desiredWidth / currentWidth
  if (!Number.isFinite(factor) || factor <= 0) return null

  return factor
}

function resolveUniformScaleFactorForHeight({
  bounds,
  originY,
  snap
}: {
  bounds: Bounds
  originY: Transform['originY']
  snap: AxisSnapResult
}): number | null {
  const { top, bottom } = bounds
  const currentHeight = bottom - top
  if (snap.guidePosition === null || currentHeight <= 0) return null

  const desiredHeight = resolveDesiredHeight({ bounds, originY, snap })
  if (desiredHeight === null) return null

  const factor = desiredHeight / currentHeight
  if (!Number.isFinite(factor) || factor <= 0) return null

  return factor
}

function chooseUniformScaleAxis({
  scaleFactorX,
  scaleFactorY,
  verticalSnap,
  horizontalSnap
}: {
  scaleFactorX: number | null
  scaleFactorY: number | null
  verticalSnap: AxisSnapResult
  horizontalSnap: AxisSnapResult
}): 'x' | 'y' | null {
  if (scaleFactorX !== null && scaleFactorY === null) return 'x'
  if (scaleFactorY !== null && scaleFactorX === null) return 'y'
  if (scaleFactorX === null || scaleFactorY === null) return null

  const absVerticalDelta = Math.abs(verticalSnap.delta)
  const absHorizontalDelta = Math.abs(horizontalSnap.delta)

  if (absVerticalDelta <= absHorizontalDelta) return 'x'

  return 'y'
}

/**
 * Рассчитывает требуемую ширину bounding-box для прилипания по X.
 */
function resolveDesiredWidth({
  bounds,
  originX,
  snap
}: {
  bounds: Bounds
  originX: Transform['originX']
  snap: AxisSnapResult
}): number | null {
  const { left, right, centerX } = bounds
  const { candidate, guidePosition } = snap
  if (!candidate || guidePosition === null) return null

  let resolvedOriginX: 'left' | 'center' | 'right' = 'left'
  if (originX === 'center' || originX === 'right') {
    resolvedOriginX = originX
  }

  const { edge } = candidate
  let desiredWidth: number | null = null

  if (resolvedOriginX === 'left' && edge === 'right') {
    desiredWidth = guidePosition - left
  }
  if (resolvedOriginX === 'right' && edge === 'left') {
    desiredWidth = right - guidePosition
  }
  if (resolvedOriginX === 'center' && edge === 'left') {
    desiredWidth = (centerX - guidePosition) * 2
  }
  if (resolvedOriginX === 'center' && edge === 'right') {
    desiredWidth = (guidePosition - centerX) * 2
  }

  if (desiredWidth === null) return null
  if (!Number.isFinite(desiredWidth) || desiredWidth <= 0) return null

  return desiredWidth
}

/**
 * Рассчитывает требуемую высоту bounding-box для прилипания по Y.
 */
function resolveDesiredHeight({
  bounds,
  originY,
  snap
}: {
  bounds: Bounds
  originY: Transform['originY']
  snap: AxisSnapResult
}): number | null {
  const { top, bottom, centerY } = bounds
  const { candidate, guidePosition } = snap
  if (!candidate || guidePosition === null) return null

  let resolvedOriginY: 'top' | 'center' | 'bottom' = 'top'
  if (originY === 'center' || originY === 'bottom') {
    resolvedOriginY = originY
  }

  const { edge } = candidate
  let desiredHeight: number | null = null

  if (resolvedOriginY === 'top' && edge === 'bottom') {
    desiredHeight = guidePosition - top
  }
  if (resolvedOriginY === 'bottom' && edge === 'top') {
    desiredHeight = bottom - guidePosition
  }
  if (resolvedOriginY === 'center' && edge === 'top') {
    desiredHeight = (centerY - guidePosition) * 2
  }
  if (resolvedOriginY === 'center' && edge === 'bottom') {
    desiredHeight = (guidePosition - centerY) * 2
  }

  if (desiredHeight === null) return null
  if (!Number.isFinite(desiredHeight) || desiredHeight <= 0) return null

  return desiredHeight
}

/**
 * Возвращает базовые размеры объекта без учета масштаба, включая отступы текста.
 */
function resolveBaseDimensions({ target }: { target: FabricObject }): { width: number; height: number } {
  const {
    width: rawWidth = 0,
    height: rawHeight = 0
  } = target
  let width = rawWidth
  let height = rawHeight

  if (target instanceof Textbox) {
    const {
      paddingTop = 0,
      paddingRight = 0,
      paddingBottom = 0,
      paddingLeft = 0,
      strokeWidth = 0
    } = target
    width = rawWidth + paddingLeft + paddingRight + strokeWidth
    height = rawHeight + paddingTop + paddingBottom + strokeWidth
  }

  return {
    width,
    height
  }
}

/**
 * Рассчитывает масштаб по оси X для заданной ширины bounding-box.
 */
function resolveScaleForWidth({
  desiredWidth,
  baseWidth,
  baseHeight,
  scaleY,
  angle
}: {
  desiredWidth: number
  baseWidth: number
  baseHeight: number
  scaleY: number
  angle: number
}): number | null {
  const radians = (angle * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  const widthComponent = baseWidth * cos
  const heightComponent = baseHeight * scaleY * sin

  if (widthComponent <= 0) return null

  const nextScaleX = (desiredWidth - heightComponent) / widthComponent
  if (!Number.isFinite(nextScaleX) || nextScaleX <= 0) return null

  return nextScaleX
}

/**
 * Рассчитывает масштаб по оси Y для заданной высоты bounding-box.
 */
function resolveScaleForHeight({
  desiredHeight,
  baseWidth,
  baseHeight,
  scaleX,
  angle
}: {
  desiredHeight: number
  baseWidth: number
  baseHeight: number
  scaleX: number
  angle: number
}): number | null {
  const radians = (angle * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  const heightComponent = baseHeight * cos
  const widthComponent = baseWidth * scaleX * sin

  if (heightComponent <= 0) return null

  const nextScaleY = (desiredHeight - widthComponent) / heightComponent
  if (!Number.isFinite(nextScaleY) || nextScaleY <= 0) return null

  return nextScaleY
}

/**
 * Приводит ширину bounding-box текста к ширине текстового блока.
 */
function resolveTextWidthForBounds({
  target,
  boundsWidth
}: {
  target: Textbox
  boundsWidth: number
}): number | null {
  const {
    paddingLeft = 0,
    paddingRight = 0,
    strokeWidth = 0
  } = target

  const rawWidth = boundsWidth - paddingLeft - paddingRight - strokeWidth
  if (!Number.isFinite(rawWidth) || rawWidth <= 0) return null

  return Math.max(1, Math.round(rawWidth))
}
