import {
  Transform,
  controlsUtils
} from 'fabric'
import type { EditorTextbox } from '../types'

export type TextScalingAxisState = {
  isCornerHandle: boolean
  isHorizontalHandle: boolean
  isVerticalHandle: boolean
}

type TextScalingTransform = Transform & {
  signX?: number
  signY?: number
}

type TextScalingTransformOriginal = Transform['original'] & {
  height?: number
  width?: number
}

type TextScalingPointerStep = {
  passedOriginX: boolean
  passedOriginY: boolean
  stepScaleX: number
  stepScaleY: number
}

type TextboxWithTransformDimensions = EditorTextbox & {
  _getTransformedDimensions: () => {
    x: number
    y: number
  }
}

/**
 * Определяет, какие оси участвуют в текущем scale-transform текста.
 */
export const resolveTextScalingAxisState = ({
  transform
}: {
  transform: Transform
}): TextScalingAxisState => {
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
    isHorizontalHandle,
    isVerticalHandle
  }
}

/**
 * Синхронизирует активный Fabric-transform с уже материализованной геометрией textbox.
 */
export const syncLiveTextScalingTransform = (
  {
    textbox,
    transform,
    appliedWidth
  }: {
    textbox: EditorTextbox
    transform: Transform
    appliedWidth: number
  }
): void => {
  transform.scaleX = 1
  transform.scaleY = 1

  const original = transform.original as TextScalingTransformOriginal | undefined
  if (!original) return

  original.scaleX = 1
  original.scaleY = 1
  original.width = appliedWidth
  original.height = textbox.height
  original.left = textbox.left
  original.top = textbox.top
}

/**
 * Вычисляет scale-шаг из текущего положения указателя относительно уже материализованной геометрии textbox.
 */
export const resolvePointerTextScalingStep = (
  {
    textbox,
    transform,
    scenePoint
  }: {
    textbox: EditorTextbox
    transform: Transform
    scenePoint: {
      x: number
      y: number
    }
  }
): TextScalingPointerStep | null => {
  const dimensions = (textbox as TextboxWithTransformDimensions)._getTransformedDimensions()
  const { x: dimensionsX, y: dimensionsY } = dimensions

  if (dimensionsX <= 0 || dimensionsY <= 0) return null

  const localPoint = controlsUtils.getLocalPoint(
    transform,
    transform.originX,
    transform.originY,
    scenePoint.x,
    scenePoint.y
  )
  const scalingTransform = transform as TextScalingTransform
  const passedOriginX = typeof scalingTransform.signX === 'number'
    && (localPoint.x * scalingTransform.signX) <= 0
  const passedOriginY = typeof scalingTransform.signY === 'number'
    && (localPoint.y * scalingTransform.signY) <= 0
  let stepScaleX = Math.abs(localPoint.x / dimensionsX)
  let stepScaleY = Math.abs(localPoint.y / dimensionsY)
  const isCenteredTransform = (transform.originX === 'center' || transform.originX === 0.5)
    && (transform.originY === 'center' || transform.originY === 0.5)

  if (isCenteredTransform) {
    stepScaleX *= 2
    stepScaleY *= 2
  }

  return {
    passedOriginX,
    passedOriginY,
    stepScaleX,
    stepScaleY
  }
}
