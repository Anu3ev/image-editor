import { ActiveSelection, type Canvas } from 'fabric'
import {
  DEFAULT_SHAPE_PRESET_KEY,
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN
} from '../domain/shape-presets'
import {
  applyShapeStyle
} from '../creation/shape-node-factory'
import { normalizeShapeRounding } from '../domain/shape-rounding'
import {
  getShapeNodes
} from '../domain/shape-nodes'
import {
  prepareRehydratedShapeLayout
} from './shape-rehydration'
import {
  SHAPE_TEXT_LAYOUT_RESET_STATE,
  ShapeUpdatePipeline
} from './shape-update-pipeline'
import {
  applyShapeGroupMetadata,
  ShapeGroupObject
} from '../domain/shape-group'
import { resolveShapeGroup } from '../domain/shape-reference'
import { detachShapeGroupAutoLayout } from '../domain/shape-runtime'
import type CanvasManager from '../../canvas-manager'
import type { ObjectPlacement } from '../../canvas-manager'
import type HistoryManager from '../../history-manager'
import type ShapeLayoutController from '../layout/shape-layout-controller'
import type ShapeLifecycleController from '../lifecycle/shape-lifecycle-controller'
import type ShapeTextNodeController from '../text/shape-text-node-controller'
import type {
  ShapeGroup,
  ShapeHorizontalAlign,
  ShapeNode,
  ShapeReference,
  ShapeStrokeOptions,
  ShapeTextAlignOptions,
  ShapeTextNode,
  ShapeTextStyleOptions,
  ShapeUpdateLifecycleContext,
  ShapeUpdateOptions,
  ShapeVerticalAlign
} from '../types'
import type {
  PreparedShapeUpdate
} from './shape-update-pipeline'
import { isCurrentTransformAffectedByRemoval } from '../../utils/current-transform'

/**
 * Concrete dependencies of commands that modify a shape group.
 */
type ShapeMutationDependencies = {
  canvas: Canvas
  canvasManager: CanvasManager
  historyManager: HistoryManager
  lifecycleController: ShapeLifecycleController
  layoutController: ShapeLayoutController
  textNodeController: ShapeTextNodeController
  editingPlacements: WeakMap<ShapeGroup, ObjectPlacement>
}

/**
 * A single programmatic mutation with a shared shape lifecycle and history boundary.
 */
type ShapeLifecycleMutation = {
  lifecycle: ShapeUpdateLifecycleContext
  withoutSave?: boolean
  mutate: () => void
}

/**
 * Resolved group and its required visual node for mutation commands.
 */
type ShapeMutationTarget = {
  group: ShapeGroup
  shape: ShapeNode
  text: ShapeTextNode | null
}

/**
 * Owns shape-group mutation commands and the order of update preparation/application.
 */
export default class ShapeMutationController {
  /**
   * Explicit dependencies of the mutation and history lifecycle.
   */
  private readonly dependencies: ShapeMutationDependencies

  /**
   * The update pipeline is separate so the controller does not mix calculations with mutation application.
   */
  private readonly updatePipeline: ShapeUpdatePipeline

  /**
   * Initializes the mutation controller with concrete domain dependencies.
   */
  constructor({ dependencies }: { dependencies: ShapeMutationDependencies }) {
    this.dependencies = dependencies
    this.updatePipeline = new ShapeUpdatePipeline({
      dependencies: {
        canvas: dependencies.canvas,
        canvasManager: dependencies.canvasManager,
        lifecycleController: dependencies.lifecycleController,
        layoutController: dependencies.layoutController,
        textNodeController: dependencies.textNodeController
      }
    })
  }

  /**
   * Updates a shape group using a unified sequence for preparing and applying changes.
   */
  public async update({
    target,
    presetKey,
    options = {}
  }: {
    target?: ShapeReference
    presetKey?: string
    options?: ShapeUpdateOptions
  } = {}): Promise<ShapeGroup | null> {
    const preparedUpdate = await this.updatePipeline.prepare({
      target,
      presetKey,
      options
    })

    if (!preparedUpdate) return null

    const { group } = preparedUpdate.current
    const wasOnCanvas = this._isOnCanvas({ group })

    if (!wasOnCanvas) {
      this._applyPreparedUpdate({ preparedUpdate })
      this.dependencies.lifecycleController.fireBefore({ lifecycle: preparedUpdate.lifecycle })
      this.dependencies.lifecycleController.fireUpdated({ lifecycle: preparedUpdate.lifecycle })

      return group
    }

    this._beginMutation()

    try {
      this._applyPreparedUpdate({ preparedUpdate })

      if (!preparedUpdate.current.text.isEditing && !preparedUpdate.withoutSelection) {
        this.dependencies.canvas.setActiveObject(group)
      }

      this.dependencies.lifecycleController.fireBefore({ lifecycle: preparedUpdate.lifecycle })
      this.dependencies.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave: preparedUpdate.withoutSave })
    }

    this.dependencies.lifecycleController.fireUpdated({ lifecycle: preparedUpdate.lifecycle })

    return group
  }

  /**
   * Removes the shape group from the canvas if the group exists and is not locked.
   */
  public remove({
    target,
    withoutSave
  }: {
    target?: ShapeReference
    withoutSave?: boolean
  } = {}): boolean {
    const group = this._resolveUnlockedGroup({ target })

    if (!group) return false

    this._beginMutation()

    try {
      const { canvas } = this.dependencies

      // Commit the transform before removing the shape, while the original selection still exists.
      if (isCurrentTransformAffectedByRemoval({ canvas, objects: [group] })) {
        canvas.endCurrentTransform()
      }

      const activeObject = canvas.getActiveObject()
      if (activeObject instanceof ActiveSelection && activeObject.getObjects().includes(group)) {
        canvas.discardActiveObject()
      }

      canvas.remove(group)
      canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    return true
  }

  /**
   * Updates the shape-node fill and emits shape lifecycle events.
   */
  public setFill({
    target,
    fill,
    withoutSave
  }: {
    target?: ShapeReference
    fill: string
    withoutSave?: boolean
  }): ShapeGroup | null {
    const current = this._resolveUnlockedShapeTarget({ target })
    if (!current) return null

    const { group, shape } = current

    const lifecycle = this.dependencies.lifecycleController.createContext({
      group,
      source: 'fill',
      target,
      withoutSave
    })

    this._commitLifecycleMutation({
      lifecycle,
      withoutSave,
      mutate: () => {
        applyShapeStyle({
          shape,
          style: { fill }
        })

        group.shapeFill = fill
        group.setCoords()
      }
    })

    return group
  }

  /**
   * Updates stroke parameters and recalculates text layout if the group contains text.
   */
  public setStroke({
    target,
    stroke,
    strokeWidth,
    dash,
    withoutSave
  }: {
    target?: ShapeReference
  } & ShapeStrokeOptions): ShapeGroup | null {
    const current = this._resolveUnlockedShapeTarget({ target })
    if (!current) return null

    const { group, shape, text } = current

    const lifecycle = this.dependencies.lifecycleController.createContext({
      group,
      source: 'stroke',
      target,
      withoutSave
    })

    this._commitLifecycleMutation({
      lifecycle,
      withoutSave,
      mutate: () => {
        this._applyStrokeAndTextLayout({
          group,
          shape,
          text,
          stroke,
          strokeWidth,
          dash
        })

        group.setCoords()
      }
    })

    return group
  }

  /**
   * Updates opacity for the shape and, by default, the text inside the group.
   */
  public setOpacity({
    target,
    opacity,
    applyToText = true,
    withoutSave
  }: {
    target?: ShapeReference
    opacity: number
    applyToText?: boolean
    withoutSave?: boolean
  }): ShapeGroup | null {
    const current = this._resolveUnlockedShapeTarget({ target })
    if (!current) return null

    const { group, shape, text } = current

    const lifecycle = this.dependencies.lifecycleController.createContext({
      group,
      source: 'opacity',
      target,
      withoutSave
    })

    this._commitLifecycleMutation({
      lifecycle,
      withoutSave,
      mutate: () => {
        applyShapeStyle({
          shape,
          style: { opacity }
        })

        if (applyToText && text) {
          text.set({ opacity })
          text.setCoords()
        }

        group.shapeOpacity = opacity
        group.set({ opacity: 1 })
        group.setCoords()
      }
    })

    return group
  }

  /**
   * Updates text style inside the shape without switching the shape-level auto-expansion mode.
   */
  public updateTextStyle({
    target,
    style = {},
    withoutSave
  }: {
    target?: ShapeReference
    style?: ShapeTextStyleOptions
    withoutSave?: boolean
  } = {}): ShapeGroup | null {
    const current = this._resolveUnlockedShapeTarget({ target })
    if (!current) return null

    const { group, shape, text } = current
    const hasStyleUpdates = Object.keys(style).length > 0

    if (!text) return null
    if (!hasStyleUpdates) return group

    const manualDimensions = this.dependencies.layoutController.resolveManualDimensions({ group })
    const placement = this.dependencies.canvasManager.getObjectPlacement({ object: group })
    const alignH = this.dependencies.layoutController.resolveShapeTextHorizontalAlign({
      group,
      textStyle: style
    })
    const lifecycle = this.dependencies.lifecycleController.createContext({
      group,
      source: 'text-style',
      target,
      withoutSave
    })

    this._commitLifecycleMutation({
      lifecycle,
      withoutSave,
      mutate: () => {
        this._applyTextStyleAndLayout({
          group,
          shape,
          text,
          placement,
          style,
          height: manualDimensions.height,
          alignH
        })
      }
    })

    return group
  }

  /**
   * Updates horizontal and vertical text alignment within the shape.
   */
  public setTextAlign({
    target,
    horizontal,
    vertical,
    withoutSave
  }: {
    target?: ShapeReference
  } & ShapeTextAlignOptions): ShapeGroup | null {
    const current = this._resolveUnlockedShapeTarget({ target })
    if (!current) return null

    const { group, shape, text } = current
    if (!text) return null

    const dimensions = this.dependencies.layoutController.resolveCurrentDimensions({ group })
    const alignH = horizontal
      ?? group.shapeAlignHorizontal
      ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const alignV = vertical
      ?? group.shapeAlignVertical
      ?? SHAPE_DEFAULT_VERTICAL_ALIGN
    const lifecycle = this.dependencies.lifecycleController.createContext({
      group,
      source: 'text-align',
      target,
      withoutSave
    })

    this._commitLifecycleMutation({
      lifecycle,
      withoutSave,
      mutate: () => {
        this._applyTextAlignAndLayout({
          group,
          shape,
          text,
          width: dimensions.width,
          height: dimensions.height,
          alignH,
          alignV
        })
      }
    })

    return group
  }

  /**
   * Normalizes rounding and delegates the change to the shared update.
   */
  public async setRounding({
    target,
    rounding,
    withoutSave
  }: {
    target?: ShapeReference
    rounding: number
    withoutSave?: boolean
  }): Promise<ShapeGroup | null> {
    const group = this._resolveUnlockedGroup({ target })

    if (!group) return null

    const normalizedRounding = normalizeShapeRounding({ rounding })

    if (group.shapeCanRound === false) return group

    return this.update({
      target: group,
      presetKey: group.shapePresetKey ?? DEFAULT_SHAPE_PRESET_KEY,
      options: {
        rounding: normalizedRounding,
        withoutSave
      }
    })
  }

  /**
   * Materializes a rehydrated shape group and recalculates auto-expansion only for changed inputs.
   */
  public commitRehydratedShapeLayout({
    target,
    textScale = 1,
    shapeTextAutoExpand
  }: {
    target?: ShapeReference
    textScale?: number
    shapeTextAutoExpand?: boolean
  }): boolean {
    const group = resolveShapeGroup({
      canvas: this.dependencies.canvas,
      target
    })

    if (!group) return false

    const { shape, text } = getShapeNodes({ group })

    if (!shape || !text) return false

    const placement = this.dependencies.canvasManager.getObjectPlacement({ object: group })
    const preparedLayout = prepareRehydratedShapeLayout({
      group,
      text,
      textScale,
      shapeTextAutoExpand
    })
    const {
      currentDimensions,
      replaceBoxDimensions,
      shouldRecalculateLayout
    } = preparedLayout

    this.dependencies.layoutController.applyCurrentLayout({
      group,
      shape,
      text,
      placement,
      width: shouldRecalculateLayout
        ? undefined
        : currentDimensions.width,
      height: currentDimensions.height,
      expandShapeHeightToFitText: shouldRecalculateLayout,
      alignH: group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN,
      alignV: group.shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN
    })

    group.shapeReplaceBoxWidth = replaceBoxDimensions.width
    group.shapeReplaceBoxHeight = replaceBoxDimensions.height

    return true
  }

  /**
   * Allows only an existing, unlocked shape group to proceed.
   */
  private _resolveUnlockedGroup({ target }: { target?: ShapeReference }): ShapeGroup | null {
    const group = resolveShapeGroup({
      canvas: this.dependencies.canvas,
      target
    })

    if (!group || group.locked) return null

    return group
  }

  /**
   * Resolves an unlocked group together with its required visual node.
   */
  private _resolveUnlockedShapeTarget({
    target
  }: {
    target?: ShapeReference
  }): ShapeMutationTarget | null {
    const group = this._resolveUnlockedGroup({ target })
    if (!group) return null

    const { shape, text } = getShapeNodes({ group })
    if (!shape) return null

    return {
      group,
      shape,
      text
    }
  }

  /**
   * Applies stroke properties to the shape node and recalculates text layout if a text node exists.
   */
  private _applyStrokeAndTextLayout({
    group,
    shape,
    text,
    stroke,
    strokeWidth,
    dash
  }: {
    group: ShapeGroup
    shape: ShapeNode
    text: ShapeTextNode | null
  } & ShapeStrokeOptions): void {
    applyShapeStyle({
      shape,
      style: {
        stroke,
        strokeWidth,
        strokeDashArray: dash
      }
    })

    if (stroke !== undefined) {
      group.shapeStroke = stroke
    }

    if (strokeWidth !== undefined) {
      group.shapeStrokeWidth = strokeWidth
    }

    if (dash !== undefined) {
      group.shapeStrokeDashArray = dash
    }

    if (!text) return

    const currentDimensions = this.dependencies.layoutController.resolveCurrentDimensions({ group })

    this.dependencies.layoutController.applyCurrentLayout({
      group,
      shape,
      text,
      width: currentDimensions.width,
      height: currentDimensions.height
    })
  }

  /**
   * Applies text style and recalculates layout without changing the shape-level auto-expansion mode.
   */
  private _applyTextStyleAndLayout({
    group,
    shape,
    text,
    placement,
    style,
    height,
    alignH
  }: {
    group: ShapeGroup
    shape: ShapeNode
    text: ShapeTextNode
    placement: ObjectPlacement
    style: ShapeTextStyleOptions
    height: number
    alignH: ShapeHorizontalAlign
  }): void {
    this.dependencies.textNodeController.applyUpdates({
      textNode: text,
      textStyle: style,
      align: alignH
    })

    this.dependencies.layoutController.applyCurrentLayout({
      group,
      shape,
      text,
      placement,
      height,
      alignH
    })
  }

  /**
   * Applies text alignment and updates layout within the group's current dimensions.
   */
  private _applyTextAlignAndLayout({
    group,
    shape,
    text,
    width,
    height,
    alignH,
    alignV
  }: {
    group: ShapeGroup
    shape: ShapeNode
    text: ShapeTextNode
    width: number
    height: number
    alignH: ShapeHorizontalAlign
    alignV: ShapeVerticalAlign
  }): void {
    this.dependencies.textNodeController.applyUpdates({
      textNode: text,
      align: alignH
    })

    this.dependencies.layoutController.applyCurrentLayout({
      group,
      shape,
      text,
      width,
      height,
      alignH,
      alignV
    })
  }

  /**
   * Applies the prepared update to the current group in canonical mutation order.
   */
  private _applyPreparedUpdate({ preparedUpdate }: { preparedUpdate: PreparedShapeUpdate }): void {
    this._applyPreparedTextState({ preparedUpdate })
    this._replacePreparedShapeNode({ preparedUpdate })
    this._applyPreparedMetadata({ preparedUpdate })
    this._applyPreparedLayout({ preparedUpdate })
    this._syncPreparedPostLayoutState({ preparedUpdate })
  }

  /**
   * Puts the current text node into its prepared state before replacing the shape node.
   */
  private _applyPreparedTextState({ preparedUpdate }: { preparedUpdate: PreparedShapeUpdate }): void {
    const {
      current,
      text
    } = preparedUpdate

    detachShapeGroupAutoLayout({ group: current.group })
    current.text.set(SHAPE_TEXT_LAYOUT_RESET_STATE)
    this.dependencies.textNodeController.applyUpdates({
      textNode: current.text,
      text: text.value,
      textStyle: text.style,
      align: text.horizontalAlign,
      syncLineStylesWithText: text.syncLineStylesWithText
    })
  }

  /**
   * Replaces the shape node inside the current group with the already materialized next shape.
   */
  private _replacePreparedShapeNode({ preparedUpdate }: { preparedUpdate: PreparedShapeUpdate }): void {
    const {
      current,
      next
    } = preparedUpdate

    const groupRef = current.group as ShapeGroupObject

    groupRef.replaceShapeNode(
      current.shapeIndex,
      current.shape,
      next.shape
    )
  }

  /**
   * Applies persisted group metadata after replacing the shape node.
   */
  private _applyPreparedMetadata({ preparedUpdate }: { preparedUpdate: PreparedShapeUpdate }): void {
    const {
      current,
      next,
      text,
      layout
    } = preparedUpdate

    applyShapeGroupMetadata({
      group: current.group,
      metadata: {
        presetKey: next.presetKey,
        presetCanRound: next.presetCanRound,
        width: layout.width,
        height: layout.height,
        manualWidth: next.manual.width,
        manualHeight: next.manual.height,
        replaceBoxWidth: next.replaceBox.width,
        replaceBoxHeight: next.replaceBox.height,
        shapeTextAutoExpand: next.shapeTextAutoExpand,
        alignH: text.horizontalAlign,
        alignV: text.verticalAlign,
        padding: next.userPadding,
        style: next.style,
        rounding: next.rounding
      }
    })
  }

  /**
   * Applies the final layout to the updated group with its new shape node.
   */
  private _applyPreparedLayout({ preparedUpdate }: { preparedUpdate: PreparedShapeUpdate }): void {
    const {
      current,
      next,
      text,
      layout,
      placement
    } = preparedUpdate

    this.dependencies.layoutController.applyCurrentLayout({
      group: current.group,
      shape: next.shape,
      text: current.text,
      placement,
      width: layout.width,
      height: layout.height,
      alignH: text.horizontalAlign,
      alignV: text.verticalAlign,
      internalShapeTextInset: layout.internalShapeTextInset,
      resolveInternalShapeTextInset: layout.resolveInternalShapeTextInset,
      preserveAspectRatio: layout.preserveAspectRatio,
      expandShapeHeightToFitText: layout.expandShapeHeightToFitText,
      changedPadding: layout.changedPadding
    })
  }

  /**
   * Synchronizes the post-layout manual base and editing placement state.
   */
  private _syncPreparedPostLayoutState({ preparedUpdate }: { preparedUpdate: PreparedShapeUpdate }): void {
    const {
      current,
      next,
      layout,
      placement
    } = preparedUpdate

    if (next.shouldFitReplacementToPreset) {
      current.group.shapeManualBaseWidth = Math.max(1, current.group.shapeBaseWidth ?? layout.width)
      current.group.shapeManualBaseHeight = Math.max(1, current.group.shapeBaseHeight ?? layout.height)
    }

    if (current.text.isEditing) {
      this.dependencies.editingPlacements.set(current.group, placement)
    }
  }

  /**
   * Performs a mutation in a single history transaction and emits the shared shape lifecycle.
   */
  private _commitLifecycleMutation({
    lifecycle,
    withoutSave,
    mutate
  }: ShapeLifecycleMutation): void {
    this._beginMutation()

    try {
      mutate()
      this.dependencies.lifecycleController.fireBefore({ lifecycle })
      this.dependencies.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    this.dependencies.lifecycleController.fireUpdated({ lifecycle })
  }

  /**
   * Begins a programmatic shape mutation with history temporarily disabled.
   */
  private _beginMutation(): void {
    this.dependencies.historyManager.suspendHistory()
  }

  /**
   * Ends the shape mutation and saves only the final canvas state.
   */
  private _endMutation({ withoutSave }: { withoutSave?: boolean }): void {
    this.dependencies.historyManager.resumeHistory()

    if (!withoutSave) {
      this.dependencies.historyManager.saveState()
    }
  }

  /**
   * Checks whether the shape group is directly on the canvas.
   */
  private _isOnCanvas({ group }: { group: ShapeGroup }): boolean {
    const objects = this.dependencies.canvas.getObjects()

    for (let index = 0; index < objects.length; index += 1) {
      if (objects[index] === group) return true
    }

    return false
  }
}
