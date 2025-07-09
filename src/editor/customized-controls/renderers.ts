import { FabricObject, FabricObjectProps, util } from 'fabric'

import {
  SQUARE_SIZE,
  SQUARE_RADIUS,
  VERT_WIDTH,
  VERT_HEIGHT,
  VERT_RADIUS,
  HORIZ_WIDTH,
  HORIZ_HEIGHT,
  HORIZ_RADIUS,
  ROTATE_DIAMETER,
  LINE_WIDTH,
  ROTATE_BG,
  STROKE,
  FILL
} from './constants'

export function renderSquare(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: Partial<FabricObjectProps>,
  fabricObject: FabricObject
) {
  const size = SQUARE_SIZE
  const radius = SQUARE_RADIUS
  ctx.save()
  ctx.translate(left, top)
  ctx.rotate(util.degreesToRadians(fabricObject.angle))
  ctx.fillStyle = FILL
  ctx.strokeStyle = STROKE
  ctx.lineWidth = LINE_WIDTH
  ctx.beginPath()
  ctx.roundRect(-size / 2, -size / 2, size, size, radius)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

export function renderVerticalRect(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: Partial<FabricObjectProps>,
  fabricObject: FabricObject
) {
  const width = VERT_WIDTH
  const height = VERT_HEIGHT
  const radius = VERT_RADIUS

  ctx.save()
  ctx.translate(left, top)
  ctx.rotate(util.degreesToRadians(fabricObject.angle))
  ctx.fillStyle = FILL
  ctx.strokeStyle = STROKE
  ctx.lineWidth = LINE_WIDTH
  ctx.beginPath()
  ctx.roundRect(-width / 2, -height / 2, width, height, radius)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

export function renderHorizontalRect(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: Partial<FabricObjectProps>,
  fabricObject: FabricObject
) {
  const width = HORIZ_WIDTH
  const height = HORIZ_HEIGHT
  const radius = HORIZ_RADIUS

  ctx.save()
  ctx.translate(left, top)
  ctx.rotate(util.degreesToRadians(fabricObject.angle))
  ctx.fillStyle = FILL
  ctx.strokeStyle = STROKE
  ctx.lineWidth = LINE_WIDTH
  ctx.beginPath()
  ctx.roundRect(-width / 2, -height / 2, width, height, radius)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

// eslint-disable-next-line max-len
const rotateBase64:Base64URLString = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTE4Ljc1IDQuMzc1djMuNzVhLjYyNS42MjUgMCAwIDEtLjYyNS42MjVoLTMuNzVhLjYyNS42MjUgMCAwIDEgMC0xLjI1aDIuMTRsLTIuMDc3LTEuOTAzLS4wMi0uMDE5YTYuMjUgNi4yNSAwIDEgMC0uMTMgOC45NjcuNjI2LjYyNiAwIDAgMSAuODYuOTA5QTcuNDU2IDcuNDU2IDAgMCAxIDEwIDE3LjVoLS4xMDNhNy41IDcuNSAwIDEgMSA1LjM5Ni0xMi44MTJMMTcuNSA2LjcwM1Y0LjM3NWEuNjI1LjYyNSAwIDAgMSAxLjI1IDBaIi8+PC9zdmc+'
const rotateImg = new Image()
rotateImg.src = rotateBase64

export function renderRotationControl(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: Partial<FabricObjectProps>,
  fabricObject: FabricObject
) {
  const size = ROTATE_DIAMETER
  const radius = size / 2

  // Рисуем круглый фон
  ctx.save()
  ctx.translate(left, top)
  ctx.rotate(util.degreesToRadians(fabricObject.angle))
  ctx.fillStyle = ROTATE_BG
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, 2 * Math.PI)
  ctx.fill()
  ctx.drawImage(rotateImg, -radius / 2, -radius / 2, radius, radius)
  ctx.restore()
}
