import { Point } from 'fabric'

import type {
  ActiveSelectionScaleDomainChildMeasurement,
  ActiveSelectionScaleDomainMeasurement,
  ActiveSelectionScaleFrame
} from '../../selection-manager/scaling/active-selection-scale-domain-source'
import type { ResolvedShapeTextLayout } from '../layout/shape-layout'
import { SHAPE_DEFAULT_HORIZONTAL_ALIGN } from '../domain/shape-presets'
import type {
  ShapeGroup,
  ShapeNode,
  ShapeTextNode,
  ShapeTransformOriginX
} from '../types'
import type {
  ActiveSelectionLocalBounds,
  ActiveSelectionVerticalAttachment
} from './active-selection-geometry'
import { resolveActiveSelectionOriginOffset } from './active-selection-geometry'
import {
  SHAPE_SCALING_MIN_SIZE,
  SHAPE_SCALING_SCALE_EPSILON
} from './shape-scaling-layout'
import { applyShapeScalingPreviewLayout } from './shape-scaling-preview'

/** Scales a coordinate in the immutable local plane relative to the fixed point. */
function scaleCoordinate({
  anchor,
  scale,
  value
}: {
  anchor: number
  scale: number
  value: number
}): number {
  return anchor + ((value - anchor) * scale)
}

/** Returns the shape's vertical anchor point and offset within the original frame. */
function resolveVerticalAnchor({
  attachment,
  bounds
}: {
  attachment: ActiveSelectionVerticalAttachment
  bounds: ActiveSelectionLocalBounds
}): Readonly<{ offset: number; value: number }> {
  if (attachment === 'top') return Object.freeze({ offset: -0.5, value: bounds.top })
  if (attachment === 'bottom') return Object.freeze({ offset: 0.5, value: bounds.bottom })

  return Object.freeze({ offset: 0, value: (bounds.top + bounds.bottom) / 2 })
}

/** Calculates the shape's actual bounds after layout and the shared content multiplier. */
export function createActiveSelectionShapeDomainChildMeasurement({
  bounds,
  fixedAnchor,
  layout,
  multipliers,
  target,
  transformOriginPointX,
  transformOriginX,
  verticalAttachment
}: {
  bounds: ActiveSelectionLocalBounds
  fixedAnchor: Readonly<{ x: number; y: number }>
  layout: ResolvedShapeTextLayout
  multipliers: ActiveSelectionScaleDomainMeasurement['multipliers']
  target: ShapeGroup
  transformOriginPointX: number
  transformOriginX: ShapeTransformOriginX
  verticalAttachment: ActiveSelectionVerticalAttachment
}): ActiveSelectionScaleDomainChildMeasurement {
  const xOffset = resolveActiveSelectionOriginOffset({ origin: transformOriginX })
  const scaledOriginX = scaleCoordinate({
    anchor: fixedAnchor.x,
    scale: multipliers.x,
    value: transformOriginPointX
  })
  const verticalAnchor = resolveVerticalAnchor({ attachment: verticalAttachment, bounds })
  const scaledOriginY = scaleCoordinate({
    anchor: fixedAnchor.y,
    scale: multipliers.y,
    value: verticalAnchor.value
  })
  const center = Object.freeze({
    x: scaledOriginX - (xOffset * layout.width),
    y: scaledOriginY - (verticalAnchor.offset * layout.height)
  })

  return Object.freeze({
    bounds: Object.freeze({
      bottom: center.y + (layout.height / 2),
      centerX: center.x,
      centerY: center.y,
      left: center.x - (layout.width / 2),
      right: center.x + (layout.width / 2),
      top: center.y - (layout.height / 2)
    }),
    center,
    target
  })
}

/** Applies internal layout and compensates for the shared frame's derived scale. */
export function applyActiveSelectionShapeDomainChild({
  child,
  frame,
  group,
  layout,
  measurement,
  shape,
  text
}: {
  child: ActiveSelectionScaleDomainChildMeasurement
  frame: ActiveSelectionScaleFrame
  group: ShapeGroup
  layout: ResolvedShapeTextLayout
  measurement: ActiveSelectionScaleDomainMeasurement
  shape: ShapeNode
  text: ShapeTextNode
}): void {
  if (Math.min(frame.scaleX, frame.scaleY) <= 0) {
    throw new Error('Компенсируемая рамка шейпа должна иметь положительный масштаб')
  }

  applyShapeScalingPreviewLayout({
    alignH: group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN,
    group,
    layout,
    minSize: SHAPE_SCALING_MIN_SIZE,
    scaleEpsilon: SHAPE_SCALING_SCALE_EPSILON,
    scaleX: measurement.multipliers.x,
    scaleY: measurement.multipliers.y,
    shape,
    text
  })
  group.set({
    scaleX: measurement.multipliers.x / frame.scaleX,
    scaleY: measurement.multipliers.y / frame.scaleY
  })
  group.setPositionByOrigin(new Point(
    (child.center.x - frame.center.x) / frame.scaleX,
    (child.center.y - frame.center.y) / frame.scaleY
  ), 'center', 'center')
  group.setCoords()
}
