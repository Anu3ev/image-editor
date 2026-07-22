/* eslint-disable @typescript-eslint/no-explicit-any -- Fabric API внутри страницы не имеет полных типов в тестовом процессе. */
import { type JSHandle, type Page, expect } from '@playwright/test'
import type {
  ObjectSizeIndicatorInfo,
  SnappingGuideState,
  SnappingObjectSnapshot
} from '../types'

/** События Fabric, которые возникают за один scale-жест. */
const SCALE_TRACE_EVENTS = [
  'object:scaling',
  'mouse:move',
  'object:modified',
  'mouse:up'
] as const

/** Имя события Fabric в записи scale-жеста. */
type ScaleTraceEventName = typeof SCALE_TRACE_EVENTS[number]

/** Типы объектов, для которых записывается scale. */
type ScaleTraceTargetKind = 'image' | 'active-selection' | 'group'

/** Состояние history в выбранный момент scale-жеста. */
interface InteractionTraceHistoryState {
  patchCount: number
  currentIndex: number
  serializedSnapshot: string
}

/** Поля события указателя, которые нужны тестам. */
interface InteractionTracePointer {
  type: string | null
  clientX: number | null
  clientY: number | null
  button: number | null
  buttons: number | null
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
}

/** Состояние Fabric transform во время canvas-события. */
interface InteractionTraceTransform {
  action: string | null
  corner: string | null
  originX: string | number | null
  originY: string | number | null
  lastX: number | null
  lastY: number | null
  offsetX: number | null
  offsetY: number | null
}

/** Состояние дочернего объекта с bounds в координатах canvas. */
export interface ScaleTraceChildSnapshot extends SnappingObjectSnapshot {
  id: string
}

/** Геометрия, гайды, индикатор размеров и history в один момент scale-жеста. */
export interface ScaleTraceState {
  snapshot: SnappingObjectSnapshot
  childSnapshots: ScaleTraceChildSnapshot[]
  guideState: SnappingGuideState
  indicator: ObjectSizeIndicatorInfo
  history: InteractionTraceHistoryState
}

/** Одна запись canvas-события реального scale-жеста. */
export interface ScaleTraceEvent extends ScaleTraceState {
  name: ScaleTraceEventName
  pointerEventId: number | null
  pointer: InteractionTracePointer
  transform: InteractionTraceTransform | null
}

/** Исходное, промежуточные и итоговое состояния одного scale-жеста через drag. */
export interface ScaleInteractionTrace {
  baseline: ScaleTraceState
  events: ScaleTraceEvent[]
  final: ScaleTraceState
}

/** Параметры записи scale одного объекта. */
interface ScaleRecordingParams {
  targetKind: ScaleTraceTargetKind
  targetId: string | null
  childIds: string[]
}

/** Сессия scale-жеста до настройки чтения состояния. */
interface PageScaleSession extends ScaleRecordingParams {
  events: ScaleTraceEvent[]
  handlers: Partial<Record<ScaleTraceEventName, (event: unknown) => void>>
  pointerEventIds: WeakMap<object, number>
  nextPointerEventId: number
  /** Исходный объект нужен, потому что ActiveSelection может быть заменён после mouseup. */
  initialTarget: object
}

/** Данные scale-жеста, которые собираются внутри страницы. */
interface PageScaleRecording extends PageScaleSession {
  baseline: ScaleTraceState
  readState: () => ScaleTraceState
  recordEvent?: (params: {
    name: ScaleTraceEventName
    rawEvent: unknown
    rawTransform: unknown
  }) => void
}

/** Ссылка из теста на создаваемую внутри страницы сессию scale-жеста. */
type PageScaleSessionHandle = JSHandle<PageScaleSession>

/** Ссылка из теста на данные scale-жеста внутри страницы. */
type PageScaleRecordingHandle = JSHandle<PageScaleRecording>

/** Текущая запись scale и её исходное состояние. */
interface ActiveScaleRecording {
  targetKind: ScaleTraceTargetKind
  recording: PageScaleRecordingHandle
  baseline: ScaleTraceState
}

/** Записывает события и состояния одного scale-жеста на canvas. */
export class ScaleInteractionTraceModel {
  private readonly page: Page

  private activeRecording: ActiveScaleRecording | null

  /** Создаёт модель записи scale-жестов на указанной странице редактора. */
  constructor(page: Page) {
    this.page = page
    this.activeRecording = null
  }

  /** Начинает запись scale-жеста одного изображения. */
  async startImageScaleTrace(params: { id: string }): Promise<ScaleTraceState> {
    expect(params.id, 'для записи scale нужен id изображения').not.toHaveLength(0)

    const baseline = await this._startScaleTrace({
      targetKind: 'image',
      targetId: params.id,
      childIds: []
    })

    expect(baseline.snapshot.id, 'исходное состояние должно относиться к выбранному изображению').toBe(params.id)
    expect(baseline.childSnapshots, 'запись изображения не должна содержать дочерние объекты').toHaveLength(0)

    return baseline
  }

  /** Начинает запись scale-жеста общего выделения из двух или более объектов. */
  async startActiveSelectionScaleTrace(
    params: { childIds: string[] }
  ): Promise<ScaleTraceState> {
    expect(params.childIds.length, 'для записи общего выделения нужны минимум два id')
      .toBeGreaterThanOrEqual(2)
    expect(new Set(params.childIds).size, 'id объектов общего выделения должны отличаться')
      .toBe(params.childIds.length)

    const baseline = await this._startScaleTrace({
      targetKind: 'active-selection',
      targetId: null,
      childIds: params.childIds
    })

    expect(baseline.snapshot.type, 'target общего выделения должен быть ActiveSelection').toBe('activeselection')
    expect(baseline.childSnapshots, 'запись должна сохранить все выбранные объекты')
      .toHaveLength(params.childIds.length)

    return baseline
  }

  /** Начинает запись scale-жеста Fabric Group, созданной через GroupingManager. */
  async startGroupScaleTrace(params: { childIds: string[] }): Promise<ScaleTraceState> {
    expect(params.childIds.length, 'для записи группы нужны минимум два id').toBeGreaterThanOrEqual(2)
    expect(new Set(params.childIds).size, 'id объектов группы должны отличаться').toBe(params.childIds.length)

    const baseline = await this._startScaleTrace({
      targetKind: 'group',
      targetId: null,
      childIds: params.childIds
    })

    expect(baseline.snapshot.type, 'target сгруппированных объектов должен быть Fabric Group').toBe('group')
    expect(baseline.childSnapshots, 'запись должна сохранить все объекты группы')
      .toHaveLength(params.childIds.length)

    return baseline
  }

  /** Завершает запись изображения и проверяет отсутствие дочерних объектов. */
  async finishImageScaleTrace(): Promise<ScaleInteractionTrace> {
    const trace = await this._finishScaleTrace({ targetKind: 'image' })

    expect(trace.baseline.childSnapshots, 'исходное состояние изображения не должно содержать дочерние объекты')
      .toHaveLength(0)
    expect(trace.final.childSnapshots, 'итоговое состояние изображения не должно содержать дочерние объекты')
      .toHaveLength(0)

    return trace
  }

  /** Завершает запись общего выделения и сохраняет состояния всех его объектов. */
  async finishActiveSelectionScaleTrace(): Promise<ScaleInteractionTrace> {
    const trace = await this._finishScaleTrace({ targetKind: 'active-selection' })

    expect(trace.baseline.childSnapshots.length, 'исходное состояние должно содержать минимум два объекта')
      .toBeGreaterThanOrEqual(2)
    expect(trace.final.childSnapshots, 'итоговое состояние должно сохранить число объектов')
      .toHaveLength(trace.baseline.childSnapshots.length)

    return trace
  }

  /** Завершает запись Fabric Group и сохраняет состояния вложенных объектов. */
  async finishGroupScaleTrace(): Promise<ScaleInteractionTrace> {
    const trace = await this._finishScaleTrace({ targetKind: 'group' })

    expect(trace.baseline.childSnapshots.length, 'исходное состояние Fabric Group должно содержать минимум два объекта')
      .toBeGreaterThanOrEqual(2)
    expect(trace.final.childSnapshots, 'итоговое состояние Fabric Group должно сохранить число объектов')
      .toHaveLength(trace.baseline.childSnapshots.length)

    return trace
  }

  /** Создаёт запись, подписывается на события и сохраняет исходное состояние. */
  private async _startScaleTrace(params: ScaleRecordingParams): Promise<ScaleTraceState> {
    expect(this.activeRecording, 'перед началом scale не должно быть другой записи').toBeNull()
    expect(params.childIds.length === 0, 'только запись изображения не должна иметь id дочерних объектов')
      .toBe(params.targetKind === 'image')

    const session = await this._createPageScaleSession(params)
    const recording = await this._createPageScaleRecording({ session })
    await session.dispose()

    await this._installScaleEventRecorder({ recording })

    for (const eventName of SCALE_TRACE_EVENTS) {
      await this._attachScaleEventListener({ eventName, recording })
    }

    const baseline = await recording.evaluate((pageRecording) => pageRecording.baseline)
    this.activeRecording = { baseline, recording, targetKind: params.targetKind }

    expect(baseline.snapshot.boundsWidth, 'исходное состояние должно иметь положительную ширину').toBeGreaterThan(0)
    expect(baseline.history.serializedSnapshot, 'исходное состояние history не должно быть пустым')
      .not.toHaveLength(0)

    return baseline
  }

  /** Снимает подписки и возвращает запись ожидаемого объекта. */
  private async _finishScaleTrace(
    params: { targetKind: ScaleTraceTargetKind }
  ): Promise<ScaleInteractionTrace> {
    expect(this.activeRecording, 'нельзя завершить scale до начала записи').not.toBeNull()
    expect(this.activeRecording?.targetKind, 'запись должна относиться к ожидаемому объекту')
      .toBe(params.targetKind)

    if (!this.activeRecording || this.activeRecording.targetKind !== params.targetKind) {
      throw new Error('Активная запись ожидаемого объекта должна существовать')
    }

    const { baseline, recording } = this.activeRecording
    const result = await recording.evaluate((pageRecording, eventNames) => {
      const { editor } = window as any

      for (const eventName of eventNames) {
        const handler = pageRecording.handlers[eventName]
        if (handler) editor.canvas.off(eventName, handler)
      }

      return {
        events: pageRecording.events,
        final: pageRecording.readState()
      }
    }, SCALE_TRACE_EVENTS)

    await recording.dispose()
    this.activeRecording = null

    expect(result.events, 'запись должна содержать события scale-жеста').not.toHaveLength(0)
    expect(result.final.snapshot.boundsWidth, 'итоговое состояние должно иметь положительную ширину')
      .toBeGreaterThan(0)

    return { baseline, events: result.events, final: result.final }
  }

  /** Создаёт внутри страницы сессию для записи событий scale-жеста. */
  private async _createPageScaleSession(params: ScaleRecordingParams): Promise<PageScaleSessionHandle> {
    const session = await this.page.evaluateHandle(({ targetKind, targetId, childIds }) => {
      const { editor, __editorHelpers: helpers } = window as any
      const resolveTarget = () => {
        if (targetKind === 'image') return helpers.resolveCanvasObject(undefined, targetId ?? undefined)
        return editor.canvas.getActiveObject()
      }

      const initialTarget = resolveTarget()
      if (!initialTarget) throw new Error('Объект scale должен существовать во время записи')

      return {
        targetKind,
        targetId,
        childIds,
        events: [],
        handlers: {},
        pointerEventIds: new WeakMap<object, number>(),
        nextPointerEventId: 1,
        initialTarget
      }
    }, params)

    expect(session, 'сессия записи scale-жеста должна существовать').toBeDefined()
    expect(await session.evaluate((pageSession) => pageSession.events), 'новая сессия не должна содержать событий')
      .toHaveLength(0)

    return session
  }

  /** Настраивает чтение состояния и сохраняет исходный снимок scale-жеста. */
  private async _createPageScaleRecording(
    params: { session: PageScaleSessionHandle }
  ): Promise<PageScaleRecordingHandle> {
    const recording = await this.page.evaluateHandle((pageSession) => {
      const { editor, __editorHelpers: helpers } = window as any
      const resolveTarget = () => {
        if (pageSession.targetKind === 'image') {
          return helpers.resolveCanvasObject(undefined, pageSession.targetId ?? undefined)
        }
        return editor.canvas.getActiveObject()
      }
      const readIndicator = (): ObjectSizeIndicatorInfo => {
        const element = document.querySelector('.fabric-editor-object-size-indicator')
        const text = element?.textContent ?? ''
        const match = text.match(/ширина:\s*([\d\s]+)\s+высота:\s*([\d\s]+)/)
        const rect = element instanceof HTMLElement ? element.getBoundingClientRect() : null
        const style = element instanceof HTMLElement ? window.getComputedStyle(element) : null
        return {
          visible: Boolean(rect && style && style.display !== 'none' && style.visibility !== 'hidden'
            && rect.width > 0 && rect.height > 0),
          text,
          width: match ? Number(match[1].replace(/\s/g, '')) : null,
          height: match ? Number(match[2].replace(/\s/g, '')) : null
        }
      }
      const readState = (): ScaleTraceState => {
        const target = resolveTarget()
        if (!target) throw new Error('Объект scale должен существовать во время записи')
        const childSnapshots = pageSession.childIds.map((id) => {
          const child = helpers.resolveCanvasObject(undefined, id)
            ?? target.getObjects?.().find((item: { id?: string }) => item.id === id)
          if (!child) throw new Error(`Дочерний объект ${id} должен существовать во время записи`)
          // Group меняет координаты дочерних объектов, а aCoords обновляются только после setCoords.
          child.setCoords?.()
          return { id, ...helpers.serializeSnappingObjectSnapshot(child) }
        })
        const { historyManager } = editor
        return {
          snapshot: helpers.serializeSnappingObjectSnapshot(target),
          childSnapshots,
          guideState: helpers.getSnappingGuideState(),
          indicator: readIndicator(),
          history: {
            patchCount: historyManager.patches.length,
            currentIndex: historyManager.currentIndex,
            serializedSnapshot: JSON.stringify(historyManager.getFullState()) ?? ''
          }
        }
      }

      return { ...pageSession, baseline: readState(), readState }
    }, params.session)

    expect(recording, 'запись scale-жеста должна существовать').toBeDefined()
    expect(await recording.evaluate((value) => value.baseline.snapshot.boundsWidth))
      .toBeGreaterThan(0)

    return recording
  }

  /** Настраивает сохранение указателя и transform для одного события scale-жеста. */
  private async _installScaleEventRecorder(
    params: { recording: PageScaleRecordingHandle }
  ): Promise<void> {
    const { recording } = params
    expect(recording, 'для настройки записи должна существовать сессия scale-жеста').toBeDefined()
    expect(await recording.evaluate((value) => value.events), 'до подписки запись не должна содержать событий')
      .toHaveLength(0)

    await this.page.evaluate((pageRecording) => {
      // Поля DOM-события могут отсутствовать независимо друг от друга; здесь они только копируются в снимок.
      // fallow-ignore-next-line complexity
      pageRecording.recordEvent = ({ name, rawEvent, rawTransform }) => {
        const event = rawEvent as any
        const transform = rawTransform as any
        const pointerEvent = event.e as (Partial<InteractionTracePointer> & object) | undefined
        let pointerEventId: number | null = null

        if (pointerEvent) {
          pointerEventId = pageRecording.pointerEventIds.get(pointerEvent) ?? null
          if (pointerEventId === null) {
            pointerEventId = pageRecording.nextPointerEventId
            pageRecording.nextPointerEventId += 1
            pageRecording.pointerEventIds.set(pointerEvent, pointerEventId)
          }
        }
        pageRecording.events.push({
          ...pageRecording.readState(),
          name,
          pointerEventId,
          pointer: {
            type: pointerEvent?.type ?? null,
            clientX: pointerEvent?.clientX ?? null,
            clientY: pointerEvent?.clientY ?? null,
            button: pointerEvent?.button ?? null,
            buttons: pointerEvent?.buttons ?? null,
            ctrlKey: Boolean(pointerEvent?.ctrlKey),
            shiftKey: Boolean(pointerEvent?.shiftKey),
            altKey: Boolean(pointerEvent?.altKey),
            metaKey: Boolean(pointerEvent?.metaKey)
          },
          transform: transform ? {
            action: transform.action ?? null,
            corner: transform.corner ?? null,
            originX: transform.originX ?? null,
            originY: transform.originY ?? null,
            lastX: transform.lastX ?? null,
            lastY: transform.lastY ?? null,
            offsetX: transform.offsetX ?? null,
            offsetY: transform.offsetY ?? null
          } : null
        })
      }
    }, recording)

    const eventRecorderInstalled = await recording.evaluate((value) => typeof value.recordEvent === 'function')
    expect(
      eventRecorderInstalled,
      'сохранение событий scale-жеста должно быть настроено'
    ).toBe(true)
  }

  /** Подписывает запись на одно событие Fabric выбранного объекта. */
  private async _attachScaleEventListener(
    { eventName, recording }: { eventName: ScaleTraceEventName, recording: PageScaleRecordingHandle }
  ): Promise<void> {
    expect(eventName, 'запись должна подписываться только на именованное событие').not.toHaveLength(0)
    expect(recording, 'запись scale должна существовать во время подписки').toBeDefined()

    await this.page.evaluate(({ pageRecording, tracedEventName }) => {
      const { editor } = window as any
      const { recordEvent } = pageRecording
      if (!recordEvent) throw new Error('Сохранение событий scale-жеста должно быть настроено')

      const handler = (rawEvent: unknown): void => {
        const event = rawEvent as any
        const { target: eventTarget, transform: eventTransform } = event
        const transform = eventTransform ?? editor.canvas._currentTransform ?? null
        if (tracedEventName === 'mouse:move' && !transform) return

        const target = eventTarget ?? transform?.target
        let matchesTarget = target?.id === pageRecording.targetId
        if (pageRecording.targetKind !== 'image') {
          matchesTarget = target === pageRecording.initialTarget
            || transform?.target === pageRecording.initialTarget
            || pageRecording.childIds.includes(target?.id)
        }
        if (!matchesTarget) return

        recordEvent({ name: tracedEventName, rawEvent, rawTransform: transform })
      }

      pageRecording.handlers[tracedEventName] = handler
      editor.canvas.on(tracedEventName, handler)
    }, { pageRecording: recording, tracedEventName: eventName })

    const listenerInstalled = await recording.evaluate(
      (value, name) => typeof value.handlers[name] === 'function',
      eventName
    )
    expect(listenerInstalled, 'обработчик scale-жеста должен быть сохранён для последующего снятия').toBe(true)
  }
}
