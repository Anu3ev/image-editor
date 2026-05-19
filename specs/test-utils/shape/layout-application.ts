import type { MockShapeGroup, MockShapeNode, MockShapeTextbox } from './factories'

export const applyShapeTextLayoutToMockGroup = ({
  group,
  shape,
  text,
  width,
  height,
  alignH,
  alignV,
  padding
}: {
  group: MockShapeGroup
  shape: MockShapeNode
  text: MockShapeTextbox
  width: number
  height: number
  alignH?: 'left' | 'center' | 'right' | 'justify'
  alignV?: 'top' | 'middle' | 'bottom'
  padding?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
}): void => {
  shape.set({
    width,
    height
  })

  text.set({
    textAlign: alignH ?? text.textAlign,
    scaleX: 1,
    scaleY: 1
  })
  text.initDimensions()
  text.setCoords()

  group.shapeBaseWidth = width
  group.shapeBaseHeight = height
  group.shapeAlignHorizontal = alignH ?? group.shapeAlignHorizontal
  group.shapeAlignVertical = alignV ?? group.shapeAlignVertical

  if (padding) {
    group.shapePaddingTop = padding.top ?? group.shapePaddingTop
    group.shapePaddingRight = padding.right ?? group.shapePaddingRight
    group.shapePaddingBottom = padding.bottom ?? group.shapePaddingBottom
    group.shapePaddingLeft = padding.left ?? group.shapePaddingLeft
  }

  group.set({
    width,
    height,
    scaleX: 1,
    scaleY: 1
  })
  group.setCoords()
  shape.setCoords()
}

export const applyTextStyleToShapeText = ({
  target,
  style
}: {
  target: {
    set: (updates: Record<string, unknown>) => void
    autoExpand?: boolean
  }
  style: Record<string, unknown>
}): void => {
  const nextStyle: Record<string, unknown> = {}
  const styleKeys = Object.keys(style)

  for (let index = 0; index < styleKeys.length; index += 1) {
    const key = styleKeys[index]
    const value = style[key]

    if (key === 'align') {
      nextStyle.textAlign = value
      continue
    }

    if (key === 'color') {
      nextStyle.fill = value
      continue
    }

    if (key === 'strokeColor') {
      nextStyle.stroke = value
      continue
    }

    if (key === 'bold') {
      nextStyle.fontWeight = value ? 'bold' : 'normal'
      continue
    }

    if (key === 'italic') {
      nextStyle.fontStyle = value ? 'italic' : 'normal'
      continue
    }

    if (key === 'strikethrough') {
      nextStyle.linethrough = value
      continue
    }

    nextStyle[key] = value
  }

  target.set(nextStyle)
  target.autoExpand = false
}
