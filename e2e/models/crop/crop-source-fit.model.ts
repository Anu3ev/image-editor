import type { Page } from '@playwright/test'

import type { CropSourceOverflowInfo } from '../../types'

/** Fabric 2D affine matrix in `[a, b, c, d, e, f]` order. */
type BrowserTransformMatrix = [number, number, number, number, number, number]

/** Fabric object geometry needed to map frame corners into the source. */
type BrowserCropGeometryObject = {
  width: number
  height: number
  calcTransformMatrix: () => BrowserTransformMatrix
}

/** Crop frame with the source it is constrained by. */
type BrowserCropFrame = BrowserCropGeometryObject & {
  cropSource: BrowserCropGeometryObject | null
}

/** Minimal browser contract for reading the active crop frame. */
type BrowserCropSourceFitWindow = Window & {
  editor?: {
    cropManager: {
      getState: () => { frame: BrowserCropFrame } | null
    }
  }
}

/** E2E model of how the active crop frame fits inside its source in strict mode. */
export class CropSourceFitModel {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Returns how far the active crop frame extends beyond its source on each axis, in unrounded source pixels.
   * Unlike the public rounded `getState().rect`, it also reveals a sub-pixel overflow.
   */
  async getFrameOverflow(): Promise<CropSourceOverflowInfo> {
    return this.page.evaluate(() => {
      const { editor } = window as BrowserCropSourceFitWindow
      const frame = editor?.cropManager.getState()?.frame
      if (!frame?.cropSource) throw new Error('An active crop frame with a source is required')

      const { cropSource: source } = frame
      const [a, b, c, d, e, f] = source.calcTransformMatrix()
      const [frameA, frameB, frameC, frameD, frameE, frameF] = frame.calcTransformMatrix()
      const determinant = (a * d) - (b * c)
      const halfWidth = frame.width / 2
      const halfHeight = frame.height / 2
      const localCorners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([signX, signY]) => {
        const frameX = signX * halfWidth
        const frameY = signY * halfHeight
        const sceneX = (frameA * frameX) + (frameC * frameY) + frameE - e
        const sceneY = (frameB * frameX) + (frameD * frameY) + frameF - f

        return {
          x: ((d * sceneX) - (c * sceneY)) / determinant,
          y: ((a * sceneY) - (b * sceneX)) / determinant
        }
      })
      const maxX = Math.max(...localCorners.map(({ x }) => Math.abs(x)))
      const maxY = Math.max(...localCorners.map(({ y }) => Math.abs(y)))

      return {
        x: Math.max(0, maxX - (source.width / 2)),
        y: Math.max(0, maxY - (source.height / 2))
      }
    })
  }
}
