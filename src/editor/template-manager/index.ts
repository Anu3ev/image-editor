import {
  ActiveSelection,
  Canvas,
  FabricObject,
  Point,
  Textbox,
  util
} from 'fabric'
import { nanoid } from 'nanoid'

import { ImageEditor } from '../index'
import { errorCodes } from '../error-manager/error-codes'
import { OBJECT_SERIALIZATION_PROPS } from '../history-manager'

type Bounds = {
  left: number
  top: number
  width: number
  height: number
}

type TemplatePlaceholder = {
  id: string
  label?: string
  type: 'text' | 'image'
}

export type TemplateMeta = {
  baseWidth: number
  baseHeight: number
  previewId?: string
  requiredFonts?: string[]
  placeholders?: TemplatePlaceholder[]
  positionsNormalized?: boolean
  [key: string]: unknown
}

type Dimensions = {
  width: number
  height: number
}

const TEMPLATE_CENTER_X_KEY = '_templateCenterX'
const TEMPLATE_CENTER_Y_KEY = '_templateCenterY'

export type TemplateObjectData = Record<string, unknown> & {
  left?: number
  top?: number
  scaleX?: number
  scaleY?: number
  customData?: Record<string, unknown>
}

export type TemplateDefinition = {
  id: string
  meta: TemplateMeta
  objects: TemplateObjectData[]
}

export type SerializeTemplateOptions = {
  templateId?: string
  previewId?: string
  meta?: Partial<Omit<TemplateMeta, 'baseWidth' | 'baseHeight'>>
  withBackground?: boolean
}

export type ApplyTemplateOptions = {
  template: TemplateDefinition
  data?: Record<string, string>
}

export default class TemplateManager {
  /**
   * Инстанс редактора
   */
  public editor: ImageEditor

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Сериализует текущее выделение в описание шаблона.
   * @returns описание шаблона или null, если нечего сохранять
   */
  public serializeSelection({
    templateId,
    previewId,
    meta = {},
    withBackground = false
  }: SerializeTemplateOptions = {}): TemplateDefinition | null {
    const {
      canvas,
      montageArea,
      errorManager,
      backgroundManager
    } = this.editor
    const activeObject = canvas.getActiveObject()
    const objectsToSerialize = TemplateManager._collectObjects(activeObject)
    const backgroundObjects = withBackground && backgroundManager?.backgroundObject
      ? [backgroundManager.backgroundObject]
      : []
    const serializableObjects = [...objectsToSerialize, ...backgroundObjects]

    if (!serializableObjects.length) {
      errorManager.emitWarning({
        origin: 'TemplateManager',
        method: 'serializeSelection',
        code: errorCodes.TEMPLATE_MANAGER.NO_OBJECTS_SELECTED,
        message: 'Нет объектов для сериализации шаблона'
      })
      return null
    }

    const referenceBounds = TemplateManager._getBounds(montageArea)
    const baseSize = TemplateManager._getMontageSize(montageArea, referenceBounds)
    const baseWidth = baseSize.width
    const baseHeight = baseSize.height

    const serializedObjects = serializableObjects
      .map((object) => TemplateManager._serializeObject({
        object,
        bounds: referenceBounds,
        baseWidth,
        baseHeight,
        montageArea: montageArea ?? null
      }))

    const templateMeta: TemplateMeta = {
      ...meta,
      baseWidth,
      baseHeight,
      positionsNormalized: true,
      previewId: previewId ?? meta.previewId
    }

    const template: TemplateDefinition = {
      id: templateId ?? `template-${nanoid()}`,
      meta: templateMeta,
      objects: serializedObjects
    }

    return template
  }

  /**
   * Применяет шаблон к монтажной области без очистки текущих объектов.
   * @param options
   * @param options.template - описание шаблона
   * @param options.data - данные для заполнения текстов по customData.templateField
   */
  public async applyTemplate({
    template,
    data
  }: ApplyTemplateOptions): Promise<FabricObject[] | null> {
    const {
      canvas,
      montageArea,
      historyManager,
      errorManager
    } = this.editor

    if (!template?.objects?.length) {
      errorManager.emitWarning({
        origin: 'TemplateManager',
        method: 'applyTemplate',
        code: errorCodes.TEMPLATE_MANAGER.INVALID_TEMPLATE,
        message: 'Шаблон не содержит объектов'
      })
      return null
    }

    const montageBounds = TemplateManager._getBounds(montageArea)

    console.log('applyTemplate - монтажная область:', {
      'montageArea.width': montageArea?.width,
      'montageArea.height': montageArea?.height,
      'montageArea.scaleX': montageArea?.scaleX,
      'montageArea.scaleY': montageArea?.scaleY,
      'montageArea.getScaledWidth()': montageArea?.getScaledWidth?.(),
      'montageArea.getScaledHeight()': montageArea?.getScaledHeight?.(),
      montageBounds
    })

    if (!montageBounds) {
      errorManager.emitWarning({
        origin: 'TemplateManager',
        method: 'applyTemplate',
        code: errorCodes.TEMPLATE_MANAGER.INVALID_TARGET,
        message: 'Не удалось определить границы монтажной области'
      })
      return null
    }

    const targetSize = TemplateManager._getMontageSize(montageArea, montageBounds)
    const meta = TemplateManager._normalizeMeta(template.meta, targetSize)
    const scale = TemplateManager._calculateScale(meta, targetSize)
    const useRelativePositions = Boolean(meta.positionsNormalized)

    let shouldSaveHistory = false

    historyManager.suspendHistory()

    try {
      const enlivenedObjects = await TemplateManager._enlivenObjects(template.objects)

      if (!enlivenedObjects.length) {
        errorManager.emitWarning({
          origin: 'TemplateManager',
          method: 'applyTemplate',
          code: errorCodes.TEMPLATE_MANAGER.INVALID_TEMPLATE,
          message: 'Не удалось создать объекты шаблона'
        })
        return null
      }

      const insertedObjects = enlivenedObjects.map((object) => {
        TemplateManager._applyTextOverrides(object, data)

        TemplateManager._transformObject({
          object,
          scale,
          bounds: montageBounds,
          targetSize,
          baseWidth: meta.baseWidth,
          baseHeight: meta.baseHeight,
          montageArea,
          useRelativePositions
        })

        object.set({
          id: `${object.type}-${nanoid()}`,
          evented: true
        })

        canvas.add(object)

        return object
      })

      if (!insertedObjects.length) return null

      shouldSaveHistory = true

      TemplateManager._activateObjects(canvas, insertedObjects)

      canvas.requestRenderAll()
      canvas.fire('editor:template-applied', {
        template,
        objects: insertedObjects,
        bounds: montageBounds
      })

      return insertedObjects
    } catch (error) {
      errorManager.emitError({
        origin: 'TemplateManager',
        method: 'applyTemplate',
        code: errorCodes.TEMPLATE_MANAGER.APPLY_FAILED,
        message: 'Ошибка применения шаблона',
        data: {
          templateId: template?.id,
          error
        }
      })
      return null
    } finally {
      historyManager.resumeHistory()
      if (shouldSaveHistory) {
        historyManager.saveState()
      }
    }
  }

  /**
   * Подготавливает объекты для сериализации.
   */
  private static _collectObjects(
    object?: FabricObject | ActiveSelection | null
  ): FabricObject[] {
    if (!object) return []

    if (object instanceof ActiveSelection) {
      return object.getObjects()
    }

    return [object]
  }

  /**
   * Возвращает габариты объекта.
   */
  private static _getBounds(object?: FabricObject | null): Bounds | null {
    if (!object) return null

    try {
      // Принудительно пересчитываем координаты перед получением bounds
      object.setCoords()
      const rect = object.getBoundingRect(false, true)
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      }
    } catch {
      return null
    }
  }

  /**
   * Превращает plain-описание объектов в Fabric объекты.
   */
  private static async _enlivenObjects(objects: TemplateObjectData[]): Promise<FabricObject[]> {
    const enlivened = await util.enlivenObjects<FabricObject>(objects)
    return enlivened ?? []
  }

  /**
   * Трансформирует объект в координаты целевой области.
   */
  private static _transformObject({
    object,
    scale,
    bounds,
    targetSize,
    baseWidth,
    baseHeight,
    montageArea,
    useRelativePositions
  }: {
    object: FabricObject
    scale: number
    bounds: Bounds
    targetSize: Dimensions
    baseWidth: number
    baseHeight: number
    montageArea: FabricObject | null
    useRelativePositions: boolean
  }): void {
    const normalizedCenter = TemplateManager._resolveNormalizedCenter({
      object,
      baseWidth,
      baseHeight,
      useRelativePositions
    })
    const scaleX = TemplateManager._toNumber(object.scaleX, 1)
    const scaleY = TemplateManager._toNumber(object.scaleY, 1)

    const absoluteCenter = TemplateManager._denormalizeCenter({
      normalizedX: normalizedCenter.x,
      normalizedY: normalizedCenter.y,
      bounds,
      targetSize,
      montageArea,
      baseWidth,
      baseHeight
    })

    const nextScaleX = scaleX * scale
    const nextScaleY = scaleY * scale

    object.set({
      scaleX: nextScaleX,
      scaleY: nextScaleY
    })

    object.setPositionByOrigin(absoluteCenter, 'center', 'center')
    object.setCoords()

    console.log('_transformObject AFTER:', {
      'object.type': object.type,
      'absoluteCenter.x': absoluteCenter.x,
      'absoluteCenter.y': absoluteCenter.y,
      'object.left': object.left,
      'object.top': object.top,
      'object.getCenterPoint().x': object.getCenterPoint().x,
      'object.getCenterPoint().y': object.getCenterPoint().y
    })

    delete (object as Record<string, unknown>)[TEMPLATE_CENTER_X_KEY]
    delete (object as Record<string, unknown>)[TEMPLATE_CENTER_Y_KEY]
  }

  /**
   * Нормализует мета-данные шаблона.
   */
  private static _normalizeMeta(meta: TemplateMeta | undefined, fallback: Dimensions): TemplateMeta {
    const safeMeta: TemplateMeta = meta ?? {
      baseWidth: fallback.width,
      baseHeight: fallback.height
    }

    return {
      ...safeMeta,
      baseWidth: safeMeta.baseWidth ?? fallback.width,
      baseHeight: safeMeta.baseHeight ?? fallback.height
    }
  }

  /**
   * Возвращает коэффициент масштабирования.
   */
  private static _calculateScale(meta: TemplateMeta, target: Dimensions): number {
    const widthRatio = target.width / (meta.baseWidth || target.width || 1)
    const heightRatio = target.height / (meta.baseHeight || target.height || 1)

    return Math.min(widthRatio, heightRatio)
  }

  /**
   * Делает активным список объектов.
   */
  private static _activateObjects(canvas: Canvas, objects: FabricObject[]): void {
    if (!objects.length) return

    canvas.discardActiveObject()

    if (objects.length === 1) {
      canvas.setActiveObject(objects[0])
      return
    }

    const selection = new ActiveSelection(objects, { canvas })
    canvas.setActiveObject(selection)
  }

  /**
   * Применяет текстовые значения из customData или переданных данных.
   */
  private static _applyTextOverrides(
    object: FabricObject,
    data?: Record<string, string>
  ): void {
    if (!('text' in object)) return

    const customData = object.customData as Record<string, unknown> | undefined
    const templateField = typeof customData?.templateField === 'string' ? customData.templateField : undefined
    const fallbackText = typeof customData?.text === 'string' ? customData.text : undefined
    const providedText = templateField && data ? data[templateField] : undefined
    const nextValue = providedText ?? fallbackText

    if (typeof nextValue === 'string') {
      (object as Textbox).text = nextValue
    }
  }

  /**
   * Сериализует объект относительно монтажной области.
   */
  private static _serializeObject({
    object,
    bounds,
    baseWidth,
    baseHeight,
    montageArea
  }: {
    object: FabricObject
    bounds: Bounds | null
    baseWidth: number
    baseHeight: number
    montageArea: FabricObject | null
  }): TemplateObjectData {
    const serialized = object.toDatalessObject([...OBJECT_SERIALIZATION_PROPS]) as TemplateObjectData

    if (!bounds) return serialized

    const rect = object.getBoundingRect(false, true)
    const safeWidth = baseWidth || bounds.width || 1
    const safeHeight = baseHeight || bounds.height || 1

    const normalizedCenter = TemplateManager._calculateNormalizedCenter({
      object,
      montageArea,
      baseWidth: safeWidth,
      baseHeight: safeHeight,
      bounds
    })

    if (normalizedCenter) {
      serialized[TEMPLATE_CENTER_X_KEY] = normalizedCenter.x
      serialized[TEMPLATE_CENTER_Y_KEY] = normalizedCenter.y
    } else {
      const centerPoint = object.getCenterPoint()
      serialized[TEMPLATE_CENTER_X_KEY] = (centerPoint.x - bounds.left) / safeWidth
      serialized[TEMPLATE_CENTER_Y_KEY] = (centerPoint.y - bounds.top) / safeHeight
    }

    serialized.left = (rect.left - bounds.left) / safeWidth
    serialized.top = (rect.top - bounds.top) / safeHeight

    return serialized
  }

  private static _normalizeStoredValue({
    value,
    dimension,
    useRelativePositions
  }: {
    value: unknown
    dimension: number
    useRelativePositions: boolean
  }): number {
    const numericValue = TemplateManager._toNumber(value)

    if (useRelativePositions) return numericValue

    const safeDimension = dimension || 1
    return numericValue / safeDimension
  }

  private static _resolveNormalizedCenter({
    object,
    baseWidth,
    baseHeight,
    useRelativePositions
  }: {
    object: FabricObject
    baseWidth: number
    baseHeight: number
    useRelativePositions: boolean
  }): { x: number; y: number } {
    const objectRecord = object as Record<string, unknown>
    const hasStoredCenter = typeof objectRecord[TEMPLATE_CENTER_X_KEY] === 'number'
      && typeof objectRecord[TEMPLATE_CENTER_Y_KEY] === 'number'

    if (hasStoredCenter) {
      return {
        x: TemplateManager._normalizeStoredValue({
          value: objectRecord[TEMPLATE_CENTER_X_KEY],
          dimension: baseWidth,
          useRelativePositions
        }),
        y: TemplateManager._normalizeStoredValue({
          value: objectRecord[TEMPLATE_CENTER_Y_KEY],
          dimension: baseHeight,
          useRelativePositions
        })
      }
    }

    const normalizedLeft = TemplateManager._normalizeStoredValue({
      value: object.left,
      dimension: baseWidth,
      useRelativePositions
    })
    const normalizedTop = TemplateManager._normalizeStoredValue({
      value: object.top,
      dimension: baseHeight,
      useRelativePositions
    })
    const normalizedWidth = TemplateManager._toNumber(object.width) / (baseWidth || 1)
    const normalizedHeight = TemplateManager._toNumber(object.height) / (baseHeight || 1)

    return {
      x: normalizedLeft + (normalizedWidth / 2),
      y: normalizedTop + (normalizedHeight / 2)
    }
  }

  private static _denormalizeCenter({
    normalizedX,
    normalizedY,
    bounds,
    targetSize,
    montageArea
  }: {
    normalizedX: number
    normalizedY: number
    bounds: Bounds
    targetSize: Dimensions
    montageArea: FabricObject | null
    baseWidth: number
    baseHeight: number
  }): Point {
    if (!montageArea) {
      return new Point(
        bounds.left + normalizedX * (targetSize.width || bounds.width),
        bounds.top + normalizedY * (targetSize.height || bounds.height)
      )
    }

    // Используем масштабированный размер из bounds
    const scaledWidth = bounds.width
    const scaledHeight = bounds.height

    // КЛЮЧ: денормализуем относительно левого верхнего угла bounds
    const absoluteX = bounds.left + (normalizedX * scaledWidth)
    const absoluteY = bounds.top + (normalizedY * scaledHeight)

    console.log('_denormalizeCenter:', {
      normalizedX,
      normalizedY,
      'bounds.left': bounds.left,
      'bounds.top': bounds.top,
      'bounds.width': bounds.width,
      'bounds.height': bounds.height,
      absoluteX,
      absoluteY
    })

    return new Point(absoluteX, absoluteY)
  }

  private static _calculateNormalizedCenter({
    object,
    montageArea,
    baseWidth: _baseWidth,
    baseHeight: _baseHeight,
    bounds
  }: {
    object: FabricObject
    montageArea: FabricObject | null
    baseWidth: number
    baseHeight: number
    bounds: Bounds | null
  }): { x: number; y: number } | null {
    if (!montageArea || !bounds) return null

    try {
      const centerPoint = object.getCenterPoint()

      // Используем масштабированный размер из bounds
      const scaledWidth = bounds.width
      const scaledHeight = bounds.height

      // КЛЮЧ: нормализуем относительно левого верхнего угла bounds, а не центра
      const offsetX = centerPoint.x - bounds.left
      const offsetY = centerPoint.y - bounds.top

      // Нормализуем в диапазон [0, 1]
      const normalizedX = offsetX / scaledWidth
      const normalizedY = offsetY / scaledHeight

      console.log('_calculateNormalizedCenter:', {
        'object.type': object.type,
        'centerPoint.x': centerPoint.x,
        'centerPoint.y': centerPoint.y,
        'bounds.left': bounds.left,
        'bounds.top': bounds.top,
        'bounds.width': bounds.width,
        'bounds.height': bounds.height,
        offsetX,
        offsetY,
        normalizedX,
        normalizedY
      })

      return {
        x: normalizedX,
        y: normalizedY
      }
    } catch {
      return null
    }
  }

  private static _getMontageSize(montageArea?: FabricObject | null, bounds?: Bounds | null): Dimensions {
    if (montageArea) {
      return {
        width: montageArea.getScaledWidth?.() || montageArea.width || bounds?.width || 0,
        height: montageArea.getScaledHeight?.() || montageArea.height || bounds?.height || 0
      }
    }

    return {
      width: bounds?.width || 0,
      height: bounds?.height || 0
    }
  }

  private static _toNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    if (typeof fallback === 'number' && Number.isFinite(fallback)) {
      return fallback
    }

    return 0
  }
}
