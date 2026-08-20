/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  ObjectTargetParams,
  TextCornerScaleHandle,
  TextCornerScaleSnapshot,
  TextScaleDragStep
} from '../../types'
import { waitForCanvasRender } from '../../helpers/canvas-render.helper'

/** Незавершённый скейлинг отдельного текста настоящей мышью. */
type ActiveTextScaleInteraction = Readonly<{
  baseline: TextCornerScaleSnapshot
  centered: boolean
  corner: TextCornerScaleHandle
  id?: string
  objectIndex?: number
  point: Readonly<{
    x: number
    y: number
  }>
  startPoint: Readonly<{
    x: number
    y: number
  }>
  startedCenter: Readonly<{
    x: number
    y: number
  }>
}>

/** Модификаторы одного движения угловой ручки текста. */
type TextScalePointerOptions = Readonly<{
  ctrlKey?: boolean
  pointerSteps?: number
  shiftKey?: boolean
}>

/** Параметры одного смещения угловой ручки текста. */
type TextScalePointerStep = TextScalePointerOptions & Readonly<{
  deltaX: number
  deltaY: number
}>

/** Один измеренный шаг калибровки указателя. */
type TextScaleCalibrationStep = Readonly<{
  multiplier: number
  observedScale: number
  point: Readonly<{ x: number; y: number }>
}>

/** Допуск при калибровке положения указателя по фактически применённому множителю. */
const TEXT_SCALE_CALIBRATION_EPSILON = 0.0000001

/** Достаточная близость к целевому множителю для проверки реального прилипания. */
const TEXT_SCALE_CALIBRATION_TARGET_EPSILON = 0.00001

/** Доля рычага для второго измерения, различимого после округления координат браузером. */
const TEXT_SCALE_CALIBRATION_PROBE_DELTA = 0.2

/** Возвращает неподвижную и перемещаемую точки выбранной угловой ручки. */
function resolveCornerScaleScenePoints({
  centered,
  corner,
  snapshot
}: {
  centered: boolean
  corner: TextCornerScaleHandle
  snapshot: TextCornerScaleSnapshot
}): Readonly<{
  fixed: Readonly<{ x: number; y: number }>
  moving: Readonly<{ x: number; y: number }>
}> {
  const isLeftCorner = corner === 'tl' || corner === 'bl'
  const isTopCorner = corner === 'tl' || corner === 'tr'
  const moving = {
    x: isLeftCorner ? snapshot.boundsLeft : snapshot.boundsRight,
    y: isTopCorner ? snapshot.boundsTop : snapshot.boundsBottom
  }
  const fixed = centered
    ? {
      x: snapshot.boundsLeft + (snapshot.boundsWidth / 2),
      y: snapshot.boundsTop + (snapshot.boundsHeight / 2)
    }
    : {
      x: isLeftCorner ? snapshot.boundsRight : snapshot.boundsLeft,
      y: isTopCorner ? snapshot.boundsBottom : snapshot.boundsTop
    }

  return Object.freeze({ fixed: Object.freeze(fixed), moving: Object.freeze(moving) })
}

/** Управляет полным циклом браузерного взаимодействия при угловом скейлинге отдельного текста. */
export default class TextScalingSession {
  /** Страница редактора для настоящих событий мыши и клавиатуры. */
  private readonly page: Page

  /** Активный жест или null между взаимодействиями. */
  private activeInteraction: ActiveTextScaleInteraction | null = null

  /** Создаёт модель углового скейлинга текста. */
  constructor(page: Page) {
    this.page = page
  }

  /** Захватывает выбранную угловую ручку и оставляет кнопку мыши зажатой. */
  async start(
    params: Readonly<{
      corner: TextCornerScaleHandle
      centered?: boolean
    }> & ObjectTargetParams
  ): Promise<TextCornerScaleSnapshot> {
    expect(
      this.activeInteraction,
      'нельзя начинать новый скейлинг текста до завершения предыдущего'
    ).toBeNull()

    const point = await this._resolveHandlePoint(params)
    await this.page.mouse.move(point.x, point.y)
    if (params.centered) await this.page.keyboard.down('Alt')
    await this.page.mouse.down()
    await waitForCanvasRender({ page: this.page })

    const baseline = await this.getSnapshot(params)
    const centerScenePoint = {
      x: baseline.boundsLeft + (baseline.boundsWidth / 2),
      y: baseline.boundsTop + (baseline.boundsHeight / 2)
    }
    const startedCenter = await this._resolveViewportPoint(centerScenePoint)

    this.activeInteraction = Object.freeze({
      baseline,
      centered: Boolean(params.centered),
      corner: params.corner,
      id: params.id,
      objectIndex: params.objectIndex,
      point,
      startPoint: point,
      startedCenter
    })

    return baseline
  }

  /** Тянет выбранную угловую ручку и оставляет кнопку мыши зажатой. */
  async dragBy(
    params: TextScalePointerStep & Readonly<{
      corner: TextCornerScaleHandle
      centered?: boolean
    }> & ObjectTargetParams
  ): Promise<TextCornerScaleSnapshot> {
    await this.start(params)

    return this.continueBy(params)
  }

  /** Продолжает текущий скейлинг без отпускания угловой ручки. */
  async continueBy(params: TextScalePointerStep): Promise<TextCornerScaleSnapshot> {
    const interaction = this.activeInteraction
    expect(interaction, 'нельзя продолжать скейлинг текста без активного жеста').not.toBeNull()
    if (!interaction) throw new Error('Активный жест скейлинга текста должен существовать')

    const nextPoint = {
      x: interaction.point.x + params.deltaX,
      y: interaction.point.y + params.deltaY
    }
    const moved = await this._movePointer({ ...params, point: nextPoint })
    this.activeInteraction = Object.freeze({ ...interaction, point: moved })

    return this.getSnapshot(interaction)
  }

  /** Двигает активную угловую ручку к точке в координатах сцены редактора. */
  async dragToScenePoint(
    params: TextScalePointerOptions & Readonly<{
      point: Readonly<{ x: number; y: number }>
    }>
  ): Promise<TextCornerScaleSnapshot> {
    expect(Number.isFinite(params.point.x), 'целевая scene-координата X должна быть конечной').toBe(true)
    expect(Number.isFinite(params.point.y), 'целевая scene-координата Y должна быть конечной').toBe(true)

    const interaction = this._getActiveInteraction()
    const point = await this._resolveViewportPoint(params.point)
    const moved = await this._movePointer({ ...params, point })
    this.activeInteraction = Object.freeze({ ...interaction, point: moved })

    return this.getSnapshot(interaction)
  }

  /** Двигает ручку к заданному множителю с поправкой на браузерные координаты. */
  async dragToScale({
    ctrlKey = false,
    scale,
    shiftKey = false
  }: Readonly<{
    ctrlKey?: boolean
    scale: number
    shiftKey?: boolean
  }>): Promise<TextCornerScaleSnapshot> {
    expect(Number.isFinite(scale), 'целевой множитель текста должен быть конечным').toBe(true)
    expect(scale, 'целевой множитель текста должен быть положительным').toBeGreaterThan(0)
    expect(Math.abs(scale - 1), 'целевой множитель должен изменять размер текста')
      .toBeGreaterThan(TEXT_SCALE_CALIBRATION_EPSILON)

    const interaction = this._getActiveInteraction()
    const probePoint = await this._resolveScaleViewportPoint({ interaction, scale })
    const pointerLever = {
      x: probePoint.x - interaction.startPoint.x,
      y: probePoint.y - interaction.startPoint.y
    }
    const finalMultiplier = await this._calibratePointerMultiplier({ interaction, pointerLever, scale })
    const point = this._createCalibratedPoint({ interaction, multiplier: finalMultiplier, pointerLever })
    const moved = await this._movePointer({ ctrlKey, point, shiftKey })
    this.activeInteraction = Object.freeze({ ...interaction, point: moved })

    const snapshot = await this.getSnapshot(interaction)
    if (!interaction.centered) return snapshot

    return this._continueCenteredScaleCalibration({
      interaction,
      pointerLever,
      scale,
      ctrlKey,
      shiftKey,
      snapshot
    })
  }

  /** Двигает указатель к множителю без калибровки по ограниченному размеру текста. */
  async dragTowardScale({
    pointerSteps = 1,
    scale
  }: Readonly<{
    pointerSteps?: number
    scale: number
  }>): Promise<TextCornerScaleSnapshot> {
    expect(Number.isFinite(scale), 'целевой множитель указателя должен быть конечным').toBe(true)
    expect(scale, 'целевой множитель указателя должен быть положительным').toBeGreaterThan(0)

    const interaction = this._getActiveInteraction()
    const point = await this._resolveScaleViewportPoint({ interaction, scale })
    const moved = await this._movePointer({ point, pointerSteps })
    this.activeInteraction = Object.freeze({ ...interaction, point: moved })

    return this.getSnapshot(interaction)
  }

  /** Резко уменьшает текст, перетаскивая активную угловую ручку за неподвижную точку. */
  async dragPastFixedPoint({
    distanceFactor = 0.2
  }: {
    distanceFactor?: number
  } = {}): Promise<TextCornerScaleSnapshot> {
    expect(Number.isFinite(distanceFactor), 'доля движения за неподвижную точку должна быть конечной').toBe(true)
    expect(distanceFactor, 'доля движения за неподвижную точку должна быть положительной').toBeGreaterThan(0)

    const interaction = this._getActiveInteraction()
    const { fixed, moving } = resolveCornerScaleScenePoints({
      centered: interaction.centered,
      corner: interaction.corner,
      snapshot: interaction.baseline
    })

    return this.dragToScenePoint({
      point: {
        x: fixed.x - ((moving.x - fixed.x) * distanceFactor),
        y: fixed.y - ((moving.y - fixed.y) * distanceFactor)
      }
    })
  }

  /** Возвращает точку выбранного множителя в координатах окна браузера. */
  private async _resolveScaleViewportPoint({
    interaction,
    scale
  }: {
    interaction: ActiveTextScaleInteraction
    scale: number
  }): Promise<Readonly<{ x: number; y: number }>> {
    const scenePoints = resolveCornerScaleScenePoints({
      centered: interaction.centered,
      corner: interaction.corner,
      snapshot: interaction.baseline
    })
    if (interaction.centered) return this._resolveCenteredViewportPoint({ interaction, scale })

    return this._resolveViewportPoint({
      x: scenePoints.fixed.x + ((scenePoints.moving.x - scenePoints.fixed.x) * scale),
      y: scenePoints.fixed.y + ((scenePoints.moving.y - scenePoints.fixed.y) * scale)
    })
  }

  /** Уточняет Alt-жест ещё одним шагом, если браузер не попал в целевой множитель. */
  private async _continueCenteredScaleCalibration({
    ctrlKey,
    interaction,
    pointerLever,
    scale,
    shiftKey,
    snapshot
  }: {
    ctrlKey: boolean
    interaction: ActiveTextScaleInteraction
    pointerLever: Readonly<{ x: number; y: number }>
    scale: number
    shiftKey: boolean
    snapshot: TextCornerScaleSnapshot
  }): Promise<TextCornerScaleSnapshot> {
    const observedScale = snapshot.fontSize / interaction.baseline.fontSize
    expect(Number.isFinite(observedScale), 'множитель Alt-скейлинга должен быть конечным').toBe(true)
    expect(observedScale, 'множитель Alt-скейлинга должен быть положительным').toBeGreaterThan(0)
    if (Math.abs(observedScale - scale) <= TEXT_SCALE_CALIBRATION_TARGET_EPSILON) return snapshot

    const correction = scale / observedScale
    const point = this._createCalibratedPoint({ interaction, multiplier: correction, pointerLever })
    const moved = await this._movePointer({ ctrlKey, point, shiftKey })
    this.activeInteraction = Object.freeze({ ...interaction, point: moved })

    return this.getSnapshot(interaction)
  }

  /** Возвращает точку для скейлинга относительно центра в координатах окна браузера. */
  private _resolveCenteredViewportPoint({
    interaction,
    scale
  }: {
    interaction: ActiveTextScaleInteraction
    scale: number
  }): Readonly<{ x: number; y: number }> {
    expect(Number.isFinite(interaction.startedCenter.x), 'начальный центр X должен быть конечным').toBe(true)
    expect(Number.isFinite(interaction.startedCenter.y), 'начальный центр Y должен быть конечным').toBe(true)

    return Object.freeze({
      x: interaction.startedCenter.x
        + ((interaction.startPoint.x - interaction.startedCenter.x) * scale),
      y: interaction.startedCenter.y
        + ((interaction.startPoint.y - interaction.startedCenter.y) * scale)
    })
  }

  /** Подбирает положение указателя по нескольким реальным шагам без прилипания. */
  private async _calibratePointerMultiplier({
    interaction,
    pointerLever,
    scale
  }: {
    interaction: ActiveTextScaleInteraction
    pointerLever: Readonly<{ x: number; y: number }>
    scale: number
  }): Promise<number> {
    expect(Math.hypot(pointerLever.x, pointerLever.y), 'калибровочный рычаг должен быть ненулевым')
      .toBeGreaterThan(TEXT_SCALE_CALIBRATION_EPSILON)
    expect(scale, 'калибруемый множитель текста должен быть положительным').toBeGreaterThan(0)

    const first = await this._measureCalibrationStep({ interaction, multiplier: 1, pointerLever })
    if (Math.abs(first.observedScale - scale) <= TEXT_SCALE_CALIBRATION_TARGET_EPSILON) {
      return first.multiplier
    }

    const second = await this._measureCalibrationStep({
      interaction,
      multiplier: 1 + (Math.sign(scale - first.observedScale) * TEXT_SCALE_CALIBRATION_PROBE_DELTA),
      pointerLever
    })
    if (Math.abs(second.observedScale - scale) <= TEXT_SCALE_CALIBRATION_TARGET_EPSILON) {
      return second.multiplier
    }

    const third = await this._measureCalibrationStep({
      interaction,
      multiplier: this._resolveCalibrationMultiplier({ first, second, scale }),
      pointerLever
    })
    if (Math.abs(third.observedScale - scale) <= TEXT_SCALE_CALIBRATION_TARGET_EPSILON) {
      return third.multiplier
    }

    return this._resolveCalibrationMultiplier({ first: second, second: third, scale })
  }

  /** Измеряет реальный множитель текста в одной калибровочной точке без прилипания. */
  private async _measureCalibrationStep({
    interaction,
    multiplier,
    pointerLever
  }: {
    interaction: ActiveTextScaleInteraction
    multiplier: number
    pointerLever: Readonly<{ x: number; y: number }>
  }): Promise<TextScaleCalibrationStep> {
    expect(Number.isFinite(multiplier), 'множитель положения указателя должен быть конечным').toBe(true)
    expect(multiplier, 'множитель положения указателя должен быть положительным').toBeGreaterThan(0)

    const point = this._createCalibratedPoint({ interaction, multiplier, pointerLever })
    await this._movePointer({ ctrlKey: true, point })
    const snapshot = await this.getSnapshot(interaction)
    const observedScale = snapshot.fontSize / interaction.baseline.fontSize

    expect(Number.isFinite(observedScale), 'измеренный множитель текста должен быть конечным').toBe(true)
    expect(observedScale, 'измеренный множитель текста должен быть положительным').toBeGreaterThan(0)

    return Object.freeze({ multiplier, observedScale, point })
  }

  /** Уточняет положение указателя по двум реальным измерениям одного жеста. */
  private _resolveCalibrationMultiplier({
    first,
    scale,
    second
  }: {
    first: TextScaleCalibrationStep
    scale: number
    second: TextScaleCalibrationStep
  }): number {
    const observedDelta = second.observedScale - first.observedScale
    expect(Math.abs(observedDelta), 'калибровочные шаги должны дать разные размеры текста')
      .toBeGreaterThan(TEXT_SCALE_CALIBRATION_EPSILON)

    const multiplierDelta = second.multiplier - first.multiplier
    const correction = ((scale - second.observedScale) * multiplierDelta) / observedDelta
    const result = second.multiplier + correction

    expect(Number.isFinite(result), 'итоговая поправка положения указателя должна быть конечной').toBe(true)
    expect(result, 'итоговая поправка положения указателя должна быть положительной').toBeGreaterThan(0)

    return result
  }

  /** Возвращает точку указателя на выбранной доле калибровочного рычага. */
  private _createCalibratedPoint({
    interaction,
    multiplier,
    pointerLever
  }: {
    interaction: ActiveTextScaleInteraction
    multiplier: number
    pointerLever: Readonly<{ x: number; y: number }>
  }): Readonly<{ x: number; y: number }> {
    expect(Number.isFinite(pointerLever.x), 'калибровочный рычаг X должен быть конечным').toBe(true)
    expect(Number.isFinite(pointerLever.y), 'калибровочный рычаг Y должен быть конечным').toBe(true)

    return Object.freeze({
      x: interaction.startPoint.x + (pointerLever.x * multiplier),
      y: interaction.startPoint.y + (pointerLever.y * multiplier)
    })
  }

  /** Выполняет несколько последовательных движений одной угловой ручки. */
  async dragInSteps(
    params: Readonly<{
      corner: TextCornerScaleHandle
      steps: readonly TextScaleDragStep[]
    }> & ObjectTargetParams
  ): Promise<readonly TextCornerScaleSnapshot[]> {
    expect(params.steps.length, 'для скейлинга текста должен быть хотя бы один шаг').toBeGreaterThan(0)

    const [firstStep, ...nextSteps] = params.steps
    if (!firstStep) throw new Error('Первый шаг скейлинга текста должен существовать')

    const states = [await this.dragBy({
      corner: params.corner,
      objectIndex: params.objectIndex,
      id: params.id,
      ...firstStep
    })]
    for (const step of nextSteps) states.push(await this.continueBy(step))

    expect(states.length, 'число состояний должно совпадать с числом движений указателя').toBe(params.steps.length)

    return states
  }

  /** Завершает текущий жест настоящим `mouseup`. */
  async finish(params: ObjectTargetParams = {}): Promise<TextCornerScaleSnapshot> {
    const interaction = this.activeInteraction
    expect(interaction, 'нельзя завершить скейлинг текста без активного жеста').not.toBeNull()
    if (!interaction) throw new Error('Активный жест скейлинга текста должен существовать')
    expect(this._matchesTarget({ interaction, params }), 'завершается скейлинг другого текста').toBe(true)

    try {
      await this.page.mouse.up()
      await waitForCanvasRender({ page: this.page })

      return await this.getSnapshot(interaction)
    } finally {
      await this.page.keyboard.up('Alt')
      await this.page.keyboard.up('Control')
      await this.page.keyboard.up('Shift')
      this.activeInteraction = null
    }
  }

  /** Прерывает текущий жест настоящим событием `pointercancel`. */
  async cancelWithPointerEvent(): Promise<TextCornerScaleSnapshot> {
    const interaction = this.activeInteraction
    expect(interaction, 'нельзя отменить скейлинг текста без активного жеста').not.toBeNull()
    if (!interaction) throw new Error('Активный жест скейлинга текста должен существовать')

    try {
      await this.page.evaluate(() => {
        window.dispatchEvent(new PointerEvent('pointercancel'))
      })
      await this.page.mouse.up()
      await waitForCanvasRender({ page: this.page })

      const hasCurrentTransform = await this.page.evaluate(() => {
        const { editor } = window as any

        return editor.canvas._currentTransform !== null
      })
      expect(hasCurrentTransform, 'pointercancel должен завершить преобразование Fabric').toBe(false)

      return await this.getSnapshot(interaction)
    } finally {
      await this.page.keyboard.up('Alt')
      await this.page.keyboard.up('Control')
      await this.page.keyboard.up('Shift')
      this.activeInteraction = null
    }
  }

  /** Завершает скейлинг, если угловая ручка ещё захвачена. */
  async finishIfActive(): Promise<TextCornerScaleSnapshot | null> {
    if (!this.activeInteraction) return null

    return this.finish(this.activeInteraction)
  }

  /** Возвращает координаты выбранной угловой ручки в окне браузера. */
  private async _resolveHandlePoint(
    params: Readonly<{ corner: TextCornerScaleHandle }> & ObjectTargetParams
  ): Promise<Readonly<{ x: number; y: number }>> {
    const point = await this.page.evaluate((payload) => {
      const { corner, objectIndex, id } = payload
      const { editor, __editorHelpers: helpers } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      target.setCoords()
      editor.canvas.renderAll()
      const control = target.oCoords?.[corner]
      if (!control || !Number.isFinite(control.x) || !Number.isFinite(control.y)) return null

      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return Object.freeze({ x: rect.left + control.x, y: rect.top + control.y })
    }, params)

    expect(point, 'должна существовать точка угловой ручки текста').not.toBeNull()
    if (!point) throw new Error('Не удалось определить точку угловой ручки текста')

    return point
  }

  /** Переводит точку сцены редактора в координаты окна браузера. */
  private async _resolveViewportPoint(
    point: Readonly<{ x: number; y: number }>
  ): Promise<Readonly<{ x: number; y: number }>> {
    const viewportPoint = await this.page.evaluate(({ x, y }) => {
      const { editor } = window as any
      const { viewportTransform } = editor.canvas
      if (!Array.isArray(viewportTransform)) return null

      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return Object.freeze({
        x: rect.left + (viewportTransform[0] * x) + (viewportTransform[2] * y) + viewportTransform[4],
        y: rect.top + (viewportTransform[1] * x) + (viewportTransform[3] * y) + viewportTransform[5]
      })
    }, point)

    expect(viewportPoint, 'должна существовать точка ручки в координатах окна браузера').not.toBeNull()
    expect(Number.isFinite(viewportPoint?.x), 'координата X в окне браузера должна быть конечной').toBe(true)
    if (!viewportPoint) throw new Error('Не удалось перевести точку сцены в координаты окна браузера')

    return viewportPoint
  }

  /** Двигает указатель с выбранными модификаторами и возвращает его положение. */
  private async _movePointer({
    ctrlKey = false,
    point,
    pointerSteps = 1,
    shiftKey = false
  }: TextScalePointerOptions & Readonly<{
    point: Readonly<{ x: number; y: number }>
  }>): Promise<Readonly<{ x: number; y: number }>> {
    if (ctrlKey) await this.page.keyboard.down('Control')
    if (shiftKey) await this.page.keyboard.down('Shift')

    try {
      await this.page.mouse.move(point.x, point.y, { steps: pointerSteps })
      await waitForCanvasRender({ page: this.page })
    } finally {
      if (ctrlKey) await this.page.keyboard.up('Control')
      if (shiftKey) await this.page.keyboard.up('Shift')
    }

    return Object.freeze({ ...point })
  }

  /** Читает точное состояние текста, необходимое для проверки углового скейлинга. */
  async getSnapshot(params: ObjectTargetParams): Promise<TextCornerScaleSnapshot> {
    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const { __editorHelpers: helpers } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)

      return target ? helpers.serializeTextResizeSnapshot(target) : null
    }, params)

    expect(snapshot, 'после движения должна существовать геометрия текста').not.toBeNull()
    expect(snapshot?.width, 'ширина текста должна оставаться положительной').toBeGreaterThan(0)
    if (!snapshot) throw new Error('Не удалось получить геометрию текста')

    const leftBottomX = snapshot.leftTopX + snapshot.rightBottomX - snapshot.rightTopX
    const leftBottomY = snapshot.leftTopY + snapshot.rightBottomY - snapshot.rightTopY
    expect(Number.isFinite(leftBottomX), 'координата X левого нижнего угла должна быть конечной').toBe(true)
    expect(Number.isFinite(leftBottomY), 'координата Y левого нижнего угла должна быть конечной').toBe(true)

    return Object.freeze({
      ...snapshot,
      leftBottomX,
      leftBottomY
    })
  }

  /** Проверяет, что завершается жест выбранного текста. */
  private _matchesTarget({
    interaction,
    params
  }: {
    interaction: ActiveTextScaleInteraction
    params: ObjectTargetParams
  }): boolean {
    if (typeof params.id === 'string') return interaction.id === params.id
    if (typeof params.objectIndex === 'number') return interaction.objectIndex === params.objectIndex

    return true
  }

  /** Возвращает активный жест или явно завершает тест при нарушении порядка действий. */
  private _getActiveInteraction(): ActiveTextScaleInteraction {
    expect(this.activeInteraction, 'для движения ручки должен существовать активный жест').not.toBeNull()
    if (!this.activeInteraction) throw new Error('Активный жест скейлинга текста должен существовать')

    return this.activeInteraction
  }
}
