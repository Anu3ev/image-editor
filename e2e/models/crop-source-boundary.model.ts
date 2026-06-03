/* eslint-disable no-use-before-define -- Public source-boundary API держим выше private geometry helpers. */
import type {
  CropControlKey,
  CropRectInfo,
  CropStateInfo
} from '../types'

/** Изображение, размеры которого нужны для расчёта source-boundary resize. */
export type CropSourceBoundaryImage = {
  width: number
  height: number
}

/** Смещение client pointer для visible drag resize control. */
export type CropFramePointerDelta = {
  deltaX: number
  deltaY: number
}

/** Source anchor, который остаётся неподвижным во время resize по горизонтали. */
type CropFrameHorizontalBoundaryAnchor = 'left' | 'center' | 'right'

/** Source anchor, который остаётся неподвижным во время vertical resize. */
type CropFrameVerticalBoundaryAnchor = 'top' | 'center' | 'bottom'

/** Source anchor для расчёта одной оси. */
type CropFrameBoundaryAnchor = CropFrameHorizontalBoundaryAnchor | CropFrameVerticalBoundaryAnchor

/** Стороны source, которые фиксирует текущий crop control. */
type CropFrameBoundaryAnchors = {
  fixedX: CropFrameHorizontalBoundaryAnchor
  fixedY: CropFrameVerticalBoundaryAnchor
}

/** Перелёт pointer за source-границу, чтобы реальные controls гарантированно попали в clamp. */
const SOURCE_BOUNDARY_OVERSHOOT_PIXELS = 48

/** Возвращает ожидаемый source-rect после упора proportional resize в source. */
export function resolveExpectedSourceBoundaryRect({
  control,
  image,
  state
}: {
  control: CropControlKey
  image: CropSourceBoundaryImage
  state: CropStateInfo
}): CropRectInfo {
  const anchors = resolveCropControlBoundaryAnchors({ control })
  const size = resolveSourceBoundarySize({
    anchors,
    image,
    rect: state.rect
  })
  const centerX = state.rect.left + (state.rect.width / 2)
  const centerY = state.rect.top + (state.rect.height / 2)

  return {
    left: resolveBoundaryLeft({
      anchors,
      rect: state.rect,
      centerX,
      size
    }),
    top: resolveBoundaryTop({
      anchors,
      rect: state.rect,
      centerY,
      size
    }),
    width: size,
    height: size
  }
}

/** Возвращает ожидаемый source-rect после упора свободного resize в source. */
export function resolveExpectedFreeSourceBoundaryRect({
  control,
  image,
  state
}: {
  control: CropControlKey
  image: CropSourceBoundaryImage
  state: CropStateInfo
}): CropRectInfo {
  const anchors = resolveCropControlBoundaryAnchors({ control })
  const right = state.rect.left + state.rect.width
  const bottom = state.rect.top + state.rect.height

  return {
    left: resolveFreeBoundaryStart({
      anchor: anchors.fixedX,
      start: state.rect.left
    }),
    top: resolveFreeBoundaryStart({
      anchor: anchors.fixedY,
      start: state.rect.top
    }),
    width: resolveFreeBoundaryLength({
      anchor: anchors.fixedX,
      sourceLength: image.width,
      start: state.rect.left,
      end: right
    }),
    height: resolveFreeBoundaryLength({
      anchor: anchors.fixedY,
      sourceLength: image.height,
      start: state.rect.top,
      end: bottom
    })
  }
}

/** Возвращает visible drag-смещение до ожидаемой source-границы. */
export function resolveSourceBoundaryDragDelta({
  control,
  state,
  expectedRect,
  canvasZoom,
  overshootPixels = SOURCE_BOUNDARY_OVERSHOOT_PIXELS
}: {
  control: CropControlKey
  state: CropStateInfo
  expectedRect: CropRectInfo
  canvasZoom: number
  overshootPixels?: number
}): CropFramePointerDelta {
  const scaleX = (state.frame.scaleX ?? 1) * canvasZoom
  const scaleY = (state.frame.scaleY ?? 1) * canvasZoom
  const currentRight = state.rect.left + state.rect.width
  const currentBottom = state.rect.top + state.rect.height
  const expectedRight = expectedRect.left + expectedRect.width
  const expectedBottom = expectedRect.top + expectedRect.height

  return {
    deltaX: resolveBoundaryAxisDragDelta({
      control,
      negativeControls: ['tl', 'bl', 'ml'],
      positiveControls: ['tr', 'br', 'mr'],
      currentStart: state.rect.left,
      currentEnd: currentRight,
      expectedStart: expectedRect.left,
      expectedEnd: expectedRight,
      scale: scaleX,
      overshootPixels
    }),
    deltaY: resolveBoundaryAxisDragDelta({
      control,
      negativeControls: ['tl', 'tr', 'mt'],
      positiveControls: ['bl', 'br', 'mb'],
      currentStart: state.rect.top,
      currentEnd: currentBottom,
      expectedStart: expectedRect.top,
      expectedEnd: expectedBottom,
      scale: scaleY,
      overshootPixels
    })
  }
}

/** Возвращает visible drag-смещение после первого упора в source-границу. */
export function resolveExtraSourceBoundaryDragDelta({
  control,
  pixels
}: {
  control: CropControlKey
  pixels: number
}): CropFramePointerDelta {
  return {
    deltaX: resolveExtraSourceBoundaryAxisDragDelta({
      control,
      negativeControls: ['tl', 'bl', 'ml'],
      positiveControls: ['tr', 'br', 'mr'],
      pixels
    }),
    deltaY: resolveExtraSourceBoundaryAxisDragDelta({
      control,
      negativeControls: ['tl', 'tr', 'mt'],
      positiveControls: ['bl', 'br', 'mb'],
      pixels
    })
  }
}

/** Возвращает старт свободной оси после упора moving-edge в source. */
function resolveFreeBoundaryStart({
  anchor,
  start
}: {
  anchor: CropFrameBoundaryAnchor
  start: number
}): number {
  if (anchor === 'right' || anchor === 'bottom') return 0

  return start
}

/** Возвращает длину свободной оси после упора moving-edge в source. */
function resolveFreeBoundaryLength({
  anchor,
  sourceLength,
  start,
  end
}: {
  anchor: CropFrameBoundaryAnchor
  sourceLength: number
  start: number
  end: number
}): number {
  if (anchor === 'left' || anchor === 'top') return sourceLength - start
  if (anchor === 'right' || anchor === 'bottom') return end

  return end - start
}

/** Возвращает fixed anchors для resize control в source-координатах. */
function resolveCropControlBoundaryAnchors({
  control
}: {
  control: CropControlKey
}): CropFrameBoundaryAnchors {
  return {
    fixedX: resolveCropControlBoundaryAnchorX({ control }),
    fixedY: resolveCropControlBoundaryAnchorY({ control })
  }
}

/** Возвращает fixed horizontal anchor для resize control. */
function resolveCropControlBoundaryAnchorX({
  control
}: {
  control: CropControlKey
}): CropFrameBoundaryAnchors['fixedX'] {
  if (control === 'tl' || control === 'bl' || control === 'ml') return 'right'
  if (control === 'tr' || control === 'br' || control === 'mr') return 'left'

  return 'center'
}

/** Возвращает fixed vertical anchor для resize control. */
function resolveCropControlBoundaryAnchorY({
  control
}: {
  control: CropControlKey
}): CropFrameBoundaryAnchors['fixedY'] {
  if (control === 'tl' || control === 'tr' || control === 'mt') return 'bottom'
  if (control === 'bl' || control === 'br' || control === 'mb') return 'top'

  return 'center'
}

/** Возвращает максимальный квадратный размер crop frame внутри source. */
function resolveSourceBoundarySize({
  anchors,
  image,
  rect
}: {
  anchors: CropFrameBoundaryAnchors
  image: CropSourceBoundaryImage
  rect: CropRectInfo
}): number {
  const right = rect.left + rect.width
  const bottom = rect.top + rect.height
  const centerX = rect.left + (rect.width / 2)
  const centerY = rect.top + (rect.height / 2)
  const widthLimit = resolveSourceBoundaryAxisLimit({
    sourceLength: image.width,
    anchor: anchors.fixedX,
    start: rect.left,
    end: right,
    center: centerX
  })
  const heightLimit = resolveSourceBoundaryAxisLimit({
    sourceLength: image.height,
    anchor: anchors.fixedY,
    start: rect.top,
    end: bottom,
    center: centerY
  })

  return Math.min(widthLimit, heightLimit)
}

/** Возвращает максимальный размер одной source-оси с учётом fixed anchor. */
function resolveSourceBoundaryAxisLimit({
  sourceLength,
  anchor,
  start,
  end,
  center
}: {
  sourceLength: number
  anchor: CropFrameBoundaryAnchor
  start: number
  end: number
  center: number
}): number {
  if (anchor === 'left' || anchor === 'top') return sourceLength - start
  if (anchor === 'right' || anchor === 'bottom') return end

  return Math.min(center, sourceLength - center) * 2
}

/** Возвращает left ожидаемого source-rect после proportional resize. */
function resolveBoundaryLeft({
  anchors,
  rect,
  centerX,
  size
}: {
  anchors: CropFrameBoundaryAnchors
  rect: CropRectInfo
  centerX: number
  size: number
}): number {
  if (anchors.fixedX === 'left') return rect.left
  if (anchors.fixedX === 'right') return rect.left + rect.width - size

  return centerX - (size / 2)
}

/** Возвращает top ожидаемого source-rect после proportional resize. */
function resolveBoundaryTop({
  anchors,
  rect,
  centerY,
  size
}: {
  anchors: CropFrameBoundaryAnchors
  rect: CropRectInfo
  centerY: number
  size: number
}): number {
  if (anchors.fixedY === 'top') return rect.top
  if (anchors.fixedY === 'bottom') return rect.top + rect.height - size

  return centerY - (size / 2)
}

/** Возвращает visible drag-смещение вдоль одной оси до source-границы. */
function resolveBoundaryAxisDragDelta({
  control,
  negativeControls,
  positiveControls,
  currentStart,
  currentEnd,
  expectedStart,
  expectedEnd,
  scale,
  overshootPixels
}: {
  control: CropControlKey
  negativeControls: CropControlKey[]
  positiveControls: CropControlKey[]
  currentStart: number
  currentEnd: number
  expectedStart: number
  expectedEnd: number
  scale: number
  overshootPixels: number
}): number {
  if (negativeControls.includes(control)) {
    return ((expectedStart - currentStart) * scale) - overshootPixels
  }
  if (positiveControls.includes(control)) {
    return ((expectedEnd - currentEnd) * scale) + overshootPixels
  }

  return 0
}

/** Возвращает дополнительное visible drag-смещение вдоль одной оси. */
function resolveExtraSourceBoundaryAxisDragDelta({
  control,
  negativeControls,
  positiveControls,
  pixels
}: {
  control: CropControlKey
  negativeControls: CropControlKey[]
  positiveControls: CropControlKey[]
  pixels: number
}): number {
  if (negativeControls.includes(control)) return -pixels
  if (positiveControls.includes(control)) return pixels

  return 0
}
