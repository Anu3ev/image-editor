/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type { ViewportBoundsInfo } from '../types'
import { waitForCanvasRender } from '../helpers/canvas-render.helper'

export class ToolbarModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Возвращает true, если тулбар редактора видим сейчас. */
  async isVisible(): Promise<boolean> {
    return this.page.evaluate(() => {
      const copyPasteIcon = document.querySelector('img[title="Создать копию"]')
      if (!(copyPasteIcon instanceof HTMLImageElement)) return false

      const toolbar = copyPasteIcon.closest('div')
      if (!(toolbar instanceof HTMLDivElement)) return false

      const toolbarStyle = window.getComputedStyle(toolbar)
      const bounds = toolbar.getBoundingClientRect()

      return toolbarStyle.display !== 'none'
        && toolbarStyle.visibility !== 'hidden'
        && bounds.width > 0
        && bounds.height > 0
    })
  }

  /** Ожидает пока тулбар редактора станет видимым. */
  async waitUntilVisible(): Promise<void> {
    await this.page.waitForFunction(() => {
      const copyPasteIcon = document.querySelector('img[title="Создать копию"]')
      if (!(copyPasteIcon instanceof HTMLImageElement)) return false

      const toolbar = copyPasteIcon.closest('div')
      if (!(toolbar instanceof HTMLDivElement)) return false

      const toolbarStyle = window.getComputedStyle(toolbar)
      const bounds = toolbar.getBoundingClientRect()

      return toolbarStyle.display !== 'none'
        && toolbarStyle.visibility !== 'hidden'
        && bounds.width > 0
        && bounds.height > 0
    })
  }

  /** Возвращает границы тулбара в viewport-координатах canvas. */
  async getBounds(): Promise<ViewportBoundsInfo> {
    await this.waitUntilVisible()

    const bounds = await this.page.evaluate(() => {
      const { editor } = window as any
      const copyPasteIcon = document.querySelector('img[title="Создать копию"]')
      if (!(copyPasteIcon instanceof HTMLImageElement)) return null

      const toolbar = copyPasteIcon.closest('div')
      if (!(toolbar instanceof HTMLDivElement)) return null

      const toolbarRect = toolbar.getBoundingClientRect()
      const canvasRect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const {
        width,
        height
      } = toolbarRect
      const left = toolbarRect.left - canvasRect.left
      const top = toolbarRect.top - canvasRect.top

      return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        centerX: left + (width / 2),
        centerY: top + (height / 2)
      }
    })

    expect(bounds, 'для видимого тулбара должны существовать viewport-границы').not.toBeNull()

    return bounds as ViewportBoundsInfo
  }

  /** Нажимает кнопку тулбара по пользовательскому названию действия. */
  async clickAction(params: { name: string }): Promise<void> {
    const { name } = params
    const actionIcon = this.page.getByTitle(name)

    await expect(actionIcon, `кнопка "${name}" должна существовать в тулбаре`).toBeVisible()

    await actionIcon.click()
    await waitForCanvasRender({ page: this.page })
  }
}
