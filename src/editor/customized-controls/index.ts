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
 * Класс для настройки пользовательских контролов в редакторе
 */
export default class ControlsCustomizer {
  /**
   * Отключает изменение ширины по оси X для заблокированных объектов, сохраняя поведение остального хэндлера.
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
   * Применяет конфигурацию контролов к набору по ключам из DEFAULT_CONTROLS.
   */
  private static applyControlOverrides(
    controls: Record<string, Control | undefined>
  ): void {
    Object.entries(DEFAULT_CONTROLS).forEach(([key, cfg]) => {
      const control = controls[key]
      if (!control) return

      Object.assign(control, cfg)

      if (key !== 'mtr') return

      // Для кнопки вращения ставим курсор grab
      control.cursorStyle = 'grab'
      control.mouseDownHandler = (_eventData, transform, _x, _y) => {
        const obj = transform?.target
        // Во время вращения ставим курсор grabbing
        obj?.canvas?.setCursor('grabbing')
      }
    })
  }

  /**
   * Регистрирует контролы и настройки поведения выделений.
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

    // Устанавливаем snapAngle для всех объектов
    // Это заставляет угол поворота изменяться только на целые градусы (минимум 1°)
    InteractiveFabricObject.ownDefaults.snapAngle = 1
  }

  /**
   * Обновляет алгоритм расчёта границ ActiveSelection, чтобы учитывать фон и отступы текстовых объектов.
   */
  private static patchActiveSelectionBounds(): void {
    const activeSelectionPrototype = ActiveSelection.prototype as ActiveSelectionPrototype
    const originalCalc = activeSelectionPrototype._calcBoundsFromObjects

    activeSelectionPrototype._calcBoundsFromObjects = function(this: ActiveSelection, ...args: unknown[]) {
      const objects = this.getObjects?.() ?? []
      ControlsCustomizer.applyTextSelectionScalingLock({
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
      ControlsCustomizer.applyTextSelectionScalingLock({
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
      const { target, type, overrides } = context
      if (type === 'imperative' && overrides) {
        return overrides
      }

      if (!(target instanceof ActiveSelection)) {
        return originalCalcBoundingBox.call(this, objects, context)
      }

      ControlsCustomizer.applyTextSelectionScalingLock({
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
   * Считает габариты выделения на основе реальных bounding-box объектов, включая фон и отступы.
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
   * Блокирует горизонтальное масштабирование ActiveSelection, если в выделении есть текстовые объекты.
   */
  private static applyTextSelectionScalingLock(
    {
      selection,
      objects
    }: {
      selection: ActiveSelection
      objects: FabricObject[]
    }
  ): void {
    const hasText = objects.some((object) => object instanceof Textbox)
    const isMultiSelection = selection instanceof ActiveSelection && objects.length > 1
    const lockHorizontal = hasText && isMultiSelection

    selection.setControlsVisibility({
      mt: !hasText,
      mb: !hasText,
      ml: !lockHorizontal,
      mr: !lockHorizontal
    })
  }
}
