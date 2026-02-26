import {
  Canvas,
  FabricObject,
  Transform
} from 'fabric'
import { applyShapeTextLayout } from './shape-layout'
import {
  ShapeGroup,
  ShapePadding,
  ShapeScalingState
} from './types'
import {
  getShapeNodes,
  isShapeGroup
} from './shape-utils'
import {
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN
} from './shape-presets'

const MIN_SIZE = 1

const SCALE_EPSILON = 0.0001

type ShapeScalingEvent = {
  target?: FabricObject | null
  transform?: Transform
}

type ShapeModifiedEvent = {
  target?: FabricObject | null
}

/**
 * Контроллер масштабирования shape-группы без изменения размера шрифта.
 */
export default class ShapeScalingController {
  /**
   * Fabric canvas редактора.
   */
  private canvas: Canvas

  /**
   * Временное состояние масштабирования для активных shape-групп.
   */
  private scalingState: WeakMap<ShapeGroup, ShapeScalingState>

  constructor({ canvas }: { canvas: Canvas }) {
    this.canvas = canvas
    this.scalingState = new WeakMap()
  }

  /**
   * Обрабатывает процесс масштабирования shape-группы.
   */
  public handleObjectScaling = (
    event: ShapeScalingEvent
  ): void => {
    const { target } = event
    if (!isShapeGroup(target)) return

    const group = target
    this._ensureScalingState({ group })
    const { text } = getShapeNodes({ group })

    if (!text) return

    const scaleX = Math.abs(group.scaleX ?? 1) || 1
    const scaleY = Math.abs(group.scaleY ?? 1) || 1

    text.set({
      scaleX: 1 / scaleX,
      scaleY: 1 / scaleY
    })

    text.setCoords()

    this.canvas.requestRenderAll()
  }

  /**
   * Завершает масштабирование и "запекает" размеры в геометрию shape-группы.
   */
  public handleObjectModified = (event: ShapeModifiedEvent): void => {
    const { target } = event
    if (!isShapeGroup(target)) return

    const group = target
    const state = this.scalingState.get(group)
    const scaleX = Math.abs(group.scaleX ?? 1) || 1
    const scaleY = Math.abs(group.scaleY ?? 1) || 1
    const hasScaleChange = Math.abs(scaleX - 1) > SCALE_EPSILON
      || Math.abs(scaleY - 1) > SCALE_EPSILON
    const hasScalingState = Boolean(state)

    if (!hasScaleChange && !hasScalingState) return

    const baseWidth = state?.baseWidth ?? Math.max(MIN_SIZE, group.shapeBaseWidth ?? group.width ?? MIN_SIZE)
    const baseHeight = state?.baseHeight ?? Math.max(MIN_SIZE, group.shapeBaseHeight ?? group.height ?? MIN_SIZE)

    const width = Math.max(MIN_SIZE, baseWidth * scaleX)
    const height = Math.max(MIN_SIZE, baseHeight * scaleY)

    const {
      shape,
      text
    } = getShapeNodes({ group })

    if (!shape || !text) {
      this.scalingState.delete(group)
      return
    }

    const alignH = group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const alignV = group.shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN

    const padding = ShapeScalingController._resolvePadding({ group })

    applyShapeTextLayout({
      group,
      shape,
      text,
      width,
      height,
      alignH,
      alignV,
      padding
    })

    text.set({
      scaleX: 1,
      scaleY: 1
    })

    group.set({
      scaleX: 1,
      scaleY: 1
    })

    group.setCoords()
    text.setCoords()
    shape.setCoords()

    this.scalingState.delete(group)

    this.canvas.requestRenderAll()
  }

  /**
   * Очищает состояние масштабирования для переданной shape-группы.
   */
  public clearState({ group }: { group: ShapeGroup }): void {
    this.scalingState.delete(group)
  }

  /**
   * Создает базовое состояние масштабирования для shape-группы.
   */
  private _ensureScalingState({ group }: { group: ShapeGroup }): ShapeScalingState {
    let state = this.scalingState.get(group)

    if (!state) {
      state = {
        baseWidth: Math.max(MIN_SIZE, group.shapeBaseWidth ?? group.width ?? MIN_SIZE),
        baseHeight: Math.max(MIN_SIZE, group.shapeBaseHeight ?? group.height ?? MIN_SIZE)
      }

      this.scalingState.set(group, state)
    }

    return state
  }

  /**
   * Возвращает padding текстового фрейма из метаданных группы.
   */
  private static _resolvePadding({ group }: { group: ShapeGroup }): ShapePadding {
    return {
      top: group.shapePaddingTop ?? 0.2,
      right: group.shapePaddingRight ?? 0.2,
      bottom: group.shapePaddingBottom ?? 0.2,
      left: group.shapePaddingLeft ?? 0.2
    }
  }
}
