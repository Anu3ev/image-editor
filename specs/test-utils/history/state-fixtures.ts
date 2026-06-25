import type HistoryManager from '../../../src/editor/history-manager'
import type {
  CanvasFullState,
  CanvasStateObject
} from '../../../src/editor/history-manager/types'

/**
 * Параметры canvas-состояния с одной монтажной областью.
 */
type MontageAreaHistoryStateParams = {
  canvasWidth: number
  canvasHeight: number
  montageArea: CanvasStateObject
}

/**
 * Параметры последовательности, где один объект меняет координату left.
 */
type ObjectLeftHistoryStatesParams = {
  id?: string
  leftValues: number[]
}

/**
 * Параметры состояния со сдвигом сцены.
 */
type SceneTranslationHistoryStateParams = {
  clipLeft: number
  clipTop: number
  objectLeft: number
  objectTop: number
}

/**
 * Параметры serialized-состояния с lock-флагами textbox.
 */
type TextboxLockHistoryStateParams = {
  id: string
  lockMovementX: boolean
  lockMovementY: boolean
}

/**
 * Runtime-объект textbox для проверки lockMovement-снимка.
 */
type TextboxLockRuntimeObject = CanvasStateObject & {
  id: string
  locked: boolean
  lockMovementX: boolean
  lockMovementY: boolean
}

/**
 * Функция установки runtime-объектов canvas в history-manager specs.
 */
type SetCanvasObjects = (objects: CanvasStateObject[]) => void

/**
 * Параметры установки textbox runtime-состояния.
 */
type SetTextboxStateParams = {
  setCanvasObjects: SetCanvasObjects
  text: string
  locked?: boolean
}

/**
 * Параметры постановки pending save после редактирования textbox.
 */
type StageTextboxEditParams = {
  historyManager: HistoryManager
  setCanvasObjects: SetCanvasObjects
  text: string
  locked?: boolean
}

/**
 * Параметры старта history-сценария редактирования textbox.
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
 * Параметры сохранения последовательности serialized-состояний через HistoryManager.
 */
type SaveHistoryStatesParams = {
  historyManager: HistoryManager
  mockCanvas: {
    toDatalessObject: jest.Mock
  }
  states: CanvasFullState[]
}

/**
 * Параметры сохранения lock-снимка textbox.
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
 * Параметры подготовки трёх history-шагов с движением объекта по left.
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
 * Создаёт состояние canvas для history-manager specs.
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
 * Создаёт состояние canvas с одной монтажной областью.
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
 * Создаёт последовательность состояний, где один объект меняет координату left.
 */
export const createObjectLeftHistoryStates = ({
  id = 'object-1',
  leftValues
}: ObjectLeftHistoryStatesParams): CanvasFullState[] => leftValues.map((left) => createHistoryState({
  objects: [{ id, left }]
}))

/**
 * Создаёт пару состояний: пустую историю и историю с одним объектом.
 */
export const createObjectPresenceHistoryStates = (id = 'obj-1'): [CanvasFullState, CanvasFullState] => [
  createHistoryState(),
  createHistoryState({
    objects: [{ id }]
  })
]

/**
 * Создаёт состояние со сдвигом сцены, монтажной областью и одним пользовательским объектом.
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
 * Создаёт serialized-состояние textbox с текущими lockMovement flags.
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
 * Устанавливает один textbox как текущее runtime-состояние canvas.
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
 * Устанавливает отредактированный textbox и ставит text-edit save в pending.
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
 * Сохраняет исходный textbox и ставит отредактированный текст в pending save.
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
 * Сохраняет последовательность serialized-состояний через публичный путь saveState.
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
 * Сохраняет textbox lock snapshot и возвращает serialized textbox из baseState.
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
 * Сохраняет три history-шага и подготавливает serialized-состояния для последующих undo/redo.
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
