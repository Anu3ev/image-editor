import type {
  FabricObject,
  TextStyle,
  TextboxProps
} from 'fabric'
import type { ObjectPlacement } from '../canvas-manager'
import type {
  BackgroundTextbox,
  BackgroundTextboxProps,
  LineFontDefaults
} from './background-textbox'
import type { TextSelectionRange } from '../utils/text'

export type TextCreationFlags = {
  withoutSelection?: boolean
  withoutSave?: boolean
  withoutAdding?: boolean
  emitLifecycleEvents?: boolean
}

export type TextStyleOptions = {
  id?: string
  text?: string
  autoExpand?: boolean
  fontFamily?: string
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  uppercase?: boolean
  strikethrough?: boolean
  align?: 'left' | 'center' | 'right' | 'justify'
  color?: string
  strokeColor?: string
  strokeWidth?: number
  opacity?: number
  backgroundColor?: string
  backgroundOpacity?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  radiusTopLeft?: number
  radiusTopRight?: number
  radiusBottomRight?: number
  radiusBottomLeft?: number
} & Partial<
  Omit<
    BackgroundTextboxProps,
    | 'fontFamily'
    | 'fontSize'
    | 'fontWeight'
    | 'fontStyle'
    | 'underline'
    | 'textAlign'
    | 'fill'
    | 'linethrough'
    | 'opacity'
    | 'stroke'
    | 'strokeWidth'
    | 'text'
    | 'shadow'
    | 'textTransform'
    | 'autoExpand'
  >
>

export type EditorTextbox = BackgroundTextbox & Partial<BackgroundTextboxProps> & {
  autoExpand?: boolean
  __lineDefaultsPrevText?: string
  shouldRoundDimensionsOnInit?: boolean
}

export type TextReference = string | EditorTextbox | null | undefined

export type UpdateOptions = {
  target?: TextReference
  style?: TextStyleOptions
  withoutSave?: boolean
  skipRender?: boolean
  selectionRange?: TextSelectionRange | null
  emitLifecycleEvents?: boolean
}

export type TextAddedPayload = {
  textbox: EditorTextbox
  options: TextStyleOptions
  flags: {
    withoutSelection: boolean
    withoutSave: boolean
    withoutAdding: boolean
  }
}

/**
 * Общая часть payload editor-level событий перед и после обновления текста.
 */
export type TextUpdateLifecyclePayload = {
  textbox: EditorTextbox
  target?: TextReference
  style: TextStyleOptions
  options: {
    withoutSave: boolean
    skipRender: boolean
  }
  updates: Partial<BackgroundTextboxProps>
  selectionRange?: TextSelectionRange
  selectionStyles?: Partial<TextboxProps>
}

/**
 * Payload события, которое эмитится до фиксации текстового обновления в истории.
 */
export type BeforeTextUpdatedPayload = TextUpdateLifecyclePayload

/**
 * Снимок состояния текстового объекта для lifecycle payload текстовых событий.
 */
export type TextboxSnapshot = Record<string, unknown>

/**
 * Payload финального события после текстового обновления.
 */
export type TextUpdatedPayload = TextUpdateLifecyclePayload & {
  before: TextboxSnapshot
  after: TextboxSnapshot
}

export type PaddingValues = {
  bottom: number
  left: number
  right: number
  top: number
}

export type CornerRadiiValues = {
  bottomLeft: number
  bottomRight: number
  topLeft: number
  topRight: number
}

export type TextboxStyles = TextStyle

export type LineFontDefaultUpdate = {
  fill?: string
  fontFamily?: string
  fontSize?: number
  fontStyle?: TextboxProps['fontStyle']
  fontWeight?: TextboxProps['fontWeight']
  linethrough?: boolean
  stroke?: string | null
  strokeWidth?: number
  underline?: boolean
}

export type TextScaleBaseState = {
  width: number
  fontSize: number
  styles: TextboxStyles
  lineFontDefaults?: LineFontDefaults
  padding: PaddingValues
  radii: CornerRadiiValues
}

export type ScalingState = {
  startBase: TextScaleBaseState
  startObjectPlacement: ObjectPlacement
  startTransformCorner: string | null
  startTransformOriginX: FabricObject['originX'] | null
  startTransformOriginY: FabricObject['originY'] | null
  lastAllowedScaleX: number
  lastAllowedScaleY: number
  lastAllowedAnchorPlacement: ObjectPlacement
  minimumWidthScale: number
  minimumFontScale: number
  minimumProportionalScale: number
  hasScalingChange: boolean
}
