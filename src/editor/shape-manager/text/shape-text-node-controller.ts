import type TextManager from '../../text-manager'
import type { TextStyleOptions } from '../../text-manager'
import {
  prepareShapeTextNode
} from '../domain/shape-runtime'
import {
  SHAPE_DEFAULT_HORIZONTAL_ALIGN
} from '../domain/shape-presets'
import type {
  ShapeGroupLike,
  ShapeHorizontalAlign,
  ShapeTextNode,
  ShapeTextStyleOptions
} from '../types'

/**
 * Параметры создания текстового узла внутри shape-группы.
 */
type ShapeTextNodeCreationOptions = {
  text?: string
  textStyle?: ShapeTextStyleOptions
  width: number
  align: ShapeHorizontalAlign
  opacity?: number
}

/**
 * Параметры программного обновления текстового узла внутри shape-группы.
 */
type ShapeTextNodeUpdateOptions = {
  textNode: ShapeTextNode
  text?: string
  textStyle?: ShapeTextStyleOptions
  align?: ShapeHorizontalAlign
  syncLineStylesWithText?: boolean
}

/**
 * Text style значения без target и lifecycle-флагов обновления.
 */
type ShapeTextNodeStyleUpdateOptions = {
  text?: string
  textStyle?: ShapeTextStyleOptions
  align?: ShapeHorizontalAlign
}

/**
 * Text style keys, которые не меняют измеряемую геометрию текста.
 */
const SHAPE_TEXT_VISUAL_ONLY_STYLE_KEYS = new Set<keyof ShapeTextStyleOptions>([
  'align',
  'color',
  'strokeColor',
  'strokeWidth',
  'underline',
  'strikethrough',
  'opacity'
])

/**
 * Клонирует изменяемое style-состояние Fabric перед staged update.
 */
const cloneTextStyleState = <Value>(value?: Value): Value | undefined => {
  if (value === undefined) return undefined

  return JSON.parse(JSON.stringify(value)) as Value
}

/**
 * Адаптирует TextManager для текстового узла, которым владеет shape-группа.
 */
export default class ShapeTextNodeController {
  /**
   * Разрешает TextManager после завершения manager composition.
   */
  private readonly resolveTextManager: () => TextManager

  /**
   * Узлы, которые контроллер обновляет без внешнего shape lifecycle.
   */
  private readonly internalUpdates: WeakSet<ShapeTextNode>

  /**
   * Создаёт адаптер с отложенным разрешением TextManager.
   *
   * ShapeManager подписывается на Fabric events раньше TextManager, поэтому
   * dependency нельзя читать до завершения composition root.
   */
  constructor({
    resolveTextManager
  }: {
    resolveTextManager: () => TextManager
  }) {
    this.resolveTextManager = resolveTextManager
    this.internalUpdates = new WeakSet()
  }

  /**
   * Создаёт вложенный textbox без добавления на canvas и editor-level lifecycle events.
   */
  public create({
    text,
    textStyle,
    width,
    align,
    opacity
  }: ShapeTextNodeCreationOptions): ShapeTextNode {
    const style = textStyle ?? {}
    const updates: TextStyleOptions = {
      ...style,
      text: text ?? style.text ?? '',
      align,
      autoExpand: false,
      splitByGrapheme: false,
      width: Math.max(1, width),
      left: 0,
      top: 0
    }

    if (typeof opacity === 'number' && style.opacity === undefined) {
      updates.opacity = opacity
    }

    const textbox = this._getTextManager().addText(updates, {
      withoutAdding: true,
      withoutSave: true,
      withoutSelection: true,
      emitLifecycleEvents: false
    }) as ShapeTextNode

    textbox.set({
      shapeNodeType: 'text',
      splitByGrapheme: false
    })
    prepareShapeTextNode({ text: textbox })

    return textbox
  }

  /**
   * Применяет обновления к shape-owned textbox без отдельной history-записи TextManager.
   */
  public applyUpdates({
    textNode,
    text,
    textStyle,
    align,
    syncLineStylesWithText
  }: ShapeTextNodeUpdateOptions): void {
    const styleUpdates = this._resolveStyleUpdates({
      text,
      textStyle,
      align
    })

    this.internalUpdates.add(textNode)

    try {
      const updatedTextNode = this._getTextManager().updateText({
        target: textNode,
        style: styleUpdates,
        skipRender: true,
        withoutSave: true,
        emitLifecycleEvents: false,
        syncLineStylesWithText
      })

      if (updatedTextNode) updatedTextNode.autoExpand = false
    } finally {
      this.internalUpdates.delete(textNode)
    }

    textNode.autoExpand = false
  }

  /**
   * Возвращает текущее состояние textbox для staged shape update.
   */
  public resolveCurrentStyle({
    group,
    textNode
  }: {
    group: ShapeGroupLike
    textNode: ShapeTextNode
  }): TextStyleOptions {
    const textNodeWithCase = textNode as ShapeTextNode & {
      uppercase?: boolean
    }
    const align = this._resolveCurrentAlign({
      group,
      textAlign: textNode.textAlign
    })

    return {
      align,
      backgroundColor: typeof textNode.backgroundColor === 'string'
        ? textNode.backgroundColor
        : undefined,
      backgroundOpacity: textNode.backgroundOpacity,
      bold: textNode.fontWeight === 'bold',
      color: typeof textNode.fill === 'string' ? textNode.fill : undefined,
      fontFamily: textNode.fontFamily,
      fontSize: textNode.fontSize,
      italic: textNode.fontStyle === 'italic',
      lineFontDefaults: cloneTextStyleState(textNode.lineFontDefaults),
      opacity: textNode.opacity,
      paddingBottom: textNode.paddingBottom,
      paddingLeft: textNode.paddingLeft,
      paddingRight: textNode.paddingRight,
      paddingTop: textNode.paddingTop,
      radiusBottomLeft: textNode.radiusBottomLeft,
      radiusBottomRight: textNode.radiusBottomRight,
      radiusTopLeft: textNode.radiusTopLeft,
      radiusTopRight: textNode.radiusTopRight,
      splitByGrapheme: false,
      strokeColor: typeof textNode.stroke === 'string' ? textNode.stroke : undefined,
      strokeWidth: textNode.strokeWidth,
      strikethrough: Boolean(textNode.linethrough),
      styles: cloneTextStyleState(textNode.styles),
      underline: Boolean(textNode.underline),
      uppercase: Boolean(textNodeWithCase.uppercase)
    }
  }

  /**
   * Проверяет, может ли изменение textStyle повлиять на размеры text layout.
   */
  public hasSizeAffectingStyleChanges({
    textStyle
  }: {
    textStyle?: ShapeTextStyleOptions
  }): boolean {
    if (!textStyle) return false

    const keys = Object.keys(textStyle) as Array<keyof ShapeTextStyleOptions>

    for (let index = 0; index < keys.length; index += 1) {
      if (!SHAPE_TEXT_VISUAL_ONLY_STYLE_KEYS.has(keys[index])) return true
    }

    return false
  }

  /**
   * Проверяет, обновляется ли узел самим shape text controller.
   */
  public isInternalUpdate({ textNode }: { textNode: ShapeTextNode }): boolean {
    return this.internalUpdates.has(textNode)
  }

  /**
   * Собирает TextManager style update и фиксирует shape-owned textbox invariants.
   */
  private _resolveStyleUpdates({
    text,
    textStyle,
    align
  }: ShapeTextNodeStyleUpdateOptions): TextStyleOptions {
    const styleUpdates: TextStyleOptions = {}

    if (textStyle) {
      const keys = Object.keys(textStyle) as Array<keyof ShapeTextStyleOptions>

      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index]
        styleUpdates[key] = textStyle[key] as never
      }
    }

    if (text !== undefined) styleUpdates.text = text
    if (align) styleUpdates.align = align

    styleUpdates.autoExpand = false
    styleUpdates.splitByGrapheme = false

    return styleUpdates
  }

  /**
   * Возвращает актуальное выравнивание staged text style.
   */
  private _resolveCurrentAlign({
    group,
    textAlign
  }: {
    group: ShapeGroupLike
    textAlign?: string
  }): ShapeHorizontalAlign {
    if (
      textAlign === 'left'
      || textAlign === 'center'
      || textAlign === 'right'
      || textAlign === 'justify'
    ) return textAlign

    return group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
  }

  /**
   * Возвращает готовый TextManager или явно прерывает преждевременный вызов.
   */
  private _getTextManager(): TextManager {
    const textManager = this.resolveTextManager()

    if (!textManager) {
      throw new Error('Shape text operation requires initialized TextManager')
    }

    return textManager
  }
}
