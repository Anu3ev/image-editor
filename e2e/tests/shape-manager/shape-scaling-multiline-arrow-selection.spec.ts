import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_SCALING_TOLERANCE
} from '../../fixtures/data/shape-scaling.data'
import {
  MULTILINE_ARROW_EXPAND_BASE_SCALE,
  MULTILINE_ARROW_EXPAND_SCALE_STEP,
  MULTILINE_ARROW_SCALE_CYCLES,
  MULTILINE_ARROW_SELECTION_MINIMUM_SIZE,
  MULTILINE_ARROW_TEXT,
  MULTILINE_ARROW_SELECTION_SHAPES,
  MULTILINE_ARROW_SELECTION_SCENARIOS
} from '../../fixtures/data/shape-scaling-multiline-arrow.data'
import {
  readStableMinimumGeometry,
  type StableMinimumGeometry
} from '../../helpers/shape-scaling-geometry.helper'
import type { SelectionMinimumScaleState } from '../../types'
import type { ShapeModel } from '../../models/shape/shape.model'

/** Поля устойчивой геометрии, которые сравниваются после каждого уменьшения. */
const STABLE_MINIMUM_GEOMETRY_FIELDS: readonly Readonly<{
  field: keyof StableMinimumGeometry
  label: string
}>[] = Object.freeze([
  { field: 'groupWidth', label: 'ширина группы' },
  { field: 'groupHeight', label: 'высота группы' },
  { field: 'shapeOffsetLeft', label: 'смещение шейпа внутри группы по X' },
  { field: 'shapeOffsetTop', label: 'смещение шейпа внутри группы по Y' },
  { field: 'shapeWidth', label: 'ширина шейпа внутри группы' },
  { field: 'shapeHeight', label: 'высота шейпа внутри группы' },
  { field: 'textOffsetLeft', label: 'смещение текста внутри группы по X' },
  { field: 'textOffsetTop', label: 'смещение текста внутри группы по Y' },
  { field: 'textWidth', label: 'ширина текста' },
  { field: 'textHeight', label: 'высота текста' }
])

/** Проверяет неизменность геометрии обоих шейпов после первого достижения ограничения. */
function expectStableMinimumStates({
  shapes,
  states
}: {
  shapes: ShapeModel
  states: readonly SelectionMinimumScaleState[]
}): void {
  const baseline = states[0]
  if (!baseline) throw new Error('Первое достижение минимального размера должно существовать')

  for (const state of states) {
    for (const shapeState of state.shapes) {
      const baselineShape = baseline.shapes.find(({ id }) => id === shapeState.id)
      if (!baselineShape) throw new Error(`${shapeState.id}: не найдено первое устойчивое состояние`)

      const label = `${state.label} ${shapeState.id}`
      const geometry = readStableMinimumGeometry({ snapshot: shapeState.snapshot, phase: label })
      const baselineGeometry = readStableMinimumGeometry({
        snapshot: baselineShape.snapshot,
        phase: `эталон ${shapeState.id}`
      })

      expect(shapeState.lineCount, `${label}: число строк не должно меняться`)
        .toBe(baselineShape.lineCount)
      for (const { field, label: fieldLabel } of STABLE_MINIMUM_GEOMETRY_FIELDS) {
        expect(
          Math.abs(geometry[field] - baselineGeometry[field]),
          `${label}: значение «${fieldLabel}» не должно меняться`
        ).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      }
      shapes.checkNodeInsideGroup({
        snapshot: shapeState.snapshot,
        kind: 'shape',
        tolerance: SHAPE_SCALING_TOLERANCE.mouseupJump
      })
      shapes.checkNodeInsideGroup({
        snapshot: shapeState.snapshot,
        kind: 'text',
        tolerance: SHAPE_SCALING_TOLERANCE.mouseupJump
      })
    }
  }
}

test.describe('Скейлинг общего выделения из шейпов arrow-right-fat с многострочным текстом', () => {
  test.beforeEach(async({ editorModel, shapes }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()

    for (const shapeConfig of MULTILINE_ARROW_SELECTION_SHAPES) {
      const createdShape = await shapes.addAtBounds({
        presetKey: 'arrow-right-fat',
        options: {
          id: shapeConfig.id,
          left: montageBounds.left + shapeConfig.leftOffset,
          top: montageBounds.top + shapeConfig.topOffset,
          width: shapeConfig.width,
          height: shapeConfig.height,
          text: MULTILINE_ARROW_TEXT
        }
      })

      shapes.checkCreation({ shape: createdShape, presetKey: 'arrow-right-fat' })
    }

    await editorModel.checkObjectCount({ count: MULTILINE_ARROW_SELECTION_SHAPES.length })
    await editorModel.selectAllObjects()
  })

  for (const scenario of MULTILINE_ARROW_SELECTION_SCENARIOS) {
    test(scenario.title, async({ selection, shapes }) => {
      const states = await selection.scaling.repeatShapeSelectionScalingToMinimum({
        cycles: MULTILINE_ARROW_SCALE_CYCLES,
        direction: scenario,
        expandBaseScale: MULTILINE_ARROW_EXPAND_BASE_SCALE,
        expandScaleStep: MULTILINE_ARROW_EXPAND_SCALE_STEP,
        minimumSize: MULTILINE_ARROW_SELECTION_MINIMUM_SIZE,
        shapeIds: MULTILINE_ARROW_SELECTION_SHAPES.map(({ id }) => id)
      })

      expect(states).toHaveLength(MULTILINE_ARROW_SCALE_CYCLES + 1)
      expectStableMinimumStates({ shapes, states })
    })
  }
})
