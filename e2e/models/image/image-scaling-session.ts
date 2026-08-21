/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Page, expect } from '@playwright/test'
import type {
  ImageScaleControl,
  ImageScaleModifiers,
  ImageScaleMoveByParams,
  ImageScaleMoveToParams,
  ImageScaleSnapshot,
  ImageScaleStartParams,
  ObjectTargetParams
} from '../../types'
import { waitForCanvasRender } from '../../helpers/canvas-render.helper'

/** Состояние клавиш, которое сохраняется на протяжении всего scale-жеста. */
type ImageScaleModifierState = Required<ImageScaleModifiers>

/** Незавершённый pointer-жест изменения размера изображения. */
type ActiveImageScaleInteraction = {
  control: ImageScaleControl
  modifiers: ImageScaleModifierState
  point: {
    x: number
    y: number
  }
  objectIndex?: number
  id?: string
}

/** Состояние активного Fabric transform для fail-fast проверки test-support. */
type ActiveImageScaleTransform = {
  corner: string | null
  targetMatches: boolean
}

/** Стандартные controls, через которые Fabric меняет размер прямоугольного объекта. */
const IMAGE_SCALE_CONTROLS: readonly ImageScaleControl[] = [
  'tl',
  'mt',
  'tr',
  'ml',
  'mr',
  'bl',
  'mb',
  'br'
]

/** Неподвижные controls для ручек, которые двигают правую внешнюю границу. */
const IMAGE_SCALE_RIGHT_EDGE_FIXED_CONTROLS: Partial<Record<ImageScaleControl, ImageScaleControl>> = {
  tr: 'bl',
  mr: 'ml',
  br: 'tl'
}

/** Минимальный сдвиг внешней границы, достаточный для калибровки pointer-жеста. */
const IMAGE_SCALE_CALIBRATION_EPSILON = 0.001

/** Соответствие DOM-модификатора и клавиши Playwright. */
const IMAGE_SCALE_MODIFIER_KEYS = [
  { name: 'altKey', key: 'Alt' },
  { name: 'ctrlKey', key: 'Control' },
  { name: 'shiftKey', key: 'Shift' }
] as const

/** Состояние scale-жеста без зажатых клавиш-модификаторов. */
const RELEASED_IMAGE_SCALE_MODIFIERS: ImageScaleModifierState = {
  altKey: false,
  ctrlKey: false,
  shiftKey: false
}

/**
 * Воспроизводит полный browser pointer lifecycle изменения размера изображения.
 *
 * Сессия хранит только transient-состояние текущего жеста. Геометрия изображения
 * остаётся source of truth в Fabric canvas и читается после каждого pointer-step.
 */
export class ImageScalingSession {
  private activeInteraction: ActiveImageScaleInteraction | null = null

  private readonly page: Page

  /** Создаёт scale-сессию для указанной browser page. */
  constructor(page: Page) {
    this.page = page
  }

  /** Зажимает указанную ручку выбранного изображения реальной мышью. */
  async startFromControl({
    control,
    altKey = false,
    ctrlKey = false,
    shiftKey = false,
    ...target
  }: ImageScaleStartParams): Promise<ImageScaleSnapshot> {
    expect(
      this.activeInteraction,
      'перед началом скейлинга изображения не должно быть другого жеста'
    ).toBeNull()
    expect(
      IMAGE_SCALE_CONTROLS.includes(control),
      'скейлинг изображения должен начинаться через стандартную ручку'
    ).toBe(true)

    const point = await this._resolveControlPoint({
      control,
      ...target
    })
    const modifiers = {
      altKey,
      ctrlKey,
      shiftKey
    }

    await this.page.mouse.move(point.x, point.y)
    await this._setModifierState({
      current: RELEASED_IMAGE_SCALE_MODIFIERS,
      next: modifiers
    })
    await this.page.mouse.down()
    await waitForCanvasRender({ page: this.page })

    this.activeInteraction = {
      control,
      modifiers,
      point,
      ...target
    }

    await this._expectActiveTransform()

    return this._getActiveSnapshot()
  }

  /**
   * Двигает активную ручку на заданное расстояние в viewport-пикселях.
   *
   * Переданные модификаторы действуют только на этот pointer-step. Модификаторы,
   * с которыми начался жест, восстанавливаются перед следующим шагом.
   */
  async dragControlBy({
    deltaX,
    deltaY,
    pointerSteps = 1,
    ...modifiers
  }: ImageScaleMoveByParams): Promise<ImageScaleSnapshot> {
    expect(Number.isFinite(deltaX), 'смещение ручки по X должно быть конечным').toBe(true)
    expect(Number.isFinite(deltaY), 'смещение ручки по Y должно быть конечным').toBe(true)
    expect(pointerSteps, 'количество pointer-шагов должно быть положительным').toBeGreaterThan(0)

    const interaction = this._getActiveInteraction()
    const nextPoint = {
      x: interaction.point.x + deltaX,
      y: interaction.point.y + deltaY
    }

    await this._movePointer({
      modifiers,
      point: nextPoint,
      pointerSteps
    })

    return this._getActiveSnapshot()
  }

  /**
   * Двигает активную ручку к точке в координатах canvas-сцены.
   *
   * Переданные модификаторы действуют только на этот pointer-step. Модификаторы,
   * с которыми начался жест, восстанавливаются перед следующим шагом.
   */
  async dragControlToScenePoint({
    point,
    pointerSteps = 1,
    ...modifiers
  }: ImageScaleMoveToParams): Promise<ImageScaleSnapshot> {
    expect(Number.isFinite(point.x), 'целевая scene-координата X должна быть конечной').toBe(true)
    expect(Number.isFinite(point.y), 'целевая scene-координата Y должна быть конечной').toBe(true)
    expect(pointerSteps, 'количество pointer-шагов должно быть положительным').toBeGreaterThan(0)

    const viewportPoint = await this._resolveViewportPoint({ point })

    await this._movePointer({
      modifiers,
      point: viewportPoint,
      pointerSteps
    })

    return this._getActiveSnapshot()
  }

  /**
   * Двигает правую ручку повёрнутого изображения до заданной внешней границы.
   *
   * У повёрнутого объекта control и край axis-aligned bounds движутся с разным
   * коэффициентом, поэтому сессия сначала измеряет один реальный pointer-step.
   */
  async dragRotatedControlToBoundsRight({
    boundsRight
  }: {
    boundsRight: number
  }): Promise<ImageScaleSnapshot> {
    expect(Number.isFinite(boundsRight), 'целевая правая граница должна быть конечной').toBe(true)

    const interaction = this._getActiveInteraction()
    const fixedControl = IMAGE_SCALE_RIGHT_EDGE_FIXED_CONTROLS[interaction.control]

    expect(fixedControl, 'калибровка правой границы требует правую ручку').toBeDefined()
    if (!fixedControl) {
      throw new Error('Для калибровки правой границы нужна правая ручка изображения')
    }

    const started = await this._getActiveSnapshot()
    expect(Math.abs(started.angle), 'калибровка нужна только повёрнутому изображению')
      .toBeGreaterThan(IMAGE_SCALE_CALIBRATION_EPSILON)

    const movingPoint = started.controlPoints[interaction.control]
    const fixedPoint = started.controlPoints[fixedControl]
    const pointerLever = {
      x: movingPoint.x - fixedPoint.x,
      y: movingPoint.y - fixedPoint.y
    }
    const edgeLever = interaction.control === 'mr'
      ? pointerLever.x
      : started.boundsRight - fixedPoint.x
    const requestedEdgeDelta = boundsRight - started.boundsRight

    expect(Math.abs(edgeLever), 'рычаг правой границы должен быть ненулевым')
      .toBeGreaterThan(IMAGE_SCALE_CALIBRATION_EPSILON)
    expect(Math.abs(requestedEdgeDelta), 'целевая граница должна отличаться от текущей')
      .toBeGreaterThan(IMAGE_SCALE_CALIBRATION_EPSILON)

    const probeMultiplier = requestedEdgeDelta / edgeLever
    const probe = await this.dragControlToScenePoint({
      point: {
        x: movingPoint.x + (pointerLever.x * probeMultiplier),
        y: movingPoint.y + (pointerLever.y * probeMultiplier)
      }
    })
    const observedEdgeDelta = probe.boundsRight - started.boundsRight

    expect(Math.abs(observedEdgeDelta), 'калибровочный шаг должен сдвинуть правую границу')
      .toBeGreaterThan(IMAGE_SCALE_CALIBRATION_EPSILON)

    const calibratedMultiplier = probeMultiplier * (requestedEdgeDelta / observedEdgeDelta)

    return this.dragControlToScenePoint({
      point: {
        x: movingPoint.x + (pointerLever.x * calibratedMultiplier),
        y: movingPoint.y + (pointerLever.y * calibratedMultiplier)
      }
    })
  }

  /** Перемещает активную правую ручку к X-координате bounds в canvas-сцене. */
  async dragRightEdgeTo({
    boundsRight,
    ctrlKey = false
  }: {
    boundsRight: number
    ctrlKey?: boolean
  }): Promise<ImageScaleSnapshot> {
    expect(Number.isFinite(boundsRight), 'целевая правая граница должна быть конечной').toBe(true)

    const interaction = this._getActiveInteraction()
    expect(
      interaction.control,
      'перемещение правой границы требует активной правой ручки'
    ).toBe('mr')

    const snapshot = await this._getActiveSnapshot()
    const point = await this._resolveViewportPoint({
      point: {
        x: boundsRight,
        y: snapshot.centerPoint.y
      }
    })

    await this._movePointer({
      modifiers: { ctrlKey },
      point,
      pointerSteps: 1
    })

    return this._getActiveSnapshot()
  }

  /** Выполняет один полный жест скейлинга справа до заданного абсолютного scaleX. */
  async resizeFromRight({
    scaleX,
    ...target
  }: {
    scaleX: number
  } & ObjectTargetParams): Promise<ImageScaleSnapshot> {
    expect(Number.isFinite(scaleX), 'целевой scaleX изображения должен быть конечным').toBe(true)
    expect(scaleX, 'целевой scaleX изображения должен быть положительным').toBeGreaterThan(0)

    const baseline = await this.startFromControl({
      control: 'mr',
      ...target
    })
    await this.dragRightEdgeTo({
      boundsRight: baseline.boundsLeft + (baseline.width * scaleX)
    })

    return this.finish(target)
  }

  /** Отпускает мышь и возвращает сохранённое состояние изображения. */
  async finish(params: ObjectTargetParams = {}): Promise<ImageScaleSnapshot> {
    const interaction = this._getActiveInteraction()

    expect(
      this._matchesTarget({ interaction, target: params }),
      'нельзя завершить scale-жест другого изображения'
    ).toBe(true)
    expect(Number.isFinite(interaction.point.x), 'координата X для mouseup должна быть конечной').toBe(true)

    await this._expectActiveTransform()

    try {
      await this.page.mouse.up()
      await waitForCanvasRender({ page: this.page })

      return await this.getSnapshot({
        objectIndex: interaction.objectIndex,
        id: interaction.id
      })
    } finally {
      await this._setModifierState({
        current: interaction.modifiers,
        next: RELEASED_IMAGE_SCALE_MODIFIERS
      })
      this.activeInteraction = null
    }
  }

  /** Прерывает скейлинг изображения событием отмены указателя. */
  async cancelWithPointerEvent(
    params: ObjectTargetParams = {}
  ): Promise<ImageScaleSnapshot> {
    const interaction = this._getActiveInteraction()
    expect(
      this._matchesTarget({ interaction, target: params }),
      'нельзя отменить скейлинг другого изображения'
    ).toBe(true)

    try {
      await this.page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel')))
      await waitForCanvasRender({ page: this.page })

      const hasCurrentTransform = await this.page.evaluate(() => {
        const { editor } = window as any

        return editor.canvas._currentTransform !== null
      })
      expect(hasCurrentTransform, 'отмена указателя должна завершить преобразование Fabric').toBe(false)

      return await this.getSnapshot(params)
    } finally {
      await this.page.mouse.up()
      await this._setModifierState({
        current: interaction.modifiers,
        next: RELEASED_IMAGE_SCALE_MODIFIERS
      })
      this.activeInteraction = null
    }
  }

  /** Завершает незакрытый scale-жест во время teardown теста. */
  async finishIfActive(): Promise<ImageScaleSnapshot | null> {
    if (!this.activeInteraction) return null

    return this.finish({
      objectIndex: this.activeInteraction.objectIndex,
      id: this.activeInteraction.id
    })
  }

  /** Читает геометрию изображения и его controls в координатах canvas-сцены. */
  async getSnapshot(
    params: ObjectTargetParams = {}
  ): Promise<ImageScaleSnapshot> {
    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const { __editorHelpers: helpers } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target || typeof target.getPointByOrigin !== 'function') return null

      target.setCoords()

      /** Читает одну reference-точку Fabric object в координатах canvas-сцены. */
      const getScenePoint = (originX: string, originY: string) => {
        const point = target.getPointByOrigin(originX, originY)
        if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null

        return {
          x: point.x,
          y: point.y
        }
      }
      const centerPoint = getScenePoint('center', 'center')
      const controlPoints = {
        tl: getScenePoint('left', 'top'),
        mt: getScenePoint('center', 'top'),
        tr: getScenePoint('right', 'top'),
        ml: getScenePoint('left', 'center'),
        mr: getScenePoint('right', 'center'),
        bl: getScenePoint('left', 'bottom'),
        mb: getScenePoint('center', 'bottom'),
        br: getScenePoint('right', 'bottom')
      }

      if (!centerPoint || Object.values(controlPoints).some((point) => !point)) return null

      return {
        ...helpers.serializeSnappingObjectSnapshot(target),
        centerPoint,
        controlPoints,
        skewX: target.skewX ?? 0,
        skewY: target.skewY ?? 0
      }
    }, params)

    expect(snapshot, 'должен существовать snapshot изображения во время скейлинга').not.toBeNull()
    expect(Number.isFinite(snapshot?.centerPoint.x), 'центр изображения должен быть конечным').toBe(true)
    expect(Object.keys(snapshot?.controlPoints ?? {}), 'snapshot должен содержать восемь controls').toHaveLength(8)

    return snapshot as ImageScaleSnapshot
  }

  /** Возвращает активный жест или падает на нарушении lifecycle. */
  private _getActiveInteraction(): ActiveImageScaleInteraction {
    expect(this.activeInteraction, 'для движения ручки нужен активный scale-жест').not.toBeNull()

    if (!this.activeInteraction) {
      throw new Error('Должен существовать активный скейлинг изображения')
    }

    return this.activeInteraction
  }

  /** Возвращает актуальную геометрию изображения из активного жеста. */
  private _getActiveSnapshot(): Promise<ImageScaleSnapshot> {
    const interaction = this._getActiveInteraction()

    return this.getSnapshot({
      objectIndex: interaction.objectIndex,
      id: interaction.id
    })
  }

  /** Возвращает viewport-координаты указанной ручки изображения. */
  private async _resolveControlPoint({
    control,
    ...targetParams
  }: {
    control: ImageScaleControl
  } & ObjectTargetParams): Promise<{ x: number, y: number }> {
    const point = await this.page.evaluate(({ control: controlName, objectIndex, id }) => {
      const { editor, __editorHelpers: helpers } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target) return null

      editor.canvas.setActiveObject(target)
      target.setCoords()
      editor.canvas.renderAll()

      const controlCoords = target.oCoords?.[controlName]
      if (
        !controlCoords
        || !Number.isFinite(controlCoords.x)
        || !Number.isFinite(controlCoords.y)
      ) return null

      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: rect.left + controlCoords.x,
        y: rect.top + controlCoords.y
      }
    }, {
      control,
      ...targetParams
    })

    expect(point, 'должны существовать viewport-координаты выбранной ручки').not.toBeNull()
    expect(Number.isFinite(point?.x), 'координата X выбранной ручки должна быть конечной').toBe(true)

    return point as { x: number, y: number }
  }

  /** Переводит точку canvas-сцены в viewport текущего Fabric canvas. */
  private async _resolveViewportPoint({
    point
  }: {
    point: {
      x: number
      y: number
    }
  }): Promise<{ x: number, y: number }> {
    const viewportPoint = await this.page.evaluate(({ x, y }) => {
      const { editor } = window as any
      const { viewportTransform } = editor.canvas
      if (!Array.isArray(viewportTransform)) return null

      const viewportX = (viewportTransform[0] * x)
        + (viewportTransform[2] * y)
        + viewportTransform[4]
      const viewportY = (viewportTransform[1] * x)
        + (viewportTransform[3] * y)
        + viewportTransform[5]
      const rect = editor.canvas.upperCanvasEl.getBoundingClientRect()

      return {
        x: rect.left + viewportX,
        y: rect.top + viewportY
      }
    }, point)

    expect(viewportPoint, 'должна существовать viewport-точка для движения ручки').not.toBeNull()
    expect(Number.isFinite(viewportPoint?.x), 'viewport-координата X должна быть конечной').toBe(true)

    return viewportPoint as { x: number, y: number }
  }

  /** Двигает мышь и временно применяет модификаторы одного pointer-step. */
  private async _movePointer({
    modifiers,
    point,
    pointerSteps
  }: {
    modifiers: ImageScaleModifiers
    point: {
      x: number
      y: number
    }
    pointerSteps: number
  }): Promise<void> {
    const interaction = this._getActiveInteraction()
    const stepModifiers = {
      altKey: modifiers.altKey ?? interaction.modifiers.altKey,
      ctrlKey: modifiers.ctrlKey ?? interaction.modifiers.ctrlKey,
      shiftKey: modifiers.shiftKey ?? interaction.modifiers.shiftKey
    }

    await this._setModifierState({
      current: interaction.modifiers,
      next: stepModifiers
    })

    try {
      await this.page.mouse.move(point.x, point.y, { steps: pointerSteps })
      await waitForCanvasRender({ page: this.page })
      interaction.point = point

      await this._expectActiveTransform()
    } finally {
      await this._setModifierState({
        current: stepModifiers,
        next: interaction.modifiers
      })
    }
  }

  /** Проверяет target и control активного Fabric transform. */
  private async _expectActiveTransform(): Promise<void> {
    const interaction = this._getActiveInteraction()
    const transform = await this.page.evaluate(({ objectIndex, id }) => {
      const { editor, __editorHelpers: helpers } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      const currentTransform = editor.canvas._currentTransform

      return {
        corner: typeof currentTransform?.corner === 'string'
          ? currentTransform.corner
          : null,
        targetMatches: Boolean(target && currentTransform?.target === target)
      }
    }, {
      objectIndex: interaction.objectIndex,
      id: interaction.id
    }) as ActiveImageScaleTransform

    expect(
      transform.targetMatches,
      'активный Fabric transform должен принадлежать выбранному изображению'
    ).toBe(true)
    expect(
      transform.corner,
      'активный Fabric transform должен сохранить выбранную ручку'
    ).toBe(interaction.control)
  }

  /** Синхронизирует реально зажатые клавиши с требуемым состоянием жеста. */
  private async _setModifierState({
    current,
    next
  }: {
    current: ImageScaleModifierState
    next: ImageScaleModifierState
  }): Promise<void> {
    for (const { name, key } of IMAGE_SCALE_MODIFIER_KEYS) {
      if (current[name] === next[name]) continue

      if (next[name]) {
        await this.page.keyboard.down(key)
        continue
      }

      await this.page.keyboard.up(key)
    }
  }

  /** Проверяет, что параметры указывают на объект активного жеста. */
  private _matchesTarget({
    interaction,
    target
  }: {
    interaction: ActiveImageScaleInteraction
    target: ObjectTargetParams
  }): boolean {
    if (typeof target.id === 'string') {
      return interaction.id === target.id
    }

    if (typeof target.objectIndex === 'number') {
      return interaction.objectIndex === target.objectIndex
    }

    return true
  }
}
