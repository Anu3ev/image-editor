import { expect } from '@playwright/test'
import { test as editorTest } from './editor.fixture'
import { ShapeModel } from '../models/shape/shape.model'
import { SnappingModel } from '../models/snapping.model'
import type {
  ImageScaleSnapshot,
  SnappingObjectSnapshot
} from '../types'
import {
  SNAPPING_IMAGE_SCALE_CONTROL_GROWTH,
  SNAPPING_IMAGE_SCALE_SIZE
} from './data/snapping-image-scaling.data'

/** Толщина reference-объекта в экранных пикселях. */
const IMAGE_SCALE_REFERENCE_THICKNESS_PX = 12

/** Заранее известные границы reference-объектов, доступные для scale snapping. */
type ImageScaleReferenceGuides = Readonly<{
  left: number
  right: number
  top: number
  bottom: number
  bottomOuter: number
}>

/** Исходная геометрия и доступные границы четырёх reference-объектов. */
export type ImageScaleReferenceSetup = Readonly<{
  baseline: ImageScaleSnapshot
  guides: ImageScaleReferenceGuides
  imageId: string
  scenePixel: number
}>

/** Дополнительный fixture для сценариев scale обычного Image. */
interface ImageScalingFixtures {
  imageScaleReferenceSetup: ImageScaleReferenceSetup
}

/** Bounds четырёх reference-объектов вокруг исходного Image. */
type ImageScaleReferenceBounds = Readonly<{
  id: string
  left: number
  top: number
  width: number
  height: number
}>

/** Рассчитывает удалённые bounds reference-объектов для четырёх moving edges. */
function createImageScaleReferenceBounds({
  baseline,
  montage,
  thickness
}: {
  baseline: ImageScaleSnapshot
  montage: Pick<SnappingObjectSnapshot, 'boundsLeft' | 'boundsTop'>
  thickness: number
}): readonly ImageScaleReferenceBounds[] {
  const growthX = baseline.boundsWidth * SNAPPING_IMAGE_SCALE_CONTROL_GROWTH
  const growthY = baseline.boundsHeight * SNAPPING_IMAGE_SCALE_CONTROL_GROWTH

  return [
    {
      id: 'image-scale-left-guide',
      left: baseline.boundsLeft - growthX - thickness,
      top: montage.boundsTop + 20,
      width: thickness,
      height: thickness
    },
    {
      id: 'image-scale-right-guide',
      left: baseline.boundsRight + growthX,
      top: montage.boundsTop + 20,
      width: thickness,
      height: thickness
    },
    {
      id: 'image-scale-top-guide',
      left: montage.boundsLeft + 20,
      top: baseline.boundsTop - growthY - thickness,
      width: thickness,
      height: thickness
    },
    {
      id: 'image-scale-bottom-guide',
      left: montage.boundsLeft + 20,
      top: baseline.boundsBottom + growthY,
      width: thickness,
      height: thickness
    }
  ]
}

/** Добавляет четыре reference-объекта и возвращает snap-кандидаты, включая внешнюю нижнюю грань. */
async function addImageScaleReferences({
  baseline,
  montage,
  shapes,
  snapping,
  thickness
}: {
  baseline: ImageScaleSnapshot
  montage: Pick<SnappingObjectSnapshot, 'boundsLeft' | 'boundsTop'>
  shapes: ShapeModel
  snapping: SnappingModel
  thickness: number
}): Promise<ImageScaleReferenceGuides> {
  const referenceBounds = createImageScaleReferenceBounds({
    baseline,
    montage,
    thickness
  })

  for (const bounds of referenceBounds) {
    const shape = await shapes.addAtBounds({
      presetKey: 'square',
      options: {
        ...bounds,
        text: ''
      }
    })

    shapes.checkCreation({ shape, presetKey: 'square' })
  }

  const references = await Promise.all(referenceBounds.map(({ id }) => {
    return snapping.getObjectSnapshot({ id })
  }))
  const [leftReference, rightReference, topReference, bottomReference] = references

  return {
    left: leftReference.boundsRight,
    right: rightReference.boundsLeft,
    top: topReference.boundsBottom,
    bottom: bottomReference.boundsTop,
    bottomOuter: bottomReference.boundsBottom
  }
}

/** Editor fixture с готовым Image и независимыми guide для каждой moving edge. */
export const test = editorTest.extend<ImageScalingFixtures>({
  imageScaleReferenceSetup: async({
    editorModel,
    history,
    images,
    shapes,
    snapping
  }, use) => {
    const montageBounds = await editorModel.getMontageAreaBounds()
    const montage = {
      boundsLeft: montageBounds.left,
      boundsTop: montageBounds.top
    }
    const { zoom } = await editorModel.getCanvasState()
    if (!Number.isFinite(zoom) || zoom <= 0) {
      throw new Error('Image scale fixture requires positive canvas zoom')
    }

    const importedImage = await images.addFilledImage(SNAPPING_IMAGE_SCALE_SIZE)
    const image = images.checkCreation({ imageObject: importedImage })
    await images.moveBoundsTo({
      id: image.id,
      left: montage.boundsLeft + 140,
      top: montage.boundsTop + 120
    })

    const baseline = await images.scaling.getSnapshot({ id: image.id })
    const thickness = IMAGE_SCALE_REFERENCE_THICKNESS_PX / zoom
    const guides = await addImageScaleReferences({
      baseline,
      montage,
      shapes,
      snapping,
      thickness
    })
    if (guides.left >= baseline.boundsLeft || guides.right <= baseline.boundsRight) {
      throw new Error('Vertical Image scale guides must surround the baseline')
    }
    if (guides.top >= baseline.boundsTop || guides.bottom <= baseline.boundsBottom) {
      throw new Error('Horizontal Image scale guides must surround the baseline')
    }

    const setupFlushed = await history.flushPendingSave()

    expect(setupFlushed, 'fixture не должен оставлять отложенное сохранение').toBe(false)
    expect(guides.bottomOuter).toBeGreaterThan(guides.bottom)

    await use({
      baseline,
      guides,
      imageId: image.id,
      scenePixel: 1 / zoom
    })
  }
})

export { expect }
