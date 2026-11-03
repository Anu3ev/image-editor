/** Objects of a selection where some children are rotated on their own. */
export const ROTATED_SELECTION_SCENE = {
  rotatedSquare: { id: 'rotated-square', left: 110, top: 220, size: 80, angle: 30 },
  rotatedText: { text: 'Sale', left: 200, top: 200, fontSize: 32, angle: -20 },
  plainSquare: { id: 'plain-square', left: 215, top: 290, size: 60 }
} as const

/** Child angles that keep an object aligned with the selection axes, so side handles stay available. */
export const AXIS_ALIGNED_CHILD_ANGLES = [90, 180] as const

/** Corner handles of an active selection. */
export const SELECTION_CORNER_HANDLES = ['tl', 'tr', 'br', 'bl'] as const

/** Pointer offset for scaling a selection from its handles. */
export const SELECTION_SCALE_DRAG = { deltaX: 90, deltaY: 30, pointerSteps: 6 } as const

/** Two standalone texts for selection scaling with Shift. */
export const TEXT_SELECTION_SCENE = [
  { text: 'Summer', left: 150, top: 200 },
  { text: 'Sale', left: 150, top: 290 }
] as const
