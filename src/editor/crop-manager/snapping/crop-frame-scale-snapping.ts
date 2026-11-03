/* eslint-disable no-use-before-define -- Step application precedes internal calculations. */
import { Point, type TPointerEvent, type Transform } from 'fabric'

import { getObjectBounds } from '../../utils/geometry'
import { applyCropScalingStep } from './crop-scale-pixel-grid'
import {
  resolveScaleAxisSnaps,
  resolveScalingAxisState,
  resolveScalingTransformState,
  type ScaleUpdatePlan
} from '../../snapping-manager/scaling/legacy-scale-snapping'
import type { ScalingStepPlacementPreserver } from '../../snapping-manager/scaling/scaling-step-snap-guards'
import type { AnchorBuckets, GuideLine } from '../../snapping-manager/types'
import { resolveCropFrameResizePreserveAspectRatio } from '../domain/crop-resize-mode'
import type { CropSession } from '../types'
import type { CropFrame } from '../domain/crop-frame'
import { resolveCropScaleUpdatePlan } from './crop-scale-plan'

/** Legacy step for a frame whose geometry is not yet supported by the shared scale session. */
interface CropFrameScaleSnapStep {
  session: CropSession
  transform: Transform
  event?: TPointerEvent | null
  anchors: AnchorBuckets
  threshold: number
}

/**
 * Applies legacy crop snapping, preserving the fixed side even when no guide is found.
 * The source bounds are applied afterwards by CropManager, which hides a guide the frame no longer reaches.
 */
export function applyCropFrameScaleSnapping(params: CropFrameScaleSnapStep): GuideLine[] {
  const { session, transform } = params
  const { frame } = session
  const { original } = transform
  if (frame.scaleX === original?.scaleX && frame.scaleY === original?.scaleY) return []

  const plan = resolveCropFrameScalePlan(params)
  const preservePlacement = captureFrameScalePlacement({ frame, transform })

  if (plan) {
    frame.set({ scaleX: plan.nextScaleX ?? frame.scaleX, scaleY: plan.nextScaleY ?? frame.scaleY })
    preservePlacement.applyPlacement(preservePlacement.placement)
    transform.scaleX = frame.scaleX
    transform.scaleY = frame.scaleY
  }
  applyCropScalingStep({ target: frame, transform, preservePlacement, snapGuards: plan?.snapGuards })

  return plan?.guides ?? []
}

/** Calculates legacy resize guides without modifying the frame. */
function resolveCropFrameScalePlan({
  session, transform, event, anchors, threshold
}: CropFrameScaleSnapStep): ScaleUpdatePlan | null {
  if (event?.ctrlKey) return null
  const target = session.frame
  const bounds = getObjectBounds({ object: target })
  if (!bounds) return null

  const axes = resolveScalingAxisState({ transform })
  const state = resolveScalingTransformState({ target, transform })
  const snaps = resolveScaleAxisSnaps({ bounds, corner: transform.corner, anchors, threshold, ...axes, ...state })
  if (!snaps) return null

  return resolveCropScaleUpdatePlan({
    target,
    bounds,
    ...state,
    ...snaps,
    originalScaleX: transform.original?.scaleX,
    originalScaleY: transform.original?.scaleY,
    shouldUseUniformScaleSnap: resolveCropFrameResizePreserveAspectRatio({ target, shiftKey: event?.shiftKey })
  })
}

/** Saves the frame anchor point in canvas coordinates for applying and validating scale candidates. */
function captureFrameScalePlacement({
  frame, transform
}: { frame: CropFrame; transform: Transform }): ScalingStepPlacementPreserver {
  const { originX, originY } = resolveScalingTransformState({ target: frame, transform })
  const point = frame.getPointByOrigin(originX, originY)

  return {
    placement: { left: point.x, top: point.y, originX, originY },
    applyPlacement: ({ left, top, originX: fixedOriginX, originY: fixedOriginY }) => {
      frame.setPositionByOrigin(new Point(left, top), fixedOriginX, fixedOriginY)
      frame.setCoords()
    }
  }
}
