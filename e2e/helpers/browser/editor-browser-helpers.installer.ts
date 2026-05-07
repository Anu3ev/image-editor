import type {
  BrowserEditorHelpers,
  BrowserSelectionScaleFromControlParams,
  BrowserSelectionScaleFromControlResult,
  BoundsInfo,
  BrowserBoundedObject,
  BrowserEditorWindow,
  BrowserGroupObject,
  BrowserObject,
  BrowserOriginPointObject,
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
  const browserWindow = window as unknown as BrowserEditorWindow

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
   * Возвращает количество визуальных строк textbox.
   */
  function resolveTextLineCount({ value }: { value: unknown }): number {
    if (!Array.isArray(value)) return 0

    return value.length
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

    if (typeof canvasObject.getBoundingRect !== 'function') {
      return null
    }

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
   * Возвращает смещение внутри text-area для заданного origin.
   */
  function resolveOriginOffset({
    origin,
    size
  }: {
    origin: string
    size: number
  }): number {
    if (origin === 'left' || origin === 'top' || origin === 'start' || origin === '0') {
      return 0
    }

    if (origin === 'right' || origin === 'bottom' || origin === 'end' || origin === '1') {
      return size
    }

    return size / 2
  }

  /**
   * Возвращает scene point внутренней text-area без учёта фоновой оболочки.
   */
  function createTextAreaPointInfo({
    target,
    originX,
    originY
  }: {
    target: unknown
    originX: string
    originY: string
  }) {
    const textObject = toBrowserObject({ value: target }) as BrowserOriginPointObject & BrowserSerializableObject
    const width = resolveNumber({
      value: textObject.width,
      defaultValue: 0
    })
    const height = resolveNumber({
      value: textObject.height,
      defaultValue: 0
    })
    const paddingTop = resolveNumber({
      value: textObject.paddingTop,
      defaultValue: 0
    })
    const paddingRight = resolveNumber({
      value: textObject.paddingRight,
      defaultValue: 0
    })
    const paddingBottom = resolveNumber({
      value: textObject.paddingBottom,
      defaultValue: 0
    })
    const paddingLeft = resolveNumber({
      value: textObject.paddingLeft,
      defaultValue: 0
    })

    const localX = (-width / 2) + ((paddingLeft - paddingRight) / 2) + resolveOriginOffset({
      origin: originX,
      size: width
    })
    const localY = (-height / 2) + ((paddingTop - paddingBottom) / 2) + resolveOriginOffset({
      origin: originY,
      size: height
    })
    const matrix = textObject.calcTransformMatrix?.()
    const center = toBrowserObject({
      value: textObject.getPointByOrigin('center', 'center')
    })
    const centerX = resolveNumber({
      value: center.x,
      defaultValue: 0
    })
    const centerY = resolveNumber({
      value: center.y,
      defaultValue: 0
    })

    if (Array.isArray(matrix) && matrix.length === 6 && matrix.every((value) => typeof value === 'number')) {
      return {
        x: (localX * matrix[0]) + (localY * matrix[2]) + centerX,
        y: (localX * matrix[1]) + (localY * matrix[3]) + centerY
      }
    }

    return {
      x: centerX + localX,
      y: centerY + localY
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
   * Преобразует point-like объект в набор координат с fallback в 0.
   */
  function createPointInfo({ point }: { point: unknown }): { x: number, y: number } {
    const pointObject = toBrowserObject({ value: point })

    return {
      x: resolveNumber({
        value: pointObject.x,
        defaultValue: 0
      }),
      y: resolveNumber({
        value: pointObject.y,
        defaultValue: 0
      })
    }
  }

  /**
   * Возвращает список обычных направляющих SnappingManager в сериализованном виде.
   */
  function resolveSnappingGuides(): Array<{
    type: 'vertical' | 'horizontal'
    position: number
  }> {
    const editorObject = toBrowserObject({ value: browserWindow.editor })
    const snappingManager = toBrowserObject({ value: editorObject.snappingManager })
    const rawGuides = Array.isArray(snappingManager.activeGuides)
      ? snappingManager.activeGuides
      : []
    const guides: Array<{
      type: 'vertical' | 'horizontal'
      position: number
    }> = []

    for (let index = 0; index < rawGuides.length; index += 1) {
      const guide = toBrowserObject({ value: rawGuides[index] })
      const type = guide.type === 'horizontal' ? 'horizontal' : 'vertical'

      guides.push({
        type,
        position: resolveNumber({
          value: guide.position,
          defaultValue: 0
        })
      })
    }

    return guides
  }

  /**
   * Возвращает список направляющих равноудалённости SnappingManager в сериализованном виде.
   */
  function resolveSnappingSpacingGuides(): Array<{
    type: 'vertical' | 'horizontal'
    axis: number
    refStart: number
    refEnd: number
    activeStart: number
    activeEnd: number
    distance: number
  }> {
    const editorObject = toBrowserObject({ value: browserWindow.editor })
    const snappingManager = toBrowserObject({ value: editorObject.snappingManager })
    const rawGuides = Array.isArray(snappingManager.activeSpacingGuides)
      ? snappingManager.activeSpacingGuides
      : []
    const guides: Array<{
      type: 'vertical' | 'horizontal'
      axis: number
      refStart: number
      refEnd: number
      activeStart: number
      activeEnd: number
      distance: number
    }> = []

    for (let index = 0; index < rawGuides.length; index += 1) {
      const guide = toBrowserObject({ value: rawGuides[index] })
      const type = guide.type === 'horizontal' ? 'horizontal' : 'vertical'

      guides.push({
        type,
        axis: resolveNumber({
          value: guide.axis,
          defaultValue: 0
        }),
        refStart: resolveNumber({
          value: guide.refStart,
          defaultValue: 0
        }),
        refEnd: resolveNumber({
          value: guide.refEnd,
          defaultValue: 0
        }),
        activeStart: resolveNumber({
          value: guide.activeStart,
          defaultValue: 0
        }),
        activeEnd: resolveNumber({
          value: guide.activeEnd,
          defaultValue: 0
        }),
        distance: resolveNumber({
          value: guide.distance,
          defaultValue: 0
        })
      })
    }

    return guides
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
   * Выбирает текстовый узел внутри композитной группы.
   */
  function resolveTextNode({ group }: { group: unknown }): BrowserObject | null {
    const objects = getGroupObjects({ group })
    if (!objects.length) return null

    for (let index = 0; index < objects.length; index += 1) {
      const textNode = objects[index]

      if (resolveShapeNodeType({ value: textNode }) === 'text') {
        return textNode
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
   * Возвращает canvas-объект по индексу или id, а при их отсутствии — target текущего transform или active object.
   */
  function resolveCanvasObjectOrActive({ objectIndex, id }: { objectIndex?: number, id?: string }): unknown {
    const target = resolveCanvasObject({ objectIndex, id })

    if (target !== undefined) return target

    const transformTarget = browserWindow.editor.canvas._currentTransform?.target
    if (transformTarget) return transformTarget

    return browserWindow.editor.canvas.getActiveObject()
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
      locked: editorObject.locked ?? false,
      flipX: editorObject.flipX ?? false,
      flipY: editorObject.flipY ?? false
    }
  }

  /**
   * Сериализует background-объект редактора вместе с bounding box.
   */
  const serializeBackgroundObject: BrowserSerializer = (obj: unknown) => {
    const backgroundObject = toBrowserObject({ value: obj }) as BrowserSerializableObject
    const bounds = createBoundsInfo({
      bounds: getBoundingRect({ target: obj })
    })
    const { fill } = backgroundObject
    const fillObject = toBrowserObject({ value: fill })
    const hasGradientFill = Boolean(
      fill
      && typeof fill === 'object'
      && fillObject.type
      && ['linear', 'radial'].includes(String(fillObject.type))
    )

    return {
      ...serializeEditorObject(obj),
      backgroundType: backgroundObject.backgroundType ?? 'unknown',
      hasGradientFill,
      boundsLeft: bounds.left,
      boundsTop: bounds.top,
      boundsWidth: bounds.width,
      boundsHeight: bounds.height,
      boundsRight: bounds.right,
      boundsBottom: bounds.bottom,
      boundsCenterX: bounds.left + (bounds.width / 2),
      boundsCenterY: bounds.top + (bounds.height / 2)
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
      shapeTextAutoExpand: shapeObject.shapeTextAutoExpand ?? true,
      shapeAlignHorizontal: shapeObject.shapeAlignHorizontal ?? 'center',
      shapeAlignVertical: shapeObject.shapeAlignVertical ?? 'middle',
      shapePaddingTop: resolveNumber({
        value: shapeObject.shapePaddingTop,
        defaultValue: 0
      }),
      shapePaddingRight: resolveNumber({
        value: shapeObject.shapePaddingRight,
        defaultValue: 0
      }),
      shapePaddingBottom: resolveNumber({
        value: shapeObject.shapePaddingBottom,
        defaultValue: 0
      }),
      shapePaddingLeft: resolveNumber({
        value: shapeObject.shapePaddingLeft,
        defaultValue: 0
      }),
      shapeReplaceBoxWidth: resolveNumber({
        value: shapeObject.shapeReplaceBoxWidth,
        defaultValue: 0
      }),
      shapeReplaceBoxHeight: resolveNumber({
        value: shapeObject.shapeReplaceBoxHeight,
        defaultValue: 0
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
      text: textObject.text ?? '',
      textAlign: textObject.textAlign ?? 'center',
      fontFamily: textObject.fontFamily ?? '',
      fontSize: textObject.fontSize ?? 0,
      fontWeight: textObject.fontWeight ?? 'normal',
      fontStyle: textObject.fontStyle ?? 'normal',
      underline: textObject.underline ?? false,
      linethrough: textObject.linethrough ?? false,
      uppercase: textObject.uppercase ?? false,
      splitByGrapheme: textObject.splitByGrapheme ?? false,
      isEditing: textObject.isEditing ?? false,
      evented: textObject.evented ?? true,
      lockMovementX: textObject.lockMovementX ?? false,
      lockMovementY: textObject.lockMovementY ?? false,
      lineCount: resolveTextLineCount({ value: textObject.textLines }),
      selectionStart: textObject.selectionStart ?? 0,
      selectionEnd: textObject.selectionEnd ?? 0
    }
  }

  /**
   * Сериализует standalone text-объект.
   */
  const serializeTextObject: BrowserSerializer = (obj: unknown) => {
    const textObject = toBrowserObject({ value: obj }) as BrowserSerializableObject
    const backgroundColor = resolveNullableString({ value: textObject.backgroundColor })

    return {
      ...serializeEditorObject(obj),
      text: textObject.text ?? '',
      textAlign: textObject.textAlign ?? 'left',
      fontFamily: textObject.fontFamily ?? '',
      fontSize: textObject.fontSize ?? 0,
      fontWeight: textObject.fontWeight ?? 'normal',
      fontStyle: textObject.fontStyle ?? 'normal',
      underline: textObject.underline ?? false,
      linethrough: textObject.linethrough ?? false,
      uppercase: textObject.uppercase ?? false,
      lineHeight: resolveNumber({
        value: textObject.lineHeight,
        defaultValue: 1
      }),
      lineCount: resolveTextLineCount({ value: textObject.textLines }),
      isEditing: textObject.isEditing ?? false,
      evented: textObject.evented ?? true,
      lockMovementX: textObject.lockMovementX ?? false,
      lockMovementY: textObject.lockMovementY ?? false,
      selectionStart: textObject.selectionStart ?? 0,
      selectionEnd: textObject.selectionEnd ?? 0,
      backgroundColor: backgroundColor && backgroundColor.length > 0 ? backgroundColor : null,
      backgroundOpacity: resolveNumber({
        value: textObject.backgroundOpacity,
        defaultValue: 1
      }),
      autoExpand: textObject.autoExpand ?? true,
      paddingTop: resolveNumber({
        value: textObject.paddingTop,
        defaultValue: 0
      }),
      paddingRight: resolveNumber({
        value: textObject.paddingRight,
        defaultValue: 0
      }),
      paddingBottom: resolveNumber({
        value: textObject.paddingBottom,
        defaultValue: 0
      }),
      paddingLeft: resolveNumber({
        value: textObject.paddingLeft,
        defaultValue: 0
      }),
      radiusTopLeft: resolveNumber({
        value: textObject.radiusTopLeft,
        defaultValue: 0
      }),
      radiusTopRight: resolveNumber({
        value: textObject.radiusTopRight,
        defaultValue: 0
      }),
      radiusBottomRight: resolveNumber({
        value: textObject.radiusBottomRight,
        defaultValue: 0
      }),
      radiusBottomLeft: resolveNumber({
        value: textObject.radiusBottomLeft,
        defaultValue: 0
      })
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
   * Возвращает текстовый объект canvas по target-параметрам.
   */
  function resolveCanvasTextNode({
    objectIndex,
    id
  }: BrowserTextSelectionStyleParams): BrowserSerializableObject | null {
    const target = resolveCanvasObject({ objectIndex, id })
    if (!target) return null

    return target as BrowserSerializableObject
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
      fontFamily: resolveNullableString({ value: style.fontFamily }),
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
   * Возвращает сериализованный стиль выделенного диапазона отдельного текстового объекта.
   */
  function getTextSelectionStyles({
    objectIndex,
    id,
    start,
    end
  }: BrowserTextSelectionStyleParams): BrowserTextSelectionStyleInfo | null {
    const textNode = resolveCanvasTextNode({ objectIndex, id })
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
    const textNode = resolveTextNode({ group: obj })
    const shapeNodeObject = toBrowserObject({ value: shapeNode }) as BrowserShapeNodeObject

    const groupBounds = getBoundingRect({ target: obj })
    const shapeBounds = getBoundingRect({ target: shapeNode })
    const textBounds = getBoundingRect({ target: textNode })
    const groupBoundsInfo = createBoundsInfo({ bounds: groupBounds })
    const shapeBoundsInfo = createNullableBoundsInfo({ bounds: shapeBounds })
    const textBoundsInfo = createNullableBoundsInfo({ bounds: textBounds })
    const shapeBoundsRight = sumNullableNumbers({
      first: shapeBoundsInfo.left,
      second: shapeBoundsInfo.width
    })
    const shapeBoundsBottom = sumNullableNumbers({
      first: shapeBoundsInfo.top,
      second: shapeBoundsInfo.height
    })
    const textBoundsRight = sumNullableNumbers({
      first: textBoundsInfo.left,
      second: textBoundsInfo.width
    })
    const textBoundsBottom = sumNullableNumbers({
      first: textBoundsInfo.top,
      second: textBoundsInfo.height
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
      shapeBoundsBottom,
      textBoundsLeft: textBoundsInfo.left,
      textBoundsTop: textBoundsInfo.top,
      textBoundsWidth: textBoundsInfo.width,
      textBoundsHeight: textBoundsInfo.height,
      textBoundsRight,
      textBoundsBottom
    }
  }

  /**
   * Сериализует объект canvas вместе с актуальным bounding box для snapping-assertions.
   */
  const serializeSnappingObjectSnapshot: BrowserSerializer = (obj: unknown) => {
    const bounds = createBoundsInfo({
      bounds: getBoundingRect({ target: obj })
    })

    return {
      ...serializeEditorObject(obj),
      boundsLeft: bounds.left,
      boundsTop: bounds.top,
      boundsWidth: bounds.width,
      boundsHeight: bounds.height,
      boundsRight: bounds.right,
      boundsBottom: bounds.bottom,
      centerX: bounds.left + (bounds.width / 2),
      centerY: bounds.top + (bounds.height / 2)
    }
  }

  /**
   * Выполняет один шаг scale для текущего ActiveSelection через указанный control.
   * Может как начать drag-сессию, так и продолжить уже активную.
   */
  const scaleSelectionFromControl = ({
    startControl: startControlName,
    oppositeControl: oppositeControlName,
    scaleX,
    scaleY,
    minimumWidth,
    minimumHeight,
    shiftKey = false,
    continueInteraction = false
  }: BrowserSelectionScaleFromControlParams): BrowserSelectionScaleFromControlResult | null => {
    const target = browserWindow.editor.canvas.getActiveObject()
    if (!target) return null

    const targetObject = toBrowserObject({ value: target })
    if (typeof targetObject.setCoords !== 'function') return null

    targetObject.setCoords()

    const controls = toBrowserObject({ value: targetObject.oCoords })
    const startControl = toBrowserObject({ value: controls[startControlName] })
    const oppositeControl = toBrowserObject({ value: controls[oppositeControlName] })
    if (
      typeof startControl.x !== 'number'
      || typeof startControl.y !== 'number'
      || typeof oppositeControl.x !== 'number'
      || typeof oppositeControl.y !== 'number'
    ) {
      return null
    }

    const rect = browserWindow.editor.canvas.upperCanvasEl.getBoundingClientRect()
    const startPoint = {
      x: rect.left + startControl.x,
      y: rect.top + startControl.y
    }

    if (!continueInteraction) {
      browserWindow.editor.canvas.__onMouseDown(new MouseEvent('mousedown', {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: startPoint.x,
        clientY: startPoint.y,
        shiftKey
      }))
    }

    const transform = browserWindow.editor.canvas._currentTransform
    if (!transform || transform.target !== target) return null

    const controlWidth = startControl.x - oppositeControl.x
    const controlHeight = startControl.y - oppositeControl.y
    const widthSign = Math.sign(controlWidth) || 1
    const heightSign = Math.sign(controlHeight) || 1
    const targetWidth = typeof minimumWidth === 'number'
      ? minimumWidth
      : Math.abs(controlWidth) * (scaleX ?? 1)
    const targetHeight = typeof minimumHeight === 'number'
      ? minimumHeight
      : Math.abs(controlHeight) * (scaleY ?? 1)
    const movePoint = {
      x: rect.left + oppositeControl.x + (widthSign * targetWidth),
      y: rect.top + oppositeControl.y + (heightSign * targetHeight)
    }

    browserWindow.editor.canvas.__onMouseMove(new MouseEvent('mousemove', {
      bubbles: true,
      button: 0,
      buttons: 1,
      clientX: movePoint.x,
      clientY: movePoint.y,
      shiftKey
    }))

    targetObject.setCoords()

    const currentControl = toBrowserObject({
      value: toBrowserObject({ value: targetObject.oCoords })[startControlName]
    })
    const currentPoint = typeof currentControl.x === 'number' && typeof currentControl.y === 'number'
      ? {
        x: rect.left + currentControl.x,
        y: rect.top + currentControl.y
      }
      : movePoint

    return {
      point: currentPoint,
      shiftKey,
      snapshot: serializeSnappingObjectSnapshot(target) as BrowserSerializableObject
    }
  }

  /**
   * Возвращает сериализованное состояние interaction blocker и маски блокировки.
   */
  function getInteractionBlockerState(): Record<string, unknown> {
    const { interactionBlocker, canvas } = browserWindow.editor
    const { overlayMask } = interactionBlocker
    const bounds = overlayMask
      ? createBoundsInfo({
        bounds: getBoundingRect({ target: overlayMask })
      })
      : {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        right: 0,
        bottom: 0
      }

    return {
      isBlocked: Boolean(interactionBlocker.isBlocked),
      overlayExists: Boolean(overlayMask),
      overlayVisible: Boolean(toBrowserObject({ value: overlayMask }).visible),
      overlayFill: resolveNullableString({ value: toBrowserObject({ value: overlayMask }).fill }),
      upperCanvasPointerEvents: canvas.upperCanvasEl.style.pointerEvents,
      lowerCanvasPointerEvents: canvas.lowerCanvasEl.style.pointerEvents,
      boundsLeft: bounds.left,
      boundsTop: bounds.top,
      boundsWidth: bounds.width,
      boundsHeight: bounds.height,
      boundsRight: bounds.right,
      boundsBottom: bounds.bottom,
      boundsCenterX: bounds.left + (bounds.width / 2),
      boundsCenterY: bounds.top + (bounds.height / 2)
    }
  }

  /**
   * Сериализует snapshot standalone text-объекта во время/после horizontal resize.
   */
  const serializeTextResizeSnapshot: BrowserSerializer = (obj: unknown) => {
    const textObject = toBrowserObject({ value: obj }) as BrowserOriginPointObject
    const bounds = createBoundsInfo({
      bounds: getBoundingRect({ target: obj })
    })
    const leftTop = createPointInfo({
      point: textObject.getPointByOrigin('left', 'top')
    })
    const leftCenter = createPointInfo({
      point: textObject.getPointByOrigin('left', 'center')
    })
    const rightTop = createPointInfo({
      point: textObject.getPointByOrigin('right', 'top')
    })
    const rightCenter = createPointInfo({
      point: textObject.getPointByOrigin('right', 'center')
    })
    const rightBottom = createPointInfo({
      point: textObject.getPointByOrigin('right', 'bottom')
    })
    const textAreaLeftTop = createPointInfo({
      point: createTextAreaPointInfo({
        target: obj,
        originX: 'left',
        originY: 'top'
      })
    })

    return {
      ...serializeTextObject(obj),
      boundsLeft: bounds.left,
      boundsTop: bounds.top,
      boundsWidth: bounds.width,
      boundsHeight: bounds.height,
      boundsRight: bounds.right,
      boundsBottom: bounds.bottom,
      leftTopX: leftTop.x,
      leftTopY: leftTop.y,
      leftCenterX: leftCenter.x,
      leftCenterY: leftCenter.y,
      rightTopX: rightTop.x,
      rightTopY: rightTop.y,
      rightCenterX: rightCenter.x,
      rightCenterY: rightCenter.y,
      rightBottomX: rightBottom.x,
      rightBottomY: rightBottom.y,
      textAreaLeftTopX: textAreaLeftTop.x,
      textAreaLeftTopY: textAreaLeftTop.y
    }
  }

  /**
   * Регистрирует browser-side хелперы на window для вызова из page.evaluate().
   */
  function installBrowserHelpers(): void {
    const editorHelpers: BrowserEditorHelpers = {
      serializeEditorObject,
      serializeBackgroundObject,
      serializeShapeObject,
      serializeShapeTextObject,
      serializeShapeScaleSnapshot,
      serializeTextObject,
      serializeTextResizeSnapshot,
      serializeSnappingObjectSnapshot,
      getInteractionBlockerState() {
        return getInteractionBlockerState()
      },
      resolveShapeNode(group: unknown) {
        return resolveShapeNode({ group })
      },
      resolveTarget(objectIndex?: number, id?: string) {
        return resolveTarget({ objectIndex, id })
      },
      resolveCanvasObject(objectIndex?: number, id?: string) {
        return resolveCanvasObject({ objectIndex, id })
      },
      resolveCanvasObjectOrActive(objectIndex?: number, id?: string) {
        return resolveCanvasObjectOrActive({ objectIndex, id })
      },
      scaleSelectionFromControl(params: BrowserSelectionScaleFromControlParams) {
        return scaleSelectionFromControl(params)
      },
      getSnappingGuideState() {
        return {
          guides: resolveSnappingGuides(),
          spacingGuides: resolveSnappingSpacingGuides()
        }
      },
      getTextSelectionStyles(params: BrowserTextSelectionStyleParams) {
        return getTextSelectionStyles(params)
      },
      getShapeTextSelectionStyles(params: BrowserTextSelectionStyleParams) {
        return getShapeTextSelectionStyles(params)
      }
    }

    browserWindow.__editorHelpers = editorHelpers
  }

  installBrowserHelpers()
}
