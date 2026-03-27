/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page } from '@playwright/test'
import type { BackgroundObjectInfo } from '../types'

export class BackgroundModel {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Устанавливает цветовой фон через публичный API BackgroundManager. */
  async setColor(params: { color: string }): Promise<void> {
    await this.page.evaluate(({ color }) => {
      const { editor } = window as any
      editor.backgroundManager.setColorBackground({ color })
    }, params)
  }

  /** Устанавливает линейный градиентный фон через публичный API BackgroundManager. */
  async setLinearGradient(params: { angle: number, startColor: string, endColor: string }): Promise<void> {
    await this.page.evaluate(({ angle, startColor, endColor }) => {
      const { editor } = window as any
      editor.backgroundManager.setLinearGradientBackground({
        angle,
        startColor,
        endColor
      })
    }, params)
  }

  /** Устанавливает фоновое изображение через публичный API BackgroundManager. */
  async setImage(params: { imageSource: string }): Promise<void> {
    await this.page.evaluate(async({ imageSource }) => {
      const { editor } = window as any
      await editor.backgroundManager.setImageBackground({ imageSource })
    }, params)
  }

  /** Возвращает сериализованное состояние текущего фонового объекта. */
  async getObject(): Promise<BackgroundObjectInfo | null> {
    return this.page.evaluate(() => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const { backgroundObject } = editor.backgroundManager
      if (!backgroundObject) return null

      return helpers.serializeBackgroundObject(backgroundObject)
    })
  }
}
