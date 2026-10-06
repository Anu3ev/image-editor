import {
  controlsUtils,
  type Control,
  type FabricObject,
  type TPointerEvent,
  type Transform
} from 'fabric'

/** Reference Fabric controls for regular rectangular scaling. */
const STANDARD_RECTANGULAR_SCALE_CONTROLS: Readonly<Record<string, Control>> = Object.freeze(
  controlsUtils.createObjectDefaultControls()
)

/** Tolerance for comparing standard Fabric control geometry. */
const STANDARD_SCALE_CONTROL_EPSILON = 0.000000001

/** Compares two numeric control properties, accounting for missing values. */
function areControlNumbersEqual({
  first,
  second
}: {
  first?: number
  second?: number
}): boolean {
  if (first === undefined || second === undefined) return first === second

  return Number.isFinite(first)
    && Number.isFinite(second)
    && Math.abs(first - second) <= STANDARD_SCALE_CONTROL_EPSILON
}

/** Checks the active control's handlers and position against the standard Fabric contract. */
export function isStandardRectangularScaleControl({
  target,
  transform
}: {
  target: FabricObject
  transform: Transform
}): boolean {
  const control = target.controls[transform.corner]
  const standardControl = STANDARD_RECTANGULAR_SCALE_CONTROLS[transform.corner]
  if (!control || !standardControl) return false

  const behaviorMatches = [
    control.actionHandler === standardControl.actionHandler,
    control.getActionHandler === standardControl.getActionHandler,
    control.positionHandler === standardControl.positionHandler,
    control.getTransformAnchorPoint === standardControl.getTransformAnchorPoint,
    control.transformAnchorPoint === standardControl.transformAnchorPoint
  ]
  if (!behaviorMatches.every(Boolean)) return false

  return [
    [control.x, standardControl.x],
    [control.y, standardControl.y],
    [control.offsetX, standardControl.offsetX],
    [control.offsetY, standardControl.offsetY]
  ].every(([value, standardValue]) => {
    return areControlNumbersEqual({ first: value, second: standardValue })
  })
}

/** Checks whether a modifier switched the side control from scaling to skewing. */
export function didSideScaleSwitchToSkew({
  controlKey,
  pointerEvent,
  target
}: {
  controlKey: string
  pointerEvent: TPointerEvent
  target: FabricObject
}): boolean {
  const isSideControl = controlKey === 'ml'
    || controlKey === 'mr'
    || controlKey === 'mt'
    || controlKey === 'mb'
  if (!isSideControl) return false

  const altActionKey = target.canvas?.altActionKey
  if (!altActionKey) return false

  return Reflect.get(pointerEvent, altActionKey) === true
}
