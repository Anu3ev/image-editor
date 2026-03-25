import { Control, Textbox, classRegistry, util } from 'fabric'
import { ShapeGroupObject, registerShapeGroup } from '../../../../src/editor/shape-manager/shape-group'
import {
  createMockShapeNode,
  createMockShapeTextbox
} from '../../../test-utils/shape-helpers'
import {
  MockLayoutManager,
  MockLayoutStrategy,
  createSerializedShapeGroup,
  registerShapeGroupTestClasses
} from '../../../test-utils/shape-group-helpers'

describe('shape-group', () => {
  beforeEach(() => {
    registerShapeGroupTestClasses()
    jest.clearAllMocks()
  })

  it('registerShapeGroup регистрирует класс в Fabric registry', () => {
    registerShapeGroup()

    expect(classRegistry.getClass('shape-group')).toBe(ShapeGroupObject)
  })

  it('конструктор rehydrateRuntimeState выставляет runtime-инварианты', () => {
    const shape = createMockShapeNode()
    const text = createMockShapeTextbox({ text: 'shape text' })

    const group = new ShapeGroupObject([shape as never, text], {
      shapePresetKey: 'square'
    })

    expect(group.shapeComposite).toBe(true)
    expect(group.objectCaching).toBe(false)
    expect(group.interactive).toBe(true)
    expect(group.subTargetCheck).toBe(true)
    expect(group.shapeCanRound).toBe(true)
    expect(group.shapeTextAutoExpand).toBe(true)
    expect(text.selectable).toBe(false)
    expect(text.evented).toBe(false)
    expect(text.autoExpand).toBe(false)
  })

  it('rehydrateRuntimeState не перезаписывает уже заданный shapeCanRound', () => {
    const shape = createMockShapeNode()
    const text = createMockShapeTextbox({ text: 'shape text' })
    const group = new ShapeGroupObject([shape as never, text], {
      shapePresetKey: 'circle',
      shapeCanRound: true
    })

    group.shapeCanRound = true
    group.rehydrateRuntimeState()

    expect(group.shapeCanRound).toBe(true)
  })

  it('rehydrateRuntimeState применяет shape-specific corner controls через общий runtime pipeline', () => {
    const shape = createMockShapeNode()
    const text = createMockShapeTextbox({ text: 'shape text' })
    const group = new ShapeGroupObject([shape as never, text], {
      shapePresetKey: 'square'
    })
    const topLeftControl = new Control({
      actionHandler: jest.fn()
    })
    const middleLeftControl = new Control({
      actionHandler: jest.fn()
    })

    group.controls = {
      tl: topLeftControl,
      ml: middleLeftControl
    } as never

    group.rehydrateRuntimeState()

    expect(group.controls.tl).not.toBe(topLeftControl)
    expect((group.controls.tl as Control & {
      shapeFreeScaleCornerControl?: boolean
    }).shapeFreeScaleCornerControl).toBe(true)
    expect(group.controls.ml).toBe(middleLeftControl)
  })

  it('fromObject восстанавливает ShapeGroupObject и подписывает targets на layout manager', async() => {
    registerShapeGroup()
    const enlivenObjectsSpy = jest.spyOn(util, 'enlivenObjects')
      .mockResolvedValue([
        createMockShapeNode() as never,
        createMockShapeTextbox({ text: 'Shape text' })
      ])
    const enlivenEnlivablesSpy = jest.spyOn(util, 'enlivenObjectEnlivables')
      .mockResolvedValue({})

    const serialized = createSerializedShapeGroup()

    const group = await ShapeGroupObject.fromObject(serialized)
    const layoutManager = group.layoutManager as MockLayoutManager
    const textNode = group.getObjects()[1] as Textbox

    expect(enlivenObjectsSpy).toHaveBeenCalledWith(serialized.objects, undefined)
    expect(enlivenEnlivablesSpy).toHaveBeenCalled()
    expect(group).toBeInstanceOf(ShapeGroupObject)
    expect(layoutManager).toBeInstanceOf(MockLayoutManager)
    expect(layoutManager.strategy).toBeInstanceOf(MockLayoutStrategy)
    expect(layoutManager.subscribeTargets).toHaveBeenCalledWith({
      type: 'initialization',
      target: group,
      targets: group.getObjects()
    })
    expect(textNode.selectable).toBe(false)
    expect(textNode.evented).toBe(false)
  })

  it('fromObject использует дефолтный layout manager если он не сериализован', async() => {
    registerShapeGroup()
    jest.spyOn(util, 'enlivenObjects')
      .mockResolvedValue([
        createMockShapeNode() as never,
        createMockShapeTextbox({ text: 'Shape text' })
      ])
    jest.spyOn(util, 'enlivenObjectEnlivables').mockResolvedValue({})

    const serialized = createSerializedShapeGroup()
    delete (serialized as { layoutManager?: unknown }).layoutManager

    const group = await ShapeGroupObject.fromObject(serialized)

    expect(group).toBeInstanceOf(ShapeGroupObject)
    expect(group.layoutManager).toBeInstanceOf(MockLayoutManager)
  })

  it('fromObject сохраняет выключенный режим авторасширения и приводит textbox к runtime-инварианту', async() => {
    registerShapeGroup()
    const textNode = createMockShapeTextbox({ text: 'Shape text' })

    textNode.autoExpand = true

    jest.spyOn(util, 'enlivenObjects')
      .mockResolvedValue([
        createMockShapeNode() as never,
        textNode
      ])
    jest.spyOn(util, 'enlivenObjectEnlivables').mockResolvedValue({})

    const serialized = {
      ...createSerializedShapeGroup(),
      shapeTextAutoExpand: false
    }

    const group = await ShapeGroupObject.fromObject(serialized)
    const restoredTextNode = group.getObjects()[1] as Textbox

    expect(group.shapeTextAutoExpand).toBe(false)
    expect(restoredTextNode.autoExpand).toBe(false)
    expect(restoredTextNode.selectable).toBe(false)
    expect(restoredTextNode.evented).toBe(false)
  })
})
