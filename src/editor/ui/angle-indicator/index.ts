import type {
  BasicTransformEvent,
  Canvas,
  CanvasOptions,
  FabricObject,
  TPointerEvent
} from 'fabric'
import type { ImageEditor } from '../..'
import CursorIndicator from '../cursor-indicator'
import { ANGLE_INDICATOR_CLASS } from './constants'

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
  public el: HTMLDivElement

  /**
   * Текущий угол поворота
   */
  private currentAngle: number = 0

  /**
   * Общий DOM-индикатор, который отвечает за показ рядом с указателем.
   */
  private readonly indicator: CursorIndicator

  /**
   * Создаёт менеджер и подписывает его на события вращения объекта.
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
   * Привязка обработчиков событий
   */
  private _bindEvents(): void {
    this.canvas.on('object:rotating', this._handleObjectRotating)
    this.canvas.on('mouse:up', this._handleMouseUp)
    this.canvas.on('object:modified', this._handleObjectModified)
    this.canvas.on('selection:cleared', this._handleSelectionCleared)
  }

  /**
   * Обработчик вращения объекта
   */
  private _handleObjectRotating = (opt: BasicTransformEvent<TPointerEvent>): void => {
    const { target } = opt.transform

    if (!this._shouldShowIndicator(target)) {
      this._hideIndicator()
      return
    }

    const angle = target.angle || 0
    this.currentAngle = AngleIndicatorManager._normalizeAngle(angle)

    // Для отрицательных знак минус уже есть, для положительных не добавляем плюс (как в Canva)
    this.indicator.showAtPointer({
      text: `${this.currentAngle}°`,
      event: opt.e
    })
  }

  /**
   * Обработчик отпускания кнопки мыши
   */
  private _handleMouseUp = (): void => {
    this._hideIndicator()
  }

  /**
   * Обработчик модификации объекта
   */
  private _handleObjectModified = (): void => {
    this._hideIndicator()
  }

  /**
   * Обработчик снятия выделения
   */
  private _handleSelectionCleared = (): void => {
    this._hideIndicator()
  }

  /**
   * Проверка, можно ли показывать индикатор для данного объекта
   */
  private _shouldShowIndicator(target: FabricObject | undefined): boolean {
    if (!this.options.showRotationAngle) return false
    if (!target) return false
    if (target.id === this.editor.montageArea.id) return false
    if (target.lockRotation || target.lockMovementX || target.lockMovementY) return false

    return true
  }

  /**
   * Скрыть индикатор
   */
  private _hideIndicator(): void {
    this.indicator.hide()
    this.currentAngle = 0
  }

  /**
   * Нормализация угла в диапазон -180° до +180° и округление
   * Положительные значения - поворот вправо (по часовой стрелке)
   * Отрицательные значения - поворот влево (против часовой стрелки)
   */
  private static _normalizeAngle(angle: number): number {
    // Нормализуем в диапазон -180 до +180
    let normalized = angle % 360

    // Если угол больше 180, вычитаем 360 (например, 270° становится -90°)
    if (normalized > 180) {
      normalized -= 360
    }

    // Если угол меньше -180, добавляем 360 (например, -270° становится 90°)
    if (normalized < -180) {
      normalized += 360
    }

    return Math.round(normalized)
  }

  /**
   * Очистка ресурсов
   */
  public destroy(): void {
    this.canvas.off('object:rotating', this._handleObjectRotating)
    this.canvas.off('mouse:up', this._handleMouseUp)
    this.canvas.off('object:modified', this._handleObjectModified)
    this.canvas.off('selection:cleared', this._handleSelectionCleared)

    this.indicator.destroy()
  }
}
