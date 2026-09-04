import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'

test('при микродвижениях удерживает левую грань и размеры обоих текстов', async({
  activeSelectionTextScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'ml' })
  await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.left,
      y: setup.initial.selection.centerY
    }
  })

  const acquired = await selection.getTextCompositionSnapshot()

  expect(acquired.selection.boundsLeft).toBeCloseTo(setup.guides.left, 5)
  expect((await snapping.getGuideState()).guides).toEqual([{
    type: 'vertical',
    position: setup.guides.left
  }])

  for (let step = 0; step < 3; step += 1) {
    await selection.scaling.dragControlBy({ deltaX: 1, deltaY: 0 })

    const held = await selection.getTextCompositionSnapshot()
    const guideState = await snapping.getGuideState()

    expect(held.selection.boundsLeft).toBeCloseTo(acquired.selection.boundsLeft, 8)
    expect(held.selection.boundsRight).toBeCloseTo(acquired.selection.boundsRight, 8)
    for (const [index, heldText] of held.children.entries()) {
      const acquiredText = acquired.children[index]
      if (!acquiredText) throw new Error('Удержание должно сохранить оба текста')

      expect(heldText.width).toBeCloseTo(acquiredText.width, 8)
      expect(heldText.height).toBeCloseTo(acquiredText.height, 8)
      expect(heldText.fontSize).toBeCloseTo(acquiredText.fontSize, 8)
      expect(heldText.boundsLeft).toBeCloseTo(acquiredText.boundsLeft, 8)
      expect(heldText.boundsRight).toBeCloseTo(acquiredText.boundsRight, 8)
      expect(heldText.lineCount).toBe(acquiredText.lineCount)
    }
    expect(guideState.guides).toEqual([{
      type: 'vertical',
      position: setup.guides.left
    }])
    expect(guideState.spacingGuides).toHaveLength(0)
  }

  await selection.scaling.finish()
})

for (const centered of [false, true]) {
  const title = centered
    ? 'при скейлинге относительно центра удерживает размер у горизонтального гайда монтажной области'
    : 'при микродвижениях у горизонтального гайда монтажной области сохраняет размер обоих текстов'

  test(title, async({ activeSelectionMontageTextScaleSetup: setup, editorModel, selection, snapping }) => {
    const guidePosition = setup.montage.centerY
    const path = await selection.scaling.createTopRightProportionalPath({
      topPositions: [0, -3, -1, 1, 3].map((offset) => {
        return guidePosition + (offset * setup.scenePixel)
      }),
      centered
    })
    const acquiredPoint = path[0]
    if (!acquiredPoint) throw new Error('Путь должен содержать точку прилипания')

    await selection.scaling.startFromControl({ centered, control: 'tr' })
    await selection.scaling.dragControlToScenePoint({ point: acquiredPoint })

    const acquired = await selection.getTextCompositionSnapshot()
    const acquiredIndicator = await editorModel.requireObjectSizeIndicator()

    expect(acquired.selection.boundsTop).toBeCloseTo(guidePosition, 5)
    expect(acquired.children.every(({ autoExpand }) => autoExpand)).toBe(true)
    if (centered) {
      expect(acquired.selection.centerX).toBeCloseTo(setup.initial.selection.centerX, 5)
      expect(acquired.selection.centerY).toBeCloseTo(setup.initial.selection.centerY, 5)
    }

    for (const point of path.slice(1)) {
      await selection.scaling.dragControlToScenePoint({ point })
      const held = await selection.getTextCompositionSnapshot()
      const guideState = await snapping.getGuideState()

      for (const property of ['boundsLeft', 'boundsRight', 'boundsTop', 'boundsBottom'] as const) {
        expect(held.selection[property]).toBeCloseTo(acquired.selection[property], 8)
      }
      for (const property of ['width', 'height', 'scaleX', 'scaleY'] as const) {
        expect(held.selection[property]).toBeCloseTo(acquired.selection[property], 8)
      }
      for (const [index, heldText] of held.children.entries()) {
        const acquiredText = acquired.children[index]
        if (!acquiredText) throw new Error('Удержание должно сохранить оба текста')

        for (const property of ['width', 'height', 'fontSize', 'boundsWidth', 'boundsHeight'] as const) {
          expect(heldText[property]).toBeCloseTo(acquiredText[property], 8)
        }
        expect(heldText.lineCount).toBe(acquiredText.lineCount)
        expect(heldText.autoExpand).toBe(true)
      }
      expect(await editorModel.requireObjectSizeIndicator()).toEqual(acquiredIndicator)
      expect(guideState.guides).toEqual([{ type: 'horizontal', position: guidePosition }])
      expect(guideState.spacingGuides).toHaveLength(0)
    }

    const committed = await selection.scaling.finish()

    expect(committed.boundsWidth).toBeCloseTo(acquired.selection.boundsWidth, 5)
    expect(committed.boundsHeight).toBeCloseTo(acquired.selection.boundsHeight, 5)
  })
}

test('после выхода из зоны горизонтального гайда продолжает пропорциональный скейлинг', async({
  activeSelectionMontageTextScaleSetup: setup,
  selection,
  snapping
}) => {
  const guidePosition = setup.montage.centerY
  const path = await selection.scaling.createTopRightProportionalPath({
    topPositions: [guidePosition, guidePosition - (30 * setup.scenePixel)]
  })
  const acquiredPoint = path[0]
  const releasedPoint = path[1]
  if (!acquiredPoint || !releasedPoint) throw new Error('Путь должен содержать точки удержания и отпускания')

  await selection.scaling.startFromControl({ control: 'tr' })
  await selection.scaling.dragControlToScenePoint({ point: acquiredPoint })
  const acquired = await selection.getTextCompositionSnapshot()

  expect(acquired.selection.boundsTop).toBeCloseTo(guidePosition, 5)
  expect((await snapping.getGuideState()).guides).toHaveLength(1)

  await selection.scaling.dragControlToScenePoint({ point: releasedPoint })
  const released = await selection.getTextCompositionSnapshot()
  const guideState = await snapping.getGuideState()

  expect(Math.abs(released.selection.boundsTop - acquired.selection.boundsTop))
    .toBeGreaterThan(20 * setup.scenePixel)
  expect(released.selection.boundsWidth).not.toBeCloseTo(acquired.selection.boundsWidth, 5)
  for (const [index, releasedText] of released.children.entries()) {
    const acquiredText = acquired.children[index]
    if (!acquiredText) throw new Error('После выхода из удержания должны сохраниться оба текста')

    expect(releasedText.width).not.toBeCloseTo(acquiredText.width, 5)
    expect(releasedText.fontSize).not.toBeCloseTo(acquiredText.fontSize, 5)
  }
  expect(guideState.guides).toHaveLength(0)
  expect(guideState.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})

test('после выхода из зоны удержания отпускает направляющую и продолжает менять ширину', async({
  activeSelectionTextScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'ml' })
  const acquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.left, y: setup.initial.selection.centerY }
  })

  expect(acquired.boundsLeft).toBeCloseTo(setup.guides.left, 5)
  expect((await snapping.getGuideState()).guides).toHaveLength(1)

  const released = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.left + (30 * setup.scenePixel),
      y: setup.initial.selection.centerY
    }
  })
  const guideState = await snapping.getGuideState()

  expect(Math.abs(released.boundsLeft - acquired.boundsLeft))
    .toBeGreaterThan(20 * setup.scenePixel)
  expect(released.boundsRight).toBeCloseTo(setup.initial.selection.boundsRight, 5)
  expect(guideState.guides).toHaveLength(0)
  expect(guideState.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})

test('при свободном скейлинге удерживает и отпускает нижнюю грань независимо от ширины', async({
  activeSelectionTextScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'br' })
  const acquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom },
    shiftKey: true
  })

  expect(Math.abs(acquired.boundsRight - setup.guides.right)).toBeLessThan(setup.scenePixel)
  expect(Math.abs(acquired.boundsBottom - setup.guides.bottom)).toBeLessThan(setup.scenePixel)

  for (let step = 1; step <= 3; step += 1) {
    const held = await selection.scaling.dragControlToScenePoint({
      point: {
        x: setup.guides.right + (30 * setup.scenePixel),
        y: setup.guides.bottom + (step * setup.scenePixel)
      },
      shiftKey: true
    })
    const guideState = await snapping.getGuideState()

    expect(Math.abs(held.boundsRight - acquired.boundsRight))
      .toBeGreaterThan(20 * setup.scenePixel)
    expect(held.boundsBottom).toBeCloseTo(acquired.boundsBottom, 5)
    expect(held.boundsTop).toBeCloseTo(setup.initial.selection.boundsTop, 5)
    expect(guideState.guides).toEqual([{
      type: 'horizontal',
      position: setup.guides.bottom
    }])
    expect(guideState.spacingGuides).toHaveLength(0)
  }

  const released = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right + (30 * setup.scenePixel),
      y: setup.guides.bottom + (30 * setup.scenePixel)
    },
    shiftKey: true
  })
  const releasedGuides = await snapping.getGuideState()

  expect(Math.abs(released.boundsBottom - acquired.boundsBottom))
    .toBeGreaterThan(20 * setup.scenePixel)
  expect(releasedGuides.guides).toHaveLength(0)
  expect(releasedGuides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})

test('Ctrl снимает удержание, а после отпускания клавиши выделение снова прилипает', async({
  activeSelectionTextScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'ml' })
  const acquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.left, y: setup.initial.selection.centerY }
  })

  expect(acquired.boundsLeft).toBeCloseTo(setup.guides.left, 5)
  expect((await snapping.getGuideState()).guides).toHaveLength(1)

  const withoutSnap = await selection.scaling.dragControlToScenePoint({
    ctrlKey: true,
    point: { x: setup.guides.left - (2 * setup.scenePixel), y: setup.initial.selection.centerY }
  })
  const disabledGuides = await snapping.getGuideState()

  expect(withoutSnap.boundsLeft).not.toBeCloseTo(setup.guides.left, 5)
  expect(disabledGuides.guides).toHaveLength(0)
  expect(disabledGuides.spacingGuides).toHaveLength(0)

  const reacquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.left - setup.scenePixel, y: setup.initial.selection.centerY }
  })
  const reacquiredGuides = await snapping.getGuideState()

  expect(reacquired.boundsLeft).toBeCloseTo(setup.guides.left, 5)
  expect(reacquiredGuides.guides).toEqual([{
    type: 'vertical',
    position: setup.guides.left
  }])
  expect(reacquiredGuides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})

test('Ctrl снимает удержание нижней грани, а после отпускания клавиши она снова прилипает', async({
  activeSelectionTextScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'br' })
  const acquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom },
    shiftKey: true
  })

  expect(acquired.boundsBottom).toBeCloseTo(setup.guides.bottom, 2)
  expect((await snapping.getGuideState()).guides).toHaveLength(2)

  const withoutSnap = await selection.scaling.dragControlToScenePoint({
    ctrlKey: true,
    point: {
      x: setup.guides.right + (30 * setup.scenePixel),
      y: setup.guides.bottom + (2 * setup.scenePixel)
    },
    shiftKey: true
  })
  const disabledGuides = await snapping.getGuideState()

  expect(withoutSnap.boundsBottom).not.toBeCloseTo(setup.guides.bottom, 5)
  expect(disabledGuides.guides).toHaveLength(0)
  expect(disabledGuides.spacingGuides).toHaveLength(0)

  const reacquired = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right + (30 * setup.scenePixel),
      y: setup.guides.bottom + setup.scenePixel
    },
    shiftKey: true
  })
  const reacquiredGuides = await snapping.getGuideState()

  expect(reacquired.boundsBottom).toBeCloseTo(setup.guides.bottom, 5)
  expect(reacquiredGuides.guides).toEqual([{
    type: 'horizontal',
    position: setup.guides.bottom
  }])
  expect(reacquiredGuides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})
