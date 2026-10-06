import type HistoryManager from '../../../src/editor/history-manager'
import type {
  CanvasFullState,
  CanvasStateObject
} from '../../../src/editor/history-manager/types'

/**
 * Canvas state parameters with a single artboard.
 */
type MontageAreaHistoryStateParams = {
  canvasWidth: number
  canvasHeight: number
  montageArea: CanvasStateObject
}

/**
 * Parameters for a sequence in which one object changes its left coordinate.
 */
type ObjectLeftHistoryStatesParams = {
  id?: string
  leftValues: number[]
}

/**
 * Parameters for a state with a shifted scene.
 */
type SceneTranslationHistoryStateParams = {
  clipLeft: number
  clipTop: number
  objectLeft: number
  objectTop: number
}

/**
 * Serialized-state parameters with textbox lock flags.
 */
type TextboxLockHistoryStateParams = {
  id: string
  lockMovementX: boolean
  lockMovementY: boolean
}

/**
 * Runtime textbox object for testing a lockMovement snapshot.
 */
type TextboxLockRuntimeObject = CanvasStateObject & {
  id: string
  locked: boolean
  lockMovementX: boolean
  lockMovementY: boolean
}

/**
 * Function for setting runtime canvas objects in history-manager specs.
 */
type SetCanvasObjects = (objects: CanvasStateObject[]) => void

/**
 * Parameters for setting the textbox runtime state.
 */
type SetTextboxStateParams = {
  setCanvasObjects: SetCanvasObjects
  text: string
  locked?: boolean
}

/**
 * Parameters for queuing a pending save after editing a textbox.
 */
type StageTextboxEditParams = {
  historyManager: HistoryManager
  setCanvasObjects: SetCanvasObjects
  text: string
  locked?: boolean
}

/**
 * Parameters for starting a textbox-editing history scenario.
 */
type StartTextboxEditHistoryParams = {
  historyManager: HistoryManager
  setCanvasObjects: SetCanvasObjects
  textManager: {
    isTextEditingActive: boolean
  }
  initialText: string
  editedText: string
  locked?: boolean
}

/**
 * Parameters for saving a sequence of serialized states through HistoryManager.
 */
type SaveHistoryStatesParams = {
  historyManager: HistoryManager
  mockCanvas: {
    toDatalessObject: jest.Mock
  }
  states: CanvasFullState[]
}

/**
 * Parameters for saving a textbox lock snapshot.
 */
type SaveTextboxLockStateParams = {
  historyManager: HistoryManager
  mockCanvas: {
    toDatalessObject: jest.Mock
  }
  setCanvasObjects: SetCanvasObjects
  textbox: TextboxLockRuntimeObject
}

/**
 * Parameters for preparing three history steps with an object moving along left.
 */
type SaveThreeObjectLeftHistoryStepsParams = {
  historyManager: HistoryManager
  mockCanvas: {
    toDatalessObject: jest.Mock
  }
  id?: string
  leftValues: [number, number, number]
}

/**
 * Creates a canvas state for history-manager specs.
 */
export const createHistoryState = (overrides: Partial<CanvasFullState> = {}): CanvasFullState => ({
  clipPath: null,
  width: 800,
  height: 600,
  version: '5.0.0',
  objects: [],
  ...overrides
})

/**
 * Creates a canvas state with a single artboard.
 */
export const createMontageAreaHistoryState = ({
  canvasWidth,
  canvasHeight,
  montageArea
}: MontageAreaHistoryStateParams): CanvasFullState => createHistoryState({
  width: canvasWidth,
  height: canvasHeight,
  objects: [montageArea]
})

/**
 * Creates a sequence of states in which one object changes its left coordinate.
 */
export const createObjectLeftHistoryStates = ({
  id = 'object-1',
  leftValues
}: ObjectLeftHistoryStatesParams): CanvasFullState[] => leftValues.map((left) => createHistoryState({
  objects: [{ id, left }]
}))

/**
 * Creates a pair of states: empty history and history containing one object.
 */
export const createObjectPresenceHistoryStates = (id = 'obj-1'): [CanvasFullState, CanvasFullState] => [
  createHistoryState(),
  createHistoryState({
    objects: [{ id }]
  })
]

/**
 * Creates a state with a shifted scene, an artboard, and one user object.
 */
export const createSceneTranslationHistoryState = ({
  clipLeft,
  clipTop,
  objectLeft,
  objectTop
}: SceneTranslationHistoryStateParams): CanvasFullState => createHistoryState({
  clipPath: {
    left: clipLeft,
    top: clipTop
  },
  objects: [
    {
      id: 'montage-area',
      type: 'rect',
      width: 400,
      height: 300,
      left: clipLeft,
      top: clipTop
    },
    {
      id: 'object-1',
      left: objectLeft,
      top: objectTop
    }
  ]
})

/**
 * Creates a serialized textbox state with the current lockMovement flags.
 */
export const createTextboxLockHistoryState = ({
  id,
  lockMovementX,
  lockMovementY
}: TextboxLockHistoryStateParams): CanvasFullState => createHistoryState({
  objects: [{
    id,
    type: 'textbox',
    lockMovementX,
    lockMovementY
  }]
})

/**
 * Sets a single textbox as the canvas's current runtime state.
 */
export const setTextboxState = ({
  setCanvasObjects,
  text,
  locked
}: SetTextboxStateParams): void => {
  const textbox: CanvasStateObject = {
    id: 'text-1',
    type: 'textbox',
    text
  }

  if (locked !== undefined) {
    textbox.locked = locked
  }

  setCanvasObjects([textbox])
}

/**
 * Sets the edited textbox and queues a pending text-edit save.
 */
const stageTextboxEdit = ({
  historyManager,
  setCanvasObjects,
  text,
  locked
}: StageTextboxEditParams): void => {
  setTextboxState({
    setCanvasObjects,
    text,
    locked
  })

  historyManager.stageCurrentStateForPendingSave({ reason: 'text-edit' })
  historyManager.scheduleSaveState({
    delayMs: 100,
    reason: 'text-edit'
  })
}

/**
 * Saves the original textbox and queues a pending save for the edited text.
 */
export const startTextboxEditHistory = ({
  historyManager,
  setCanvasObjects,
  textManager,
  initialText,
  editedText,
  locked
}: StartTextboxEditHistoryParams): void => {
  textManager.isTextEditingActive = true

  setTextboxState({
    setCanvasObjects,
    text: initialText,
    locked
  })
  historyManager.saveState()

  stageTextboxEdit({
    historyManager,
    setCanvasObjects,
    text: editedText,
    locked
  })
}

/**
 * Saves a sequence of serialized states through the public saveState path.
 */
export const saveHistoryStates = ({
  historyManager,
  mockCanvas,
  states
}: SaveHistoryStatesParams): void => {
  for (const state of states) {
    mockCanvas.toDatalessObject.mockReturnValueOnce(state)
  }

  for (let index = 0; index < states.length; index += 1) {
    historyManager.saveState()
  }
}

/**
 * Saves a textbox lock snapshot and returns the serialized textbox from baseState.
 */
export const saveTextboxLockState = ({
  historyManager,
  mockCanvas,
  setCanvasObjects,
  textbox
}: SaveTextboxLockStateParams): CanvasStateObject => {
  setCanvasObjects([textbox])

  mockCanvas.toDatalessObject.mockImplementation(() => createTextboxLockHistoryState({
    id: textbox.id,
    lockMovementX: textbox.lockMovementX,
    lockMovementY: textbox.lockMovementY
  }))

  historyManager.saveState()

  const savedTextbox = historyManager.baseState?.objects?.[0]
  if (!savedTextbox) {
    throw new Error('Textbox должен быть сохранён в baseState')
  }

  return savedTextbox
}

/**
 * Saves three history steps and prepares serialized states for subsequent undo/redo.
 */
export const saveThreeObjectLeftHistorySteps = ({
  historyManager,
  mockCanvas,
  id = 'obj-1',
  leftValues
}: SaveThreeObjectLeftHistoryStepsParams): void => {
  const [state1, state2, state3] = createObjectLeftHistoryStates({
    id,
    leftValues
  })

  saveHistoryStates({
    historyManager,
    mockCanvas,
    states: [state1, state2, state3]
  })

  mockCanvas.toDatalessObject
    .mockReturnValueOnce(state3)
    .mockReturnValueOnce(state2)
    .mockReturnValueOnce(state1)
    .mockReturnValueOnce(state2)
}
