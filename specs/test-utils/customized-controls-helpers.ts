import {
  Control,
  InteractiveFabricObject,
  Textbox,
  controlsUtils
} from 'fabric'
import ControlsCustomizer from '../../src/editor/customized-controls'

type RotateControl = Control & {
  cursorStyle?: string
  mouseDownHandler?: (...args: unknown[]) => void
}

type ControlCollection = Record<string, RotateControl>

export type ControlsCustomizerTestSetup = {
  objectRotateControl: RotateControl
}

const createControlCollection = (): ControlCollection => ({
  tl: new Control(),
  tr: new Control(),
  bl: new Control(),
  br: new Control(),
  ml: new Control({
    actionHandler: jest.fn(() => true)
  }) as RotateControl,
  mr: new Control({
    actionHandler: jest.fn(() => true)
  }) as RotateControl,
  mt: new Control(),
  mb: new Control(),
  mtr: new Control() as RotateControl
})

/**
 * Регистрирует отдельный набор object/textbox controls и применяет кастомизацию редактора.
 */
export const createControlsCustomizerTestSetup = (): ControlsCustomizerTestSetup => {
  const objectControls = createControlCollection()
  const textboxControls = createControlCollection()
  const createObjectDefaultControlsMock = controlsUtils.createObjectDefaultControls as jest.Mock
  const createTextboxDefaultControlsMock = controlsUtils.createTextboxDefaultControls as jest.Mock

  InteractiveFabricObject.ownDefaults = {}
  Textbox.ownDefaults = {}
  createObjectDefaultControlsMock.mockReturnValue(objectControls)
  createTextboxDefaultControlsMock.mockReturnValue(textboxControls)

  ControlsCustomizer.apply()

  return {
    objectRotateControl: objectControls.mtr
  }
}
