import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'

/** Угол общего выделения в проверке скейлинга после поворота. */
const ACTIVE_SELECTION_ROTATION_DEGREES = 30

test('без Shift пропорционально меняет размеры за угол и сохраняет состояние текста', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  shapes,
  snapping
}) => {
  const initialTexts = await Promise.all(setup.shapeIds.map((id) => shapes.getTextNode({ id })))

  await selection.scaling.startFromControl({ control: 'br' })
  const live = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom }
  })
  const liveShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
  const liveTexts = await Promise.all(setup.shapeIds.map((id) => shapes.getTextNode({ id })))
  const guides = await snapping.getGuideState()

  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 2)
  expect(live.boundsBottom).toBeCloseTo(setup.guides.bottom, 2)
  expect(live.scaleX).toBeCloseTo(live.scaleY, 5)
  expect(guides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.guides.right },
    { type: 'horizontal', position: setup.guides.bottom }
  ]))
  expect(guides.guides).toHaveLength(2)
  expect(guides.spacingGuides).toHaveLength(0)

  for (const [index, shape] of liveShapes.entries()) {
    const initialText = initialTexts[index]
    const liveText = liveTexts[index]
    if (!initialText || !liveText) throw new Error('Текст должен существовать в обоих шейпах')

    expect(shape.width).toBeGreaterThan(0)
    expect(shape.height).toBeGreaterThan(0)
    expect(shape.scaleX).toBeCloseTo(1, 10)
    expect(shape.scaleY).toBeCloseTo(1, 10)
    expect(liveText.fontSize).toBe(initialText.fontSize)
    expect(liveText.lineCount).toBe(initialText.lineCount)
  }

  await selection.scaling.finish()
})

test('с Shift свободно меняет ширину и высоту за угол', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  shapes,
  snapping
}) => {
  const pointerBottom = setup.guides.bottom + (20 * setup.scenePixel)

  await selection.scaling.startFromControl({ control: 'br' })
  const live = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: pointerBottom },
    shiftKey: true
  })
  const liveShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
  const guides = await snapping.getGuideState()

  expect(live.boundsLeft).toBeCloseTo(setup.initial.selection.boundsLeft, 5)
  expect(live.boundsTop).toBeCloseTo(setup.initial.selection.boundsTop, 5)
  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 2)
  expect(Math.abs(live.boundsBottom - pointerBottom)).toBeLessThan(setup.scenePixel)
  expect(live.scaleX).not.toBeCloseTo(live.scaleY, 3)
  expect(guides.guides).toEqual([{
    type: 'vertical',
    position: setup.guides.right
  }])
  expect(guides.spacingGuides).toHaveLength(0)
  for (const shape of liveShapes) {
    expect(shape.width).toBeGreaterThan(0)
    expect(shape.height).toBeGreaterThan(0)
    expect(shape.scaleX).toBeCloseTo(1, 10)
    expect(shape.scaleY).toBeCloseTo(1, 10)
  }

  await selection.scaling.finish()
})

test('при свободном скейлинге отпускает направляющие независимо по каждой оси', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'br' })
  const acquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom },
    shiftKey: true
  })
  const releasedX = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right + (30 * setup.scenePixel),
      y: setup.guides.bottom + (2 * setup.scenePixel)
    },
    shiftKey: true
  })
  const heldYGuides = await snapping.getGuideState()

  expect(Math.abs(releasedX.boundsRight - acquired.boundsRight))
    .toBeGreaterThan(20 * setup.scenePixel)
  expect(releasedX.boundsBottom).toBeCloseTo(acquired.boundsBottom, 5)
  expect(heldYGuides.guides).toEqual([{
    type: 'horizontal',
    position: setup.guides.bottom
  }])

  const releasedBoth = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right + (30 * setup.scenePixel),
      y: setup.guides.bottom + (30 * setup.scenePixel)
    },
    shiftKey: true
  })
  const releasedGuides = await snapping.getGuideState()

  expect(Math.abs(releasedBoth.boundsBottom - acquired.boundsBottom))
    .toBeGreaterThan(20 * setup.scenePixel)
  expect(releasedGuides.guides).toHaveLength(0)
  expect(releasedGuides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})

test('при скейлинге за боковую ручку относительно центра сохраняет центр', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ centered: true, control: 'mr' })
  const live = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.initial.selection.centerY }
  })
  const guides = await snapping.getGuideState()

  expect(live.boundsLeft).toBeCloseTo(setup.guides.left, 5)
  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(live.centerX).toBeCloseTo(setup.initial.selection.centerX, 5)
  expect(live.centerY).toBeCloseTo(setup.initial.selection.centerY, 5)
  expect(live.scaleY).toBeCloseTo(setup.initial.selection.scaleY, 5)
  expect(guides.guides).toHaveLength(1)
  expect(guides.guides[0]?.type).toBe('vertical')
  expect([setup.guides.left, setup.guides.right]).toContain(guides.guides[0]?.position)
  expect(guides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})

test('при скейлинге за угол относительно центра сохраняет центр и прилипает по обеим осям', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ centered: true, control: 'br' })
  const live = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom }
  })
  const guides = await snapping.getGuideState()
  const verticalGuides = guides.guides.filter(({ type }) => type === 'vertical')
  const horizontalGuides = guides.guides.filter(({ type }) => type === 'horizontal')

  expect(live.boundsLeft).toBeCloseTo(setup.guides.left, 2)
  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 2)
  expect(live.boundsTop).toBeCloseTo(setup.guides.top, 2)
  expect(live.boundsBottom).toBeCloseTo(setup.guides.bottom, 2)
  expect(live.centerX).toBeCloseTo(setup.initial.selection.centerX, 5)
  expect(live.centerY).toBeCloseTo(setup.initial.selection.centerY, 5)
  expect(guides.guides).toHaveLength(2)
  expect(verticalGuides).toHaveLength(1)
  expect(horizontalGuides).toHaveLength(1)
  expect(guides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})

test('повёрнутое общее выделение прилипает при скейлинге за угол', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  shapes,
  snapping
}) => {
  await selection.setAngle({ angle: ACTIVE_SELECTION_ROTATION_DEGREES })
  const rotated = await selection.getCompositionSnapshot()
  const fixedPoint = await selection.scaling.getControlScenePoint({ control: 'tl' })
  const movingPoint = await selection.scaling.getControlScenePoint({ control: 'br' })
  const multiplier = (setup.guides.right - fixedPoint.x)
    / (rotated.selection.boundsRight - fixedPoint.x)

  expect(multiplier).toBeGreaterThan(0)
  expect(multiplier).not.toBeCloseTo(1, 5)

  await selection.scaling.startFromControl({ control: 'br' })
  const live = await selection.scaling.dragControlToScenePoint({
    point: {
      x: fixedPoint.x + ((movingPoint.x - fixedPoint.x) * multiplier),
      y: fixedPoint.y + ((movingPoint.y - fixedPoint.y) * multiplier)
    }
  })
  const fixedAfter = await selection.scaling.getControlScenePoint({ control: 'tl' })
  const guides = await snapping.getGuideState()
  const liveShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))

  expect(live.angle).toBeCloseTo(ACTIVE_SELECTION_ROTATION_DEGREES, 5)
  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 2)
  expect(fixedAfter.x).toBeCloseTo(fixedPoint.x, 5)
  expect(fixedAfter.y).toBeCloseTo(fixedPoint.y, 5)
  expect(guides.guides).toEqual(expect.arrayContaining([{
    type: 'vertical',
    position: setup.guides.right
  }]))
  expect(guides.spacingGuides).toHaveLength(0)
  for (const shape of liveShapes) {
    expect(shape.scaleX).toBeCloseTo(1, 10)
    expect(shape.scaleY).toBeCloseTo(1, 10)
  }

  const committed = await selection.scaling.finish()
  const committedComposition = await selection.getCompositionSnapshot()

  expect(committed.angle).toBeCloseTo(ACTIVE_SELECTION_ROTATION_DEGREES, 5)
  expect(committedComposition.selection.angle).toBeCloseTo(ACTIVE_SELECTION_ROTATION_DEGREES, 5)
  for (const child of committedComposition.children) {
    expect(child.angle).toBeCloseTo(0, 5)
  }

  expect(committedComposition.children).toHaveLength(setup.shapeIds.length)
})

test('повёрнутое выделение сохраняет геометрию после скейлинга за боковую ручку', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  shapes,
  snapping
}) => {
  await selection.setAngle({ angle: ACTIVE_SELECTION_ROTATION_DEGREES })
  const rotated = await selection.getCompositionSnapshot()
  const initialShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
  const fixedPoint = await selection.scaling.getControlScenePoint({ control: 'ml' })
  const movingPoint = await selection.scaling.getControlScenePoint({ control: 'mr' })
  const rightOffset = rotated.selection.boundsRight - movingPoint.x
  const multiplier = (setup.guides.right - fixedPoint.x - rightOffset)
    / (movingPoint.x - fixedPoint.x)
  const targetPoint = {
    x: fixedPoint.x + ((movingPoint.x - fixedPoint.x) * multiplier),
    y: fixedPoint.y + ((movingPoint.y - fixedPoint.y) * multiplier)
  }

  expect(multiplier).toBeGreaterThan(0)
  expect(multiplier).not.toBeCloseTo(1, 5)

  await selection.scaling.startFromControl({ control: 'mr' })
  const live = await selection.scaling.dragControlToScenePoint({ point: targetPoint })
  const liveFixedPoint = await selection.scaling.getControlScenePoint({ control: 'ml' })
  const liveMovingPoint = await selection.scaling.getControlScenePoint({ control: 'mr' })
  const guides = await snapping.getGuideState()
  const committed = await selection.scaling.finish()
  const committedFixedPoint = await selection.scaling.getControlScenePoint({ control: 'ml' })
  const committedMovingPoint = await selection.scaling.getControlScenePoint({ control: 'mr' })
  const committedShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))

  expect(live.angle).toBeCloseTo(ACTIVE_SELECTION_ROTATION_DEGREES, 5)
  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 2)
  expect(live.scaleY).toBeCloseTo(rotated.selection.scaleY, 5)
  expect(liveFixedPoint.x).toBeCloseTo(fixedPoint.x, 5)
  expect(liveFixedPoint.y).toBeCloseTo(fixedPoint.y, 5)
  expect(guides.guides).toEqual([{ type: 'vertical', position: setup.guides.right }])
  expect(guides.spacingGuides).toHaveLength(0)
  expect(committed.angle).toBeCloseTo(live.angle, 5)
  expect(committedFixedPoint.x).toBeCloseTo(liveFixedPoint.x, 5)
  expect(committedFixedPoint.y).toBeCloseTo(liveFixedPoint.y, 5)
  expect(committedMovingPoint.x).toBeCloseTo(liveMovingPoint.x, 5)
  expect(committedMovingPoint.y).toBeCloseTo(liveMovingPoint.y, 5)
  for (const [index, shape] of committedShapes.entries()) {
    const initialShape = initialShapes[index]
    if (!initialShape) throw new Error('Исходная геометрия должна существовать для обоих шейпов')

    expect(shape.width).not.toBeCloseTo(initialShape.width, 3)
    expect(shape.height).toBeCloseTo(initialShape.height, 5)
    expect(shape.scaleX).toBeCloseTo(1, 10)
    expect(shape.scaleY).toBeCloseTo(1, 10)
  }
})

test('повёрнутое выделение сохраняет геометрию после свободного скейлинга за угол', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  shapes,
  snapping
}) => {
  await selection.setAngle({ angle: ACTIVE_SELECTION_ROTATION_DEGREES })
  const initialShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
  const fixedPoint = await selection.scaling.getControlScenePoint({ control: 'tl' })
  const live = await selection.scaling.scaleFreelyFromBottomRightToBounds({
    right: setup.guides.right,
    bottom: setup.guides.bottom
  })
  const liveFixedPoint = await selection.scaling.getControlScenePoint({ control: 'tl' })
  const liveMovingPoint = await selection.scaling.getControlScenePoint({ control: 'br' })
  const guides = await snapping.getGuideState()
  const committed = await selection.scaling.finish()
  const committedFixedPoint = await selection.scaling.getControlScenePoint({ control: 'tl' })
  const committedMovingPoint = await selection.scaling.getControlScenePoint({ control: 'br' })
  const committedShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))

  expect(live.angle).toBeCloseTo(ACTIVE_SELECTION_ROTATION_DEGREES, 5)
  expect(live.scaleX).not.toBeCloseTo(live.scaleY, 3)
  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 2)
  expect(live.boundsBottom).toBeCloseTo(setup.guides.bottom, 2)
  expect(liveFixedPoint.x).toBeCloseTo(fixedPoint.x, 5)
  expect(liveFixedPoint.y).toBeCloseTo(fixedPoint.y, 5)
  expect(guides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.guides.right },
    { type: 'horizontal', position: setup.guides.bottom }
  ]))
  expect(guides.guides).toHaveLength(2)
  expect(guides.spacingGuides).toHaveLength(0)
  expect(committed.angle).toBeCloseTo(live.angle, 5)
  expect(committedFixedPoint.x).toBeCloseTo(liveFixedPoint.x, 5)
  expect(committedFixedPoint.y).toBeCloseTo(liveFixedPoint.y, 5)
  expect(committedMovingPoint.x).toBeCloseTo(liveMovingPoint.x, 5)
  expect(committedMovingPoint.y).toBeCloseTo(liveMovingPoint.y, 5)
  for (const [index, shape] of committedShapes.entries()) {
    const initialShape = initialShapes[index]
    if (!initialShape) throw new Error('Исходная геометрия должна существовать для обоих шейпов')

    expect(shape.width).not.toBeCloseTo(initialShape.width, 3)
    expect(shape.height).not.toBeCloseTo(initialShape.height, 3)
    expect(shape.scaleX).toBeCloseTo(1, 10)
    expect(shape.scaleY).toBeCloseTo(1, 10)
  }
})

test('после фиксации повёрнутое выделение из шейпов снова прилипает', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.setAngle({ angle: ACTIVE_SELECTION_ROTATION_DEGREES })
  const rotated = await selection.getCompositionSnapshot()
  const fixedPoint = await selection.scaling.getControlScenePoint({ control: 'tl' })
  const movingPoint = await selection.scaling.getControlScenePoint({ control: 'br' })
  const multiplier = (setup.guides.right - fixedPoint.x)
    / (rotated.selection.boundsRight - fixedPoint.x)

  expect(multiplier).toBeGreaterThan(0)
  expect(multiplier).not.toBeCloseTo(1, 5)

  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({
    point: {
      x: fixedPoint.x + ((movingPoint.x - fixedPoint.x) * multiplier),
      y: fixedPoint.y + ((movingPoint.y - fixedPoint.y) * multiplier)
    }
  })
  await selection.scaling.finish()

  const secondFixedPoint = await selection.scaling.getControlScenePoint({ control: 'tl' })
  const secondMovingPoint = await selection.scaling.getControlScenePoint({ control: 'br' })

  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({
    ctrlKey: true,
    point: {
      x: secondFixedPoint.x + ((secondMovingPoint.x - secondFixedPoint.x) * 0.9),
      y: secondFixedPoint.y + ((secondMovingPoint.y - secondFixedPoint.y) * 0.9)
    }
  })
  const reacquired = await selection.scaling.dragControlToScenePoint({
    point: secondMovingPoint
  })
  const secondGuides = await snapping.getGuideState()

  expect(reacquired.angle).toBeCloseTo(ACTIVE_SELECTION_ROTATION_DEGREES, 5)
  expect(reacquired.boundsRight).toBeCloseTo(setup.guides.right, 2)
  expect(secondGuides.guides).toEqual(expect.arrayContaining([{
    type: 'vertical',
    position: setup.guides.right
  }]))

  await selection.scaling.finish()
})

test('при нескольких шагах наклона не пересчитывает размер шейпов и очищает гайды', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  shapes,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.initial.selection.centerY }
  })

  await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: setup.initial.selection.centerY + (30 * setup.scenePixel)
    },
    shiftKey: true
  })
  const firstSkewShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
  const firstSkewGuides = await snapping.getGuideState()

  await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: setup.initial.selection.centerY + (36 * setup.scenePixel)
    },
    shiftKey: true
  })
  const secondSkewShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
  const secondSkewGuides = await snapping.getGuideState()

  for (const [index, shape] of secondSkewShapes.entries()) {
    const firstSkewShape = firstSkewShapes[index]
    if (!firstSkewShape) throw new Error('Первый шаг наклона должен содержать оба шейпа')

    expect(shape.width).toBeCloseTo(firstSkewShape.width, 5)
    expect(shape.height).toBeCloseTo(firstSkewShape.height, 5)
    expect(shape.scaleX).toBeCloseTo(firstSkewShape.scaleX, 10)
    expect(shape.scaleY).toBeCloseTo(firstSkewShape.scaleY, 10)
  }
  expect(firstSkewGuides).toEqual({ guides: [], spacingGuides: [] })
  expect(secondSkewGuides).toEqual({ guides: [], spacingGuides: [] })

  await selection.scaling.cancelWithPointerEvent()
})

test('после возврата к скейлингу повторный наклон не меняет размер шейпов', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  shapes,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.initial.selection.centerY }
  })
  await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: setup.initial.selection.centerY + (30 * setup.scenePixel)
    },
    shiftKey: true
  })

  const scaleAfterSkewX = setup.guides.right + (8 * setup.scenePixel)

  await selection.scaling.dragControlToScenePoint({
    point: {
      x: scaleAfterSkewX,
      y: setup.initial.selection.centerY
    }
  })
  const rescaledShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))

  await selection.scaling.dragControlToScenePoint({
    point: {
      x: scaleAfterSkewX,
      y: setup.initial.selection.centerY + (42 * setup.scenePixel)
    },
    shiftKey: true
  })
  const repeatedSkewShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
  const repeatedSkewGuides = await snapping.getGuideState()

  for (const [index, shape] of repeatedSkewShapes.entries()) {
    const rescaledShape = rescaledShapes[index]
    if (!rescaledShape) throw new Error('Повторный скейлинг должен содержать оба шейпа')

    expect(shape.width).toBeCloseTo(rescaledShape.width, 5)
    expect(shape.height).toBeCloseTo(rescaledShape.height, 5)
    expect(shape.scaleX).toBeCloseTo(rescaledShape.scaleX, 10)
    expect(shape.scaleY).toBeCloseTo(rescaledShape.scaleY, 10)
  }
  expect(repeatedSkewGuides).toEqual({ guides: [], spacingGuides: [] })

  await selection.scaling.cancelWithPointerEvent()
})

test('после завершения наклон остаётся на общей рамке без скачка геометрии', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  shapes,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.initial.selection.centerY }
  })
  await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: setup.initial.selection.centerY + (30 * setup.scenePixel)
    },
    shiftKey: true
  })

  const beforeCommit = await selection.getCompositionSnapshot()

  await selection.scaling.cancelWithPointerEvent()

  const committed = await selection.getCompositionSnapshot()
  const committedSkew = await selection.getSkew()
  const committedShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
  const guides = await snapping.getGuideState()

  expect(
    Math.abs(committedSkew.skewX) > 0.00001
      || Math.abs(committedSkew.skewY) > 0.00001
  ).toBe(true)
  expect(committed.children.every(({ skewX, skewY }) => {
    return Math.abs(skewX) <= 0.00001 && Math.abs(skewY) <= 0.00001
  })).toBe(true)
  expect(committed.selection.boundsLeft).toBeCloseTo(beforeCommit.selection.boundsLeft, 5)
  expect(committed.selection.boundsTop).toBeCloseTo(beforeCommit.selection.boundsTop, 5)
  expect(committed.selection.boundsRight).toBeCloseTo(beforeCommit.selection.boundsRight, 5)
  expect(committed.selection.boundsBottom).toBeCloseTo(beforeCommit.selection.boundsBottom, 5)
  for (const shape of committedShapes) {
    expect(shape.width).toBeGreaterThan(0)
    expect(shape.height).toBeGreaterThan(0)
    expect(shape.scaleX).toBeCloseTo(1, 10)
    expect(shape.scaleY).toBeCloseTo(1, 10)
  }
  expect(guides.guides).toHaveLength(0)
  expect(guides.spacingGuides).toHaveLength(0)
})

test('после изменения масштаба и положения холста прилипает в тех же координатах сцены', async({
  activeSelectionShapeScaleSetup: setup,
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

  await selection.scaling.startFromControl({ control: 'br' })
  const live = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom }
  })
  const guides = await snapping.getGuideState()

  expect(live.boundsLeft).toBeCloseTo(setup.initial.selection.boundsLeft, 5)
  expect(live.boundsTop).toBeCloseTo(setup.initial.selection.boundsTop, 5)
  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 2)
  expect(live.boundsBottom).toBeCloseTo(setup.guides.bottom, 2)
  expect(guides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.guides.right },
    { type: 'horizontal', position: setup.guides.bottom }
  ]))
  expect(guides.guides).toHaveLength(2)
  expect(guides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})
