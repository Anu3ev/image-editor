/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page } from '@playwright/test'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'

export class HistoryModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Выполняет undo через публичный API historyManager */
  async undo(): Promise<void> {
    await this.page.evaluate(async() => {
      const { editor } = window as any
      await editor.historyManager.undo()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Выполняет redo через публичный API historyManager */
  async redo(): Promise<void> {
    await this.page.evaluate(async() => {
      const { editor } = window as any
      await editor.historyManager.redo()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Явно сохраняет текущее состояние canvas в историю */
  async saveState(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any
      editor.historyManager.saveState()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Принудительно фиксирует отложенное сохранение после text editing */
  async flushPendingSave(): Promise<boolean> {
    return this.page.evaluate(() => {
      const { editor } = window as any
      return editor.historyManager.flushPendingSave()
    })
  }

  /** Возвращает сериализованное состояние history для проверок persistence payload. */
  async getSerializedState(): Promise<unknown> {
    return this.page.evaluate(() => {
      const { editor } = window as any
      const { historyManager } = editor

      return {
        baseState: historyManager.baseState,
        fullState: historyManager.getFullState(),
        patches: historyManager.patches
      }
    })
  }

  /** Возвращает serialized history строкой для проверок payload. */
  async getSerializedStateText(): Promise<string> {
    return JSON.stringify(await this.getSerializedState())
  }
}
