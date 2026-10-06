import type { TestInfo } from '@playwright/test'

/**
 * Browser hold delay after a headed e2e test.
 *
 * Set to `0` to disable the hold completely.
 */
export const HEADED_BROWSER_HOLD_MS = 300

/**
 * Returns the browser hold delay after a headed test run.
 */
export function resolveHeadedBrowserHoldMs({ testInfo }: { testInfo: TestInfo }): number {
  const isHeaded = testInfo.project.use.headless === false
  if (!isHeaded) return 0

  if (HEADED_BROWSER_HOLD_MS <= 0) return 0

  return HEADED_BROWSER_HOLD_MS
}
