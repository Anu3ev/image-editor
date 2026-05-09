import type {
  Canvas,
  FabricObject,
  Transform
} from 'fabric'
import type {
  ShapeScalingPointerEvent
} from './shape-scaling-layout'

/**
 * Fabric event payload для live scaling shape-группы.
 */
export type ShapeScalingEvent = {
  target?: FabricObject | null
  e?: ShapeScalingPointerEvent
  transform?: Transform | null
}

/**
 * Fabric event payload для commit шага после изменения shape-группы.
 */
export type ShapeModifiedEvent = {
  target?: FabricObject | null
  e?: ShapeScalingPointerEvent
  transform?: Transform | null
}

/**
 * Решение live scaling после проверки ограничений текста и размеров.
 */
export type ShapeScalingDecision = {
  appliedScaleX: number
  appliedScaleY: number
  previewHeight: number
  shouldHandleAsNoop: boolean
  shouldRestoreLastAllowedTransform: boolean
}

/**
 * Ограничения live scaling, вычисленные для текущего transform.
 */
export type ShapeScalingConstraintState = {
  shouldHandleAsNoop: boolean
  shouldRestoreLastAllowedTransform: boolean
  clampedScaleX: number | null
  clampedScaleY: number | null
  resolvedMinimumHeight: number | null
}

/**
 * Направление скейлинга по оси относительно начальной точки transform.
 */
export type ShapeScaleDirection = -1 | 1

/**
 * Fabric canvas с текущим transform, который хранится во время live interaction.
 */
export type CanvasWithCurrentTransform = Canvas & {
  _currentTransform?: Transform | null
}
