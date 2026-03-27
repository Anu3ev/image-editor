/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page } from '@playwright/test'
import type { InteractionBlockerStateInfo } from '../types'

export class InteractionBlockerModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Блокирует редактор через публичный API InteractionBlocker. */
  async block(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any
      editor.interactionBlocker.block()
    })
  }

  /** Разблокирует редактор через публичный API InteractionBlocker. */
  async unblock(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any
      editor.interactionBlocker.unblock()
    })
  }

  /** Возвращает сериализованное состояние interaction blocker и маски блокировки. */
  async getState(): Promise<InteractionBlockerStateInfo> {
    return this.page.evaluate(() => {
      const { __editorHelpers: helpers } = window as any

      return helpers.getInteractionBlockerState()
    })
  }
}
