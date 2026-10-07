import {
  applyScaledTextboxVisualState,
  captureTextScaleBase
} from '../../text-manager/scaling/text-scaling-materialization'
import { hasShapeLayoutInputsChanged } from '../domain/shape-layout-signature'
import { detachShapeGroupAutoLayout } from '../domain/shape-runtime'
import type {
  ShapeDimensions,
  ShapeGroup,
  ShapeTextNode
} from '../types'

/**
 * Dimensions and layout-reapplication mode after preparing the shape group.
 */
type PreparedRehydratedShapeLayout = {
  currentDimensions: ShapeDimensions
  replaceBoxDimensions: ShapeDimensions
  shouldRecalculateLayout: boolean
}

/**
 * Recalculates base/manual/replacement-box dimensions after restoring a group through an external path.
 */
export function resolveRehydratedShapeDimensions({ group }: { group: ShapeGroup }): {
  currentDimensions: ShapeDimensions
  manualDimensions: ShapeDimensions
  replaceBoxDimensions: ShapeDimensions
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
 * Bakes scene text scale back into the text's visual state and user-defined padding.
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

/**
 * Bakes transient state and determines whether serialized visual bounds can be preserved.
 */
export function prepareRehydratedShapeLayout({
  group,
  text,
  textScale,
  shapeTextAutoExpand
}: {
  group: ShapeGroup
  text: ShapeTextNode
  textScale: number
  shapeTextAutoExpand?: boolean
}): PreparedRehydratedShapeLayout {
  const {
    currentDimensions,
    manualDimensions,
    replaceBoxDimensions
  } = resolveRehydratedShapeDimensions({ group })

  if (shapeTextAutoExpand !== undefined) {
    group.shapeTextAutoExpand = shapeTextAutoExpand
  }

  const shouldRecalculateLayout = hasShapeLayoutInputsChanged({
    group,
    text
  })

  applyRehydratedShapeTextScale({
    group,
    text,
    textScale
  })
  detachShapeGroupAutoLayout({ group })

  group.shapeManualBaseWidth = manualDimensions.width
  group.shapeManualBaseHeight = manualDimensions.height

  return {
    currentDimensions,
    replaceBoxDimensions,
    shouldRecalculateLayout
  }
}
