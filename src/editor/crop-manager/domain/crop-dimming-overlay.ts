/* eslint-disable no-use-before-define -- Keep the public CropDimmingOverlay above the private drawing helpers. */
import {
  Point,
  Rect,
  util,
  type Canvas,
  type FabricObject
} from 'fabric'

/** Dimming color outside the active crop area. */
const CROP_DIMMING_OVERLAY_FILL = '#000000'

/** Dimming opacity outside the active crop area. */
const CROP_DIMMING_OVERLAY_OPACITY = 0.25

/** Minimum size of the Fabric object used as the viewport anchor for the overlay. */
const CROP_DIMMING_OVERLAY_ANCHOR_SIZE = 1

/** Runtime parameters for the transient crop session overlay. */
interface CropDimmingOverlayOptions {
  canvas: Canvas
  frame: Rect
  previousOverlayImage: FabricObject | undefined
  previousOverlayVpt: boolean
  previousControlsAboveOverlay: boolean
}

/**
 * Transient Fabric overlay that dims the viewport outside the live crop frame.
 * The object is not added to the canvas object stack and does not participate in history.
 */
export class CropDimmingOverlay extends Rect {
  /** Canvas whose viewport coordinate plane is used to draw the dimming overlay. */
  private readonly _canvas: Canvas

  /** Live crop frame that defines the transparent opening in the overlay. */
  private readonly _frame: Rect

  /** Canvas overlay that was set before entering crop mode. */
  public readonly previousOverlayImage: FabricObject | undefined

  /** Previous overlay behavior with respect to the viewport transform. */
  public readonly previousOverlayVpt: boolean

  /** Previous rendering order of controls relative to the overlay. */
  public readonly previousControlsAboveOverlay: boolean

  /**
   * @param options - Crop session runtime references and canvas state before installing the overlay.
   */
  constructor({
    canvas,
    frame,
    previousOverlayImage,
    previousOverlayVpt,
    previousControlsAboveOverlay
  }: CropDimmingOverlayOptions) {
    super({
      left: 0,
      top: 0,
      width: CROP_DIMMING_OVERLAY_ANCHOR_SIZE,
      height: CROP_DIMMING_OVERLAY_ANCHOR_SIZE,
      originX: 'center',
      originY: 'center',
      fill: CROP_DIMMING_OVERLAY_FILL,
      opacity: CROP_DIMMING_OVERLAY_OPACITY,
      stroke: null,
      strokeWidth: 0,
      selectable: false,
      evented: false,
      hasBorders: false,
      hasControls: false,
      objectCaching: false,
      excludeFromExport: true
    })

    this._canvas = canvas
    this._frame = frame
    this.previousOverlayImage = previousOverlayImage
    this.previousOverlayVpt = previousOverlayVpt
    this.previousControlsAboveOverlay = previousControlsAboveOverlay
  }

  /** Draws a black mask with a transparent opening based on the current crop frame geometry. */
  public override _render(ctx: CanvasRenderingContext2D): void {
    const canvasCorners = getCanvasCornersInOverlayPlane({
      canvas: this._canvas,
      overlay: this
    })
    const frameCorners = getCropFrameCornersInOverlayPlane({
      canvas: this._canvas,
      frame: this._frame,
      overlay: this
    })

    ctx.beginPath()
    appendClosedPath({ ctx, points: canvasCorners })
    appendClosedPath({ ctx, points: frameCorners })
    ctx.fillStyle = CROP_DIMMING_OVERLAY_FILL
    ctx.fill('evenodd')
  }
}

/** Installs the transient dimming overlay for the active crop session. */
export function installCropDimmingOverlay({
  canvas,
  frame
}: {
  canvas: Canvas
  frame: Rect
}): void {
  const overlay = new CropDimmingOverlay({
    canvas,
    frame,
    previousOverlayImage: canvas.overlayImage,
    previousOverlayVpt: canvas.overlayVpt,
    previousControlsAboveOverlay: canvas.controlsAboveOverlay
  })

  canvas.overlayImage = overlay
  canvas.overlayVpt = false
  canvas.controlsAboveOverlay = true
}

/** Restores the canvas overlay state that existed before the crop session. */
export function restoreCropDimmingOverlay({ canvas }: { canvas: Canvas }): void {
  const overlay = canvas.overlayImage
  if (!(overlay instanceof CropDimmingOverlay)) return

  canvas.overlayImage = overlay.previousOverlayImage
  canvas.overlayVpt = overlay.previousOverlayVpt
  canvas.controlsAboveOverlay = overlay.previousControlsAboveOverlay
}

/** Returns the canvas corners in the local coordinate system of the dimming overlay. */
function getCanvasCornersInOverlayPlane({
  canvas,
  overlay
}: {
  canvas: Canvas
  overlay: CropDimmingOverlay
}): Point[] {
  const inverseOverlayTransform = util.invertTransform(overlay.calcTransformMatrix())
  const width = canvas.getWidth()
  const height = canvas.getHeight()

  return [
    new Point(0, 0),
    new Point(width, 0),
    new Point(width, height),
    new Point(0, height)
  ].map((point) => point.transform(inverseOverlayTransform))
}

/** Returns the crop frame corners in the local coordinate system of the dimming overlay. */
function getCropFrameCornersInOverlayPlane({
  canvas,
  frame,
  overlay
}: {
  canvas: Canvas
  frame: Rect
  overlay: CropDimmingOverlay
}): Point[] {
  const inverseOverlayTransform = util.invertTransform(overlay.calcTransformMatrix())
  const frameTransform = frame.calcTransformMatrix()

  return getRectLocalCorners({ rect: frame }).map((point) => {
    return point
      .transform(frameTransform)
      .transform(canvas.viewportTransform)
      .transform(inverseOverlayTransform)
  })
}

/** Returns the four corners of a Rect in its local coordinate system. */
function getRectLocalCorners({ rect }: { rect: Rect }): Point[] {
  const halfWidth = rect.width / 2
  const halfHeight = rect.height / 2

  return [
    new Point(-halfWidth, -halfHeight),
    new Point(halfWidth, -halfHeight),
    new Point(halfWidth, halfHeight),
    new Point(-halfWidth, halfHeight)
  ]
}

/** Adds a closed contour to the current Canvas 2D path. */
function appendClosedPath({
  ctx,
  points
}: {
  ctx: CanvasRenderingContext2D
  points: Point[]
}): void {
  const [firstPoint, ...remainingPoints] = points

  ctx.moveTo(firstPoint.x, firstPoint.y)
  remainingPoints.forEach((point) => {
    ctx.lineTo(point.x, point.y)
  })
  ctx.closePath()
}
