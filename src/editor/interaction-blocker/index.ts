import { Rect } from 'fabric'
import { ImageEditor } from '../index'
import { addRectangleToCanvas } from '../utils/primitive-shapes'

export default class InteractionBlocker {
  /**
   * Ссылка на редактор, содержащий canvas.
   */
  public editor: ImageEditor

  /**
   * Флаг, указывающий, заблокирован ли редактор.
   */
  public isBlocked: boolean

  /**
   * Ссылка на маску, блокирующую взаимодействие с монтажной областью.
   */
  public overlayMask: Rect | null

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.isBlocked = false
    this.overlayMask = null
  }

  /**
   * Возвращает каноническую геометрию overlay для текущей монтажной области.
   * Overlay является derived/runtime слоем и должен совпадать с montageArea
   * в scene coordinates, не сохраняя своё независимое положение.
   */
  private _getOverlayGeometry(): Pick<
  Rect,
  'width' | 'height' | 'left' | 'top' | 'originX' | 'originY' | 'scaleX' | 'scaleY' | 'angle' | 'flipX' | 'flipY'
  > {
    const { canvasManager } = this.editor
    const montageBounds = canvasManager.getMontageAreaSceneBounds()

    return {
      width: montageBounds.width,
      height: montageBounds.height,
      left: montageBounds.center.x,
      top: montageBounds.center.y,
      originX: 'center',
      originY: 'center',
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false
    }
  }

  /**
   * Создаёт overlay для блокировки монтажной области
   */
  private _createOverlay(): void {
    const {
      historyManager,
      options: { overlayMaskColor = 'rgba(0,0,0,0.5)' }
    } = this.editor

    historyManager.suspendHistory()

    this.overlayMask = addRectangleToCanvas({
      canvas: this.editor.canvas,
      options: {
        ...this._getOverlayGeometry(),
        fill: overlayMaskColor,
        selectable: false,
        evented: true,
        hoverCursor: 'not-allowed',
        hasBorders: false,
        hasControls: false,
        excludeFromExport: true,
        visible: false,
        id: 'overlay-mask'
      },
      flags: { withoutSelection: true }
    })

    historyManager.resumeHistory()
  }

  /**
   * Гарантирует наличие overlay и синхронизирует его с текущей монтажной областью.
   * Overlay является runtime-слоем и не должен зависеть от persisted-state или порядка load-path.
   */
  public ensureOverlay(): void {
    if (!this.overlayMask) {
      this._createOverlay()
    }

    if (!this.overlayMask) return

    this.overlayMask.set(this._getOverlayGeometry())
    this.overlayMask.visible = this.isBlocked
    this.overlayMask.setCoords()
  }

  /**
   * Обновляет размеры и позицию overlay, выносит его на передний план
   */
  public refresh(): void {
    const { canvas, historyManager } = this.editor

    if (!this.overlayMask) return

    historyManager.suspendHistory()

    this.overlayMask.set(this._getOverlayGeometry())
    this.overlayMask.setCoords()
    canvas.discardActiveObject()

    this.editor.layerManager.bringToFront(this.overlayMask, { withoutSave: true })
    historyManager.resumeHistory()
  }

  /**
   * Выключает редактор:
   * - убирает все селекты, события мыши, скейл/драг–н–дроп
   * - делает все объекты не‑evented и не‑selectable
   * - делает видимым overlayMask поверх всех объектов в монтажной области
   */
  public block(): void {
    this.ensureOverlay()

    if (this.isBlocked || !this.overlayMask) return

    const { canvas, canvasManager, historyManager } = this.editor

    historyManager.suspendHistory()
    this.isBlocked = true

    // Убираем все селекты, события мыши, скейл/драг–н–дроп
    canvas.discardActiveObject()
    canvas.selection = false
    canvas.skipTargetFind = true

    // Делаем все объекты не‑evented и не‑selectable
    canvasManager.getObjects().forEach((obj) => {
      obj.evented = false
      obj.selectable = false
    })

    // блокируем сами canvas‑элементы в DOM
    canvas.upperCanvasEl.style.pointerEvents = 'none'
    canvas.lowerCanvasEl.style.pointerEvents = 'none'

    this.overlayMask.visible = true
    this.refresh()

    canvas.fire('editor:disabled')
    historyManager.resumeHistory()
  }

  /**
   * Включает редактор
   */
  public unblock(): void {
    if (!this.isBlocked || !this.overlayMask) return

    const { canvas, canvasManager, historyManager } = this.editor

    historyManager.suspendHistory()
    this.isBlocked = false

    // возвращаем интерактивность
    canvas.selection = true
    canvas.skipTargetFind = false

    // возвращаем селекты & ивенты
    canvasManager.getObjects().forEach((obj) => {
      obj.evented = true
      obj.selectable = true
    })

    // разблокируем DOM
    canvas.upperCanvasEl.style.pointerEvents = ''
    canvas.lowerCanvasEl.style.pointerEvents = ''

    this.overlayMask.visible = false
    canvas.requestRenderAll()

    canvas.fire('editor:enabled')
    historyManager.resumeHistory()
    historyManager.flushDeferredSaveAfterUnblock()
  }
}
