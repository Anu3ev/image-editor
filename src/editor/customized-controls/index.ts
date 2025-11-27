import { Control, InteractiveFabricObject, Textbox, controlsUtils } from 'fabric'
import { DEFAULT_CONTROLS } from './default-controls'

/**
 * Класс для настройки пользовательских контролов в редакторе
 */
export default class ControlsCustomizer {
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

    // Устанавливаем snapAngle для всех объектов
    // Это заставляет угол поворота изменяться только на целые градусы (минимум 1°)
    InteractiveFabricObject.ownDefaults.snapAngle = 1
  }
}
