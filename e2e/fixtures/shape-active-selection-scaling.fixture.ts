import { expect } from '@playwright/test'
import { test as editorTest } from './editor.fixture'
import {
  SHAPE_MULTI_SCALING_LEFT_OPTIONS,
  SHAPE_MULTI_SCALING_RIGHT_OPTIONS,
  SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS,
  SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS
} from './data/shape-multi-scaling.data'

/** Набор шейпов в общем выделении. */
export type ShapeActiveSelectionVariant = 'equal-height' | 'different-height'

/** Настройки и подготовленное состояние тестов общего скейлинга шейпов. */
interface ShapeActiveSelectionScalingFixtures {
  shapeActiveSelectionSetup: void
  shapeActiveSelectionVariant: ShapeActiveSelectionVariant
}

/** Параметры двух шейпов для каждого варианта сцены. */
const SHAPE_OPTIONS_BY_SELECTION_VARIANT = Object.freeze({
  'equal-height': [SHAPE_MULTI_SCALING_LEFT_OPTIONS, SHAPE_MULTI_SCALING_RIGHT_OPTIONS],
  'different-height': [SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS, SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS]
} satisfies Record<ShapeActiveSelectionVariant, readonly object[]>)

/** Добавляет два шейпа и создаёт из них общее выделение. */
export const test = editorTest.extend<ShapeActiveSelectionScalingFixtures>({
  shapeActiveSelectionVariant: ['equal-height', { option: true }],

  shapeActiveSelectionSetup: [async({
    editorModel,
    shapeActiveSelectionVariant,
    shapes
  }, use) => {
    const shapeOptions = SHAPE_OPTIONS_BY_SELECTION_VARIANT[shapeActiveSelectionVariant]

    for (const options of shapeOptions) {
      const shape = await shapes.addAtBounds({ presetKey: 'square', options })

      shapes.checkCreation({ shape, presetKey: 'square' })
    }

    await editorModel.selectAllObjects()
    await use()
  }, { auto: true }]
})

/** Запускает сценарий с двумя шейпами разной высоты без локального `test.use`. */
export const differentHeightTest = test.extend({
  shapeActiveSelectionVariant: 'different-height'
})

export { expect }
