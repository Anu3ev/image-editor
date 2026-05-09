import {
  applyScaledTextboxVisualState,
  captureTextScaleBase
} from '../../text-manager/scaling/text-scaling-materialization'
import type {
  ShapeGroup,
  ShapeTextNode
} from '../types'

/**
 * Пара размеров shape-группы, восстановленная из rehydrated metadata.
 */
type ShapeGroupDimensions = {
  width: number
  height: number
}

/**
 * Пересчитывает base/manual/replace-box размеры после восстановления группы из внешнего path.
 */
export function resolveRehydratedShapeDimensions({ group }: { group: ShapeGroup }): {
  currentDimensions: ShapeGroupDimensions
  manualDimensions: ShapeGroupDimensions
  replaceBoxDimensions: ShapeGroupDimensions
} {
  const scaleX = Math.abs(group.scaleX ?? 1) || 1
  const scaleY = Math.abs(group.scaleY ?? 1) || 1
  const baseWidth = Math.max(1, group.shapeBaseWidth ?? group.width ?? 1)
  const baseHeight = Math.max(1, group.shapeBaseHeight ?? group.height ?? 1)

  return {
    currentDimensions: {
      width: Math.max(1, baseWidth * scaleX),
      height: Math.max(1, baseHeight * scaleY)
    },
    manualDimensions: {
      width: Math.max(1, (group.shapeManualBaseWidth ?? baseWidth) * scaleX),
      height: Math.max(1, (group.shapeManualBaseHeight ?? baseHeight) * scaleY)
    },
    replaceBoxDimensions: {
      width: Math.max(1, (group.shapeReplaceBoxWidth ?? baseWidth) * scaleX),
      height: Math.max(1, (group.shapeReplaceBoxHeight ?? baseHeight) * scaleY)
    }
  }
}

/**
 * Запекает scene text scale обратно в визуальное состояние текста и пользовательский padding.
 */
export function applyRehydratedShapeTextScale({
  group,
  text,
  textScale
}: {
  group: ShapeGroup
  text: ShapeTextNode
  textScale: number
}): void {
  const resolvedTextScale = Number.isFinite(textScale) && textScale > 0
    ? textScale
    : 1

  if (Math.abs(resolvedTextScale - 1) <= 0.0001) {
    return
  }

  applyScaledTextboxVisualState({
    textbox: text,
    base: captureTextScaleBase({ textbox: text }),
    scale: resolvedTextScale
  })

  group.shapePaddingTop = Math.max(0, (group.shapePaddingTop ?? 0) * resolvedTextScale)
  group.shapePaddingRight = Math.max(0, (group.shapePaddingRight ?? 0) * resolvedTextScale)
  group.shapePaddingBottom = Math.max(0, (group.shapePaddingBottom ?? 0) * resolvedTextScale)
  group.shapePaddingLeft = Math.max(0, (group.shapePaddingLeft ?? 0) * resolvedTextScale)
}
