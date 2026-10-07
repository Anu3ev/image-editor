import type {
  ResolvedShapeTextLayout
} from '../layout/shape-layout'
import { resizeShapeNode } from '../creation/shape-node-factory'
import {
  SHAPE_DEFAULT_HORIZONTAL_ALIGN
} from '../domain/shape-presets'
import type {
  ShapeGroup,
  ShapeHorizontalAlign,
  ShapeNode,
  ShapeTextNode
} from '../types'

/**
 * Parameters for the full shape-group preview layout during live scaling.
 */
type ShapeScalingPreviewOptions = {
  group: ShapeGroup
  shape: ShapeNode
  text: ShapeTextNode
  layout: ResolvedShapeTextLayout
  alignH?: ShapeHorizontalAlign
  scaleX: number
  scaleY: number
  minSize: number
  scaleEpsilon: number
}

/**
 * Parameters for shape-node geometry preview without text layout.
 */
type ShapeScalingShapeGeometryOptions = {
  group: ShapeGroup
  shape: ShapeNode
  width: number
  height: number
  scaleX: number
  scaleY: number
  minSize: number
  scaleEpsilon: number
}

/**
 * Parameters for previewing text-node layout inside a shape group.
 */
type ShapeScalingTextLayoutOptions = {
  text: ShapeTextNode
  layout: ResolvedShapeTextLayout
  alignH?: ShapeHorizontalAlign
  scaleX: number
  scaleY: number
  scaleEpsilon: number
}

/**
 * Returns the shape node's local dimensions for a live preview with a fixed stroke.
 */
function resolveShapeScalingPreviewOuterSize({
  size,
  scale,
  strokeWidth,
  minSize,
  scaleEpsilon
}: {
  size: number
  scale: number
  strokeWidth: number
  minSize: number
  scaleEpsilon: number
}): number {
  const safeScale = Math.max(scaleEpsilon, Math.abs(scale) || 1)
  const safeStrokeWidth = Math.max(0, strokeWidth)

  if (safeStrokeWidth <= 0) return Math.max(minSize, size / safeScale)

  return Math.max(
    minSize,
    (size / safeScale) + safeStrokeWidth - (safeStrokeWidth / safeScale)
  )
}

/**
 * Compensates for shape-node geometry during dragging for strokeUniform.
 */
function applyShapeScalingPreviewGeometry({
  group,
  shape,
  width,
  height,
  scaleX,
  scaleY,
  minSize,
  scaleEpsilon
}: ShapeScalingShapeGeometryOptions): void {
  const strokeWidth = Math.max(0, group.shapeStrokeWidth ?? 0)
  const previewShapeWidth = resolveShapeScalingPreviewOuterSize({
    size: width,
    scale: scaleX,
    strokeWidth,
    minSize,
    scaleEpsilon
  })
  const previewShapeHeight = resolveShapeScalingPreviewOuterSize({
    size: height,
    scale: scaleY,
    strokeWidth,
    minSize,
    scaleEpsilon
  })

  resizeShapeNode({
    shape,
    width: previewShapeWidth,
    height: previewShapeHeight,
    rounding: group.shapeRounding,
    strokeWidth
  })
}

/**
 * Applies live text layout during scaling so wrapping and alignment update throughout the drag.
 */
function applyShapeScalingPreviewTextLayout({
  text,
  layout,
  alignH,
  scaleX,
  scaleY,
  scaleEpsilon
}: ShapeScalingTextLayoutOptions): void {
  const safeScaleX = Math.max(scaleEpsilon, Math.abs(scaleX) || 1)
  const safeScaleY = Math.max(scaleEpsilon, Math.abs(scaleY) || 1)
  const horizontalAlign = alignH ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN

  text.set({
    autoExpand: false,
    textAlign: horizontalAlign,
    width: layout.frame.width,
    splitByGrapheme: layout.splitByGrapheme,
    left: layout.frame.left / safeScaleX,
    top: layout.textTop / safeScaleY,
    originX: 'left',
    originY: 'top',
    scaleX: 1 / safeScaleX,
    scaleY: 1 / safeScaleY
  })

  text.initDimensions()
  text.setCoords()
}

/**
 * Applies the shape composition's live preview during dragging.
 */
export const applyShapeScalingPreviewLayout = ({
  group,
  shape,
  text,
  layout,
  alignH,
  scaleX,
  scaleY,
  minSize,
  scaleEpsilon
}: ShapeScalingPreviewOptions): void => {
  const safeScaleX = Math.max(scaleEpsilon, Math.abs(scaleX) || 1)
  const safeScaleY = Math.max(scaleEpsilon, Math.abs(scaleY) || 1)

  group.set({
    width: layout.width / safeScaleX,
    height: layout.height / safeScaleY,
    dirty: true
  })

  applyShapeScalingPreviewGeometry({
    group,
    shape,
    width: layout.width,
    height: layout.height,
    scaleX,
    scaleY,
    minSize,
    scaleEpsilon
  })

  applyShapeScalingPreviewTextLayout({
    text,
    layout,
    alignH,
    scaleX,
    scaleY,
    scaleEpsilon
  })
}
