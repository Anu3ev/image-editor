import type {
  FabricObject,
  TPointerEvent
} from 'fabric'

import type { Bounds } from '../../../src/editor/snapping-manager/types'

/** Минимальный stub crop frame для unit-тестов scaling snap. */
type CropFrameTargetStub = {
  width: number
  height: number
  scaleX: number
  scaleY: number
  cropSource?: FabricObject | null
  preserveAspectRatio?: boolean
  cropActiveResizePreserveAspectRatio?: boolean | null
}

/** Минимальный snap-result stub для unit-тестов scaling snap. */
type AxisSnapResultStub = {
  delta: number
  guidePosition: number | null
  candidate: {
    edge: 'left' | 'right' | 'top' | 'bottom'
    position: number
  } | null
}

/** Возвращает bounds прямоугольника с уже посчитанным центром. */
export function createScalingBounds({
  left,
  top,
  width,
  height
}: {
  left: number
  top: number
  width: number
  height: number
}): Bounds {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    centerX: left + (width / 2),
    centerY: top + (height / 2)
  }
}

/** Возвращает минимальный target для unit-проверок crop scaling snap. */
export function createCropFrameTarget({
  width = 100,
  height = 100,
  scaleX = 1,
  scaleY = 1,
  hasCropSource = true,
  preserveAspectRatio,
  activeResizePreserveAspectRatio
}: {
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  hasCropSource?: boolean
  preserveAspectRatio?: boolean
  activeResizePreserveAspectRatio?: boolean | null
} = {}): FabricObject {
  const target: CropFrameTargetStub = {
    width,
    height,
    scaleX,
    scaleY
  }

  if (hasCropSource) {
    target.cropSource = {} as FabricObject
  }

  if (preserveAspectRatio !== undefined) {
    target.preserveAspectRatio = preserveAspectRatio
  }

  if (activeResizePreserveAspectRatio !== undefined) {
    target.cropActiveResizePreserveAspectRatio = activeResizePreserveAspectRatio
  }

  return target as FabricObject
}

/** Возвращает snap-result с привязкой к конкретной границе. */
export function createAxisSnapResult({
  edge,
  position,
  guidePosition,
  delta = guidePosition - position
}: {
  edge: 'left' | 'right' | 'top' | 'bottom'
  position: number
  guidePosition: number
  delta?: number
}): AxisSnapResultStub {
  return {
    delta,
    guidePosition,
    candidate: {
      edge,
      position
    }
  }
}

/** Возвращает snap-result без найденной направляющей. */
export function createEmptyAxisSnapResult(): AxisSnapResultStub {
  return {
    delta: 0,
    guidePosition: null,
    candidate: null
  }
}

/** Возвращает минимальный pointer event wrapper для shouldUseUniformScaleSnap. */
export function createScalingEvent({
  shiftKey = false
}: {
  shiftKey?: boolean
} = {}): { e: TPointerEvent } {
  return {
    e: {
      shiftKey
    } as TPointerEvent
  }
}
