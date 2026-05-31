import { Rect } from 'fabric'

import {
  clampCropFrameToSourcePreservingAspectRatio,
  getCropRectInSource,
  MAX_CROP_FRAME_HEIGHT,
  MAX_CROP_FRAME_WIDTH,
  MIN_CROP_FRAME_SIZE,
  resolveCropSize
} from '../../../../src/editor/crop-manager/domain/crop-geometry'

describe('crop geometry', () => {
  it('оставляет explicit размер больше источника, когда overflow разрешён', () => {
    const size = resolveCropSize({
      sourceSize: {
        width: 120,
        height: 80
      },
      size: {
        width: 180,
        height: 140
      },
      allowOverflow: true
    })

    expect(size).toEqual({
      width: 180,
      height: 140
    })
  })

  it('ограничивает explicit размер источником, когда overflow запрещён', () => {
    const size = resolveCropSize({
      sourceSize: {
        width: 120,
        height: 80
      },
      size: {
        width: 180,
        height: 140
      },
      allowOverflow: false
    })

    expect(size).toEqual({
      width: 120,
      height: 80
    })
  })

  it('не даёт explicit размеру стать меньше минимального frame', () => {
    const size = resolveCropSize({
      sourceSize: {
        width: 120,
        height: 80
      },
      size: {
        width: 1,
        height: 2
      },
      allowOverflow: true
    })

    expect(size).toEqual({
      width: MIN_CROP_FRAME_SIZE,
      height: MIN_CROP_FRAME_SIZE
    })
  })

  it('не даёт explicit размеру стать больше максимального frame', () => {
    const size = resolveCropSize({
      sourceSize: {
        width: 120,
        height: 80
      },
      size: {
        width: MAX_CROP_FRAME_WIDTH + 200,
        height: MAX_CROP_FRAME_HEIGHT + 100
      },
      allowOverflow: true
    })

    expect(size).toEqual({
      width: MAX_CROP_FRAME_WIDTH,
      height: MAX_CROP_FRAME_HEIGHT
    })
  })

  it('подбирает максимальный размер внутри источника по заданной пропорции', () => {
    const wideSize = resolveCropSize({
      sourceSize: {
        width: 400,
        height: 300
      },
      aspectRatio: {
        width: 16,
        height: 9
      },
      allowOverflow: true
    })
    const tallSize = resolveCropSize({
      sourceSize: {
        width: 400,
        height: 300
      },
      aspectRatio: {
        width: 3,
        height: 4
      },
      allowOverflow: true
    })

    expect(wideSize).toEqual({
      width: 400,
      height: 225
    })
    expect(tallSize).toEqual({
      width: 225,
      height: 300
    })
  })

  it('зажимает frame с фиксированной пропорцией единым scale', () => {
    const source = new Rect({
      left: 256,
      top: 256,
      width: 1000,
      height: 667,
      scaleX: 0.512,
      scaleY: 0.512,
      originX: 'center',
      originY: 'center'
    })
    const frame = new Rect({
      left: 256,
      top: 256,
      width: 667,
      height: 667,
      scaleX: 0.512743628185907,
      scaleY: 0.512743628185907,
      originX: 'center',
      originY: 'center'
    })
    source.calcTransformMatrix = jest.fn(() => [
      source.scaleX ?? 1,
      0,
      0,
      source.scaleY ?? 1,
      256,
      256
    ])
    frame.calcTransformMatrix = jest.fn(() => [
      frame.scaleX ?? 1,
      0,
      0,
      frame.scaleY ?? 1,
      256,
      256
    ])

    clampCropFrameToSourcePreservingAspectRatio({
      source,
      frame
    })

    const rect = getCropRectInSource({
      source,
      frame
    })

    expect(frame.scaleX).toBeCloseTo(frame.scaleY ?? 0, 6)
    expect(rect.width).toBeCloseTo(667, 5)
    expect(rect.height).toBeCloseTo(667, 5)
    expect(rect.top).toBeCloseTo(-333.5, 5)
  })
})
