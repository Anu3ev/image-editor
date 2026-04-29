import {
  createActiveSelectionScalingRulesTestSetup,
  createControlsCustomizerTestSetup
} from '../../../test-utils/customized-controls-helpers'

describe('customized-controls', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ставит grabbing на rotate mouseDown для объекта с доступным вращением', () => {
    const {
      objectRotateControl
    } = createControlsCustomizerTestSetup()
    const setCursor = jest.fn()
    const target = {
      locked: false,
      lockRotation: false,
      canvas: {
        setCursor
      }
    }

    expect(objectRotateControl.cursorStyle).toBe('grab')
    expect(objectRotateControl.mouseDownHandler).toBeDefined()

    objectRotateControl.mouseDownHandler?.({}, {
      target
    }, 0, 0)

    expect(setCursor).toHaveBeenCalledWith('grabbing')
  })

  it('не ставит grabbing на rotate mouseDown для заблокированного объекта', () => {
    const {
      objectRotateControl
    } = createControlsCustomizerTestSetup()
    const setCursor = jest.fn()
    const target = {
      locked: true,
      lockRotation: false,
      canvas: {
        setCursor
      }
    }

    objectRotateControl.mouseDownHandler?.({}, {
      target
    }, 0, 0)

    expect(setCursor).not.toHaveBeenCalled()
  })

  it('не ставит grabbing на rotate mouseDown для объекта с lockRotation', () => {
    const {
      objectRotateControl
    } = createControlsCustomizerTestSetup()
    const setCursor = jest.fn()
    const target = {
      locked: false,
      lockRotation: true,
      canvas: {
        setCursor
      }
    }

    objectRotateControl.mouseDownHandler?.({}, {
      target
    }, 0, 0)

    expect(setCursor).not.toHaveBeenCalled()
  })

  it('выделение с текстом нельзя перевернуть при масштабировании', () => {
    const {
      selection,
      recalculateBounds
    } = createActiveSelectionScalingRulesTestSetup({
      objectKinds: ['text']
    })

    recalculateBounds()

    expect(selection.lockScalingFlip).toBe(true)
    expect(selection.setControlsVisibility).toHaveBeenCalledWith({
      mt: false,
      mb: false,
      ml: true,
      mr: true
    })
  })

  it('выделение с шейпом нельзя перевернуть при масштабировании', () => {
    const {
      selection,
      recalculateBounds
    } = createActiveSelectionScalingRulesTestSetup({
      objectKinds: ['shape']
    })

    recalculateBounds()

    expect(selection.lockScalingFlip).toBe(true)
    expect(selection.setControlsVisibility).toHaveBeenCalledWith({
      mt: true,
      mb: true,
      ml: true,
      mr: true
    })
  })

  it('выделение обычных объектов не блокирует flip', () => {
    const {
      selection,
      recalculateBounds
    } = createActiveSelectionScalingRulesTestSetup({
      objectKinds: ['object']
    })

    recalculateBounds()

    expect(selection.lockScalingFlip).toBe(false)
    expect(selection.setControlsVisibility).toHaveBeenCalledWith({
      mt: true,
      mb: true,
      ml: true,
      mr: true
    })
  })
})
