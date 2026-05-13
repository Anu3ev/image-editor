import { Rect } from 'fabric'
import { ImageEditor } from '../index'
import { addRectangleToCanvas } from '../utils/primitive-shapes'
import {
  AiGenerationOverlay,
  registerAiGenerationOverlay
} from './ai-generation-overlay'
import type {
  InteractionBlockerBlockOptions,
  InteractionBlockerOverlay,
  InteractionBlockerOverlayBaseOptions,
  InteractionBlockerOverlayGeometry
} from './types'

export type {
  InteractionBlockerBlockOptions,
  InteractionBlockerOverlay
} from './types'

const DEFAULT_OVERLAY: InteractionBlockerOverlay = 'default'
const OVERLAY_MASK_ID = 'overlay-mask'

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

  private _overlayType: InteractionBlockerOverlay

  constructor({ editor }: { editor: ImageEditor }) {
    registerAiGenerationOverlay()

    this.editor = editor
    this.isBlocked = false
    this.overlayMask = null
    this._overlayType = DEFAULT_OVERLAY
  }

  /**
   * Возвращает каноническую геометрию overlay для текущей монтажной области.
   * Overlay является derived/runtime слоем и должен совпадать с montageArea
   * в scene coordinates, не сохраняя своё независимое положение.
   */
  private _getOverlayGeometry(): InteractionBlockerOverlayGeometry {
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

  private _getOverlayBaseOptions(): InteractionBlockerOverlayBaseOptions {
    return {
      ...this._getOverlayGeometry(),
      selectable: false,
      evented: true,
      hoverCursor: 'not-allowed',
      hasBorders: false,
      hasControls: false,
      excludeFromExport: true,
      visible: false,
      id: OVERLAY_MASK_ID
    }
  }

  private _createDefaultOverlay(): Rect {
    const {
      options: { overlayMaskColor = 'rgba(136, 136, 136, 0.5)' }
    } = this.editor

    return addRectangleToCanvas({
      canvas: this.editor.canvas,
      options: {
        ...this._getOverlayBaseOptions(),
        fill: overlayMaskColor
      },
      flags: { withoutSelection: true }
    })
  }

  private _createAiGenerationOverlay(): AiGenerationOverlay {
    const overlay = new AiGenerationOverlay(this._getOverlayBaseOptions())

    this.editor.canvas.add(overlay)
    return overlay
  }

  private _stopOverlayAnimation(): void {
    if (this.overlayMask instanceof AiGenerationOverlay) {
      this.overlayMask.stopAnimation()
    }
  }

  /**
   * Создаёт overlay для блокировки монтажной области.
   */
  private _createOverlay({ overlay }: { overlay: InteractionBlockerOverlay }): void {
    const { canvas, historyManager } = this.editor

    historyManager.suspendHistory()

    try {
      this._stopOverlayAnimation()

      if (this.overlayMask) {
        canvas.remove(this.overlayMask)
      }

      this.overlayMask = overlay === 'ai-generation'
        ? this._createAiGenerationOverlay()
        : this._createDefaultOverlay()
      this._overlayType = overlay
    } finally {
      historyManager.resumeHistory()
    }
  }

  private _startOverlayAnimation(): void {
    if (this.overlayMask instanceof AiGenerationOverlay) {
      this.overlayMask.startAnimation({ canvas: this.editor.canvas })
    }
  }

  /**
   * Гарантирует наличие overlay и синхронизирует его с текущей монтажной областью.
   * Overlay является runtime-слоем и не должен зависеть от persisted-state или порядка load-path.
   */
  public ensureOverlay({ overlay = this._overlayType }: InteractionBlockerBlockOptions = {}): void {
    if (!this.overlayMask || this._overlayType !== overlay) {
      this._createOverlay({ overlay })
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

    try {
      this.overlayMask.set(this._getOverlayGeometry())
      this.overlayMask.setCoords()
      canvas.discardActiveObject()

      this.editor.layerManager.bringToFront(this.overlayMask, { withoutSave: true })

      if (this.isBlocked) {
        this._startOverlayAnimation()
      }
    } finally {
      historyManager.resumeHistory()
    }
  }

  /**
   * Выключает редактор:
   * - убирает все селекты, события мыши, скейл/драг–н–дроп
   * - делает все объекты не‑evented и не‑selectable
   * - делает видимым overlayMask поверх всех объектов в монтажной области
   */
  public block({ overlay = DEFAULT_OVERLAY }: InteractionBlockerBlockOptions = {}): void {
    if (this.isBlocked) {
      this.ensureOverlay()
      return
    }

    this.ensureOverlay({ overlay })

    if (!this.overlayMask) return

    const { canvas, canvasManager, historyManager } = this.editor

    historyManager.suspendHistory()

    try {
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
    } finally {
      historyManager.resumeHistory()
    }
  }

  /**
   * Включает редактор
   */
  public unblock(): void {
    if (!this.isBlocked || !this.overlayMask) return

    const { canvas, canvasManager, historyManager } = this.editor

    historyManager.suspendHistory()

    try {
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

      this._stopOverlayAnimation()
      this.overlayMask.visible = false
      canvas.requestRenderAll()

      canvas.fire('editor:enabled')
    } finally {
      historyManager.resumeHistory()
    }

    historyManager.flushDeferredSaveAfterUnblock()
  }
}
