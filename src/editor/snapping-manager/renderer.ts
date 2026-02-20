import { GUIDE_COLOR, GUIDE_WIDTH } from './constants'
import type { SpacingGuide } from './types'
import { drawGuideLabel } from '../utils/render-utils'
import { resolveDisplayDistance } from '../utils/distance'

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
  const distanceLabel = resolveDisplayDistance({ distance }).toString()

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

  const labelColor = GUIDE_COLOR

  drawGuideLabel({
    context,
    type,
    axis,
    start: refStart,
    end: refEnd,
    text: distanceLabel,
    zoom,
    color: labelColor,
    lineWidth: GUIDE_WIDTH
  })
  drawGuideLabel({
    context,
    type,
    axis,
    start: activeStart,
    end: activeEnd,
    text: distanceLabel,
    zoom,
    color: labelColor,
    lineWidth: GUIDE_WIDTH
  })
}
