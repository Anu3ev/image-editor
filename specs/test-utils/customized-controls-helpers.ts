import {
  ActiveSelection,
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
type ActiveSelectionObjectKind = 'object' | 'shape' | 'text'
type ActiveSelectionScalingRulesSelection = ActiveSelection & {
  lockScalingFlip?: boolean
  setControlsVisibility: jest.Mock
  setCoords: jest.Mock
  setPositionByOrigin: jest.Mock
  _calcBoundsFromObjects?: () => unknown
}

export type ControlsCustomizerTestSetup = {
  objectRotateControl: RotateControl
}

export type ActiveSelectionScalingRulesTestSetup = {
  selection: ActiveSelectionScalingRulesSelection
  recalculateBounds: () => void
}

const createControlCollection = (): ControlCollection => ({
  tl: new Control() as RotateControl,
  tr: new Control() as RotateControl,
  bl: new Control() as RotateControl,
  br: new Control() as RotateControl,
  ml: new Control({
    actionHandler: jest.fn(() => true)
  }) as RotateControl,
  mr: new Control({
    actionHandler: jest.fn(() => true)
  }) as RotateControl,
  mt: new Control() as RotateControl,
  mb: new Control() as RotateControl,
  mtr: new Control() as RotateControl
})

const createBoundingObject = ({
  left,
  shapeComposite = false
}: {
  left: number
  shapeComposite?: boolean
}) => ({
  shapeComposite,
  getBoundingRect: jest.fn(() => ({
    left,
    top: 0,
    width: 100,
    height: 50
  }))
})

const createActiveSelectionObject = ({
  kind,
  index
}: {
  kind: ActiveSelectionObjectKind
  index: number
}) => {
  const left = index * 120

  return kind === 'text'
    ? new Textbox('Text', {
      left,
      top: 0,
      width: 100,
      height: 50
    })
    : createBoundingObject({
      left,
      shapeComposite: kind === 'shape'
    })
}

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

/**
 * Создаёт ActiveSelection и запускает кастомный пересчёт его границ.
 */
export const createActiveSelectionScalingRulesTestSetup = ({
  objectKinds
}: {
  objectKinds: ActiveSelectionObjectKind[]
}): ActiveSelectionScalingRulesTestSetup => {
  createControlsCustomizerTestSetup()

  const objects = objectKinds.map((kind, index) => createActiveSelectionObject({
    kind,
    index
  }))
  const selection = new ActiveSelection(objects as never[], {}) as ActiveSelectionScalingRulesSelection

  selection.setControlsVisibility = jest.fn()
  selection.setCoords = jest.fn()
  selection.setPositionByOrigin = jest.fn()

  return {
    selection,
    recalculateBounds: () => {
      selection._calcBoundsFromObjects?.()
    }
  }
}
