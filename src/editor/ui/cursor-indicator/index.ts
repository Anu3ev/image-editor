import {
  CURSOR_INDICATOR_OFFSET_X,
  CURSOR_INDICATOR_OFFSET_Y,
  CURSOR_INDICATOR_STYLES
} from './constants'

/**
 * DOM pointer event from which the screen position can be obtained.
 */
type CursorIndicatorPointerEvent = MouseEvent | TouchEvent

/**
 * Pointer position in browser viewport coordinates.
 */
type CursorIndicatorClientPoint = {
  clientX: number
  clientY: number
}

/**
 * Options for creating a DOM indicator next to the pointer.
 */
type CursorIndicatorConstructorParams = {
  className: string
  parent: HTMLElement
}

/**
 * Options for displaying the indicator next to the current pointer.
 */
type CursorIndicatorShowParams = {
  event: CursorIndicatorPointerEvent
  text: string
}

/**
 * Indicator position in the parent element's coordinates.
 */
type CursorIndicatorPosition = {
  left: number
  top: number
}

/**
 * DOM indicator displaying a short value next to the cursor within the canvas wrapper.
 */
export default class CursorIndicator {
  /**
   * Indicator HTML element.
   */
  public readonly el: HTMLDivElement

  /**
   * Parent element within which the indicator is positioned.
   */
  private readonly parent: HTMLElement

  /**
   * Creates the indicator and adds it to the parent DOM element.
   */
  constructor({ parent, className }: CursorIndicatorConstructorParams) {
    this.parent = parent
    this.el = this._createElement({ className })
    this.parent.appendChild(this.el)
  }

  /**
   * Displays the indicator next to the pointer and updates its text.
   */
  public showAtPointer({ text, event }: CursorIndicatorShowParams): void {
    const point = CursorIndicator._resolveClientPoint({ event })

    if (!point) {
      this.hide()
      return
    }

    this.el.textContent = text
    this.el.style.display = 'block'

    const position = this._resolvePosition({ point })
    this._applyPosition({ position })
  }

  /**
   * Hides the indicator and clears its text.
   */
  public hide(): void {
    this.el.style.display = 'none'
    this.el.textContent = ''
  }

  /**
   * Removes the indicator's DOM element.
   */
  public destroy(): void {
    this.hide()

    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el)
    }
  }

  /**
   * Creates the indicator's DOM element with base styles.
   */
  private _createElement({ className }: { className: string }): HTMLDivElement {
    const element = document.createElement('div')
    element.className = className

    Object.entries(CURSOR_INDICATOR_STYLES).forEach(([key, value]) => {
      element.style.setProperty(key, value)
    })

    return element
  }

  /**
   * Calculates the indicator position in the parent element's coordinates.
   */
  private _resolvePosition({ point }: { point: CursorIndicatorClientPoint }): CursorIndicatorPosition {
    const parentRect = this.parent.getBoundingClientRect()
    const indicatorRect = this.el.getBoundingClientRect()
    const pointerLeft = point.clientX - parentRect.left
    const pointerTop = point.clientY - parentRect.top

    let left = pointerLeft + CURSOR_INDICATOR_OFFSET_X
    let top = pointerTop + CURSOR_INDICATOR_OFFSET_Y

    if (left + indicatorRect.width > parentRect.width) {
      left = pointerLeft - indicatorRect.width - CURSOR_INDICATOR_OFFSET_X
    }

    if (top + indicatorRect.height > parentRect.height) {
      top = pointerTop - indicatorRect.height - CURSOR_INDICATOR_OFFSET_Y
    }

    const maxLeft = Math.max(0, parentRect.width - indicatorRect.width)
    const maxTop = Math.max(0, parentRect.height - indicatorRect.height)

    return {
      left: Math.min(Math.max(0, left), maxLeft),
      top: Math.min(Math.max(0, top), maxTop)
    }
  }

  /**
   * Applies the calculated position to the indicator's DOM element.
   */
  private _applyPosition({ position }: { position: CursorIndicatorPosition }): void {
    this.el.style.left = `${position.left}px`
    this.el.style.top = `${position.top}px`
  }

  /**
   * Returns the screen coordinates of the mouse or the first touch event.
   */
  private static _resolveClientPoint(
    { event }: { event: CursorIndicatorPointerEvent }
  ): CursorIndicatorClientPoint | null {
    if (
      'clientX' in event
      && typeof event.clientX === 'number'
      && 'clientY' in event
      && typeof event.clientY === 'number'
    ) {
      return {
        clientX: event.clientX,
        clientY: event.clientY
      }
    }

    const touches = 'touches' in event ? event.touches : undefined
    const changedTouches = 'changedTouches' in event ? event.changedTouches : undefined
    const touch = touches?.item(0) ?? changedTouches?.item(0)

    if (!touch) return null

    return {
      clientX: touch.clientX,
      clientY: touch.clientY
    }
  }
}
