import type { AnchorBuckets, Bounds } from '../types'

/**
 * Adds snapping lines calculated from an object's bounds.
 */
export const pushBoundsToAnchors = ({
  anchors,
  bounds
}: {
  anchors: AnchorBuckets
  bounds: Bounds
}): void => {
  const {
    left,
    right,
    centerX,
    top,
    bottom,
    centerY
  } = bounds

  anchors.vertical.push(left, centerX, right)
  anchors.horizontal.push(top, centerY, bottom)
}
