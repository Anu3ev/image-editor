import { Control, Group, Rect, Textbox, controlsUtils, type Transform } from 'fabric'

import {
  applySelectionScalingControls,
  isAxisAlignedAngle,
  restoreSelectionScalingControls,
  wouldSideStretchDistort
} from '../../../../src/editor/customized-controls/selection-scaling-controls'

/** Creates an object with the standard controls and a canvas that holds the uniform-scaling settings. */
function createSelectionTarget() {
  const target = new Rect({ width: 100, height: 100 })
  target.controls = controlsUtils.createObjectDefaultControls()
  const canvas = { uniformScaling: true, uniScaleKey: 'shiftKey' }
  Object.assign(target, { canvas })

  return { target, canvas }
}

describe('selection scaling controls', () => {
  it('treats only multiples of 90° as aligned with the selection axes', () => {
    for (const angle of [0, 90, 180, -90, 360, 450]) {
      expect(isAxisAlignedAngle({ angle })).toBe(true)
    }
    for (const angle of [30, -20, 89.9, 179]) {
      expect(isAxisAlignedAngle({ angle })).toBe(false)
    }
  })

  it('finds children that a one-axis stretch would distort', () => {
    expect(wouldSideStretchDistort({ object: new Rect({ angle: 90 }) })).toBe(false)
    expect(wouldSideStretchDistort({ object: new Rect({ angle: 30 }) })).toBe(true)
    expect(wouldSideStretchDistort({ object: new Rect({ skewX: 10 }) })).toBe(true)
    expect(wouldSideStretchDistort({ object: new Textbox('Sale', { angle: 0 }) })).toBe(false)
    expect(wouldSideStretchDistort({ object: new Textbox('Sale', { angle: 90 }) })).toBe(true)
    expect(wouldSideStretchDistort({ object: new Group([new Rect({ angle: 30 })]) })).toBe(true)
    expect(wouldSideStretchDistort({ object: new Group([new Rect({ angle: 90 })]) })).toBe(false)
  })

  it('gives the side handles scale-only actions and keeps the corners', () => {
    const { target } = createSelectionTarget()
    const corner = target.controls.br

    applySelectionScalingControls({ target, proportionalCorners: false, scaleOnlySides: true })

    const shiftEvent = new MouseEvent('mousedown', { shiftKey: true })
    expect(target.controls.ml.actionHandler).toBe(controlsUtils.scalingX)
    expect(target.controls.mr.actionHandler).toBe(controlsUtils.scalingX)
    expect(target.controls.mt.actionHandler).toBe(controlsUtils.scalingY)
    expect(target.controls.mb.actionHandler).toBe(controlsUtils.scalingY)
    expect(target.controls.mr.getActionName(shiftEvent, target.controls.mr, target)).toBe('scaleX')
    expect(target.controls.mb.getActionName(shiftEvent, target.controls.mb, target)).toBe('scaleY')
    expect(target.controls.br).toBe(corner)
  })

  it('scales from a corner proportionally with an event that hides the held toggle key', () => {
    const { target } = createSelectionTarget()
    const toggleStates: unknown[] = []
    jest.mocked(controlsUtils.scalingEqually).mockImplementationOnce((eventData) => {
      toggleStates.push(Reflect.get(eventData, 'shiftKey'))
      return true
    })
    applySelectionScalingControls({ target, proportionalCorners: true, scaleOnlySides: false })

    // The corner handler reads only the transform target, which holds the canvas settings.
    const transform: Pick<Transform, 'target'> = { target }
    target.controls.br.actionHandler(new MouseEvent('mousemove', { shiftKey: true }), transform as Transform, 10, 10)

    expect(toggleStates).toEqual([false])
  })

  it('scales from a corner proportionally on a canvas without uniform scaling or a toggle key', () => {
    const { target, canvas } = createSelectionTarget()
    Object.assign(canvas, { uniformScaling: false, uniScaleKey: null })
    const uniformStates: unknown[] = []
    jest.mocked(controlsUtils.scalingEqually).mockImplementationOnce(() => {
      uniformStates.push(canvas.uniformScaling)
      return true
    })
    applySelectionScalingControls({ target, proportionalCorners: true, scaleOnlySides: false })

    const transform: Pick<Transform, 'target'> = { target }
    target.controls.br.actionHandler(new MouseEvent('mousemove'), transform as Transform, 10, 10)

    expect(uniformStates).toEqual([true])
    expect(canvas.uniformScaling).toBe(false)
  })

  it('drops the shape free-corner mark from a wrapped shape corner', () => {
    const { target } = createSelectionTarget()
    const shapeCorner = new Control({ ...target.controls.br })
    Object.assign(shapeCorner, { shapeFreeScaleCornerControl: true })
    target.controls = { ...target.controls, br: shapeCorner }

    applySelectionScalingControls({ target, proportionalCorners: true, scaleOnlySides: false })

    expect(Reflect.get(target.controls.br, 'shapeFreeScaleCornerControl')).toBeUndefined()
  })

  it('keeps the same wrappers across repeated passes and restores the original controls', () => {
    const { target } = createSelectionTarget()
    const { br: corner, mr: side } = target.controls

    applySelectionScalingControls({ target, proportionalCorners: true, scaleOnlySides: true })
    const { br: wrappedCorner, mr: wrappedSide } = target.controls
    restoreSelectionScalingControls({ target })
    const restored = { corner: target.controls.br, side: target.controls.mr }
    applySelectionScalingControls({ target, proportionalCorners: true, scaleOnlySides: true })

    expect(restored).toEqual({ corner, side })
    expect(target.controls.br).toBe(wrappedCorner)
    expect(target.controls.mr).toBe(wrappedSide)
  })
})
