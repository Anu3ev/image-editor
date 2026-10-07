import type { Page } from '@playwright/test'

/**
 * Bypasses Chrome's interstitial warning page for a self-signed certificate.
 * If the page contains an "Advanced" button, clicks it and then "Proceed".
 * Does nothing if no interstitial appears.
 */
export async function bypassCertificateWarning({ page }: { page: Page }): Promise<void> {
  const advancedButton = page.locator('#details-button')
  const isVisible = await advancedButton.isVisible({ timeout: 2000 }).catch(() => false)

  if (!isVisible) return

  await advancedButton.click()
  await page.locator('#proceed-link').click()
}
