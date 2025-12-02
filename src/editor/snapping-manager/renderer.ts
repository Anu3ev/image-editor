import { GUIDE_COLOR, GUIDE_WIDTH } from './constants'
import type { SpacingGuide } from './types'

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
export const drawSpacingBadge = ({
  context,
  type,
  axis,
  start,
  end,
  text,
  zoom
}: {
  context: CanvasRenderingContext2D
  type: SpacingGuide['type']
  axis: number
  start: number
  end: number
  text: string
  zoom: number
}): void => {
  const fontSize = 12 / zoom
  const padding = 4 / zoom
  const radius = 4 / zoom
  const centerAlongInterval = (start + end) / 2

  context.save()
  context.setLineDash([])
  context.fillStyle = GUIDE_COLOR
  context.strokeStyle = GUIDE_COLOR
  context.lineWidth = GUIDE_WIDTH / zoom
  context.font = `${fontSize}px sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  const badgeWidth = context.measureText(text).width + padding * 2
  const badgeHeight = fontSize + padding * 2

  const x = type === 'vertical' ? axis : centerAlongInterval
  const y = type === 'vertical' ? centerAlongInterval : axis
  const rectX = x - (badgeWidth / 2)
  const rectY = y - (badgeHeight / 2)

  context.beginPath()
  drawRoundedRectPath({
    context,
    x: rectX,
    y: rectY,
    width: badgeWidth,
    height: badgeHeight,
    radius
  })
  context.fill()

  context.fillStyle = '#ffffff'
  context.fillText(text, x, y)
  context.restore()
}

/**
 * Отрисовывает линии и бейджи для равноудалённых интервалов.
 */
export const drawSpacingGuide = ({
  context,
  guide,
  zoom
}: {
  context: CanvasRenderingContext2D
  guide: SpacingGuide
  zoom: number
}): void => {
  const {
    type,
    axis,
    refStart,
    refEnd,
    activeStart,
    activeEnd,
    distance
  } = guide
  const distanceLabel = Math.round(distance).toString()

  context.beginPath()
  if (type === 'vertical') {
    context.moveTo(axis, refStart)
    context.lineTo(axis, refEnd)
    context.moveTo(axis, activeStart)
    context.lineTo(axis, activeEnd)
  } else {
    context.moveTo(refStart, axis)
    context.lineTo(refEnd, axis)
    context.moveTo(activeStart, axis)
    context.lineTo(activeEnd, axis)
  }
  context.stroke()

  drawSpacingBadge({
    context,
    type,
    axis,
    start: refStart,
    end: refEnd,
    text: distanceLabel,
    zoom
  })
  drawSpacingBadge({
    context,
    type,
    axis,
    start: activeStart,
    end: activeEnd,
    text: distanceLabel,
    zoom
  })
}
