import type {
  Canvas,
  TextboxProps
} from 'fabric'
import type { ObjectPlacement } from '../canvas-manager'
import type { ImageEditor } from '../index'
import type { TextSelectionRange } from '../utils/text'
import type {
  BackgroundTextboxProps
} from './background-textbox'
import {
  applyLineDefaultUpdates
} from './line-defaults'
import {
  clampSelectionRange,
  expandRangeToFullLines,
  getFullLineIndicesForRange,
  getLineIndicesForRange
} from './selection'
import {
  getTextboxContentPlacement,
  hasLayoutAffectingStyles
} from './geometry'
import type {
  BeforeTextUpdatedPayload,
  EditorTextbox,
  LineFontDefaultUpdate,
  TextReference,
  TextboxSnapshot,
  TextStyleOptions,
  TextUpdatedPayload,
  UpdateOptions
} from './types'
import {
  applyStylesToRange,
  getFullTextRange,
  getSelectionRange,
  getSelectionStyleValue,
  isFullTextSelection,
  resolveStrokeColor,
  resolveStrokeWidth,
  toUpperCaseSafe
} from '../utils/text'

/**
 * Runtime-зависимости text update controller без прямого доступа ко всему TextManager.
 */
type TextUpdateRuntime = {
  canvas: Canvas
  canvasManager: ImageEditor['canvasManager']
  historyManager: ImageEditor['historyManager']
  resolveTextObject: (reference: TextReference) => EditorTextbox | null
  normalizeTextboxAfterContentChange: (params: {
    textbox: EditorTextbox
    placement?: ObjectPlacement
    shouldAutoExpand: boolean
    clampToMontage?: boolean
  }) => void
  restoreTextboxContentPlacement: (params: {
    textbox: EditorTextbox
    contentPlacement: ObjectPlacement
  }) => void
  syncLineStylesWithText: (params: {
    textbox: EditorTextbox
    previousText: string
    currentText: string
  }) => void
  getSnapshot: (textbox: EditorTextbox) => TextboxSnapshot
}

/**
 * Нормализованный selection-контекст для whole-text и partial-style update paths.
 */
type TextSelectionContext = {
  selectionRange: TextSelectionRange | null
  fontSelectionRange: TextSelectionRange | null
  shouldUpdateWholeObject: boolean
  shouldUpdateWholeObjectFont: boolean
  shouldApplyWholeTextStyles: boolean
}

/**
 * Карта style-обновлений, разведённая по object, selection и whole-text слоям.
 */
type TextStyleMaps = {
  updates: Partial<BackgroundTextboxProps>
  selectionStyles: Partial<TextboxProps>
  lineSelectionStyles: Partial<TextboxProps>
  wholeTextStyles: Partial<TextboxProps>
  resolvedFontWeight?: TextboxProps['fontWeight']
  resolvedFontStyle?: TextboxProps['fontStyle']
  resolvedStrokeColor?: string | null
  resolvedStrokeWidth?: number
}

/**
 * Сводка об изменении текстового содержимого до post-layout шага.
 */
type TextContentUpdate = {
  hasTextUpdate: boolean
  uppercaseChanged: boolean
  previousRenderedText: string
}

/**
 * Полностью подготовленное update-состояние textbox до фактического apply/finish path.
 */
type PreparedTextUpdate = {
  textbox: EditorTextbox
  target?: TextReference
  style: TextStyleOptions
  withoutSave?: boolean
  skipRender?: boolean
  emitLifecycleEvents: boolean
  syncLineStylesWithText: boolean
  beforeState: TextboxSnapshot
  placement: ObjectPlacement
  selection: TextSelectionContext
  styleMaps: TextStyleMaps
  contentUpdate: TextContentUpdate
  contentPlacement: ObjectPlacement | null
}

/**
 * Владеет программным update pipeline для standalone text objects.
 */
export default class TextUpdateController {
  /**
   * Runtime-зависимости text update path без прямого владения всем TextManager.
   */
  private readonly runtime: TextUpdateRuntime

  /**
   * Инициализирует text update controller editor-level runtime зависимостями.
   */
  constructor({ runtime }: { runtime: TextUpdateRuntime }) {
    this.runtime = runtime
  }

  /**
   * Обновляет текстовый объект через единый prepare/apply/finish pipeline.
   */
  public updateText({
    target,
    style = {},
    withoutSave,
    skipRender,
    selectionRange: selectionRangeOverride,
    emitLifecycleEvents = true,
    syncLineStylesWithText = true
  }: UpdateOptions = {}): EditorTextbox | null {
    const preparedUpdate = this._prepareUpdate({
      target,
      style,
      withoutSave,
      skipRender,
      selectionRangeOverride,
      emitLifecycleEvents,
      syncLineStylesWithText
    })

    if (!preparedUpdate) return null

    this._applyUpdates({ preparedUpdate })
    this._finishUpdate({ preparedUpdate })

    return preparedUpdate.textbox
  }

  /**
   * Собирает selection, style и content контекст до фактической мутации textbox.
   */
  private _prepareUpdate({
    target,
    style,
    withoutSave,
    skipRender,
    selectionRangeOverride,
    emitLifecycleEvents,
    syncLineStylesWithText
  }: {
    target?: TextReference
    style: TextStyleOptions
    withoutSave?: boolean
    skipRender?: boolean
    selectionRangeOverride?: TextSelectionRange | null
    emitLifecycleEvents: boolean
    syncLineStylesWithText: boolean
  }): PreparedTextUpdate | null {
    const textbox = this.runtime.resolveTextObject(target)

    if (!textbox || textbox.locked) return null

    this.runtime.historyManager.suspendHistory()

    const currentText = textbox.text ?? ''
    const selection = this._createSelectionContext({
      textbox,
      currentText,
      selectionRangeOverride
    })
    const styleMaps = this._buildStyleMaps({
      textbox,
      style,
      selection
    })
    const placement = this.runtime.canvasManager.resolveObjectPlacement({
      object: textbox,
      left: style.left,
      top: style.top,
      originX: style.originX,
      originY: style.originY
    })
    const contentUpdate = this._applyTextContentUpdate({
      textbox,
      style,
      updates: styleMaps.updates,
      currentText
    })
    const contentPlacement = this._resolveContentPlacement({
      textbox,
      style,
      updates: styleMaps.updates,
      placement,
      styleMaps,
      contentUpdate
    })

    return {
      textbox,
      target,
      style,
      withoutSave,
      skipRender,
      emitLifecycleEvents,
      syncLineStylesWithText,
      beforeState: this.runtime.getSnapshot(textbox),
      placement,
      selection,
      styleMaps,
      contentUpdate,
      contentPlacement
    }
  }

  /**
   * Нормализует selection range и derived flags для whole-object и partial updates.
   */
  private _createSelectionContext({
    textbox,
    currentText,
    selectionRangeOverride
  }: {
    textbox: EditorTextbox
    currentText: string
    selectionRangeOverride?: TextSelectionRange | null
  }): TextSelectionContext {
    const selectionRange = selectionRangeOverride !== undefined
      ? clampSelectionRange({
        text: currentText,
        range: selectionRangeOverride
      })
      : getSelectionRange({ textbox })
    const fontSelectionRange = selectionRange
      ? expandRangeToFullLines({ textbox, range: selectionRange })
      : null
    const isSelectionForWholeText = isFullTextSelection({
      textbox,
      range: selectionRange
    })
    const isFontSelectionForWholeText = isFullTextSelection({
      textbox,
      range: fontSelectionRange
    })
    const shouldUpdateWholeObject = !selectionRange || isSelectionForWholeText

    return {
      selectionRange,
      fontSelectionRange,
      shouldUpdateWholeObject,
      shouldUpdateWholeObjectFont: shouldUpdateWholeObject || isFontSelectionForWholeText,
      shouldApplyWholeTextStyles: !selectionRange
    }
  }

  /**
   * Разводит входной style payload по object-level, selection-level и whole-text updates.
   */
  private _buildStyleMaps({
    textbox,
    style,
    selection
  }: {
    textbox: EditorTextbox
    style: TextStyleOptions
    selection: TextSelectionContext
  }): TextStyleMaps {
    const updates = { ...style }
    const styleMaps: TextStyleMaps = {
      updates: updates as Partial<BackgroundTextboxProps>,
      selectionStyles: {},
      lineSelectionStyles: {},
      wholeTextStyles: {}
    }

    delete updates.fontFamily
    delete updates.fontSize
    delete updates.bold
    delete updates.italic
    delete updates.underline
    delete updates.uppercase
    delete updates.strikethrough
    delete updates.align
    delete updates.color
    delete updates.strokeColor
    delete updates.strokeWidth
    delete updates.opacity
    delete updates.backgroundColor
    delete updates.backgroundOpacity
    delete updates.paddingTop
    delete updates.paddingRight
    delete updates.paddingBottom
    delete updates.paddingLeft
    delete updates.radiusTopLeft
    delete updates.radiusTopRight
    delete updates.radiusBottomRight
    delete updates.radiusBottomLeft
    delete updates.left
    delete updates.top
    delete updates.originX
    delete updates.originY
    delete updates.text
    delete updates.autoExpand

    this._applyFontUpdates({ styleMaps, style, selection })
    this._applyTextDecorationUpdates({ styleMaps, style, selection })
    this._applyColorUpdates({ textbox, styleMaps, style, selection })
    this._applyBoxStyleUpdates({ styleMaps, style })

    return styleMaps
  }

  /**
   * Раскладывает font family, font size, align и opacity по нужным style maps.
   */
  private _applyFontUpdates({
    styleMaps,
    style,
    selection
  }: {
    styleMaps: TextStyleMaps
    style: TextStyleOptions
    selection: TextSelectionContext
  }): void {
    const {
      fontFamily,
      fontSize,
      align,
      opacity
    } = style
    const {
      fontSelectionRange,
      shouldUpdateWholeObjectFont,
      shouldApplyWholeTextStyles
    } = selection

    if (fontFamily !== undefined) {
      if (fontSelectionRange) {
        styleMaps.lineSelectionStyles.fontFamily = fontFamily
      }

      if (shouldUpdateWholeObjectFont) {
        styleMaps.updates.fontFamily = fontFamily
        if (shouldApplyWholeTextStyles) {
          styleMaps.wholeTextStyles.fontFamily = fontFamily
        }
      }
    }

    if (fontSize !== undefined) {
      if (fontSelectionRange) {
        styleMaps.lineSelectionStyles.fontSize = fontSize
      }

      if (shouldUpdateWholeObjectFont) {
        styleMaps.updates.fontSize = fontSize
        if (shouldApplyWholeTextStyles) {
          styleMaps.wholeTextStyles.fontSize = fontSize
        }
      }
    }

    if (align !== undefined) {
      styleMaps.updates.textAlign = align
    }

    if (opacity !== undefined) {
      styleMaps.updates.opacity = opacity
    }
  }

  /**
   * Раскладывает decoration-style обновления по font-weight, font-style и boolean flags.
   */
  private _applyTextDecorationUpdates({
    styleMaps,
    style,
    selection
  }: {
    styleMaps: TextStyleMaps
    style: TextStyleOptions
    selection: TextSelectionContext
  }): void {
    this._applyFontWeightUpdate({ styleMaps, style, selection })
    this._applyFontStyleUpdate({ styleMaps, style, selection })
    this._applyBooleanTextStyleUpdate({
      styleMaps,
      nextValue: style.underline,
      objectKey: 'underline',
      selectionKey: 'underline',
      selection
    })
    this._applyBooleanTextStyleUpdate({
      styleMaps,
      nextValue: style.strikethrough,
      objectKey: 'linethrough',
      selectionKey: 'linethrough',
      selection
    })
  }

  /**
   * Применяет bold обновление к selection и whole-object слоям.
   */
  private _applyFontWeightUpdate({
    styleMaps,
    style,
    selection
  }: {
    styleMaps: TextStyleMaps
    style: TextStyleOptions
    selection: TextSelectionContext
  }): void {
    if (style.bold === undefined) return

    const resolvedFontWeight: TextboxProps['fontWeight'] = style.bold ? 'bold' : 'normal'

    styleMaps.resolvedFontWeight = resolvedFontWeight

    if (selection.selectionRange) {
      styleMaps.selectionStyles.fontWeight = resolvedFontWeight
    }

    if (!selection.shouldUpdateWholeObject) return

    styleMaps.updates.fontWeight = resolvedFontWeight

    if (selection.shouldApplyWholeTextStyles) {
      styleMaps.wholeTextStyles.fontWeight = resolvedFontWeight
    }
  }

  /**
   * Применяет italic обновление к selection и whole-object слоям.
   */
  private _applyFontStyleUpdate({
    styleMaps,
    style,
    selection
  }: {
    styleMaps: TextStyleMaps
    style: TextStyleOptions
    selection: TextSelectionContext
  }): void {
    if (style.italic === undefined) return

    const resolvedFontStyle: TextboxProps['fontStyle'] = style.italic ? 'italic' : 'normal'

    styleMaps.resolvedFontStyle = resolvedFontStyle

    if (selection.selectionRange) {
      styleMaps.selectionStyles.fontStyle = resolvedFontStyle
    }

    if (!selection.shouldUpdateWholeObject) return

    styleMaps.updates.fontStyle = resolvedFontStyle

    if (selection.shouldApplyWholeTextStyles) {
      styleMaps.wholeTextStyles.fontStyle = resolvedFontStyle
    }
  }

  /**
   * Применяет boolean текстовый флаг к selection и object-level style maps.
   */
  private _applyBooleanTextStyleUpdate({
    styleMaps,
    nextValue,
    objectKey,
    selectionKey,
    selection
  }: {
    styleMaps: TextStyleMaps
    nextValue?: boolean
    objectKey: 'underline' | 'linethrough'
    selectionKey: 'underline' | 'linethrough'
    selection: TextSelectionContext
  }): void {
    if (nextValue === undefined) return

    if (selection.selectionRange) {
      styleMaps.selectionStyles[selectionKey] = nextValue
    }

    if (!selection.shouldUpdateWholeObject) return

    styleMaps.updates[objectKey] = nextValue

    if (selection.shouldApplyWholeTextStyles) {
      styleMaps.wholeTextStyles[objectKey] = nextValue
    }
  }

  /**
   * Применяет fill и stroke обновления с учётом partial selection контракта.
   */
  private _applyColorUpdates({
    textbox,
    styleMaps,
    style,
    selection
  }: {
    textbox: EditorTextbox
    styleMaps: TextStyleMaps
    style: TextStyleOptions
    selection: TextSelectionContext
  }): void {
    if (style.color !== undefined) {
      if (selection.selectionRange) {
        styleMaps.selectionStyles.fill = style.color
      }

      if (selection.shouldUpdateWholeObject) {
        styleMaps.updates.fill = style.color

        if (selection.shouldApplyWholeTextStyles) {
          styleMaps.wholeTextStyles.fill = style.color
        }
      }
    }

    if (style.strokeColor === undefined && style.strokeWidth === undefined) return

    const resolvedStroke = this._resolveStrokeUpdate({
      textbox,
      selectionRange: selection.selectionRange,
      strokeColor: style.strokeColor,
      strokeWidth: style.strokeWidth
    })

    styleMaps.resolvedStrokeColor = resolvedStroke.stroke
    styleMaps.resolvedStrokeWidth = resolvedStroke.strokeWidth

    if (selection.selectionRange) {
      styleMaps.selectionStyles.stroke = resolvedStroke.stroke
      styleMaps.selectionStyles.strokeWidth = resolvedStroke.strokeWidth
    }

    if (!selection.shouldUpdateWholeObject) return

    styleMaps.updates.stroke = resolvedStroke.stroke
    styleMaps.updates.strokeWidth = resolvedStroke.strokeWidth

    if (selection.shouldApplyWholeTextStyles) {
      styleMaps.wholeTextStyles.stroke = resolvedStroke.stroke
      styleMaps.wholeTextStyles.strokeWidth = resolvedStroke.strokeWidth
    }
  }

  /**
   * Разрешает итоговые strokeColor и strokeWidth для текущего update path.
   */
  private _resolveStrokeUpdate({
    textbox,
    selectionRange,
    strokeColor,
    strokeWidth
  }: {
    textbox: EditorTextbox
    selectionRange: TextSelectionRange | null
    strokeColor?: string
    strokeWidth?: number
  }): {
    stroke: string | null
    strokeWidth: number
  } {
    const selectionStrokeWidth = selectionRange
      ? getSelectionStyleValue({ textbox, range: selectionRange, property: 'strokeWidth' })
      : undefined
    const selectionStrokeColor = selectionRange
      ? getSelectionStyleValue({ textbox, range: selectionRange, property: 'stroke' })
      : undefined
    const selectedStrokeWidth = typeof selectionStrokeWidth === 'number'
      ? selectionStrokeWidth
      : undefined
    const selectedStrokeColor = typeof selectionStrokeColor === 'string'
      ? selectionStrokeColor
      : undefined
    const objectStrokeColor = typeof textbox.stroke === 'string'
      ? textbox.stroke
      : undefined
    const resolvedWidth = resolveStrokeWidth({
      width: strokeWidth ?? selectedStrokeWidth ?? textbox.strokeWidth ?? 0
    })
    const resolvedColor = resolveStrokeColor({
      strokeColor: strokeColor ?? selectedStrokeColor ?? objectStrokeColor,
      width: resolvedWidth
    })

    return {
      stroke: resolvedColor ?? null,
      strokeWidth: resolvedWidth
    }
  }

  /**
   * Перекладывает box-style свойства textbox в object-level updates.
   */
  private _applyBoxStyleUpdates({
    styleMaps,
    style
  }: {
    styleMaps: TextStyleMaps
    style: TextStyleOptions
  }): void {
    if (style.backgroundColor !== undefined) {
      styleMaps.updates.backgroundColor = style.backgroundColor
    }

    if (style.backgroundOpacity !== undefined) {
      styleMaps.updates.backgroundOpacity = style.backgroundOpacity
    }

    if (style.paddingTop !== undefined) {
      styleMaps.updates.paddingTop = style.paddingTop
    }

    if (style.paddingRight !== undefined) {
      styleMaps.updates.paddingRight = style.paddingRight
    }

    if (style.paddingBottom !== undefined) {
      styleMaps.updates.paddingBottom = style.paddingBottom
    }

    if (style.paddingLeft !== undefined) {
      styleMaps.updates.paddingLeft = style.paddingLeft
    }

    if (style.radiusTopLeft !== undefined) {
      styleMaps.updates.radiusTopLeft = style.radiusTopLeft
    }

    if (style.radiusTopRight !== undefined) {
      styleMaps.updates.radiusTopRight = style.radiusTopRight
    }

    if (style.radiusBottomRight !== undefined) {
      styleMaps.updates.radiusBottomRight = style.radiusBottomRight
    }

    if (style.radiusBottomLeft !== undefined) {
      styleMaps.updates.radiusBottomLeft = style.radiusBottomLeft
    }
  }

  /**
   * Обновляет text/textCaseRaw/uppercase и возвращает сводку для post-layout шага.
   */
  private _applyTextContentUpdate({
    textbox,
    style,
    updates,
    currentText
  }: {
    textbox: EditorTextbox
    style: TextStyleOptions
    updates: Partial<BackgroundTextboxProps>
    currentText: string
  }): TextContentUpdate {
    const previousRaw = textbox.textCaseRaw ?? currentText
    const previousUppercase = Boolean(textbox.uppercase)
    const hasTextUpdate = style.text !== undefined
    const targetRawText = hasTextUpdate ? style.text ?? '' : previousRaw
    const nextUppercase = style.uppercase ?? previousUppercase
    const uppercaseChanged = nextUppercase !== previousUppercase
    const previousRenderedText = textbox.text ?? ''

    if (hasTextUpdate || uppercaseChanged) {
      updates.text = nextUppercase
        ? toUpperCaseSafe({ value: targetRawText })
        : targetRawText
      textbox.textCaseRaw = targetRawText
    } else if (textbox.textCaseRaw === undefined) {
      textbox.textCaseRaw = previousRaw
    }

    textbox.uppercase = nextUppercase

    return {
      hasTextUpdate,
      uppercaseChanged,
      previousRenderedText
    }
  }

  /**
   * Решает, нужно ли после padding-only обновления восстановить placement текстового содержимого.
   */
  private _resolveContentPlacement({
    textbox,
    style,
    updates,
    placement,
    styleMaps,
    contentUpdate
  }: {
    textbox: EditorTextbox
    style: TextStyleOptions
    updates: Partial<BackgroundTextboxProps>
    placement: ObjectPlacement
    styleMaps: TextStyleMaps
    contentUpdate: TextContentUpdate
  }): ObjectPlacement | null {
    const hasLayoutUpdates = hasLayoutAffectingStyles({
      stylesList: [
        updates,
        styleMaps.selectionStyles,
        styleMaps.lineSelectionStyles,
        styleMaps.wholeTextStyles
      ]
    })
    const hasExplicitPlacementUpdate = [style.left, style.top, style.originX, style.originY]
      .some((value) => value !== undefined)
    const hasPaddingUpdate = [
      style.paddingTop,
      style.paddingRight,
      style.paddingBottom,
      style.paddingLeft
    ].some((value) => value !== undefined)
    const hasExplicitWidthUpdate = Object.prototype.hasOwnProperty.call(updates, 'width')
    const shouldRestoreContentPlacement = hasPaddingUpdate
      && !hasExplicitPlacementUpdate
      && !contentUpdate.hasTextUpdate
      && !contentUpdate.uppercaseChanged
      && !hasLayoutUpdates
      && !hasExplicitWidthUpdate

    if (!shouldRestoreContentPlacement) return null

    return getTextboxContentPlacement({
      textbox,
      originX: placement.originX,
      originY: placement.originY
    })
  }

  /**
   * Применяет подготовленные object, range и line-default обновления к textbox.
   */
  private _applyUpdates({ preparedUpdate }: { preparedUpdate: PreparedTextUpdate }): void {
    const {
      textbox,
      placement,
      style,
      selection,
      styleMaps,
      contentUpdate,
      contentPlacement,
      syncLineStylesWithText
    } = preparedUpdate

    textbox.set(styleMaps.updates)

    this._applyWholeTextStyles({
      textbox,
      selection,
      styleMaps
    })
    this._applySelectionStyles({
      textbox,
      selection,
      styleMaps
    })
    this._applyLineDefaultUpdates({
      textbox,
      style,
      selection,
      styleMaps
    })
    this._applyPostStyleLayout({
      textbox,
      placement,
      style,
      styleMaps,
      contentUpdate,
      contentPlacement,
      syncLineStylesWithText
    })

    textbox.setCoords()
  }

  /**
   * Применяет whole-text styles, когда update затрагивает весь textbox целиком.
   */
  private _applyWholeTextStyles({
    textbox,
    selection,
    styleMaps
  }: {
    textbox: EditorTextbox
    selection: TextSelectionContext
    styleMaps: TextStyleMaps
  }): void {
    if (selection.selectionRange) return

    if (Object.keys(styleMaps.wholeTextStyles).length === 0) return

    const fullRange = getFullTextRange({ textbox })

    if (!fullRange) return

    const stylesApplied = applyStylesToRange({
      textbox,
      styles: styleMaps.wholeTextStyles,
      range: fullRange
    })

    if (!stylesApplied) return

    textbox.dirty = true

    if (!hasLayoutAffectingStyles({ stylesList: [styleMaps.wholeTextStyles] })) return

    textbox.initDimensions()
    textbox.dirty = true
  }

  /**
   * Применяет partial selection styles и при необходимости пересчитывает размеры textbox.
   */
  private _applySelectionStyles({
    textbox,
    selection,
    styleMaps
  }: {
    textbox: EditorTextbox
    selection: TextSelectionContext
    styleMaps: TextStyleMaps
  }): void {
    if (!selection.selectionRange) return

    const selectionApplied = applyStylesToRange({
      textbox,
      styles: styleMaps.selectionStyles,
      range: selection.selectionRange
    })
    const lineApplied = selection.fontSelectionRange
      ? applyStylesToRange({
        textbox,
        styles: styleMaps.lineSelectionStyles,
        range: selection.fontSelectionRange
      })
      : false
    const hasLayoutSelectionStyles = hasLayoutAffectingStyles({
      stylesList: [
        styleMaps.selectionStyles,
        styleMaps.lineSelectionStyles,
        styleMaps.wholeTextStyles
      ]
    })

    if (!(selectionApplied || lineApplied)) return

    textbox.dirty = true

    if (hasLayoutSelectionStyles) {
      textbox.initDimensions()
      textbox.dirty = true
    }
  }

  /**
   * Обновляет line defaults для font- и decoration-style paths.
   */
  private _applyLineDefaultUpdates({
    textbox,
    style,
    selection,
    styleMaps
  }: {
    textbox: EditorTextbox
    style: TextStyleOptions
    selection: TextSelectionContext
    styleMaps: TextStyleMaps
  }): void {
    this._applyFontLineDefaultUpdates({
      textbox,
      style,
      selection
    })
    this._applyDecorationLineDefaultUpdates({
      textbox,
      style,
      selection,
      styleMaps
    })
  }

  /**
   * Обновляет line defaults для font family и font size по расширенному line range.
   */
  private _applyFontLineDefaultUpdates({
    textbox,
    style,
    selection
  }: {
    textbox: EditorTextbox
    style: TextStyleOptions
    selection: TextSelectionContext
  }): void {
    if (!selection.fontSelectionRange) return

    if (style.fontFamily === undefined && style.fontSize === undefined) return

    const lineDefaultsUpdates: LineFontDefaultUpdate = {}

    if (style.fontFamily !== undefined) {
      lineDefaultsUpdates.fontFamily = style.fontFamily
    }

    if (style.fontSize !== undefined) {
      lineDefaultsUpdates.fontSize = style.fontSize
    }

    applyLineDefaultUpdates({
      textbox,
      lineIndices: getLineIndicesForRange({
        textbox,
        range: selection.fontSelectionRange
      }),
      updates: lineDefaultsUpdates
    })
  }

  /**
   * Обновляет line defaults для decoration и color/stroke стилей в выбранном диапазоне.
   */
  private _applyDecorationLineDefaultUpdates({
    textbox,
    style,
    selection,
    styleMaps
  }: {
    textbox: EditorTextbox
    style: TextStyleOptions
    selection: TextSelectionContext
    styleMaps: TextStyleMaps
  }): void {
    if (!selection.selectionRange) return

    const hasDecorationUpdates = style.bold !== undefined
      || style.italic !== undefined
      || style.underline !== undefined
      || style.strikethrough !== undefined
      || style.color !== undefined
      || style.strokeColor !== undefined
      || style.strokeWidth !== undefined

    if (!hasDecorationUpdates) return

    const lineDefaultsUpdates: LineFontDefaultUpdate = {}

    if (styleMaps.resolvedFontWeight !== undefined) {
      lineDefaultsUpdates.fontWeight = styleMaps.resolvedFontWeight
    }

    if (styleMaps.resolvedFontStyle !== undefined) {
      lineDefaultsUpdates.fontStyle = styleMaps.resolvedFontStyle
    }

    if (style.underline !== undefined) {
      lineDefaultsUpdates.underline = style.underline
    }

    if (style.strikethrough !== undefined) {
      lineDefaultsUpdates.linethrough = style.strikethrough
    }

    if (style.color !== undefined) {
      lineDefaultsUpdates.fill = style.color
    }

    if (style.strokeColor !== undefined || style.strokeWidth !== undefined) {
      if (styleMaps.resolvedStrokeColor === null) {
        lineDefaultsUpdates.stroke = null
      }

      if (styleMaps.resolvedStrokeColor !== null && styleMaps.resolvedStrokeColor !== undefined) {
        lineDefaultsUpdates.stroke = styleMaps.resolvedStrokeColor
      }

      if (styleMaps.resolvedStrokeWidth !== undefined) {
        lineDefaultsUpdates.strokeWidth = styleMaps.resolvedStrokeWidth
      }
    }

    applyLineDefaultUpdates({
      textbox,
      lineIndices: getFullLineIndicesForRange({
        textbox,
        range: selection.selectionRange
      }),
      updates: lineDefaultsUpdates
    })
  }

  /**
   * Выполняет post-style layout шаг: dirty state, auto-expand, line sync и placement restore.
   */
  private _applyPostStyleLayout({
    textbox,
    placement,
    style,
    styleMaps,
    contentUpdate,
    contentPlacement,
    syncLineStylesWithText
  }: {
    textbox: EditorTextbox
    placement: ObjectPlacement
    style: TextStyleOptions
    styleMaps: TextStyleMaps
    contentUpdate: TextContentUpdate
    contentPlacement: ObjectPlacement | null
    syncLineStylesWithText: boolean
  }): void {
    const nextRenderedText = textbox.text ?? ''
    const hasBackgroundStyleUpdate = this._hasBackgroundStyleUpdate({ style })
    const shouldAutoExpand = this._resolveShouldAutoExpand({
      textbox,
      style,
      styleMaps,
      contentUpdate
    })

    if (hasBackgroundStyleUpdate) {
      textbox.dirty = true
    }

    this._applyAutoExpandPreference({
      textbox,
      autoExpand: style.autoExpand
    })
    this._syncRenderedTextChange({
      textbox,
      previousRenderedText: contentUpdate.previousRenderedText,
      nextRenderedText,
      syncLineStylesWithText
    })

    this.runtime.normalizeTextboxAfterContentChange({
      textbox,
      placement,
      shouldAutoExpand
    })

    if (contentPlacement) {
      this.runtime.restoreTextboxContentPlacement({
        textbox,
        contentPlacement
      })
    }
  }

  /**
   * Проверяет, затрагивает ли update visual background-box свойства textbox.
   */
  private _hasBackgroundStyleUpdate({ style }: { style: TextStyleOptions }): boolean {
    return [
      style.backgroundColor,
      style.backgroundOpacity,
      style.paddingTop,
      style.paddingRight,
      style.paddingBottom,
      style.paddingLeft,
      style.radiusTopLeft,
      style.radiusTopRight,
      style.radiusBottomRight,
      style.radiusBottomLeft
    ].some((value) => value !== undefined)
  }

  /**
   * Определяет нужно ли после текущего обновления перерасчитать auto-expand layout.
   */
  private _resolveShouldAutoExpand({
    textbox,
    style,
    styleMaps,
    contentUpdate
  }: {
    textbox: EditorTextbox
    style: TextStyleOptions
    styleMaps: TextStyleMaps
    contentUpdate: TextContentUpdate
  }): boolean {
    const resolvedAutoExpand = style.autoExpand ?? textbox.autoExpand
    const hasLayoutUpdates = hasLayoutAffectingStyles({
      stylesList: [
        styleMaps.updates,
        styleMaps.selectionStyles,
        styleMaps.lineSelectionStyles,
        styleMaps.wholeTextStyles
      ]
    })

    return resolvedAutoExpand !== false
      && !Object.prototype.hasOwnProperty.call(styleMaps.updates, 'width')
      && (
        contentUpdate.hasTextUpdate
        || contentUpdate.uppercaseChanged
        || hasLayoutUpdates
      )
  }

  /**
   * Синхронизирует persisted autoExpand preference на самом textbox.
   */
  private _applyAutoExpandPreference({
    textbox,
    autoExpand
  }: {
    textbox: EditorTextbox
    autoExpand?: boolean
  }): void {
    if (autoExpand !== undefined) {
      textbox.autoExpand = autoExpand !== false
      return
    }

    if (textbox.autoExpand === undefined) {
      textbox.autoExpand = true
    }
  }

  /**
   * Синхронизирует line styles после реального изменения rendered text.
   */
  private _syncRenderedTextChange({
    textbox,
    previousRenderedText,
    nextRenderedText,
    syncLineStylesWithText
  }: {
    textbox: EditorTextbox
    previousRenderedText: string
    nextRenderedText: string
    syncLineStylesWithText: boolean
  }): void {
    if (!syncLineStylesWithText || previousRenderedText === nextRenderedText) return

    this.runtime.syncLineStylesWithText({
      textbox,
      previousText: previousRenderedText,
      currentText: nextRenderedText
    })
  }

  /**
   * Завершает update: lifecycle events, render и history commit.
   */
  private _finishUpdate({ preparedUpdate }: { preparedUpdate: PreparedTextUpdate }): void {
    const {
      textbox,
      target,
      style,
      withoutSave,
      skipRender,
      emitLifecycleEvents,
      beforeState,
      selection,
      styleMaps
    } = preparedUpdate
    const eventOptions = {
      withoutSave: Boolean(withoutSave),
      skipRender: Boolean(skipRender)
    }
    const hasSelectionStyles = Boolean(selection.selectionRange)
      && Object.keys(styleMaps.selectionStyles).length > 0
    const beforeTextUpdatedPayload: BeforeTextUpdatedPayload = {
      textbox,
      target,
      style,
      options: eventOptions,
      updates: styleMaps.updates,
      selectionRange: selection.selectionRange ?? undefined,
      selectionStyles: hasSelectionStyles ? styleMaps.selectionStyles : undefined
    }

    if (emitLifecycleEvents) {
      this.runtime.canvas.fire('editor:before:text-updated', beforeTextUpdatedPayload)
    }

    if (!skipRender) {
      this.runtime.canvas.requestRenderAll()
    }

    const afterState = this.runtime.getSnapshot(textbox)

    this.runtime.historyManager.resumeHistory()
    if (!withoutSave) {
      this.runtime.historyManager.saveState()
    }

    if (!emitLifecycleEvents) return

    const textUpdatedPayload: TextUpdatedPayload = {
      ...beforeTextUpdatedPayload,
      before: beforeState,
      after: afterState
    }

    this.runtime.canvas.fire('editor:text-updated', textUpdatedPayload)
  }
}
