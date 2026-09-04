import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'

/** Угол общего выделения в проверке скейлинга после поворота. */
const ACTIVE_SELECTION_ROTATION_DEGREES = 30

/** Множитель первого пропорционального шага в autoExpand-сценарии. */
const AUTO_EXPAND_UNIFORM_MULTIPLIER = 1.1

/** Множитель ширины после перехода к свободному скейлингу. */
const AUTO_EXPAND_FREE_WIDTH_MULTIPLIER = 1.25

test('при пропорциональном скейлинге за угол одинаково меняет ширину и размер шрифта', async({
  activeSelectionTextScaleSetup: setup,
  selection,
  shapes,
  snapping
}) => {
  for (const id of ['active-selection-scale-top-reference', 'active-selection-scale-bottom-reference']) {
    expect(await shapes.remove({ id })).toBe(true)
  }

  const initial = await selection.getTextCompositionSnapshot()
  const fixedPoint = await selection.scaling.getControlScenePoint({ control: 'tl' })
  const movingPoint = await selection.scaling.getControlScenePoint({ control: 'br' })
  const multiplier = (setup.guides.right - fixedPoint.x)
    / (initial.selection.boundsRight - fixedPoint.x)

  expect(multiplier).toBeGreaterThan(1)
  expect(multiplier).not.toBeCloseTo(1, 5)

  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({
    point: {
      x: fixedPoint.x + ((movingPoint.x - fixedPoint.x) * multiplier),
      y: fixedPoint.y + ((movingPoint.y - fixedPoint.y) * multiplier)
    }
  })

  const live = await selection.getTextCompositionSnapshot()
  const guideState = await snapping.getGuideState()

  expect(live.selection.boundsRight).toBeCloseTo(setup.guides.right, 2)
  expect(guideState.guides).toEqual([{ type: 'vertical', position: setup.guides.right }])
  for (const liveText of live.children) {
    const initialText = initial.children.find(({ id }) => id === liveText.id)
    if (!initialText) throw new Error('Исходное состояние должно содержать оба текста')

    const widthMultiplier = liveText.width / initialText.width

    expect(widthMultiplier).toBeGreaterThan(1)
    expect(liveText.fontSize / initialText.fontSize).toBeCloseTo(widthMultiplier, 3)
  }

  await selection.scaling.finish()
  const committed = await selection.getTextCompositionSnapshot()

  for (const committedText of committed.children) {
    const liveText = live.children.find(({ id }) => id === committedText.id)
    if (!liveText) throw new Error('Состояние во время скейлинга должно содержать оба текста')

    expect(committedText.scaleX).toBeCloseTo(1, 10)
    expect(committedText.scaleY).toBeCloseTo(1, 10)
    expect(committedText.width).toBeCloseTo(liveText.width, 5)
    expect(committedText.fontSize).toBeCloseTo(liveText.fontSize, 5)
  }
})

test('с Shift свободно меняет ширину и высоту текстов за угол', async({
  activeSelectionTextScaleSetup: setup,
  selection,
  snapping
}) => {
  const initial = await selection.getTextCompositionSnapshot()
  const targetBottom = setup.guides.bottom + (20 * setup.scenePixel)

  await selection.scaling.scaleFreelyFromBottomRightToBounds({
    right: setup.guides.right,
    bottom: targetBottom
  })

  const live = await selection.getTextCompositionSnapshot()
  const guideState = await snapping.getGuideState()

  expect(Math.abs(live.selection.boundsRight - setup.guides.right)).toBeLessThan(setup.scenePixel)
  expect(Math.abs(live.selection.boundsBottom - targetBottom)).toBeLessThan(setup.scenePixel)
  expect(guideState.guides).toEqual([{ type: 'vertical', position: setup.guides.right }])
  expect(live.selection.boundsWidth / initial.selection.boundsWidth)
    .not.toBeCloseTo(live.selection.boundsHeight / initial.selection.boundsHeight, 3)
  for (const liveText of live.children) {
    const initialText = initial.children.find(({ id }) => id === liveText.id)
    if (!initialText) throw new Error('Исходное состояние должно содержать оба текста')

    const widthMultiplier = liveText.width / initialText.width
    const fontMultiplier = liveText.fontSize / initialText.fontSize

    expect(widthMultiplier).toBeGreaterThan(1)
    expect(fontMultiplier).toBeGreaterThan(1)
  }

  await selection.scaling.finish()
  const committed = await selection.getTextCompositionSnapshot()

  for (const committedText of committed.children) {
    const liveText = live.children.find(({ id }) => id === committedText.id)
    if (!liveText) throw new Error('Состояние во время скейлинга должно содержать оба текста')

    expect(committedText.scaleX).toBeCloseTo(1, 10)
    expect(committedText.scaleY).toBeCloseTo(1, 10)
    expect(committedText.width).toBeCloseTo(liveText.width, 5)
    expect(committedText.fontSize).toBeCloseTo(liveText.fontSize, 5)
  }
})

test('после свободного скейлинга autoExpand остаётся выключенным при возврате к пропорциональному режиму', async({
  activeSelectionAutoExpandTextScaleSetup: _setup,
  selection
}) => {
  const initial = await selection.getTextCompositionSnapshot()
  const fixedPoint = await selection.scaling.getControlScenePoint({ control: 'tl' })
  const movingPoint = await selection.scaling.getControlScenePoint({ control: 'br' })
  const vector = { x: movingPoint.x - fixedPoint.x, y: movingPoint.y - fixedPoint.y }

  expect(initial.children.every(({ autoExpand }) => autoExpand)).toBe(true)

  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({
    point: {
      x: fixedPoint.x + (vector.x * AUTO_EXPAND_UNIFORM_MULTIPLIER),
      y: fixedPoint.y + (vector.y * AUTO_EXPAND_UNIFORM_MULTIPLIER)
    }
  })
  const uniform = await selection.getTextCompositionSnapshot()

  expect(uniform.children.every(({ autoExpand }) => autoExpand)).toBe(true)

  await selection.scaling.dragControlToScenePoint({
    point: {
      x: fixedPoint.x + (vector.x * AUTO_EXPAND_FREE_WIDTH_MULTIPLIER),
      y: fixedPoint.y + (vector.y * AUTO_EXPAND_UNIFORM_MULTIPLIER)
    },
    shiftKey: true
  })
  const free = await selection.getTextCompositionSnapshot()

  expect(free.children.every(({ autoExpand }) => !autoExpand)).toBe(true)
  expect(free.selection.boundsRight).toBeGreaterThan(uniform.selection.boundsRight)

  await selection.scaling.dragControlToScenePoint({
    point: {
      x: fixedPoint.x + (vector.x * AUTO_EXPAND_FREE_WIDTH_MULTIPLIER),
      y: fixedPoint.y + (vector.y * AUTO_EXPAND_FREE_WIDTH_MULTIPLIER)
    }
  })
  const resumed = await selection.getTextCompositionSnapshot()

  expect(resumed.children.every(({ autoExpand }) => !autoExpand)).toBe(true)
  expect(resumed.selection.boundsBottom).toBeGreaterThan(free.selection.boundsBottom)
  for (const resumedText of resumed.children) {
    const freeText = free.children.find(({ id }) => id === resumedText.id)
    const uniformText = uniform.children.find(({ id }) => id === resumedText.id)
    if (!freeText || !uniformText) throw new Error('Предыдущие шаги должны содержать оба текста')

    expect(resumedText.width).toBeGreaterThan(uniformText.width)
    expect(resumedText.fontSize).toBeGreaterThan(freeText.fontSize)
  }

  await selection.scaling.finish()
  const committed = await selection.getTextCompositionSnapshot()

  for (const committedText of committed.children) {
    const resumedText = resumed.children.find(({ id }) => id === committedText.id)
    if (!resumedText) throw new Error('Последний шаг должен содержать оба текста')

    expect(committedText.autoExpand).toBe(false)
    expect(committedText.scaleX).toBeCloseTo(1, 10)
    expect(committedText.scaleY).toBeCloseTo(1, 10)
    expect(committedText.width).toBeCloseTo(resumedText.width, 5)
    expect(committedText.fontSize).toBeCloseTo(resumedText.fontSize, 5)
  }
})

test('если Shift зажат до захвата боковой ручки, рамка наклоняется без направляющих', async({
  activeSelectionTextScaleSetup: setup,
  selection,
  snapping
}) => {
  const initial = await selection.getTextCompositionSnapshot()
  const controlPoint = await selection.scaling.getControlScenePoint({ control: 'mr' })

  await selection.scaling.startFromControl({ control: 'mr', shiftKey: true })
  await selection.scaling.dragControlToScenePoint({
    point: {
      x: controlPoint.x,
      y: controlPoint.y + (30 * setup.scenePixel)
    }
  })

  const live = await selection.getTextCompositionSnapshot()
  const liveSkew = await selection.getSkew()
  const liveGuides = await snapping.getGuideState()

  expect(Math.abs(liveSkew.skewX) + Math.abs(liveSkew.skewY)).toBeGreaterThan(0.00001)
  expect(liveGuides.guides).toHaveLength(0)
  expect(liveGuides.spacingGuides).toHaveLength(0)
  for (const liveText of live.children) {
    const initialText = initial.children.find(({ id }) => id === liveText.id)
    if (!initialText) throw new Error('Исходное состояние должно содержать оба текста')

    expect(liveText.width).toBeCloseTo(initialText.width, 10)
    expect(liveText.fontSize).toBeCloseTo(initialText.fontSize, 10)
    expect(liveText.scaleX).toBeCloseTo(initialText.scaleX, 10)
    expect(liveText.scaleY).toBeCloseTo(initialText.scaleY, 10)
  }

  await selection.scaling.finish()

  const committedSkew = await selection.getSkew()

  expect(Math.abs(committedSkew.skewX) + Math.abs(committedSkew.skewY)).toBeGreaterThan(0.00001)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)
})

test('при скейлинге за боковую ручку относительно центра сохраняет центр выделения', async({
  activeSelectionTextScaleSetup: setup,
  selection,
  snapping
}) => {
  const initial = await selection.getTextCompositionSnapshot()

  await selection.scaling.startFromControl({ centered: true, control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.initial.selection.centerY }
  })

  const live = await selection.getTextCompositionSnapshot()
  const guideState = await snapping.getGuideState()

  expect(live.selection.boundsLeft).toBeCloseTo(setup.guides.left, 2)
  expect(live.selection.boundsRight).toBeCloseTo(setup.guides.right, 2)
  expect(live.selection.centerX).toBeCloseTo(initial.selection.centerX, 5)
  expect(live.selection.centerY).toBeCloseTo(initial.selection.centerY, 5)
  expect(guideState.guides).toHaveLength(1)
  expect(guideState.guides[0]?.type).toBe('vertical')
  expect([setup.guides.left, setup.guides.right]).toContain(guideState.guides[0]?.position)
  for (const liveText of live.children) {
    const initialText = initial.children.find(({ id }) => id === liveText.id)
    if (!initialText) throw new Error('Исходное состояние должно содержать оба текста')

    expect(liveText.width).not.toBeCloseTo(initialText.width, 3)
    expect(liveText.fontSize).toBeCloseTo(initialText.fontSize, 5)
  }

  await selection.scaling.finish()
  const committed = await selection.getTextCompositionSnapshot()

  for (const text of committed.children) {
    expect(text.scaleX).toBeCloseTo(1, 10)
    expect(text.scaleY).toBeCloseTo(1, 10)
  }
})

test('при скейлинге за угол относительно центра сохраняет центр и меняет размер шрифта', async({
  activeSelectionTextScaleSetup: setup,
  selection
}) => {
  const initial = await selection.getTextCompositionSnapshot()

  await selection.scaling.startFromControl({ centered: true, control: 'br' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom }
  })

  const live = await selection.getTextCompositionSnapshot()

  expect(Math.abs(live.selection.boundsLeft - setup.guides.left)).toBeLessThan(setup.scenePixel)
  expect(Math.abs(live.selection.boundsRight - setup.guides.right)).toBeLessThan(setup.scenePixel)
  expect(Math.abs(live.selection.boundsTop - setup.guides.top)).toBeLessThan(setup.scenePixel)
  expect(Math.abs(live.selection.boundsBottom - setup.guides.bottom)).toBeLessThan(setup.scenePixel)
  expect(live.selection.centerX).toBeCloseTo(initial.selection.centerX, 5)
  expect(live.selection.centerY).toBeCloseTo(initial.selection.centerY, 5)
  for (const liveText of live.children) {
    const initialText = initial.children.find(({ id }) => id === liveText.id)
    if (!initialText) throw new Error('Исходное состояние должно содержать оба текста')

    const widthMultiplier = liveText.width / initialText.width

    expect(widthMultiplier).toBeGreaterThan(1)
    expect(liveText.fontSize / initialText.fontSize).toBeCloseTo(widthMultiplier, 3)
  }

  await selection.scaling.finish()

  const committed = await selection.getTextCompositionSnapshot()
  for (const committedText of committed.children) {
    const liveText = live.children.find(({ id }) => id === committedText.id)
    if (!liveText) throw new Error('Состояние во время скейлинга должно содержать оба текста')

    expect(committedText.scaleX).toBeCloseTo(1, 10)
    expect(committedText.scaleY).toBeCloseTo(1, 10)
    expect(committedText.width).toBeCloseTo(liveText.width, 5)
    expect(committedText.fontSize).toBeCloseTo(liveText.fontSize, 5)
  }
})

test('повёрнутое выделение прилипает при скейлинге за боковую ручку и не смещает другую сторону', async({
  activeSelectionTextScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.setAngle({ angle: ACTIVE_SELECTION_ROTATION_DEGREES })
  const rotated = await selection.getTextCompositionSnapshot()
  const fixedPoint = await selection.scaling.getControlScenePoint({ control: 'ml' })
  const movingPoint = await selection.scaling.getControlScenePoint({ control: 'mr' })
  const multiplier = (setup.guides.right - fixedPoint.x)
    / (rotated.selection.boundsRight - fixedPoint.x)

  expect(multiplier).toBeGreaterThan(0)
  expect(multiplier).not.toBeCloseTo(1, 5)

  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: {
      x: fixedPoint.x + ((movingPoint.x - fixedPoint.x) * multiplier),
      y: fixedPoint.y + ((movingPoint.y - fixedPoint.y) * multiplier)
    }
  })

  const live = await selection.getTextCompositionSnapshot()
  const fixedAfter = await selection.scaling.getControlScenePoint({ control: 'ml' })
  const guideState = await snapping.getGuideState()

  expect(live.selection.angle).toBeCloseTo(ACTIVE_SELECTION_ROTATION_DEGREES, 5)
  expect(live.selection.boundsRight).toBeCloseTo(setup.guides.right, 2)
  expect(fixedAfter.x).toBeCloseTo(fixedPoint.x, 5)
  expect(fixedAfter.y).toBeCloseTo(fixedPoint.y, 5)
  expect(guideState.guides).toEqual([{ type: 'vertical', position: setup.guides.right }])

  await selection.scaling.finish()
  const committed = await selection.getTextCompositionSnapshot()

  expect(committed.selection.angle).toBeCloseTo(ACTIVE_SELECTION_ROTATION_DEGREES, 5)
  expect(committed.selection.boundsRight).toBeCloseTo(live.selection.boundsRight, 5)
  for (const text of committed.children) {
    expect(text.scaleX).toBeCloseTo(1, 10)
    expect(text.scaleY).toBeCloseTo(1, 10)
  }
})

test('после изменения масштаба и положения холста прилипает в тех же координатах сцены', async({
  activeSelectionTextScaleSetup: setup,
  editorModel,
  selection,
  snapping
}) => {
  const viewportBefore = await editorModel.getCanvasViewportTransform()

  await editorModel.zoomInUntilViewportCanMove()
  await editorModel.dragViewportBySpaceMouse({ deltaX: -24, deltaY: -18 })

  const viewportAfter = await editorModel.getCanvasViewportTransform()

  expect(viewportAfter.zoom).toBeGreaterThan(viewportBefore.zoom)
  expect(viewportAfter.x).not.toBeCloseTo(viewportBefore.x, 5)
  expect(viewportAfter.y).not.toBeCloseTo(viewportBefore.y, 5)

  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.initial.selection.centerY }
  })

  const live = await selection.getTextCompositionSnapshot()
  const guideState = await snapping.getGuideState()

  expect(live.selection.boundsLeft).toBeCloseTo(setup.initial.selection.boundsLeft, 5)
  expect(live.selection.boundsRight).toBeCloseTo(setup.guides.right, 2)
  expect(guideState.guides).toEqual([{ type: 'vertical', position: setup.guides.right }])
  expect(guideState.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
  const committed = await selection.getTextCompositionSnapshot()

  expect(committed.selection.boundsRight).toBeCloseTo(live.selection.boundsRight, 5)
  for (const text of committed.children) {
    expect(text.scaleX).toBeCloseTo(1, 10)
    expect(text.scaleY).toBeCloseTo(1, 10)
  }
})
