/* eslint-disable no-use-before-define -- Keep the public CropFrame above the private drawing helpers. */
import {
  Rect,
  type FabricObject,
  type RectProps
} from 'fabric'
import { nanoid } from 'nanoid'

import { applyCropResizeControls } from '../interaction/crop-controls'
import { getCropFrameSourceSize } from './crop-frame-size'
import { getCropObjectSceneBounds } from './crop-geometry'
import type { ObjectBounds } from '../../utils/geometry'
import type { CropSize } from '../types'

/**
 * Color of the internal crop frame grid lines.
 */
const CROP_GRID_STROKE = 'rgba(47, 128, 237, 0.42)'

/**
 * Options for the crop frame runtime object.
 */
interface CropFrameOptions extends Partial<RectProps> {
  showGrid: boolean
  source?: FabricObject
  allowFrameOverflow?: boolean
  sourceScaleX?: number
  sourceScaleY?: number
  preserveAspectRatio?: boolean
}

/**
 * Crop frame runtime contract for selecting the resize mode.
 */
export interface CropFrameResizeTarget extends FabricObject {
  preserveAspectRatio?: boolean
  cropActiveResizePreserveAspectRatio?: boolean | null
}

/**
 * Crop frame runtime object with an optional rule-of-thirds grid.
 */
export class CropFrame extends Rect {
  /**
   * Source object for the active crop session. Only needed for live resize constraints.
   */
  public readonly cropSource: FabricObject | null

  /**
   * Whether the crop frame may be resized beyond the source bounds.
   */
  public readonly cropAllowFrameOverflow: boolean

  /**
   * Source scale along X when crop mode starts.
   */
  public readonly cropSourceScaleX: number

  /**
   * Source scale along Y when crop mode starts.
   */
  public readonly cropSourceScaleY: number

  /**
   * Whether to preserve the current aspect ratio when resizing without modifiers.
   */
  public preserveAspectRatio: boolean

  /**
   * Effective aspect ratio preservation mode for the current live resize.
   * null means the mode is determined by the base preserveAspectRatio value and Shift.
   */
  public cropActiveResizePreserveAspectRatio: boolean | null

  /**
   * Whether to display the grid inside the crop frame.
   */
  private readonly _showGrid: boolean

  /**
   * @param options - Runtime Fabric Rect parameters for crop mode.
   */
  constructor(options: CropFrameOptions) {
    const {
      showGrid,
      source = null,
      allowFrameOverflow = true,
      sourceScaleX = 1,
      sourceScaleY = 1,
      preserveAspectRatio = true,
      ...rectOptions
    } = options

    super(rectOptions)
    this._showGrid = showGrid
    this.cropSource = source
    this.cropAllowFrameOverflow = allowFrameOverflow
    this.cropSourceScaleX = sourceScaleX
    this.cropSourceScaleY = sourceScaleY
    this.preserveAspectRatio = preserveAspectRatio
    this.cropActiveResizePreserveAspectRatio = null
  }

  /**
   * Draws the crop frame and the internal grid, if enabled.
   */
  public override _render(ctx: CanvasRenderingContext2D): void {
    super._render(ctx)

    if (!this._showGrid) return

    drawCropGrid({
      ctx,
      width: this.width,
      height: this.height
    })
  }

  /**
   * Returns the crop frame size that matches the result of applying the crop.
   */
  public getObjectDisplaySize(): CropSize {
    return getCropFrameSourceSize({ frame: this })
  }

  /**
   * Returns crop frame bounds without the stroke, because snapping must use the crop result.
   */
  public getObjectSnappingBounds(): ObjectBounds {
    return getCropObjectSceneBounds({ object: this })
  }
}

/**
 * Creates the Fabric frame controlled by the user in crop mode.
 */
export function createCropFrame({
  source,
  cropSize,
  showGrid,
  allowFrameOverflow,
  preserveAspectRatio
}: {
  source: FabricObject
  cropSize: CropSize
  showGrid: boolean
  allowFrameOverflow: boolean
  preserveAspectRatio: boolean
}): CropFrame {
  const center = source.getCenterPoint()
  const sourceScaleX = source.scaleX ?? 1
  const sourceScaleY = source.scaleY ?? 1
  const frame = new CropFrame({
    id: `crop-frame-${nanoid()}`,
    left: center.x,
    top: center.y,
    width: cropSize.width,
    height: cropSize.height,
    originX: 'center',
    originY: 'center',
    scaleX: sourceScaleX,
    scaleY: sourceScaleY,
    angle: source.angle ?? 0,
    fill: 'rgba(47, 128, 237, 0.08)',
    stroke: '#2f80ed',
    strokeWidth: 1,
    strokeDashArray: [6, 4],
    strokeUniform: true,
    objectCaching: false,
    noScaleCache: true,
    selectable: true,
    evented: true,
    lockRotation: true,
    lockScalingFlip: true,
    lockSkewingX: true,
    lockSkewingY: true,
    excludeFromExport: true,
    showGrid,
    source,
    allowFrameOverflow,
    preserveAspectRatio,
    sourceScaleX,
    sourceScaleY
  })

  frame.setControlsVisibility({ mtr: false })
  applyCropResizeControls({ target: frame })

  return frame
}

/**
 * Synchronizes the transient live resize override on the crop frame.
 */
export function setCropFrameActiveResizePreserveAspectRatio({
  frame,
  preserveAspectRatio
}: {
  frame: Rect
  preserveAspectRatio: boolean | null
}): void {
  if (!(frame instanceof CropFrame)) {
    throw new Error('The crop session frame must be a CropFrame')
  }

  frame.cropActiveResizePreserveAspectRatio = preserveAspectRatio
}

/**
 * Draws a rule-of-thirds grid inside the crop frame.
 */
function drawCropGrid({
  ctx,
  width,
  height
}: {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
}): void {
  if (width <= 0 || height <= 0) return

  ctx.save()
  ctx.strokeStyle = CROP_GRID_STROKE
  ctx.lineWidth = 1
  ctx.setLineDash([])

  for (let index = 1; index <= 2; index += 1) {
    const x = -width / 2 + (width * index) / 3
    const y = -height / 2 + (height * index) / 3

    drawVerticalGridLine({ ctx, x, height })
    drawHorizontalGridLine({ ctx, y, width })
  }

  ctx.restore()
}

/**
 * Draws a vertical grid line.
 */
function drawVerticalGridLine({
  ctx,
  x,
  height
}: {
  ctx: CanvasRenderingContext2D
  x: number
  height: number
}): void {
  ctx.beginPath()
  ctx.moveTo(x, -height / 2)
  ctx.lineTo(x, height / 2)
  ctx.stroke()
}

/**
 * Draws a horizontal grid line.
 */
function drawHorizontalGridLine({
  ctx,
  y,
  width
}: {
  ctx: CanvasRenderingContext2D
  y: number
  width: number
}): void {
  ctx.beginPath()
  ctx.moveTo(-width / 2, y)
  ctx.lineTo(width / 2, y)
  ctx.stroke()
}
