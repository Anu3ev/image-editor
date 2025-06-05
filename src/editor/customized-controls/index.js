import { InteractiveFabricObject, controlsUtils } from 'fabric'
import { DEFAULT_CONTROLS } from './default-controls'

export default class ControlsCustomizer {
  static apply() {
    const ctrls = controlsUtils.createObjectDefaultControls()

    Object.entries(DEFAULT_CONTROLS).forEach(([key, cfg]) => {
      Object.assign(ctrls[key], {
        render: cfg.render,
        sizeX: cfg.sizeX,
        sizeY: cfg.sizeY,
        offsetX: cfg.offsetX,
        offsetY: cfg.offsetY
      })

      if (key !== 'mtr') return

      // Для кнопки вращения ставим курсор grab
      ctrls[key].cursorStyle = 'grab'
      ctrls[key].mouseDownHandler = (eventData, transform, x, y) => {
        const obj = transform.target
        // Во время вращения ставим курсор grabbing
        obj.canvas.setCursor('grabbing')
      }
    })

    InteractiveFabricObject.ownDefaults.controls = ctrls
  }
}
