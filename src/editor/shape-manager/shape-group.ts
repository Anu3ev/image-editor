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
} from './layout/shape-padding'
import {
  applyShapeGroupInteractivity,
  detachShapeGroupAutoLayout,
  getShapeRuntimeTextNode,
  prepareShapeTextNode
} from './shape-runtime'
import { applyShapeCornerFreeScaleControls } from './scaling/shape-controls'
import type {
  ShapeGroupLike,
  ShapeGroupMetadata
} from './types'

type ShapeGroupOptions = ConstructorParameters<typeof Group>[1] & Partial<ShapeGroupMetadata>

type SerializedShapeGroupLayoutManager = {
  type: string
  strategy?: string
}

interface SerializedShapeGroupObject extends Partial<ShapeGroupMetadata> {
  [key: string]: unknown
  type?: string
  objects?: object[]
  layoutManager?: SerializedShapeGroupLayoutManager
}

type RegisteredLayoutStrategyClass = {
  new(): LayoutStrategy
}

const SHAPE_GROUP_TYPE = 'shape-group'

/**
 * Создаёт временный layout manager без реального layout, используемый только на стадии deserialization.
 */
function createNoopShapeLayoutManager(): LayoutManager {
  const layoutManager = new LayoutManager()

  layoutManager.performLayout = (): void => {}

  return layoutManager
}

/**
 * Восстанавливает layout manager shape-группы из сериализованных данных Fabric.
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
 * Domain-тип composite shape-объекта с собственными runtime-инвариантами.
 */
export class ShapeGroupObject extends Group {
  static override type = SHAPE_GROUP_TYPE

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
   * Восстанавливает runtime-инварианты composite shape после create/clone/deserialize,
   * включая shape-specific corner resize.
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
   * Восстанавливает shape-group из сериализованного состояния Fabric.
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
   * Гарантирует консистентность производных shape-свойств после materialization.
   */
  private _syncRoundability(): void {
    if (typeof this.shapeCanRound === 'boolean') return

    const presetKey = this.shapePresetKey
    if (!presetKey) return

    const preset = getShapePreset({ presetKey })
    if (!preset) return

    this.shapeCanRound = isShapePresetRoundable({ preset })
  }
}

/**
 * Регистрирует shape-group в Fabric classRegistry.
 */
export const registerShapeGroup = (): void => {
  if (classRegistry?.setClass) {
    classRegistry.setClass(ShapeGroupObject, SHAPE_GROUP_TYPE)
  }
}
