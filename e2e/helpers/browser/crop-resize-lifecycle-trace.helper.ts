/* eslint-disable @typescript-eslint/no-explicit-any -- The in-page Fabric API lacks complete types in the test process. */
import { expect, type JSHandle, type Page } from '@playwright/test'

import type {
  CropRectInfo,
  ObjectSizeIndicatorInfo,
  SnappingGuideState
} from '../../types'

/** Fabric event checked by the crop-frame resize scenario. */
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

/** Current crop-frame geometry in canvas-scene coordinates. */
export type CropResizeLifecycleFrameGeometry = {
  left: number
  top: number
  width: number
  height: number
  scaleX: number
  scaleY: number
}

/** Crop state captured synchronously inside a single Fabric handler. */
export type CropResizeLifecycleTraceSnapshot = {
  cropRect: CropRectInfo | null
  frame: CropResizeLifecycleFrameGeometry
  guides: SnappingGuideState
  indicator: ObjectSizeIndicatorInfo
  historyPatchCount: number
}

/** One ordered crop-frame resize record. */
export type CropResizeLifecycleTraceEntry = CropResizeLifecycleTraceSnapshot & {
  order: number
  stage: CropResizeLifecycleTraceStage
  sourceEventId: number | null
}

/** Initial, intermediate, and final states of one crop-frame resize. */
export type CropResizeLifecycleTraceResult = {
  baseline: CropResizeLifecycleTraceSnapshot
  entries: CropResizeLifecycleTraceEntry[]
  final: CropResizeLifecycleTraceSnapshot
}

/** Rule for matching a record to the original DOM event. */
type CropResizeSourceEventMode = 'event' | 'current' | 'none'

/** Fabric-object methods required for a temporary subscription. */
type TraceEventOwner = {
  on: (eventName: string, handler: (event: unknown) => void) => void
  off: (eventName: string, handler: (event: unknown) => void) => void
}

/** One temporary in-page subscription. */
type TraceSubscription = {
  owner: TraceEventOwner
  eventName: string
  handler: (event: unknown) => void
}

/** Event collector and saved reference to the active in-page crop frame. */
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

/** Active crop-frame resize recording in the test process. */
type ActiveCropResizeTrace = {
  baseline: CropResizeLifecycleTraceSnapshot
  session: JSHandle<CropResizeTraceSession>
}

/** Number of events the temporary recording subscribes to. */
const CROP_RESIZE_EXPECTED_SUBSCRIPTION_COUNT = 10

/**
 * Records real crop-frame change events without replacing editor handlers.
 */
export class CropResizeLifecycleTrace {
  private readonly page: Page

  private activeTrace: ActiveCropResizeTrace | null

  /** Creates a crop-frame change recording on the specified editor page. */
  constructor(page: Page) {
    this.page = page
    this.activeTrace = null
  }

  /** Starts recording active crop-frame events. */
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

  /** Removes temporary handlers and returns the recorded states. */
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

  /** Creates an in-page event collector and saves the active crop frame. */
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

  /** Sets up unified reading of geometry, guides, the indicator, and history. */
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

  /** Numbers original DOM events and records the call order. */
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

  /** Subscribes the recording to the required canvas and crop-frame events. */
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
