import { expect } from '@playwright/test'
import { test as editorTest } from './editor.fixture'
import {
  SHAPE_MULTI_SCALING_LEFT_OPTIONS,
  SHAPE_MULTI_SCALING_RIGHT_OPTIONS,
  SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS,
  SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS
} from './data/shape-multi-scaling.data'

/** Set of shapes in the active selection. */
export type ShapeActiveSelectionVariant = 'equal-height' | 'different-height'

/** Settings and prepared state for collective shape-scaling tests. */
interface ShapeActiveSelectionScalingFixtures {
  shapeActiveSelectionSetup: void
  shapeActiveSelectionVariant: ShapeActiveSelectionVariant
}

/** Options for two shapes in each scene variant. */
const SHAPE_OPTIONS_BY_SELECTION_VARIANT = Object.freeze({
  'equal-height': [SHAPE_MULTI_SCALING_LEFT_OPTIONS, SHAPE_MULTI_SCALING_RIGHT_OPTIONS],
  'different-height': [SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS, SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS]
} satisfies Record<ShapeActiveSelectionVariant, readonly object[]>)

/** Adds two shapes and creates an active selection from them. */
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

/** Runs a scenario with two shapes of different heights without a local `test.use`. */
export const differentHeightTest = test.extend({
  shapeActiveSelectionVariant: 'different-height'
})

export { expect }
