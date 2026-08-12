import { test, expect } from '../../../fixtures/editor.fixture'
import {
  createTextWidthResizeSetup,
  type TextWidthResizeSetup
} from '../../../fixtures/text-width-resizing.fixture'

/** Поля геометрии, которые должны восстанавливаться вместе с шириной текста. */
const TEXT_RESIZE_HISTORY_FIELDS = [
  'width',
  'height',
  'boundsLeft',
  'boundsTop',
  'boundsRight',
  'boundsBottom'
] as const

test('при приближении к границе рабочей области текст прилипает до её пересечения', async({
  editorModel,
  snapping,
  text
}) => {
  const montage = await editorModel.getMontageAreaBounds()
  const textId = 'montage-boundary-text'
  const created = await text.add({
    id: textId,
    text: 'Граница',
    left: montage.right - 100,
    top: montage.top + 180,
    width: 120,
    fontSize: 24,
    autoExpand: false
  })
  text.checkCreation({ textObject: created })

  const initial = await text.getResizeSnapshot({ id: textId })
  const rawRight = montage.right - 2
  const requestedWidth = initial.width + rawRight - initial.boundsRight

  expect(rawRight).toBeLessThan(montage.right)
  expect(montage.right - rawRight).toBe(2)

  const live = await text.resizeFromRightToWidth({ id: textId, width: requestedWidth })
  const liveGuides = await snapping.getGuideState()

  expect(live.boundsRight).toBeCloseTo(montage.right, 5)
  expect(live.boundsLeft).toBeCloseTo(initial.boundsLeft, 5)
  expect(liveGuides.guides).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: 'vertical', position: montage.right })
  ]))

  const committed = await text.finishResize({ id: textId })
  const clearedGuides = await snapping.getGuideState()

  expect(committed).toEqual(live)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test.describe('восстановление и копирование текста', () => {
  let setup: TextWidthResizeSetup

  test.beforeEach(async({
    editorModel,
    history,
    shapes,
    snapping,
    text
  }) => {
    setup = await createTextWidthResizeSetup({
      angle: 30,
      axis: 'x',
      editorModel,
      shapes,
      side: 'right',
      snapping,
      text
    })

    const pendingSaveFlushed = await history.flushPendingSave()

    expect(pendingSaveFlushed, 'подготовка не должна оставлять отложенное сохранение').toBe(false)
    expect(setup.textId).toBeTruthy()
  })

  test('одно изменение ширины создаёт одну запись в истории и повторяется после undo/redo', async({
    history,
    snapping,
    text
  }) => {
    const historyBefore = await history.getPosition()
    const live = await text.resizeSideToGuide({
      axis: 'x',
      position: setup.guidePosition,
      side: 'right',
      id: setup.textId
    })
    const liveGuides = await snapping.getGuideState()

    expect(live[setup.movingEdge]).toBeCloseTo(setup.guidePosition, 5)
    expect(liveGuides.guides).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'vertical', position: setup.guidePosition })
    ]))

    const committed = await text.finishResize({ id: setup.textId })
    const historySaved = await history.flushPendingSave()
    const historyAfter = await history.getPosition()

    expect(historySaved, 'object:modified должен сохранить завершённое изменение ширины').toBe(true)
    expect(committed).toEqual(live)
    expect(historyAfter.patchCount).toBe(historyBefore.patchCount + 1)
    expect(historyAfter.currentIndex).toBe(historyBefore.currentIndex + 1)

    await history.undo()
    const restored = await text.getResizeSnapshot({ id: setup.textId })

    for (const field of TEXT_RESIZE_HISTORY_FIELDS) {
      expect(restored[field], `undo должен восстановить ${field}`).toBeCloseTo(setup.initial[field], 4)
    }

    await history.redo()
    const redone = await text.getResizeSnapshot({ id: setup.textId })

    for (const field of TEXT_RESIZE_HISTORY_FIELDS) {
      expect(redone[field], `redo должен восстановить ${field}`).toBeCloseTo(committed[field], 3)
    }

    const restoredReference = await snapping.getObjectSnapshot({ id: setup.referenceId })
    const repeated = await text.resizeSideToGuide({
      axis: 'x',
      position: restoredReference.boundsRight,
      side: 'right',
      id: setup.textId
    })
    const repeatedGuides = await snapping.getGuideState()

    expect(repeated.boundsRight).toBeCloseTo(restoredReference.boundsRight, 5)
    expect(repeatedGuides.guides).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'vertical', position: restoredReference.boundsRight })
    ]))

    await text.finishResize({ id: setup.textId })
  })

  test('новое изменение ширины не наследует удержание предыдущего жеста', async({
    shapes,
    snapping,
    text
  }) => {
    const firstSnap = await text.resizeSideToGuide({
      axis: 'x',
      position: setup.guidePosition,
      side: 'right',
      id: setup.textId
    })
    const firstGuideState = await snapping.getGuideState()

    expect(firstSnap.boundsRight).toBeCloseTo(setup.guidePosition, 5)
    expect(firstGuideState.guides).toHaveLength(1)

    const committed = await text.finishResize({ id: setup.textId })
    const referenceRemoved = await shapes.remove({ id: setup.referenceId })
    const clearedGuideState = await snapping.getGuideState()

    expect(committed).toEqual(firstSnap)
    expect(referenceRemoved).toBe(true)
    expect(clearedGuideState.guides).toHaveLength(0)
    expect(clearedGuideState.spacingGuides).toHaveLength(0)

    const requestedWidth = committed.width + 3
    const freshGesture = await text.resizeFromRightToWidth({
      id: setup.textId,
      width: requestedWidth
    })
    const freshGuideState = await snapping.getGuideState()

    expect(Math.abs(freshGesture.width - committed.width)).toBeGreaterThan(1)
    expect(Math.abs(freshGesture.boundsRight - committed.boundsRight)).toBeGreaterThan(1)
    expect(freshGuideState.guides).toHaveLength(0)
    expect(freshGuideState.spacingGuides).toHaveLength(0)

    const finished = await text.finishResize({ id: setup.textId })

    expect(finished).toEqual(freshGesture)
    expect((await snapping.getGuideState()).guides).toHaveLength(0)
  })

  test('вставленный из буфера текст прилипает при изменении ширины', async({
    clipboard,
    editorModel,
    snapping,
    text
  }) => {
    const selected = await text.select({ id: setup.textId })

    expect(selected?.id).toBe(setup.textId)
    expect(selected?.type).toBe('background-textbox')

    await clipboard.copy()
    await clipboard.waitForClipboardReady()
    const pasted = await clipboard.paste()
    const copiedText = await editorModel.getActiveObject()

    expect(pasted).toBe(true)
    expect(copiedText?.type).toBe('background-textbox')
    expect(typeof copiedText?.id).toBe('string')
    if (typeof copiedText?.id !== 'string') {
      throw new Error('после вставки скопированный текст должен быть активен')
    }

    const live = await text.resizeSideToGuide({
      axis: 'x',
      position: setup.guidePosition,
      side: 'right',
      id: copiedText.id
    })
    const guideState = await snapping.getGuideState()

    expect(live.boundsRight).toBeCloseTo(setup.guidePosition, 5)
    expect(guideState.guides).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'vertical', position: setup.guidePosition })
    ]))

    const committed = await text.finishResize({ id: copiedText.id })
    const clearedGuides = await snapping.getGuideState()

    expect(committed).toEqual(live)
    expect(clearedGuides.guides).toHaveLength(0)
    expect(clearedGuides.spacingGuides).toHaveLength(0)
  })
})
