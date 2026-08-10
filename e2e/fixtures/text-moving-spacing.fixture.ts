import { expect } from '@playwright/test'
import { test as editorTest } from './editor.fixture'
import { ShapeModel } from '../models/shape/shape.model'
import { SnappingModel } from '../models/snapping.model'
import type { SnappingObjectSnapshot } from '../types'

/** Геометрия отдельного текста и опорных объектов для равноудалённого прилипания. */
export type TextMovingSpacingSetup = Readonly<{
  activeTextId: string
  active: SnappingObjectSnapshot
  bottom: SnappingObjectSnapshot
  expectedLeft: number
  expectedTop: number
  left: SnappingObjectSnapshot
  right: SnappingObjectSnapshot
  top: SnappingObjectSnapshot
}>

/** Дополнительный fixture для горизонтальной и вертикальной равноудалённости текста. */
interface TextMovingSpacingFixtures {
  textMovingSpacingSetup: TextMovingSpacingSetup
}

/** Исходные границы одного опорного шейпа. */
type TextSpacingReferenceBounds = Readonly<{
  id: string
  height: number
  left: number
  top: number
  width: number
}>

/** Добавляет опорные шейпы и возвращает их точные границы. */
async function addTextSpacingReferences({
  bounds,
  shapes,
  snapping
}: {
  bounds: readonly TextSpacingReferenceBounds[]
  shapes: ShapeModel
  snapping: SnappingModel
}): Promise<readonly SnappingObjectSnapshot[]> {
  for (const options of bounds) {
    const shape = await shapes.addAtBounds({
      presetKey: 'square',
      options: {
        ...options,
        text: ''
      }
    })

    shapes.checkCreation({ shape, presetKey: 'square' })
  }

  const references = await Promise.all(bounds.map(({ id }) => {
    return snapping.getObjectSnapshot({ id })
  }))

  expect(references).toHaveLength(bounds.length)
  expect(references.every(({ boundsWidth, boundsHeight }) => {
    return boundsWidth > 0 && boundsHeight > 0
  })).toBe(true)

  return references
}

/** Editor fixture с отдельным текстом между горизонтальными и вертикальными опорами. */
export const test = editorTest.extend<TextMovingSpacingFixtures>({
  textMovingSpacingSetup: async({
    editorModel,
    shapes,
    snapping,
    text
  }, use) => {
    const montage = await editorModel.getMontageAreaBounds()
    const activeTextId = 'active-text'
    const activeText = await text.add({
      id: activeTextId,
      text: 'Текст',
      left: montage.left + 240,
      top: montage.top + 220,
      originX: 'left',
      originY: 'top',
      width: 90,
      fontSize: 24,
      autoExpand: false
    })

    text.checkCreation({ textObject: activeText })

    const references = await addTextSpacingReferences({
      bounds: [
        { id: 'left-shape', left: montage.left + 60, top: montage.top + 300, width: 60, height: 100 },
        { id: 'right-shape', left: montage.left + 240, top: montage.top + 300, width: 60, height: 100 },
        { id: 'top-shape', left: montage.left + 360, top: montage.top + 60, width: 140, height: 60 },
        { id: 'bottom-shape', left: montage.left + 360, top: montage.top + 320, width: 140, height: 60 }
      ],
      shapes,
      snapping
    })
    const [left, right, top, bottom] = references
    const active = await snapping.getObjectSnapshot({ id: activeTextId })
    const expectedLeft = left.boundsRight
      + ((right.boundsLeft - left.boundsRight - active.boundsWidth) / 2)
    const expectedTop = top.boundsBottom
      + ((bottom.boundsTop - top.boundsBottom - active.boundsHeight) / 2)

    expect(expectedLeft).toBeGreaterThan(left.boundsRight)
    expect(expectedTop).toBeGreaterThan(top.boundsBottom)

    await use({
      activeTextId,
      active,
      bottom,
      expectedLeft,
      expectedTop,
      left,
      right,
      top
    })
  }
})

export { expect }
