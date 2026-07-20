/* eslint-disable no-use-before-define -- Public CropDimmingOverlay держим выше private drawing helpers. */
import {
  Point,
  Rect,
  util,
  type Canvas,
  type FabricObject
} from 'fabric'

/** Цвет затемнения вне активной crop-области. */
const CROP_DIMMING_OVERLAY_FILL = '#000000'

/** Непрозрачность затемнения вне активной crop-области. */
const CROP_DIMMING_OVERLAY_OPACITY = 0.25

/** Минимальный размер Fabric-объекта, который служит viewport-якорем overlay. */
const CROP_DIMMING_OVERLAY_ANCHOR_SIZE = 1

/** Runtime-параметры transient overlay crop-сессии. */
interface CropDimmingOverlayOptions {
  canvas: Canvas
  frame: Rect
  previousOverlayImage: FabricObject | undefined
  previousOverlayVpt: boolean
  previousControlsAboveOverlay: boolean
}

/**
 * Transient Fabric overlay, который затемняет viewport вне live crop frame.
 * Объект не добавляется в canvas object stack и не участвует в history.
 */
export class CropDimmingOverlay extends Rect {
  /** Canvas, в viewport-плоскости которого строится затемнение. */
  private readonly _canvas: Canvas

  /** Live crop frame, который образует прозрачное отверстие в overlay. */
  private readonly _frame: Rect

  /** Overlay canvas, который был установлен до входа в crop mode. */
  public readonly previousOverlayImage: FabricObject | undefined

  /** Предыдущее поведение overlay относительно viewport transform. */
  public readonly previousOverlayVpt: boolean

  /** Предыдущий порядок отрисовки controls относительно overlay. */
  public readonly previousControlsAboveOverlay: boolean

  /**
   * @param options - runtime-ссылки crop-сессии и состояние canvas до установки overlay.
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

  /** Рисует чёрную маску с прозрачным отверстием по актуальной geometry crop frame. */
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

/** Устанавливает transient dimming overlay для активной crop-сессии. */
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

/** Восстанавливает canvas overlay state, который существовал до crop-сессии. */
export function restoreCropDimmingOverlay({ canvas }: { canvas: Canvas }): void {
  const overlay = canvas.overlayImage
  if (!(overlay instanceof CropDimmingOverlay)) return

  canvas.overlayImage = overlay.previousOverlayImage
  canvas.overlayVpt = overlay.previousOverlayVpt
  canvas.controlsAboveOverlay = overlay.previousControlsAboveOverlay
}

/** Возвращает углы canvas в локальной системе координат dimming overlay. */
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

/** Возвращает углы crop frame в локальной системе координат dimming overlay. */
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

/** Возвращает четыре угла Rect в его локальной системе координат. */
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

/** Добавляет замкнутый контур в текущий Canvas 2D path. */
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
