import type {
  ShapeAddParams,
  ShapeTextStyleParams,
  TextAddParams,
  TextSelectionStyleInfo,
  TextStyleParams
} from '../../types'

export const TEXT_LINE_STYLE_INITIAL_TEXT = 'TEST \n TEST TEXT'
export const TEXT_LINE_STYLE_FIRST_LINE_TEXT = 'FIRST LINE'
export const TEXT_LINE_STYLE_SECOND_LINE_TEXT = 'SECOND LINE'
export const TEXT_LINE_STYLE_THREE_LINE_TEXT = 'FIRST\nSECOND\nTHIRD'
export const TEXT_LINE_STYLE_AFTER_LINE_REMOVAL_TEXT = 'FIRST\nTHIRD'
export const TEXT_LINE_STYLE_AFTER_LINE_INSERT_TEXT = 'FIRST\nNEW\nTHIRD'

export const TEXT_LINE_STYLE_FIRST_LINE_SELECTION = {
  start: 0,
  end: 5
}

export const TEXT_LINE_STYLE_SECOND_LINE_SELECTION = {
  start: 6,
  end: TEXT_LINE_STYLE_INITIAL_TEXT.length
}

export const TEXT_LINE_STYLE_DELETED_LINE_SELECTION = {
  start: 6,
  end: 12
}

export const TEXT_LINE_STYLE_BASE_TEXT_STYLE = {
  color: '#111111',
  fontFamily: 'Roboto',
  fontSize: 48
} satisfies TextStyleParams & ShapeTextStyleParams

export const TEXT_LINE_STYLE_FIRST_LINE_STYLE = {
  bold: true,
  color: '#ff8800',
  fontFamily: 'Exo 2',
  fontSize: 36,
  italic: true,
  strokeColor: '#333333',
  strokeWidth: 1,
  strikethrough: true,
  underline: true
} satisfies TextStyleParams & ShapeTextStyleParams

export const TEXT_LINE_STYLE_SECOND_LINE_STYLE = {
  bold: true,
  color: '#ff8800',
  fontFamily: 'Oswald',
  fontSize: 24,
  italic: true,
  strokeColor: '#333333',
  strokeWidth: 1,
  strikethrough: true,
  underline: true
} satisfies TextStyleParams & ShapeTextStyleParams

export const TEXT_LINE_STYLE_FIRST_LINE_EXPECTED_STYLE = {
  fill: '#ff8800',
  fontFamily: 'Exo 2',
  fontSize: 36,
  fontStyle: 'italic',
  fontWeight: 'bold',
  linethrough: true,
  stroke: '#333333',
  strokeWidth: 1,
  underline: true
} satisfies Partial<TextSelectionStyleInfo>

export const TEXT_LINE_STYLE_SECOND_LINE_EXPECTED_STYLE = {
  fill: '#ff8800',
  fontFamily: 'Oswald',
  fontSize: 24,
  fontStyle: 'italic',
  fontWeight: 'bold',
  linethrough: true,
  stroke: '#333333',
  strokeWidth: 1,
  underline: true
} satisfies Partial<TextSelectionStyleInfo>

export const TEXT_LINE_STYLE_ADD_OPTIONS = {
  text: TEXT_LINE_STYLE_INITIAL_TEXT,
  autoExpand: false,
  width: 260,
  ...TEXT_LINE_STYLE_BASE_TEXT_STYLE
} satisfies TextAddParams

export const TEXT_LINE_STYLE_THREE_LINE_ADD_OPTIONS = {
  text: TEXT_LINE_STYLE_THREE_LINE_TEXT,
  autoExpand: false,
  width: 260,
  ...TEXT_LINE_STYLE_BASE_TEXT_STYLE
} satisfies TextAddParams

export const TEXT_LINE_STYLE_SHAPE_ADD_OPTIONS = {
  presetKey: 'square',
  options: {
    text: TEXT_LINE_STYLE_INITIAL_TEXT,
    textStyle: TEXT_LINE_STYLE_BASE_TEXT_STYLE,
    width: 320,
    height: 180
  }
} satisfies ShapeAddParams
