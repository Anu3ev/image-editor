import type { Control } from 'fabric'
import { renderSquare, renderVerticalRect, renderHorizontalRect, renderRotationControl } from './renderers'

import {
  SQUARE_SIZE,
  VERT_WIDTH,
  VERT_HEIGHT,
  HORIZ_WIDTH,
  HORIZ_HEIGHT,
  ROTATE_DIAMETER
} from './constants'

type ControlKey = 'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'mt' | 'mb' | 'mtr';

export const DEFAULT_CONTROLS: Record<ControlKey, Partial<Control>> = {
  // Угловые точки
  tl: {
    render: renderSquare,
    sizeX: SQUARE_SIZE,
    sizeY: SQUARE_SIZE,
    offsetX: 0,
    offsetY: 0
  },
  tr: {
    render:
    renderSquare,
    sizeX: SQUARE_SIZE,
    sizeY: SQUARE_SIZE,
    offsetX: 0,
    offsetY: 0
  },
  bl: {
    render: renderSquare,
    sizeX: SQUARE_SIZE,
    sizeY: SQUARE_SIZE,
    offsetX: 0,
    offsetY: 0
  },
  br: {
    render: renderSquare,
    sizeX: SQUARE_SIZE,
    sizeY: SQUARE_SIZE,
    offsetX: 0,
    offsetY: 0
  },

  // Середина вертикалей
  ml: {
    render: renderVerticalRect,
    sizeX: VERT_WIDTH,
    sizeY: VERT_HEIGHT,
    offsetX: 0,
    offsetY: 0
  },
  mr: {
    render: renderVerticalRect,
    sizeX: VERT_WIDTH,
    sizeY: VERT_HEIGHT,
    offsetX: 0,
    offsetY: 0
  },

  // Середина горизонталей
  mt: {
    render: renderHorizontalRect,
    sizeX: HORIZ_WIDTH,
    sizeY: HORIZ_HEIGHT,
    offsetX: 0,
    offsetY: 0
  },
  mb: { render: renderHorizontalRect,
    sizeX: HORIZ_WIDTH,
    sizeY: HORIZ_HEIGHT,
    offsetX: 0,
    offsetY: 0 },

  // Специальный «rotate» контрол
  mtr: {
    render: renderRotationControl,
    sizeX: ROTATE_DIAMETER,
    sizeY: ROTATE_DIAMETER,
    offsetX: 0,
    offsetY: -ROTATE_DIAMETER
  }
}
