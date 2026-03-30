import { Point, util } from 'fabric'
import { ShapeGroupObject, registerShapeGroup } from '../../../../src/editor/shape-manager/shape-group'
import {
  createPlacementSelection,
  createPlacementTestObject,
  createRevivedTemplateObject,
  getScenePointByOrigin
} from '../../../test-utils/placement-helpers'
import {
  createMockShapeNode,
  createMockShapeTextbox
} from '../../../test-utils/shape-helpers'
import { createShapeTemplateDefinition, createTemplateManagerTestSetup } from '../../../test-utils/template-manager-helpers'

describe('TemplateManager', () => {
  beforeEach(() => {
    registerShapeGroup()
    jest.clearAllMocks()
  })

  it('добавляет фигуру из шаблона как обычный объект на канвас', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup()
    const text = createMockShapeTextbox({ text: 'Template text' })
    const group = new ShapeGroupObject([
      createMockShapeNode() as never,
      text
    ], {
      left: 100,
      top: 100,
      shapePresetKey: 'square'
    })
    const enlivenObjectsSpy = jest.spyOn(util, 'enlivenObjects').mockResolvedValue([group])

    const result = await manager.applyTemplate({
      template: createShapeTemplateDefinition()
    })

    expect(enlivenObjectsSpy).toHaveBeenCalled()
    expect(result).toEqual([group])
    expect(editor.canvas.add).toHaveBeenCalledWith(group)
    expect(editor.canvas.setActiveObject).toHaveBeenCalledWith(group)
    expect(group).toBeInstanceOf(ShapeGroupObject)
    expect(group.shapeComposite).toBe(true)
    expect(text.selectable).toBe(false)
    expect(text.evented).toBe(false)
    expect(editor.errorManager.emitError).not.toHaveBeenCalled()
    expect(editor.historyManager.suspendHistory).toHaveBeenCalled()
    expect(editor.historyManager.resumeHistory).toHaveBeenCalled()
    expect(editor.historyManager.saveState).toHaveBeenCalled()
  })

  it('сохраняет auto-expand у текста внутри фигуры из шаблона', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup()
    const text = createMockShapeTextbox({ text: 'Template text' })
    const group = new ShapeGroupObject([
      createMockShapeNode() as never,
      text
    ], {
      left: 100,
      top: 100,
      shapePresetKey: 'square',
      shapeTextAutoExpand: false
    })

    jest.spyOn(util, 'enlivenObjects').mockResolvedValue([group])

    const result = await manager.applyTemplate({
      template: createShapeTemplateDefinition()
    })

    expect(result).toEqual([group])
    expect(group.shapeTextAutoExpand).toBe(false)
    expect(text.autoExpand).toBe(false)
    expect(editor.errorManager.emitError).not.toHaveBeenCalled()
  })

  it('применяет фон из шаблона отдельно от остальных объектов', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup()
    const backgroundObject = createMockShapeNode() as never
    backgroundObject.id = 'background'
    backgroundObject.backgroundType = 'color'
    backgroundObject.fill = '#ff0055'
    const contentObject = new ShapeGroupObject([
      createMockShapeNode() as never,
      createMockShapeTextbox({ text: 'Template text' })
    ], {
      left: 100,
      top: 100,
      shapePresetKey: 'square'
    })
    jest.spyOn(util, 'enlivenObjects')
      .mockResolvedValueOnce([backgroundObject])
      .mockResolvedValueOnce([contentObject])

    const result = await manager.applyTemplate({
      template: {
        id: 'template-2',
        meta: {
          baseWidth: 400,
          baseHeight: 300,
          positionsNormalized: true
        },
        objects: [
          { type: 'rect', id: 'background', backgroundType: 'color', fill: '#ff0055' },
          { type: 'shape-group', left: 100, top: 100, shapePresetKey: 'square' }
        ]
      }
    })

    expect(editor.backgroundManager.setColorBackground).toHaveBeenCalledWith({
      color: '#ff0055',
      customData: undefined,
      fromTemplate: true,
      withoutSave: true
    })
    expect(editor.errorManager.emitError).not.toHaveBeenCalled()
    expect(editor.canvas.add).toHaveBeenCalledWith(contentObject)
    expect(result).toEqual([contentObject])
  })

  it('для пустого шаблона возвращает warning и не добавляет объекты', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup()

    const result = await manager.applyTemplate({
      template: {
        id: 'template-empty',
        meta: {
          baseWidth: 400,
          baseHeight: 300
        },
        objects: []
      }
    })

    expect(result).toBeNull()
    expect(editor.errorManager.emitWarning).toHaveBeenCalled()
  })

  it('при сохранении двух выделенных объектов не теряет их места на канвасе', () => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup({
      useRealCanvasManager: true
    })
    const leftObject = createPlacementTestObject({
      id: 'left-object',
      left: 20,
      top: 40,
      width: 80,
      height: 60
    })
    const rightObject = createPlacementTestObject({
      id: 'right-object',
      left: 150,
      top: 40,
      width: 60,
      height: 60
    })
    const selection = createPlacementSelection({
      objects: [leftObject, rightObject],
      offsetX: 130,
      offsetY: 70
    })

    editor.canvas.getActiveObject.mockReturnValue(selection)

    const template = manager.serializeSelection()

    expect(template).not.toBeNull()

    const serializedObjects = new Map(template?.objects.map((object) => [object.id, object]))

    expect(serializedObjects.get('left-object')).toEqual(expect.objectContaining({
      left: 0.125,
      top: 0.2
    }))
    expect(serializedObjects.get('right-object')).toEqual(expect.objectContaining({
      left: 0.45,
      top: 0.2
    }))
  })

  it('один и тот же объект сохраняется одинаково сам по себе и в выделении из нескольких объектов', () => {
    const directSetup = createTemplateManagerTestSetup({
      useRealCanvasManager: true
    })
    const directObject = createPlacementTestObject({
      id: 'shared-object',
      left: 150,
      top: 110,
      width: 80,
      height: 60
    })

    directSetup.editor.canvas.getActiveObject.mockReturnValue(directObject)

    const directTemplate = directSetup.manager.serializeSelection()

    const selectionSetup = createTemplateManagerTestSetup({
      useRealCanvasManager: true
    })
    const selectedObject = createPlacementTestObject({
      id: 'shared-object',
      left: 20,
      top: 40,
      width: 80,
      height: 60
    })
    const siblingObject = createPlacementTestObject({
      id: 'sibling-object',
      left: 150,
      top: 40,
      width: 60,
      height: 60
    })
    const selection = createPlacementSelection({
      objects: [selectedObject, siblingObject],
      offsetX: 130,
      offsetY: 70
    })

    selectionSetup.editor.canvas.getActiveObject.mockReturnValue(selection)

    const selectionTemplate = selectionSetup.manager.serializeSelection()
    const directSerializedObject = directTemplate?.objects[0]
    const selectedSerializedObject = selectionTemplate?.objects.find((object) => object.id === 'shared-object')

    expect(selectedSerializedObject).toEqual(expect.objectContaining({
      left: directSerializedObject?.left,
      top: directSerializedObject?.top,
      _templateAnchorX: directSerializedObject?._templateAnchorX,
      _templateAnchorY: directSerializedObject?._templateAnchorY
    }))
  })

  it('при сохранении объекта с нестандартным origin берёт его реальную точку, а не левый верхний угол', () => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup({
      useRealCanvasManager: true
    })
    const object = createPlacementTestObject({
      id: 'origin-object',
      left: 220,
      top: 170,
      width: 80,
      height: 60,
      originX: 'center',
      originY: 'bottom'
    })

    editor.canvas.getActiveObject.mockReturnValue(object)

    const template = manager.serializeSelection()
    const serializedObject = template?.objects[0]

    expect(serializedObject).toEqual(expect.objectContaining({
      left: 0.3,
      top: 0.4
    }))
  })

  it('после сохранения в шаблон и повторного применения объекты остаются на своих местах на канвасе того же размера', async() => {
    const sourceSetup = createTemplateManagerTestSetup({
      useRealCanvasManager: true
    })
    const leftObject = createPlacementTestObject({
      id: 'left-object',
      left: 20,
      top: 40,
      width: 80,
      height: 60
    })
    const rightObject = createPlacementTestObject({
      id: 'right-object',
      left: 150,
      top: 40,
      width: 60,
      height: 60
    })
    const selection = createPlacementSelection({
      objects: [leftObject, rightObject],
      offsetX: 130,
      offsetY: 70
    })

    sourceSetup.editor.canvas.getActiveObject.mockReturnValue(selection)

    const template = sourceSetup.manager.serializeSelection()
    const targetSetup = createTemplateManagerTestSetup({
      useRealCanvasManager: true
    })
    const enlivenObjectsSpy = jest.spyOn(util, 'enlivenObjects')
      .mockImplementation(async([serialized]) => [createRevivedTemplateObject({ serialized })] as never)

    const insertedObjects = await targetSetup.manager.applyTemplate({
      template: template as NonNullable<typeof template>
    })

    expect(enlivenObjectsSpy).toHaveBeenCalledTimes(2)
    expect(insertedObjects).not.toBeNull()
    expect(getScenePointByOrigin({ object: insertedObjects?.[0] as never })).toEqual(new Point(150, 110))
    expect(getScenePointByOrigin({ object: insertedObjects?.[1] as never })).toEqual(new Point(280, 110))
  })

  it('после сохранения в шаблон и повторного применения объекты сохраняют относительное положение на канвасе другого размера', async() => {
    const sourceSetup = createTemplateManagerTestSetup({
      useRealCanvasManager: true
    })
    const leftObject = createPlacementTestObject({
      id: 'left-object',
      left: 20,
      top: 40,
      width: 80,
      height: 60
    })
    const rightObject = createPlacementTestObject({
      id: 'right-object',
      left: 150,
      top: 40,
      width: 60,
      height: 60
    })
    const selection = createPlacementSelection({
      objects: [leftObject, rightObject],
      offsetX: 130,
      offsetY: 70
    })

    sourceSetup.editor.canvas.getActiveObject.mockReturnValue(selection)

    const template = sourceSetup.manager.serializeSelection()
    const targetSetup = createTemplateManagerTestSetup({
      useRealCanvasManager: true,
      montageBounds: {
        left: 100,
        top: 50,
        width: 800,
        height: 600
      }
    })

    jest.spyOn(util, 'enlivenObjects')
      .mockImplementation(async([serialized]) => [createRevivedTemplateObject({ serialized })] as never)

    const insertedObjects = await targetSetup.manager.applyTemplate({
      template: template as NonNullable<typeof template>
    })

    expect(insertedObjects).not.toBeNull()
    expect(getScenePointByOrigin({ object: insertedObjects?.[0] as never })).toEqual(new Point(200, 170))
    expect(getScenePointByOrigin({ object: insertedObjects?.[1] as never })).toEqual(new Point(460, 170))
  })
})
