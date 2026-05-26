/* eslint-disable no-use-before-define -- Public CropFrame держим выше private drawing helpers. */
import {
  Rect,
  type FabricObject,
  type RectProps
} from 'fabric'
import { nanoid } from 'nanoid'

import { applyCropResizeControls } from '../interaction/crop-controls'
import { getCropFrameSourceSize } from './crop-frame-size'
import type { CropSize } from '../types'

/**
 * Цвет внутренних линий сетки crop frame.
 */
const CROP_GRID_STROKE = 'rgba(47, 128, 237, 0.42)'

/**
 * Опции runtime-объекта crop frame.
 */
interface CropFrameOptions extends Partial<RectProps> {
  showGrid: boolean
  sourceScaleX?: number
  sourceScaleY?: number
}

/**
 * Runtime-объект crop frame с опциональной сеткой третей.
 */
export class CropFrame extends Rect {
  /**
   * Scale источника по X на момент старта crop mode.
   */
  public readonly cropSourceScaleX: number

  /**
   * Scale источника по Y на момент старта crop mode.
   */
  public readonly cropSourceScaleY: number

  /**
   * Показывать ли сетку внутри crop frame.
   */
  private readonly _showGrid: boolean

  /**
   * @param options - параметры Fabric Rect и флаг сетки.
   */
  constructor(options: CropFrameOptions) {
    const {
      showGrid,
      sourceScaleX = 1,
      sourceScaleY = 1,
      ...rectOptions
    } = options

    super(rectOptions)
    this._showGrid = showGrid
    this.cropSourceScaleX = sourceScaleX
    this.cropSourceScaleY = sourceScaleY
  }

  /**
   * Рисует crop frame и внутреннюю сетку, если она включена.
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
   * Возвращает размер crop frame, который совпадает с результатом применения crop.
   */
  public getObjectDisplaySize(): CropSize {
    return getCropFrameSourceSize({ frame: this })
  }
}

/**
 * Создаёт Fabric frame, которым пользователь управляет в crop mode.
 */
export function createCropFrame({
  source,
  cropSize,
  showGrid
}: {
  source: FabricObject
  cropSize: CropSize
  showGrid: boolean
}): Rect {
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
    sourceScaleX,
    sourceScaleY
  })

  frame.setControlsVisibility({ mtr: false })
  applyCropResizeControls({ target: frame })

  return frame
}

/**
 * Рисует сетку третей внутри crop frame.
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
 * Рисует вертикальную линию сетки.
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
 * Рисует горизонтальную линию сетки.
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
