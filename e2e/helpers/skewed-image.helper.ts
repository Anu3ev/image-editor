import { expect } from '@playwright/test'

import type { CanvasModel } from '../models/canvas.model'
import type { EditorModel } from '../models/editor.model'
import type { ImageModel } from '../models/image/image.model'
import type { TemplateModel } from '../models/template.model'
import type { ImageScaleSnapshot } from '../types'

/** Image geometry that the template applies on top of the serialized image. */
export type ImageTemplateGeometry = {
  skewX: number
  skewY: number
  angle?: number
}

/**
 * Replaces the only selected image with a copy that has the given skew, applied through a template.
 * The template path sets skew without touching internal object state, the same way a saved design restores it.
 */
export async function reapplyImageWithSkew({
  geometry,
  template,
  canvas,
  images,
  editorModel
}: {
  geometry: ImageTemplateGeometry
  template: TemplateModel
  canvas: CanvasModel
  images: ImageModel
  editorModel: EditorModel
}): Promise<{ id: string }> {
  const definition = await template.serializeSelection({ withBackground: false })
  if (!definition || definition.objects.length !== 1) throw new Error('The template must contain one image')

  Object.assign(definition.objects[0], geometry)
  await canvas.clearCanvas()
  expect(await template.applyTemplate({ template: definition })).toBe(1)

  const image = images.checkCreation({ imageObject: (await editorModel.getObjects())[0] })
  const snapshot = await images.scaling.getSnapshot({ id: image.id })
  expect(snapshot.skewX).toBe(geometry.skewX)
  expect(snapshot.skewY).toBe(geometry.skewY)

  return { id: image.id }
}

/** Returns one edge of the image bounds, which include its skew and rotation. */
export function getImageBoundsEdge({
  snapshot,
  edge
}: {
  snapshot: ImageScaleSnapshot
  edge: 'left' | 'right' | 'top' | 'bottom'
}): number {
  if (edge === 'left') return snapshot.boundsLeft
  if (edge === 'right') return snapshot.boundsRight
  if (edge === 'top') return snapshot.boundsTop

  return snapshot.boundsBottom
}
