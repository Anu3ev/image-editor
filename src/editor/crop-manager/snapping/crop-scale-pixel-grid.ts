import {
  applyScalingStepCandidate,
  captureScalingStepRounding,
  type ScalingStepOptions
} from '../../snapping-manager/pixel-grid'
import type { CropFrame } from '../domain/crop-frame'
import { resolveCropGuardedScalingStep } from './crop-scale-snap-guards'

/** Pixel rounding for a crop whose size is measured in the source image. */
interface CropScalingStepOptions extends ScalingStepOptions {
  target: CropFrame
}

/** Rounds the legacy resize in source pixels, preserving the guides and fixed side. */
export function applyCropScalingStep({
  target, transform, preservePlacement, snapGuards = []
}: CropScalingStepOptions): void {
  const displaySize = target.getObjectDisplaySize()
  const rounding = captureScalingStepRounding({
    target,
    transform,
    dimensions: {
      width: displaySize.width / Math.abs(target.scaleX),
      height: displaySize.height / Math.abs(target.scaleY)
    }
  })
  if (!rounding) return

  const scale = snapGuards.length === 0
    ? rounding.fallbackScale
    : resolveCropGuardedScalingStep({ target, transform, ...rounding, preservePlacement, snapGuards })

  applyScalingStepCandidate({ target, transform, preservePlacement, rounding, scale })
}
