import { expect } from '@playwright/test'

import {
  FIT_OBJECT_GROWTH_DELTA,
  FIT_OBJECT_STABILITY_TOLERANCE
} from '../fixtures/data/fit-object.data'
import type {
  ShapeScaleSnapshot,
  TextResizeSnapshot
} from '../types'

export function expectShapeToGrowAfterFit(params: {
  initial: ShapeScaleSnapshot
  fitted: ShapeScaleSnapshot
}): void {
  const {
    initial,
    fitted
  } = params

  expect(fitted.groupBoundsWidth).toBeGreaterThan(initial.groupBoundsWidth + FIT_OBJECT_GROWTH_DELTA)
  expect(fitted.groupBoundsHeight).toBeGreaterThan(initial.groupBoundsHeight + FIT_OBJECT_GROWTH_DELTA)
}

export function expectShapeToStayFitted(params: {
  expected: ShapeScaleSnapshot
  actual: ShapeScaleSnapshot
}): void {
  const {
    expected,
    actual
  } = params

  expect(Math.abs(actual.groupBoundsWidth - expected.groupBoundsWidth))
    .toBeLessThanOrEqual(FIT_OBJECT_STABILITY_TOLERANCE)
  expect(Math.abs(actual.groupBoundsHeight - expected.groupBoundsHeight))
    .toBeLessThanOrEqual(FIT_OBJECT_STABILITY_TOLERANCE)
}

export function expectTextToGrowAfterFit(params: {
  initial: TextResizeSnapshot
  fitted: TextResizeSnapshot
}): void {
  const {
    initial,
    fitted
  } = params

  expect(fitted.boundsWidth).toBeGreaterThan(initial.boundsWidth + FIT_OBJECT_GROWTH_DELTA)
  expect(fitted.fontSize).toBeGreaterThan(initial.fontSize + 1)
}

export function expectTextToStayFitted(params: {
  initial: TextResizeSnapshot
  expected: TextResizeSnapshot
  actual: TextResizeSnapshot
}): void {
  const {
    initial,
    expected,
    actual
  } = params

  expect(actual.scaleX).toBe(1)
  expect(actual.scaleY).toBe(1)
  expect(actual.boundsWidth).toBeGreaterThan(initial.boundsWidth + FIT_OBJECT_GROWTH_DELTA)
  expect(Math.abs(actual.boundsHeight - expected.boundsHeight))
    .toBeLessThanOrEqual(FIT_OBJECT_STABILITY_TOLERANCE)
}

export function expectDisplayedFontSizeToMatchFittedText(params: {
  initialFontSize: number
  fittedFontSize: number
  displayedFontSize: number
}): void {
  const {
    initialFontSize,
    fittedFontSize,
    displayedFontSize
  } = params

  expect(fittedFontSize).toBeGreaterThan(initialFontSize + 1)
  expect(displayedFontSize).toBe(Math.round(fittedFontSize))
}
