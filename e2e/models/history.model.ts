/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page } from '@playwright/test'

export class HistoryModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Выполняет undo через публичный API historyManager */
  async undo(): Promise<void> {
    await this.page.evaluate(async() => {
      const w = window as any
      await w.editor.historyManager.undo()
    })
  }

  /** Выполняет redo через публичный API historyManager */
  async redo(): Promise<void> {
    await this.page.evaluate(async() => {
      const w = window as any
      await w.editor.historyManager.redo()
    })
  }

  /** Принудительно фиксирует отложенное сохранение после text editing */
  async flushPendingSave(): Promise<boolean> {
    return this.page.evaluate(() => {
      const w = window as any
      return w.editor.historyManager.flushPendingSave()
    })
  }
}
