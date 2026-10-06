import type { Page } from '@playwright/test'
import { installEditorBrowserHelpers } from './browser/editor-browser-helpers.installer'

/**
 * Injects browser-side helpers for editor e2e models.
 * Must be called before `page.goto()`.
 */
export async function injectEditorBrowserHelpers({ page }: { page: Page }): Promise<void> {
  await page.addInitScript(installEditorBrowserHelpers)
}
