import type {
  BasicTransformEvent,
  Canvas,
  CanvasOptions,
  TPointerEvent,
  TPointerEventInfo
} from 'fabric'
import type { ImageEditor } from '../..'
import {
  ANGLE_INDICATOR_CLASS,
  ANGLE_INDICATOR_STYLES,
  OFFSET_X,
  OFFSET_Y
} from './constants'

/**
 * Менеджер индикатора угла поворота
 * Отображает текущий угол при вращении объектов
 */
export default class AngleIndicatorManager {
  /**
   * Ссылка на редактор
   */
  public editor: ImageEditor

  /**
   * Canvas редактора
   */
  public canvas: Canvas

  /**
   * Опции редактора
   */
  public options: CanvasOptions

  /**
   * HTML-элемент индикатора
   */
  public el!: HTMLDivElement

  /**
   * Флаг активности индикатора
   */
  private isActive: boolean = false

  /**
   * Текущий угол поворота
   */
  private currentAngle: number = 0

  /**
   * Обработчик события вращения объекта
   */
  private _onObjectRotating!: (opt: BasicTransformEvent<TPointerEvent>) => void

  /**
   * Обработчик события отпускания кнопки мыши
   */
  private _onMouseUp!: (opt: TPointerEventInfo<TPointerEvent>) => void

  /**
   * Обработчик события модификации объекта
   */
  private _onObjectModified!: () => void

  /**
   * Обработчик события снятия выделения
   */
  private _onSelectionCleared!: () => void

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.canvas = editor.canvas
    this.options = editor.options

    this._createDOM()
    this._bindEvents()
  }

  /**
   * Создание DOM-элемента индикатора
   */
  private _createDOM(): void {
    this.el = document.createElement('div')
    this.el.className = ANGLE_INDICATOR_CLASS

    // Применяем стили
    Object.entries(ANGLE_INDICATOR_STYLES).forEach(([key, value]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.el.style as any)[key] = value
    })

    // Добавляем в контейнер canvas
    this.canvas.wrapperEl.appendChild(this.el)
  }

  /**
   * Привязка обработчиков событий
   */
  private _bindEvents(): void {
    this._onObjectRotating = this._handleObjectRotating.bind(this)
    this._onMouseUp = this._handleMouseUp.bind(this)
    this._onObjectModified = this._handleObjectModified.bind(this)
    this._onSelectionCleared = this._handleSelectionCleared.bind(this)

    this.canvas.on('object:rotating', this._onObjectRotating)
    this.canvas.on('mouse:up', this._onMouseUp)
    this.canvas.on('object:modified', this._onObjectModified)
    this.canvas.on('selection:cleared', this._onSelectionCleared)
  }

  /**
   * Обработчик вращения объекта
   */
  private _handleObjectRotating(opt: BasicTransformEvent<TPointerEvent>): void {
    const { target } = opt.transform

    // Проверяем, можно ли показывать индикатор
    if (!this._shouldShowIndicator(target)) {
      this._hideIndicator()
      return
    }

    // Получаем угол
    const angle = target.angle || 0
    this.currentAngle = AngleIndicatorManager._normalizeAngle(angle)

    // Обновляем текст
    this.el.textContent = `${this.currentAngle}°`

    // Позиционируем индикатор
    this._positionIndicator(opt.e as MouseEvent)

    // Показываем индикатор
    if (!this.isActive) {
      this._showIndicator()
    }
  }

  /**
   * Обработчик отпускания кнопки мыши
   */
  private _handleMouseUp(_opt: TPointerEventInfo<TPointerEvent>): void {
    this._hideIndicator()
  }

  /**
   * Обработчик модификации объекта
   */
  private _handleObjectModified(): void {
    this._hideIndicator()
  }

  /**
   * Обработчик снятия выделения
   */
  private _handleSelectionCleared(): void {
    this._hideIndicator()
  }

  /**
   * Проверка, можно ли показывать индикатор для данного объекта
   */
  private _shouldShowIndicator(target: unknown): boolean {
    // Проверяем, включена ли опция
    if (!this.options.showRotateAngle) return false

    // Проверяем наличие объекта
    if (!target) return false

    // Не показываем для области монтажа
    if (target === this.editor.montageArea) return false

    // Не показываем для заблокированных объектов
    // @ts-expect-error - target может иметь эти свойства
    if (target.lockRotation || target.lockMovementX || target.lockMovementY) return false

    return true
  }

  /**
   * Позиционирование индикатора относительно курсора
   */
  private _positionIndicator(e: MouseEvent): void {
    const canvasRect = this.canvas.wrapperEl.getBoundingClientRect()

    // Получаем координаты мыши относительно canvas wrapper
    let x = e.clientX - canvasRect.left + OFFSET_X
    let y = e.clientY - canvasRect.top + OFFSET_Y

    // Получаем размеры индикатора
    const indicatorRect = this.el.getBoundingClientRect()
    const indicatorWidth = indicatorRect.width
    const indicatorHeight = indicatorRect.height

    // Проверяем выход за правую границу
    if (x + indicatorWidth > canvasRect.width) {
      x = e.clientX - canvasRect.left - indicatorWidth - OFFSET_X
    }

    // Проверяем выход за нижнюю границу
    if (y + indicatorHeight > canvasRect.height) {
      y = e.clientY - canvasRect.top - indicatorHeight - OFFSET_Y
    }

    // Применяем позицию
    this.el.style.left = `${x}px`
    this.el.style.top = `${y}px`
  }

  /**
   * Показать индикатор
   */
  private _showIndicator(): void {
    this.el.style.display = 'block'
    this.isActive = true
  }

  /**
   * Скрыть индикатор
   */
  private _hideIndicator(): void {
    this.el.style.display = 'none'
    this.isActive = false
    this.currentAngle = 0
  }

  /**
   * Нормализация угла в диапазон 0-360° и округление
   */
  private static _normalizeAngle(angle: number): number {
    let normalized = angle % 360
    if (normalized < 0) {
      normalized += 360
    }
    return Math.round(normalized)
  }

  /**
   * Очистка ресурсов
   */
  public destroy(): void {
    // Отписываемся от событий
    this.canvas.off('object:rotating', this._onObjectRotating)
    this.canvas.off('mouse:up', this._onMouseUp)
    this.canvas.off('object:modified', this._onObjectModified)
    this.canvas.off('selection:cleared', this._onSelectionCleared)

    // Удаляем DOM-элемент
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el)
    }

    // Очищаем ссылки
    // @ts-expect-error - очистка ссылок при уничтожении
    this.el = null
  }
}
