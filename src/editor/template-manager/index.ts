import {
  ActiveSelection,
  Canvas,
  FabricImage,
  FabricObject,
  Point,
  Textbox,
  util
} from 'fabric'
import { nanoid } from 'nanoid'

import { ImageEditor } from '../index'
import { errorCodes } from '../error-manager/error-codes'
import { OBJECT_SERIALIZATION_PROPS } from '../history-manager'
import type { GradientBackground } from '../background-manager'

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
    const baseSize = TemplateManager._getMontageSize({ montageArea, bounds: referenceBounds })
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
      errorManager,
      backgroundManager
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

    if (!montageBounds) {
      errorManager.emitWarning({
        origin: 'TemplateManager',
        method: 'applyTemplate',
        code: errorCodes.TEMPLATE_MANAGER.INVALID_TARGET,
        message: 'Не удалось определить границы монтажной области'
      })
      return null
    }

    const targetSize = TemplateManager._getMontageSize({ montageArea, bounds: montageBounds })
    const meta = TemplateManager._normalizeMeta({ meta: template.meta, fallback: targetSize })
    const scale = TemplateManager._calculateScale({ meta, target: targetSize })
    const useRelativePositions = Boolean(meta.positionsNormalized)

    let shouldSaveHistory = false
    let backgroundApplied = false

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

      const { backgroundObject, contentObjects } = TemplateManager._extractBackgroundObject(enlivenedObjects)

      if (backgroundObject) {
        backgroundApplied = await TemplateManager._applyBackgroundFromObject({
          backgroundObject,
          backgroundManager,
          errorManager
        })
      }

      const insertedObjects = contentObjects.map((object) => {
        TemplateManager._applyTextOverrides({ object, data })

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

      if (!insertedObjects.length && !backgroundApplied) return null

      shouldSaveHistory = insertedObjects.length > 0 || backgroundApplied

      if (insertedObjects.length) {
        TemplateManager._activateObjects({ canvas, objects: insertedObjects })
      }

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
    const scaleX = TemplateManager._toNumber({ value: object.scaleX, fallback: 1 })
    const scaleY = TemplateManager._toNumber({ value: object.scaleY, fallback: 1 })

    const absoluteCenter = TemplateManager._denormalizeCenter({
      normalizedX: normalizedCenter.x,
      normalizedY: normalizedCenter.y,
      bounds,
      targetSize,
      montageArea
    })

    const nextScaleX = scaleX * scale
    const nextScaleY = scaleY * scale

    object.set({
      scaleX: nextScaleX,
      scaleY: nextScaleY
    })

    object.setPositionByOrigin(absoluteCenter, 'center', 'center')
    object.setCoords()

    const objectRecord = object as Record<string, unknown>
    delete objectRecord[TEMPLATE_CENTER_X_KEY]
    delete objectRecord[TEMPLATE_CENTER_Y_KEY]
  }

  /**
   * Нормализует мета-данные шаблона.
   */
  private static _normalizeMeta({
    meta,
    fallback
  }: {
    meta: TemplateMeta | undefined
    fallback: Dimensions
  }): TemplateMeta {
    const { width, height } = fallback

    const safeMeta: TemplateMeta = meta ?? {
      baseWidth: width,
      baseHeight: height
    }

    return {
      ...safeMeta,
      baseWidth: safeMeta.baseWidth ?? width,
      baseHeight: safeMeta.baseHeight ?? height
    }
  }

  /**
   * Возвращает коэффициент масштабирования.
   */
  private static _calculateScale({
    meta,
    target
  }: {
    meta: TemplateMeta
    target: Dimensions
  }): number {
    const { width, height } = target
    const widthRatio = width / (meta.baseWidth || width || 1)
    const heightRatio = height / (meta.baseHeight || height || 1)

    return Math.min(widthRatio, heightRatio)
  }

  /**
   * Делает активным список объектов.
   */
  private static _activateObjects({
    canvas,
    objects
  }: {
    canvas: Canvas
    objects: FabricObject[]
  }): void {
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
  private static _applyTextOverrides({
    object,
    data
  }: {
    object: FabricObject
    data?: Record<string, string>
  }): void {
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

    const {
      left: boundsLeft,
      top: boundsTop,
      width: boundsWidth,
      height: boundsHeight
    } = bounds
    const rect = object.getBoundingRect(false, true)
    const safeWidth = baseWidth || boundsWidth || 1
    const safeHeight = baseHeight || boundsHeight || 1

    const normalizedCenter = TemplateManager._calculateNormalizedCenter({
      object,
      montageArea,
      bounds
    })

    if (normalizedCenter) {
      serialized[TEMPLATE_CENTER_X_KEY] = normalizedCenter.x
      serialized[TEMPLATE_CENTER_Y_KEY] = normalizedCenter.y
    } else {
      const centerPoint = object.getCenterPoint()
      serialized[TEMPLATE_CENTER_X_KEY] = (centerPoint.x - boundsLeft) / safeWidth
      serialized[TEMPLATE_CENTER_Y_KEY] = (centerPoint.y - boundsTop) / safeHeight
    }

    serialized.left = (rect.left - boundsLeft) / safeWidth
    serialized.top = (rect.top - boundsTop) / safeHeight

    return serialized
  }

  private static _extractBackgroundObject(objects: FabricObject[]): {
    backgroundObject: FabricObject | null
    contentObjects: FabricObject[]
  } {
    const index = objects.findIndex((object) => object.id === 'background')

    if (index === -1) {
      return { backgroundObject: null, contentObjects: objects }
    }

    const backgroundObject = objects[index]
    const contentObjects = objects.filter((_, i) => i !== index)

    return { backgroundObject, contentObjects }
  }

  private static async _applyBackgroundFromObject({
    backgroundObject,
    backgroundManager,
    errorManager
  }: {
    backgroundObject: FabricObject
    backgroundManager: ImageEditor['backgroundManager']
    errorManager: ImageEditor['errorManager']
  }): Promise<boolean> {
    try {
      const { fill, customData: rawCustomData } = backgroundObject
      const { backgroundType } = (backgroundObject as FabricObject & { backgroundType?: unknown })
      const customData = TemplateManager._cloneCustomData(rawCustomData)

      if (backgroundType === 'color' && typeof fill === 'string') {
        backgroundManager.setColorBackground({
          color: fill,
          customData,
          withoutSave: true
        })
        return true
      }

      if (backgroundType === 'gradient') {
        const gradient = TemplateManager._convertGradientToOptions(fill)

        if (gradient) {
          backgroundManager.setGradientBackground({
            gradient,
            customData,
            withoutSave: true
          })
          return true
        }
      }

      if (backgroundType === 'image') {
        const src = TemplateManager._getImageSource(backgroundObject)

        if (src) {
          await backgroundManager.setImageBackground({
            imageSource: src,
            customData,
            withoutSave: true
          })
          return true
        }
      }
    } catch (error) {
      errorManager.emitWarning({
        origin: 'TemplateManager',
        method: 'applyTemplate',
        code: errorCodes.TEMPLATE_MANAGER.APPLY_FAILED,
        message: 'Не удалось применить фон из шаблона',
        data: error as object
      })
    }

    return false
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
    const numericValue = TemplateManager._toNumber({ value })

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
    const normalizedWidth = TemplateManager._toNumber({ value: object.width }) / (baseWidth || 1)
    const normalizedHeight = TemplateManager._toNumber({ value: object.height }) / (baseHeight || 1)

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
  }): Point {
    const { left, top, width, height } = bounds

    if (!montageArea) {
      const x = left + normalizedX * (targetSize.width || width)
      const y = top + normalizedY * (targetSize.height || height)

      return new Point(x, y)
    }

    // КЛЮЧ: денормализуем относительно левого верхнего угла bounds
    const absoluteX = left + (normalizedX * width)
    const absoluteY = top + (normalizedY * height)

    return new Point(absoluteX, absoluteY)
  }

  private static _calculateNormalizedCenter({
    object,
    montageArea,
    bounds
  }: {
    object: FabricObject
    montageArea: FabricObject | null
    bounds: Bounds | null
  }): { x: number; y: number } | null {
    if (!montageArea || !bounds) return null

    try {
      const centerPoint = object.getCenterPoint()

      // Используем масштабированный размер из bounds
      const { left, top, width, height } = bounds

      // КЛЮЧ: нормализуем относительно левого верхнего угла bounds, а не центра
      const offsetX = centerPoint.x - left
      const offsetY = centerPoint.y - top

      // Нормализуем в диапазон [0, 1]
      const normalizedX = offsetX / width
      const normalizedY = offsetY / height

      return {
        x: normalizedX,
        y: normalizedY
      }
    } catch {
      return null
    }
  }

  private static _getMontageSize({
    montageArea,
    bounds
  }: {
    montageArea?: FabricObject | null
    bounds?: Bounds | null
  }): Dimensions {
    const boundsWidth = bounds?.width || 0
    const boundsHeight = bounds?.height || 0

    if (montageArea) {
      return {
        width: montageArea.getScaledWidth?.() || montageArea.width || boundsWidth,
        height: montageArea.getScaledHeight?.() || montageArea.height || boundsHeight
      }
    }

    return {
      width: boundsWidth,
      height: boundsHeight
    }
  }

  private static _convertGradientToOptions(fill: unknown): GradientBackground | null {
    if (!fill || typeof fill !== 'object') return null

    const { type, coords, colorStops } = fill as {
      type?: unknown
      coords?: Record<string, unknown>
      colorStops?: Array<{ offset?: unknown; color?: unknown }>
    }

    const stops = Array.isArray(colorStops) ? colorStops : []
    const firstStop = stops[0]
    const lastStop = stops[stops.length - 1]

    const startColor = typeof firstStop?.color === 'string' ? firstStop.color : undefined
    const endColor = typeof lastStop?.color === 'string' ? lastStop.color : startColor
    const startPosition = typeof firstStop?.offset === 'number' ? firstStop.offset * 100 : undefined
    const endPosition = typeof lastStop?.offset === 'number' ? lastStop.offset * 100 : undefined

    if (!startColor || !endColor || !coords) return null

    if (type === 'linear') {
      const { x1, y1, x2, y2 } = coords

      if (
        typeof x1 === 'number'
        && typeof y1 === 'number'
        && typeof x2 === 'number'
        && typeof y2 === 'number'
      ) {
        const angle = TemplateManager._coordsToAngle({ x1, y1, x2, y2 })

        return {
          type: 'linear' as const,
          angle,
          startColor,
          endColor,
          startPosition,
          endPosition
        }
      }
    }

    if (type === 'radial') {
      const { x1, y1, r2 } = coords

      if (
        typeof x1 === 'number'
        && typeof y1 === 'number'
        && typeof r2 === 'number'
      ) {
        return {
          type: 'radial' as const,
          centerX: x1 * 100,
          centerY: y1 * 100,
          radius: r2 * 100,
          startColor,
          endColor,
          startPosition,
          endPosition
        }
      }
    }

    return null
  }

  private static _coordsToAngle({
    x1,
    y1,
    x2,
    y2
  }: {
    x1: number
    y1: number
    x2: number
    y2: number
  }): number {
    const angleRad = Math.atan2(y2 - y1, x2 - x1)
    const angleDeg = (angleRad * 180) / Math.PI
    return (angleDeg + 360) % 360
  }

  private static _cloneCustomData(customData: unknown): Record<string, unknown> | undefined {
    if (!customData || typeof customData !== 'object') return undefined
    return { ...(customData as Record<string, unknown>) }
  }

  private static _getImageSource(image: FabricObject): string | null {
    const asImage = image as FabricImage

    if ('getSrc' in image && typeof asImage.getSrc === 'function') {
      const src = asImage.getSrc()
      if (src) return src
    }

    if ('getElement' in image && typeof asImage.getElement === 'function') {
      const element = asImage.getElement()

      if (element instanceof HTMLImageElement) {
        return element.currentSrc || element.src || null
      }
    }

    const asRecord = image as Record<string, unknown>
    if (typeof asRecord.src === 'string') {
      return asRecord.src as string
    }

    return null
  }

  private static _toNumber({
    value,
    fallback = 0
  }: {
    value: unknown
    fallback?: number
  }): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    if (typeof fallback === 'number' && Number.isFinite(fallback)) {
      return fallback
    }

    return 0
  }
}
