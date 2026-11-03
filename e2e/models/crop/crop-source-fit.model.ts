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

/** Crop frame with the source it is constrained by and the scale of one source pixel. */
type BrowserCropFrame = BrowserCropGeometryObject & {
  cropSource: BrowserCropGeometryObject | null
  cropSourceScaleX: number
  cropSourceScaleY: number
}

/** Minimal browser contract for reading the active crop frame. */
type BrowserCropSourceFitWindow = Window & {
  editor?: {
    canvas: { getZoom: () => number }
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
    const { corners, sourceWidth, sourceHeight } = await this.getFrameCornersInSource()
    const maxX = Math.max(...corners.map(({ x }) => Math.abs(x)))
    const maxY = Math.max(...corners.map(({ y }) => Math.abs(y)))

    return {
      x: Math.max(0, maxX - (sourceWidth / 2)),
      y: Math.max(0, maxY - (sourceHeight / 2))
    }
  }

  /**
   * Returns the distance in unrounded source pixels from the frame corner closest to the right or bottom source
   * edge to that edge. It is negative when the frame extends beyond the edge.
   */
  async getFrameEdgeGap({ edge }: { edge: 'right' | 'bottom' }): Promise<number> {
    const { corners, sourceWidth, sourceHeight } = await this.getFrameCornersInSource()

    return edge === 'right'
      ? (sourceWidth / 2) - Math.max(...corners.map(({ x }) => x))
      : (sourceHeight / 2) - Math.max(...corners.map(({ y }) => y))
  }

  /** Returns the length of one screen pixel in source pixels of the active crop. */
  async getScreenPixelInSourcePixels(): Promise<number> {
    return this.page.evaluate(() => {
      const { editor } = window as BrowserCropSourceFitWindow
      const frame = editor?.cropManager.getState()?.frame
      if (!editor || !frame) throw new Error('An active crop frame is required')

      return 1 / (Math.min(frame.cropSourceScaleX, frame.cropSourceScaleY) * editor.canvas.getZoom())
    })
  }

  /** Returns the active crop frame corners in source coordinates with the source centre at the origin. */
  private async getFrameCornersInSource(): Promise<{
    corners: { x: number, y: number }[]
    sourceWidth: number
    sourceHeight: number
  }> {
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
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([signX, signY]) => {
        const frameX = signX * halfWidth
        const frameY = signY * halfHeight
        const sceneX = (frameA * frameX) + (frameC * frameY) + frameE - e
        const sceneY = (frameB * frameX) + (frameD * frameY) + frameF - f

        return {
          x: ((d * sceneX) - (c * sceneY)) / determinant,
          y: ((a * sceneY) - (b * sceneX)) / determinant
        }
      })

      return { corners, sourceWidth: source.width, sourceHeight: source.height }
    })
  }
}
