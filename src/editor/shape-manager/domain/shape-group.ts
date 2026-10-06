import {
  FabricObject,
  Group,
  LayoutManager,
  classRegistry,
  util,
  type Abortable,
  type LayoutStrategy
} from 'fabric'
import {
  getShapePreset,
  isShapePresetRoundable,
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN
} from './shape-presets'
import {
  normalizeShapeUserPadding
} from '../layout/shape-padding'
import { normalizeShapeRounding } from './shape-rounding'
import {
  getShapeNodes
} from './shape-nodes'
import {
  applyShapeGroupInteractivity,
  detachShapeGroupAutoLayout,
  getShapeRuntimeTextNode,
  prepareShapeTextNode
} from './shape-runtime'
import { applyShapeCornerFreeScaleControls } from '../scaling/shape-controls'
import type {
  ShapeGroupLike,
  ShapeGroupMetadata,
  ShapeHorizontalAlign,
  ShapePadding,
  ShapeVerticalAlign,
  ShapeVisualStyle
} from '../types'

/**
 * Fabric Group options with persisted shape-group metadata.
 */
type ShapeGroupOptions = ConstructorParameters<typeof Group>[1] & Partial<ShapeGroupMetadata>

/**
 * Serialized layout manager representation that Fabric puts in the object payload.
 */
type SerializedShapeGroupLayoutManager = {
  type: string
  strategy?: string
}

/**
 * Serialized shape group received from clone/deserialize/history.
 */
interface SerializedShapeGroupObject extends Partial<ShapeGroupMetadata> {
  [key: string]: unknown
  type?: string
  objects?: object[]
  layoutManager?: SerializedShapeGroupLayoutManager
}

/**
 * Layout strategy class registered in Fabric's classRegistry.
 */
type RegisteredLayoutStrategyClass = {
  new(): LayoutStrategy
}

/**
 * Fabric type for a custom shape-group object.
 */
const SHAPE_GROUP_TYPE = 'shape-group'

/**
 * Persisted shape state applied identically during create and update.
 */
export type ShapeGroupMetadataInput = {
  presetKey: string
  presetCanRound: boolean
  width: number
  height: number
  manualWidth?: number
  manualHeight?: number
  replaceBoxWidth?: number
  replaceBoxHeight?: number
  shapeTextAutoExpand: boolean
  alignH: ShapeHorizontalAlign
  alignV: ShapeVerticalAlign
  padding: ShapePadding
  style: ShapeVisualStyle
  rounding?: number
}

/**
 * Applies the complete persisted domain state to the shape group.
 */
export const applyShapeGroupMetadata = ({
  group,
  metadata
}: {
  group: ShapeGroupLike
  metadata: ShapeGroupMetadataInput
}): void => {
  const { padding, style } = metadata
  const strokeDashArray = style.strokeDashArray
    ? style.strokeDashArray.slice()
    : style.strokeDashArray ?? null
  const normalizedRounding = metadata.presetCanRound
    ? normalizeShapeRounding({ rounding: metadata.rounding })
    : 0

  group.set({
    shapeComposite: true,
    shapePresetKey: metadata.presetKey,
    shapeBaseWidth: metadata.width,
    shapeBaseHeight: metadata.height,
    shapeManualBaseWidth: Math.max(1, metadata.manualWidth ?? metadata.width),
    shapeManualBaseHeight: Math.max(1, metadata.manualHeight ?? metadata.height),
    shapeReplaceBoxWidth: Math.max(1, metadata.replaceBoxWidth ?? metadata.width),
    shapeReplaceBoxHeight: Math.max(1, metadata.replaceBoxHeight ?? metadata.height),
    shapeTextAutoExpand: metadata.shapeTextAutoExpand,
    shapeAlignHorizontal: metadata.alignH,
    shapeAlignVertical: metadata.alignV,
    shapePaddingTop: padding.top,
    shapePaddingRight: padding.right,
    shapePaddingBottom: padding.bottom,
    shapePaddingLeft: padding.left,
    shapeFill: style.fill,
    shapeStroke: style.stroke,
    shapeStrokeWidth: style.strokeWidth,
    shapeStrokeDashArray: strokeDashArray,
    shapeOpacity: style.opacity,
    shapeRounding: normalizedRounding,
    shapeCanRound: metadata.presetCanRound
  })
}

/**
 * Creates a temporary layout manager with no actual layout, used only during deserialization.
 */
function createNoopShapeLayoutManager(): LayoutManager {
  const layoutManager = new LayoutManager()

  layoutManager.performLayout = (): void => {}

  return layoutManager
}

/**
 * Restores the shape group's layout manager from serialized Fabric data.
 */
function resolveShapeGroupLayoutManager({
  layoutManager
}: {
  layoutManager?: SerializedShapeGroupLayoutManager
}): LayoutManager {
  const LayoutManagerClass = classRegistry.getClass<typeof LayoutManager>('layoutManager')

  if (!layoutManager) {
    return new LayoutManagerClass()
  }

  const {
    strategy,
    type
  } = layoutManager
  const RegisteredLayoutManagerClass = classRegistry.getClass<typeof LayoutManager>(type)

  if (!strategy) {
    return new RegisteredLayoutManagerClass()
  }

  const StrategyClass = classRegistry.getClass<RegisteredLayoutStrategyClass>(strategy)

  return new RegisteredLayoutManagerClass(new StrategyClass())
}

/**
 * Domain type for a composite shape object with its own runtime invariants.
 */
export class ShapeGroupObject extends Group {
  static override type = SHAPE_GROUP_TYPE

  /**
   * Creates a Fabric Group with shape-specific runtime settings and restores its invariants.
   */
  constructor(objects: FabricObject[] = [], options: ShapeGroupOptions = {}) {
    const {
      layoutManager,
      objectCaching,
      centeredScaling,
      lockScalingFlip,
      ...rest
    } = options

    super(objects, {
      ...rest,
      layoutManager,
      objectCaching: objectCaching ?? false,
      centeredScaling: centeredScaling ?? false,
      lockScalingFlip: lockScalingFlip ?? true
    })

    this.rehydrateRuntimeState()
  }

  /**
   * Restores composite-shape runtime invariants after create/clone/deserialize,
   * including shape-specific corner resizing.
   */
  public rehydrateRuntimeState(): void {
    this.set({
      objectCaching: false,
      shapeComposite: true
    })

    if (this.shapeTextAutoExpand === undefined) {
      this.shapeTextAutoExpand = true
    }

    if (this.shapeAlignHorizontal === undefined) {
      this.shapeAlignHorizontal = SHAPE_DEFAULT_HORIZONTAL_ALIGN
    }

    if (this.shapeAlignVertical === undefined) {
      this.shapeAlignVertical = SHAPE_DEFAULT_VERTICAL_ALIGN
    }

    const normalizedPadding = normalizeShapeUserPadding({
      padding: {
        top: this.shapePaddingTop,
        right: this.shapePaddingRight,
        bottom: this.shapePaddingBottom,
        left: this.shapePaddingLeft
      }
    })

    this.shapePaddingTop = normalizedPadding.top
    this.shapePaddingRight = normalizedPadding.right
    this.shapePaddingBottom = normalizedPadding.bottom
    this.shapePaddingLeft = normalizedPadding.left

    this._syncRoundability()
    this._foldGroupOpacityIntoNodes()
    applyShapeGroupInteractivity({
      group: this as ShapeGroupLike
    })
    applyShapeCornerFreeScaleControls({
      target: this as ShapeGroupLike
    })

    const text = getShapeRuntimeTextNode({
      group: this as ShapeGroupLike
    })

    if (text) {
      prepareShapeTextNode({ text })
    }

    detachShapeGroupAutoLayout({
      group: this as ShapeGroupLike
    })

    this.setCoords()
  }

  /**
   * Restores a shape group from serialized Fabric state.
   */
  public static override async fromObject(
    {
      type: _type,
      objects = [],
      layoutManager,
      ...options
    }: SerializedShapeGroupObject,
    abortable?: Abortable
  ): Promise<ShapeGroupObject> {
    const [enlivenedObjects, hydratedOptions] = await Promise.all([
      util.enlivenObjects<FabricObject>(objects, abortable),
      util.enlivenObjectEnlivables<Record<string, unknown>>(options, abortable)
    ])

    const group = new ShapeGroupObject(enlivenedObjects, {
      ...options,
      ...hydratedOptions,
      layoutManager: createNoopShapeLayoutManager()
    } as ShapeGroupOptions)

    group.layoutManager = resolveShapeGroupLayoutManager({ layoutManager })
    group.layoutManager.subscribeTargets({
      type: 'initialization',
      target: group,
      targets: group.getObjects()
    })
    group.rehydrateRuntimeState()
    group.setCoords()

    return group
  }

  /**
   * Replaces the group's inner shape node without recalculating through the group matrix.
   *
   * Generic Group.remove() + insertAt() cannot be used here:
   * createShapeNode() already returns a child in the group's local coordinate system,
   * and insertAt() would apply the inverse group-matrix transform again.
   */
  public replaceShapeNode(
    index: number,
    oldNode: FabricObject,
    newNode: FabricObject
  ): void {
    this._objects.splice(index, 1)
    this.exitGroup(oldNode, true)

    this._objects.splice(index, 0, newNode)
    this.enterGroup(newNode, false)

    this._set('dirty', true)
  }

  /**
   * Ensures that derived shape properties remain consistent after materialization.
   */
  private _syncRoundability(): void {
    if (typeof this.shapeCanRound === 'boolean') return

    const presetKey = this.shapePresetKey
    if (!presetKey) return

    const preset = getShapePreset({ presetKey })
    if (!preset) return

    this.shapeCanRound = isShapePresetRoundable({ preset })
  }

  /**
   * Folds the group's own opacity into the inner nodes of the shape composition.
   */
  private _foldGroupOpacityIntoNodes(): void {
    const groupOpacity = this.opacity

    if (typeof groupOpacity !== 'number' || groupOpacity === 1) return

    const {
      shape,
      text
    } = getShapeNodes({ group: this as ShapeGroupLike })

    if (!shape && !text) return

    if (shape) {
      const shapeOpacity = typeof shape.opacity === 'number'
        ? shape.opacity
        : this.shapeOpacity ?? 1
      const opacity = shapeOpacity * groupOpacity

      shape.set({ opacity })
      shape.setCoords()
      this.shapeOpacity = opacity
    }

    if (text) {
      const textOpacity = typeof text.opacity === 'number'
        ? text.opacity
        : 1

      text.set({ opacity: textOpacity * groupOpacity })
      text.setCoords()
    }

    this.set({ opacity: 1 })
  }
}

/**
 * Registers the shape group in Fabric's classRegistry.
 */
export const registerShapeGroup = (): void => {
  if (classRegistry?.setClass) {
    classRegistry.setClass(ShapeGroupObject, SHAPE_GROUP_TYPE)
  }
}
