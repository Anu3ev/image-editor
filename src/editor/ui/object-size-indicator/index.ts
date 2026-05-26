import type {
  BasicTransformEvent,
  Canvas,
  CanvasOptions,
  FabricObject,
  TPointerEvent,
  TPointerEventInfo,
  Transform
} from 'fabric'
import type { ImageEditor } from '../..'
import CursorIndicator from '../cursor-indicator'
import { OBJECT_SIZE_INDICATOR_CLASS } from './constants'

/**
 * Текущие отображаемые размеры объекта в canvas-координатах.
 */
type ObjectDisplaySize = {
  height: number
  width: number
}

/**
 * Canvas Fabric во время drag-трансформации хранит активный transform во внутреннем поле.
 */
interface CanvasWithCurrentTransform extends Canvas {
  _currentTransform: Transform | null
}

/**
 * Менеджер индикатора размеров объекта во время скейлинга.
 */
export default class ObjectSizeIndicatorManager {
  /**
   * Ссылка на редактор.
   */
  public editor: ImageEditor

  /**
   * Canvas редактора.
   */
  public canvas: Canvas

  /**
   * Опции редактора.
   */
  public options: CanvasOptions

  /**
   * HTML-элемент индикатора.
   */
  public el: HTMLDivElement

  /**
   * Общий DOM-индикатор, который отвечает за показ рядом с указателем.
   */
  private readonly indicator: CursorIndicator

  /**
   * Создаёт менеджер и подписывает его на live-события изменения размеров.
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.canvas = editor.canvas
    this.options = editor.options
    this.indicator = new CursorIndicator({
      parent: this.canvas.wrapperEl,
      className: OBJECT_SIZE_INDICATOR_CLASS
    })
    this.el = this.indicator.el

    this._bindEvents()
  }

  /**
   * Удаляет слушатели и DOM-индикатор.
   */
  public destroy(): void {
    this._unbindEvents()
    this.indicator.destroy()
  }

  /**
   * Привязывает обработчики live-событий изменения размеров объекта.
   */
  private _bindEvents(): void {
    this.canvas.on('object:scaling', this._handleObjectSizeChanging)
    this.canvas.on('object:resizing', this._handleObjectSizeChanging)
    this.canvas.on('mouse:move', this._handleCanvasMouseMove)
    this.canvas.on('mouse:up', this._handleSizeChangeFinished)
    this.canvas.on('object:modified', this._handleSizeChangeFinished)
    this.canvas.on('selection:cleared', this._handleSizeChangeFinished)
  }

  /**
   * Снимает обработчики live-событий изменения размеров объекта.
   */
  private _unbindEvents(): void {
    this.canvas.off('object:scaling', this._handleObjectSizeChanging)
    this.canvas.off('object:resizing', this._handleObjectSizeChanging)
    this.canvas.off('mouse:move', this._handleCanvasMouseMove)
    this.canvas.off('mouse:up', this._handleSizeChangeFinished)
    this.canvas.off('object:modified', this._handleSizeChangeFinished)
    this.canvas.off('selection:cleared', this._handleSizeChangeFinished)
  }

  /**
   * Обновляет индикатор во время live-скейлинга или resize-события Fabric.
   */
  private _handleObjectSizeChanging = (event: BasicTransformEvent<TPointerEvent>): void => {
    this._showIndicatorForTarget({
      target: event.transform.target,
      event: event.e
    })
  }

  /**
   * Дополнительно обновляет индикатор после mouse:move, когда TextManager уже материализовал live-размеры.
   */
  private _handleCanvasMouseMove = (event: TPointerEventInfo<TPointerEvent>): void => {
    const transform = (this.canvas as CanvasWithCurrentTransform)._currentTransform
    if (!transform) return

    if (!ObjectSizeIndicatorManager._isSizeChangingTransform({ transform })) return

    this._showIndicatorForTarget({
      target: transform.target,
      event: event.e
    })
  }

  /**
   * Показывает индикатор для текущего target или скрывает его, если объект нельзя показывать.
   */
  private _showIndicatorForTarget({ target, event }: { target?: FabricObject, event: TPointerEvent }): void {
    if (!target) {
      this._hideIndicator()
      return
    }

    if (!this._shouldShowIndicator({ target })) {
      this._hideIndicator()
      return
    }

    const size = ObjectSizeIndicatorManager._resolveDisplaySize({ target })
    if (!size) {
      this._hideIndicator()
      return
    }

    this.indicator.showAtPointer({
      text: ObjectSizeIndicatorManager._formatSize({ size }),
      event
    })
  }

  /**
   * Скрывает индикатор после завершения изменения размеров.
   */
  private _handleSizeChangeFinished = (): void => {
    this._hideIndicator()
  }

  /**
   * Проверяет, нужно ли показывать индикатор для текущего объекта.
   */
  private _shouldShowIndicator({ target }: { target?: FabricObject }): boolean {
    if (!this.options.showObjectSizeOnScale) return false
    if (!target) return false
    if (target.id === this.editor.montageArea.id) return false
    if (target.locked) return false
    if (target.lockScalingX && target.lockScalingY) return false

    return true
  }

  /**
   * Скрывает общий DOM-индикатор.
   */
  private _hideIndicator(): void {
    this.indicator.hide()
  }

  /**
   * Возвращает текущие размеры объекта с учётом live-scale, но без screen zoom.
   */
  private static _resolveDisplaySize({ target }: { target: FabricObject }): ObjectDisplaySize | null {
    const customSize = target.getObjectDisplaySize?.()

    if (customSize) {
      return ObjectSizeIndicatorManager._normalizeDisplaySize({ size: customSize })
    }

    return ObjectSizeIndicatorManager._normalizeDisplaySize({
      size: {
        width: target.getScaledWidth(),
        height: target.getScaledHeight()
      }
    })
  }

  /**
   * Нормализует размер перед показом в индикаторе.
   */
  private static _normalizeDisplaySize({ size }: { size: ObjectDisplaySize }): ObjectDisplaySize | null {
    const width = Math.abs(size.width)
    const height = Math.abs(size.height)

    if (!Number.isFinite(width) || !Number.isFinite(height)) return null

    return {
      height,
      width
    }
  }

  /**
   * Форматирует подпись размеров объекта.
   */
  private static _formatSize({ size }: { size: ObjectDisplaySize }): string {
    const width = ObjectSizeIndicatorManager._formatDimension({ value: size.width })
    const height = ObjectSizeIndicatorManager._formatDimension({ value: size.height })

    return `ширина: ${width} высота: ${height}`
  }

  /**
   * Форматирует размер как целое число с пробелами между тысячами.
   */
  private static _formatDimension({ value }: { value: number }): string {
    const roundedValue = Math.round(value)

    return roundedValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  /**
   * Проверяет, относится ли активная Fabric-трансформация к изменению размера объекта.
   */
  private static _isSizeChangingTransform({ transform }: { transform: Transform }): boolean {
    const { action, corner } = transform

    if (typeof action === 'string' && (action.includes('scale') || action.includes('resiz'))) {
      return true
    }

    return corner === 'tl'
      || corner === 'tr'
      || corner === 'br'
      || corner === 'bl'
      || corner === 'ml'
      || corner === 'mr'
      || corner === 'mt'
      || corner === 'mb'
  }
}
