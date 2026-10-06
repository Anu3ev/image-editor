import type { JSHandle, Page } from '@playwright/test'
import type { ImageEditor } from '../../../src/editor'

/** Public crop-event subscriptions that live only inside the test page. */
interface CropEventRecording {
  events: string[]
  unsubscribe: VoidFunction[]
}

/** Records public crop events independently of the internal Fabric event order. */
export class CropEventRecorder {
  /** Page on which events are published. */
  private readonly page: Page

  /** Temporary subscriptions excluded from the global browser context. */
  private recording: JSHandle<CropEventRecording> | null = null

  /** Binds the recording to the editor page. */
  constructor(page: Page) {
    this.page = page
  }

  /** Starts an isolated recording of user-facing crop events. */
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

  /** Removes subscriptions and returns events from the completed scenario. */
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
