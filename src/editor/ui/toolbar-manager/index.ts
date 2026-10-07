import {
  BasicTransformEvent,
  Canvas,
  FabricObject,
  ModifiedEvent,
  TPointerEvent,
  TPointerEventInfo
} from 'fabric'
import type { EditorOptions } from '../../types/options'
import { ImageEditor } from '../..'
import { resolveShapeGroupFromTarget } from '../../shape-manager/domain/shape-reference'
import defaultConfig from './default-config'

type ToolbarActionHandler = (
  editor: ImageEditor,
  target?: FabricObject | null
) => void

export type ToolbarConfig = {
  style?: Record<string, string | number>,
  btnStyle?: Record<string, string | number>,
  btnHover?: Record<string, string | number>,
  icons?: Record<string, Base64URLString>,
  handlers?: Record<string, ToolbarActionHandler>,
  lockedActions?: Array<{ name: string, handle: string }>,
  actions?: Array<{ name: string, handle: string }>,
  offsetTop?: number
}

export default class ToolbarManager {
  /**
   * Reference to the editor containing the canvas.
   */
  public editor: ImageEditor

  /**
   * Editor canvas.
   */
  public canvas: Canvas

  /**
   * Editor settings.
   */
  public options: EditorOptions

  /**
   * Toolbar configuration
   */
  public config!: ToolbarConfig

  /**
   * Current object on which toolbar actions are performed
   */
  public currentTarget: FabricObject | null = null

  /**
   * Flag indicating that the current object is currently locked
   * and cannot be modified.
   */
  public currentLocked: boolean = false

  /**
   * Flag indicating that the current object is being transformed and the toolbar should be hidden.
   */
  public isTransforming: boolean = false

  /**
   * Flag for temporarily hiding the toolbar in external modes.
   */
  public isTemporarilyHidden: boolean = false

  /**
   * Mouse-down event handler.
   */
  private _onMouseDown!: (opt: TPointerEventInfo<TPointerEvent>) => void

  /**
   * Object move event handler.
   */
  private _onObjectMoving!: (opt: BasicTransformEvent<TPointerEvent>) => void

  /**
   * Object resize event handler.
   */
  private _onObjectScaling!: (opt: BasicTransformEvent<TPointerEvent>) => void

  /**
   * Object rotation event handler.
   */
  private _onObjectRotating!: (opt: BasicTransformEvent<TPointerEvent>) => void

  /**
   * Object selection change event handler.
   */
  private _onMouseUp!: (opt: TPointerEventInfo<TPointerEvent>) => void

  /**
   * Selected object modification event handler.
   * Called after the object transformation finishes.
   */
  private _onObjectModified!: (opt: ModifiedEvent) => void

  /**
   * Object selection change event handler.
   * Called when the selection is created, updated, or changed.
   */
  private _onSelectionChange!: () => void

  /**
   * Selection clearing event handler.
   * Called when objects are deselected.
   * Hides the toolbar.
   */
  private _onSelectionClear!: () => void

  /**
   * Toolbar button mouse-enter event handler.
   * Applies the hover style to the button.
   */
  private _onBtnOver!: (e: MouseEvent) => void

  /**
   * Toolbar button mouse-leave event handler.
   * Applies the default button style.
   */
  private _onBtnOut!: (e: MouseEvent) => void

  /**
   * Toolbar HTML element.
   * Created when the toolbar manager is initialized.
   * Contains buttons for performing actions on the selected object.
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
    this.isTemporarilyHidden = false

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
   * Creates the toolbar DOM element and adds it to the canvas
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
   * Renders the toolbar buttons
   * @param actions - array of actions to render
   * @param actions[].name - action name
   * @param actions[].handle - handler name
   */
  private _renderButtons(actions: Array<{ name: string; handle: string }>): void {
    this.el.innerHTML = ''
    for (const action of actions) {
      const { name, handle } = action
      const { icons = {}, btnStyle, handlers = {} } = this.config

      const btn = document.createElement('button')

      btn.innerHTML = icons[handle] ? `<img src="${icons[handle]}" title="${name}" />` : name

      Object.assign(btn.style, btnStyle)

      btn.onclick = () => handlers[handle]?.(this.editor, this.currentTarget)

      // Prevent mouse events on toolbar buttons from bubbling
      // to avoid conflicts with dragging and dropping objects on the canvas
      btn.onmousedown = (e) => {
        e.stopPropagation()
        e.preventDefault()
      }

      // Disable drag and drop for buttons
      btn.ondragstart = (e) => e.preventDefault()

      this.el.appendChild(btn)
    }
  }

  /**
   * Binds events to the canvas
   */
  private _bindEvents(): void {
    // Hide the toolbar during transformation
    this.canvas.on('mouse:down', this._onMouseDown)
    this.canvas.on('object:moving', this._onObjectMoving)
    this.canvas.on('object:scaling', this._onObjectScaling)
    this.canvas.on('object:rotating', this._onObjectRotating)

    this.canvas.on('mouse:up', this._onMouseUp)
    this.canvas.on('object:modified', this._onObjectModified)

    // 2) selection / rendering
    this.canvas.on('selection:created', this._onSelectionChange)
    this.canvas.on('selection:updated', this._onSelectionChange)
    this.canvas.on('after:render', this._onSelectionChange)

    this.canvas.on('selection:cleared', this._onSelectionClear)
  }

  /**
   * Temporarily hides the toolbar until it is shown again.
   */
  public hideTemporarily(): void {
    if (!this.options.showToolbar || !this.el) return

    this.isTemporarilyHidden = true
    this.el.style.display = 'none'
  }

  /**
   * Shows the toolbar after it has been temporarily hidden.
   */
  public showAfterTemporary(): void {
    if (!this.options.showToolbar || !this.el) return

    this.isTemporarilyHidden = false
    this._updateToolbar()
  }

  /**
   * Hide the toolbar during transformation
   */
  private _handleMouseDown(opt: TPointerEventInfo<TPointerEvent>): void {
    if (opt.transform?.actionPerformed) {
      this._startTransform()
    }
  }

  /**
   * Start of an object transformation
   */
  private _startTransform(): void {
    this.isTransforming = true
    this.el.style.display = 'none'
  }

  /**
   * End of an object transformation
   */
  private _endTransform(): void {
    this.isTransforming = false
    this._updatePos()
  }

  /**
   * Updates the toolbar based on the selected object and its state
   */
  private _updateToolbar(): void {
    if (this.isTransforming || this.isTemporarilyHidden) return

    const target = this._resolveCurrentTarget()
    if (!target) {
      this.el.style.display = 'none'
      this.currentTarget = null
      return
    }

    const locked = Boolean(target.locked)

    // Re-render the buttons if the object or its locked flag has changed
    if (target !== this.currentTarget || locked !== this.currentLocked) {
      this.currentTarget = target
      this.currentLocked = locked
      const actions = locked
        ? this.config.lockedActions
        : this.config.actions

      this._renderButtons(actions ?? [])
    }

    this._updatePos()
  }

  /**
   * Updates the toolbar position based on the selected object's position
   */
  private _updatePos(): void {
    if (this.isTransforming || this.isTemporarilyHidden) return

    const target = this._resolveCurrentTarget()

    if (!target) {
      this.el.style.display = 'none'
      return
    }

    const { el, config, canvas } = this

    // Recalculate the object's internal coordinates (for a correct getBoundingRect result)
    target.setCoords()

    // Read the current canvas zoom (scale) and translation (pan)
    const zoom = canvas.getZoom()

    // viewportTransform — [scaleX, skewX, skewY, scaleY, translateX, translateY]
    const [, , , , panX, panY] = canvas.viewportTransform

    // Find the object's center in the original canvas coordinates
    const { x: centerX } = target.getCenterPoint()

    // Get the object's axis-aligned bounding box (accounting for rotation)
    //    the first argument, false, excludes scaling from the result,
    //    the second argument, true, accounts for the current transform (rotate/scale)
    const { top: objectTop, height: objectHeight } = target.getBoundingRect()

    // Calculate the screen X coordinate of the object's center
    const screenCenterX = centerX * zoom + panX

    // Shift the toolbar horizontally so it is exactly centered beneath the object
    const left = screenCenterX - el.offsetWidth / 2
    const offsetTop = config.offsetTop || 0

    // Get the object's bottom edge in pixels, accounting for the rotation angle, plus the offset
    const top = (objectTop + objectHeight) * zoom + panY + offsetTop

    Object.assign(el.style, {
      left: `${left}px`,
      top: `${top}px`,
      display: 'flex'
    })
  }

  /**
   * Returns the object the toolbar should use both for positioning and for actions.
   * For text inside a shape group, this is the group itself rather than the internal editing-textbox.
   */
  private _resolveCurrentTarget(): FabricObject | null {
    const activeObject = this.canvas.getActiveObject()

    return resolveShapeGroupFromTarget({
      target: activeObject
    }) ?? activeObject ?? null
  }

  /**
   * Removes event listeners and the toolbar DOM element
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
