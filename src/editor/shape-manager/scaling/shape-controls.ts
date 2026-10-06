import {
  Control,
  controlsUtils,
  type FabricObject,
  type Transform
} from 'fabric'

const SHAPE_CORNER_CONTROL_KEYS = ['tl', 'tr', 'bl', 'br'] as const

type ShapeCornerTransform = Transform & {
  signX?: number
  signY?: number
}

type ShapeCornerControl = Control & {
  shapeFreeScaleCornerControl?: boolean
}

/** Corner-scaling mode defined by the shape's controls. */
export type ShapeCornerScaleMode = 'uniform' | 'free'

/** Minimal Fabric contract for checking a shape's active corner handle. */
type ShapeCornerControlTransform = Readonly<{
  action?: Transform['action']
  corner: string
  target: FabricObject
}>

/** Checks a corner handle against Fabric geometry and shape-scaling rules. */
export const isShapeCornerScaleControl = ({
  target,
  transform
}: {
  target: FabricObject
  transform: ShapeCornerControlTransform
}): boolean => {
  const controlKey = transform.corner
  const isCorner = SHAPE_CORNER_CONTROL_KEYS.some((key) => key === controlKey)
  if (!isCorner || transform.action !== 'scale') return false

  const control = target.controls[controlKey] as ShapeCornerControl | undefined

  return Boolean(control?.shapeFreeScaleCornerControl)
}

/** Returns the same mode that the shape's corner handle applies to the Fabric transform. */
export const resolveShapeCornerScaleMode = ({
  shiftKey
}: {
  shiftKey: boolean
}): ShapeCornerScaleMode => {
  return shiftKey ? 'free' : 'uniform'
}

/**
 * Returns true if the transform uses the object's center as its anchor.
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
 * Performs a free corner resize of a shape independently along both axes.
 * If one axis reaches the origin and flipping is forbidden, the other continues updating.
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
 * Returns a Fabric-compatible handler for diagonal shape resizing:
 * proportional by default and free while Shift is held.
 */
const createShapeCornerScalingActionHandler = (): NonNullable<Control['actionHandler']> => {
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
    const mode = resolveShapeCornerScaleMode({
      shiftKey: Boolean(eventData.shiftKey)
    })

    if (!canvas || mode === 'free') {
      return freeScaleHandler(eventData, transform, x, y)
    }

    const { uniformScaling: previousUniformScaling } = canvas
    canvas.uniformScaling = true

    try {
      return controlsUtils.scalingEqually(eventData, transform, x, y)
    } finally {
      canvas.uniformScaling = previousUniformScaling
    }
  }
}

/**
 * Creates a shape corner control that preserves proportions by default
 * and switches to free diagonal resizing while Shift is held.
 */
const createShapeCornerScalingControl = ({
  control
}: {
  control: Control
}): Control => {
  const nextControl = new Control({
    ...control,
    actionHandler: createShapeCornerScalingActionHandler()
  })

  const shapeCornerControl = nextControl as ShapeCornerControl
  shapeCornerControl.shapeFreeScaleCornerControl = true

  return shapeCornerControl
}

/**
 * Replaces the object's corner controls so diagonal shape resizing
 * preserves proportions by default and switches to free scaling while Shift is held.
 */
export const applyShapeCornerFreeScaleControls = ({
  target
}: {
  target: FabricObject
}): void => {
  const nextControls = {
    ...target.controls
  }
  let hasControlChange = false

  SHAPE_CORNER_CONTROL_KEYS.forEach((key) => {
    const control = target.controls[key] as ShapeCornerControl | undefined
    if (!control) return
    if (control.shapeFreeScaleCornerControl) return

    nextControls[key] = createShapeCornerScalingControl({
      control
    })
    hasControlChange = true
  })

  if (!hasControlChange) return

  target.controls = nextControls
}
