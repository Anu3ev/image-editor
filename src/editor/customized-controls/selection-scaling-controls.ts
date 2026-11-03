/* eslint-disable no-use-before-define -- Keep the public rules above their private helpers. */
import {
  Control,
  Group,
  Textbox,
  controlsUtils,
  type FabricObject
} from 'fabric'

/** Corner handles of an object. */
const CORNER_CONTROL_KEYS = ['tl', 'tr', 'bl', 'br'] as const

/** Side handles with the axis they scale. */
const SIDE_CONTROLS = [
  { key: 'ml', axis: 'x' },
  { key: 'mr', axis: 'x' },
  { key: 'mt', axis: 'y' },
  { key: 'mb', axis: 'y' }
] as const

/** Angle tolerance in degrees within which an object counts as aligned with its parent axes. */
const AXIS_ALIGNED_ANGLE_EPSILON = 0.000001

/** Control installed by these rules, with the control it replaced so the rules can restore it. */
type SelectionRuleControl = Control & {
  selectionRuleBase?: Control
}

/** Proportional corner wrappers, cached per wrapped control so repeated layout passes keep the same control. */
const proportionalCornerControls = new WeakMap<Control, SelectionRuleControl>()

/** Scale-only side wrappers, cached per wrapped control for the same reason. */
const scaleOnlySideControls = new WeakMap<Control, SelectionRuleControl>()

/**
 * Scales from a corner keeping the proportions even when the uniform-scaling toggle key is held.
 * Fabric scales proportionally when `uniformScaling` is on and the event does not report its toggle key, so the
 * canvas setting is turned on for this call and the handler gets an event that reports the key as released.
 * Listeners of the fired scaling event see the same state, as with the shape corner controls.
 */
const scaleProportionallyIgnoringModifier: NonNullable<Control['actionHandler']> = (eventData, transform, x, y) => {
  const { canvas } = transform.target
  if (!canvas) return controlsUtils.scalingEqually(eventData, transform, x, y)

  const { uniScaleKey: toggleKey, uniformScaling: previousUniformScaling } = canvas
  const proportionalEvent = toggleKey
    ? new Proxy(eventData, {
      get(event, property) {
        if (property === toggleKey) return false

        const value = Reflect.get(event, property, event)
        return typeof value === 'function' ? value.bind(event) : value
      }
    })
    : eventData
  canvas.uniformScaling = true

  try {
    return controlsUtils.scalingEqually(proportionalEvent, transform, x, y)
  } finally {
    canvas.uniformScaling = previousUniformScaling
  }
}

/**
 * Returns true if the angle keeps an object aligned with the axes of its selection: a multiple of 90°.
 */
export function isAxisAlignedAngle({ angle }: { angle: number }): boolean {
  const remainder = ((angle % 90) + 90) % 90

  return remainder <= AXIS_ALIGNED_ANGLE_EPSILON || 90 - remainder <= AXIS_ALIGNED_ANGLE_EPSILON
}

/**
 * Returns true if stretching the selection along one axis would distort this child: change its angle, slant it,
 * or stretch its letters. That happens for skewed objects, for text at any rotation, for other objects rotated by
 * an angle that is not a multiple of 90°, and for a group whose own children are like that. Only the direct
 * children of a group are checked.
 */
export function wouldSideStretchDistort({ object }: { object: FabricObject }): boolean {
  if (hasDistortingOwnTransform({ object })) return true
  if (!(object instanceof Group)) return false

  return object.getObjects().some((child) => hasDistortingOwnTransform({ object: child }))
}

/**
 * Returns true if the object's own skew or rotation makes a one-axis stretch distort it.
 */
function hasDistortingOwnTransform({ object }: { object: FabricObject }): boolean {
  const { angle = 0, skewX = 0, skewY = 0 } = object
  if (skewX || skewY) return true
  if (!(object instanceof Textbox)) return !isAxisAlignedAngle({ angle })

  // Text resizes its width, not its height, so even a quarter turn would stretch the letters.
  const turn = ((angle % 360) + 360) % 360
  return turn > AXIS_ALIGNED_ANGLE_EPSILON && 360 - turn > AXIS_ALIGNED_ANGLE_EPSILON
}

/**
 * Installs or removes the selection scaling rules on the corner and side handles.
 * Proportional corners keep a selection whose child would distort from being stretched with Shift; scale-only
 * sides keep Shift from switching text to skew. Handles that no longer need a rule get their original control back.
 */
export function applySelectionScalingControls({
  target,
  proportionalCorners,
  scaleOnlySides
}: {
  target: FabricObject
  proportionalCorners: boolean
  scaleOnlySides: boolean
}): void {
  const nextControls = { ...target.controls }

  CORNER_CONTROL_KEYS.forEach((key) => {
    const control = target.controls[key]
    if (!control) return

    const base = getRuleBase({ control })
    nextControls[key] = proportionalCorners ? getProportionalCornerControl({ base }) : base
  })
  SIDE_CONTROLS.forEach(({ key, axis }) => {
    const control = target.controls[key]
    if (!control) return

    const base = getRuleBase({ control })
    nextControls[key] = scaleOnlySides ? getScaleOnlySideControl({ base, axis }) : base
  })

  const changed = Object.keys(nextControls).some((key) => nextControls[key] !== target.controls[key])
  if (changed) target.controls = nextControls
}

/**
 * Puts back the original corner and side controls, so other control rules see them instead of the wrappers.
 */
export function restoreSelectionScalingControls({ target }: { target: FabricObject }): void {
  applySelectionScalingControls({ target, proportionalCorners: false, scaleOnlySides: false })
}

/**
 * Returns the control that a rule wrapper replaced, or the control itself when no rule wraps it.
 */
function getRuleBase({ control }: { control: Control }): Control {
  return (control as SelectionRuleControl).selectionRuleBase ?? control
}

/**
 * Returns the proportional-only wrapper of a corner control.
 */
function getProportionalCornerControl({ base }: { base: Control }): SelectionRuleControl {
  const cached = proportionalCornerControls.get(base)
  if (cached) return cached

  const wrapper: SelectionRuleControl = new Control({
    ...base,
    actionHandler: scaleProportionallyIgnoringModifier
  })
  wrapper.selectionRuleBase = base
  // A shape corner marks itself as Shift-controlled free scaling; the wrapper must not inherit that mark.
  Reflect.deleteProperty(wrapper, 'shapeFreeScaleCornerControl')
  proportionalCornerControls.set(base, wrapper)

  return wrapper
}

/**
 * Returns the scale-only wrapper of a side control. It keeps the standard geometry and the same scale action as
 * Fabric's side handle without Shift, so the shared rectangular scaling still treats it as a standard control.
 */
function getScaleOnlySideControl({ base, axis }: { base: Control, axis: 'x' | 'y' }): SelectionRuleControl {
  const cached = scaleOnlySideControls.get(base)
  if (cached) return cached

  const wrapper: SelectionRuleControl = new Control({
    ...base,
    actionHandler: axis === 'x' ? controlsUtils.scalingX : controlsUtils.scalingY,
    cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
    getActionName: () => (axis === 'x' ? 'scaleX' : 'scaleY')
  })
  wrapper.selectionRuleBase = base
  scaleOnlySideControls.set(base, wrapper)

  return wrapper
}
