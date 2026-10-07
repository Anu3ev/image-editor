import { Rect } from 'fabric'
import { createTranslator } from '../../../../src/editor/i18n'
import { ScaleSnappingRuntime } from '../../../../src/editor/snapping-manager/scaling/scale-snapping-runtime'
import { resolveCommonDisplayDistance } from '../../../../src/editor/utils/distance'
import { getObjectExactBounds } from '../../../../src/editor/utils/geometry'
import { createScaleBaseline, createScaleRawIntent } from '../../../test-utils/snapping/scale-snapping-core'

describe('Geometry and snapping localization', () => {
  it('passes the session language through deep scale parameter validation', () => {
    const runtime = new ScaleSnappingRuntime(createTranslator({ language: 'ru' }))
    runtime.startSession({ baseline: createScaleBaseline() })

    expect(() => runtime.resolveScalePlan({
      marker: {},
      intent: createScaleRawIntent({ values: [Number.NaN, 1] })
    })).toThrow('Значения исходных параметров масштабирования должны быть конечными')
  })

  it('keeps concurrent session languages independent', () => {
    const russianRuntime = new ScaleSnappingRuntime(createTranslator({ language: 'ru' }))
    const englishRuntime = new ScaleSnappingRuntime(createTranslator({ language: 'en' }))
    const baseline = createScaleBaseline()
    russianRuntime.startSession({ baseline })
    englishRuntime.startSession({ baseline })

    expect(() => russianRuntime.startSession({ baseline }))
      .toThrow('В механизме прилипания при масштабировании уже есть активная сессия')
    expect(() => englishRuntime.startSession({ baseline }))
      .toThrow('Scale snapping runtime already has an active session')
  })

  it('translates the source label inside an exact bounds error', () => {
    const object = new Rect({ width: 10, height: 10 })
    object.getObjectSnappingBounds = () => ({
      left: Number.NaN,
      right: 10,
      top: 0,
      bottom: 10,
      centerX: 5,
      centerY: 5
    })

    expect(() => getObjectExactBounds({ object, t: createTranslator({ language: 'ru' }) }))
      .toThrow('Некорректные пользовательские границы прилипания: координаты границ должны быть конечными числами')
  })

  it('passes the language into distance validation and defaults standalone helpers to English', () => {
    expect(() => resolveCommonDisplayDistance({
      firstDistance: 10,
      secondDistance: Number.NaN,
      t: createTranslator({ language: 'ru' })
    })).toThrow('Отображаемое расстояние должно быть конечным числом')
    expect(() => resolveCommonDisplayDistance({ firstDistance: Number.NaN, secondDistance: 10 }))
      .toThrow('Display distance must be finite')
  })
})
