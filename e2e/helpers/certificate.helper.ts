import type { Page } from '@playwright/test'

/**
 * Обходит Chrome interstitial-страницу с предупреждением о самоподписанном сертификате.
 * Если страница содержит кнопку "Advanced" — кликает по ней и затем по "Proceed".
 * Если interstitial не появился — ничего не делает.
 */
export async function bypassCertificateWarning({ page }: { page: Page }): Promise<void> {
  const advancedButton = page.locator('#details-button')
  const isVisible = await advancedButton.isVisible({ timeout: 2000 }).catch(() => false)

  if (!isVisible) return

  await advancedButton.click()
  await page.locator('#proceed-link').click()
}
