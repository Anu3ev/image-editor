import {
  ActiveSelection,
  Control,
  FitContentLayout,
  InteractiveFabricObject,
  Point,
  Textbox,
  controlsUtils,
  type FabricObject,
  type StrictLayoutContext
} from 'fabric'
import { DEFAULT_CONTROLS } from './default-controls'
import { applyShapeCornerFreeScaleControls } from '../shape-manager/scaling/shape-controls'

type BoundingBox = {
  height: number
  left: number
  top: number
  width: number
}

type ActiveSelectionPrototype = ActiveSelection & {
  _calcBoundsFromObjects?: (...args: unknown[]) => BoundingBox | undefined
  _onAfterObjectsChange?: (type: unknown, options: unknown) => unknown
}

/**
 * Class for configuring custom controls in the editor
 */
export default class ControlsCustomizer {
  /**
   * Disables width changes along the X axis for locked objects while preserving the rest of the handler's behavior.
   */
  private static wrapWidthControl(
    control: Control | undefined
  ): void {
    if (!control?.actionHandler) return

    const originalHandler = control.actionHandler
    control.actionHandler = (eventData, transform, x, y) => {
      const target = transform?.target
      if (!target || target.locked || target.lockScalingX) {
        return false
      }

      return originalHandler(eventData, transform, x, y)
    }
  }

  /**
   * Applies the control configuration to a set using keys from DEFAULT_CONTROLS.
   */
  private static applyControlOverrides(
    controls: Record<string, Control | undefined>
  ): void {
    Object.entries(DEFAULT_CONTROLS).forEach(([key, cfg]) => {
      const control = controls[key]
      if (!control) return

      Object.assign(control, cfg)

      if (key !== 'mtr') return

      // Use the grab cursor for the rotation button
      control.cursorStyle = 'grab'
      control.mouseDownHandler = (_eventData, transform, _x, _y) => {
        const target = transform?.target

        if (!target || target.locked || target.lockRotation) {
          return
        }

        // Use the grabbing cursor while actually rotating
        target.canvas?.setCursor('grabbing')
      }
    })
  }

  /**
   * Registers controls and selection behavior settings.
   */
  public static apply(): void {
    const objectControls = controlsUtils.createObjectDefaultControls()
    ControlsCustomizer.applyControlOverrides(objectControls)
    InteractiveFabricObject.ownDefaults.controls = objectControls

    const textboxControls = controlsUtils.createTextboxDefaultControls()
    ControlsCustomizer.applyControlOverrides(textboxControls)
    if (textboxControls.mt) {
      textboxControls.mt.visible = false
    }
    if (textboxControls.mb) {
      textboxControls.mb.visible = false
    }
    ControlsCustomizer.wrapWidthControl(textboxControls.ml)
    ControlsCustomizer.wrapWidthControl(textboxControls.mr)
    Textbox.ownDefaults.controls = textboxControls

    ControlsCustomizer.patchActiveSelectionBounds()

    // Set snapAngle for all objects
    // This restricts rotation angles to whole degrees (a minimum of 1°)
    InteractiveFabricObject.ownDefaults.snapAngle = 1
  }

  /**
   * Updates the ActiveSelection bounds calculation to account for text object backgrounds and padding.
   */
  private static patchActiveSelectionBounds(): void {
    const activeSelectionPrototype = ActiveSelection.prototype as ActiveSelectionPrototype
    const originalCalc = activeSelectionPrototype._calcBoundsFromObjects

    activeSelectionPrototype._calcBoundsFromObjects = function(this: ActiveSelection, ...args: unknown[]) {
      const objects = this.getObjects?.() ?? []
      ControlsCustomizer.applyActiveSelectionScalingRules({
        selection: this,
        objects
      })
      const bounds = ControlsCustomizer.calculateActiveSelectionBounds({
        objects
      })
      if (!bounds) {
        return originalCalc ? originalCalc.apply(this, args) : undefined
      }

      const { left, top, width, height } = bounds
      this.set({
        flipX: false,
        flipY: false,
        width,
        height
      })

      const center = new Point(left + (width / 2), top + (height / 2))
      this.setPositionByOrigin(center, 'center', 'center')

      return bounds
    }

    const originalAfterChange = activeSelectionPrototype._onAfterObjectsChange
    activeSelectionPrototype._onAfterObjectsChange = function(this: ActiveSelection, type: unknown, options: unknown) {
      const result = originalAfterChange ? originalAfterChange.call(this, type, options) : undefined
      const objects = this.getObjects?.() ?? []
      ControlsCustomizer.applyActiveSelectionScalingRules({
        selection: this,
        objects
      })
      const bounds = ControlsCustomizer.calculateActiveSelectionBounds({
        objects
      })
      if (!bounds) return result

      const { left, top, width, height } = bounds
      const center = new Point(left + (width / 2), top + (height / 2))

      this.set({
        width,
        height
      })
      this.setPositionByOrigin(center, 'center', 'center')
      this.setCoords()

      return result
    }

    const originalCalcBoundingBox = FitContentLayout.prototype.calcBoundingBox
    FitContentLayout.prototype.calcBoundingBox = function(
      this: FitContentLayout,
      objects: FabricObject[],
      context: StrictLayoutContext
    ) {
      const { target, type } = context
      if (type === 'imperative' && context.overrides) {
        return context.overrides
      }

      if (!(target instanceof ActiveSelection)) {
        return originalCalcBoundingBox.call(this, objects, context)
      }

      ControlsCustomizer.applyActiveSelectionScalingRules({
        selection: target,
        objects
      })
      const bounds = ControlsCustomizer.calculateActiveSelectionBounds({ objects })
      if (!bounds) {
        return originalCalcBoundingBox.call(this, objects, context)
      }

      const { left, top, width, height } = bounds
      const size = new Point(width, height)
      const center = new Point(left + (width / 2), top + (height / 2))

      if (type === 'initialization') {
        return {
          center,
          relativeCorrection: new Point(0, 0),
          size
        }
      }

      return {
        center,
        size
      }
    }
  }

  /**
   * Calculates selection dimensions from the objects' actual bounding boxes, including backgrounds and padding.
   */
  private static calculateActiveSelectionBounds(
    {
      objects
    }: {
      objects: FabricObject[]
    }
  ): BoundingBox | null {
    if (!objects.length) return null

    const rects = objects.map((object) => object.getBoundingRect())
    const minLeft = Math.min(...rects.map(({ left }) => left))
    const minTop = Math.min(...rects.map(({ top }) => top))
    const maxRight = Math.max(...rects.map(({ left, width }) => left + width))
    const maxBottom = Math.max(...rects.map(({ top, height }) => top + height))

    return {
      height: maxBottom - minTop,
      left: minLeft,
      top: minTop,
      width: maxRight - minLeft
    }
  }

  /**
   * Applies ActiveSelection scaling constraints and controls for objects with their own text/layout contract.
   */
  private static applyActiveSelectionScalingRules(
    {
      selection,
      objects
    }: {
      selection: ActiveSelection
      objects: FabricObject[]
    }
  ): void {
    const hasText = objects.some((object) => object instanceof Textbox)
    const hasShape = objects.some((object) => object.shapeComposite === true)
    const shouldLockScalingFlip = hasText || hasShape

    selection.set({
      lockScalingFlip: shouldLockScalingFlip
    })

    if (hasShape) {
      applyShapeCornerFreeScaleControls({
        target: selection
      })
    }

    // Hide vertical handles for text objects, but retain horizontal scaling:
    // TextManager handles width changes correctly.
    selection.setControlsVisibility({
      mt: !hasText,
      mb: !hasText,
      ml: true,
      mr: true
    })
  }
}
