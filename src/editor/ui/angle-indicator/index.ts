import type {
  BasicTransformEvent,
  Canvas,
  FabricObject,
  TPointerEvent
} from 'fabric'
import type { EditorOptions } from '../../types/options'
import type { ImageEditor } from '../..'
import CursorIndicator from '../cursor-indicator'
import { ANGLE_INDICATOR_CLASS } from './constants'

/**
 * Rotation angle indicator manager
 * Displays the current angle while objects are being rotated
 */
export default class AngleIndicatorManager {
  /**
   * Reference to the editor
   */
  public editor: ImageEditor

  /**
   * Editor canvas
   */
  public canvas: Canvas

  /**
   * Editor options
   */
  public options: EditorOptions

  /**
   * Indicator HTML element
   */
  public el: HTMLDivElement

  /**
   * Current rotation angle
   */
  private currentAngle: number = 0

  /**
   * Shared DOM indicator responsible for displaying values next to the pointer.
   */
  private readonly indicator: CursorIndicator

  /**
   * Creates the manager and subscribes it to object rotation events.
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.canvas = editor.canvas
    this.options = editor.options
    this.indicator = new CursorIndicator({
      parent: this.canvas.wrapperEl,
      className: ANGLE_INDICATOR_CLASS
    })
    this.el = this.indicator.el

    this._bindEvents()
  }

  /**
   * Bind event handlers
   */
  private _bindEvents(): void {
    this.canvas.on('object:rotating', this._handleObjectRotating)
    this.canvas.on('mouse:up', this._handleMouseUp)
    this.canvas.on('object:modified', this._handleObjectModified)
    this.canvas.on('selection:cleared', this._handleSelectionCleared)
  }

  /**
   * Object rotation handler
   */
  private _handleObjectRotating = (opt: BasicTransformEvent<TPointerEvent>): void => {
    const { target } = opt.transform

    if (!this._shouldShowIndicator(target)) {
      this._hideIndicator()
      return
    }

    const angle = target.angle || 0
    this.currentAngle = AngleIndicatorManager._normalizeAngle(angle)

    // Negative values already have a minus sign; do not add a plus for positive values (as in Canva)
    this.indicator.showAtPointer({
      text: this.editor.t('ui.indicators.rotationAngle', { angle: this.currentAngle }),
      event: opt.e
    })
  }

  /**
   * Mouse button release handler
   */
  private _handleMouseUp = (): void => {
    this._hideIndicator()
  }

  /**
   * Object modification handler
   */
  private _handleObjectModified = (): void => {
    this._hideIndicator()
  }

  /**
   * Selection clearing handler
   */
  private _handleSelectionCleared = (): void => {
    this._hideIndicator()
  }

  /**
   * Check whether the indicator can be shown for this object
   */
  private _shouldShowIndicator(target: FabricObject | undefined): boolean {
    if (!this.options.showRotationAngle) return false
    if (!target) return false
    if (target.id === this.editor.montageArea.id) return false
    if (target.lockRotation || target.lockMovementX || target.lockMovementY) return false

    return true
  }

  /**
   * Hide the indicator
   */
  private _hideIndicator(): void {
    this.indicator.hide()
    this.currentAngle = 0
  }

  /**
   * Normalize the angle to the range -180° to +180° and round it
   * Positive values indicate rotation to the right (clockwise)
   * Negative values indicate rotation to the left (counterclockwise)
   */
  private static _normalizeAngle(angle: number): number {
    // Normalize to the range -180 to +180
    let normalized = angle % 360

    // If the angle is greater than 180, subtract 360 (for example, 270° becomes -90°)
    if (normalized > 180) {
      normalized -= 360
    }

    // If the angle is less than -180, add 360 (for example, -270° becomes 90°)
    if (normalized < -180) {
      normalized += 360
    }

    return Math.round(normalized)
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.canvas.off('object:rotating', this._handleObjectRotating)
    this.canvas.off('mouse:up', this._handleMouseUp)
    this.canvas.off('object:modified', this._handleObjectModified)
    this.canvas.off('selection:cleared', this._handleSelectionCleared)

    this.indicator.destroy()
  }
}
