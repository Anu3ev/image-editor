import { Rect } from 'fabric'
import { ScaleSnappingRuntime } from '../../../../src/editor/snapping-manager/scaling/scale-snapping-runtime'
import { resolveCommonDisplayDistance } from '../../../../src/editor/utils/distance'
import { getObjectExactBounds } from '../../../../src/editor/utils/geometry'
import { createScaleBaseline, createScaleRawIntent } from '../../../test-utils/snapping/scale-snapping-core'

describe('Geometry and snapping technical errors', () => {
  it('reports English errors from nested scale parameter validation', () => {
    const runtime = new ScaleSnappingRuntime()
    runtime.startSession({ baseline: createScaleBaseline() })

    expect(() => runtime.resolveScalePlan({
      marker: {},
      intent: createScaleRawIntent({ values: [Number.NaN, 1] })
    })).toThrow('Scale raw intent values must be finite')
  })

  it('rejects a second active scale session with an English error', () => {
    const runtime = new ScaleSnappingRuntime()
    const baseline = createScaleBaseline()
    runtime.startSession({ baseline })

    expect(() => runtime.startSession({ baseline }))
      .toThrow('Scale snapping runtime already has an active session')
  })

  it('identifies the geometry source in an English exact-bounds error', () => {
    const object = new Rect({ width: 10, height: 10 })
    object.getObjectSnappingBounds = () => ({
      left: Number.NaN,
      right: 10,
      top: 0,
      bottom: 10,
      centerX: 5,
      centerY: 5
    })

    expect(() => getObjectExactBounds({ object }))
      .toThrow('Invalid custom snapping bounds: edge coordinates must be finite')
  })

  it('reports English validation errors for either display distance', () => {
    expect(() => resolveCommonDisplayDistance({
      firstDistance: 10,
      secondDistance: Number.NaN
    })).toThrow('Display distance must be finite')
    expect(() => resolveCommonDisplayDistance({ firstDistance: Number.NaN, secondDistance: 10 }))
      .toThrow('Display distance must be finite')
  })
})
