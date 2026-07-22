/* eslint-disable @typescript-eslint/no-explicit-any -- Fabric API внутри страницы не имеет полных типов в тестовом процессе. */
/* eslint-disable no-use-before-define -- Сценарные действия расположены перед преобразованием данных страницы. */
import { expect, type JSHandle, type Page } from '@playwright/test'

import type {
  CropRectInfo,
  SnappingGuideState
} from '../../types'
import { waitForCanvasRender } from '../canvas-render.helper'

/** Событие Fabric, которое проверяет сценарий переноса crop frame. */
export type CropMoveLifecycleTraceStage =
  | 'canvas:object:moving'
  | 'canvas:mouse:move'
  | 'canvas:object:modified'
  | 'canvas:mouse:up'
  | 'canvas:editor:crop:changed'
  | 'canvas:editor:crop:cancelled'
  | 'canvas:editor:crop:applied'
  | 'target:moving'
  | 'target:mousemove'
  | 'target:modified'
  | 'target:mouseup'

/** Текущая геометрия crop frame в координатах canvas-сцены. */
export type CropMoveLifecycleFrameGeometry = {
  left: number
  top: number
  width: number
  height: number
  scaleX: number
  scaleY: number
}

/** Состояние crop, снятое синхронно внутри одного обработчика Fabric. */
export type CropMoveLifecycleTraceSnapshot = {
  cropRect: CropRectInfo | null
  frame: CropMoveLifecycleFrameGeometry
  guides: SnappingGuideState
  historyPatchCount: number
}

/** Одна упорядоченная запись переноса crop frame. */
export type CropMoveLifecycleTraceEntry = CropMoveLifecycleTraceSnapshot & {
  order: number
  stage: CropMoveLifecycleTraceStage
  sourceEventId: number | null
}

/** Начальное, промежуточные и итоговое состояния одного переноса crop frame. */
export type CropMoveLifecycleTraceResult = {
  baseline: CropMoveLifecycleTraceSnapshot
  entries: CropMoveLifecycleTraceEntry[]
  final: CropMoveLifecycleTraceSnapshot
}

/** Правило сопоставления записи с исходным DOM-событием. */
type CropMoveSourceEventMode = 'event' | 'current' | 'none'

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
type CropMoveTraceSession = {
  frame: TraceEventOwner
  entries: CropMoveLifecycleTraceEntry[]
  subscriptions: TraceSubscription[]
  sourceEventIds: WeakMap<object, number>
  currentSourceEventId: number | null
  nextSourceEventId: number
  readSnapshot?: () => CropMoveLifecycleTraceSnapshot
  record?: (params: {
    stage: CropMoveLifecycleTraceStage
    event: unknown
    eventMode: CropMoveSourceEventMode
  }) => void
}

/** Активная запись переноса crop frame в тестовом процессе. */
type ActiveCropMoveTrace = {
  baseline: CropMoveLifecycleTraceSnapshot
  session: JSHandle<CropMoveTraceSession>
}

/** Точки начала и конца drag в client-координатах. */
type CropMoveClientPoints = {
  start: {
    x: number
    y: number
  }
  end: {
    x: number
    y: number
  }
  isFrameActive: boolean
}

/** Количество событий, на которые подписывается трассировка переноса crop frame. */
const CROP_MOVE_EXPECTED_SUBSCRIPTION_COUNT = 11

/**
 * Записывает события реального переноса crop frame, не подменяя обработчики редактора.
 */
export class CropMoveLifecycleTrace {
  private readonly page: Page

  private activeTrace: ActiveCropMoveTrace | null

  /** Создаёт запись переноса crop frame на указанной странице редактора. */
  constructor(page: Page) {
    this.page = page
    this.activeTrace = null
  }

  /** Начинает запись событий активного crop frame. */
  async start(): Promise<CropMoveLifecycleTraceSnapshot> {
    expect(this.activeTrace, 'перед началом трассировки не должно быть другого переноса crop frame').toBeNull()
    expect(this.page, 'для трассировки переноса crop frame должна существовать страница').toBeDefined()

    const session = await this._createTraceSession()
    await this._installSnapshotReader({ session })
    await this._installRecorder({ session })
    await this._attachListeners({ session })

    const baseline = await session.evaluate((traceSession) => traceSession.readSnapshot?.())
    expect(baseline, 'начальное состояние переноса crop frame должно существовать').toBeDefined()
    expect(baseline?.cropRect, 'crop должен быть активен в начале трассировки').not.toBeNull()
    if (!baseline) throw new Error('Не удалось получить начальное состояние переноса crop frame')

    this.activeTrace = { baseline, session }

    return baseline
  }

  /** Снимает временные обработчики и возвращает записанные состояния. */
  async finish(): Promise<CropMoveLifecycleTraceResult> {
    expect(this.activeTrace, 'нельзя завершить трассировку переноса до начала записи').not.toBeNull()
    expect(this.page, 'страница должна существовать до завершения трассировки переноса').toBeDefined()
    if (!this.activeTrace) throw new Error('Активная трассировка переноса crop frame должна существовать')

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

    expect(result.final, 'итоговое состояние переноса crop frame должно существовать').toBeDefined()
    expect(Array.isArray(result.entries), 'трассировка переноса должна вернуть массив событий').toBe(true)
    if (!result.final) throw new Error('Не удалось получить итоговое состояние переноса crop frame')

    return {
      baseline,
      entries: result.entries,
      final: result.final
    }
  }

  /** Создаёт сборщик событий внутри страницы и сохраняет активный crop frame. */
  private async _createTraceSession(): Promise<JSHandle<CropMoveTraceSession>> {
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

    expect(session, 'сборщик событий переноса crop frame должен существовать').toBeDefined()
    expect(await session.evaluate((value) => value.entries.length)).toBe(0)

    return session
  }

  /** Настраивает единое чтение геометрии, направляющих и history. */
  private async _installSnapshotReader(params: {
    session: JSHandle<CropMoveTraceSession>
  }): Promise<void> {
    const { session } = params
    await this.page.evaluate((traceSession) => {
      traceSession.readSnapshot = () => {
        const { editor, __editorHelpers: helpers } = window as any
        const cropState = editor.cropManager.getState()
        const frame = traceSession.frame as any

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
          historyPatchCount: editor.historyManager.patches.length
        }
      }
    }, session)

    const stateReaderInstalled = await session.evaluate((value) => typeof value.readSnapshot === 'function')
    expect(stateReaderInstalled, 'чтение состояния переноса crop frame должно быть настроено').toBe(true)
    expect(session, 'сборщик событий должен сохраниться после настройки чтения состояния').toBeDefined()
  }

  /** Нумерует исходные DOM-события и записывает порядок вызовов. */
  private async _installRecorder(params: {
    session: JSHandle<CropMoveTraceSession>
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
        if (!snapshot) throw new Error('Чтение состояния переноса crop frame должно быть настроено')

        traceSession.entries.push({
          ...snapshot,
          order: traceSession.entries.length + 1,
          stage,
          sourceEventId: eventMode === 'none' ? null : sourceEventId
        })
      }
    }, session)

    const eventRecordingInstalled = await session.evaluate((value) => typeof value.record === 'function')
    expect(eventRecordingInstalled, 'запись событий переноса crop frame должна быть настроена').toBe(true)
    expect(session, 'сборщик событий должен сохраниться после настройки записи').toBeDefined()
  }

  /** Подписывает запись на необходимый набор событий canvas и crop frame. */
  private async _attachListeners(params: {
    session: JSHandle<CropMoveTraceSession>
  }): Promise<void> {
    const { session } = params
    const subscriptionCount = await this.page.evaluate((traceSession) => {
      const { editor } = window as any
      const canvas = editor.canvas as TraceEventOwner
      const { frame } = traceSession
      const descriptors = [
        [canvas, 'object:moving', 'canvas:object:moving', 'event', true],
        [canvas, 'mouse:move', 'canvas:mouse:move', 'event', true],
        [canvas, 'object:modified', 'canvas:object:modified', 'event', true],
        [canvas, 'mouse:up', 'canvas:mouse:up', 'event', true],
        [canvas, 'editor:crop:changed', 'canvas:editor:crop:changed', 'current', false],
        [canvas, 'editor:crop:cancelled', 'canvas:editor:crop:cancelled', 'none', false],
        [canvas, 'editor:crop:applied', 'canvas:editor:crop:applied', 'none', false],
        [frame, 'moving', 'target:moving', 'event', false],
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

    expect(subscriptionCount, 'трассировка переноса crop frame должна подписаться на все события')
      .toBe(CROP_MOVE_EXPECTED_SUBSCRIPTION_COUNT)
    expect(session, 'сборщик событий должен существовать после подписки').toBeDefined()
  }
}

/** Начинает перенос crop frame мышью и оставляет кнопку нажатой. */
export async function beginCropFrameMoveWithMouse(params: {
  page: Page
  deltaX: number
  deltaY: number
  pointerSteps?: number
}): Promise<void> {
  const {
    page,
    deltaX,
    deltaY,
    pointerSteps = 1
  } = params

  expect(Number.isFinite(deltaX), 'смещение crop frame по X должно быть конечным').toBe(true)
  expect(Number.isFinite(deltaY), 'смещение crop frame по Y должно быть конечным').toBe(true)
  expect(pointerSteps, 'число шагов движения мыши должно быть положительным').toBeGreaterThan(0)

  const points = await resolveCropMoveClientPoints({ page, deltaX, deltaY })

  await page.mouse.move(points.start.x, points.start.y)
  await page.mouse.down()
  await page.mouse.move(points.end.x, points.end.y, { steps: pointerSteps })
  await waitForCanvasRender({ page })
}

/** Завершает перенос crop frame настоящим mouseup. */
export async function finishCropFrameMoveWithMouse(params: { page: Page }): Promise<void> {
  const { page } = params

  await page.mouse.up()
  await waitForCanvasRender({ page })

  const cropIsActive = await page.evaluate(() => {
    const { editor } = window as any
    return Boolean(editor.cropManager.getState())
  })

  expect(cropIsActive, 'crop должен остаться активным после mouseup').toBe(true)
  expect(page, 'страница должна существовать после mouseup').toBeDefined()
}

/** Преобразует смещение crop frame на canvas в client-координаты drag. */
async function resolveCropMoveClientPoints(params: {
  page: Page
  deltaX: number
  deltaY: number
}): Promise<CropMoveClientPoints> {
  const { page, deltaX, deltaY } = params
  const points = await page.evaluate(({ sceneDeltaX, sceneDeltaY }) => {
    const { editor } = window as any
    const cropState = editor.cropManager.getState()
    if (!cropState) throw new Error('Для переноса crop frame нужен активный crop')

    const { canvas } = editor
    const { frame } = cropState
    const center = frame.getCenterPoint()
    const [a, b, c, d, tx, ty] = canvas.viewportTransform
    const canvasRect = canvas.upperCanvasEl.getBoundingClientRect()
    const retinaScale = canvas.getRetinaScaling()
    const clientScaleX = (canvasRect.width * retinaScale) / canvas.upperCanvasEl.width
    const clientScaleY = (canvasRect.height * retinaScale) / canvas.upperCanvasEl.height
    const toClient = (point: { x: number, y: number }) => ({
      x: canvasRect.left + (((point.x * a) + (point.y * c) + tx) * clientScaleX),
      y: canvasRect.top + (((point.x * b) + (point.y * d) + ty) * clientScaleY)
    })

    return {
      start: toClient(center),
      end: toClient({
        x: center.x + sceneDeltaX,
        y: center.y + sceneDeltaY
      }),
      isFrameActive: canvas.getActiveObject() === frame
    }
  }, {
    sceneDeltaX: deltaX,
    sceneDeltaY: deltaY
  })

  expect(points.isFrameActive, 'crop frame должен быть активным объектом перед drag').toBe(true)
  expect(Number.isFinite(points.start.x) && Number.isFinite(points.start.y)).toBe(true)
  expect(Number.isFinite(points.end.x) && Number.isFinite(points.end.y)).toBe(true)

  return points
}
