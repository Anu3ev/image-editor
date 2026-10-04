import type { JSHandle, Page } from '@playwright/test'
import type { ImageEditor } from '../../../src/editor'

/** Подписки на публичные события crop, живущие только внутри страницы теста. */
interface CropEventRecording {
  events: string[]
  unsubscribe: VoidFunction[]
}

/** Записывает публичные события crop без привязки к порядку внутренних событий Fabric. */
export class CropEventRecorder {
  /** Страница, на которой публикуются события. */
  private readonly page: Page

  /** Временные подписки, не попадающие в глобальный browser context. */
  private recording: JSHandle<CropEventRecording> | null = null

  /** Привязывает запись к странице редактора. */
  constructor(page: Page) {
    this.page = page
  }

  /** Начинает изолированную запись пользовательских событий crop. */
  async start(): Promise<void> {
    if (this.recording) throw new Error('Запись событий crop уже начата')
    this.recording = await this.page.evaluateHandle(() => {
      const { editor } = window as Window & { editor?: ImageEditor }
      if (!editor) throw new Error('Редактор не инициализирован')
      const events: string[] = []
      const unsubscribe = [
        editor.canvas.on('editor:crop:changed', () => { events.push('changed') }),
        editor.canvas.on('editor:crop:applied', () => { events.push('applied') }),
        editor.canvas.on('editor:crop:cancelled', () => { events.push('cancelled') })
      ]

      return { events, unsubscribe }
    })
  }

  /** Снимает подписки и возвращает события завершённого сценария. */
  async finish(): Promise<string[]> {
    const { recording } = this
    if (!recording) throw new Error('Запись событий crop не начата')
    const events = await recording.evaluate((state) => {
      for (const unsubscribe of state.unsubscribe) unsubscribe()

      return state.events
    })
    await recording.dispose()
    this.recording = null

    return events
  }
}
