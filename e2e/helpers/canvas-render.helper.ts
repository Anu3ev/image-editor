import type { Page } from '@playwright/test'

/**
 * Waits for two consecutive animation frames so Fabric can finish deferred rendering and coordinate recalculation.
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
