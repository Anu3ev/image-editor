import {
  ActiveSelection,
  type FabricObject,
  type Transform
} from 'fabric'
import type { ImageEditor } from '../index'
import type { ObjectPlacement } from '../canvas-manager'
import type {
  ActiveSelectionScaleDomainSource
} from '../selection-manager/scaling/active-selection-scale-domain-source'
import {
  DEFAULT_SHAPE_PRESET_KEY,
  getShapePreset
} from './domain/shape-presets'
import ShapeGroupFactory from './creation/shape-group-factory'
import ShapeScalingController from './scaling/shape-scaling-controller'
import type {
  ActiveSelectionShapeScaleCommit
} from './scaling/active-selection-scale-commit'
import type { ActiveSelectionAppliedScale } from './scaling/active-selection-scaling-controller'
import type { ShapeScalingPointerEvent } from './scaling/shape-scaling-layout'
import {
  captureShapeScalingGeometry,
  restoreShapeScalingSnapshots
} from './scaling/shape-scaling-geometry-snapshot'
import {
  isShapeCornerScaleControl,
  resolveShapeCornerScaleMode,
  type ShapeCornerScaleMode
} from './scaling/shape-controls'
import ShapeEditingController from './editing/shape-editing-controller'
import ShapeEventController from './events/shape-event-controller'
import ShapeLayoutController from './layout/shape-layout-controller'
import ShapeLifecycleController from './lifecycle/shape-lifecycle-controller'
import ShapeMutationController from './mutation/shape-mutation-controller'
import ShapeTextNodeController from './text/shape-text-node-controller'
import {
  registerShapeGroup
} from './domain/shape-group'
import {
  getShapeNodes
} from './domain/shape-nodes'
import {
  isShapeGroup,
  resolveShapeGroup
} from './domain/shape-reference'
import type {
  ShapeAddedPayload,
  ShapeAddOptions,
  ShapeGroup,
  ShapeReference,
  ShapeStrokeOptions,
  ShapeTextAlignOptions,
  ShapeTextStyleOptions,
  ShapeTextNode,
  ShapeUpdateOptions
} from './types'

/** Tolerance for checking the canonical state of shapes in a selection. */
const ACTIVE_SELECTION_SHAPE_STATE_EPSILON = 0.000000001

/** Checks shape states that still use the previous scaling path. */
function hasUnsupportedActiveSelectionShapeState({
  group
}: {
  group: ShapeGroup
}): boolean {
  const blockedState = [
    group.flipX,
    group.flipY,
    group.locked,
    group.lockScalingX,
    group.lockScalingY
  ].some(Boolean)
  if (blockedState) return true

  const values = [
    group.width,
    group.height,
    group.scaleX,
    group.scaleY,
    group.angle ?? 0,
    group.skewX ?? 0,
    group.skewY ?? 0
  ]

  return !values.every(Number.isFinite)
    || group.width <= 0
    || group.height <= 0
    || group.scaleX <= 0
    || group.scaleY <= 0
    || Math.abs(group.scaleX - 1) > ACTIVE_SELECTION_SHAPE_STATE_EPSILON
    || Math.abs(group.scaleY - 1) > ACTIVE_SELECTION_SHAPE_STATE_EPSILON
    || Math.abs(group.angle ?? 0) > ACTIVE_SELECTION_SHAPE_STATE_EPSILON
    || Math.abs(group.skewX ?? 0) > ACTIVE_SELECTION_SHAPE_STATE_EPSILON
    || Math.abs(group.skewY ?? 0) > ACTIVE_SELECTION_SHAPE_STATE_EPSILON
}

/** Returns all supported shapes among the selection's direct children. */
function resolveSupportedActiveSelectionShapeChildren({
  selection
}: {
  selection: ActiveSelection
}): ShapeGroup[] | null {
  const groups: ShapeGroup[] = []

  for (const object of selection.getObjects()) {
    if (!isShapeGroup(object)) continue
    if (object.parent) return null
    if (hasUnsupportedActiveSelectionShapeState({ group: object })) return null

    const { shape, text } = getShapeNodes({ group: object })
    if (!shape || !text) return null

    groups.push(object)
  }

  return groups.length > 0 ? groups : null
}

/** Returns shapes only for a fully supported, homogeneous selection. */
function resolveSupportedActiveSelectionShapes({
  selection
}: {
  selection: ActiveSelection
}): ShapeGroup[] | null {
  const groups = resolveSupportedActiveSelectionShapeChildren({ selection })
  const objects = selection.getObjects()

  return groups && groups.length >= 2 && groups.length === objects.length
    ? groups
    : null
}

/** Validates the layout result before returning it to the shared gesture owner. */
function isPositiveFiniteScale({
  scaleX,
  scaleY
}: ActiveSelectionAppliedScale): boolean {
  return Number.isFinite(scaleX)
    && Number.isFinite(scaleY)
    && scaleX > 0
    && scaleY > 0
}

/**
 * Manager for shapes and composite "shape + text" objects.
 */
export default class ShapeManager {
  /**
   * Reference to the editor.
   */
  public editor: ImageEditor

  /**
   * Shape-group scaling controller.
   */
  private scalingController: ShapeScalingController

  /**
   * Controller for editing text in shape groups.
   */
  private editingController: ShapeEditingController

  /**
   * Shape-group placement during text editing.
   */
  private editingPlacements: WeakMap<ShapeGroup, ObjectPlacement>

  /**
   * Lifecycle-event controller for shape compositions.
   */
  private lifecycleController: ShapeLifecycleController

  /**
   * Controller for shape-composition layout and dimension logic.
   */
  private layoutController: ShapeLayoutController

  /**
   * Public-mutation controller for shape compositions.
   */
  private mutationController: ShapeMutationController

  /**
   * Controller for canvas events and the editing/scaling lifecycle of shape compositions.
   */
  private eventController: ShapeEventController

  /**
   * TextManager adapter for text nodes inside shape groups.
   */
  private textNodeController: ShapeTextNodeController

  /**
   * Factory for fully materialized, off-canvas shape groups used by add().
   */
  private groupFactory: ShapeGroupFactory

  /**
   * Initializes the manager and connects the facade to the lifecycle/layout/mutation controllers.
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    registerShapeGroup()
    this.scalingController = new ShapeScalingController({
      t: this.editor.t,
      canvas: editor.canvas
    })
    this.editingController = new ShapeEditingController({
      canvas: editor.canvas
    })
    this.editingPlacements = new WeakMap()
    this.lifecycleController = new ShapeLifecycleController({
      canvas: editor.canvas
    })
    this.layoutController = new ShapeLayoutController({
      editor: this.editor
    })
    this.textNodeController = new ShapeTextNodeController({
      t: this.editor.t,
      resolveTextManager: () => this.editor.textManager
    })
    this.groupFactory = new ShapeGroupFactory({
      layoutController: this.layoutController,
      textNodeController: this.textNodeController
    })
    this.mutationController = new ShapeMutationController({
      dependencies: {
        canvas: this.editor.canvas,
        canvasManager: this.editor.canvasManager,
        historyManager: this.editor.historyManager,
        lifecycleController: this.lifecycleController,
        layoutController: this.layoutController,
        textNodeController: this.textNodeController,
        editingPlacements: this.editingPlacements
      }
    })
    this.eventController = new ShapeEventController({
      dependencies: {
        editor: this.editor,
        scalingController: this.scalingController,
        editingController: this.editingController,
        lifecycleController: this.lifecycleController,
        layoutController: this.layoutController,
        textNodeController: this.textNodeController,
        editingPlacements: this.editingPlacements
      }
    })

    this.eventController.bind()
  }

  /**
   * Adds a shape composition (shape + text) by presetKey.
   * By default, width/height are treated as the shape's exact final dimensions
   * and may stretch the preset beyond its original proportions.
   * `preserveAspectRatio=true` switches the add path to fitting the preset's proportions:
   * a single supplied dimension stays exact, and the other is calculated from the aspect ratio;
   * if both dimensions are supplied, the shape fits inside that box while preserving its proportions.
   * If shapeTextAutoExpand is also enabled and the text needs more space,
   * the final dimensions may exceed the supplied box.
   * With shapeTextAutoExpand=true, the manual base width remains the lower bound,
   * but the current width may exceed it if the text requires it.
   * If `left/top` are omitted, the object is visually centered in the artboard.
   * If coordinates are supplied, placement is interpreted through `left/top + originX/originY`.
   * @fires editor:shape-added
   */
  public async add({
    presetKey = DEFAULT_SHAPE_PRESET_KEY,
    options = {}
  }: {
    presetKey?: string
    options?: ShapeAddOptions
  } = {}): Promise<ShapeGroup | null> {
    const basePreset = getShapePreset({ presetKey })
    if (!basePreset) return null

    const {
      left,
      top,
      originX,
      originY,
      withoutAdding,
      withoutSelection,
      withoutSave
    } = options

    const group = await this.groupFactory.createForAdd({
      basePreset,
      options
    })
    const addedPayload: ShapeAddedPayload = {
      shape: group,
      presetKey: group.shapePresetKey ?? basePreset.key,
      options
    }

    if (left === undefined && top === undefined) {
      this.editor.canvasManager.centerObjectToMontageArea({ object: group })
    } else {
      const placement = this.editor.canvasManager.resolveObjectPlacement({
        object: group,
        left,
        top,
        originX,
        originY,
        fallbackPoint: this.editor.canvasManager.getMontageAreaSceneCenter()
      })

      this.editor.canvasManager.applyObjectPlacement({
        object: group,
        placement
      })
    }

    if (withoutAdding) {
      this.editor.canvas.fire('editor:shape-added', addedPayload)
      return group
    }

    this._beginMutation()

    try {
      this.editor.canvas.add(group)

      if (!withoutSelection) {
        this.editor.canvas.setActiveObject(group)
      }

      this.editor.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    this.editor.canvas.fire('editor:shape-added', addedPayload)

    return group
  }

  /**
   * Updates the shape preset of an existing shape group, preserving text and transforms.
   * With shapeTextAutoExpand=true, an explicit width updates the manual base width,
   * and the current width is immediately recalculated from the text relative to that base.
   * Replacing with a new presetKey does not preserve the group's current aspect ratio by default:
   * the new shape fits in the current replacement box, then receives its final dimensions
   * through the shared layout using its preset's proportions. With
   * shapeTextAutoExpand disabled, text may wrap, but the final dimensions still
   * preserve those proportions. These final dimensions become the shape's new base
   * for subsequent text-layout recalculations.
   * `preserveCurrentAspectRatio=true` retains the current behavior without that recalculation.
   * If `left/top/originX/originY` are supplied, they become the group's new placement contract.
   * Preserves the same group instance, replacing only the inner shape node when necessary.
   * @fires editor:before:shape-updated
   * @fires editor:shape-updated
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
    return this.mutationController.update({
      target,
      presetKey,
      options
    })
  }

  /**
   * Removes the shape group if the target exists and is not locked.
   */
  public remove({
    target,
    withoutSave
  }: {
    target?: ShapeReference
    withoutSave?: boolean
  } = {}): boolean {
    return this.mutationController.remove({
      target,
      withoutSave
    })
  }

  /**
   * Updates the shape-node fill in the selected group.
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
    return this.mutationController.setFill({
      target,
      fill,
      withoutSave
    })
  }

  /**
   * Updates the shape's stroke parameters in the selected group.
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
    return this.mutationController.setStroke({
      target,
      stroke,
      strokeWidth,
      dash,
      withoutSave
    })
  }

  /**
   * Updates the shape's opacity and, if needed, that of its nested text.
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
    return this.mutationController.setOpacity({
      target,
      opacity,
      applyToText,
      withoutSave
    })
  }

  /**
   * Returns the selected shape group's text node.
   */
  public getTextNode({
    target
  }: {
    target?: ShapeReference
  } = {}): ShapeTextNode | null {
    const group = resolveShapeGroup({
      canvas: this.editor.canvas,
      target
    })
    if (!group) return null

    const { text } = getShapeNodes({ group })
    if (!text) return null

    return text
  }

  /**
   * Updates text style inside a shape group without changing shape parameters.
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
    return this.mutationController.updateTextStyle({
      target,
      style,
      withoutSave
    })
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
    return this.mutationController.setTextAlign({
      target,
      horizontal,
      vertical,
      withoutSave
    })
  }

  /**
   * Normalizes rounding and delegates the change to the shared update path.
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
    return this.mutationController.setRounding({
      target,
      rounding,
      withoutSave
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
    return this.mutationController.commitRehydratedShapeLayout({
      target,
      textScale,
      shapeTextAutoExpand
    })
  }

  /**
   * Checks that the temporary selection consists entirely of shapes
   * that ShapeManager can safely recalculate during selection-wide scaling.
   */
  public supportsActiveSelectionScaling({
    selection
  }: {
    selection: ActiveSelection
  }): boolean {
    return resolveSupportedActiveSelectionShapes({ selection }) !== null
  }

  /** Returns supported shapes from a mixed selection without accepting other object types. */
  public resolveSupportedActiveSelectionShapeChildren({
    selection
  }: {
    selection: ActiveSelection
  }): readonly ShapeGroup[] | null {
    return resolveSupportedActiveSelectionShapeChildren({ selection })
  }

  /** Creates a source of actual shape geometry for a shared mixed-object session. */
  public createActiveSelectionScaleDomainSource({
    selection,
    transform
  }: {
    selection: ActiveSelection
    transform: Transform
  }): ActiveSelectionScaleDomainSource | null {
    const targets = resolveSupportedActiveSelectionShapeChildren({ selection })
    if (!targets || transform.target !== selection) return null

    try {
      targets.forEach((group) => this.lifecycleController.beginResize({ group }))

      return this.scalingController.createActiveSelectionScaleDomainSource({
        selection,
        targets,
        transform
      })
    } catch (error) {
      this.clearActiveSelectionScalePreviewState({ children: targets, selection })
      throw error
    }
  }

  /**
   * Returns the corner-handle mode of an already validated selection containing shapes.
   * Rechecking child objects here is forbidden: temporary layout changes their scale.
   */
  public resolveActiveSelectionScaleControlMode({
    selection,
    transform,
    event
  }: {
    selection: ActiveSelection
    transform: Transform
    event?: ShapeScalingPointerEvent | null
  }): ShapeCornerScaleMode | null {
    if (transform.target !== selection) return null
    if (!isShapeCornerScaleControl({ target: selection, transform })) return null

    return resolveShapeCornerScaleMode({
      shiftKey: Boolean(event && 'shiftKey' in event && event.shiftKey)
    })
  }

  /**
   * Applies shape constraints and layout once during handle movement
   * to the already calculated scale of the temporary selection.
   */
  public applyActiveSelectionScalePreview({
    selection,
    transform,
    event
  }: {
    selection: ActiveSelection
    transform: Transform
    event?: ShapeScalingPointerEvent
  }): ActiveSelectionAppliedScale | null {
    const groups = resolveSupportedActiveSelectionShapes({ selection })
    if (!groups || transform.target !== selection) return null

    for (const group of groups) {
      this.lifecycleController.beginResize({ group })
    }

    this.scalingController.handleObjectScaling({
      target: selection,
      transform,
      e: event
    })

    const appliedScale = this.scalingController.resolveActiveSelectionCommittedScale({ selection })
    if (!isPositiveFiniteScale(appliedScale)) {
      throw new Error(this.editor.t('shape.errors.invalidSelectionScale'))
    }

    transform.scaleX = selection.scaleX
    transform.scaleY = selection.scaleY

    return appliedScale
  }

  /** Clears residual temporary state from selection scaling. */
  public clearActiveSelectionScalePreviewState({
    selection,
    children
  }: {
    selection: ActiveSelection
    children: readonly FabricObject[]
  }): void {
    if (children.length < 1) {
      throw new Error(this.editor.t('shape.errors.cleanupRequiresChild'))
    }

    const groups: ShapeGroup[] = []

    for (const child of children) {
      if (!isShapeGroup(child)) {
        throw new Error(this.editor.t('shape.errors.cleanupRequiresShapeGroups'))
      }

      groups.push(child)
    }

    this.scalingController.clearActiveSelectionState({ selection })

    for (const group of groups) {
      this.scalingController.clearState({ group })
      this.lifecycleController.cancelResize({ group })
    }
  }

  /**
   * Transfers shape scale into canonical dimensions without finalizing the shared transaction.
   */
  public prepareActiveSelectionScaleCommit({
    children,
    selection,
    transform
  }: {
    children: readonly FabricObject[]
    selection: ActiveSelection
    transform?: Transform | null
  }): ActiveSelectionShapeScaleCommit {
    const groups = children.map((child) => {
      if (!isShapeGroup(child)) throw new Error(this.editor.t('shape.errors.mixedCommitRequiresShapes'))

      return child
    })
    if (groups.length === 0) throw new Error(this.editor.t('shape.errors.mixedCommitRequiresShape'))

    const beforeSnapshots = groups.map((group) => captureShapeScalingGeometry({ t: this.editor.t, group }))
    const { scaleX, scaleY } = this.scalingController.resolveActiveSelectionCommittedScale({ selection })

    try {
      this._materializeActiveSelectionShapeGroups({ groups, scaleX, scaleY, transform })

      return Object.freeze({
        groups: Object.freeze([...groups]),
        selection
      })
    } catch (error) {
      try {
        restoreShapeScalingSnapshots({ t: this.editor.t, snapshots: beforeSnapshots })
      } catch {
        // The commit error remains primary after attempting to restore each shape.
      }

      throw error
    }
  }

  /** Clears temporary state and publishes prepared shape changes. */
  public finishActiveSelectionScaleCommit({
    commit
  }: {
    commit: ActiveSelectionShapeScaleCommit
  }): void {
    const failures: unknown[] = []

    try {
      this.scalingController.clearActiveSelectionState({ selection: commit.selection })
    } catch (error) {
      failures.push(error)
    }

    for (const group of commit.groups) {
      try {
        this.scalingController.clearState({ group })
      } catch (error) {
        failures.push(error)
      }
      try {
        this.lifecycleController.finishResize({ group })
      } catch (error) {
        failures.push(error)
      }
    }

    const [firstFailure] = failures
    if (failures.length > 0) throw firstFailure
  }

  /** Commits canonical geometry for all shapes, preserving the shared session state. */
  private _materializeActiveSelectionShapeGroups({
    groups,
    scaleX,
    scaleY,
    transform
  }: {
    groups: readonly ShapeGroup[]
    scaleX: number
    scaleY: number
    transform?: Transform | null
  }): void {
    for (const group of groups) {
      const placement = this.editor.canvasManager.getObjectPlacement({ object: group })
      const committed = this.scalingController.materializeActiveSelectionGroupScaling({
        group,
        scaleX,
        scaleY,
        transform
      })
      if (!committed) throw new Error(this.editor.t('shape.errors.measuredDimensionsNotCommitted'))

      this.editor.canvasManager.applyObjectPlacement({ object: group, placement })
      group.setCoords()
    }
  }

  /**
   * Unsubscribes ShapeManager from canvas events.
   */
  public destroy(): void {
    this.eventController.destroy()
  }

  /**
   * Begins a canvas mutation with history temporarily disabled.
   */
  private _beginMutation(): void {
    this.editor.historyManager.suspendHistory()
  }

  /**
   * Ends the canvas mutation and saves state if needed.
   */
  private _endMutation({ withoutSave }: { withoutSave?: boolean }): void {
    this.editor.historyManager.resumeHistory()

    if (!withoutSave) {
      this.editor.historyManager.saveState()
    }
  }
}
