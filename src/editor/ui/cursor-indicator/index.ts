import {
  CURSOR_INDICATOR_OFFSET_X,
  CURSOR_INDICATOR_OFFSET_Y,
  CURSOR_INDICATOR_STYLES
} from './constants'

/**
 * DOM-событие указателя, из которого можно получить экранную позицию.
 */
type CursorIndicatorPointerEvent = MouseEvent | TouchEvent

/**
 * Координаты указателя в viewport-координатах браузера.
 */
type CursorIndicatorClientPoint = {
  clientX: number
  clientY: number
}

/**
 * Параметры создания DOM-индикатора рядом с указателем.
 */
type CursorIndicatorConstructorParams = {
  className: string
  parent: HTMLElement
}

/**
 * Параметры показа индикатора рядом с текущим указателем.
 */
type CursorIndicatorShowParams = {
  event: CursorIndicatorPointerEvent
  text: string
}

/**
 * Позиция индикатора в координатах родительского элемента.
 */
type CursorIndicatorPosition = {
  left: number
  top: number
}

/**
 * DOM-индикатор, который показывает короткое значение рядом с курсором внутри canvas wrapper.
 */
export default class CursorIndicator {
  /**
   * HTML-элемент индикатора.
   */
  public readonly el: HTMLDivElement

  /**
   * Родительский элемент, внутри которого позиционируется индикатор.
   */
  private readonly parent: HTMLElement

  /**
   * Создаёт индикатор и добавляет его в родительский DOM-элемент.
   */
  constructor({ parent, className }: CursorIndicatorConstructorParams) {
    this.parent = parent
    this.el = this._createElement({ className })
    this.parent.appendChild(this.el)
  }

  /**
   * Показывает индикатор рядом с указателем и обновляет его текст.
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
   * Скрывает индикатор и очищает его текст.
   */
  public hide(): void {
    this.el.style.display = 'none'
    this.el.textContent = ''
  }

  /**
   * Удаляет DOM-элемент индикатора.
   */
  public destroy(): void {
    this.hide()

    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el)
    }
  }

  /**
   * Создаёт DOM-элемент индикатора с базовыми стилями.
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
   * Рассчитывает позицию индикатора в координатах родительского элемента.
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
   * Применяет рассчитанную позицию к DOM-элементу индикатора.
   */
  private _applyPosition({ position }: { position: CursorIndicatorPosition }): void {
    this.el.style.left = `${position.left}px`
    this.el.style.top = `${position.top}px`
  }

  /**
   * Возвращает экранные координаты мыши или первого touch-события.
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
