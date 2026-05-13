/** Сериализованное состояние interaction blocker и overlay-маски. */
export interface InteractionBlockerStateInfo {
  isBlocked: boolean
  overlayExists: boolean
  overlayType: string | null
  overlayVisible: boolean
  overlayFill: string | null
  upperCanvasPointerEvents: string
  lowerCanvasPointerEvents: string
  boundsLeft: number
  boundsTop: number
  boundsWidth: number
  boundsHeight: number
  boundsRight: number
  boundsBottom: number
  boundsCenterX: number
  boundsCenterY: number
}
