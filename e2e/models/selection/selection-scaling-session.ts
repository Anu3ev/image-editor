/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  SelectionControlKey,
  SelectionMinimumScaleDirection,
  SelectionMinimumScaleState,
  SnappingObjectSnapshot
} from '../../types'
import { waitForCanvasRender } from '../../helpers/canvas-render.helper'
import type { ShapeModel } from '../shape/shape.model'

/** Локальные точки привязки одной стандартной ручки составного объекта. */
type SelectionControlOrigins = Readonly<{
  originX: 'center' | 'left' | 'right'
  originY: 'bottom' | 'center' | 'top'
}>

/** Угловая ручка активного составного объекта. */
type SelectionDiagonalControlKey = Extract<SelectionControlKey, 'tl' | 'tr' | 'bl' | 'br'>

/** Состояние незавершённого скейлинга составного объекта. */
type ActiveSelectionScaleInteraction = {
  point: {
    x: number
    y: number
  }
  mode: 'browser-pointer' | 'fabric-handler'
  control: SelectionControlKey
  shiftKey: boolean
}

/** Локальные точки привязки всех стандартных ручек составного объекта. */
const SELECTION_CONTROL_ORIGINS: Readonly<Record<SelectionControlKey, SelectionControlOrigins>> = Object.freeze({
  tl: { originX: 'left', originY: 'top' },
  tr: { originX: 'right', originY: 'top' },
  bl: { originX: 'left', originY: 'bottom' },
  br: { originX: 'right', originY: 'bottom' },
  ml: { originX: 'left', originY: 'center' },
  mr: { originX: 'right', originY: 'center' },
  mt: { originX: 'center', originY: 'top' },
  mb: { originX: 'center', originY: 'bottom' }
})

/** Смещение активной ручки на одном шаге скейлинга. */
type DragActiveScaleHandleParams = {
  deltaX: number
  deltaY: number
  pointerSteps?: number
}

/** Результат шага при прямом вызове обработчика Fabric. */
type SelectionScaleStepResult = {
  point: {
    x: number
    y: number
  }
  snapshot: SnappingObjectSnapshot
}

/** Результат прямого скейлинга через браузерный обработчик Fabric. */
type ScaleSelectionFromControlResult = Readonly<{
  point: Readonly<{
    x: number
    y: number
  }>
  shiftKey: boolean
  snapshot: SnappingObjectSnapshot
}>

/** Параметры прямого скейлинга общего выделения через обработчики Fabric. */
type ScaleSelectionFromControlParams = {
  startControl: SelectionControlKey
  oppositeControl: SelectionControlKey
  scaleX?: number
  scaleY?: number
  minimumWidth?: number
  minimumHeight?: number
  shiftKey?: boolean
}

/** Минимальный размер, до которого нужно сжать общее выделение. */
type SelectionMinimumSizeParams = {
  minimumSize: number
  shiftKey?: boolean
}

/** Ручки и состав текущего активного объекта. */
interface SelectionScaleCapability {
  targetId: string | null
  targetType: string
  childIds: string[]
  availableScaleHandles: string[]
  snapshot: SnappingObjectSnapshot
}

/** Состояния в начале, во время жеста и после отпускания мыши. */
interface SelectionScaleGestureResult {
  started: SnappingObjectSnapshot
  live: SnappingObjectSnapshot
  committed: SnappingObjectSnapshot
}

/** Зависимости сессии скейлинга общего выделения. */
type SelectionScalingSessionDependencies = Readonly<{
  page: Page
  shapes: ShapeModel
}>

/** Полный жест указателя при скейлинге активного общего выделения или группы. */
export class SelectionScalingSession {
  private readonly page: Page

  private readonly shapes: ShapeModel

  private activeInteraction: ActiveSelectionScaleInteraction | null

  /** Создаёт сессию скейлинга для указанной Playwright-страницы. */
  constructor({
    page,
    shapes
  }: SelectionScalingSessionDependencies) {
    this.page = page
    this.shapes = shapes
    this.activeInteraction = null
  }

  /** Возвращает состояние текущего активного составного объекта. */
  async getSnapshot(): Promise<SnappingObjectSnapshot> {
    const snapshot = await this.page.evaluate(() => {
      const {
        editor,
        __editorHelpers: helpers
      } = window as any
      const target = editor.canvas.getActiveObject()
      if (!target) return null

      return helpers.serializeSnappingObjectSnapshot(target)
    })

    expect(snapshot, 'должен существовать текущий активный объект').not.toBeNull()

    if (!snapshot) throw new Error('Активный объект должен существовать')

    return snapshot
  }

  /** Возвращает точку стандартной ручки общего выделения в координатах сцены. */
  async getControlScenePoint({
    control
  }: {
    control: SelectionControlKey
  }): Promise<Readonly<{ x: number; y: number }>> {
    const point = await this.page.evaluate(({ originX, originY }) => {
      const { editor } = window as any
      const target = editor.canvas.getActiveObject()
      if (target?.type !== 'activeselection') return null

      const scenePoint = target.getPointByOrigin(originX, originY)
      if (![scenePoint?.x, scenePoint?.y].every(Number.isFinite)) return null

      return { x: scenePoint.x, y: scenePoint.y }
    }, SELECTION_CONTROL_ORIGINS[control])

    expect(point, 'должна существовать точка ручки общего выделения').not.toBeNull()
    expect([point?.x, point?.y].every(Number.isFinite), 'координаты ручки должны быть конечными').toBe(true)
    if (!point) throw new Error('Не удалось определить точку ручки общего выделения')

    return point
  }

  /** Рассчитывает точки пропорционального пути правой верхней ручки для заданных верхних границ. */
  async createTopRightProportionalPath({
    centered = false,
    topPositions
  }: {
    centered?: boolean
    topPositions: readonly number[]
  }): Promise<readonly Readonly<{ x: number; y: number }>[]> {
    expect(topPositions.length, 'путь скейлинга должен содержать минимум одну точку').toBeGreaterThan(0)
    expect(topPositions.length, 'путь скейлинга должен содержать не более двадцати точек').toBeLessThanOrEqual(20)
    expect(topPositions.every(Number.isFinite), 'верхние границы пути должны быть конечными').toBe(true)

    const baseline = await this.getSnapshot()
    const fixedPoint = centered
      ? { x: baseline.centerX, y: baseline.centerY }
      : await this.getControlScenePoint({ control: 'bl' })
    const movingPoint = await this.getControlScenePoint({ control: 'tr' })
    const verticalDistance = movingPoint.y - fixedPoint.y

    expect(Math.abs(verticalDistance), 'исходная высота пропорционального пути должна быть положительной')
      .toBeGreaterThan(0)

    return Object.freeze(topPositions.map((top) => {
      const multiplier = (top - fixedPoint.y) / verticalDistance

      expect(multiplier, 'множитель пропорционального скейлинга должен быть положительным').toBeGreaterThan(0)

      return Object.freeze({
        x: fixedPoint.x + ((movingPoint.x - fixedPoint.x) * multiplier),
        y: top
      })
    }))
  }

  /** Возвращает доступные ручки, дочерние id и границы активного объекта. */
  async getCapability(): Promise<SelectionScaleCapability> {
    const capability = await this.page.evaluate(() => {
      const { editor, __editorHelpers: helpers } = window as any
      const target = editor.canvas.getActiveObject()
      if (!target) return null

      target.setCoords()

      const scaleHandles = ['tl', 'tr', 'br', 'bl', 'ml', 'mt', 'mr', 'mb']
      const availableScaleHandles = scaleHandles.filter((handle) => {
        const point = target.oCoords?.[handle]
        const isVisible = typeof target.isControlVisible !== 'function' || target.isControlVisible(handle)

        return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y) && isVisible)
      })
      const childIds = (target.getObjects?.() ?? [])
        .map((child: { id?: unknown }) => child.id)
        .filter((id: unknown): id is string => typeof id === 'string')

      return {
        targetId: typeof target.id === 'string' ? target.id : null,
        targetType: target.type,
        childIds,
        availableScaleHandles,
        snapshot: helpers.serializeSnappingObjectSnapshot(target)
      }
    })

    expect(capability, 'активный объект должен существовать').not.toBeNull()
    expect(capability?.availableScaleHandles, 'должен существовать список доступных ручек')
      .toBeInstanceOf(Array)

    if (!capability) throw new Error('Активный объект должен существовать')

    return capability
  }

  /** Масштабирует текущее общее выделение справа и возвращает состояние во время жеста. */
  async scaleHorizontallyFromRight(
    params: {
      scaleX: number
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mr',
      oppositeControl: 'ml',
      scaleX: params.scaleX
    })
  }

  /** Масштабирует текущее общее выделение слева и возвращает состояние во время жеста. */
  async scaleHorizontallyFromLeft(
    params: {
      scaleX: number
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'ml',
      oppositeControl: 'mr',
      scaleX: params.scaleX
    })
  }

  /** Масштабирует текущее общее выделение снизу и возвращает состояние во время жеста. */
  async scaleVerticallyFromBottom(
    params: {
      scaleY: number
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mb',
      oppositeControl: 'mt',
      scaleY: params.scaleY
    })
  }

  /** Масштабирует текущее общее выделение сверху и возвращает состояние во время жеста. */
  async scaleVerticallyFromTop(
    params: {
      scaleY: number
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mt',
      oppositeControl: 'mb',
      scaleY: params.scaleY
    })
  }

  /** Масштабирует текущее общее выделение из правого нижнего угла и возвращает состояние во время жеста. Поддерживает непропорциональный скейлинг при зажатом Shift. */
  async scaleDiagonallyFromBottomRight(
    params: {
      scaleX: number
      scaleY: number
      shiftKey?: boolean
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'br',
      oppositeControl: 'tl',
      scaleX: params.scaleX,
      scaleY: params.scaleY,
      shiftKey: params.shiftKey
    })
  }

  /** Масштабирует текущее общее выделение из правого верхнего угла и возвращает состояние во время жеста. Поддерживает непропорциональный скейлинг при зажатом Shift. */
  async scaleDiagonallyFromTopRight(
    params: {
      scaleX: number
      scaleY: number
      shiftKey?: boolean
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'tr',
      oppositeControl: 'bl',
      scaleX: params.scaleX,
      scaleY: params.scaleY,
      shiftKey: params.shiftKey
    })
  }

  /** Масштабирует текущее общее выделение из левого верхнего угла и возвращает состояние во время жеста. Поддерживает непропорциональный скейлинг при зажатом Shift. */
  async scaleDiagonallyFromTopLeft(
    params: {
      scaleX: number
      scaleY: number
      shiftKey?: boolean
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'tl',
      oppositeControl: 'br',
      scaleX: params.scaleX,
      scaleY: params.scaleY,
      shiftKey: params.shiftKey
    })
  }

  /** Масштабирует текущее общее выделение из левого нижнего угла и возвращает состояние во время жеста. Поддерживает непропорциональный скейлинг при зажатом Shift. */
  async scaleDiagonallyFromBottomLeft(
    params: {
      scaleX: number
      scaleY: number
      shiftKey?: boolean
    }
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'bl',
      oppositeControl: 'tr',
      scaleX: params.scaleX,
      scaleY: params.scaleY,
      shiftKey: params.shiftKey
    })
  }

  /** Сжимает текущее общее выделение справа до минимальной ширины и возвращает состояние во время жеста. */
  async shrinkHorizontallyFromRightToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mr',
      oppositeControl: 'ml',
      minimumWidth: params.minimumSize
    })
  }

  /** Сжимает текущее общее выделение снизу до минимальной высоты и возвращает состояние во время жеста. */
  async shrinkVerticallyFromBottomToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mb',
      oppositeControl: 'mt',
      minimumHeight: params.minimumSize
    })
  }

  /** Сжимает текущее общее выделение сверху до минимальной высоты и возвращает состояние во время жеста. */
  async shrinkVerticallyFromTopToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._scaleFromControl({
      startControl: 'mt',
      oppositeControl: 'mb',
      minimumHeight: params.minimumSize
    })
  }

  /** Сжимает текущее общее выделение из правого нижнего угла до минимальных ширины и высоты и возвращает состояние во время жеста. Поддерживает непропорциональный скейлинг при зажатом Shift. */
  async shrinkDiagonallyFromBottomRightToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._shrinkDiagonallyToMinimum({
      corner: 'br',
      minimumSize: params.minimumSize,
      shiftKey: params.shiftKey
    })
  }

  /** Сжимает текущее общее выделение из правого верхнего угла до минимальных ширины и высоты и возвращает состояние во время жеста. Поддерживает непропорциональный скейлинг при зажатом Shift. */
  async shrinkDiagonallyFromTopRightToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._shrinkDiagonallyToMinimum({
      corner: 'tr',
      minimumSize: params.minimumSize,
      shiftKey: params.shiftKey
    })
  }

  /** Сжимает текущее общее выделение из левого верхнего угла до минимальных ширины и высоты и возвращает состояние во время жеста. Поддерживает непропорциональный скейлинг при зажатом Shift. */
  async shrinkDiagonallyFromTopLeftToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._shrinkDiagonallyToMinimum({
      corner: 'tl',
      minimumSize: params.minimumSize,
      shiftKey: params.shiftKey
    })
  }

  /** Сжимает текущее общее выделение из левого нижнего угла до минимальных ширины и высоты и возвращает состояние во время жеста. Поддерживает непропорциональный скейлинг при зажатом Shift. */
  async shrinkDiagonallyFromBottomLeftToMinimum(
    params: SelectionMinimumSizeParams
  ): Promise<SnappingObjectSnapshot> {
    return this._shrinkDiagonallyToMinimum({
      corner: 'bl',
      minimumSize: params.minimumSize,
      shiftKey: params.shiftKey
    })
  }

  /** Сжимает текущее общее выделение по диагонали до минимальных ширины и высоты из выбранного угла. */
  async shrinkDiagonallyToMinimum({
    corner,
    minimumSize,
    shiftKey
  }: {
    corner: SelectionDiagonalControlKey
    minimumSize: number
    shiftKey?: boolean
  }): Promise<SnappingObjectSnapshot> {
    return this._shrinkDiagonallyToMinimum({
      corner,
      minimumSize,
      shiftKey
    })
  }

  /** Начинает реальный скейлинг общего выделения или группы. */
  async startFromControl(
    params: { centered?: boolean, control: SelectionControlKey, shiftKey?: boolean }
  ): Promise<SnappingObjectSnapshot> {
    expect(this.activeInteraction, 'перед скейлингом не должно быть другой активной сессии').toBeNull()

    const point = await this._resolveScaleControlPoint(params)

    await this.page.mouse.move(point.x, point.y)
    if (params.centered) await this.page.keyboard.down('Alt')
    if (params.shiftKey) await this.page.keyboard.down('Shift')
    try {
      await this.page.mouse.down()
    } finally {
      if (params.centered) await this.page.keyboard.up('Alt')
    }
    await waitForCanvasRender({ page: this.page })

    const transform = await this.page.evaluate(({ control }) => {
      const { editor } = window as any
      const target = editor.canvas.getActiveObject()
      const activeTransform = editor.canvas._currentTransform

      return {
        childCount: target?.getObjects?.().length ?? 0,
        started: Boolean(target && activeTransform?.target === target),
        control: activeTransform?.corner ?? null,
        requestedControl: control
      }
    }, params)

    expect(transform.started, 'Нажатие мыши должно начать скейлинг активного объекта').toBe(true)
    expect(
      transform.control,
      'Преобразование Fabric должно использовать выбранную ручку'
    ).toBe(transform.requestedControl)
    expect(transform.childCount, 'общее выделение или группа должны содержать минимум два объекта')
      .toBeGreaterThanOrEqual(2)

    this.activeInteraction = {
      point,
      mode: 'browser-pointer',
      control: params.control,
      shiftKey: Boolean(params.shiftKey)
    }

    return this.getSnapshot()
  }

  /** Перемещает активную ручку в заданную точку сцены настоящим движением указателя. */
  async dragControlToScenePoint({
    ctrlKey = false,
    point,
    shiftKey = false
  }: {
    ctrlKey?: boolean
    point: Readonly<{ x: number, y: number }>
    shiftKey?: boolean
  }): Promise<SnappingObjectSnapshot> {
    const interaction = this.activeInteraction
    expect(
      interaction?.mode,
      'движение к точке сцены должно продолжать сессию скейлинга через указатель'
    ).toBe('browser-pointer')
    expect([point.x, point.y].every(Number.isFinite), 'точка сцены должна содержать конечные координаты').toBe(true)
    if (!interaction || interaction.mode !== 'browser-pointer') {
      throw new Error('Должна существовать сессия скейлинга составного объекта через указатель')
    }

    const viewportPoint = await this.page.evaluate((scenePoint) => {
      const { editor } = window as any
      const [scaleX, skewY, skewX, scaleY, offsetX, offsetY] = editor.canvas.viewportTransform
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: rect.left + (scenePoint.x * scaleX) + (scenePoint.y * skewX) + offsetX,
        y: rect.top + (scenePoint.x * skewY) + (scenePoint.y * scaleY) + offsetY
      }
    }, point)

    const pressesShiftForStep = shiftKey && !interaction.shiftKey

    if (ctrlKey) await this.page.keyboard.down('Control')
    if (pressesShiftForStep) await this.page.keyboard.down('Shift')
    try {
      await this.page.mouse.move(viewportPoint.x, viewportPoint.y)
    } finally {
      if (pressesShiftForStep) await this.page.keyboard.up('Shift')
      if (ctrlKey) await this.page.keyboard.up('Control')
    }
    await waitForCanvasRender({ page: this.page })
    interaction.point = viewportPoint

    return this.getSnapshot()
  }

  /** Завершает скейлинг тем же способом, которым он был начат. */
  async finish(): Promise<SnappingObjectSnapshot> {
    expect(this.activeInteraction, 'для отпускания мыши нужна активная сессия скейлинга').not.toBeNull()
    if (!this.activeInteraction) {
      throw new Error('Активная сессия скейлинга составного объекта должна существовать')
    }

    const interaction = this.activeInteraction
    let snapshot: SnappingObjectSnapshot

    if (interaction.mode === 'browser-pointer') {
      snapshot = await this._finishBrowserScaleInteraction(interaction)
    } else {
      snapshot = await this._finishFabricScaleInteraction(interaction)
    }

    this.activeInteraction = null

    expect(snapshot.boundsWidth, 'ширина выделения после отпускания мыши должна быть положительной').toBeGreaterThan(0)
    expect(snapshot.boundsHeight, 'высота выделения после отпускания мыши должна быть положительной').toBeGreaterThan(0)

    return snapshot
  }

  /** Прерывает скейлинг общего выделения событием отмены указателя. */
  async cancelWithPointerEvent(): Promise<SnappingObjectSnapshot> {
    const interaction = this.activeInteraction
    expect(interaction?.mode, 'отмена указателя должна прерывать активную сессию скейлинга').toBe('browser-pointer')
    if (!interaction || interaction.mode !== 'browser-pointer') {
      throw new Error('Должна существовать сессия скейлинга общего выделения через указатель')
    }

    try {
      await this.page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel')))
      await waitForCanvasRender({ page: this.page })

      const hasCurrentTransform = await this.page.evaluate(() => {
        const { editor } = window as any

        return editor.canvas._currentTransform !== null
      })
      expect(hasCurrentTransform, 'отмена указателя должна завершить преобразование Fabric').toBe(false)

      return await this.getSnapshot()
    } finally {
      await this.page.mouse.up()
      await this.page.keyboard.up('Alt')
      await this.page.keyboard.up('Control')
      await this.page.keyboard.up('Shift')
      this.activeInteraction = null
    }
  }

  /** Отпускает указатель после действия, которое само завершило текущее преобразование Fabric. */
  async releasePointerAfterExternalEnd(): Promise<void> {
    const interaction = this.activeInteraction
    expect(
      interaction?.mode,
      'внешнее завершение должно происходить во время скейлинга через указатель'
    ).toBe('browser-pointer')
    if (!interaction || interaction.mode !== 'browser-pointer') {
      throw new Error('Должна существовать сессия скейлинга через указатель')
    }

    const hasCurrentTransform = await this.page.evaluate(() => {
      const { editor } = window as any

      return editor.canvas._currentTransform !== null
    })
    expect(
      hasCurrentTransform,
      'действие должно самостоятельно завершить преобразование Fabric до отпускания указателя'
    ).toBe(false)

    try {
      await this.page.mouse.up()
      await waitForCanvasRender({ page: this.page })
    } finally {
      await this.page.keyboard.up('Alt')
      await this.page.keyboard.up('Control')
      await this.page.keyboard.up('Shift')
      this.activeInteraction = null
    }
  }

  /** Завершает скейлинг составного объекта, если тест оставил ручку захваченной. */
  async finishIfActive(): Promise<SnappingObjectSnapshot | null> {
    if (!this.activeInteraction) return null

    return this.finish()
  }

  /** Продолжает движение активной ручки составного объекта. */
  async dragControlBy(
    params: DragActiveScaleHandleParams
  ): Promise<SnappingObjectSnapshot> {
    expect(this.activeInteraction, 'для движения ручки нужна активная сессия скейлинга').not.toBeNull()
    if (!this.activeInteraction) {
      throw new Error('Активная сессия скейлинга составного объекта должна существовать')
    }

    if (this.activeInteraction.mode === 'browser-pointer') {
      return this._dragBrowserScaleHandleBy(params)
    }

    return this._dragFabricScaleHandleBy(params)
  }

  /** Выполняет полный скейлинг за правую нижнюю ручку. */
  async scaleFromBottomRightBy(params: DragActiveScaleHandleParams): Promise<SelectionScaleGestureResult> {
    const started = await this.startFromControl({ control: 'br' })
    const live = await this.dragControlBy(params)
    const committed = await this.finish()

    expect(live.boundsWidth, 'ширина во время скейлинга должна быть положительной').toBeGreaterThan(0)
    expect(committed.boundsWidth, 'ширина после отпускания мыши должна быть положительной')
      .toBeGreaterThan(0)

    return { started, live, committed }
  }

  /** Пропорционально масштабирует повёрнутое выделение до заданной правой границы. */
  async scaleUniformlyFromBottomRightToBoundsRight({
    right
  }: {
    right: number
  }): Promise<SelectionScaleGestureResult> {
    expect(Number.isFinite(right), 'правая граница должна быть конечной').toBe(true)

    const baseline = await this.getSnapshot()
    const fixedPoint = await this.getControlScenePoint({ control: 'tl' })
    const movingPoint = await this.getControlScenePoint({ control: 'br' })
    const baselineDistance = baseline.boundsRight - fixedPoint.x

    expect(Math.abs(baselineDistance), 'исходная ширина повёрнутого выделения должна быть положительной')
      .toBeGreaterThan(0)

    const multiplier = (right - fixedPoint.x) / baselineDistance

    expect(multiplier, 'множитель скейлинга должен быть положительным').toBeGreaterThan(0)
    expect(multiplier, 'жест должен изменить размер выделения').not.toBeCloseTo(1, 5)

    const started = await this.startFromControl({ control: 'br' })
    const live = await this.dragControlToScenePoint({
      point: {
        x: fixedPoint.x + ((movingPoint.x - fixedPoint.x) * multiplier),
        y: fixedPoint.y + ((movingPoint.y - fixedPoint.y) * multiplier)
      }
    })
    const committed = await this.finish()

    return { started, live, committed }
  }

  /** Свободно масштабирует повёрнутое выделение из правого нижнего угла до заданных границ. */
  async scaleFreelyFromBottomRightToBounds({
    right,
    bottom
  }: {
    right: number
    bottom: number
  }): Promise<SnappingObjectSnapshot> {
    expect(Number.isFinite(right), 'правая граница должна быть конечной').toBe(true)
    expect(Number.isFinite(bottom), 'нижняя граница должна быть конечной').toBe(true)

    const baseline = await this.getSnapshot()
    const fixedPoint = await this.getControlScenePoint({ control: 'tl' })
    const horizontalPoint = await this.getControlScenePoint({ control: 'tr' })
    const verticalPoint = await this.getControlScenePoint({ control: 'bl' })
    const horizontalVector = {
      x: horizontalPoint.x - fixedPoint.x,
      y: horizontalPoint.y - fixedPoint.y
    }
    const verticalVector = {
      x: verticalPoint.x - fixedPoint.x,
      y: verticalPoint.y - fixedPoint.y
    }
    const rightHorizontal = Math.max(0, horizontalVector.x)
    const rightVertical = Math.max(0, verticalVector.x)
    const bottomHorizontal = Math.max(0, horizontalVector.y)
    const bottomVertical = Math.max(0, verticalVector.y)
    const determinant = (rightHorizontal * bottomVertical) - (rightVertical * bottomHorizontal)

    expect(baseline.boundsRight).toBeCloseTo(fixedPoint.x + rightHorizontal + rightVertical, 5)
    expect(baseline.boundsBottom).toBeCloseTo(fixedPoint.y + bottomHorizontal + bottomVertical, 5)
    expect(Math.abs(determinant), 'заданные границы должны быть достижимы из выбранного угла')
      .toBeGreaterThan(0.000001)

    const targetRight = right - fixedPoint.x
    const targetBottom = bottom - fixedPoint.y
    const horizontalMultiplier = ((targetRight * bottomVertical) - (rightVertical * targetBottom))
      / determinant
    const verticalMultiplier = ((rightHorizontal * targetBottom) - (targetRight * bottomHorizontal))
      / determinant

    expect(horizontalMultiplier, 'горизонтальный множитель должен быть положительным').toBeGreaterThan(0)
    expect(verticalMultiplier, 'вертикальный множитель должен быть положительным').toBeGreaterThan(0)
    expect(horizontalMultiplier, 'свободный скейлинг должен по-разному изменить оси')
      .not.toBeCloseTo(verticalMultiplier, 3)

    await this.startFromControl({ control: 'br' })

    return this.dragControlToScenePoint({
      point: {
        x: fixedPoint.x + (horizontalVector.x * horizontalMultiplier)
          + (verticalVector.x * verticalMultiplier),
        y: fixedPoint.y + (horizontalVector.y * horizontalMultiplier)
          + (verticalVector.y * verticalMultiplier)
      },
      shiftKey: true
    })
  }

  /** Повторно увеличивает и уменьшает выделение до ограничений шейпов в рамках одного жеста. */
  async repeatShapeSelectionScalingToMinimum({
    cycles,
    direction,
    expandBaseScale,
    expandScaleStep,
    minimumSize,
    shapeIds
  }: {
    cycles: number
    direction: SelectionMinimumScaleDirection
    expandBaseScale: number
    expandScaleStep: number
    minimumSize: number
    shapeIds: readonly string[]
  }): Promise<readonly SelectionMinimumScaleState[]> {
    this._assertRepeatedMinimumScaleParams({ cycles, expandBaseScale, expandScaleStep, minimumSize, shapeIds })
    const states: SelectionMinimumScaleState[] = []

    for (let cycleIndex = 0; cycleIndex < cycles; cycleIndex += 1) {
      const scale = expandBaseScale + (cycleIndex * expandScaleStep)
      await this._expandSelection({ direction, scale })
      await this._shrinkSelectionToMinimum({ direction, minimumSize })
      states.push(await this._readMinimumShapeStates({
        label: `цикл ${cycleIndex + 1}`,
        shapeIds
      }))
    }

    await this.finish()
    states.push(await this._readMinimumShapeStates({ label: 'после mouseup', shapeIds }))

    return Object.freeze(states)
  }

  /** Двигает ручку составного объекта настоящим движением указателя. */
  private async _dragBrowserScaleHandleBy(
    params: DragActiveScaleHandleParams
  ): Promise<SnappingObjectSnapshot> {
    const interaction = this.activeInteraction
    expect(interaction?.mode, 'движение указателя должно продолжать ту же сессию скейлинга').toBe('browser-pointer')
    if (!interaction || interaction.mode !== 'browser-pointer') {
      throw new Error('Должна существовать активная сессия скейлинга составного объекта через указатель')
    }

    const nextPoint = {
      x: interaction.point.x + params.deltaX,
      y: interaction.point.y + params.deltaY
    }

    await this.page.mouse.move(nextPoint.x, nextPoint.y, { steps: params.pointerSteps ?? 1 })
    await waitForCanvasRender({ page: this.page })
    interaction.point = nextPoint

    const snapshot = await this.getSnapshot()

    expect(snapshot.boundsWidth, 'ширина активного объекта во время движения должна быть положительной')
      .toBeGreaterThan(0)
    expect(snapshot.boundsHeight, 'высота активного объекта во время движения должна быть положительной')
      .toBeGreaterThan(0)

    return snapshot
  }

  /** Увеличивает общее выделение в заданном направлении. */
  private async _expandSelection({
    direction,
    scale
  }: {
    direction: SelectionMinimumScaleDirection
    scale: number
  }): Promise<void> {
    if (direction.axis === 'horizontal') {
      await this.scaleHorizontallyFromRight({ scaleX: scale })
      return
    }
    if (direction.axis === 'vertical') {
      await this.scaleVerticallyFromTop({ scaleY: scale })
      return
    }
    if (direction.corner === 'br') {
      await this.scaleDiagonallyFromBottomRight({ scaleX: scale, scaleY: scale })
      return
    }

    await this.scaleDiagonallyFromTopRight({ scaleX: scale, scaleY: scale })
  }

  /** Уменьшает общее выделение до ограничения в заданном направлении. */
  private async _shrinkSelectionToMinimum({
    direction,
    minimumSize
  }: {
    direction: SelectionMinimumScaleDirection
    minimumSize: number
  }): Promise<void> {
    if (direction.axis === 'horizontal') {
      await this.shrinkHorizontallyFromRightToMinimum({ minimumSize })
      return
    }
    if (direction.axis === 'vertical') {
      await this.shrinkVerticallyFromTopToMinimum({ minimumSize })
      return
    }
    if (direction.corner === 'br') {
      await this.shrinkDiagonallyFromBottomRightToMinimum({ minimumSize })
      return
    }

    await this.shrinkDiagonallyFromTopRightToMinimum({ minimumSize })
  }

  /** Читает геометрию и число строк выбранных шейпов на одном этапе жеста. */
  private async _readMinimumShapeStates({
    label,
    shapeIds
  }: {
    label: string
    shapeIds: readonly string[]
  }): Promise<SelectionMinimumScaleState> {
    const states = await Promise.all(shapeIds.map(async(id) => {
      const [snapshot, text] = await Promise.all([
        this.shapes.getScaleSnapshot({ id }),
        this.shapes.getTextNode({ id })
      ])
      if (!text) throw new Error(`${label}: текст внутри ${id} должен существовать`)

      return Object.freeze({ id, lineCount: text.lineCount, snapshot })
    }))

    return Object.freeze({ label, shapes: Object.freeze(states) })
  }

  /** Проверяет ограниченные параметры повторного уменьшения общего выделения. */
  private _assertRepeatedMinimumScaleParams({
    cycles,
    expandBaseScale,
    expandScaleStep,
    minimumSize,
    shapeIds
  }: {
    cycles: number
    expandBaseScale: number
    expandScaleStep: number
    minimumSize: number
    shapeIds: readonly string[]
  }): void {
    expect(Number.isInteger(cycles) && cycles > 0 && cycles <= 100, 'число циклов должно быть от 1 до 100')
      .toBe(true)
    expect(shapeIds.length, 'для общего выделения нужны минимум два шейпа').toBeGreaterThanOrEqual(2)

    const scaleValues = [expandBaseScale, expandScaleStep, minimumSize]
    if (!scaleValues.every(Number.isFinite) || expandBaseScale <= 0 || expandScaleStep < 0 || minimumSize <= 0) {
      throw new Error('Параметры повторного скейлинга должны содержать положительные конечные размеры')
    }
    if (new Set(shapeIds).size !== shapeIds.length) {
      throw new Error('Повторный скейлинг требует уникальные id шейпов')
    }
  }

  /** Продолжает скейлинг прямым вызовом обработчика Fabric. */
  private async _dragFabricScaleHandleBy(
    params: DragActiveScaleHandleParams
  ): Promise<SnappingObjectSnapshot> {
    const interaction = this.activeInteraction
    expect(
      interaction?.mode,
      'Движение через обработчик Fabric должно продолжать сессию прямых вызовов'
    ).toBe('fabric-handler')
    if (!interaction || interaction.mode !== 'fabric-handler') {
      throw new Error('Должна существовать сессия скейлинга через обработчики Fabric')
    }

    const result = await this._moveFabricScaleHandle({
      ...interaction,
      ...params
    })

    expect(
      result,
      'Движение через обработчик Fabric должно вернуть состояние общего выделения во время жеста'
    ).not.toBeNull()
    if (!result) {
      throw new Error('Движение через обработчик Fabric должно вернуть состояние общего выделения во время жеста')
    }

    await waitForCanvasRender({ page: this.page })

    interaction.point = result.point

    return result.snapshot
  }

  /** Двигает указатель прямым вызовом обработчика Fabric и читает новое положение ручки. */
  private async _moveFabricScaleHandle(
    payload: ActiveSelectionScaleInteraction & DragActiveScaleHandleParams
  ): Promise<SelectionScaleStepResult | null> {
    return this.page.evaluate((interaction) => {
      const { point, control, deltaX, deltaY, shiftKey } = interaction
      const { editor, __editorHelpers: helpers } = window as any
      const target = editor.canvas.getActiveObject()
      if (!target) return null

      const movePoint = {
        x: point.x + deltaX,
        y: point.y + deltaY
      }

      editor.canvas.__onMouseMove(new MouseEvent('mousemove', {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: movePoint.x,
        clientY: movePoint.y,
        shiftKey
      }))

      const snapshotTarget = editor.canvas.getActiveObject() ?? target
      snapshotTarget.setCoords()

      const currentControl = snapshotTarget.oCoords?.[control]
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const currentPoint = currentControl && Number.isFinite(currentControl.x) && Number.isFinite(currentControl.y)
        ? { x: rect.left + currentControl.x, y: rect.top + currentControl.y }
        : movePoint

      return {
        point: currentPoint,
        snapshot: helpers.serializeSnappingObjectSnapshot(snapshotTarget)
      }
    }, payload)
  }

  /** Завершает скейлинг составного объекта настоящим отпусканием мыши. */
  private async _finishBrowserScaleInteraction(
    interaction: ActiveSelectionScaleInteraction
  ): Promise<SnappingObjectSnapshot> {
    expect(
      interaction.mode,
      'отпускание мыши должно завершать сессию скейлинга через указатель'
    ).toBe('browser-pointer')
    expect(Number.isFinite(interaction.point.x), 'координата X при отпускании мыши должна быть конечной').toBe(true)

    try {
      await this.page.mouse.up()
      await waitForCanvasRender({ page: this.page })

      return await this.getSnapshot()
    } finally {
      if (interaction.shiftKey) await this.page.keyboard.up('Shift')
    }
  }

  /** Завершает скейлинг прямым вызовом обработчика Fabric. */
  private async _finishFabricScaleInteraction(
    interaction: ActiveSelectionScaleInteraction
  ): Promise<SnappingObjectSnapshot> {
    const snapshot: SnappingObjectSnapshot | null = await this.page.evaluate((payload) => {
      const { point, control, shiftKey } = payload
      const { editor, __editorHelpers: helpers } = window as any
      const target = editor.canvas.getActiveObject()
      if (!target) return null

      target.setCoords()

      const currentControl = target.oCoords?.[control]
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()
      const releasePoint = currentControl && Number.isFinite(currentControl.x) && Number.isFinite(currentControl.y)
        ? { x: rect.left + currentControl.x, y: rect.top + currentControl.y }
        : point

      editor.canvas.__onMouseUp(new MouseEvent('mouseup', {
        bubbles: true,
        button: 0,
        buttons: 0,
        clientX: releasePoint.x,
        clientY: releasePoint.y,
        shiftKey
      }))

      const snapshotTarget = editor.canvas.getActiveObject() ?? target
      snapshotTarget.setCoords()

      return helpers.serializeSnappingObjectSnapshot(snapshotTarget)
    }, interaction)

    expect(snapshot, 'Завершение через обработчик Fabric должно вернуть состояние общего выделения').not.toBeNull()
    if (!snapshot) {
      throw new Error('Завершение через обработчик Fabric должно вернуть состояние общего выделения')
    }
    expect(
      Number.isFinite(snapshot.boundsWidth),
      'ширина после завершения через обработчик Fabric должна быть конечной'
    ).toBe(true)

    await waitForCanvasRender({ page: this.page })

    return snapshot
  }

  /** Возвращает экранные координаты ручки общего выделения или группы. */
  private async _resolveScaleControlPoint(
    params: { control: SelectionControlKey }
  ): Promise<{ x: number, y: number }> {
    const point = await this.page.evaluate(({ control }) => {
      const { editor } = window as any
      const target = editor.canvas.getActiveObject()
      if (!target) return null

      target.setCoords()
      editor.canvas.renderAll()

      const controlPoint = target.oCoords?.[control]
      if (!controlPoint || !Number.isFinite(controlPoint.x) || !Number.isFinite(controlPoint.y)) return null

      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: rect.left + controlPoint.x,
        y: rect.top + controlPoint.y
      }
    }, params)

    expect(point, 'координаты ручки активного объекта должны существовать').not.toBeNull()
    expect(Number.isFinite(point?.x), 'координата X ручки должна быть конечной').toBe(true)
    expect(Number.isFinite(point?.y), 'координата Y ручки должна быть конечной').toBe(true)

    if (!point) throw new Error('Координаты ручки активного объекта должны существовать')

    return point
  }

  /** Выполняет или продолжает скейлинг через прямой вызов обработчиков Fabric. */
  private async _scaleFromControl(
    params: ScaleSelectionFromControlParams
  ): Promise<SnappingObjectSnapshot> {
    const {
      activeInteraction
    } = this
    const requestedShiftKey = Boolean(params.shiftKey)

    this._assertScaleInteractionCanContinue({
      activeInteraction,
      startControl: params.startControl,
      requestedShiftKey
    })

    const result: ScaleSelectionFromControlResult | null = await this.page.evaluate((payload) => {
      const {
        __editorHelpers: helpers
      } = window as any

      return helpers.scaleSelectionFromControl(payload)
    }, {
      ...params,
      continueInteraction: activeInteraction !== null,
      shiftKey: requestedShiftKey
    })

    expect(result, 'должно существовать состояние общего выделения во время скейлинга').not.toBeNull()
    if (!result) throw new Error('Не удалось получить состояние общего выделения во время скейлинга')
    expect(Number.isFinite(result.point.x), 'координата X ручки должна быть конечной').toBe(true)
    expect(Number.isFinite(result.point.y), 'координата Y ручки должна быть конечной').toBe(true)

    await waitForCanvasRender({ page: this.page })

    const {
      point,
      shiftKey: interactionShiftKey,
      snapshot
    } = result

    this.activeInteraction = {
      point,
      mode: 'fabric-handler',
      control: params.startControl,
      shiftKey: interactionShiftKey
    }

    return snapshot
  }

  /** Сжимает составной объект до минимального размера из указанного угла. */
  private async _shrinkDiagonallyToMinimum(params: {
    corner: Extract<SelectionControlKey, 'tl' | 'tr' | 'bl' | 'br'>
    minimumSize: number
    shiftKey?: boolean
  }): Promise<SnappingObjectSnapshot> {
    const {
      corner,
      minimumSize,
      shiftKey
    } = params

    return this._scaleFromControl({
      startControl: corner,
      oppositeControl: this._resolveOppositeDiagonalControl(corner),
      minimumWidth: minimumSize,
      minimumHeight: minimumSize,
      shiftKey
    })
  }

  /** Возвращает ручку, противоположную указанному углу. */
  private _resolveOppositeDiagonalControl(
    corner: Extract<SelectionControlKey, 'tl' | 'tr' | 'bl' | 'br'>
  ): Extract<SelectionControlKey, 'tl' | 'tr' | 'bl' | 'br'> {
    if (corner === 'br') return 'tl'
    if (corner === 'tr') return 'bl'
    if (corner === 'tl') return 'br'

    return 'tr'
  }

  /** Проверяет, что следующий шаг совместим с уже начатым скейлингом. */
  private _assertScaleInteractionCanContinue(params: {
    activeInteraction: ActiveSelectionScaleInteraction | null
    startControl: SelectionControlKey
    requestedShiftKey: boolean
  }): void {
    const {
      activeInteraction,
      startControl,
      requestedShiftKey
    } = params

    if (!activeInteraction) return

    expect(
      activeInteraction.mode,
      'прямой вызов должен продолжать только сессию обработчиков Fabric'
    ).toBe('fabric-handler')
    expect(
      activeInteraction.control,
      'нельзя продолжать активную сессию скейлинга общего выделения через другую ручку'
    ).toBe(startControl)
    expect(
      activeInteraction.shiftKey,
      'нельзя продолжать активную сессию скейлинга общего выделения с другим состоянием Shift'
    ).toBe(requestedShiftKey)
  }
}
