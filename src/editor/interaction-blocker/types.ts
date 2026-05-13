import type { Rect } from 'fabric'

export type InteractionBlockerOverlay = 'default' | 'ai-generation'

export type InteractionBlockerBlockOptions = {
  overlay?: InteractionBlockerOverlay
}

export type InteractionBlockerOverlayGeometry = Pick<
  Rect,
  | 'width'
  | 'height'
  | 'left'
  | 'top'
  | 'originX'
  | 'originY'
  | 'scaleX'
  | 'scaleY'
  | 'angle'
  | 'flipX'
  | 'flipY'
>

export interface InteractionBlockerOverlayBaseOptions extends InteractionBlockerOverlayGeometry {
  evented: boolean
  excludeFromExport: boolean
  hasBorders: boolean
  hasControls: boolean
  hoverCursor: string
  id: string
  selectable: boolean
  visible: boolean
}
