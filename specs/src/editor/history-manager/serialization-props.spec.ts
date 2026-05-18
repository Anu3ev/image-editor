import { OBJECT_SERIALIZATION_PROPS } from '../../../../src/editor/history-manager/constants'

describe('HistoryManager serialization props', () => {
  it('history serialization включает режим авторасширения текста у фигуры', () => {
    expect(OBJECT_SERIALIZATION_PROPS).toContain('shapeTextAutoExpand')
  })

  it('history serialization не включает временную wrap policy текста у фигуры', () => {
    expect(OBJECT_SERIALIZATION_PROPS).not.toContain('shapeTextWrapPolicy')
  })

  it('history serialization включает replacement box у фигуры', () => {
    expect(OBJECT_SERIALIZATION_PROPS).toContain('shapeReplaceBoxWidth')
    expect(OBJECT_SERIALIZATION_PROPS).toContain('shapeReplaceBoxHeight')
  })
})
