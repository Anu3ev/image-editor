import type {
  BrowserEditorHelpers,
  BoundsInfo,
  BrowserBoundedObject,
  BrowserEditorWindow,
  BrowserGroupObject,
  BrowserObject,
  BrowserSerializableObject,
  BrowserSerializer,
  BrowserShapeNodeObject,
  BrowserTextSelectionStyleInfo,
  BrowserTextSelectionStyleParams,
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
   * Возвращает boolean-значение или null.
   */
  function resolveNullableBoolean({ value }: { value: unknown }): boolean | null {
    if (typeof value === 'boolean') return value

    return null
  }

  /**
   * Возвращает строку или null.
   */
  function resolveNullableString({ value }: { value: unknown }): string | null {
    if (typeof value === 'string') return value

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
      fill: editorObject.fill ?? null,
      stroke: editorObject.stroke ?? null,
      strokeWidth: editorObject.strokeWidth ?? 0,
      opacity: editorObject.opacity ?? 1,
      visible: editorObject.visible ?? true,
      selectable: editorObject.selectable ?? true,
      flipX: editorObject.flipX ?? false,
      flipY: editorObject.flipY ?? false
    }
  }

  /**
   * Сериализует shape-объект.
   */
  const serializeShapeObject: BrowserSerializer = (obj: unknown) => {
    const shapeObject = toBrowserObject({ value: obj }) as BrowserSerializableObject

    return {
      ...serializeEditorObject(obj),
      shapeComposite: shapeObject.shapeComposite ?? false,
      shapePresetKey: shapeObject.shapePresetKey ?? '',
      shapeAlignHorizontal: shapeObject.shapeAlignHorizontal ?? 'center',
      shapeAlignVertical: shapeObject.shapeAlignVertical ?? 'middle',
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
      text: textObject.text ?? '',
      textAlign: textObject.textAlign ?? 'center',
      fontFamily: textObject.fontFamily ?? '',
      fontSize: textObject.fontSize ?? 0,
      fontWeight: textObject.fontWeight ?? 'normal',
      fontStyle: textObject.fontStyle ?? 'normal',
      underline: textObject.underline ?? false,
      linethrough: textObject.linethrough ?? false,
      uppercase: textObject.uppercase ?? false,
      isEditing: textObject.isEditing ?? false,
      evented: textObject.evented ?? true,
      lockMovementX: textObject.lockMovementX ?? false,
      lockMovementY: textObject.lockMovementY ?? false,
      selectionStart: textObject.selectionStart ?? 0,
      selectionEnd: textObject.selectionEnd ?? 0
    }
  }

  /**
   * Возвращает текстовый узел внутри shape-группы по target-параметрам.
   */
  function resolveShapeTextNode({
    objectIndex,
    id
  }: BrowserTextSelectionStyleParams): BrowserSerializableObject | null {
    const target = resolveTarget({ objectIndex, id })

    return browserWindow.editor.shapeManager.getTextNode({ target }) as BrowserSerializableObject | null
  }

  /**
   * Возвращает диапазон выделения текста: явный или текущий в textbox.
   */
  function resolveTextSelectionRange({
    textNode,
    start,
    end
  }: {
    textNode: BrowserSerializableObject
    start?: number
    end?: number
  }): {
    start: number
    end: number
  } {
    const selectionStart = typeof start === 'number'
      ? start
      : resolveNumber({
        value: textNode.selectionStart,
        defaultValue: 0
      })

    const selectionEnd = typeof end === 'number'
      ? end
      : resolveNumber({
        value: textNode.selectionEnd,
        defaultValue: selectionStart
      })

    return {
      start: selectionStart,
      end: selectionEnd
    }
  }

  /**
   * Сериализует первый стиль выделенного диапазона текста в plain-object для e2e assertion.
   */
  function serializeTextSelectionStyle({
    style
  }: {
    style: BrowserObject
  }): BrowserTextSelectionStyleInfo {
    return {
      fill: resolveNullableString({ value: style.fill }),
      stroke: resolveNullableString({ value: style.stroke }),
      strokeWidth: resolveNullableNumber({ value: style.strokeWidth }),
      fontSize: resolveNullableNumber({ value: style.fontSize }),
      fontWeight: resolveNullableString({ value: style.fontWeight }),
      fontStyle: resolveNullableString({ value: style.fontStyle }),
      underline: resolveNullableBoolean({ value: style.underline }),
      linethrough: resolveNullableBoolean({ value: style.linethrough })
    }
  }

  /**
   * Возвращает сериализованный стиль выделенного диапазона текста внутри shape.
   */
  function getShapeTextSelectionStyles({
    objectIndex,
    id,
    start,
    end
  }: BrowserTextSelectionStyleParams): BrowserTextSelectionStyleInfo | null {
    const textNode = resolveShapeTextNode({ objectIndex, id })
    if (!textNode) return null

    const selectionRange = resolveTextSelectionRange({
      textNode,
      start,
      end
    })
    const rawStyles = typeof textNode.getSelectionStyles === 'function'
      ? textNode.getSelectionStyles(selectionRange.start, selectionRange.end, true)
      : []

    if (!Array.isArray(rawStyles) || rawStyles.length === 0) return null

    const firstStyle = toBrowserObject({ value: rawStyles[0] })

    return serializeTextSelectionStyle({ style: firstStyle })
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
      left: groupObject.left ?? 0,
      top: groupObject.top ?? 0,
      width: groupObject.width ?? 0,
      height: groupObject.height ?? 0,
      scaleX: groupObject.scaleX ?? 1,
      scaleY: groupObject.scaleY ?? 1,
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
   * Регистрирует browser-side хелперы на window для вызова из page.evaluate().
   */
  function installBrowserHelpers(): void {
    const editorHelpers: BrowserEditorHelpers = {
      serializeEditorObject,
      serializeShapeObject,
      serializeShapeTextObject,
      serializeShapeScaleSnapshot,
      resolveShapeNode(group: unknown) {
        return resolveShapeNode({ group })
      },
      resolveTarget(objectIndex?: number, id?: string) {
        return resolveTarget({ objectIndex, id })
      },
      resolveCanvasObject(objectIndex?: number, id?: string) {
        return resolveCanvasObject({ objectIndex, id })
      },
      getShapeTextSelectionStyles(params: BrowserTextSelectionStyleParams) {
        return getShapeTextSelectionStyles(params)
      }
    }

    browserWindow.__editorHelpers = editorHelpers
  }

  installBrowserHelpers()
}
