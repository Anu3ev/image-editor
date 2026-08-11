import {
  test,
  expect
} from '../../../fixtures/group-moving.fixture'

test('одно перемещение группы совпадает до и после mouseup и создаёт одну запись в истории', async({
  groupMovingSetup: setup,
  history,
  selection,
  snapping
}) => {
  const pendingSaveFlushed = await history.flushPendingSave()
  const historyBefore = await history.getPosition()

  expect(pendingSaveFlushed, 'подготовка не должна оставлять отложенное сохранение').toBe(false)
  expect(setup.initialComposition.children).toHaveLength(setup.childIds.length)

  await snapping.startObjectDrag({ id: setup.groupId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.groupId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const live = await selection.getCompositionSnapshot()

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 5)
  expect(snapped.boundsTop).toBeCloseTo(setup.reference.boundsTop, 5)
  expect(live.selection).toEqual(snapped)

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await selection.getCompositionSnapshot()
  const historySaved = await history.flushPendingSave()
  const historyAfter = await history.getPosition()

  expect(historySaved, 'object:modified должен сохранить завершённое перемещение').toBe(true)
  expect(committed).toEqual(live)
  expect(clearedGuides).toEqual({ guides: [], spacingGuides: [] })
  expect(historyAfter.patchCount).toBe(historyBefore.patchCount + 1)
  expect(historyAfter.currentIndex).toBe(historyBefore.currentIndex + 1)
})

test('undo восстанавливает одну верхнеуровневую группу и локальную геометрию детей', async({
  editorModel,
  groupMovingSetup: setup,
  grouping,
  history,
  selection,
  snapping
}) => {
  expect(await history.flushPendingSave()).toBe(false)
  expect(setup.initialComposition.selection.type).toBe('group')

  await snapping.startObjectDrag({ id: setup.groupId })
  await snapping.dragObjectBoundsTo({
    id: setup.groupId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  await snapping.finishPointerInteraction()

  expect(await history.flushPendingSave()).toBe(true)
  expect((await selection.getCompositionSnapshot()).selection.type).toBe('group')

  await history.undo()
  await grouping.selectGroup({ id: setup.groupId })

  const restored = await selection.getCompositionSnapshot()
  const rootsAfterUndo = await editorModel.getObjects()

  expect(rootsAfterUndo.filter(({ type }) => type === 'group').map(({ id }) => id))
    .toEqual([setup.groupId])
  expect(rootsAfterUndo.map(({ id }) => id))
    .toEqual(expect.not.arrayContaining([...setup.childIds]))
  expect(restored.selection).toEqual(setup.initialComposition.selection)
  for (const initialChild of setup.initialComposition.children) {
    const restoredChild = restored.children.find(({ id }) => id === initialChild.id)

    expect(restoredChild, `${initialChild.id}: дочерний объект должен восстановиться`).toBeDefined()
    expect(restoredChild).toMatchObject({
      angle: initialChild.angle,
      height: initialChild.height,
      left: initialChild.left,
      scaleX: initialChild.scaleX,
      scaleY: initialChild.scaleY,
      top: initialChild.top,
      width: initialChild.width
    })
  }
})

test('redo восстанавливает перемещённую группу и локальную геометрию детей', async({
  editorModel,
  groupMovingSetup: setup,
  grouping,
  history,
  selection,
  snapping
}) => {
  expect(await history.flushPendingSave()).toBe(false)
  expect(setup.initialComposition.selection.type).toBe('group')

  await snapping.startObjectDrag({ id: setup.groupId })
  await snapping.dragObjectBoundsTo({
    id: setup.groupId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  await snapping.finishPointerInteraction()

  const committed = await selection.getCompositionSnapshot()

  expect(await history.flushPendingSave()).toBe(true)
  expect(committed.selection.type).toBe('group')

  await history.undo()
  await history.redo()
  await grouping.selectGroup({ id: setup.groupId })

  const redone = await selection.getCompositionSnapshot()
  const roots = await editorModel.getObjects()

  expect(roots.filter(({ type }) => type === 'group').map(({ id }) => id))
    .toEqual([setup.groupId])
  expect(roots.map(({ id }) => id)).toEqual(expect.not.arrayContaining([...setup.childIds]))
  expect(redone.selection).toEqual(committed.selection)
  for (const committedChild of committed.children) {
    const redoneChild = redone.children.find(({ id }) => id === committedChild.id)

    expect(redoneChild, `${committedChild.id}: дочерний объект должен восстановиться`).toBeDefined()
    expect(redoneChild).toMatchObject({
      angle: committedChild.angle,
      height: committedChild.height,
      left: committedChild.left,
      scaleX: committedChild.scaleX,
      scaleY: committedChild.scaleY,
      top: committedChild.top,
      width: committedChild.width
    })
  }
})

test('скопированная группа и её дочерние объекты получают новые id', async({
  clipboard,
  createGroupMovingSetup,
  editorModel,
  selection
}) => {
  const setup = await createGroupMovingSetup()

  await clipboard.copy()
  await clipboard.waitForClipboardReady()

  const pasted = await clipboard.paste()
  const copied = await selection.getCompositionSnapshot()

  expect(pasted).toBe(true)
  expect(copied.selection.type).toBe('group')
  expect(copied.selection.id).toEqual(expect.any(String))
  expect(copied.children).toHaveLength(setup.childIds.length)
  if (!copied.selection.id) throw new Error('Скопированная группа должна получить id')

  const sourceIds = [setup.groupId, ...setup.childIds]
  const copiedIds = [copied.selection.id, ...copied.children.map(({ id }) => id)]
  const roots = await editorModel.getObjects()

  expect(copiedIds.some((id) => sourceIds.includes(id))).toBe(false)
  expect(new Set(copiedIds).size).toBe(copiedIds.length)
  expect(roots.filter(({ id }) => id === copied.selection.id)).toHaveLength(1)
  expect(roots.map(({ id }) => id))
    .toEqual(expect.not.arrayContaining(copied.children.map(({ id }) => id)))
})

test('скопированная группа перемещается без изменения локальной геометрии детей', async({
  clipboard,
  createGroupMovingSetup,
  selection,
  snapping
}) => {
  const setup = await createGroupMovingSetup()

  await clipboard.copy()
  await clipboard.waitForClipboardReady()

  expect(await clipboard.paste()).toBe(true)

  const baseline = await selection.getCompositionSnapshot()

  expect(baseline.selection.id).toEqual(expect.any(String))
  if (!baseline.selection.id) throw new Error('Скопированная группа должна получить id')

  await snapping.startObjectDrag({ id: baseline.selection.id })
  const snapped = await snapping.dragObjectBoundsTo({
    id: baseline.selection.id,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const live = await selection.getCompositionSnapshot()

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 5)
  expect(snapped.boundsTop).toBeCloseTo(setup.reference.boundsTop, 5)
  expect(live.selection).toEqual(snapped)

  for (const baselineChild of baseline.children) {
    const liveChild = live.children.find(({ id }) => id === baselineChild.id)

    expect(liveChild, `${baselineChild.id}: скопированный дочерний объект должен сохраниться`)
      .toBeDefined()
    if (!liveChild) throw new Error(`После перемещения не найден дочерний объект ${baselineChild.id}`)

    expect(liveChild).toMatchObject({
      angle: baselineChild.angle,
      height: baselineChild.height,
      left: baselineChild.left,
      scaleX: baselineChild.scaleX,
      scaleY: baselineChild.scaleY,
      top: baselineChild.top,
      width: baselineChild.width
    })
  }

  await snapping.finishPointerInteraction()

  expect(await selection.getCompositionSnapshot()).toEqual(live)
})

test('сериализованный шаблон содержит одну группу с вложенными объектами', async({
  createGroupMovingSetup,
  template
}) => {
  const setup = await createGroupMovingSetup()
  const serializedTemplate = await template.serializeSelection()

  expect(serializedTemplate).not.toBeNull()
  expect(serializedTemplate?.objects).toHaveLength(1)
  if (!serializedTemplate) throw new Error('Выбранная группа должна сериализоваться в шаблон')

  const [serializedGroup] = serializedTemplate.objects
  const serializedChildren = serializedGroup.objects

  expect(serializedGroup.type).toBe('Group')
  expect(Array.isArray(serializedChildren)).toBe(true)
  if (!Array.isArray(serializedChildren)) {
    throw new Error('Сериализованная группа должна содержать вложенные объекты')
  }
  expect(serializedChildren).toHaveLength(setup.childIds.length)
})

test('группа из шаблона получает новые id и сохраняет локальную геометрию детей', async({
  createGroupMovingSetup,
  editorModel,
  selection,
  template
}) => {
  const setup = await createGroupMovingSetup()
  const serializedTemplate = await template.serializeSelection()

  expect(serializedTemplate).not.toBeNull()
  expect(serializedTemplate?.objects).toHaveLength(1)
  if (!serializedTemplate) throw new Error('Выбранная группа должна сериализоваться в шаблон')

  const insertedCount = await template.applyTemplate({ template: serializedTemplate })
  const applied = await selection.getCompositionSnapshot()

  expect(insertedCount).toBe(1)
  expect(applied.selection.type).toBe('group')
  expect(applied.selection.id).toEqual(expect.any(String))
  expect(applied.children).toHaveLength(setup.childIds.length)
  if (!applied.selection.id) throw new Error('Группа из шаблона должна получить id')

  const sourceIds = [setup.groupId, ...setup.childIds]
  const appliedIds = [applied.selection.id, ...applied.children.map(({ id }) => id)]
  const roots = await editorModel.getObjects()

  expect(appliedIds.some((id) => sourceIds.includes(id))).toBe(false)
  expect(new Set(appliedIds).size).toBe(appliedIds.length)
  expect(roots.filter(({ id }) => id === applied.selection.id)).toHaveLength(1)
  expect(roots.map(({ id }) => id))
    .toEqual(expect.not.arrayContaining(applied.children.map(({ id }) => id)))

  for (let index = 0; index < setup.initialComposition.children.length; index += 1) {
    const sourceChild = setup.initialComposition.children[index]
    const appliedChild = applied.children[index]

    expect(appliedChild).toBeDefined()
    expect(appliedChild).toMatchObject({
      angle: sourceChild.angle,
      height: sourceChild.height,
      left: sourceChild.left,
      scaleX: sourceChild.scaleX,
      scaleY: sourceChild.scaleY,
      top: sourceChild.top,
      width: sourceChild.width
    })
  }
})

test('группа из шаблона перемещается без изменения локальной геометрии детей', async({
  createGroupMovingSetup,
  selection,
  snapping,
  template
}) => {
  const setup = await createGroupMovingSetup()
  const serializedTemplate = await template.serializeSelection()

  expect(serializedTemplate).not.toBeNull()
  expect(serializedTemplate?.objects).toHaveLength(1)
  if (!serializedTemplate) throw new Error('Выбранная группа должна сериализоваться в шаблон')

  expect(await template.applyTemplate({ template: serializedTemplate })).toBe(1)

  const baseline = await selection.getCompositionSnapshot()

  expect(baseline.selection.id).toEqual(expect.any(String))
  if (!baseline.selection.id) throw new Error('Группа из шаблона должна получить id')

  await snapping.startObjectDrag({ id: baseline.selection.id })
  const snapped = await snapping.dragObjectBoundsTo({
    id: baseline.selection.id,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const live = await selection.getCompositionSnapshot()

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 5)
  expect(snapped.boundsTop).toBeCloseTo(setup.reference.boundsTop, 5)
  expect(live.selection).toEqual(snapped)

  for (const baselineChild of baseline.children) {
    const liveChild = live.children.find(({ id }) => id === baselineChild.id)

    expect(liveChild, `${baselineChild.id}: дочерний объект из шаблона должен сохраниться`)
      .toBeDefined()
    if (!liveChild) throw new Error(`После перемещения не найден дочерний объект ${baselineChild.id}`)

    expect(liveChild).toMatchObject({
      angle: baselineChild.angle,
      height: baselineChild.height,
      left: baselineChild.left,
      scaleX: baselineChild.scaleX,
      scaleY: baselineChild.scaleY,
      top: baselineChild.top,
      width: baselineChild.width
    })
  }

  await snapping.finishPointerInteraction()

  expect(await selection.getCompositionSnapshot()).toEqual(live)
})

test('pointercancel завершает перемещение группы и очищает направляющие', async({
  groupMovingSetup: setup,
  page,
  selection,
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.groupId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.groupId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const acquiredGuides = await snapping.getGuideState()

  expect(acquiredGuides.guides).toHaveLength(2)
  expect(acquiredGuides.spacingGuides).toHaveLength(0)

  await page.evaluate(() => window.dispatchEvent(new Event('pointercancel')))

  const clearedGuides = await snapping.getGuideState()

  expect(clearedGuides).toEqual({ guides: [], spacingGuides: [] })
  expect((await selection.getCompositionSnapshot()).selection).toEqual(snapped)

  await snapping.finishPointerInteraction()

  expect(await snapping.getGuideState()).toEqual({ guides: [], spacingGuides: [] })
})
