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
 * Parameters for creating a text node inside a shape group.
 */
type ShapeTextNodeCreationOptions = {
  text?: string
  textStyle?: ShapeTextStyleOptions
  width: number
  align: ShapeHorizontalAlign
  opacity?: number
}

/**
 * Parameters for programmatically updating a text node inside a shape group.
 */
type ShapeTextNodeUpdateOptions = {
  textNode: ShapeTextNode
  text?: string
  textStyle?: ShapeTextStyleOptions
  align?: ShapeHorizontalAlign
  syncLineStylesWithText?: boolean
}

/**
 * Text-style values without the target and update lifecycle flags.
 */
type ShapeTextNodeStyleUpdateOptions = {
  text?: string
  textStyle?: ShapeTextStyleOptions
  align?: ShapeHorizontalAlign
}

/**
 * Text-style keys that do not change measured text geometry.
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
 * Clones mutable Fabric style state before a staged update.
 */
const cloneTextStyleState = <Value>(value?: Value): Value | undefined => {
  if (value === undefined) return undefined

  return JSON.parse(JSON.stringify(value)) as Value
}

/**
 * Adapts TextManager for a text node owned by a shape group.
 */
export default class ShapeTextNodeController {
  /**
   * Resolves TextManager after manager composition is complete.
   */
  private readonly resolveTextManager: () => TextManager

  /**
   * Nodes the controller updates without an external shape lifecycle.
   */
  private readonly internalUpdates: WeakSet<ShapeTextNode>

  /**
   * Creates an adapter with deferred TextManager resolution.
   *
   * ShapeManager subscribes to Fabric events before TextManager, so
   * the dependency cannot be read until the composition root is complete.
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
   * Creates a nested textbox without adding it to the canvas or emitting editor-level lifecycle events.
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
   * Applies updates to a shape-owned textbox without a separate TextManager history entry.
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
   * Returns the current textbox state for a staged shape update.
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
   * Checks whether a textStyle change can affect text-layout dimensions.
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
   * Checks whether the node is being updated by the shape text controller itself.
   */
  public isInternalUpdate({ textNode }: { textNode: ShapeTextNode }): boolean {
    return this.internalUpdates.has(textNode)
  }

  /**
   * Builds a TextManager style update and enforces shape-owned textbox invariants.
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
   * Returns the current alignment from the staged text style.
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
   * Returns a ready TextManager or explicitly aborts a premature call.
   */
  private _getTextManager(): TextManager {
    const textManager = this.resolveTextManager()

    if (!textManager) {
      throw new Error('Shape text operation requires initialized TextManager')
    }

    return textManager
  }
}
