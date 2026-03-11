import {
  FabricObject,
  Group,
  classRegistry,
  util,
  type Abortable
} from 'fabric'
import {
  getShapePreset,
  isShapePresetRoundable
} from './shape-presets'
import {
  applyShapeGroupInteractivity,
  detachShapeGroupAutoLayout,
  getShapeRuntimeTextNode,
  prepareShapeTextNode
} from './shape-runtime'
import type {
  ShapeGroupLike,
  ShapeGroupMetadata
} from './types'

type ShapeGroupOptions = ConstructorParameters<typeof Group>[1] & Partial<ShapeGroupMetadata>

type SerializedShapeGroupOptions = ShapeGroupOptions & {
  layoutManager?: {
    strategy?: string
    type: string
  }
  objects?: object[]
  type?: string
}

const SHAPE_GROUP_TYPE = 'shape-group'

type NoopShapeLayoutManager = {
  performLayout: (options?: object) => void
}

type ShapeLayoutManager = {
  subscribeTargets: (options: {
    target: Group
    targets: FabricObject[]
    type: string
  }) => void
}

/**
 * Создаёт временный layout manager без реального layout, используемый только на стадии deserialization.
 */
function createNoopShapeLayoutManager(): NoopShapeLayoutManager {
  return {
    performLayout(): void {}
  }
}

/**
 * Восстанавливает layout manager shape-группы из сериализованных данных Fabric.
 */
function resolveShapeGroupLayoutManager({
  layoutManager
}: {
  layoutManager?: SerializedShapeGroupOptions['layoutManager']
}): ShapeLayoutManager {
  const LayoutManagerClass = classRegistry.getClass('layoutManager') as new (
    ...args: unknown[]
  ) => ShapeLayoutManager

  if (!layoutManager) {
    return new LayoutManagerClass()
  }

  const {
    strategy,
    type
  } = layoutManager
  const RegisteredLayoutManagerClass = classRegistry.getClass(type) as new (
    ...args: unknown[]
  ) => ShapeLayoutManager

  if (!strategy) {
    return new RegisteredLayoutManagerClass()
  }

  const StrategyClass = classRegistry.getClass(strategy) as new (...args: unknown[]) => object

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
   * Восстанавливает runtime-инварианты composite shape после create/clone/deserialize.
   */
  public rehydrateRuntimeState(): void {
    this.set({
      objectCaching: false,
      shapeComposite: true
    })

    this._syncRoundability()
    applyShapeGroupInteractivity({
      group: this as ShapeGroupLike
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
    }: SerializedShapeGroupOptions,
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
    })

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
