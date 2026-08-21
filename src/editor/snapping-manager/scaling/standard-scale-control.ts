import {
  controlsUtils,
  type Control,
  type FabricObject,
  type TPointerEvent,
  type Transform
} from 'fabric'

/** Эталонные ручки Fabric для обычного прямоугольного скейлинга. */
const STANDARD_RECTANGULAR_SCALE_CONTROLS: Readonly<Record<string, Control>> = Object.freeze(
  controlsUtils.createObjectDefaultControls()
)

/** Допуск сравнения геометрии стандартной ручки Fabric. */
const STANDARD_SCALE_CONTROL_EPSILON = 0.000000001

/** Сравнивает два числовых свойства ручки с учётом отсутствующих значений. */
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

/** Проверяет обработчики и положение активной ручки по стандартному Fabric-контракту. */
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

/** Проверяет, что модификатор переключил боковую ручку со скейлинга на наклон. */
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
