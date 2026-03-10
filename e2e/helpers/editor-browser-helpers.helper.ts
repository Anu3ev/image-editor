import type { Page } from '@playwright/test'
import { installEditorBrowserHelpers } from './browser/editor-browser-helpers.installer'

/**
 * Инжектирует browser-side хелперы для e2e-моделей редактора.
 * Должен быть вызван до `page.goto()`.
 */
export async function injectEditorBrowserHelpers({ page }: { page: Page }): Promise<void> {
  await page.addInitScript(installEditorBrowserHelpers)
}
