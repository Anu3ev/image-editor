import {
  ActiveSelection,
  Canvas,
  FabricObject,
  Point,
  Textbox,
  util
} from 'fabric'
import type {
  BasicTransformEvent,
  ModifiedEvent,
  TextboxProps,
  TPointerEvent,
  TPointerEventInfo,
  Transform
} from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../index'
import type { ObjectPlacement } from '../canvas-manager'
import { TEXT_EDITING_DEBOUNCE_MS } from '../constants'
import type { EditorFontDefinition } from '../types/font'
import {
  BackgroundTextbox,
  registerBackgroundTextbox
} from './background-textbox'
import TextUpdateController from './text-update-controller'
import {
  DIMENSION_EPSILON
} from './constants'
import TextScalingController from './scaling/text-scaling'
import TextCornerScaleInteractionController from './scaling/text-corner-scale-interaction-controller'
import TextWidthResizeInteractionController from './scaling/text-width-resize-interaction-controller'
import TextActiveSelectionScalingController from './scaling/active-selection-scaling-controller'
import type { ActiveSelectionTextScaleMeasurement } from './scaling/active-selection-scale-measurer'
import type { ResolvedActiveSelectionTextScaleStep } from './scaling/active-selection-scale-plan'
import type {
  RectangularScaleGestureMode,
  RectangularScaleGestureProjection,
  RectangularScaleMultipliers
} from '../snapping-manager/scaling/rectangular-scale-gesture-projection'
import type { ScaleSnapPlan } from '../snapping-manager/scaling/scale-snapping-resolver'
import type {
  ActiveSelectionScaleDomainSource
} from '../selection-manager/scaling/active-selection-scale-domain-source'
import {
  syncLineFontDefaultsAfterTextChange
} from './line-defaults'
import {
  clampTextboxToMontage,
  getLongestLineWidth,
  getTextboxContentPlacement,
  roundTextboxDimensions
} from './geometry'
import type {
  EditorTextbox,
  TextCreationFlags,
  TextReference,
  TextStyleOptions,
  TextboxSnapshot,
  UpdateOptions
} from './types'
import {
  resolveStrokeColor,
  resolveStrokeWidth,
  toUpperCaseSafe
} from '../utils/text'

export type { TextStyleOptions } from './types'

/**
 * Base TextManager event contract for events with a text target.
 */
type TextManagerTargetEvent = {
  target?: EditorTextbox | FabricObject | null
}

/**
 * Fabric transform event extended with TextManager's target contract.
 */
type TextManagerTransformEvent = BasicTransformEvent<TPointerEvent> & TextManagerTargetEvent & {
  e?: TPointerEvent | null
  pointer?: Readonly<{ x: number; y: number }>
  scenePoint?: Readonly<{ x: number; y: number }>
  transform?: Transform | null
}

/** Fabric event with a possible active transform. */
type TextManagerPointerEvent = TPointerEventInfo<TPointerEvent> & TextManagerTargetEvent & {
  pointer?: Readonly<{ x: number; y: number }>
  scenePoint?: Readonly<{ x: number; y: number }>
  transform?: Transform | null
}

/** Final text-object modification event. */
type TextManagerModifiedEvent = ModifiedEvent<TPointerEvent> & TextManagerTargetEvent

/**
 * Text manager for the editor.
 * Manages text-object creation and updates, and synchronizes font size during transforms.
 */
export default class TextManager {
  /**
   * Reference to the editor containing the canvas.
   */
  public editor: ImageEditor

  /**
   * Reference to the Fabric Canvas.
   */
  private canvas: Canvas

  /**
   * Available fonts supplied when initializing the editor.
   */
  public fonts: EditorFontDefinition[]

  /**
   * Standalone-textbox scaling controller.
   */
  private scalingController: TextScalingController

  /** Manages scaling of a selection whose geometry is defined by standalone text objects. */
  private activeSelectionScalingController: TextActiveSelectionScalingController

  /** Standalone-text corner-scaling controller using shared snapping logic. */
  private cornerScaleInteractionController: TextCornerScaleInteractionController

  /** Standalone-text width-resize controller using shared snapping logic. */
  private widthResizeInteractionController: TextWidthResizeInteractionController

  /**
   * Standalone-textbox programmatic-update controller.
   */
  private updateController: TextUpdateController

  /**
   * Text-object placement when entering editing mode.
   */
  private editingPlacementState?: WeakMap<EditorTextbox, ObjectPlacement>

  /**
   * Flag indicating that the text is in editing mode or has recently left it.
   * Used to prevent saving state with temporary lock properties.
   */
  public isTextEditingActive: boolean

  /**
   * Initializes the manager and connects the facade to the text update/scaling controllers.
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.canvas = editor.canvas
    this.fonts = editor.options.fonts ?? []
    this.scalingController = new TextScalingController({
      t: this.editor.t,
      canvas: editor.canvas,
      canvasManager: editor.canvasManager,
      persistScaledTextbox: ({ target, style, shouldRoundDimensions }) => {
        const updated = this.updateController.updateText({
          target,
          style,
          shouldRoundDimensions
        })
        if (!updated) throw new Error(this.editor.t('text.errors.finalSizeNotSaved'))
      }
    })
    this.activeSelectionScalingController = new TextActiveSelectionScalingController({
      t: this.editor.t,
      canvas: editor.canvas,
      canvasManager: editor.canvasManager
    })
    this.cornerScaleInteractionController = new TextCornerScaleInteractionController({
      editor,
      scalingController: this.scalingController
    })
    this.widthResizeInteractionController = new TextWidthResizeInteractionController({ editor })
    this.updateController = new TextUpdateController({
      runtime: {
        canvas: this.canvas,
        canvasManager: editor.canvasManager,
        historyManager: editor.historyManager,
        resolveTextObject: (reference) => this._resolveTextObject(reference),
        normalizeTextboxAfterContentChange: (params) => this._normalizeTextboxAfterContentChange(params),
        restoreTextboxContentPlacement: (params) => this._restoreTextboxContentPlacement(params),
        syncLineStylesWithText: (params) => this.syncLineStylesWithText(params),
        getSnapshot: (textbox) => TextManager._getSnapshot(textbox)
      }
    })
    this.editingPlacementState = new WeakMap()
    this.isTextEditingActive = false

    this._bindEvents()
    registerBackgroundTextbox()
  }

  /**
   * Adds a new text object to the canvas.
   * If `left/top` are omitted, the object is visually centered in the artboard.
   * If coordinates are supplied, placement is interpreted through `left/top + originX/originY`.
   * `emitLifecycleEvents=false` disables editor-level lifecycle events
   * for internal materialization paths without changing the creation contract itself.
   * @param options — text settings
   * @param flags — behavior flags
   */
  public addText(
    {
      id = `background-textbox-${nanoid()}`,
      text = this.editor.t('text.defaults.newText'),
      autoExpand = true,
      fontFamily,
      fontSize = 48,
      bold = false,
      italic = false,
      underline = false,
      uppercase = false,
      strikethrough = false,
      align = 'left',
      color = '#000000',
      strokeColor,
      strokeWidth = 0,
      opacity = 1,
      backgroundColor,
      backgroundOpacity = 1,
      paddingTop = 0,
      paddingRight = 0,
      paddingBottom = 0,
      paddingLeft = 0,
      radiusTopLeft = 0,
      radiusTopRight = 0,
      radiusBottomRight = 0,
      radiusBottomLeft = 0,
      ...rest
    }: TextStyleOptions = {},
    {
      withoutSelection = false,
      withoutSave = false,
      withoutAdding = false,
      emitLifecycleEvents = true
    }: TextCreationFlags = {}
  ): EditorTextbox {
    const {
      canvasManager,
      historyManager
    } = this.editor
    const { canvas } = this
    historyManager.suspendHistory()

    const resolvedFontFamily = fontFamily ?? this._getDefaultFontFamily()

    const resolvedStrokeWidth = resolveStrokeWidth({ width: strokeWidth })
    const resolvedStrokeColor = resolveStrokeColor({
      strokeColor,
      width: resolvedStrokeWidth
    })
    const resolvedFontWeight: TextboxProps['fontWeight'] = bold ? 'bold' : 'normal'
    const resolvedFontStyle: TextboxProps['fontStyle'] = italic ? 'italic' : 'normal'

    const finalOptions = {
      id,
      fontFamily: resolvedFontFamily,
      fontSize,
      fontWeight: resolvedFontWeight,
      fontStyle: resolvedFontStyle,
      underline,
      uppercase,
      linethrough: strikethrough,
      textAlign: align,
      fill: color,
      stroke: resolvedStrokeColor,
      strokeWidth: resolvedStrokeWidth,
      strokeUniform: true,
      opacity,
      backgroundColor,
      backgroundOpacity,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      radiusTopLeft,
      radiusTopRight,
      radiusBottomRight,
      radiusBottomLeft,
      ...rest
    }

    const textbox = new BackgroundTextbox(text, finalOptions)
    const isAutoExpandEnabled = autoExpand !== false
    textbox.autoExpand = isAutoExpandEnabled
    const hasExplicitPlacement = rest.left !== undefined || rest.top !== undefined

    // textCaseRaw stores the original string without applying uppercase
    textbox.textCaseRaw = textbox.text ?? ''

    if (uppercase) {
      const uppercased = toUpperCaseSafe({ value: textbox.textCaseRaw })
      if (uppercased !== textbox.text) {
        textbox.set({ text: uppercased })
      }
    }

    const dimensionsRoundedOnCreate = roundTextboxDimensions({ textbox })

    if (dimensionsRoundedOnCreate) {
      textbox.dirty = true
    }

    let placement: ObjectPlacement | undefined

    if (hasExplicitPlacement) {
      placement = canvasManager.resolveObjectPlacement({
        object: textbox,
        left: rest.left,
        top: rest.top,
        originX: rest.originX,
        originY: rest.originY,
        fallbackPoint: canvasManager.getMontageAreaSceneCenter()
      })
    }

    const shouldAutoExpandOnCreate = isAutoExpandEnabled
      && TextManager._hasWrappedLinesBeyondExplicitBreaks(textbox)

    if (hasExplicitPlacement || shouldAutoExpandOnCreate) {
      this._normalizeTextboxAfterContentChange({
        textbox,
        placement,
        shouldAutoExpand: shouldAutoExpandOnCreate,
        clampToMontage: hasExplicitPlacement
      })
    }

    if (!placement) {
      canvasManager.centerObjectToMontageArea({ object: textbox })
    }

    if (!withoutAdding) {
      canvas.add(textbox)
    }

    if (!withoutSelection) {
      canvas.setActiveObject(textbox)
    }

    canvas.requestRenderAll()

    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    if (emitLifecycleEvents) {
      canvas.fire('editor:text-added', {
        textbox,
        options: {
          ...finalOptions,
          text,
          bold,
          italic,
          strikethrough,
          align,
          color,
          strokeColor: resolvedStrokeColor,
          strokeWidth: resolvedStrokeWidth
        },
        flags: {
          withoutSelection: Boolean(withoutSelection),
          withoutSave: Boolean(withoutSave),
          withoutAdding: Boolean(withoutAdding)
        }
      })
    }

    return textbox
  }

  /**
   * Updates a text object.
   * @param options — update settings
   * @param options.target — the object, its id, or the active object (if omitted)
   * @param options.style — style to apply
   * `style.left/top/originX/originY` are treated as the object's placement contract in scene coordinates.
   * @param options.withoutSave — do not save state to history
   * @param options.skipRender — do not trigger a canvas render
   * @param options.selectionRange — external selection range for applying styles
   * @param options.emitLifecycleEvents — when false, disables editor-level lifecycle events
   * for internal materialization paths without changing the update contract.
   * @param options.syncLineStylesWithText — synchronizes lineFontDefaults and runtime styles
   * with the new text during a programmatic update. Enabled by default.
   * @fires editor:before:text-updated
   * @fires editor:text-updated
   */
  public updateText({
    target,
    style = {},
    withoutSave,
    skipRender,
    selectionRange: selectionRangeOverride,
    emitLifecycleEvents = true,
    syncLineStylesWithText = true
  }: UpdateOptions = {}): EditorTextbox | null {
    return this.updateController.updateText({
      target,
      style,
      withoutSave,
      skipRender,
      selectionRange: selectionRangeOverride,
      emitLifecycleEvents,
      syncLineStylesWithText
    })
  }

  /**
   * Converts styles from Fabric's array format to object format.
   */
  // eslint-disable-next-line class-methods-use-this
  public stylesFromArray(
    styles: Parameters<typeof util.stylesFromArray>[0],
    text: Parameters<typeof util.stylesFromArray>[1]
  ): ReturnType<typeof util.stylesFromArray> {
    return util.stylesFromArray(styles, text)
  }

  /**
   * Returns the object that owns the text currently being edited.
   * For standalone text, this is the text object itself; for text inside a shape, it is the shape group.
   */
  public getActiveTextEditingOwner(): FabricObject | null {
    const activeObject = this.canvas.getActiveObject()

    if (!TextManager._isTextbox(activeObject)) return null
    if (activeObject.isEditing !== true) return null
    if (!TextManager._isShapeOwnedTextbox(activeObject)) return activeObject

    return activeObject.group ?? activeObject
  }

  /**
   * Ends active text editing before an external interrupting action.
   * Used when the next action must commit the entered text
   * as a separate history step before performing its own mutation.
   */
  public exitActiveTextEditing(): boolean {
    const activeObject = this.canvas.getActiveObject()

    if (!TextManager._isTextbox(activeObject)) return false

    if (!activeObject.isEditing) return false

    activeObject.exitEditing()
    this.canvas.requestRenderAll()

    return true
  }

  /**
   * Destroys the manager and removes listeners.
   */
  public destroy(): void {
    const { canvas } = this
    this.activeSelectionScalingController.destroy()
    this.cornerScaleInteractionController.finishGesture()
    this.widthResizeInteractionController.finishGesture()
    canvas.off('object:scaling', this._handleObjectScaling)
    canvas.off('object:resizing', this._handleObjectResizing)
    canvas.off('object:modified', this._handleObjectModified)
    canvas.off('mouse:move', this._handleCanvasMouseMove)
    canvas.off('mouse:down', this._handleMouseDown)
    canvas.off('mouse:up', this._handleScaleInteractionFinished)
    canvas.off('object:removed', this._handleObjectRemoved)
    canvas.off('selection:created', this._handleScaleInteractionFinished)
    canvas.off('selection:updated', this._handleScaleInteractionFinished)
    canvas.off('selection:cleared', this._handleScaleInteractionFinished)
    canvas.off('text:editing:exited', this._handleTextEditingExited)
    canvas.off('text:editing:entered', this._handleTextEditingEntered)
    canvas.off('text:changed', this._handleTextChanged)

    window.removeEventListener('pointercancel', this._handlePointerCancel)
    window.removeEventListener('touchcancel', this._handlePointerCancel)
    window.removeEventListener('blur', this._handleWindowBlur)
  }

  /**
   * Transfers a standalone text object's current scale into its geometry and resets the object to scale 1.
   * Dimensions are rounded by default. Rounding is explicitly disabled for exact restoration.
   */
  public commitStandaloneTextScale(
    {
      target,
      shouldDisableAutoExpandOnHorizontalChange = false,
      shouldRoundDimensions = true
    }: {
      target?: FabricObject | null
      shouldDisableAutoExpandOnHorizontalChange?: boolean
      shouldRoundDimensions?: boolean
    }
  ): boolean {
    const scaleCommitted = this.scalingController.commitStandaloneTextScale({
      target,
      shouldDisableAutoExpandOnHorizontalChange,
      shouldRoundDimensions
    })

    if (!TextManager._isTextbox(target)) return scaleCommitted
    const textbox = target as EditorTextbox
    const group = textbox.group as (FabricObject & {
      shapeComposite?: boolean
    }) | undefined
    if (group?.shapeComposite === true) return scaleCommitted

    const isLocked = Boolean(textbox.locked)

    textbox.set({
      editable: !isLocked,
      evented: true,
      lockMovementX: isLocked,
      lockMovementY: isLocked,
      selectable: true
    })
    textbox.setCoords()

    return scaleCommitted
  }

  /** Checks a selection containing supported standalone text, images, and explicitly supplied domain objects. */
  public supportsActiveSelectionScaling({
    domainTargets,
    selection
  }: {
    domainTargets?: readonly FabricObject[]
    selection: ActiveSelection
  }): boolean {
    return this.activeSelectionScalingController.supportsScaling({ domainTargets, selection })
  }

  /** Captures the original geometry of a supported selection containing text before the first change. */
  public beginActiveSelectionScaling({
    domainSource,
    projection,
    selection,
    transform
  }: {
    domainSource?: ActiveSelectionScaleDomainSource | null
    projection: RectangularScaleGestureProjection
    selection: ActiveSelection
    transform: Transform
  }): boolean {
    return this.activeSelectionScalingController.beginScaling({
      domainSource,
      projection,
      selection,
      transform
    })
  }

  /** Measures the selection's exact canonical geometry for the current multipliers. */
  public measureActiveSelectionScale({
    mode,
    multipliers,
    selection
  }: {
    mode: RectangularScaleGestureMode
    multipliers: RectangularScaleMultipliers
    selection: ActiveSelection
  }): ActiveSelectionTextScaleMeasurement {
    return this.activeSelectionScalingController.measureScale({
      mode,
      multipliers,
      selection
    })
  }

  /** Refines the snapping plan using line wrapping and the actual bounds of all children. */
  public resolveActiveSelectionScaleStep({
    mode,
    plan,
    pointerMeasurement,
    selection
  }: {
    mode: RectangularScaleGestureMode
    plan: ScaleSnapPlan
    pointerMeasurement: ActiveSelectionTextScaleMeasurement
    selection: ActiveSelection
  }): ResolvedActiveSelectionTextScaleStep {
    return this.activeSelectionScalingController.resolveScaleStep({
      mode,
      plan,
      pointerMeasurement,
      selection
    })
  }

  /** Applies one measured state to the child objects and the shared frame. */
  public applyActiveSelectionScalePreview({
    measurement,
    selection
  }: {
    measurement: ActiveSelectionTextScaleMeasurement
    selection: ActiveSelection
  }): RectangularScaleMultipliers {
    return this.activeSelectionScalingController.applyScalePreview({
      measurement,
      selection
    })
  }

  /** Confirms the applied step only after the shared validation of actual geometry. */
  public confirmActiveSelectionScalePreview({ selection }: { selection: ActiveSelection }): boolean {
    return this.activeSelectionScalingController.confirmScalePreview({ selection })
  }

  /** Checks calculated child properties and retains a snapshot until the overall commit is complete. */
  public commitActiveSelectionScaling({
    selection
  }: {
    selection: ActiveSelection
  }): boolean {
    return this.activeSelectionScalingController.commitScaling({ selection })
  }

  /** Clears measurement state for a completed or interrupted text session. */
  public clearActiveSelectionScaling({ selection }: { selection: ActiveSelection }): boolean {
    return this.activeSelectionScalingController.clearScaling({ selection })
  }

  /** Checks that the shared text session has confirmed at least one calculated step. */
  public hasConfirmedActiveSelectionScale({ selection }: { selection: ActiveSelection }): boolean {
    return this.activeSelectionScalingController.hasConfirmedScalePreview({ selection })
  }

  /** Restores the last confirmed or initial state of the current transform. */
  public restoreActiveSelectionScalePreview({ selection }: { selection: ActiveSelection }): boolean {
    return this.activeSelectionScalingController.restoreScalePreview({ selection })
  }

  /**
   * Attempts to handle standalone-text corner scaling through shared snapping logic.
   * Returns true if the previous handling path should not run.
   */
  public handleStandaloneTextCornerScaling(event: TextManagerTransformEvent): boolean {
    return this.cornerScaleInteractionController.handleObjectScaling(event)
  }

  /**
   * Returns the active text or searches by id.
   */
  private _resolveTextObject(reference: TextReference): EditorTextbox | null {
    if (reference instanceof Textbox) return reference

    const { canvas } = this

    if (!reference) {
      const activeObject = canvas.getActiveObject()
      return TextManager._isTextbox(activeObject) ? activeObject : null
    }

    if (typeof reference === 'string') {
      const object = canvas.getObjects()
        .find((item): item is EditorTextbox => TextManager._isTextbox(item) && item.id === reference)

      return object ?? null
    }

    return null
  }

  /**
   * Checks whether the object is an editor text block.
   */
  private static _isTextbox(object?: FabricObject | null): object is EditorTextbox {
    return Boolean(object) && object instanceof Textbox
  }

  /**
   * Returns true for a text node whose layout and placement are owned by a shape composition.
   * For these textboxes, TextManager must preserve text semantics
   * without applying standalone geometry/placement logic on top of ShapeManager.
   */
  private static _isShapeOwnedTextbox(object?: FabricObject | null): boolean {
    if (!TextManager._isTextbox(object)) return false

    const group = object.group as (FabricObject & {
      shapeComposite?: boolean
    }) | undefined

    return object.shapeNodeType === 'text' && group?.shapeComposite === true
  }

  /**
   * Returns true if a textbox already gained extra line breaks during creation
   * beyond explicit `\n` characters and should immediately receive an autoExpand width.
   */
  private static _hasWrappedLinesBeyondExplicitBreaks(textbox: EditorTextbox): boolean {
    const textValue = typeof textbox.text === 'string' ? textbox.text : ''
    if (!textValue.length) return false

    const explicitLineCount = textValue.split('\n').length
    const textboxWithLines = textbox as EditorTextbox & {
      textLines?: string[]
    }
    const { textLines } = textboxWithLines

    return Array.isArray(textLines) && textLines.length > explicitLineCount
  }

  /**
   * Normalizes standalone text-object geometry after layout changes.
   * With autoExpand enabled, recalculates width from the actual text width.
   * With shouldRefreshDimensions, first resets Fabric's measurement cache through initDimensions.
   * Rounding is retained by default and disabled only by shared corner scaling.
   */
  private _normalizeTextboxAfterContentChange(
    {
      textbox,
      placement,
      shouldAutoExpand,
      clampToMontage = true,
      shouldRefreshDimensions = false,
      shouldRoundDimensions = true
    }: {
      textbox: EditorTextbox
      placement?: ObjectPlacement | null
      shouldAutoExpand: boolean
      clampToMontage?: boolean
      shouldRefreshDimensions?: boolean
      shouldRoundDimensions?: boolean
    }
  ): boolean {
    let geometryAdjusted = false

    if (shouldAutoExpand) {
      geometryAdjusted = this._autoExpandTextboxWidth(textbox, {
        placement: placement ?? undefined,
        clampToMontage
      })
    }

    let dimensionsRecalculated = false
    let dimensionsRounded = false
    if (!geometryAdjusted && shouldRefreshDimensions) {
      dimensionsRecalculated = this._recalculateTextboxDimensions({ textbox })
    }

    if (!geometryAdjusted && shouldRoundDimensions) {
      dimensionsRounded = roundTextboxDimensions({ textbox })
    }

    let placementApplied = false
    if (!geometryAdjusted && placement) {
      this.editor.canvasManager.applyObjectPlacement({
        object: textbox,
        placement
      })
      placementApplied = true
    }

    if (geometryAdjusted || dimensionsRecalculated || dimensionsRounded) {
      textbox.dirty = true
    }

    if (geometryAdjusted || dimensionsRecalculated || dimensionsRounded || placementApplied) {
      textbox.setCoords()
    }

    return geometryAdjusted || dimensionsRecalculated || dimensionsRounded
  }

  /** Recalculates text dimensions and reports whether its geometry changed. */
  private _recalculateTextboxDimensions({ textbox }: { textbox: EditorTextbox }): boolean {
    const previousWidth = textbox.width ?? 0
    const previousHeight = textbox.height ?? 0

    textbox.initDimensions()

    return Math.abs((textbox.width ?? 0) - previousWidth) > DIMENSION_EPSILON
      || Math.abs((textbox.height ?? 0) - previousHeight) > DIMENSION_EPSILON
  }

  /**
   * Restores scene placement of the inner text area after updating padding.
   * This keeps the text itself in place while only its visual shell changes.
   */
  private _restoreTextboxContentPlacement(
    {
      textbox,
      contentPlacement
    }: {
      textbox: EditorTextbox
      contentPlacement: ObjectPlacement
    }
  ): boolean {
    const currentContentPlacement = getTextboxContentPlacement({
      textbox,
      originX: contentPlacement.originX,
      originY: contentPlacement.originY
    })
    const currentCenterPlacement = this.editor.canvasManager.getObjectPlacement({
      object: textbox,
      originX: 'center',
      originY: 'center'
    })
    const deltaX = contentPlacement.left - currentContentPlacement.left
    const deltaY = contentPlacement.top - currentContentPlacement.top

    if (Math.abs(deltaX) <= DIMENSION_EPSILON && Math.abs(deltaY) <= DIMENSION_EPSILON) {
      return false
    }

    const nextCenterPoint = new Point(
      currentCenterPlacement.left + deltaX,
      currentCenterPlacement.top + deltaY
    )
    const textboxWithSetXY = textbox as EditorTextbox & {
      setXY?: (point: Point, originX: 'center', originY: 'center') => void
    }

    if (typeof textboxWithSetXY.setXY === 'function') {
      textboxWithSetXY.setXY(nextCenterPoint, 'center', 'center')
    } else {
      textbox.setPositionByOrigin(nextCenterPoint, 'center', 'center')
    }
    textbox.setCoords()

    return true
  }

  /**
   * Attaches Fabric-event handlers for text operations.
   */
  private _bindEvents(): void {
    const { canvas } = this
    canvas.on('object:scaling', this._handleObjectScaling)
    canvas.on('object:resizing', this._handleObjectResizing)
    canvas.on('object:modified', this._handleObjectModified)
    canvas.on('mouse:move', this._handleCanvasMouseMove)
    canvas.on('mouse:down', this._handleMouseDown)
    canvas.on('mouse:up', this._handleScaleInteractionFinished)
    canvas.on('object:removed', this._handleObjectRemoved)
    canvas.on('selection:created', this._handleScaleInteractionFinished)
    canvas.on('selection:updated', this._handleScaleInteractionFinished)
    canvas.on('selection:cleared', this._handleScaleInteractionFinished)
    canvas.on('text:editing:entered', this._handleTextEditingEntered)
    canvas.on('text:editing:exited', this._handleTextEditingExited)
    canvas.on('text:changed', this._handleTextChanged)

    window.addEventListener('pointercancel', this._handlePointerCancel)
    window.addEventListener('touchcancel', this._handlePointerCancel)
    window.addEventListener('blur', this._handleWindowBlur)
  }

  /** Captures the original geometry for text width resizing and corner scaling. */
  private _handleMouseDown = (event: TextManagerPointerEvent): void => {
    this.cornerScaleInteractionController.beginGesture(event)
    this.widthResizeInteractionController.beginGesture(event)
  }

  /** Ends temporary text-resize state. */
  private _handleScaleInteractionFinished = (): void => {
    this.cornerScaleInteractionController.finishGesture()
    this.widthResizeInteractionController.finishGesture()
  }

  /** Ends resizing if the corresponding text was removed from the canvas. */
  private _handleObjectRemoved = (event: TextManagerTargetEvent): void => {
    const { target } = event
    if (!target) return

    this.cornerScaleInteractionController.finishGestureForTarget({ target })
    this.widthResizeInteractionController.finishGestureForTarget({ target })
  }

  /** Interrupts resizing after a pointer event is canceled. */
  private _handlePointerCancel = (event: PointerEvent | TouchEvent): void => {
    this.cornerScaleInteractionController.interruptGesture({ event })
    this.widthResizeInteractionController.interruptGesture({ event })
  }

  /** Interrupts resizing when the window loses focus. */
  private _handleWindowBlur = (): void => {
    this.cornerScaleInteractionController.interruptGesture()
    this.widthResizeInteractionController.interruptGesture()
  }

  /** Commits the scaling result and clears temporary text-resize state. */
  private _handleObjectModified = (event: TextManagerModifiedEvent): void => {
    this.widthResizeInteractionController.finishGesture()

    if (event.target instanceof ActiveSelection) {
      const selection = event.target
      const committed = this.editor.selectionManager.commitTextSelectionScale({
        selection,
        transform: event.transform
      })
      if (committed) {
        this.cornerScaleInteractionController.finishGesture()
        return
      }
    }

    this.scalingController.handleObjectModified(event)
    this.cornerScaleInteractionController.finishGesture()
  }

  /** Applies corner scaling through shared snapping logic or retains the previous handling path. */
  private _handleObjectScaling = (event: TextManagerTransformEvent): void => {
    if (this.cornerScaleInteractionController.handleObjectScaling(event)) return

    this.scalingController.handleObjectScaling(event)
  }

  /** Continues corner scaling between Fabric events or hands the gesture to the previous logic. */
  private _handleCanvasMouseMove = (event: TextManagerPointerEvent): void => {
    if (this.cornerScaleInteractionController.handleCanvasMouseMove(event)) return

    this.scalingController.handleMouseMove(event)
  }

  /**
   * Handler for entering text-editing mode.
   * For text inside shape compositions, the history action is preserved,
   * but no placement snapshot is created: ShapeManager owns that node's layout.
   */
  private _handleTextEditingEntered = (event: TextManagerTargetEvent): void => {
    this.isTextEditingActive = true
    const { target } = event
    if (!TextManager._isTextbox(target)) return
    const {
      canvasManager,
      historyManager
    } = this.editor
    historyManager.beginAction({ reason: 'text-edit' })
    target.__lineDefaultsPrevText = target.text ?? ''

    if (TextManager._isShapeOwnedTextbox(target)) return

    const placementState = this._ensureEditingPlacementState()
    placementState.set(target, canvasManager.getObjectPlacement({ object: target }))
  }

  /**
   * Responds to text changes in editing mode.
   * For standalone textboxes, also maintains geometry/placement.
   * For text inside shape compositions, handles only text semantics,
   * without interfering with the layout owned by ShapeManager.
   */
  private _handleTextChanged = (event: TextManagerTargetEvent): void => {
    const { target } = event
    if (!TextManager._isTextbox(target)) return

    const isShapeOwnedTextbox = TextManager._isShapeOwnedTextbox(target)
    const { text = '', uppercase, autoExpand } = target
    const isUppercase = Boolean(uppercase)
    const isAutoExpandEnabled = autoExpand !== false
    const normalizedRaw = text.toLocaleLowerCase()
    const placement = isShapeOwnedTextbox
      ? null
      : this.editingPlacementState?.get(target) ?? this.editor.canvasManager.getObjectPlacement({ object: target })

    if (isUppercase) {
      const uppercased = toUpperCaseSafe({ value: normalizedRaw })

      if (uppercased !== text) {
        target.set({ text: uppercased })
      }

      target.textCaseRaw = normalizedRaw
    } else {
      target.textCaseRaw = text
    }

    if (!isShapeOwnedTextbox && autoExpand === undefined) {
      target.autoExpand = true
    }

    if (isShapeOwnedTextbox) {
      this.syncLineStylesWithText({ textbox: target })
      target.preserveExactTextGeometry = false
      return
    }

    // An empty line must receive its line defaults before layout measurement,
    // otherwise Fabric measures it using the object-level fontSize.
    this.syncLineStylesWithText({ textbox: target })

    this._normalizeTextboxAfterContentChange({
      textbox: target,
      placement,
      shouldAutoExpand: isAutoExpandEnabled,
      shouldRefreshDimensions: true
    })
    target.preserveExactTextGeometry = false
  }

  /**
   * Synchronizes lineFontDefaults and runtime styles after a text change.
   */
  public syncLineStylesWithText({
    textbox,
    previousText,
    currentText
  }: {
    textbox: EditorTextbox
    previousText?: string
    currentText?: string
  }): void {
    const resolvedCurrentText = currentText ?? textbox.text ?? ''
    const resolvedPreviousText = previousText ?? textbox.__lineDefaultsPrevText ?? resolvedCurrentText

    const syncResult = syncLineFontDefaultsAfterTextChange({
      textbox,
      previousText: resolvedPreviousText,
      currentText: resolvedCurrentText
    })

    if (syncResult.lineFontDefaultsChanged) {
      textbox.lineFontDefaults = syncResult.lineFontDefaults
    }

    if (syncResult.stylesChanged) {
      textbox.styles = syncResult.styles
      textbox.dirty = true
    }

    textbox.__lineDefaultsPrevText = resolvedCurrentText
  }

  /**
   * Automatically expands the text object's width to fit its text,
   * up to the artboard width. If placement is supplied, also
   * restores the placement contract and, when needed, keeps the object
   * within the artboard.
   */
  private _autoExpandTextboxWidth(
    textbox: EditorTextbox,
    {
      placement,
      clampToMontage = true
    }: {
      placement?: ObjectPlacement
      clampToMontage?: boolean
    } = {}
  ): boolean {
    const { canvasManager, montageArea } = this.editor
    if (!montageArea) return false

    const textValue = typeof textbox.text === 'string' ? textbox.text : ''
    if (!textValue.length) return false

    const {
      left: montageLeft,
      width: montageWidth
    } = canvasManager.getMontageAreaSceneBounds()
    if (!Number.isFinite(montageWidth) || montageWidth <= 0) return false

    const scaleX = Math.abs(textbox.scaleX ?? 1) || 1
    const paddingLeft = textbox.paddingLeft ?? 0
    const paddingRight = textbox.paddingRight ?? 0
    const strokeWidth = textbox.strokeWidth ?? 0
    const maxInnerWidth = Math.max(
      1,
      (montageWidth / scaleX) - paddingLeft - paddingRight - strokeWidth
    )

    if (!Number.isFinite(maxInnerWidth) || maxInnerWidth <= 0) return false

    const explicitLineCount = textValue.split('\n').length

    let geometryChanged = false
    if (Math.abs((textbox.width ?? 0) - maxInnerWidth) > DIMENSION_EPSILON) {
      textbox.set({ width: maxInnerWidth })
      geometryChanged = true
    }

    textbox.initDimensions()
    const { textLines } = textbox as EditorTextbox & { textLines?: string[] }
    const hasWrappedLines = Array.isArray(textLines) && textLines.length > explicitLineCount

    const longestLineWidth = Math.ceil(
      getLongestLineWidth({ textbox, text: textValue })
    )
    const minWidth = Math.min(textbox.minWidth ?? 1, maxInnerWidth)
    let targetWidth = Math.min(
      maxInnerWidth,
      Math.max(longestLineWidth, minWidth)
    )

    if (hasWrappedLines) {
      targetWidth = maxInnerWidth
    }

    if (Math.abs((textbox.width ?? 0) - targetWidth) > DIMENSION_EPSILON) {
      textbox.set({ width: targetWidth })
      textbox.initDimensions()
      geometryChanged = true
    }

    const dimensionsRounded = roundTextboxDimensions({ textbox })
    if (dimensionsRounded) {
      geometryChanged = true
    }

    if (placement) {
      canvasManager.applyObjectPlacement({
        object: textbox,
        placement
      })
    }

    let positionAdjusted = false

    if (clampToMontage) {
      positionAdjusted = clampTextboxToMontage({
        textbox,
        montageLeft,
        montageRight: montageLeft + montageWidth
      })
    }

    return geometryChanged || positionAdjusted
  }

  /**
   * Handler for leaving text-editing mode.
   * For text inside shape compositions, completes the history action
   * without applying standalone geometry cleanup on top of shape layout.
   */
  private _handleTextEditingExited = (event: TextManagerTargetEvent): void => {
    const { target } = event
    if (!TextManager._isTextbox(target)) return
    const isShapeOwnedTextbox = TextManager._isShapeOwnedTextbox(target)
    this.editingPlacementState?.delete(target)
    delete target.__lineDefaultsPrevText

    // Update textCaseRaw after editing to preserve the current content
    const currentText = target.text ?? ''
    const isUppercase = Boolean(target.uppercase)

    if (isUppercase) {
      // If uppercase is enabled, try to restore the original case
      // Use the previous textCaseRaw if available; otherwise, convert to lowercase
      const previousRaw = target.textCaseRaw ?? currentText.toLocaleLowerCase()
      target.textCaseRaw = previousRaw
    } else {
      // If uppercase is disabled, save the text as is
      target.textCaseRaw = currentText
    }

    if (!isShapeOwnedTextbox) {
      const dimensionsRoundedAfterEditing = roundTextboxDimensions({ textbox: target })

      if (dimensionsRoundedAfterEditing) {
        target.preserveExactTextGeometry = false
        target.setCoords()
        target.dirty = true
        this.canvas.requestRenderAll()
      }

      // Reset lock properties after leaving editing mode
      if (!target.locked) {
        target.set({
          lockMovementX: false,
          lockMovementY: false
        })
      }
    }

    const { historyManager } = this.editor

    historyManager.endAction({ reason: 'text-edit' })
    historyManager.stageCurrentStateForPendingSave({ reason: 'text-edit' })

    // Save state after a short delay so Fabric can finish all internal operations
    historyManager.scheduleSaveState({
      delayMs: TEXT_EDITING_DEBOUNCE_MS,
      reason: 'text-edit'
    })
  }

  /**
   * Handles text-object width changes (resizing).
   * Adjusts width by subtracting padding, because Fabric sets
   * a value that includes visual padding when resizing width.
   * Also adjusts position when resizing from the left to compensate for the offset.
   * Any manual horizontal resize switches the textbox to fixed-width mode.
   */
  private _handleObjectResizing = (event: TextManagerTransformEvent): void => {
    if (this.widthResizeInteractionController.handleObjectResizing(event)) return

    const { target, transform, e } = event
    if (!TextManager._isTextbox(target)) return
    if (TextManager._isShapeOwnedTextbox(target)) return

    target.autoExpand = false

    const {
      paddingLeft = 0,
      paddingRight = 0
    } = target

    const totalPadding = paddingLeft + paddingRight

    if (totalPadding !== 0) {
      const { width: previousWidth = 0 } = target
      const anchorOriginX = transform?.originX ?? target.originX ?? 'left'
      const anchorOriginY = transform?.originY ?? target.originY ?? 'top'
      const anchorPoint = target.getPointByOrigin(anchorOriginX, anchorOriginY)

      // Fabric calculates the new width based on the pointer position.
      // Since controls are rendered with padding included (through _getTransformedDimensions),
      // the calculated width includes padding.
      // We need to preserve the "pure" text width.
      const nextWidth = Math.max(0, previousWidth - totalPadding)

      if (previousWidth !== nextWidth) {
        target.set({ width: nextWidth })

        const { width: finalWidth = 0 } = target
        if (previousWidth !== finalWidth) {
          target.setPositionByOrigin(anchorPoint, anchorOriginX, anchorOriginY)
          target.setCoords()
        }
      }
    }

    this.editor.snappingManager.applyTextResizingSnap({
      target,
      transform,
      event: e ?? null
    })
    target.preserveExactTextGeometry = false
  }

  /**
   * Returns the placement-state storage used during editing.
   */
  private _ensureEditingPlacementState(): WeakMap<EditorTextbox, ObjectPlacement> {
    if (!this.editingPlacementState) {
      this.editingPlacementState = new WeakMap()
    }

    return this.editingPlacementState
  }

  /**
   * Builds a snapshot of current text-object properties for history and events.
   */
  private static _getSnapshot(textbox: EditorTextbox): TextboxSnapshot {
    const addIfPresent = (
      {
        snapshot,
        entries
      }: {
        snapshot: TextboxSnapshot;
        entries: Record<string, unknown>
      }
    ): void => {
      Object.entries(entries).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          snapshot[key] = value
        }
      })
    }

    const {
      id,
      text,
      textCaseRaw,
      uppercase,
      autoExpand,
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      underline,
      linethrough,
      textAlign,
      fill,
      stroke,
      strokeWidth,
      opacity,
      backgroundColor,
      backgroundOpacity,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      radiusTopLeft,
      radiusTopRight,
      radiusBottomRight,
      radiusBottomLeft,
      left,
      top,
      width,
      height,
      angle,
      scaleX,
      scaleY
    } = textbox

    const snapshot: TextboxSnapshot = {
      id,
      uppercase: Boolean(uppercase),
      textAlign
    }

    addIfPresent({
      snapshot,
      entries: {
        text,
        textCaseRaw,
        autoExpand,
        fontFamily,
        fontSize,
        fontWeight,
        fontStyle,
        underline,
        linethrough,
        fill,
        stroke,
        strokeWidth,
        opacity,
        backgroundColor,
        backgroundOpacity,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        radiusTopLeft,
        radiusTopRight,
        radiusBottomRight,
        radiusBottomLeft,
        left,
        top,
        width,
        height,
        angle,
        scaleX,
        scaleY
      }
    })

    return snapshot
  }

  /**
   * Returns the first available font, or Arial by default.
   */
  private _getDefaultFontFamily(): string {
    return this.fonts[0]?.family ?? 'Arial'
  }
}
