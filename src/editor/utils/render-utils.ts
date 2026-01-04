/**
 * Строит путь скруглённого прямоугольника.
 */
export const drawRoundedRectPath = ({
  context,
  x,
  y,
  width,
  height,
  radius
}: {
  context: CanvasRenderingContext2D
  x: number
  y: number
  width: number
  height: number
  radius: number
}): void => {
  const safeRadius = Math.min(radius, width / 2, height / 2)

  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  context.lineTo(x + safeRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  context.lineTo(x, y + safeRadius)
  context.quadraticCurveTo(x, y, x + safeRadius, y)
  context.closePath()
}

/**
 * Рисует прямоугольный бейдж расстояния в центре указанного интервала.
 */
export const drawGuideLabel = ({
  context,
  type,
  axis,
  start,
  end,
  text,
  zoom,
  color,
  textColor = '#ffffff',
  fontFamily = 'sans-serif',
  lineWidth = 1,
  padding = 4,
  radius = 4,
  offsetAlongAxis = 0,
  offsetPerpendicular = 0
}: {
  context: CanvasRenderingContext2D
  type: 'vertical' | 'horizontal'
  axis: number
  start: number
  end: number
  text: string
  zoom: number
  color: string
  textColor?: string
  fontFamily?: string
  lineWidth?: number
  padding?: number
  radius?: number
  offsetAlongAxis?: number
  offsetPerpendicular?: number
}): void => {
  const safeZoom = zoom || 1
  const fontSize = 12 / safeZoom
  const scaledPadding = padding / safeZoom
  const scaledRadius = radius / safeZoom
  const centerAlongInterval = (start + end) / 2 + offsetAlongAxis
  const x = type === 'vertical'
    ? axis + offsetPerpendicular
    : centerAlongInterval
  const y = type === 'vertical'
    ? centerAlongInterval
    : axis + offsetPerpendicular

  context.save()
  context.setLineDash([])
  context.fillStyle = color
  context.strokeStyle = color
  context.lineWidth = lineWidth / safeZoom
  context.font = `${fontSize}px ${fontFamily}`
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  const textWidth = context.measureText(text).width
  const badgeWidth = textWidth + scaledPadding * 2
  const badgeHeight = fontSize + scaledPadding * 2

  const rectX = x - (badgeWidth / 2)
  const rectY = y - (badgeHeight / 2)

  context.beginPath()
  drawRoundedRectPath({
    context,
    x: rectX,
    y: rectY,
    width: badgeWidth,
    height: badgeHeight,
    radius: scaledRadius
  })
  context.fill()

  context.fillStyle = textColor
  context.fillText(text, x, y)
  context.restore()
}
