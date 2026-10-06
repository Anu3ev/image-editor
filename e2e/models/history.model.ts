/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page } from '@playwright/test'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'
import type { HistoryPosition } from '../types'

export class HistoryModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Performs undo through the public historyManager API */
  async undo(): Promise<void> {
    await this.page.evaluate(async() => {
      const { editor } = window as any
      await editor.historyManager.undo()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Performs redo through the public historyManager API */
  async redo(): Promise<void> {
    await this.page.evaluate(async() => {
      const { editor } = window as any
      await editor.historyManager.redo()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Explicitly saves the current canvas state to history */
  async saveState(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any
      editor.historyManager.saveState()
    })

    await waitForCanvasRender({ page: this.page })
  }

  /** Forces the deferred save after text editing to commit */
  async flushPendingSave(): Promise<boolean> {
    return this.page.evaluate(() => {
      const { editor } = window as any
      return editor.historyManager.flushPendingSave()
    })
  }

  /** Returns the current history position without the serialized canvas payload. */
  async getPosition(): Promise<HistoryPosition> {
    return this.page.evaluate(() => {
      const { editor } = window as any
      const { historyManager } = editor

      return {
        currentIndex: historyManager.currentIndex,
        patchCount: historyManager.patches.length
      }
    })
  }

  /** Returns serialized history state for persistence-payload checks. */
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

  /** Returns serialized history as a string for payload checks. */
  async getSerializedStateText(): Promise<string> {
    return JSON.stringify(await this.getSerializedState())
  }
}
