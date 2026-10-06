/** Narrow browser viewport for window-resize scenarios. */
export const BROWSER_RESIZE_NARROW_VIEWPORT = {
  width: 960,
  height: 640
} as const

/** Wide browser viewport for window-resize scenarios. */
export const BROWSER_RESIZE_WIDE_VIEWPORT = {
  width: 1520,
  height: 920
} as const

/** Tolerance for testing object anchoring to the artboard after a window resize. */
export const BROWSER_RESIZE_TOLERANCE = 1

/** Tolerance for cover-background scenarios after a window resize. */
export const BROWSER_RESIZE_COVER_TOLERANCE = 1.5

/** Tolerance for testing artboard centering after a window resize. */
export const BROWSER_RESIZE_CENTER_TOLERANCE = 2
