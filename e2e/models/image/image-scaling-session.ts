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

/** Key state maintained throughout the scaling gesture. */
type ImageScaleModifierState = Required<ImageScaleModifiers>

/** Unfinished pointer gesture for resizing an image. */
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

/** Active Fabric transform state for fail-fast test-support validation. */
type ActiveImageScaleTransform = {
  corner: string | null
  targetMatches: boolean
}

/** Standard controls through which Fabric resizes a rectangular object. */
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

/** Fixed controls for handles that move the right outer boundary. */
const IMAGE_SCALE_RIGHT_EDGE_FIXED_CONTROLS: Partial<Record<ImageScaleControl, ImageScaleControl>> = {
  tr: 'bl',
  mr: 'ml',
  br: 'tl'
}

/** Minimum outer-boundary displacement sufficient to calibrate the pointer gesture. */
const IMAGE_SCALE_CALIBRATION_EPSILON = 0.001

/** Mapping between DOM modifiers and Playwright keys. */
const IMAGE_SCALE_MODIFIER_KEYS = [
  { name: 'altKey', key: 'Alt' },
  { name: 'ctrlKey', key: 'Control' },
  { name: 'shiftKey', key: 'Shift' }
] as const

/** Scaling-gesture state with no modifier keys held. */
const RELEASED_IMAGE_SCALE_MODIFIERS: ImageScaleModifierState = {
  altKey: false,
  ctrlKey: false,
  shiftKey: false
}

/**
 * Reproduces the complete browser-pointer lifecycle for resizing an image.
 *
 * The session stores only transient state of the current gesture. Image geometry
 * remains the source of truth in the Fabric canvas and is read after each pointer step.
 */
export class ImageScalingSession {
  private activeInteraction: ActiveImageScaleInteraction | null = null

  private readonly page: Page

  /** Creates a scaling session for the specified browser page. */
  constructor(page: Page) {
    this.page = page
  }

  /** Presses the specified handle of the selected image with a real mouse. */
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
   * Moves the active handle by the specified distance in viewport pixels.
   *
   * The supplied modifiers apply only to this pointer step. The modifiers
   * used when the gesture began are restored before the next step.
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
   * Moves the active handle to a point in canvas-scene coordinates.
   *
   * The supplied modifiers apply only to this pointer step. The modifiers
   * used when the gesture began are restored before the next step.
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
   * Moves a rotated image's right handle to the specified outer boundary.
   *
   * For a rotated object, the control and the axis-aligned bounds edge move at different
   * rates, so the session first measures one real pointer step.
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

  /** Moves the active right handle to the bounds' X coordinate in the canvas scene. */
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

  /** Performs one complete right-side scaling gesture to the specified absolute scaleX. */
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

  /** Releases the mouse and returns the saved image state. */
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

  /** Interrupts image scaling with a pointer-cancel event. */
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

  /** Finishes an unclosed scaling gesture during test teardown. */
  async finishIfActive(): Promise<ImageScaleSnapshot | null> {
    if (!this.activeInteraction) return null

    return this.finish({
      objectIndex: this.activeInteraction.objectIndex,
      id: this.activeInteraction.id
    })
  }

  /** Reads image geometry and controls in canvas-scene coordinates. */
  async getSnapshot(
    params: ObjectTargetParams = {}
  ): Promise<ImageScaleSnapshot> {
    const snapshot = await this.page.evaluate(({ objectIndex, id }) => {
      const { __editorHelpers: helpers } = window as any
      const target = helpers.resolveCanvasObject(objectIndex, id)
      if (!target || typeof target.getPointByOrigin !== 'function') return null

      target.setCoords()

      /** Reads one reference point of a Fabric object in canvas-scene coordinates. */
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

  /** Returns the active gesture or fails on a lifecycle violation. */
  private _getActiveInteraction(): ActiveImageScaleInteraction {
    expect(this.activeInteraction, 'для движения ручки нужен активный scale-жест').not.toBeNull()

    if (!this.activeInteraction) {
      throw new Error('Должен существовать активный скейлинг изображения')
    }

    return this.activeInteraction
  }

  /** Returns current image geometry from the active gesture. */
  private _getActiveSnapshot(): Promise<ImageScaleSnapshot> {
    const interaction = this._getActiveInteraction()

    return this.getSnapshot({
      objectIndex: interaction.objectIndex,
      id: interaction.id
    })
  }

  /** Returns viewport coordinates of the specified image handle. */
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

  /** Converts a canvas-scene point to the current Fabric canvas viewport. */
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

  /** Moves the mouse and temporarily applies modifiers for one pointer step. */
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

  /** Checks the target and control of the active Fabric transform. */
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

  /** Synchronizes physically held keys with the required gesture state. */
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

  /** Checks that the parameters refer to the active gesture's object. */
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
