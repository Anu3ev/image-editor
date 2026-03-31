import type { Page } from '@playwright/test'

/**
 * Ждёт два animation frame подряд, чтобы Fabric успел завершить отложенный render и пересчёт координат.
 */
export async function waitForCanvasRender({ page }: { page: Page }): Promise<void> {
  await page.evaluate(async() => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })
  })
}
