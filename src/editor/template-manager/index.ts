import {
  ActiveSelection,
  Canvas,
  FabricObject,
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
  [key: string]: unknown
}

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
}

export type ApplyTemplateOptions = {
  target?: FabricObject | ActiveSelection | null
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
    meta = {}
  }: SerializeTemplateOptions = {}): TemplateDefinition | null {
    const { canvas, montageArea, errorManager } = this.editor
    const activeObject = canvas.getActiveObject()
    const objectsToSerialize = TemplateManager._collectObjects(activeObject)

    if (!objectsToSerialize.length) {
      errorManager.emitWarning({
        origin: 'TemplateManager',
        method: 'serializeSelection',
        code: errorCodes.TEMPLATE_MANAGER.NO_OBJECTS_SELECTED,
        message: 'Нет объектов для сериализации шаблона'
      })
      return null
    }

    const referenceBounds = TemplateManager._getBounds(montageArea)
    const baseWidth = referenceBounds?.width ?? montageArea?.width ?? 0
    const baseHeight = referenceBounds?.height ?? montageArea?.height ?? 0

    const serializedObjects = objectsToSerialize
      .map((object) => TemplateManager._serializeObject(object, referenceBounds))

    const templateMeta: TemplateMeta = {
      ...meta,
      baseWidth,
      baseHeight,
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
   * Применяет шаблон к канвасу без очистки текущих объектов.
   * @param template - объект шаблона
   * @param options
   * @param options.target - целевой объект/область, относительно которой нужно расположить шаблон
   * @param options.data - данные для заполнения текстов по customData.templateField
   */
  public async applyTemplate(
    template: TemplateDefinition,
    { target = null, data }: ApplyTemplateOptions = {}
  ): Promise<FabricObject[] | null> {
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

    const referenceObject = target || canvas.getActiveObject() || montageArea
    const targetBounds = TemplateManager._getBounds(referenceObject)

    if (!targetBounds) {
      errorManager.emitWarning({
        origin: 'TemplateManager',
        method: 'applyTemplate',
        code: errorCodes.TEMPLATE_MANAGER.INVALID_TARGET,
        message: 'Не удалось определить область для применения шаблона'
      })
      return null
    }

    const meta = TemplateManager._normalizeMeta(template.meta, targetBounds)
    const scale = TemplateManager._calculateScale(meta, targetBounds)
    const offset = TemplateManager._calculateOffset(meta, targetBounds, scale)

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

        TemplateManager._transformObject(object, scale, offset)

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
        target: referenceObject
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
      const rect = object.getBoundingRect(true)
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
  private static _transformObject(
    object: FabricObject,
    scale: number,
    offset: { left: number; top: number }
  ): void {
    const left = TemplateManager._toNumber(object.left)
    const top = TemplateManager._toNumber(object.top)
    const scaleX = TemplateManager._toNumber(object.scaleX, 1)
    const scaleY = TemplateManager._toNumber(object.scaleY, 1)

    object.set({
      left: offset.left + (left * scale),
      top: offset.top + (top * scale),
      scaleX: scaleX * scale,
      scaleY: scaleY * scale
    })
  }

  /**
   * Нормализует мета-данные шаблона.
   */
  private static _normalizeMeta(meta: TemplateMeta | undefined, fallback: Bounds): TemplateMeta {
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
  private static _calculateScale(meta: TemplateMeta, target: Bounds): number {
    const widthRatio = target.width / (meta.baseWidth || target.width || 1)
    const heightRatio = target.height / (meta.baseHeight || target.height || 1)

    return Math.min(widthRatio, heightRatio)
  }

  /**
   * Возвращает смещение для шаблона.
   */
  private static _calculateOffset(meta: TemplateMeta, target: Bounds, scale: number): { left: number; top: number } {
    const contentWidth = meta.baseWidth * scale
    const contentHeight = meta.baseHeight * scale

    const horizontalPadding = (target.width - contentWidth) / 2
    const verticalPadding = (target.height - contentHeight) / 2

    return {
      left: target.left + horizontalPadding,
      top: target.top + verticalPadding
    }
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
  private static _serializeObject(object: FabricObject, bounds: Bounds | null): TemplateObjectData {
    const serialized = object.toDatalessObject([...OBJECT_SERIALIZATION_PROPS]) as TemplateObjectData

    if (!bounds) return serialized

    const left = TemplateManager._toNumber(serialized.left, object.left)
    const top = TemplateManager._toNumber(serialized.top, object.top)

    serialized.left = left - bounds.left
    serialized.top = top - bounds.top

    return serialized
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
