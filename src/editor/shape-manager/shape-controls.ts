import {
  Control,
  type Transform
} from 'fabric'
import type { ShapeGroupLike } from './types'

const SHAPE_CORNER_CONTROL_KEYS = ['tl', 'tr', 'bl', 'br'] as const

type ShapeCornerTransform = Transform & {
  shapeOriginalUniformScaling?: boolean
}

type ShapeCornerControl = Control & {
  shapeFreeScaleCornerControl?: boolean
}

/**
 * Переводит текущий drag shape-угла в свободный corner resize,
 * не меняя поведение остальных объектов на canvas.
 */
const enableShapeCornerFreeScaling = ({
  transform
}: {
  transform: Transform
}): void => {
  const { target } = transform
  const { canvas } = target
  if (!canvas) return

  const shapeTransform = transform as ShapeCornerTransform
  shapeTransform.shapeOriginalUniformScaling = canvas.uniformScaling
  canvas.uniformScaling = false
}

/**
 * Восстанавливает глобальный uniformScaling canvas после завершения drag shape-угла.
 */
const restoreShapeCornerScalingMode = ({
  transform
}: {
  transform: Transform
}): void => {
  const { target } = transform
  const { canvas } = target
  if (!canvas) return

  const shapeTransform = transform as ShapeCornerTransform
  const { shapeOriginalUniformScaling } = shapeTransform
  if (shapeOriginalUniformScaling === undefined) return

  canvas.uniformScaling = shapeOriginalUniformScaling
  shapeTransform.shapeOriginalUniformScaling = undefined
}

/**
 * Создаёт corner control для shape, который использует свободный diagonal resize на время текущего drag.
 */
const createShapeCornerFreeScaleControl = ({
  control
}: {
  control: Control
}): Control => {
  const { mouseDownHandler: originalMouseDownHandler, mouseUpHandler: originalMouseUpHandler } = control

  const nextControl = new Control({
    ...control,
    mouseDownHandler: (eventData, transform, x, y) => {
      enableShapeCornerFreeScaling({
        transform
      })

      if (!originalMouseDownHandler) return false

      return originalMouseDownHandler(eventData, transform, x, y)
    },
    mouseUpHandler: (eventData, transform, x, y) => {
      restoreShapeCornerScalingMode({
        transform
      })

      if (!originalMouseUpHandler) return false

      return originalMouseUpHandler(eventData, transform, x, y)
    }
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
