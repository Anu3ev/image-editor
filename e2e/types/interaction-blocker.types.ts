/** Serialized state of the interaction blocker and overlay mask. */
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
