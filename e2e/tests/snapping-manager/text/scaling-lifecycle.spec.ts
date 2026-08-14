import { test, expect } from '../../../fixtures/editor.fixture'
import {
  TEXT_CORNER_SCALE_GROWING_FIELDS,
  TEXT_CORNER_SCALE_GUIDE_TOLERANCE,
  TEXT_CORNER_SCALE_TARGET_MULTIPLIER,
  TEXT_TOP_RIGHT_SCALING_REGRESSION_TEMPLATE
} from '../../../fixtures/data/text-resizing.data'
import {
  createScaledTextCornerTemplateSetup,
  createTextCornerScaleReferenceSetup,
  createTextCornerScaleSetup
} from '../../../fixtures/text-corner-scaling.fixture'

/** Каноническая геометрия текста, которая должна восстанавливаться через history. */
const TEXT_CORNER_SCALE_HISTORY_FIELDS = [
  'left',
  'top',
  'width',
  'height',
  'fontSize',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'radiusTopLeft',
  'radiusTopRight',
  'radiusBottomRight',
  'radiusBottomLeft',
  'boundsLeft',
  'boundsTop',
  'boundsRight',
  'boundsBottom',
  'scaleX',
  'scaleY'
] as const

test('одно завершённое увеличение текста создаёт одну запись в истории и точно восстанавливается', async({
  editorModel,
  history,
  shapes,
  snapping,
  text
}) => {
  const setup = await createTextCornerScaleSetup({ corner: 'br', editorModel, shapes, snapping, text })
  const pendingSaveFlushed = await history.flushPendingSave()
  const historyBefore = await history.getPosition()

  expect(pendingSaveFlushed, 'подготовка не должна оставлять отложенное сохранение').toBe(false)
  expect(setup.textId).toBeTruthy()

  await text.scaling.start({ corner: 'br', id: setup.textId })
  const live = await text.scaling.dragToScale({ scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER })
  const committed = await text.scaling.finish({ id: setup.textId })
  const historySaved = await history.flushPendingSave()
  const historyAfter = await history.getPosition()

  expect(historySaved, 'object:modified должен сохранить завершённый скейлинг').toBe(true)
  expect(committed).toEqual(live)
  expect(historyAfter.patchCount).toBe(historyBefore.patchCount + 1)
  expect(historyAfter.currentIndex).toBe(historyBefore.currentIndex + 1)
  expect(committed.scaleX).toBe(1)
  expect(committed.scaleY).toBe(1)
  expect(Math.abs(committed.height - Math.round(committed.height))).toBeGreaterThan(0.01)

  await history.undo()
  const restored = await text.getResizeSnapshot({ id: setup.textId })
  for (const field of TEXT_CORNER_SCALE_HISTORY_FIELDS) {
    expect(restored[field], `undo должен восстановить ${field}`).toBeCloseTo(setup.initial[field], 4)
  }

  await history.redo()
  const redone = await text.getResizeSnapshot({ id: setup.textId })
  for (const field of TEXT_CORNER_SCALE_HISTORY_FIELDS) {
    expect(redone[field], `redo должен восстановить ${field}`).toBeCloseTo(committed[field], 4)
  }
})

test('после undo и redo текст снова прилипает при увеличении за угол', async({
  editorModel,
  history,
  shapes,
  snapping,
  text
}) => {
  const setup = await createTextCornerScaleSetup({ corner: 'br', editorModel, shapes, snapping, text })

  await history.flushPendingSave()
  await text.scaling.start({ corner: 'br', id: setup.textId })
  await text.scaling.dragToScale({ scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER })
  await text.scaling.finish({ id: setup.textId })
  expect(await history.flushPendingSave()).toBe(true)

  await history.undo()
  await history.redo()

  expect(await shapes.remove({ id: setup.referenceId })).toBe(true)
  const repeatedSetup = await createTextCornerScaleReferenceSetup({
    corner: 'br',
    shapes,
    snapping,
    text,
    textId: setup.textId
  })
  await text.scaling.start({ corner: 'br', id: setup.textId })
  const repeated = await text.scaling.dragToScale({ scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER })
  const repeatedGuides = await snapping.getGuideState()

  expect(Math.abs(repeated.boundsRight - repeatedSetup.snapPoint.x))
    .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
  expect(Math.abs(repeated.boundsBottom - repeatedSetup.snapPoint.y))
    .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
  expect(repeatedGuides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: repeatedSetup.snapPoint.x },
    { type: 'horizontal', position: repeatedSetup.snapPoint.y }
  ]))

  await text.scaling.finish({ id: setup.textId })
})

test('новое увеличение текста не наследует удержание предыдущего жеста', async({
  editorModel,
  shapes,
  snapping,
  text
}) => {
  const setup = await createTextCornerScaleSetup({ corner: 'br', editorModel, shapes, snapping, text })

  await text.scaling.start({ corner: 'br', id: setup.textId })
  const snapped = await text.scaling.dragToScale({ scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER })
  const committed = await text.scaling.finish({ id: setup.textId })
  const referenceRemoved = await shapes.remove({ id: setup.referenceId })
  const clearedGuides = await snapping.getGuideState()

  expect(committed).toEqual(snapped)
  expect(referenceRemoved).toBe(true)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)

  await text.scaling.start({ corner: 'br', id: setup.textId })
  const freshGesture = await text.scaling.continueBy({ deltaX: 8, deltaY: 8 })
  const freshGuides = await snapping.getGuideState()

  expect(Math.abs(freshGesture.boundsRight - committed.boundsRight)).toBeGreaterThan(1)
  expect(Math.abs(freshGesture.boundsBottom - committed.boundsBottom)).toBeGreaterThan(1)
  expect(freshGuides.guides).toHaveLength(0)
  expect(freshGuides.spacingGuides).toHaveLength(0)

  const finished = await text.scaling.finish({ id: setup.textId })
  expect(finished).toEqual(freshGesture)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)
})

test('после отмены указателя направляющие очищаются и следующий скейлинг начинается заново', async({
  editorModel,
  shapes,
  snapping,
  text
}) => {
  const setup = await createTextCornerScaleSetup({ corner: 'br', editorModel, shapes, snapping, text })

  await text.scaling.start({ corner: 'br', id: setup.textId })
  const snapped = await text.scaling.dragToScale({ scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER })
  const guidesBeforeCancel = await snapping.getGuideState()

  expect(guidesBeforeCancel.guides).toHaveLength(2)
  expect(guidesBeforeCancel.spacingGuides).toHaveLength(0)

  const interrupted = await text.scaling.cancelWithPointerEvent()
  const guidesAfterCancel = await snapping.getGuideState()

  expect(interrupted).toEqual(snapped)
  expect(guidesAfterCancel.guides).toHaveLength(0)
  expect(guidesAfterCancel.spacingGuides).toHaveLength(0)

  await text.scaling.start({ corner: 'br', id: setup.textId })
  const freshGesture = await text.scaling.continueBy({
    ctrlKey: true,
    deltaX: 8,
    deltaY: 8
  })

  expect(freshGesture.boundsRight).toBeGreaterThan(interrupted.boundsRight)
  expect(freshGesture.boundsBottom).toBeGreaterThan(interrupted.boundsBottom)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)

  const committed = await text.scaling.finish({ id: setup.textId })
  expect(committed).toEqual(freshGesture)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)
})

test('вставленный из буфера текст прилипает при увеличении за угол', async({
  clipboard,
  editorModel,
  shapes,
  snapping,
  text
}) => {
  const original = await createTextCornerScaleSetup({ corner: 'br', editorModel, shapes, snapping, text })
  await text.scaling.start({ corner: 'br', id: original.textId })
  await text.scaling.dragToScale({ scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER })
  const originalCommitted = await text.scaling.finish({ id: original.textId })
  const selected = await text.select({ id: original.textId })

  expect(Math.abs(originalCommitted.height - Math.round(originalCommitted.height))).toBeGreaterThan(0.01)
  expect(selected?.id).toBe(original.textId)
  expect(selected?.type).toBe('background-textbox')

  await clipboard.copy()
  await clipboard.waitForClipboardReady()
  expect(await clipboard.paste()).toBe(true)
  const copiedText = await editorModel.getActiveObject()

  expect(copiedText?.type).toBe('background-textbox')
  expect(typeof copiedText?.id).toBe('string')
  if (typeof copiedText?.id !== 'string') throw new Error('После вставки текст должен быть активен')
  const copiedSnapshot = await text.getResizeSnapshot({ id: copiedText.id })

  for (const field of TEXT_CORNER_SCALE_GROWING_FIELDS) {
    expect(copiedSnapshot[field], `вставка должна сохранить ${field}`).toBeCloseTo(originalCommitted[field], 4)
  }

  expect(await shapes.remove({ id: original.referenceId })).toBe(true)
  const setup = await createTextCornerScaleReferenceSetup({
    corner: 'br',
    shapes,
    snapping,
    text,
    textId: copiedText.id
  })

  await text.scaling.start({ corner: 'br', id: copiedText.id })
  const live = await text.scaling.dragToScale({ scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER })
  const guideState = await snapping.getGuideState()

  expect(Math.abs(live.boundsRight - setup.snapPoint.x))
    .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
  expect(Math.abs(live.boundsBottom - setup.snapPoint.y))
    .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
  expect(guideState.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.snapPoint.x },
    { type: 'horizontal', position: setup.snapPoint.y }
  ]))

  const committed = await text.scaling.finish({ id: copiedText.id })
  expect(committed).toEqual(live)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)
})

test('текст из шаблона прилипает при увеличении за угол', async({
  editorModel,
  shapes,
  snapping,
  template,
  text
}) => {
  const source = await test.step('Увеличить и сохранить исходный текст в шаблон', async() => {
    const prepared = await createScaledTextCornerTemplateSetup({
      corner: 'br', editorModel, shapes, snapping, template, text
    })

    expect(prepared.committed).toEqual(prepared.live)
    expect(Math.abs(prepared.committed.height - Math.round(prepared.committed.height))).toBeGreaterThan(0.01)
    return prepared
  })

  const templateTextId = await test.step('Применить шаблон и сравнить геометрию текста', async() => {
    const templateText = text.checkCreation({
      textObject: await text.applyTemplate({ template: source.serializedTemplate })
    })

    expect(templateText.type).toBe('background-textbox')
    expect(templateText.id).not.toBe(source.setup.textId)
    if (typeof templateText.id !== 'string') {
      throw new Error('Восстановленный из шаблона текст должен иметь id')
    }

    const snapshot = await text.getResizeSnapshot({ id: templateText.id })
    for (const field of TEXT_CORNER_SCALE_GROWING_FIELDS) {
      expect(snapshot[field], `шаблон должен сохранить ${field}`).toBeCloseTo(source.committed[field], 4)
    }

    return templateText.id
  })

  await test.step('Повторно увеличить восстановленный текст и проверить направляющие', async() => {
    expect(await shapes.remove({ id: source.setup.referenceId })).toBe(true)
    const setup = await createTextCornerScaleReferenceSetup({
      corner: 'br', shapes, snapping, text, textId: templateTextId
    })
    await text.scaling.start({ corner: 'br', id: templateTextId })
    const live = await text.scaling.dragToScale({ scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER })
    const guideState = await snapping.getGuideState()

    expect(Math.abs(live.boundsRight - setup.snapPoint.x))
      .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
    expect(Math.abs(live.boundsBottom - setup.snapPoint.y))
      .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
    expect(guideState.guides).toEqual(expect.arrayContaining([
      { type: 'vertical', position: setup.snapPoint.x },
      { type: 'horizontal', position: setup.snapPoint.y }
    ]))

    const committed = await text.scaling.finish({ id: templateTextId })
    expect(committed).toEqual(live)
    expect(committed.scaleX).toBe(1)
    expect(committed.scaleY).toBe(1)
  })
})

test('текст из шаблона сохраняет точные размеры на монтажной области другого размера', async({
  canvas,
  editorModel,
  shapes,
  snapping,
  template,
  text
}) => {
  const sourceResolution = { width: 512, height: 512 }
  const templateScale = 1.5

  await canvas.setMontageResolution(sourceResolution)
  const prepared = await createScaledTextCornerTemplateSetup({
    corner: 'br', editorModel, shapes, snapping, template, text
  })
  const { committed: source, serializedTemplate } = prepared

  expect(Math.abs(source.height - Math.round(source.height))).toBeGreaterThan(0.01)
  expect(serializedTemplate.meta.baseWidth).toBe(sourceResolution.width)
  expect(serializedTemplate.meta.baseHeight).toBe(sourceResolution.height)

  await canvas.clearCanvas()
  await canvas.setMontageResolution({
    width: sourceResolution.width * templateScale,
    height: sourceResolution.height * templateScale
  })
  const restored = text.checkCreation({
    textObject: await text.applyTemplate({ template: serializedTemplate })
  })

  expect(typeof restored.id).toBe('string')
  if (typeof restored.id !== 'string') {
    throw new Error('Восстановленный из шаблона текст должен иметь id')
  }
  const restoredSnapshot = await text.getResizeSnapshot({ id: restored.id })

  for (const field of TEXT_CORNER_SCALE_GROWING_FIELDS) {
    expect(restoredSnapshot[field], `шаблон должен точно масштабировать ${field}`)
      .toBeCloseTo(source[field] * templateScale, 4)
  }

  expect(restoredSnapshot.scaleX).toBe(1)
  expect(restoredSnapshot.scaleY).toBe(1)
})

test('текст из шаблона с автоматическим расширением сохраняет доступную направляющую при увеличении за правый верхний угол', async({
  shapes,
  snapping,
  text
}) => {
  const templateText = text.checkCreation({
    textObject: await text.applyTemplate({ template: TEXT_TOP_RIGHT_SCALING_REGRESSION_TEMPLATE })
  })

  expect(templateText.type).toBe('background-textbox')
  expect(typeof templateText.id).toBe('string')
  if (typeof templateText.id !== 'string') {
    throw new Error('Восстановленный из шаблона текст должен иметь id')
  }

  const setup = await createTextCornerScaleReferenceSetup({
    corner: 'tr',
    shapes,
    snapping,
    text,
    textId: templateText.id
  })
  await text.scaling.start({ corner: 'tr', id: templateText.id })
  const live = await text.scaling.dragToScale({ scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER })
  const guideState = await snapping.getGuideState()

  expect(Math.abs(live.boundsRight - setup.snapPoint.x))
    .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
  expect(Math.abs(live.boundsTop - setup.snapPoint.y))
    .toBeGreaterThan(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
  expect(guideState.guides).toEqual([
    { type: 'vertical', position: setup.snapPoint.x }
  ])
  expect(guideState.spacingGuides).toHaveLength(0)

  const committed = await text.scaling.finish({ id: templateText.id })

  expect(committed).toEqual(live)
  expect(committed.scaleX).toBe(1)
  expect(committed.scaleY).toBe(1)
})
