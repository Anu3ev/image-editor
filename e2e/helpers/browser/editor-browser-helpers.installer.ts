import type {
  BoundsInfo,
  BrowserBoundedObject,
  BrowserEditorWindow,
  BrowserGroupObject,
  BrowserObject,
  BrowserSerializableObject,
  BrowserSerializer,
  BrowserShapeNodeObject,
  NullableBoundsInfo
} from './editor-browser-helpers.types'

/**
 * Устанавливает browser-side хелперы на window редактора.
 */
export function installEditorBrowserHelpers(): void {
  const browserWindow = window as BrowserEditorWindow

  /**
   * Безопасно приводит unknown-значение к plain-object.
   */
  function toBrowserObject({ value }: { value: unknown }): BrowserObject {
    if (typeof value !== 'object') {
      return {}
    }

    if (value === null) {
      return {}
    }

    return value as BrowserObject
  }

  /**
   * Возвращает тип shape-ноды или пустую строку.
   */
  function resolveShapeNodeType({ value }: { value: unknown }): string {
    const shapeNode = toBrowserObject({ value }) as BrowserShapeNodeObject

    return shapeNode.shapeNodeType ?? ''
  }

  /**
   * Возвращает число или defaultValue.
   */
  function resolveNumber({ value, defaultValue }: { value: unknown, defaultValue: number }): number {
    if (typeof value === 'number') return value

    return defaultValue
  }

  /**
   * Возвращает число или null.
   */
  function resolveNullableNumber({ value }: { value: unknown }): number | null {
    if (typeof value === 'number') return value

    return null
  }

  /**
   * Возвращает boolean или defaultValue.
   */
  function resolveBoolean({ value, defaultValue }: { value: unknown, defaultValue: boolean }): boolean {
    if (typeof value === 'boolean') return value

    return defaultValue
  }

  /**
   * Возвращает строку или defaultValue.
   */
  function resolveString({ value, defaultValue }: { value: unknown, defaultValue: string }): string {
    if (typeof value === 'string') return value

    return defaultValue
  }

  /**
   * Преобразует undefined/null в null, остальные значения оставляет как есть.
   */
  function resolveNullableValue({ value }: { value: unknown }): unknown | null {
    if (value === undefined || value === null) {
      return null
    }

    return value
  }

  /**
   * Возвращает boolean-значение или null.
   */
  function resolveNullableBoolean({ value }: { value: unknown }): boolean | null {
    if (typeof value === 'boolean') return value

    return null
  }

  /**
   * Возвращает дочерние canvas-объекты группы.
   */
  function getGroupObjects({ group }: { group: unknown }): BrowserObject[] {
    const groupNode = toBrowserObject({ value: group }) as BrowserGroupObject
    const rawObjects = groupNode.getObjects()
    if (!Array.isArray(rawObjects)) {
      return []
    }

    const result: BrowserObject[] = []
    for (let index = 0; index < rawObjects.length; index += 1) {
      result.push(toBrowserObject({ value: rawObjects[index] }))
    }

    return result
  }

  /**
   * Возвращает boundingRect объекта.
   */
  function getBoundingRect({ target }: { target: unknown }): BrowserObject | null {
    const canvasObject = toBrowserObject({ value: target }) as BrowserBoundedObject
    const bounds = canvasObject.getBoundingRect()
    return toBrowserObject({ value: bounds })
  }

  /**
   * Преобразует bounds в набор числовых значений (с fallback в 0).
   */
  function createBoundsInfo({ bounds }: { bounds: BrowserObject | null }): BoundsInfo {
    const left = resolveNumber({
      value: bounds?.left,
      defaultValue: 0
    })
    const top = resolveNumber({
      value: bounds?.top,
      defaultValue: 0
    })
    const width = resolveNumber({
      value: bounds?.width,
      defaultValue: 0
    })
    const height = resolveNumber({
      value: bounds?.height,
      defaultValue: 0
    })

    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height
    }
  }

  /**
   * Преобразует bounds в nullable-набор для shape-ноды.
   */
  function createNullableBoundsInfo({ bounds }: { bounds: BrowserObject | null }): NullableBoundsInfo {
    const left = resolveNullableNumber({ value: bounds?.left })
    const top = resolveNullableNumber({ value: bounds?.top })
    const width = resolveNullableNumber({ value: bounds?.width })
    const height = resolveNullableNumber({ value: bounds?.height })

    return {
      left,
      top,
      width,
      height
    }
  }

  /**
   * Складывает два nullable-числа. Если хотя бы одно null — возвращает null.
   */
  function sumNullableNumbers({ first, second }: { first: number | null, second: number | null }): number | null {
    if (first === null || second === null) return null

    return first + second
  }

  /**
   * Выбирает shape-ноду внутри композитной группы.
   */
  function resolveShapeNode({ group }: { group: unknown }): BrowserObject | null {
    const objects = getGroupObjects({ group })
    if (!objects.length) return null

    for (let index = 0; index < objects.length; index += 1) {
      const shapeNode = objects[index]
      if (resolveShapeNodeType({ value: shapeNode }) === 'shape') {
        return shapeNode
      }
    }

    for (let index = 0; index < objects.length; index += 1) {
      const shapeNode = objects[index]
      if (resolveShapeNodeType({ value: shapeNode }) !== 'text') {
        return shapeNode
      }
    }

    return null
  }

  /**
   * Возвращает id или объект canvas по индексу.
   */
  function resolveTarget({ objectIndex, id }: { objectIndex?: number, id?: string }): unknown {
    if (id !== undefined) return id

    if (objectIndex === undefined) return undefined

    const objects = browserWindow.editor.canvasManager.getObjects()
    if (!Array.isArray(objects)) return undefined

    return objects[objectIndex]
  }

  /**
   * Возвращает canvas-объект по индексу или id.
   */
  function resolveCanvasObject({ objectIndex, id }: { objectIndex?: number, id?: string }): unknown {
    const objects = browserWindow.editor.canvasManager.getObjects()
    if (!Array.isArray(objects)) return undefined

    if (typeof id === 'string') {
      for (let index = 0; index < objects.length; index += 1) {
        const object = toBrowserObject({ value: objects[index] }) as BrowserSerializableObject
        if (object.id === id) return objects[index]
      }

      return undefined
    }

    if (objectIndex === undefined) return undefined

    return objects[objectIndex]
  }

  /**
   * Сериализует общий editor-объект.
   */
  const serializeEditorObject: BrowserSerializer = (obj: unknown) => {
    const editorObject = toBrowserObject({ value: obj }) as BrowserSerializableObject

    return {
      id: editorObject.id,
      type: editorObject.type,
      left: editorObject.left,
      top: editorObject.top,
      width: editorObject.width,
      height: editorObject.height,
      scaleX: editorObject.scaleX,
      scaleY: editorObject.scaleY,
      angle: editorObject.angle,
      fill: resolveNullableValue({ value: editorObject.fill }),
      stroke: resolveNullableValue({ value: editorObject.stroke }),
      strokeWidth: resolveNumber({
        value: editorObject.strokeWidth,
        defaultValue: 0
      }),
      opacity: resolveNumber({
        value: editorObject.opacity,
        defaultValue: 1
      }),
      visible: resolveBoolean({
        value: editorObject.visible,
        defaultValue: true
      }),
      selectable: resolveBoolean({
        value: editorObject.selectable,
        defaultValue: true
      }),
      flipX: resolveBoolean({
        value: editorObject.flipX,
        defaultValue: false
      }),
      flipY: resolveBoolean({
        value: editorObject.flipY,
        defaultValue: false
      })
    }
  }

  /**
   * Сериализует shape-объект.
   */
  const serializeShapeObject: BrowserSerializer = (obj: unknown) => {
    const shapeObject = toBrowserObject({ value: obj }) as BrowserSerializableObject

    return {
      ...serializeEditorObject(obj),
      shapeComposite: resolveBoolean({
        value: shapeObject.shapeComposite,
        defaultValue: false
      }),
      shapePresetKey: resolveString({
        value: shapeObject.shapePresetKey,
        defaultValue: ''
      }),
      shapeAlignHorizontal: resolveString({
        value: shapeObject.shapeAlignHorizontal,
        defaultValue: 'center'
      }),
      shapeAlignVertical: resolveString({
        value: shapeObject.shapeAlignVertical,
        defaultValue: 'middle'
      }),
      shapeFill: shapeObject.shapeFill,
      shapeStroke: shapeObject.shapeStroke,
      shapeStrokeWidth: shapeObject.shapeStrokeWidth,
      shapeOpacity: shapeObject.shapeOpacity,
      shapeRounding: shapeObject.shapeRounding
    }
  }

  /**
   * Сериализует текстовый узел внутри shape-группы.
   */
  const serializeShapeTextObject: BrowserSerializer = (obj: unknown) => {
    const textObject = toBrowserObject({ value: obj }) as BrowserSerializableObject

    return {
      ...serializeEditorObject(obj),
      text: resolveString({
        value: textObject.text,
        defaultValue: ''
      }),
      textAlign: resolveString({
        value: textObject.textAlign,
        defaultValue: 'center'
      }),
      fontSize: resolveNumber({
        value: textObject.fontSize,
        defaultValue: 0
      }),
      fontWeight: resolveString({
        value: textObject.fontWeight,
        defaultValue: 'normal'
      }),
      fontStyle: resolveString({
        value: textObject.fontStyle,
        defaultValue: 'normal'
      }),
      underline: resolveBoolean({
        value: textObject.underline,
        defaultValue: false
      }),
      linethrough: resolveBoolean({
        value: textObject.linethrough,
        defaultValue: false
      }),
      isEditing: resolveBoolean({
        value: textObject.isEditing,
        defaultValue: false
      }),
      evented: resolveBoolean({
        value: textObject.evented,
        defaultValue: true
      }),
      lockMovementX: resolveBoolean({
        value: textObject.lockMovementX,
        defaultValue: false
      }),
      lockMovementY: resolveBoolean({
        value: textObject.lockMovementY,
        defaultValue: false
      })
    }
  }

  /**
   * Сериализует snapshot масштабирования shape-группы.
   */
  const serializeShapeScaleSnapshot: BrowserSerializer = (obj: unknown) => {
    const groupObject = toBrowserObject({ value: obj }) as BrowserSerializableObject
    const shapeNode = resolveShapeNode({ group: obj })
    const shapeNodeObject = toBrowserObject({ value: shapeNode }) as BrowserShapeNodeObject

    const groupBounds = getBoundingRect({ target: obj })
    const shapeBounds = getBoundingRect({ target: shapeNode })
    const groupBoundsInfo = createBoundsInfo({ bounds: groupBounds })
    const shapeBoundsInfo = createNullableBoundsInfo({ bounds: shapeBounds })
    const shapeBoundsRight = sumNullableNumbers({
      first: shapeBoundsInfo.left,
      second: shapeBoundsInfo.width
    })
    const shapeBoundsBottom = sumNullableNumbers({
      first: shapeBoundsInfo.top,
      second: shapeBoundsInfo.height
    })

    return {
      left: resolveNumber({
        value: groupObject.left,
        defaultValue: 0
      }),
      top: resolveNumber({
        value: groupObject.top,
        defaultValue: 0
      }),
      width: resolveNumber({
        value: groupObject.width,
        defaultValue: 0
      }),
      height: resolveNumber({
        value: groupObject.height,
        defaultValue: 0
      }),
      scaleX: resolveNumber({
        value: groupObject.scaleX,
        defaultValue: 1
      }),
      scaleY: resolveNumber({
        value: groupObject.scaleY,
        defaultValue: 1
      }),
      shapeStrokeUniform: resolveNullableBoolean({ value: shapeNodeObject.strokeUniform }),
      shapeStrokeWidth: resolveNullableNumber({ value: shapeNodeObject.strokeWidth }),
      groupBoundsLeft: groupBoundsInfo.left,
      groupBoundsTop: groupBoundsInfo.top,
      groupBoundsWidth: groupBoundsInfo.width,
      groupBoundsHeight: groupBoundsInfo.height,
      groupBoundsRight: groupBoundsInfo.right,
      groupBoundsBottom: groupBoundsInfo.bottom,
      shapeBoundsLeft: shapeBoundsInfo.left,
      shapeBoundsTop: shapeBoundsInfo.top,
      shapeBoundsWidth: shapeBoundsInfo.width,
      shapeBoundsHeight: shapeBoundsInfo.height,
      shapeBoundsRight,
      shapeBoundsBottom
    }
  }

  /**
   * Регистрирует serializer-хелперы на window.
   */
  function installBrowserSerializers(): void {
    browserWindow.__serializeEditorObject = serializeEditorObject
    browserWindow.__serializeShapeObject = serializeShapeObject
    browserWindow.__serializeShapeTextObject = serializeShapeTextObject
    browserWindow.__serializeShapeScaleSnapshot = serializeShapeScaleSnapshot
  }

  /**
   * Регистрирует resolver-хелперы на window.
   */
  function installBrowserResolvers(): void {
    browserWindow.__resolveShapeNode = (group: unknown) => resolveShapeNode({ group })
    browserWindow.__resolveTarget = (objectIndex?: number, id?: string) => resolveTarget({ objectIndex, id })
    browserWindow.__resolveCanvasObject = (
      objectIndex?: number,
      id?: string
    ) => resolveCanvasObject({ objectIndex, id })
  }

  installBrowserSerializers()
  installBrowserResolvers()
}
