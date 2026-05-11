import { expect } from '@playwright/test'
import type {
  ObjectTargetParams,
  ShapeScaleSnapshot,
  ShapeTextInfo
} from '../types'
import type { ShapeDiagonalScaleCorner } from '../models/shape/shape-scaling-session'
import { SHAPE_SCALING_TOLERANCE } from '../fixtures/data/shape-scaling.data'

type ShapeWordWrapShapesController = {
  getTextNode(params: ObjectTargetParams): Promise<ShapeTextInfo | null>
  dragActiveScaleHandleTowardAnchor(params: { distance: number }): Promise<ShapeScaleSnapshot>
}

const SHAPE_WORD_WRAP_MINIMUM_DRAG_STEPS = [
  120,
  60,
  30,
  15,
  8,
  4,
  2,
  1
]

export function normalizeRenderedText({ lines }: { lines: string[] }): string {
  return lines.join(' ').replace(/\s+/g, ' ').trim()
}

export function shouldAssertExactMinimumLines({
  exactMinimumCorners,
  corner
}: {
  exactMinimumCorners?: ShapeDiagonalScaleCorner[]
  corner: ShapeDiagonalScaleCorner
}): boolean {
  return !exactMinimumCorners || exactMinimumCorners.includes(corner)
}

export function expectWholeWordTextState({
  text,
  expectedText,
  expectedLines,
  expectedFontSize,
  missingTextMessage = 'текст внутри шейпа должен существовать'
}: {
  text: ShapeTextInfo | null
  expectedText: string
  expectedLines: string[]
  expectedFontSize: number
  missingTextMessage?: string
}): ShapeTextInfo {
  expect(text, missingTextMessage).not.toBeNull()

  if (!text) {
    throw new Error(missingTextMessage)
  }

  expect(text.fontSize).toBe(expectedFontSize)
  expect(text.lineCount).toBe(expectedLines.length)
  expect(text.splitByGrapheme).toBe(false)
  expect(text.lines).toHaveLength(text.lineCount)
  expect(text.lines).toEqual(expectedLines)
  expect(normalizeRenderedText({ lines: text.lines })).toBe(expectedText)

  return text
}

export function expectProportionalLiveMinimumState({
  initialSnapshot,
  liveSnapshot,
  liveText,
  initialFontSize,
  expectedLines,
  expectedText
}: {
  initialSnapshot: ShapeScaleSnapshot
  liveSnapshot: ShapeScaleSnapshot
  liveText: ShapeTextInfo
  initialFontSize: number
  expectedLines: string[]
  expectedText: string
}): void {
  expect(liveSnapshot.groupBoundsWidth).toBeLessThan(initialSnapshot.groupBoundsWidth)
  expect(liveSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)

  expectWholeWordTextState({
    text: liveText,
    expectedFontSize: initialFontSize,
    expectedLines,
    expectedText
  })
}

export function expectProportionalFinalMinimumState({
  liveSnapshot,
  finalSnapshot,
  liveText,
  finalText,
  expectedLines,
  expectedText
}: {
  liveSnapshot: ShapeScaleSnapshot
  finalSnapshot: ShapeScaleSnapshot
  liveText: ShapeTextInfo
  finalText: ShapeTextInfo
  expectedLines: string[]
  expectedText: string
}): void {
  expect(Math.abs(finalSnapshot.groupBoundsWidth - liveSnapshot.groupBoundsWidth))
    .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
  expect(Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight))
    .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)

  expectWholeWordTextState({
    text: finalText,
    expectedFontSize: liveText.fontSize,
    expectedLines,
    expectedText
  })
}

export async function shrinkShapeDiagonallyToWordWrapMinimum({
  shapes,
  expectedLineCount,
  corner: _corner,
  ...targetParams
}: {
  shapes: ShapeWordWrapShapesController
  expectedLineCount: number
  corner: ShapeDiagonalScaleCorner
} & ObjectTargetParams): Promise<{
  snapshot: ShapeScaleSnapshot
  text: ShapeTextInfo
}> {
  let lastSnapshot: ShapeScaleSnapshot | null = null
  let lastText: ShapeTextInfo | null = null

  for (const distance of SHAPE_WORD_WRAP_MINIMUM_DRAG_STEPS) {
    lastSnapshot = await shapes.dragActiveScaleHandleTowardAnchor({ distance })
    lastText = await shapes.getTextNode(targetParams)

    if (lastText && lastText.lineCount >= expectedLineCount && lastText.splitByGrapheme === false) {
      return {
        snapshot: lastSnapshot,
        text: lastText
      }
    }
  }

  if (!lastText) {
    throw new Error('minimum word-wrap state должен существовать после shrink по диагонали')
  }

  if (!lastSnapshot) {
    throw new Error('minimum word-wrap snapshot должен существовать после shrink по диагонали')
  }

  return {
    snapshot: lastSnapshot,
    text: lastText
  }
}
