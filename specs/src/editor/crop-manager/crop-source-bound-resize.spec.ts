import {
  applyCropSourceBoundScalePlan,
  restoreCropSourceBoundFrame
} from '../../../../src/editor/crop-manager/interaction/crop-source-bound-resize'
import { createSourceBoundResize } from '../../../test-utils/crop/source-bound-resize'

it('ограничивает прежний пропорциональный скейлинг источником без сдвига неподвижного угла', () => {
  const { session, frame, transform } = createSourceBoundResize()

  const applied = applyCropSourceBoundScalePlan({
    session, transform, nextScaleX: 2, nextScaleY: 2
  })

  expect(applied).toBe(true)
  expect(frame.scaleX).toBe(1.5)
  expect(frame.scaleY).toBe(1.5)
  expect(frame.left).toBe(12.5)
  expect(frame.top).toBe(-12.5)
  expect(frame.left - ((frame.width * frame.scaleX) / 2)).toBe(-25)
  expect(frame.top + ((frame.height * frame.scaleY) / 2)).toBe(25)
  expect(transform.cropSourceScaleClamped).toBe(true)
})

it('не меняет рамку, если прежний план скейлинга ещё не дошёл до границы источника', () => {
  const { session, frame, transform } = createSourceBoundResize()

  const applied = applyCropSourceBoundScalePlan({
    session, transform, nextScaleX: 1.1, nextScaleY: 1.1
  })

  expect(applied).toBe(false)
  expect(frame).toMatchObject({ left: 0, top: 0, scaleX: 1, scaleY: 1 })
  expect(transform.cropSourceScaleClamped).toBeUndefined()
})

it('восстанавливает размер и позицию, уже удержанные на границе источника', () => {
  const { session, frame, transform } = createSourceBoundResize()
  expect(applyCropSourceBoundScalePlan({
    session, transform, nextScaleX: 2, nextScaleY: 2
  })).toBe(true)
  frame.set({ left: 200, top: 300, scaleX: 4, scaleY: 4 })

  const restored = restoreCropSourceBoundFrame({
    session, event: { target: frame, transform, e: new MouseEvent('mousemove') }
  })

  expect(restored).toBe(true)
  expect(frame).toMatchObject({ left: 12.5, top: -12.5, scaleX: 1.5, scaleY: 1.5 })
})
