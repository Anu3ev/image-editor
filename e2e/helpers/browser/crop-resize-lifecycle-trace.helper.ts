/* eslint-disable @typescript-eslint/no-explicit-any -- Fabric API внутри страницы не имеет полных типов в тестовом процессе. */
import { expect, type JSHandle, type Page } from '@playwright/test'

import type {
  CropRectInfo,
  ObjectSizeIndicatorInfo,
  SnappingGuideState
} from '../../types'

/** Событие Fabric, которое проверяет сценарий изменения размера crop frame. */
export type CropResizeLifecycleTraceStage =
  | 'canvas:object:scaling'
  | 'canvas:mouse:move'
  | 'canvas:object:modified'
  | 'canvas:mouse:up'
  | 'canvas:editor:crop:changed'
  | 'canvas:editor:crop:applied'
  | 'target:scaling'
  | 'target:mousemove'
  | 'target:modified'
  | 'target:mouseup'

/** Текущая геометрия crop frame в координатах canvas-сцены. */
export type CropResizeLifecycleFrameGeometry = {
  left: number
  top: number
  width: number
  height: number
  scaleX: number
  scaleY: number
}

/** Состояние crop, снятое синхронно внутри одного обработчика Fabric. */
export type CropResizeLifecycleTraceSnapshot = {
  cropRect: CropRectInfo | null
  frame: CropResizeLifecycleFrameGeometry
  guides: SnappingGuideState
  indicator: ObjectSizeIndicatorInfo
  historyPatchCount: number
}

/** Одна упорядоченная запись изменения размера crop frame. */
export type CropResizeLifecycleTraceEntry = CropResizeLifecycleTraceSnapshot & {
  order: number
  stage: CropResizeLifecycleTraceStage
  sourceEventId: number | null
}

/** Начальное, промежуточные и итоговое состояния одного изменения размера crop frame. */
export type CropResizeLifecycleTraceResult = {
  baseline: CropResizeLifecycleTraceSnapshot
  entries: CropResizeLifecycleTraceEntry[]
  final: CropResizeLifecycleTraceSnapshot
}

/** Правило сопоставления записи с исходным DOM-событием. */
type CropResizeSourceEventMode = 'event' | 'current' | 'none'

/** Методы Fabric-объекта, необходимые для временной подписки. */
type TraceEventOwner = {
  on: (eventName: string, handler: (event: unknown) => void) => void
  off: (eventName: string, handler: (event: unknown) => void) => void
}

/** Одна временная подписка внутри страницы. */
type TraceSubscription = {
  owner: TraceEventOwner
  eventName: string
  handler: (event: unknown) => void
}

/** Сборщик событий и сохранённая ссылка на активный crop frame внутри страницы. */
type CropResizeTraceSession = {
  frame: TraceEventOwner
  entries: CropResizeLifecycleTraceEntry[]
  subscriptions: TraceSubscription[]
  sourceEventIds: WeakMap<object, number>
  currentSourceEventId: number | null
  nextSourceEventId: number
  readSnapshot?: () => CropResizeLifecycleTraceSnapshot
  record?: (params: {
    stage: CropResizeLifecycleTraceStage
    event: unknown
    eventMode: CropResizeSourceEventMode
  }) => void
}

/** Активная запись изменения размера crop frame в тестовом процессе. */
type ActiveCropResizeTrace = {
  baseline: CropResizeLifecycleTraceSnapshot
  session: JSHandle<CropResizeTraceSession>
}

/** Количество событий, на которые подписывается временная запись. */
const CROP_RESIZE_EXPECTED_SUBSCRIPTION_COUNT = 10

/**
 * Записывает события реального изменения crop frame, не подменяя обработчики редактора.
 */
export class CropResizeLifecycleTrace {
  private readonly page: Page

  private activeTrace: ActiveCropResizeTrace | null

  /** Создаёт запись изменения crop frame на указанной странице редактора. */
  constructor(page: Page) {
    this.page = page
    this.activeTrace = null
  }

  /** Начинает запись событий активного crop frame. */
  async start(): Promise<CropResizeLifecycleTraceSnapshot> {
    expect(this.activeTrace, 'перед началом трассировки не должно быть другого изменения crop frame').toBeNull()
    expect(this.page, 'для трассировки изменения crop frame должна существовать страница').toBeDefined()

    const session = await this._createTraceSession()
    await this._installSnapshotReader({ session })
    await this._installRecorder({ session })
    await this._attachListeners({ session })

    const baseline = await session.evaluate((traceSession) => traceSession.readSnapshot?.())
    expect(baseline, 'начальное состояние изменения crop frame должно существовать').toBeDefined()
    expect(baseline?.cropRect, 'crop должен быть активен в начале трассировки').not.toBeNull()
    if (!baseline) throw new Error('Не удалось получить начальное состояние изменения crop frame')

    this.activeTrace = { baseline, session }

    return baseline
  }

  /** Снимает временные обработчики и возвращает записанные состояния. */
  async finish(): Promise<CropResizeLifecycleTraceResult> {
    expect(this.activeTrace, 'нельзя завершить трассировку изменения размера до начала записи').not.toBeNull()
    expect(this.page, 'страница должна существовать до завершения трассировки изменения размера').toBeDefined()
    if (!this.activeTrace) throw new Error('Активная трассировка изменения crop frame должна существовать')

    const { baseline, session } = this.activeTrace
    const result = await session.evaluate((traceSession) => {
      for (let index = 0; index < traceSession.subscriptions.length; index += 1) {
        const subscription = traceSession.subscriptions[index]
        subscription.owner.off(subscription.eventName, subscription.handler)
      }

      return {
        entries: traceSession.entries,
        final: traceSession.readSnapshot?.()
      }
    })

    await session.dispose()
    this.activeTrace = null

    expect(result.final, 'итоговое состояние изменения crop frame должно существовать').toBeDefined()
    expect(Array.isArray(result.entries), 'трассировка изменения размера должна вернуть массив событий').toBe(true)
    if (!result.final) throw new Error('Не удалось получить итоговое состояние изменения crop frame')

    return {
      baseline,
      entries: result.entries,
      final: result.final
    }
  }

  /** Создаёт сборщик событий внутри страницы и сохраняет активный crop frame. */
  private async _createTraceSession(): Promise<JSHandle<CropResizeTraceSession>> {
    const session = await this.page.evaluateHandle(() => {
      const { editor } = window as any
      const cropState = editor.cropManager.getState()
      const frame = cropState?.frame

      if (!frame?.on || !frame?.off) {
        throw new Error('Активный crop frame должен поддерживать Fabric on/off')
      }

      return {
        frame,
        entries: [],
        subscriptions: [],
        sourceEventIds: new WeakMap<object, number>(),
        currentSourceEventId: null,
        nextSourceEventId: 1
      }
    })

    expect(session, 'сборщик событий изменения crop frame должен существовать').toBeDefined()
    expect(await session.evaluate((value) => value.entries.length)).toBe(0)

    return session
  }

  /** Настраивает единое чтение геометрии, направляющих, индикатора и history. */
  private async _installSnapshotReader(params: {
    session: JSHandle<CropResizeTraceSession>
  }): Promise<void> {
    const { session } = params
    await this.page.evaluate((traceSession) => {
      traceSession.readSnapshot = () => {
        const { editor, __editorHelpers: helpers } = window as any
        const cropState = editor.cropManager.getState()
        const frame = traceSession.frame as any
        const element = document.querySelector('.fabric-editor-object-size-indicator')
        const text = element?.textContent ?? ''
        const match = text.match(/ширина:\s*([\d\s]+)\s+высота:\s*([\d\s]+)/)
        const rect = element instanceof HTMLElement ? element.getBoundingClientRect() : null
        const style = element instanceof HTMLElement ? window.getComputedStyle(element) : null

        return {
          cropRect: cropState ? {
            left: cropState.rect.left,
            top: cropState.rect.top,
            width: cropState.rect.width,
            height: cropState.rect.height
          } : null,
          frame: {
            left: frame.left,
            top: frame.top,
            width: frame.width,
            height: frame.height,
            scaleX: frame.scaleX,
            scaleY: frame.scaleY
          },
          guides: helpers.getSnappingGuideState(),
          indicator: {
            visible: Boolean(rect && style && style.display !== 'none'
              && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0),
            text,
            width: match ? Number(match[1].replace(/\s/g, '')) : null,
            height: match ? Number(match[2].replace(/\s/g, '')) : null
          },
          historyPatchCount: editor.historyManager.patches.length
        }
      }
    }, session)

    const stateReaderInstalled = await session.evaluate((value) => typeof value.readSnapshot === 'function')
    expect(stateReaderInstalled, 'чтение состояния изменения crop frame должно быть настроено').toBe(true)
    expect(session, 'сборщик событий должен сохраниться после настройки чтения состояния').toBeDefined()
  }

  /** Нумерует исходные DOM-события и записывает порядок вызовов. */
  private async _installRecorder(params: {
    session: JSHandle<CropResizeTraceSession>
  }): Promise<void> {
    const { session } = params
    await this.page.evaluate((traceSession) => {
      traceSession.record = ({ stage, event, eventMode }) => {
        const sourceEvent = (event as any)?.e
        let sourceEventId = eventMode === 'current' ? traceSession.currentSourceEventId : null

        if (eventMode === 'event' && sourceEvent && typeof sourceEvent === 'object') {
          sourceEventId = traceSession.sourceEventIds.get(sourceEvent) ?? traceSession.nextSourceEventId
          traceSession.sourceEventIds.set(sourceEvent, sourceEventId)
          traceSession.nextSourceEventId = Math.max(traceSession.nextSourceEventId, sourceEventId + 1)
          traceSession.currentSourceEventId = sourceEventId
        }

        const snapshot = traceSession.readSnapshot?.()
        if (!snapshot) throw new Error('Чтение состояния изменения crop frame должно быть настроено')

        traceSession.entries.push({
          ...snapshot,
          order: traceSession.entries.length + 1,
          stage,
          sourceEventId: eventMode === 'none' ? null : sourceEventId
        })
      }
    }, session)

    const eventRecordingInstalled = await session.evaluate((value) => typeof value.record === 'function')
    expect(eventRecordingInstalled, 'запись событий изменения crop frame должна быть настроена').toBe(true)
    expect(session, 'сборщик событий должен сохраниться после настройки записи').toBeDefined()
  }

  /** Подписывает запись на необходимый набор событий canvas и crop frame. */
  private async _attachListeners(params: {
    session: JSHandle<CropResizeTraceSession>
  }): Promise<void> {
    const { session } = params
    const subscriptionCount = await this.page.evaluate((traceSession) => {
      const { editor } = window as any
      const canvas = editor.canvas as TraceEventOwner
      const { frame } = traceSession
      const descriptors = [
        [canvas, 'object:scaling', 'canvas:object:scaling', 'event', true],
        [canvas, 'mouse:move', 'canvas:mouse:move', 'event', true],
        [canvas, 'object:modified', 'canvas:object:modified', 'event', true],
        [canvas, 'mouse:up', 'canvas:mouse:up', 'event', true],
        [canvas, 'editor:crop:changed', 'canvas:editor:crop:changed', 'current', false],
        [canvas, 'editor:crop:applied', 'canvas:editor:crop:applied', 'none', false],
        [frame, 'scaling', 'target:scaling', 'event', false],
        [frame, 'mousemove', 'target:mousemove', 'event', false],
        [frame, 'modified', 'target:modified', 'event', false],
        [frame, 'mouseup', 'target:mouseup', 'event', false]
      ] as const

      for (let index = 0; index < descriptors.length; index += 1) {
        const [owner, eventName, stage, eventMode, filterFrame] = descriptors[index]
        const handler = (rawEvent: unknown): void => {
          const event = rawEvent as any
          const eventTarget = event?.target ?? event?.transform?.target
          if (filterFrame && eventTarget !== frame) return

          traceSession.record?.({ stage, event, eventMode })
        }

        owner.on(eventName, handler)
        traceSession.subscriptions.push({ owner, eventName, handler })
      }

      return traceSession.subscriptions.length
    }, session)

    expect(subscriptionCount, 'трассировка изменения crop frame должна подписаться на все события')
      .toBe(CROP_RESIZE_EXPECTED_SUBSCRIPTION_COUNT)
    expect(session, 'сборщик событий должен существовать после подписки').toBeDefined()
  }
}
