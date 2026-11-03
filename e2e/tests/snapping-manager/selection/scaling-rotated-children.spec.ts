import { test, expect } from '../../../fixtures/editor.fixture'
import {
  AXIS_ALIGNED_CHILD_ANGLES,
  ROTATED_SELECTION_SCENE,
  SELECTION_CORNER_HANDLES,
  SELECTION_SCALE_DRAG,
  TEXT_SELECTION_SCENE
} from '../../../fixtures/data/rotated-selection.data'

test.describe('Selection with an individually rotated object', () => {
  test.beforeEach(async({ editorModel, shapes, text }) => {
    const montage = await editorModel.getMontageAreaBounds()
    const { rotatedSquare, rotatedText, plainSquare } = ROTATED_SELECTION_SCENE
    await shapes.add({
      presetKey: 'square',
      options: {
        id: rotatedSquare.id,
        left: montage.left + rotatedSquare.left,
        top: montage.top + rotatedSquare.top,
        width: rotatedSquare.size,
        height: rotatedSquare.size,
        withoutSelection: true
      }
    })
    await shapes.setAngle({ id: rotatedSquare.id, angle: rotatedSquare.angle })
    await text.add({ ...rotatedText, left: montage.left + rotatedText.left, top: montage.top + rotatedText.top })
    await shapes.add({
      presetKey: 'square',
      options: {
        id: plainSquare.id,
        left: montage.left + plainSquare.left,
        top: montage.top + plainSquare.top,
        width: plainSquare.size,
        height: plainSquare.size,
        withoutSelection: true
      }
    })
    await editorModel.selectAllObjects()
  })

  test('shows only the corner handles', async({ selection }) => {
    const { availableScaleHandles } = await selection.scaling.getCapability()

    expect(availableScaleHandles).toEqual([...SELECTION_CORNER_HANDLES])
  })

  test('scales every object proportionally from a corner, also with Shift held', async({ selection }) => {
    const before = await selection.getChildSceneGeometry()
    await selection.scaling.startFromControl({ control: 'br', shiftKey: true })
    await selection.scaling.dragControlBy(SELECTION_SCALE_DRAG)
    await selection.scaling.finish()
    const after = await selection.getChildSceneGeometry()
    const growth = after[0].topEdgeLength / before[0].topEdgeLength

    expect(growth).toBeGreaterThan(1)
    for (const child of after) {
      const initial = before.find(({ id }) => id === child.id)
      if (!initial) throw new Error(`The selection must still contain ${child.id}`)

      await test.step(`${child.id} keeps its angle and proportions`, async() => {
        expect(child.sceneAngle).toBeCloseTo(initial.sceneAngle, 4)
        expect(child.orthogonality).toBeCloseTo(0, 4)
        expect(child.topEdgeLength / initial.topEdgeLength).toBeCloseTo(growth, 3)
        expect(child.leftEdgeLength / initial.leftEdgeLength).toBeCloseTo(growth, 3)
      })
    }
  })
})

test('a shape selection with a rotated shape stays proportional from a corner with Shift', async({
  editorModel, selection, shapes
}) => {
  const montage = await editorModel.getMontageAreaBounds()
  for (const { id, left, top, size } of [ROTATED_SELECTION_SCENE.rotatedSquare, ROTATED_SELECTION_SCENE.plainSquare]) {
    await shapes.add({
      presetKey: 'square',
      options: { id, left: montage.left + left, top: montage.top + top, width: size, height: size, withoutSelection: true }
    })
  }
  await shapes.setAngle({ id: ROTATED_SELECTION_SCENE.rotatedSquare.id, angle: ROTATED_SELECTION_SCENE.rotatedSquare.angle })
  await editorModel.selectAllObjects()
  const before = await selection.getChildSceneGeometry()

  await selection.scaling.startFromControl({ control: 'br', shiftKey: true })
  await selection.scaling.dragControlBy(SELECTION_SCALE_DRAG)
  await selection.scaling.finish()

  for (const child of await selection.getChildSceneGeometry()) {
    const initial = before.find(({ id }) => id === child.id)
    if (!initial) throw new Error(`The selection must still contain ${child.id}`)

    expect(child.topEdgeLength / initial.topEdgeLength)
      .toBeCloseTo(child.leftEdgeLength / initial.leftEdgeLength, 3)
    expect(child.sceneAngle).toBeCloseTo(initial.sceneAngle, 4)
    expect(child.orthogonality).toBeCloseTo(0, 4)
  }
})

test('a selection gets its side handles back when the rotated object is removed from it', async({
  editorModel, selection, shapes, text
}) => {
  const montage = await editorModel.getMontageAreaBounds()
  const { rotatedSquare } = ROTATED_SELECTION_SCENE
  for (const params of TEXT_SELECTION_SCENE) {
    await text.add({ ...params, left: montage.left + params.left, top: montage.top + params.top })
  }
  await shapes.add({
    presetKey: 'square',
    options: {
      id: rotatedSquare.id,
      left: montage.left + rotatedSquare.left + 200,
      top: montage.top + rotatedSquare.top,
      width: rotatedSquare.size,
      height: rotatedSquare.size,
      withoutSelection: true
    }
  })
  await shapes.setAngle({ id: rotatedSquare.id, angle: rotatedSquare.angle })
  await editorModel.selectAllObjects()
  expect((await selection.scaling.getCapability()).availableScaleHandles).toEqual([...SELECTION_CORNER_HANDLES])

  await selection.removeChild({ id: rotatedSquare.id })
  expect((await selection.scaling.getCapability()).availableScaleHandles)
    .toEqual([...SELECTION_CORNER_HANDLES, 'ml', 'mr'])

  const before = await selection.getTextCompositionSnapshot()
  await selection.scaling.startFromControl({ control: 'br', shiftKey: true })
  await selection.scaling.dragControlBy(SELECTION_SCALE_DRAG)
  await selection.scaling.finish()
  const after = await selection.getTextCompositionSnapshot()

  for (const textChild of after.children) {
    const initial = before.children.find(({ id }) => id === textChild.id)
    if (!initial) throw new Error(`The selection must still contain ${textChild.id}`)

    expect(textChild.scaleX).toBeCloseTo(1, 10)
    expect(textChild.scaleY).toBeCloseTo(1, 10)
    expect(textChild.width).toBeGreaterThan(initial.width)
  }
})

test('a text rotated by a quarter turn keeps the side handles hidden', async({ editorModel, selection, text }) => {
  const montage = await editorModel.getMontageAreaBounds()
  const [first, second] = TEXT_SELECTION_SCENE
  await text.add({ ...first, left: montage.left + first.left, top: montage.top + first.top, angle: 90 })
  await text.add({ ...second, left: montage.left + second.left + 120, top: montage.top + second.top })
  await editorModel.selectAllObjects()

  expect((await selection.scaling.getCapability()).availableScaleHandles).toEqual([...SELECTION_CORNER_HANDLES])
})

test.describe('Selection whose objects stay aligned with its axes', () => {
  test.beforeEach(async({ editorModel, shapes }) => {
    const montage = await editorModel.getMontageAreaBounds()
    for (const { id, left, top, size } of [ROTATED_SELECTION_SCENE.rotatedSquare, ROTATED_SELECTION_SCENE.plainSquare]) {
      await shapes.add({
        presetKey: 'square',
        options: { id, left: montage.left + left, top: montage.top + top, width: size, height: size, withoutSelection: true }
      })
    }
  })

  for (const angle of AXIS_ALIGNED_CHILD_ANGLES) {
    test(`keeps its side handles when a child is rotated by ${angle}°`, async({ editorModel, selection, shapes }) => {
      await shapes.setAngle({ id: ROTATED_SELECTION_SCENE.rotatedSquare.id, angle })
      await editorModel.selectAllObjects()

      expect((await selection.scaling.getCapability()).availableScaleHandles)
        .toEqual(expect.arrayContaining(['ml', 'mr', 'mt', 'mb']))
    })
  }

  test('keeps its side handles when the whole selection is rotated', async({ editorModel, selection }) => {
    await editorModel.selectAllObjects()
    await selection.setAngle({ angle: 30 })

    expect((await selection.scaling.getCapability()).availableScaleHandles)
      .toEqual(expect.arrayContaining(['ml', 'mr', 'mt', 'mb']))
  })
})

test.describe('Selection of texts with Shift on a side handle', () => {
  test.beforeEach(async({ editorModel, text }) => {
    const montage = await editorModel.getMontageAreaBounds()
    for (const params of TEXT_SELECTION_SCENE) {
      await text.add({ ...params, left: montage.left + params.left, top: montage.top + params.top })
    }
    await editorModel.selectAllObjects()
  })

  test('keeps resizing the width without skew when Shift is held from the start', async({ selection }) => {
    const before = await selection.getChildSceneGeometry()
    await selection.scaling.startFromControl({ control: 'mr', shiftKey: true })
    await selection.scaling.dragControlBy(SELECTION_SCALE_DRAG)
    await selection.scaling.finish()
    const after = await selection.getChildSceneGeometry()

    for (const child of after) {
      const initial = before.find(({ id }) => id === child.id)
      if (!initial) throw new Error(`The selection must still contain ${child.id}`)

      expect(child.skewX).toBe(0)
      expect(child.skewY).toBe(0)
      expect(child.sceneAngle).toBeCloseTo(0, 4)
      expect(child.orthogonality).toBeCloseTo(0, 4)
    }
    expect(Math.max(...after.map(({ topEdgeLength }) => topEdgeLength)))
      .toBeGreaterThan(Math.max(...before.map(({ topEdgeLength }) => topEdgeLength)))
  })

  test('keeps resizing the width when Shift is pressed during the drag', async({ page, selection }) => {
    await selection.scaling.startFromControl({ control: 'mr' })
    const resized = await selection.scaling.dragControlBy({ deltaX: 40, deltaY: 0, pointerSteps: 3 })
    await page.keyboard.down('Shift')
    const continued = await selection.scaling.dragControlBy({ deltaX: 40, deltaY: 30, pointerSteps: 3 })
    await page.keyboard.up('Shift')
    await selection.scaling.finish()
    const after = await selection.getChildSceneGeometry()

    expect(continued.boundsWidth).toBeGreaterThan(resized.boundsWidth)
    for (const child of after) {
      expect(child.skewX).toBe(0)
      expect(child.orthogonality).toBeCloseTo(0, 4)
    }
  })
})
