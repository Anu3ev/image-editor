import {
  test,
  expect,
  type ActiveSelectionCompositionKind
} from '../../../fixtures/active-selection-moving.fixture'

/** Поддерживаемые составы общего выделения и их подготовка перед перемещением. */
const MOVEMENT_COMPOSITIONS = [
  { kind: 'shapes', label: 'шейпов', scaleBeforeMove: false },
  { kind: 'images', label: 'изображений', scaleBeforeMove: false },
  { kind: 'texts', label: 'отдельных текстов', scaleBeforeMove: false },
  { kind: 'mixed', label: 'изображения, шейпа и отдельного текста', scaleBeforeMove: false },
  { kind: 'images', label: 'ранее масштабированных изображений', scaleBeforeMove: true }
] satisfies ReadonlyArray<{
  kind: ActiveSelectionCompositionKind
  label: string
  scaleBeforeMove: boolean
}>

for (const composition of MOVEMENT_COMPOSITIONS) {
  test(`при перемещении общего выделения ${composition.label} сохраняется локальная геометрия детей`, async({
    createActiveSelectionComposition,
    selection,
    snapping
  }) => {
    const setup = await createActiveSelectionComposition({
      kind: composition.kind,
      scaleBeforeMove: composition.scaleBeforeMove
    })
    const baseline = setup.initialComposition

    if (composition.scaleBeforeMove) {
      expect(Math.min(baseline.selection.scaleX, baseline.selection.scaleY)).toBeGreaterThan(1)
    }

    await snapping.startObjectDrag({ activeObject: true })
    const snapped = await snapping.dragObjectBoundsTo({
      activeObject: true,
      left: setup.reference.boundsLeft + 1,
      top: setup.reference.boundsTop + 1
    })
    const held = await snapping.dragObjectBoundsTo({
      activeObject: true,
      left: snapped.boundsLeft + 3,
      top: snapped.boundsTop + 3
    })
    const live = await selection.getCompositionSnapshot()
    const deltaX = live.selection.boundsLeft - baseline.selection.boundsLeft
    const deltaY = live.selection.boundsTop - baseline.selection.boundsTop

    expect(held).toEqual(snapped)
    expect(live.selection).toEqual(held)
    expect(live.selection.scaleX).toBeCloseTo(baseline.selection.scaleX, 10)
    expect(live.selection.scaleY).toBeCloseTo(baseline.selection.scaleY, 10)

    for (const baselineChild of baseline.children) {
      const liveChild = live.children.find(({ id }) => id === baselineChild.id)

      expect(liveChild, `${baselineChild.id}: дочерний объект должен сохраниться`).toBeDefined()
      if (!liveChild) throw new Error(`После перемещения не найден объект ${baselineChild.id}`)

      expect(liveChild).toMatchObject({
        angle: baselineChild.angle,
        height: baselineChild.height,
        left: baselineChild.left,
        scaleX: baselineChild.scaleX,
        scaleY: baselineChild.scaleY,
        top: baselineChild.top,
        width: baselineChild.width
      })
      expect(liveChild.boundsLeft).toBeCloseTo(baselineChild.boundsLeft + deltaX, 5)
      expect(liveChild.boundsTop).toBeCloseTo(baselineChild.boundsTop + deltaY, 5)
      expect(liveChild.boundsWidth).toBeCloseTo(baselineChild.boundsWidth, 5)
      expect(liveChild.boundsHeight).toBeCloseTo(baselineChild.boundsHeight, 5)
    }

    await snapping.finishPointerInteraction()
    expect(await selection.getCompositionSnapshot()).toEqual(live)
  })
}
