import {
  Control,
  Rect,
  type TPointerEvent
} from 'fabric'

import { applyCropResizeControls } from '../../../../src/editor/crop-manager/interaction/crop-controls'

type CropResizeControl = Control & {
  cropResizeControl?: boolean
}

describe('crop-controls', () => {
  it('боковые контролы остаются resize-only и не переключаются в skew под Shift', () => {
    const target = new Rect({
      width: 100,
      height: 80
    })
    const rightControl = new Control({
      actionHandler: jest.fn(),
      cursorStyleHandler: jest.fn(() => 'not-allowed'),
      getActionName: jest.fn(() => 'skewY')
    })
    const topControl = new Control({
      actionHandler: jest.fn(),
      cursorStyleHandler: jest.fn(() => 'not-allowed'),
      getActionName: jest.fn(() => 'skewX')
    })

    target.controls = {
      mr: rightControl,
      mt: topControl
    } as never

    applyCropResizeControls({ target })

    const wrappedRightControl = target.controls.mr as Control
    const wrappedTopControl = target.controls.mt as Control
    const plainEvent = {
      shiftKey: false
    } satisfies Pick<TPointerEvent, 'shiftKey'>
    const shiftedEvent = {
      shiftKey: true
    } satisfies Pick<TPointerEvent, 'shiftKey'>

    expect((wrappedRightControl as CropResizeControl).cropResizeControl).toBe(true)
    expect((wrappedTopControl as CropResizeControl).cropResizeControl).toBe(true)
    expect(wrappedRightControl.cursorStyleHandler(
      plainEvent as TPointerEvent,
      wrappedRightControl,
      target,
      {} as never
    )).toBe('e-resize')
    expect(wrappedRightControl.cursorStyleHandler(
      shiftedEvent as TPointerEvent,
      wrappedRightControl,
      target,
      {} as never
    )).toBe('e-resize')
    expect(wrappedRightControl.getActionName(
      plainEvent as TPointerEvent,
      wrappedRightControl,
      target
    )).toBe('scaleX')
    expect(wrappedRightControl.getActionName(
      shiftedEvent as TPointerEvent,
      wrappedRightControl,
      target
    )).toBe('scaleX')
    expect(wrappedTopControl.cursorStyleHandler(
      plainEvent as TPointerEvent,
      wrappedTopControl,
      target,
      {} as never
    )).toBe('n-resize')
    expect(wrappedTopControl.cursorStyleHandler(
      shiftedEvent as TPointerEvent,
      wrappedTopControl,
      target,
      {} as never
    )).toBe('n-resize')
    expect(wrappedTopControl.getActionName(
      plainEvent as TPointerEvent,
      wrappedTopControl,
      target
    )).toBe('scaleY')
    expect(wrappedTopControl.getActionName(
      shiftedEvent as TPointerEvent,
      wrappedTopControl,
      target
    )).toBe('scaleY')
  })

  it('угловой control сохраняет свой getActionName после обёртки', () => {
    const target = new Rect({
      width: 100,
      height: 80
    })
    const cornerGetActionName = jest.fn(() => 'corner-scale')
    const topLeftControl = new Control({
      actionHandler: jest.fn(),
      getActionName: cornerGetActionName
    })

    target.controls = {
      tl: topLeftControl,
      mr: new Control({
        actionHandler: jest.fn()
      })
    } as never

    applyCropResizeControls({ target })

    const wrappedTopLeftControl = target.controls.tl as Control
    const eventData = {
      shiftKey: true
    } satisfies Pick<TPointerEvent, 'shiftKey'>
    const actionName = wrappedTopLeftControl.getActionName(
      eventData as TPointerEvent,
      wrappedTopLeftControl,
      target
    )

    expect(wrappedTopLeftControl).not.toBe(topLeftControl)
    expect((wrappedTopLeftControl as CropResizeControl).cropResizeControl).toBe(true)
    expect(actionName).toBe('corner-scale')
    expect(cornerGetActionName).toHaveBeenCalledWith(
      eventData,
      wrappedTopLeftControl,
      target
    )
  })
})
