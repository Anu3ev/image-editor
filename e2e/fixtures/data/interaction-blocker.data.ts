/** Shape for editor-locking scenarios. */
export const BLOCKER_SHAPE_OPTIONS = {
  id: 'interaction-blocker-shape',
  left: 132,
  top: 108,
  originX: 'left',
  originY: 'top',
  width: 168,
  height: 116,
  fill: '#d4d8e8'
} as const

/** New shape color for testing editing after unlocking. */
export const BLOCKER_UPDATED_FILL = '#2f8f63'

/** Artboard dimensions for testing lock-mask synchronization. */
export const BLOCKER_UPDATED_RESOLUTION = {
  width: 688,
  height: 392
} as const

/** Large and elongated dimensions for testing the AI overlay at different artboard aspect ratios. */
export const AI_BLOCKER_EXTREME_RESOLUTION_CASES = [
  {
    title: 'квадратной 4K монтажной области',
    resolution: {
      width: 4000,
      height: 4000
    }
  },
  {
    title: 'широкой монтажной области',
    resolution: {
      width: 4000,
      height: 512
    }
  },
  {
    title: 'высокой монтажной области',
    resolution: {
      width: 512,
      height: 4000
    }
  }
] as const
