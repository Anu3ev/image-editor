import type {
  BasicTransformEvent,
  Canvas,
  FabricObject,
  TPointerEvent,
  TPointerEventInfo,
  Transform
} from 'fabric'
import type { EditorOptions } from '../../types/options'
import type { ImageEditor } from '../..'
import CursorIndicator from '../cursor-indicator'
import { OBJECT_SIZE_INDICATOR_CLASS } from './constants'

/**
 * Current displayed object dimensions in canvas coordinates.
 */
type ObjectDisplaySize = {
  height: number
  width: number
}

/** Tolerance for formatting dimensions at the .5 boundary after floating-point calculations. */
const SIZE_FORMAT_EPSILON = 0.000001

/**
 * During a drag transformation, the Fabric canvas stores the active transform in an internal field.
 */
interface CanvasWithCurrentTransform extends Canvas {
  _currentTransform: Transform | null
}

/**
 * Manager for the object size indicator shown during scaling.
 */
export default class ObjectSizeIndicatorManager {
  /**
   * Reference to the editor.
   */
  public editor: ImageEditor

  /**
   * Editor canvas.
   */
  public canvas: Canvas

  /**
   * Editor options.
   */
  public options: EditorOptions

  /**
   * Indicator HTML element.
   */
  public el: HTMLDivElement

  /**
   * Shared DOM indicator responsible for displaying values next to the pointer.
   */
  private readonly indicator: CursorIndicator

  /**
   * Creates the manager and subscribes it to live resize events.
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
   * Removes listeners and the DOM indicator.
   */
  public destroy(): void {
    this._unbindEvents()
    this.indicator.destroy()
  }

  /**
   * Binds handlers for live object resize events.
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
   * Unbinds handlers for live object resize events.
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
   * Updates the indicator during live scaling or a Fabric resize event.
   */
  private _handleObjectSizeChanging = (event: BasicTransformEvent<TPointerEvent>): void => {
    this._showIndicatorForTarget({
      target: event.transform.target,
      event: event.e
    })
  }

  /**
   * Also updates the indicator after mouse:move, once TextManager has materialized the live dimensions.
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
   * Shows the indicator for the current target or hides it if the object is not eligible for display.
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
   * Hides the indicator after resizing finishes.
   */
  private _handleSizeChangeFinished = (): void => {
    this._hideIndicator()
  }

  /**
   * Checks whether the indicator should be shown for the current object.
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
   * Hides the shared DOM indicator.
   */
  private _hideIndicator(): void {
    this.indicator.hide()
  }

  /**
   * Returns the current object dimensions including live scale but excluding screen zoom.
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
   * Normalizes a dimension before displaying it in the indicator.
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
   * Formats the object size label.
   */
  private static _formatSize({ size }: { size: ObjectDisplaySize }): string {
    const width = ObjectSizeIndicatorManager._formatDimension({ value: size.width })
    const height = ObjectSizeIndicatorManager._formatDimension({ value: size.height })

    return `ширина: ${width} высота: ${height}`
  }

  /**
   * Formats a dimension as an integer with spaces as thousands separators.
   */
  private static _formatDimension({ value }: { value: number }): string {
    const roundedValue = Math.round(value + SIZE_FORMAT_EPSILON)

    return roundedValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  /**
   * Checks whether the active Fabric transformation resizes the object.
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
