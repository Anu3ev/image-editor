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
  ShapeGroupMetadata
} from '../types'

/**
 * Опции Fabric Group с persisted metadata shape-группы.
 */
type ShapeGroupOptions = ConstructorParameters<typeof Group>[1] & Partial<ShapeGroupMetadata>

/**
 * Сериализованная форма layout manager, которую Fabric кладёт в object payload.
 */
type SerializedShapeGroupLayoutManager = {
  type: string
  strategy?: string
}

/**
 * Сериализованная shape-группа, приходящая из clone/deserialize/history.
 */
interface SerializedShapeGroupObject extends Partial<ShapeGroupMetadata> {
  [key: string]: unknown
  type?: string
  objects?: object[]
  layoutManager?: SerializedShapeGroupLayoutManager
}

/**
 * Класс layout strategy, зарегистрированный внутри Fabric classRegistry.
 */
type RegisteredLayoutStrategyClass = {
  new(): LayoutStrategy
}

/**
 * Fabric type для custom shape group object.
 */
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

  /**
   * Создаёт Fabric Group с shape-specific runtime настройками и восстанавливает инварианты.
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
   * Заменяет внутренний shape-узел группы без пересчёта через матрицу группы.
   *
   * Generic Group.remove() + insertAt() здесь использовать нельзя:
   * createShapeNode() уже возвращает child в локальной системе координат группы,
   * а insertAt() повторно применил бы обратное преобразование через матрицу группы.
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

  /**
   * Сворачивает opacity самой группы во внутренние узлы shape-композиции.
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
 * Регистрирует shape-group в Fabric classRegistry.
 */
export const registerShapeGroup = (): void => {
  if (classRegistry?.setClass) {
    classRegistry.setClass(ShapeGroupObject, SHAPE_GROUP_TYPE)
  }
}
