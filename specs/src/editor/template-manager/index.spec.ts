import { Point, Textbox, util } from 'fabric'
import { nanoid } from 'nanoid'
import { ShapeGroupObject, registerShapeGroup } from '../../../../src/editor/shape-manager/domain/shape-group'
import {
  createPlacementSelection,
  createPlacementTestImage,
  createPlacementTestObject,
  createRevivedTemplateObject,
  getScenePointByOrigin
} from '../../../test-utils/canvas/placement'
import {
  createRestoredStandaloneTemplateTextbox,
  createRestoredTemplateLikeTextbox
} from '../../../test-utils/text/template-textbox-fixtures'
import {
  createMockShapeNode,
  createMockShapeTextbox
} from '../../../test-utils/shape/factories'
import {
  createImageTemplateDefinition,
  createShapeTemplateDefinition,
  createStandaloneTextTemplateDefinition,
  createTemplateManagerTestSetup
} from '../../../test-utils/managers/template'
import { BackgroundTextbox, registerBackgroundTextbox } from '../../../../src/editor/text-manager/background-textbox'

describe('TemplateManager', () => {
  beforeEach(() => {
    const nanoidMock = nanoid as jest.MockedFunction<typeof nanoid>
    let nanoidCallIndex = 0

    jest.restoreAllMocks()
    registerShapeGroup()
    nanoidMock.mockReset()
    nanoidMock.mockImplementation(() => {
      nanoidCallIndex += 1

      return `mock-nanoid-${nanoidCallIndex}`
    })
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

  it('текст внутри фигуры из шаблона пересчитывается с масштабом монтажной области', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup({
      montageBounds: {
        left: 0,
        top: 0,
        width: 800,
        height: 600
      }
    })
    const group = new ShapeGroupObject([
      createMockShapeNode() as never,
      createMockShapeTextbox({ text: 'Template text' })
    ], {
      left: 100,
      top: 100,
      shapePresetKey: 'square'
    })

    jest.spyOn(util, 'enlivenObjects').mockResolvedValue([group])

    const result = await manager.applyTemplate({
      template: createShapeTemplateDefinition()
    })

    const commitRehydratedShapeLayoutMock = editor.shapeManager.commitRehydratedShapeLayout as jest.Mock

    expect(result).toEqual([group])
    expect(commitRehydratedShapeLayoutMock).toHaveBeenCalledWith({
      target: group,
      textScale: 2
    })
    expect(commitRehydratedShapeLayoutMock.mock.invocationCallOrder[0]).toBeLessThan(
      editor.canvas.add.mock.invocationCallOrder[0]
    )
    expect(editor.errorManager.emitError).not.toHaveBeenCalled()
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

  it('сохраняет replacement box у фигуры из шаблона', async() => {
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
      shapeReplaceBoxWidth: 260,
      shapeReplaceBoxHeight: 180
    })

    jest.spyOn(util, 'enlivenObjects').mockResolvedValue([group])

    const result = await manager.applyTemplate({
      template: createShapeTemplateDefinition()
    })

    expect(result).toEqual([group])
    expect(group.shapeReplaceBoxWidth).toBe(260)
    expect(group.shapeReplaceBoxHeight).toBe(180)
    expect(editor.errorManager.emitError).not.toHaveBeenCalled()
  })

  it('текст из шаблона получает актуальный размер после прошлых трансформаций', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup()
    const textbox = new Textbox('Очень длинный текст для шаблона', {
      left: 0.25,
      top: 0.2,
      width: 160,
      scaleX: 0.6,
      scaleY: 0.6,
      originX: 'left',
      originY: 'top'
    })

    jest.spyOn(util, 'enlivenObjects').mockResolvedValue([textbox])

    const result = await manager.applyTemplate({
      template: {
        id: 'template-with-text',
        meta: {
          baseWidth: 400,
          baseHeight: 300,
          positionsNormalized: true
        },
        objects: [{
          type: 'textbox',
          left: 0.25,
          top: 0.2,
          width: 160,
          scaleX: 0.6,
          scaleY: 0.6,
          text: 'Очень длинный текст для шаблона'
        }]
      }
    })

    const commitStandaloneTextScaleMock = editor.textManager.commitStandaloneTextScale as jest.Mock

    expect(result).toEqual([textbox])
    expect(commitStandaloneTextScaleMock).toHaveBeenCalledWith({
      target: textbox
    })
    expect(commitStandaloneTextScaleMock.mock.invocationCallOrder[0]).toBeLessThan(
      editor.canvas.add.mock.invocationCallOrder[0]
    )
    expect(editor.errorManager.emitError).not.toHaveBeenCalled()
  })

  it('текстовый объект с фоном из шаблона добавляется сразу в итоговом размере', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup()
    const textbox = createRestoredTemplateLikeTextbox({
      left: 0.25,
      top: 0.2,
      scaleX: 0.6,
      scaleY: 1.4
    })

    jest.spyOn(util, 'enlivenObjects').mockResolvedValue([textbox])

    const result = await manager.applyTemplate({
      template: {
        id: 'template-with-background-text',
        meta: {
          baseWidth: 400,
          baseHeight: 300,
          positionsNormalized: true
        },
        objects: [{
          type: 'background-textbox',
          left: 0.25,
          top: 0.2,
          width: 137,
          scaleX: 0.6,
          scaleY: 1.4,
          text: '69\nЧасов музыки'
        }]
      }
    })

    const commitStandaloneTextScaleMock = editor.textManager.commitStandaloneTextScale as jest.Mock

    expect(result).toEqual([textbox])
    expect(commitStandaloneTextScaleMock).toHaveBeenCalledWith({
      target: textbox
    })
    expect(commitStandaloneTextScaleMock.mock.invocationCallOrder[0]).toBeLessThan(
      editor.canvas.add.mock.invocationCallOrder[0]
    )
    expect(editor.errorManager.emitError).not.toHaveBeenCalled()
  })

  it('centered standalone text из шаблона сохраняет относительное положение на размере с горизонтальными полями', async() => {
    const template = createStandaloneTextTemplateDefinition()
    const baseMontageBounds = {
      left: 100,
      top: 50,
      width: 810,
      height: 1080
    }
    const targetMontageBounds = {
      left: 100,
      top: 50,
      width: 1000,
      height: 1000
    }
    const sourceSetup = createTemplateManagerTestSetup({
      montageBounds: baseMontageBounds
    })
    const targetSetup = createTemplateManagerTestSetup({
      montageBounds: targetMontageBounds
    })
    const sourceTextbox = Object.assign(
      createRestoredStandaloneTemplateTextbox(),
      {
        _templateAnchorX: 'center' as const,
        _templateAnchorY: 'start' as const
      }
    )
    const targetTextbox = Object.assign(
      createRestoredStandaloneTemplateTextbox(),
      {
        _templateAnchorX: 'center' as const,
        _templateAnchorY: 'start' as const
      }
    )

    jest.spyOn(util, 'enlivenObjects')
      .mockResolvedValueOnce([sourceTextbox])
      .mockResolvedValueOnce([targetTextbox])

    const sourceResult = await sourceSetup.manager.applyTemplate({ template })
    const targetResult = await targetSetup.manager.applyTemplate({ template })

    sourceTextbox.setCoords()
    targetTextbox.setCoords()

    const sourceRect = sourceTextbox.getBoundingRect()
    const targetRect = targetTextbox.getBoundingRect()
    const sourceRelativeCenterX = ((sourceRect.left + (sourceRect.width / 2)) - baseMontageBounds.left)
      / baseMontageBounds.width
    const sourceRelativeTop = (sourceRect.top - baseMontageBounds.top) / baseMontageBounds.height
    const targetRelativeCenterX = ((targetRect.left + (targetRect.width / 2)) - targetMontageBounds.left)
      / targetMontageBounds.width
    const targetRelativeTop = (targetRect.top - targetMontageBounds.top) / targetMontageBounds.height

    expect(sourceResult).toEqual([sourceTextbox])
    expect(targetResult).toEqual([targetTextbox])
    expect(Math.abs(targetRelativeCenterX - sourceRelativeCenterX)).toBeLessThanOrEqual(0.03)
    expect(Math.abs(targetRelativeTop - sourceRelativeTop)).toBeLessThanOrEqual(0.02)
    expect(targetRect.top).toBeGreaterThanOrEqual(targetMontageBounds.top)
    expect(targetRect.top + targetRect.height).toBeLessThanOrEqual(
      targetMontageBounds.top + targetMontageBounds.height
    )
  })

  it('изображение из шаблона с новой вертикальной картинкой сохраняет центр исходной области', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup({
      useRealCanvasManager: true,
      montageBounds: {
        left: 100,
        top: 50,
        width: 810,
        height: 1080
      }
    })
    const revivedImage = createPlacementTestImage({
      id: 'template-image',
      left: 0.05925925925925926,
      top: 0.15185185185185185,
      width: 714,
      height: 714,
      intrinsicWidth: 400,
      intrinsicHeight: 800
    })

    jest.spyOn(util, 'enlivenObjects').mockResolvedValue([revivedImage as never])

    const result = await manager.applyTemplate({
      template: createImageTemplateDefinition({
        left: 0.05925925925925926,
        top: 0.15185185185185185,
        width: 714,
        height: 714
      })
    })
    const imageCenter = getScenePointByOrigin({
      object: revivedImage,
      originX: 'center',
      originY: 'center'
    })

    expect(result).toEqual([revivedImage])
    expect(imageCenter).toEqual(new Point(505, 571))
    expect(revivedImage.scaleX).toBe(0.8925)
    expect(revivedImage.scaleY).toBe(0.8925)
    expect(editor.errorManager.emitError).not.toHaveBeenCalled()
  })

  it('legacy template без normalized positions сохраняет центр изображения после замены src', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup({
      useRealCanvasManager: true,
      montageBounds: {
        left: 0,
        top: 0,
        width: 810,
        height: 1080
      }
    })
    const revivedImage = createPlacementTestImage({
      id: 'template-image',
      left: 148,
      top: 164,
      width: 240,
      height: 240,
      intrinsicWidth: 480,
      intrinsicHeight: 120
    })

    jest.spyOn(util, 'enlivenObjects').mockResolvedValue([revivedImage as never])

    const result = await manager.applyTemplate({
      template: createImageTemplateDefinition({
        left: 148,
        top: 164,
        width: 240,
        height: 240,
        positionsNormalized: false
      })
    })
    const imageCenter = getScenePointByOrigin({
      object: revivedImage,
      originX: 'center',
      originY: 'center'
    })

    expect(result).toEqual([revivedImage])
    expect(imageCenter).toEqual(new Point(268, 284))
    expect(revivedImage.originX).toBe('center')
    expect(revivedImage.originY).toBe('center')
    expect(editor.errorManager.emitError).not.toHaveBeenCalled()
  })

  it('изображение в stretch-режиме сохраняет центр и размер исходного бокса', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup({
      useRealCanvasManager: true,
      montageBounds: {
        left: 100,
        top: 50,
        width: 810,
        height: 1080
      }
    })
    const revivedImage = createPlacementTestImage({
      id: 'template-image',
      left: 0.2,
      top: 0.1,
      width: 300,
      height: 300,
      intrinsicWidth: 100,
      intrinsicHeight: 600
    })

    jest.spyOn(util, 'enlivenObjects').mockResolvedValue([revivedImage as never])

    const result = await manager.applyTemplate({
      template: createImageTemplateDefinition({
        left: 0.2,
        top: 0.1,
        width: 300,
        height: 300,
        imageFit: 'stretch'
      })
    })
    const imageCenter = getScenePointByOrigin({
      object: revivedImage,
      originX: 'center',
      originY: 'center'
    })

    expect(result).toEqual([revivedImage])
    expect(imageCenter).toEqual(new Point(412, 308))
    expect(revivedImage.scaleX).toBe(3)
    expect(revivedImage.scaleY).toBe(0.5)
    expect(editor.errorManager.emitError).not.toHaveBeenCalled()
  })

  it('готовит image src через ImageManager до восстановления Fabric-объектов', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup({
      useRealCanvasManager: true,
      montageBounds: {
        left: 100,
        top: 50,
        width: 810,
        height: 1080
      }
    })
    const dataUrl = 'data:image/png;base64,bW9jaw=='
    const template = {
      id: 'template-data-image',
      meta: {
        baseWidth: 810,
        baseHeight: 1080,
        positionsNormalized: true
      },
      objects: [
        {
          type: 'image',
          id: 'template-image',
          src: dataUrl,
          left: 0.2,
          top: 0.1,
          width: 300,
          height: 300,
          originX: 'left',
          originY: 'top',
          scaleX: 1,
          scaleY: 1
        }
      ]
    }
    const preparedTemplate = {
      ...template,
      objects: [
        {
          ...template.objects[0],
          src: 'blob:prepared-image'
        }
      ]
    }
    const revivedImage = createPlacementTestImage({
      id: 'template-image',
      left: 0.2,
      top: 0.1,
      width: 300,
      height: 300,
      intrinsicWidth: 300,
      intrinsicHeight: 300
    })
    const prepareImageSourcesMock = editor.imageManager.prepareSerializedImageSources as jest.Mock
    prepareImageSourcesMock.mockResolvedValue(preparedTemplate)

    const enlivenObjectsSpy = jest.spyOn(util, 'enlivenObjects').mockResolvedValue([revivedImage as never])

    const result = await manager.applyTemplate({ template })
    const [serializedObjects] = enlivenObjectsSpy.mock.calls[0]
    const [serializedImage] = serializedObjects as Array<Record<string, unknown>>

    expect(result).toEqual([revivedImage])
    expect(prepareImageSourcesMock).toHaveBeenCalledWith({ state: template })
    expect(prepareImageSourcesMock.mock.invocationCallOrder[0]).toBeLessThan(
      enlivenObjectsSpy.mock.invocationCallOrder[0]
    )
    expect(serializedImage.src).toBe('blob:prepared-image')
    expect(template.objects[0].src).toBe(dataUrl)
    expect(editor.canvas.fire).toHaveBeenCalledWith('editor:template-applied', expect.objectContaining({
      template
    }))
    expect(editor.historyManager.saveState).toHaveBeenCalled()
    expect(editor.errorManager.emitError).not.toHaveBeenCalled()
  })

  it('после применения шаблона эмитит editor:template-applied с вставленными объектами и bounds монтажной области', async() => {
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
    const template = createShapeTemplateDefinition()

    jest.spyOn(util, 'enlivenObjects').mockResolvedValue([group])

    const result = await manager.applyTemplate({ template })

    expect(result).toEqual([group])
    expect(editor.canvas.fire).toHaveBeenCalledWith('editor:template-applied', {
      template,
      objects: [group],
      bounds: {
        left: 100,
        top: 50,
        width: 400,
        height: 300
      }
    })
  })

  // eslint-disable-next-line max-len
  it('длинный текст из шаблона получает стиль по всей строке из lineFontDefaults, а не только для тех символов что указаны в styles', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup()

    registerBackgroundTextbox()

    const result = await manager.applyTemplate({
      template: {
        id: 'template-with-long-background-text',
        meta: {
          baseWidth: 400,
          baseHeight: 300,
          positionsNormalized: true
        },
        objects: [{
          type: 'background-textbox',
          left: 0.25,
          top: 0.2,
          width: 137,
          text: 'Премиальное качество\nПремиальное качество',
          fontFamily: 'Arial',
          fontSize: 16,
          fill: '#101010',
          lineFontDefaults: {
            0: {
              fontFamily: 'Open Sans',
              fontSize: 28,
              fill: '#333333',
              fontWeight: 'bold'
            }
          },
          styles: [{
            start: 0,
            end: 3,
            style: {
              fontFamily: 'Open Sans',
              fontSize: 28,
              fill: '#ff5500',
              fontWeight: 'bold'
            }
          }]
        }]
      }
    })

    const textbox = result?.[0] as BackgroundTextbox
    const firstLineLength = 'Премиальное качество'.length
    const secondLineLength = 'Премиальное качество'.length
    const firstLineStyles = textbox.styles?.[0] ?? {}
    const secondLineStyles = textbox.styles?.[1] ?? {}

    expect(textbox).toBeInstanceOf(BackgroundTextbox)
    expect(textbox.lineFontDefaults).toEqual({
      0: {
        fontFamily: 'Open Sans',
        fontSize: 28,
        fill: '#333333',
        fontWeight: 'bold'
      },
      1: {
        fontFamily: 'Open Sans',
        fontSize: 28,
        fill: '#333333',
        fontWeight: 'bold'
      }
    })
    expect(Object.keys(firstLineStyles)).toHaveLength(firstLineLength)
    expect(Object.keys(secondLineStyles)).toHaveLength(secondLineLength)
    expect(firstLineStyles[0]).toMatchObject({
      fontFamily: 'Open Sans',
      fontSize: 28,
      fill: '#ff5500',
      fontWeight: 'bold'
    })
    expect(firstLineStyles[3]).toMatchObject({
      fontFamily: 'Open Sans',
      fontSize: 28,
      fill: '#333333',
      fontWeight: 'bold'
    })
    expect(secondLineStyles[0]).toMatchObject({
      fontFamily: 'Open Sans',
      fontSize: 28,
      fill: '#333333',
      fontWeight: 'bold'
    })
    expect(secondLineStyles[secondLineLength - 1]).toMatchObject({
      fontFamily: 'Open Sans',
      fontSize: 28,
      fill: '#333333',
      fontWeight: 'bold'
    })
    expect((editor.textManager.commitStandaloneTextScale as jest.Mock)).toHaveBeenCalledWith({
      target: textbox
    })
    expect(editor.errorManager.emitError).not.toHaveBeenCalled()
  })

  it('применяет фон из шаблона отдельно от остальных объектов', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup()
    const backgroundObject = createMockShapeNode({ id: 'background' }) as ReturnType<typeof createMockShapeNode> & {
      backgroundType?: 'color' | 'gradient' | 'image' | null
      fill?: string
    }
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

  it('при применении шаблона фигура получает новые id у группы и внутренних объектов', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup()
    const revivedShape = createMockShapeNode({ id: 'shape-node-source-id' })
    const revivedText = createMockShapeTextbox({ text: 'Template text' })

    revivedText.set({ id: 'shape-text-source-id' })

    const revivedGroup = new ShapeGroupObject([
      revivedShape as never,
      revivedText
    ], {
      id: 'shape-group-source-id',
      left: 100,
      top: 100,
      shapePresetKey: 'square'
    })

    jest.spyOn(util, 'enlivenObjects').mockResolvedValue([revivedGroup])

    const result = await manager.applyTemplate({
      template: createShapeTemplateDefinition()
    })
    const appliedIds = [
      revivedGroup.id,
      revivedShape.id,
      revivedText.id
    ]

    expect(result).toEqual([revivedGroup])
    expect(editor.errorManager.emitError).not.toHaveBeenCalled()
    expect(revivedGroup.id).toEqual(expect.any(String))
    expect(revivedGroup.id).not.toBe('shape-group-source-id')
    expect(revivedShape.id).toEqual(expect.any(String))
    expect(revivedShape.id).not.toBe('shape-node-source-id')
    expect(revivedText.id).toEqual(expect.any(String))
    expect(revivedText.id).not.toBe('shape-text-source-id')
    expect(new Set(appliedIds).size).toBe(3)
  })

  it('при применении mixed template новые id получают и фигура с вложенными объектами, и отдельный текст', async() => {
    const {
      manager,
      editor
    } = createTemplateManagerTestSetup()
    const revivedShape = createMockShapeNode({ id: 'mixed-shape-node-source-id' })
    const revivedShapeText = createMockShapeTextbox({ text: 'Shape text' })

    revivedShapeText.set({ id: 'mixed-shape-text-source-id' })

    const revivedGroup = new ShapeGroupObject([
      revivedShape as never,
      revivedShapeText
    ], {
      id: 'mixed-shape-group-source-id',
      left: 100,
      top: 100,
      shapePresetKey: 'square'
    })
    const revivedStandaloneText = new Textbox('Standalone text', {
      left: 220,
      top: 100,
      width: 140,
      originX: 'left',
      originY: 'top'
    }) as Textbox & {
      id?: string
    }

    revivedStandaloneText.set({ id: 'mixed-standalone-text-source-id' })

    jest.spyOn(util, 'enlivenObjects').mockImplementation(async(serializedObjects) => {
      const [serialized] = serializedObjects as Array<Record<string, unknown>>

      if (serialized.type === 'shape-group') return [revivedGroup] as never
      if (serialized.type === 'textbox') return [revivedStandaloneText] as never

      return [] as never
    })

    const result = await manager.applyTemplate({
      template: {
        id: 'mixed-template',
        meta: {
          baseWidth: 400,
          baseHeight: 300,
          positionsNormalized: true
        },
        objects: [
          {
            type: 'shape-group',
            left: 100,
            top: 100,
            shapePresetKey: 'square'
          },
          {
            type: 'textbox',
            left: 220,
            top: 100,
            width: 140,
            text: 'Standalone text'
          }
        ]
      }
    })
    const appliedIds = [
      revivedGroup.id,
      revivedShape.id,
      revivedShapeText.id,
      revivedStandaloneText.id
    ]

    expect(result).toEqual([revivedGroup, revivedStandaloneText])
    expect(editor.errorManager.emitError).not.toHaveBeenCalled()
    expect(revivedGroup.id).toEqual(expect.any(String))
    expect(revivedGroup.id).not.toBe('mixed-shape-group-source-id')
    expect(revivedShape.id).toEqual(expect.any(String))
    expect(revivedShape.id).not.toBe('mixed-shape-node-source-id')
    expect(revivedShapeText.id).toEqual(expect.any(String))
    expect(revivedShapeText.id).not.toBe('mixed-shape-text-source-id')
    expect(revivedStandaloneText.id).toEqual(expect.any(String))
    expect(revivedStandaloneText.id).not.toBe('mixed-standalone-text-source-id')
    expect(new Set(appliedIds).size).toBe(4)
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
