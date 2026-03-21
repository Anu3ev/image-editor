import type { TestInfo } from '@playwright/test'

/**
 * Задержка удержания браузера после headed e2e-теста.
 *
 * Установите `0`, чтобы полностью отключить удержание.
 */
export const HEADED_BROWSER_HOLD_MS = 300

/**
 * Возвращает задержку удержания браузера после headed-запуска теста.
 */
export function resolveHeadedBrowserHoldMs({ testInfo }: { testInfo: TestInfo }): number {
  const isHeaded = testInfo.project.use.headless === false
  if (!isHeaded) return 0

  if (HEADED_BROWSER_HOLD_MS <= 0) return 0

  return HEADED_BROWSER_HOLD_MS
}
