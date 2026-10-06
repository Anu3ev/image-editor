import { expect } from '@playwright/test'

import type {
  SelectionMixedCompositionSnapshot,
  ShapeScaleSnapshot,
  ShapeTextInfo,
  SnappingObjectSnapshot,
  TextResizeSnapshot
} from '../types'

/** Object state of the full mixed selection at one history step. */
type MixedSelectionHistorySnapshot = Readonly<{
  image: SnappingObjectSnapshot
  shape: ShapeScaleSnapshot
  shapeText: ShapeTextInfo | null
  text: TextResizeSnapshot
}>

/** Checks that text inside a shape is not stretched during scaling. */
export function expectMixedShapeTextNotDeformed({
  initial,
  live
}: {
  initial: SelectionMixedCompositionSnapshot['shapes'][number]
  live: SelectionMixedCompositionSnapshot['shapes'][number]
}): void {
  const initialScaleX = (initial.geometry.topEdgeLength / initial.snapshot.width) * initial.text.scaleX
  const initialScaleY = (initial.geometry.leftEdgeLength / initial.snapshot.height) * initial.text.scaleY
  const liveScaleX = (live.geometry.topEdgeLength / live.snapshot.width) * live.text.scaleX
  const liveScaleY = (live.geometry.leftEdgeLength / live.snapshot.height) * live.text.scaleY

  expect(live.text.fontSize).toBeCloseTo(initial.text.fontSize, 5)
  expect(liveScaleX).toBeCloseTo(initialScaleX, 5)
  expect(liveScaleY).toBeCloseTo(initialScaleY, 5)
  expect(live.geometry.orthogonality).toBeCloseTo(0, 5)
}

/** Checks dimensions of all three object types during scaling without affine distortion. */
export function expectMixedSelectionScalePreview({
  changesHeight,
  initial,
  live
}: {
  changesHeight: boolean
  initial: SelectionMixedCompositionSnapshot
  live: SelectionMixedCompositionSnapshot
}): void {
  const initialImage = initial.images[0]
  const liveImage = live.images[0]
  const initialShape = initial.shapes[0]
  const liveShape = live.shapes[0]
  const initialText = initial.texts[0]
  const liveText = live.texts[0]
  if (!initialImage || !liveImage || !initialShape || !liveShape || !initialText || !liveText) {
    throw new Error('Полное состояние должно содержать изображение, шейп и отдельный текст')
  }

  const imageWidthMultiplier = liveImage.geometry.topEdgeLength / initialImage.geometry.topEdgeLength
  const imageHeightMultiplier = liveImage.geometry.leftEdgeLength / initialImage.geometry.leftEdgeLength
  expect(imageWidthMultiplier).toBeGreaterThan(1)
  expect(imageHeightMultiplier).toBeCloseTo(changesHeight ? imageWidthMultiplier : 1, 5)
  expect(liveImage.geometry.orthogonality).toBeCloseTo(0, 5)

  expect(liveShape.geometry.topEdgeLength).toBeGreaterThan(initialShape.geometry.topEdgeLength)
  if (!changesHeight) {
    expect(liveShape.geometry.leftEdgeLength).toBeCloseTo(initialShape.geometry.leftEdgeLength, 5)
  }
  expectMixedShapeTextNotDeformed({ initial: initialShape, live: liveShape })

  expect(liveText.snapshot.width).toBeGreaterThan(initialText.snapshot.width)
  expect(liveText.snapshot.fontSize).toBeCloseTo(
    changesHeight
      ? initialText.snapshot.fontSize * imageWidthMultiplier
      : initialText.snapshot.fontSize,
    5
  )
  expect(liveText.geometry.topEdgeLength / liveText.snapshot.width)
    .toBeCloseTo(initialText.geometry.topEdgeLength / initialText.snapshot.width, 5)
  expect(liveText.geometry.leftEdgeLength / liveText.snapshot.height)
    .toBeCloseTo(initialText.geometry.leftEdgeLength / initialText.snapshot.height, 5)
}

/** Checks that the entire composition is unchanged between two guide-hold frames. */
export function expectMixedSelectionScaleHold({
  acquired,
  held
}: {
  acquired: SelectionMixedCompositionSnapshot
  held: SelectionMixedCompositionSnapshot
}): void {
  for (const edge of ['boundsLeft', 'boundsRight', 'boundsTop', 'boundsBottom'] as const) {
    expect(held.selection[edge]).toBeCloseTo(acquired.selection[edge], 8)
  }
  for (const key of ['images', 'shapes', 'texts'] as const) {
    const acquiredChild = acquired[key][0]
    const heldChild = held[key][0]
    if (!acquiredChild || !heldChild) throw new Error('Кадр удержания должен содержать все три объекта')

    expect(heldChild.geometry.centerX).toBeCloseTo(acquiredChild.geometry.centerX, 8)
    expect(heldChild.geometry.centerY).toBeCloseTo(acquiredChild.geometry.centerY, 8)
    expect(heldChild.geometry.topEdgeLength).toBeCloseTo(acquiredChild.geometry.topEdgeLength, 8)
    expect(heldChild.geometry.leftEdgeLength).toBeCloseTo(acquiredChild.geometry.leftEdgeLength, 8)
  }
}

/** Checks shape preservation when copying or restoring from a template. */
export function expectMixedShapeScaleRoundtrip({
  actual,
  expected,
  offsetX = 0,
  offsetY = 0
}: {
  actual: SelectionMixedCompositionSnapshot['shapes'][number]
  expected: SelectionMixedCompositionSnapshot['shapes'][number]
  offsetX?: number
  offsetY?: number
}): void {
  expect(actual.geometry.centerX).toBeCloseTo(expected.geometry.centerX + offsetX, 5)
  expect(actual.geometry.centerY).toBeCloseTo(expected.geometry.centerY + offsetY, 5)
  expect(actual.geometry.topEdgeLength).toBeCloseTo(expected.geometry.topEdgeLength, 5)
  expect(actual.geometry.leftEdgeLength).toBeCloseTo(expected.geometry.leftEdgeLength, 5)
  expect(actual.geometry.orthogonality).toBeCloseTo(0, 5)
  expect(actual.snapshot.width).toBeCloseTo(expected.snapshot.width, 5)
  expect(actual.snapshot.height).toBeCloseTo(expected.snapshot.height, 5)
  expectMixedShapeTextNotDeformed({ initial: expected, live: actual })
  expect(actual.text).toMatchObject({
    fontFamily: expected.text.fontFamily,
    fontStyle: expected.text.fontStyle,
    fontWeight: expected.text.fontWeight,
    text: expected.text.text,
    textAlign: expected.text.textAlign
  })
}

/** Checks restoration of an image, a shape, and text at one history point. */
export function expectMixedSelectionHistoryRestore({
  actual,
  expected
}: {
  actual: MixedSelectionHistorySnapshot
  expected: MixedSelectionHistorySnapshot
}): void {
  for (const field of ['boundsLeft', 'boundsTop', 'boundsWidth', 'boundsHeight'] as const) {
    expect(actual.image[field]).toBeCloseTo(expected.image[field], 1)
  }
  for (const field of [
    'width',
    'height',
    'groupBoundsLeft',
    'groupBoundsTop',
    'groupBoundsWidth',
    'groupBoundsHeight'
  ] as const) {
    expect(actual.shape[field]).toBeCloseTo(expected.shape[field], 1)
  }
  for (const field of ['width', 'height', 'fontSize', 'boundsLeft', 'boundsTop'] as const) {
    expect(actual.text[field]).toBeCloseTo(expected.text[field], 1)
  }
  if (!actual.shapeText || !expected.shapeText) {
    throw new Error('История должна содержать текст внутри шейпа')
  }
  expect(actual.shapeText.fontSize).toBeCloseTo(expected.shapeText.fontSize, 1)
  expect(actual.shapeText.lineCount).toBe(expected.shapeText.lineCount)
}

/** Checks that mouseup preserves the last visible state and unit scale of child objects. */
export function expectMixedSelectionScaleCommit({
  final,
  live
}: {
  final: SelectionMixedCompositionSnapshot
  live: SelectionMixedCompositionSnapshot
}): void {
  for (const edge of ['boundsLeft', 'boundsRight', 'boundsTop', 'boundsBottom'] as const) {
    expect(final.selection[edge]).toBeCloseTo(live.selection[edge], 5)
  }
  for (const key of ['images', 'shapes', 'texts'] as const) {
    const finalChild = final[key][0]
    const liveChild = live[key][0]
    if (!finalChild || !liveChild) throw new Error('Состояние до и после mouseup должно содержать все три объекта')

    expect(finalChild.geometry.centerX).toBeCloseTo(liveChild.geometry.centerX, 5)
    expect(finalChild.geometry.centerY).toBeCloseTo(liveChild.geometry.centerY, 5)
    expect(finalChild.geometry.topEdgeLength).toBeCloseTo(liveChild.geometry.topEdgeLength, 5)
    expect(finalChild.geometry.leftEdgeLength).toBeCloseTo(liveChild.geometry.leftEdgeLength, 5)
  }

  const finalShape = final.shapes[0]
  const finalText = final.texts[0]
  if (!finalShape || !finalText) throw new Error('Итоговое состояние должно содержать шейп и текст')
  expect(final.selection.scaleX).toBeCloseTo(1, 10)
  expect(final.selection.scaleY).toBeCloseTo(1, 10)
  expect(finalShape.snapshot.scaleX).toBeCloseTo(1, 10)
  expect(finalShape.snapshot.scaleY).toBeCloseTo(1, 10)
  expect(finalShape.text.scaleX).toBeCloseTo(1, 10)
  expect(finalShape.text.scaleY).toBeCloseTo(1, 10)
  expect(finalText.snapshot.scaleX).toBeCloseTo(1, 10)
  expect(finalText.snapshot.scaleY).toBeCloseTo(1, 10)
}
