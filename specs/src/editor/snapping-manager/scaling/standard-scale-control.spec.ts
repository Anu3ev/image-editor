import { Rect, controlsUtils, type Transform } from 'fabric'

import { applySelectionScalingControls } from '../../../../../src/editor/customized-controls/selection-scaling-controls'
import {
  didSideScaleSwitchToSkew,
  isStandardRectangularScaleControl
} from '../../../../../src/editor/snapping-manager/scaling/standard-scale-control'

/** Creates an object with the standard controls on a canvas that skews with Shift. */
function createTarget() {
  const target = new Rect({ width: 100, height: 100 })
  target.controls = controlsUtils.createObjectDefaultControls()
  Object.assign(target, { canvas: { altActionKey: 'shiftKey' } })

  return target
}

describe('standard scale control', () => {
  it('accepts a scale-only side handle as a standard rectangular scale control', () => {
    const target = createTarget()
    applySelectionScalingControls({ target, proportionalCorners: false, scaleOnlySides: true })

    expect(isStandardRectangularScaleControl({ target, transform: { corner: 'mr' } as Transform })).toBe(true)
    expect(isStandardRectangularScaleControl({ target, transform: { corner: 'mb' } as Transform })).toBe(true)
  })

  it('reports no switch to skew for a scale-only side handle while Shift is held', () => {
    const shiftEvent = new MouseEvent('mousemove', { shiftKey: true })
    const standardTarget = createTarget()
    const scaleOnlyTarget = createTarget()
    applySelectionScalingControls({ target: scaleOnlyTarget, proportionalCorners: false, scaleOnlySides: true })

    expect(didSideScaleSwitchToSkew({ controlKey: 'mr', pointerEvent: shiftEvent, target: standardTarget })).toBe(true)
    expect(didSideScaleSwitchToSkew({ controlKey: 'mr', pointerEvent: shiftEvent, target: scaleOnlyTarget })).toBe(false)
  })
})
