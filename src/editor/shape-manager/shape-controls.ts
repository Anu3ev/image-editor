import {
  Control,
  controlsUtils,
  type Transform
} from 'fabric'
import type { ShapeGroupLike } from './types'

const SHAPE_CORNER_CONTROL_KEYS = ['tl', 'tr', 'bl', 'br'] as const

type ShapeCornerTransform = Transform & {
  signX?: number
  signY?: number
}

type ShapeCornerControl = Control & {
  shapeFreeScaleCornerControl?: boolean
}

/**
 * Возвращает true, если transform использует центр объекта как anchor.
 */
const isCenteredTransform = ({
  transform
}: {
  transform: Transform
}): boolean => {
  const { originX, originY } = transform

  return (originX === 'center' || originX === 0.5) && (originY === 'center' || originY === 0.5)
}

/**
 * Выполняет свободный corner resize shape по двум осям независимо.
 * Если одна ось дошла до origin и flip запрещён, вторая продолжает обновляться.
 */
const scaleShapeFromCorner = ({
  transform,
  x,
  y
}: {
  transform: Transform
  x: number
  y: number
}): boolean => {
  const shapeTransform = transform as ShapeCornerTransform
  const { target } = shapeTransform
  const { scaleX: currentScaleX = 1, scaleY: currentScaleY = 1 } = target
  const localPoint = controlsUtils.getLocalPoint(
    shapeTransform,
    shapeTransform.originX,
    shapeTransform.originY,
    x,
    y
  )
  const nextSignX = Math.sign(localPoint.x || shapeTransform.signX || 1)
  const nextSignY = Math.sign(localPoint.y || shapeTransform.signY || 1)

  if (shapeTransform.signX === undefined) {
    shapeTransform.signX = nextSignX
  }
  if (shapeTransform.signY === undefined) {
    shapeTransform.signY = nextSignY
  }

  const dimensions = target._getTransformedDimensions()
  let nextScaleX = Math.abs((localPoint.x * currentScaleX) / dimensions.x)
  let nextScaleY = Math.abs((localPoint.y * currentScaleY) / dimensions.y)

  if (isCenteredTransform({ transform: shapeTransform })) {
    nextScaleX *= 2
    nextScaleY *= 2
  }

  const canScaleX = !target.lockScalingX && (!target.lockScalingFlip || shapeTransform.signX === nextSignX)
  const canScaleY = !target.lockScalingY && (!target.lockScalingFlip || shapeTransform.signY === nextSignY)

  if (canScaleX) {
    target.set('scaleX', nextScaleX)
  }
  if (canScaleY) {
    target.set('scaleY', nextScaleY)
  }

  return currentScaleX !== target.scaleX || currentScaleY !== target.scaleY
}

/**
 * Возвращает Fabric-compatible handler для diagonal resize shape:
 * свободный по умолчанию и пропорциональный при зажатом Shift.
 */
const createShapeCornerFreeScaleActionHandler = (): NonNullable<Control['actionHandler']> => {
  const freeScaleHandler = controlsUtils.wrapWithFireEvent(
    'scaling',
    controlsUtils.wrapWithFixedAnchor((_eventData, transform, x, y) => {
      return scaleShapeFromCorner({
        transform,
        x,
        y
      })
    })
  )

  return (eventData, transform, x, y) => {
    const { canvas } = transform.target
    const isProportionalResize = Boolean(eventData.shiftKey)

    if (!canvas || !isProportionalResize) {
      return freeScaleHandler(eventData, transform, x, y)
    }

    const { uniformScaling: previousUniformScaling } = canvas
    canvas.uniformScaling = false

    try {
      return controlsUtils.scalingEqually(eventData, transform, x, y)
    } finally {
      canvas.uniformScaling = previousUniformScaling
    }
  }
}

/**
 * Создаёт corner control для shape со свободным diagonal resize без глобального uniformScaling.
 */
const createShapeCornerFreeScaleControl = ({
  control
}: {
  control: Control
}): Control => {
  const nextControl = new Control({
    ...control,
    actionHandler: createShapeCornerFreeScaleActionHandler()
  })

  const shapeCornerControl = nextControl as ShapeCornerControl
  shapeCornerControl.shapeFreeScaleCornerControl = true

  return shapeCornerControl
}

/**
 * Подменяет угловые контролы shape-группы так, чтобы diagonal drag работал как свободный resize.
 */
export const applyShapeCornerFreeScaleControls = ({
  group
}: {
  group: ShapeGroupLike
}): void => {
  const nextControls = {
    ...group.controls
  }

  SHAPE_CORNER_CONTROL_KEYS.forEach((key) => {
    const control = group.controls[key] as ShapeCornerControl | undefined
    if (!control) return
    if (control.shapeFreeScaleCornerControl) return

    nextControls[key] = createShapeCornerFreeScaleControl({
      control
    })
  })

  group.controls = nextControls
}
