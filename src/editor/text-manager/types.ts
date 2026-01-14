import type { Textbox, TextboxProps } from 'fabric'
import type {
  BackgroundTextboxProps,
  LineFontDefaults
} from './background-textbox'
import type { TextSelectionRange } from '../utils/text'

export type TextCreationFlags = {
  withoutSelection?: boolean
  withoutSave?: boolean
  withoutAdding?: boolean
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

export type EditorTextbox = Textbox & Partial<BackgroundTextboxProps> & {
  autoExpand?: boolean
  __lineDefaultsPrevText?: string
}

export type TextReference = string | EditorTextbox | null | undefined

export type UpdateOptions = {
  target?: TextReference
  style?: TextStyleOptions
  withoutSave?: boolean
  skipRender?: boolean
  selectionRange?: TextSelectionRange | null
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

export type TextboxStyles = Record<string, Record<string, TextboxProps>>

export type LineFontDefaultUpdate = {
  fill?: string
  fontFamily?: string
  fontSize?: number
  stroke?: string | null
}

export type ScalingState = {
  baseWidth: number
  baseLeft: number
  baseFontSize: number
  baseStyles: TextboxStyles
  baseLineFontDefaults?: LineFontDefaults
  basePadding: PaddingValues
  baseRadii: CornerRadiiValues
  hasWidthChange: boolean
}

export type TextboxSnapshot = Record<string, unknown>

export type TextEditingAnchor = {
  originY: EditorTextbox['originY']
  x: number
  y: number
}
