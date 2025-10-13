import { InteractiveFabricObject, controlsUtils } from 'fabric'
import { DEFAULT_CONTROLS } from './default-controls'

/**
 * Класс для настройки пользовательских контролов в редакторе
 */
export default class ControlsCustomizer {
  public static apply(): void {
    const ctrls = controlsUtils.createObjectDefaultControls()

    type ControlKey = keyof typeof ctrls;
    Object.entries(DEFAULT_CONTROLS).forEach(([key, cfg]) => {
      const ctrlKey = key as ControlKey
      Object.assign(ctrls[ctrlKey], {
        render: cfg.render,
        sizeX: cfg.sizeX,
        sizeY: cfg.sizeY,
        offsetX: cfg.offsetX,
        offsetY: cfg.offsetY
      })

      if (key !== 'mtr') return

      // Для кнопки вращения ставим курсор grab
      ctrls[key].cursorStyle = 'grab'
      ctrls[key].mouseDownHandler = (eventData, transform, _x, _y) => {
        const obj = transform.target
        // Во время вращения ставим курсор grabbing
        obj.canvas?.setCursor('grabbing')
      }
    })

    InteractiveFabricObject.ownDefaults.controls = ctrls

    // Устанавливаем snapAngle для всех объектов
    // Это заставляет угол поворота изменяться только на целые градусы (минимум 1°)
    // Решает проблему отображения 0° при минимальных поворотах
    InteractiveFabricObject.ownDefaults.snapAngle = 1
  }
}
