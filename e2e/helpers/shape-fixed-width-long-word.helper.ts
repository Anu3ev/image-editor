import { expect } from '@playwright/test'
import type {
  ShapeObjectInfo,
  ShapeScaleSnapshot,
  ShapeTextInfo
} from '../types'
import type { ShapeModel } from '../models/shape/shape.model'
import type { ShapeDiagonalScaleCorner } from '../models/shape/shape-scaling-session'
import {
  SHAPE_FIXED_WIDTH_LONG_WORD,
  SHAPE_FIXED_WIDTH_LONG_WORD_FONT_SIZE,
  SHAPE_FIXED_WIDTH_TOLERANCE,
  SHAPE_INITIAL_DIAGONAL_SCALE_TEXT,
  SHAPE_INITIAL_EXPLICIT_SIZE_SCALE,
  SHAPE_NARROW_DIAGONAL_SCALE_X,
  SHAPE_NARROW_DIAGONAL_SCALE_Y,
  SHAPE_SMALL_PROPORTIONAL_GROW_SCALE
} from '../fixtures/data/shape-fixed-width-long-word.data'

export type ShapeLongWordState = {
  text: ShapeTextInfo | null
  snapshot: ShapeScaleSnapshot
}

export type ShapeWrappedLongWordState = {
  text: ShapeTextInfo
  snapshot: ShapeScaleSnapshot
}

export interface ShapeLongWordObject extends ShapeObjectInfo {
  id: string
}

function expectTextBounds(snapshot: ShapeScaleSnapshot): {
  left: number
  top: number
  right: number
  bottom: number
} {
  expect(snapshot.textBoundsLeft, 'text bounds left должен существовать').not.toBeNull()
  expect(snapshot.textBoundsTop, 'text bounds top должен существовать').not.toBeNull()
  expect(snapshot.textBoundsRight, 'text bounds right должен существовать').not.toBeNull()
  expect(snapshot.textBoundsBottom, 'text bounds bottom должен существовать').not.toBeNull()

  if (
    snapshot.textBoundsLeft === null
    || snapshot.textBoundsTop === null
    || snapshot.textBoundsRight === null
    || snapshot.textBoundsBottom === null
  ) {
    throw new Error('text bounds должны существовать')
  }

  return {
    left: snapshot.textBoundsLeft,
    top: snapshot.textBoundsTop,
    right: snapshot.textBoundsRight,
    bottom: snapshot.textBoundsBottom
  }
}

export function expectExistingShapeText({
  text,
  expectedText
}: {
  text: ShapeTextInfo | null
  expectedText: string
}): ShapeTextInfo {
  expect(text, 'текст внутри шейпа должен существовать').not.toBeNull()

  if (!text) {
    throw new Error('текст внутри шейпа должен существовать')
  }

  expect(text.text).toBe(expectedText)
  expect(text.lines).toHaveLength(text.lineCount)

  return text
}

export function expectLongWordWrappedInsideShape({
  text,
  snapshot
}: {
  text: ShapeTextInfo | null
  snapshot: ShapeScaleSnapshot
}): ShapeTextInfo {
  const existingText = expectExistingShapeText({
    text,
    expectedText: SHAPE_FIXED_WIDTH_LONG_WORD
  })

  expect(existingText.lineCount).toBeGreaterThan(1)
  expect(existingText.splitByGrapheme).toBe(true)
  const textBounds = expectTextBounds(snapshot)

  expect(textBounds.left).toBeGreaterThanOrEqual(snapshot.groupBoundsLeft - SHAPE_FIXED_WIDTH_TOLERANCE)
  expect(textBounds.top).toBeGreaterThanOrEqual(snapshot.groupBoundsTop - SHAPE_FIXED_WIDTH_TOLERANCE)
  expect(textBounds.right).toBeLessThanOrEqual(snapshot.groupBoundsRight + SHAPE_FIXED_WIDTH_TOLERANCE)
  expect(textBounds.bottom).toBeLessThanOrEqual(snapshot.groupBoundsBottom + SHAPE_FIXED_WIDTH_TOLERANCE)

  return existingText
}

function expectCreatedLongWordShape({
  shape,
  id
}: {
  shape: ShapeObjectInfo
  id: string
}): ShapeLongWordObject {
  const actualId = shape.id

  expect(actualId).toBe(id)
  expect(shape.shapeComposite).toBe(true)

  if (actualId !== id) {
    throw new Error('созданный шейп должен иметь ожидаемый id')
  }

  return {
    ...shape,
    id: actualId
  }
}

export async function addShapeWithInitialTextForLongWord({
  shapes,
  id
}: {
  shapes: ShapeModel
  id: string
}): Promise<ShapeLongWordObject> {
  const shape = shapes.checkCreation({
    shape: await shapes.add({
      presetKey: 'square',
      options: {
        id,
        text: SHAPE_INITIAL_DIAGONAL_SCALE_TEXT,
        textStyle: {
          fontSize: SHAPE_FIXED_WIDTH_LONG_WORD_FONT_SIZE
        }
      }
    }),
    presetKey: 'square'
  })

  return expectCreatedLongWordShape({
    shape,
    id
  })
}

export async function addShapeWithExplicitSizeForLongWord({
  shapes,
  id,
  corner
}: {
  shapes: ShapeModel
  id: string
  corner: ShapeDiagonalScaleCorner
}): Promise<ShapeLongWordObject> {
  const shape = shapes.checkCreation({
    shape: await shapes.add({
      presetKey: 'square',
      options: {
        id,
        text: ''
      }
    }),
    presetKey: 'square'
  })

  await shapes.scaleDiagonallyProportionally({
    id,
    corner,
    scale: SHAPE_INITIAL_EXPLICIT_SIZE_SCALE
  })
  await shapes.finishScale({ id })

  return expectCreatedLongWordShape({
    shape,
    id
  })
}

export async function getShapeLongWordState({
  shapes,
  id
}: {
  shapes: ShapeModel
  id: string
}): Promise<ShapeLongWordState> {
  return {
    text: await shapes.getTextNode({ id }),
    snapshot: await shapes.getScaleSnapshot({ id })
  }
}

export async function getWrappedLongWordState({
  shapes,
  id
}: {
  shapes: ShapeModel
  id: string
}): Promise<ShapeWrappedLongWordState> {
  const state = await getShapeLongWordState({
    shapes,
    id
  })
  const text = expectLongWordWrappedInsideShape(state)

  return {
    text,
    snapshot: state.snapshot
  }
}

export async function replaceShapeTextWithLongWord({
  shapes,
  id
}: {
  shapes: ShapeModel
  id: string
}): Promise<void> {
  await shapes.enterTextEditing({ id })
  await shapes.typeText({
    id,
    text: SHAPE_FIXED_WIDTH_LONG_WORD
  })
}

export async function shrinkShapeToMinimumByCorner({
  shapes,
  id,
  corner
}: {
  shapes: ShapeModel
  id: string
  corner: ShapeDiagonalScaleCorner
}): Promise<void> {
  await shapes.shrinkDiagonallyToMinimum({
    id,
    corner
  })
  await shapes.finishScale({ id })
}

export async function narrowWrappedLongWordShapeByCorner({
  shapes,
  id,
  corner
}: {
  shapes: ShapeModel
  id: string
  corner: ShapeDiagonalScaleCorner
}): Promise<ShapeWrappedLongWordState> {
  await shapes.scaleDiagonally({
    id,
    corner,
    scaleX: SHAPE_NARROW_DIAGONAL_SCALE_X,
    scaleY: SHAPE_NARROW_DIAGONAL_SCALE_Y,
    shiftKey: true
  })
  await shapes.finishScale({ id })

  const state = await getShapeLongWordState({
    shapes,
    id
  })
  const text = expectLongWordWrappedInsideShape(state)

  return {
    text,
    snapshot: state.snapshot
  }
}

export async function growWrappedLongWordShapeProportionallyByCorner({
  shapes,
  id,
  corner
}: {
  shapes: ShapeModel
  id: string
  corner: ShapeDiagonalScaleCorner
}): Promise<ShapeWrappedLongWordState> {
  const snapshot = await shapes.scaleDiagonallyProportionally({
    id,
    corner,
    scale: SHAPE_SMALL_PROPORTIONAL_GROW_SCALE
  })
  const text = await shapes.getTextNode({ id })
  const wrappedText = expectLongWordWrappedInsideShape({
    text,
    snapshot
  })

  return {
    text: wrappedText,
    snapshot
  }
}
