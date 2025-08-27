import {
  BasicTransformEvent,
  Canvas,
  CanvasOptions,
  FabricObject,
  ModifiedEvent,
  TPointerEvent,
  TPointerEventInfo
} from 'fabric'
import { ImageEditor } from '../..'
import defaultConfig from './default-config'

export type ToolbarConfig = {
  style?: Record<string, string | number>,
  btnStyle?: Record<string, string | number>,
  btnHover?: Record<string, string | number>,
  icons?: Record<string, Base64URLString>,
  handlers?: Record<string, (editor: ImageEditor) => void>,
  lockedActions?: Array<{ name: string, handle: string }>,
  actions?: Array<{ name: string, handle: string }>,
  offsetTop?: number
}

export default class ToolbarManager {
  /**
   * Ссылка на редактор, содержащий canvas.
   */
  public editor: ImageEditor

  /**
   * Канвас редактора.
   */
  public canvas: Canvas

  /**
   * Настройки редактора.
   */
  public options: CanvasOptions

  /**
   * Конфигурация панели инструментов
   */
  public config!: ToolbarConfig

  /**
   * Текущий объект, на котором выполняются действия панели инструментов
   */
  public currentTarget: FabricObject | null = null

  /**
   * Флаг, указывающий на то, что текущий объект в данный момент заблокирован
   * и не может быть изменён.
   */
  public currentLocked: boolean = false

  /**
   * Флаг, указывающий на то, что в данный момент выполняется трансформация текущего объекта и панель инструментов должна быть скрыта.
   */
  public isTransforming: boolean = false

  /**
   * Обработчик события нажатия мыши.
   */
  private _onMouseDown!: (opt: TPointerEventInfo<TPointerEvent>) => void

  /**
   * Обработчик события перемещения объекта.
   */
  private _onObjectMoving!: (opt: BasicTransformEvent<TPointerEvent>) => void

  /**
   * Обработчик события изменения размера объекта.
   */
  private _onObjectScaling!: (opt: BasicTransformEvent<TPointerEvent>) => void

  /**
   * Обработчик события вращения объекта.
   */
  private _onObjectRotating!: (opt: BasicTransformEvent<TPointerEvent>) => void

  /**
   * Обработчик события изменения выделения объекта.
   */
  private _onMouseUp!: (opt: TPointerEventInfo<TPointerEvent>) => void

  /**
   * Обработчик события изменения выделенного объекта.
   * Вызывается после завершения трансформации объекта.
   */
  private _onObjectModified!: (opt: ModifiedEvent) => void

  /**
   * Обработчик события изменения выделения объектов.
   * Вызывается при создании, обновлении или изменении выделения.
   */
  private _onSelectionChange!: () => void

  /**
   * Обработчик события очистки выделения.
   * Вызывается при снятии выделения с объектов.
   * Скрывает панель инструментов.
   */
  private _onSelectionClear!: () => void

  /**
   * Обработчик события наведения мыши на кнопку панели инструментов.
   * Применяет стиль наведения к кнопке.
   */
  private _onBtnOver!: (e: MouseEvent) => void

  /**
   * Обработчик события ухода мыши с кнопки панели инструментов.
   * Применяет стиль кнопки по умолчанию.
   */
  private _onBtnOut!: (e: MouseEvent) => void

  /**
   * HTML элемент панели инструментов.
   * Создаётся при инициализации менеджера инструментов.
   * Содержит кнопки для выполнения действий над выделенным объектом.
   */
  public el!: HTMLDivElement

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.canvas = editor.canvas
    this.options = editor.options

    this._initToolbar()
  }

  private _initToolbar(): void {
    if (!this.options.showToolbar) return

    const toolbarConfig: ToolbarConfig = this.options.toolbar || {}

    this.config = {
      ...defaultConfig,
      ...toolbarConfig,

      style: {
        ...defaultConfig.style,
        ...toolbarConfig.style || {}
      },

      btnStyle: {
        ...defaultConfig.btnStyle,
        ...toolbarConfig.btnStyle || {}
      },

      icons: {
        ...defaultConfig.icons,
        ...toolbarConfig.icons || {}
      },

      handlers: {
        ...defaultConfig.handlers,
        ...toolbarConfig.handlers || {}
      }
    }

    this.currentTarget = null
    this.currentLocked = false
    this.isTransforming = false

    this._onMouseDown = this._handleMouseDown.bind(this)
    this._onObjectMoving = this._startTransform.bind(this)
    this._onObjectScaling = this._startTransform.bind(this)
    this._onObjectRotating = this._startTransform.bind(this)
    this._onMouseUp = this._endTransform.bind(this)
    this._onObjectModified = this._endTransform.bind(this)
    this._onSelectionChange = this._updateToolbar.bind(this)
    this._onSelectionClear = () => { this.el.style.display = 'none' }

    this._createDOM()
    this._bindEvents()
  }

  /**
   * Создаёт DOM элемент панели инструментов и добавляет его в canvas
   */
  private _createDOM(): void {
    const { style } = this.config

    this.el = document.createElement('div')

    Object.assign(this.el.style, style)
    this.canvas.wrapperEl.appendChild(this.el)

    this._onBtnOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const btn = target.closest('button')
      if (!btn) return
      Object.assign(btn.style, this.config.btnHover)
    }
    this._onBtnOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const btn = target.closest('button')
      if (!btn) return
      Object.assign(btn.style, this.config.btnStyle)
    }
    this.el.addEventListener('mouseover', this._onBtnOver)
    this.el.addEventListener('mouseout', this._onBtnOut)
  }

  /**
   * Отрисовывает кнопки панели инструментов
   * @param actions - массив действий для отрисовки
   * @param actions[].name - название действия
   * @param actions[].handle - название обработчика
   */
  private _renderButtons(actions: Array<{ name: string; handle: string }>): void {
    this.el.innerHTML = ''
    for (const action of actions) {
      const { name, handle } = action
      const { icons = {}, btnStyle, handlers = {} } = this.config

      const btn = document.createElement('button')

      btn.innerHTML = icons[handle] ? `<img src="${icons[handle]}" title="${name}" />` : name

      Object.assign(btn.style, btnStyle)

      btn.onclick = () => handlers[handle]?.(this.editor)

      // Предотвращаем всплытие событий мыши на кнопках тулбара
      // чтобы избежать конфликта с drag'n'drop объектов на канвасе
      btn.onmousedown = (e) => {
        e.stopPropagation()
        e.preventDefault()
      }

      // Отключаем drag'n'drop для кнопок
      btn.ondragstart = (e) => e.preventDefault()

      this.el.appendChild(btn)
    }
  }

  /**
   * Привязывает события к canvas
   */
  private _bindEvents(): void {
    // На время трансформации скрываем тулбар
    this.canvas.on('mouse:down', this._onMouseDown)
    this.canvas.on('object:moving', this._onObjectMoving)
    this.canvas.on('object:scaling', this._onObjectScaling)
    this.canvas.on('object:rotating', this._onObjectRotating)

    this.canvas.on('mouse:up', this._onMouseUp)
    this.canvas.on('object:modified', this._onObjectModified)

    // 2) выделение / рендер
    this.canvas.on('selection:created', this._onSelectionChange)
    this.canvas.on('selection:updated', this._onSelectionChange)
    this.canvas.on('after:render', this._onSelectionChange)

    this.canvas.on('selection:cleared', this._onSelectionClear)
  }

  /**
   * На время трансформации скрываем тулбар
   */
  private _handleMouseDown(opt: TPointerEventInfo<TPointerEvent>): void {
    if (opt.transform?.actionPerformed) {
      this._startTransform()
    }
  }

  /**
   * Начало трансформации объекта
   */
  private _startTransform(): void {
    this.isTransforming = true
    this.el.style.display = 'none'
  }

  /**
   * Завершение трансформации объекта
   */
  private _endTransform(): void {
    this.isTransforming = false
    this._updatePos()
  }

  /**
   * Обновляет панель инструментов в зависимости от выделенного объекта и его состояния
   */
  private _updateToolbar(): void {
    if (this.isTransforming) return

    const obj = this.canvas.getActiveObject()
    if (!obj) {
      this.el.style.display = 'none'
      this.currentTarget = null
      return
    }

    const locked = Boolean(obj.locked)

    // Если объект или его флаг locked изменились — перерисовываем кнопки
    if (obj !== this.currentTarget || locked !== this.currentLocked) {
      this.currentTarget = obj
      this.currentLocked = locked
      const actions = locked
        ? this.config.lockedActions
        : this.config.actions

      this._renderButtons(actions ?? [])
    }

    this._updatePos()
  }

  /**
   * Обновляет позицию панели инструментов в зависимости от положения выделенного объекта
   */
  private _updatePos(): void {
    if (this.isTransforming) return

    const obj = this.canvas.getActiveObject()

    if (!obj) {
      this.el.style.display = 'none'
      return
    }

    const { el, config, canvas } = this

    // Пересчитываем внутренние координаты объекта (для корректного getBoundingRect)
    obj.setCoords()

    // Читаем текущий зум (масштаб) и сдвиг (панорамирование) холста
    const zoom = canvas.getZoom()

    // viewportTransform — [scaleX, skewX, skewY, scaleY, translateX, translateY]
    const [, , , , panX, panY] = canvas.viewportTransform

    // Находим центр объекта в исходных canvas-координатах
    const { x: centerX } = obj.getCenterPoint()

    // Получаем axis-aligned bounding-box объекта (с учётом поворота)
    //    первый аргумент false — не включаем масштаб в результат,
    //    второй true — учитываем текущий трансформ (rotate/scale)
    const { top: objectTop, height: objectHeight } = obj.getBoundingRect()

    // Вычисляем экранную X-координату центра объекта
    const screenCenterX = centerX * zoom + panX

    // Смещаем тулбар по горизонтали так, чтобы он был строго по центру снизу
    const left = screenCenterX - el.offsetWidth / 2
    const offsetTop = config.offsetTop || 0

    // Получаем нижнюю грань объекта в пикселях с учётом угла поворота + отступ
    const top = (objectTop + objectHeight) * zoom + panY + offsetTop

    Object.assign(el.style, {
      left: `${left}px`,
      top: `${top}px`,
      display: 'flex'
    })
  }

  /**
   * Удаляет слушатели событий и DOM элемент панели инструментов
   */
  destroy(): void {
    this.el.removeEventListener('mouseover', this._onBtnOver)
    this.el.removeEventListener('mouseout', this._onBtnOut)

    this.canvas.off('mouse:down', this._onMouseDown)
    this.canvas.off('object:moving', this._onObjectMoving)
    this.canvas.off('object:scaling', this._onObjectScaling)
    this.canvas.off('object:rotating', this._onObjectRotating)

    this.canvas.off('mouse:up', this._onMouseUp)
    this.canvas.off('object:modified', this._onObjectModified)

    this.canvas.off('selection:created', this._onSelectionChange)
    this.canvas.off('selection:updated', this._onSelectionChange)
    this.canvas.off('after:render', this._onSelectionChange)

    this.canvas.off('selection:cleared', this._onSelectionClear)

    this.el.remove()
  }
}
