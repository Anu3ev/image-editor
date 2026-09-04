import { expect } from '@playwright/test'
import type { SelectionImageTextCompositionSnapshot } from '../types'

/** Пара снимков до и во время скейлинга выделения с изображениями и текстами. */
type ImageTextScalePreviewExpectation = Readonly<{
  changesHeight: boolean
  initial: SelectionImageTextCompositionSnapshot
  live: SelectionImageTextCompositionSnapshot
}>

/** Пара снимков до и после завершения скейлинга указателем. */
type ImageTextScaleCommitExpectation = Readonly<{
  final: SelectionImageTextCompositionSnapshot
  live: SelectionImageTextCompositionSnapshot
}>

/** Пара снимков первого и последующих кадров удержания направляющей. */
type ImageTextScaleHoldExpectation = Readonly<{
  acquired: SelectionImageTextCompositionSnapshot
  held: SelectionImageTextCompositionSnapshot
}>

/** Проверяет неизменность рамки и всех дочерних объектов внутри удержания. */
export function expectImageTextScaleHold({
  acquired,
  held
}: ImageTextScaleHoldExpectation): void {
  for (const edge of ['boundsLeft', 'boundsRight', 'boundsTop', 'boundsBottom'] as const) {
    expect(held.selection[edge]).toBeCloseTo(acquired.selection[edge], 8)
  }
  expect(held.images).toHaveLength(acquired.images.length)
  for (const [index, heldImage] of held.images.entries()) {
    const acquiredImage = acquired.images[index]
    if (!acquiredImage) throw new Error('Состояние удержания должно содержать все изображения')

    expect(heldImage.geometry.centerX).toBeCloseTo(acquiredImage.geometry.centerX, 8)
    expect(heldImage.geometry.centerY).toBeCloseTo(acquiredImage.geometry.centerY, 8)
    expect(heldImage.geometry.topEdgeLength).toBeCloseTo(acquiredImage.geometry.topEdgeLength, 8)
    expect(heldImage.geometry.leftEdgeLength).toBeCloseTo(acquiredImage.geometry.leftEdgeLength, 8)
  }
  expect(held.texts).toHaveLength(acquired.texts.length)
  for (const [index, heldText] of held.texts.entries()) {
    const acquiredText = acquired.texts[index]
    if (!acquiredText) throw new Error('Состояние удержания должно содержать все тексты')

    expect(heldText.snapshot.width).toBeCloseTo(acquiredText.snapshot.width, 8)
    expect(heldText.snapshot.height).toBeCloseTo(acquiredText.snapshot.height, 8)
    expect(heldText.snapshot.fontSize).toBeCloseTo(acquiredText.snapshot.fontSize, 8)
    expect(heldText.geometry.centerX).toBeCloseTo(acquiredText.geometry.centerX, 8)
    expect(heldText.geometry.centerY).toBeCloseTo(acquiredText.geometry.centerY, 8)
    expect(heldText.geometry.topEdgeLength).toBeCloseTo(acquiredText.geometry.topEdgeLength, 8)
    expect(heldText.geometry.leftEdgeLength).toBeCloseTo(acquiredText.geometry.leftEdgeLength, 8)
  }
}

/** Проверяет живой размер изображений и отсутствие растяжения символов текста. */
export function expectImageTextScalePreview({
  changesHeight,
  initial,
  live
}: ImageTextScalePreviewExpectation): void {
  expect(live.images).toHaveLength(initial.images.length)
  expect(live.texts).toHaveLength(initial.texts.length)

  for (const [index, liveImage] of live.images.entries()) {
    const initialImage = initial.images[index]
    if (!initialImage) throw new Error('Исходное состояние должно содержать все изображения')

    const widthMultiplier = liveImage.geometry.topEdgeLength / initialImage.geometry.topEdgeLength
    expect(widthMultiplier).toBeGreaterThan(1)
    expect(liveImage.geometry.orthogonality).toBeCloseTo(0, 5)
    expect(liveImage.snapshot).toMatchObject({
      angle: initialImage.snapshot.angle,
      cropX: initialImage.snapshot.cropX,
      cropY: initialImage.snapshot.cropY,
      flipX: initialImage.snapshot.flipX,
      flipY: initialImage.snapshot.flipY,
      height: initialImage.snapshot.height,
      originX: initialImage.snapshot.originX,
      originY: initialImage.snapshot.originY,
      skewX: initialImage.snapshot.skewX,
      skewY: initialImage.snapshot.skewY,
      width: initialImage.snapshot.width
    })

    const heightMultiplier = liveImage.geometry.leftEdgeLength / initialImage.geometry.leftEdgeLength
    if (changesHeight) expect(heightMultiplier).toBeCloseTo(widthMultiplier, 5)
    if (!changesHeight) expect(heightMultiplier).toBeCloseTo(1, 5)
  }

  for (const [index, liveText] of live.texts.entries()) {
    const initialText = initial.texts[index]
    if (!initialText) throw new Error('Исходное состояние должно содержать все тексты')

    expect(liveText.snapshot.width).toBeGreaterThan(initialText.snapshot.width)
    if (changesHeight) {
      expect(liveText.snapshot.fontSize / initialText.snapshot.fontSize)
        .toBeCloseTo(liveText.snapshot.width / initialText.snapshot.width, 5)
    } else {
      expect(liveText.snapshot.fontSize).toBeCloseTo(initialText.snapshot.fontSize, 5)
    }
    expect(liveText.geometry.topEdgeLength / liveText.snapshot.width)
      .toBeCloseTo(initialText.geometry.topEdgeLength / initialText.snapshot.width, 5)
    expect(liveText.geometry.leftEdgeLength / liveText.snapshot.height)
      .toBeCloseTo(initialText.geometry.leftEdgeLength / initialText.snapshot.height, 5)
    expect(liveText.geometry.orthogonality).toBeCloseTo(0, 5)
  }
}

/** Проверяет, что mouseup не меняет последнее видимое состояние рамки и её детей. */
export function expectImageTextScaleCommit({
  final,
  live
}: ImageTextScaleCommitExpectation): void {
  for (const edge of ['boundsLeft', 'boundsTop', 'boundsRight', 'boundsBottom'] as const) {
    expect(final.selection[edge]).toBeCloseTo(live.selection[edge], 5)
  }
  expect(final.selection.scaleX).toBe(1)
  expect(final.selection.scaleY).toBe(1)
  expect(final.images).toHaveLength(live.images.length)
  for (const [index, finalImage] of final.images.entries()) {
    const liveImage = live.images[index]
    if (!liveImage) throw new Error('Состояние до mouseup должно содержать все изображения')

    expect(finalImage.geometry.centerX).toBeCloseTo(liveImage.geometry.centerX, 5)
    expect(finalImage.geometry.centerY).toBeCloseTo(liveImage.geometry.centerY, 5)
    expect(finalImage.geometry.topEdgeLength).toBeCloseTo(liveImage.geometry.topEdgeLength, 5)
    expect(finalImage.geometry.leftEdgeLength).toBeCloseTo(liveImage.geometry.leftEdgeLength, 5)
  }
  expect(final.texts).toHaveLength(live.texts.length)
  for (const [index, finalText] of final.texts.entries()) {
    const liveText = live.texts[index]
    if (!liveText) throw new Error('Состояние до mouseup должно содержать все тексты')

    expect(finalText.snapshot.width).toBeCloseTo(liveText.snapshot.width, 5)
    expect(finalText.snapshot.height).toBeCloseTo(liveText.snapshot.height, 5)
    expect(finalText.snapshot.fontSize).toBeCloseTo(liveText.snapshot.fontSize, 5)
    expect(finalText.geometry.centerX).toBeCloseTo(liveText.geometry.centerX, 5)
    expect(finalText.geometry.centerY).toBeCloseTo(liveText.geometry.centerY, 5)
    expect(finalText.geometry.topEdgeLength).toBeCloseTo(liveText.geometry.topEdgeLength, 5)
    expect(finalText.geometry.leftEdgeLength).toBeCloseTo(liveText.geometry.leftEdgeLength, 5)
  }
}
