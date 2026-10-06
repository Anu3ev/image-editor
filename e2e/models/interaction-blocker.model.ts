/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page } from '@playwright/test'
import type { InteractionBlockerStateInfo } from '../types'

export class InteractionBlockerModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Locks the editor through the public InteractionBlocker API. */
  async block(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any
      editor.interactionBlocker.block()
    })
  }

  /** Locks the editor with an AI overlay through the public InteractionBlocker API. */
  async blockWithAiOverlay(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any
      editor.interactionBlocker.block({ overlay: 'ai-generation' })
    })
  }

  /** Unlocks the editor through the public InteractionBlocker API. */
  async unblock(): Promise<void> {
    await this.page.evaluate(() => {
      const { editor } = window as any
      editor.interactionBlocker.unblock()
    })
  }

  /** Returns the serialized state of the interaction blocker and lock mask. */
  async getState(): Promise<InteractionBlockerStateInfo> {
    return this.page.evaluate(() => {
      const { __editorHelpers: helpers } = window as any

      return helpers.getInteractionBlockerState()
    })
  }
}
