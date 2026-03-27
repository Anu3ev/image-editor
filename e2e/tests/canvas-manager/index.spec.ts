import { test, expect } from '../../fixtures/editor.fixture'
import {
  CANVAS_RESOLUTION_LARGE_SIZE,
  CANVAS_RESOLUTION_SHAPE_OPTIONS,
  CANVAS_RESOLUTION_TEXT_OPTIONS,
  CANVAS_RESOLUTION_UPDATED_HEIGHT,
  CANVAS_RESOLUTION_UPDATED_WIDTH
} from '../../fixtures/data/object-placement.data'

test.describe('Изменение монтажной области', () => {
  test.beforeEach(async({ shapes, text }) => {
    const shape = await shapes.add({
      presetKey: 'square',
      options: CANVAS_RESOLUTION_SHAPE_OPTIONS
    })

    shapes.checkCreation({
      shape,
      presetKey: 'square'
    })

    const textObject = await text.add(CANVAS_RESOLUTION_TEXT_OPTIONS)

    text.checkCreation({ textObject })
  })

  test('после изменения ширины монтажной области объекты сохраняют свои координаты сцены', async({
    canvas,
    editorModel,
    shapes,
    text
  }) => {
    const initialShape = await test.step('Получить исходное положение фигуры', () => {
      return shapes.getObject({ id: CANVAS_RESOLUTION_SHAPE_OPTIONS.id })
    })
    const initialText = await test.step('Получить исходное положение текста', () => {
      return text.getObject({ id: CANVAS_RESOLUTION_TEXT_OPTIONS.id })
    })

    await test.step('Изменить ширину монтажной области', async() => {
      await canvas.setMontageResolution({ width: CANVAS_RESOLUTION_UPDATED_WIDTH })
    })

    await test.step('Проверить что монтажная область стала шире, а объекты остались на месте', async() => {
      const montageBounds = await editorModel.getMontageAreaBounds()
      const currentShape = await shapes.getObject({ id: CANVAS_RESOLUTION_SHAPE_OPTIONS.id })
      const currentText = await text.getObject({ id: CANVAS_RESOLUTION_TEXT_OPTIONS.id })

      expect(montageBounds.width).toBe(CANVAS_RESOLUTION_UPDATED_WIDTH)
      expect(currentShape?.left).toBeCloseTo(initialShape?.left ?? 0, 1)
      expect(currentShape?.top).toBeCloseTo(initialShape?.top ?? 0, 1)
      expect(currentText?.left).toBeCloseTo(initialText?.left ?? 0, 1)
      expect(currentText?.top).toBeCloseTo(initialText?.top ?? 0, 1)
    })
  })

  test('после изменения высоты монтажной области объекты сохраняют свои координаты сцены', async({
    canvas,
    editorModel,
    shapes,
    text
  }) => {
    const initialShape = await test.step('Получить исходное положение фигуры', () => {
      return shapes.getObject({ id: CANVAS_RESOLUTION_SHAPE_OPTIONS.id })
    })
    const initialText = await test.step('Получить исходное положение текста', () => {
      return text.getObject({ id: CANVAS_RESOLUTION_TEXT_OPTIONS.id })
    })

    await test.step('Изменить высоту монтажной области', async() => {
      await canvas.setMontageResolution({ height: CANVAS_RESOLUTION_UPDATED_HEIGHT })
    })

    await test.step('Проверить что монтажная область стала выше, а объекты остались на месте', async() => {
      const montageBounds = await editorModel.getMontageAreaBounds()
      const currentShape = await shapes.getObject({ id: CANVAS_RESOLUTION_SHAPE_OPTIONS.id })
      const currentText = await text.getObject({ id: CANVAS_RESOLUTION_TEXT_OPTIONS.id })

      expect(montageBounds.height).toBe(CANVAS_RESOLUTION_UPDATED_HEIGHT)
      expect(currentShape?.left).toBeCloseTo(initialShape?.left ?? 0, 1)
      expect(currentShape?.top).toBeCloseTo(initialShape?.top ?? 0, 1)
      expect(currentText?.left).toBeCloseTo(initialText?.left ?? 0, 1)
      expect(currentText?.top).toBeCloseTo(initialText?.top ?? 0, 1)
    })
  })

  test('undo после изменения resolution возвращает прежний размер монтажной области и не сдвигает объекты', async({
    canvas,
    editorModel,
    history,
    shapes,
    text
  }) => {
    const initialMontageBounds = await test.step('Получить исходный размер монтажной области', () => {
      return editorModel.getMontageAreaBounds()
    })
    const initialShape = await test.step('Получить исходное положение фигуры', () => {
      return shapes.getObject({ id: CANVAS_RESOLUTION_SHAPE_OPTIONS.id })
    })
    const initialText = await test.step('Получить исходное положение текста', () => {
      return text.getObject({ id: CANVAS_RESOLUTION_TEXT_OPTIONS.id })
    })

    await test.step('Изменить ширину монтажной области', async() => {
      await canvas.setMontageResolution({ width: CANVAS_RESOLUTION_UPDATED_WIDTH })
    })

    await test.step('Сделать undo', async() => {
      await history.undo()
    })

    await test.step('Проверить что размер монтажной области и положение объектов вернулись', async() => {
      const restoredMontageBounds = await editorModel.getMontageAreaBounds()
      const restoredShape = await shapes.getObject({ id: CANVAS_RESOLUTION_SHAPE_OPTIONS.id })
      const restoredText = await text.getObject({ id: CANVAS_RESOLUTION_TEXT_OPTIONS.id })

      expect(restoredMontageBounds.width).toBeCloseTo(initialMontageBounds.width, 1)
      expect(restoredShape?.left).toBeCloseTo(initialShape?.left ?? 0, 1)
      expect(restoredShape?.top).toBeCloseTo(initialShape?.top ?? 0, 1)
      expect(restoredText?.left).toBeCloseTo(initialText?.left ?? 0, 1)
      expect(restoredText?.top).toBeCloseTo(initialText?.top ?? 0, 1)
    })
  })

  test('redo после изменения resolution снова меняет размер монтажной области и не сдвигает объекты', async({
    canvas,
    editorModel,
    history,
    shapes,
    text
  }) => {
    const initialShape = await test.step('Получить исходное положение фигуры', () => {
      return shapes.getObject({ id: CANVAS_RESOLUTION_SHAPE_OPTIONS.id })
    })
    const initialText = await test.step('Получить исходное положение текста', () => {
      return text.getObject({ id: CANVAS_RESOLUTION_TEXT_OPTIONS.id })
    })

    await test.step('Изменить ширину монтажной области и откатить изменение', async() => {
      await canvas.setMontageResolution({ width: CANVAS_RESOLUTION_UPDATED_WIDTH })
      await history.undo()
    })

    await test.step('Сделать redo', async() => {
      await history.redo()
    })

    await test.step('Проверить что новая ширина вернулась, а объекты остались на месте', async() => {
      const currentMontageBounds = await editorModel.getMontageAreaBounds()
      const currentShape = await shapes.getObject({ id: CANVAS_RESOLUTION_SHAPE_OPTIONS.id })
      const currentText = await text.getObject({ id: CANVAS_RESOLUTION_TEXT_OPTIONS.id })

      expect(currentMontageBounds.width).toBe(CANVAS_RESOLUTION_UPDATED_WIDTH)
      expect(currentShape?.left).toBeCloseTo(initialShape?.left ?? 0, 1)
      expect(currentShape?.top).toBeCloseTo(initialShape?.top ?? 0, 1)
      expect(currentText?.left).toBeCloseTo(initialText?.left ?? 0, 1)
      expect(currentText?.top).toBeCloseTo(initialText?.top ?? 0, 1)
    })
  })

  test('после изменения resolution zoom подстраивается под новую монтажную область', async({
    canvas,
    editorModel
  }) => {
    const initialCanvasState = await test.step('Получить исходное состояние canvas', () => {
      return editorModel.getCanvasState()
    })

    await test.step('Изменить размер монтажной области', async() => {
      await canvas.setMontageResolution(CANVAS_RESOLUTION_LARGE_SIZE)
    })

    await test.step('Проверить что zoom пересчитался и монтажная область помещается в canvas', async() => {
      const currentCanvasState = await editorModel.getCanvasState()
      const montageBounds = await editorModel.getMontageAreaBounds()

      expect(currentCanvasState.zoom).toBeLessThan(initialCanvasState.zoom)
      expect(montageBounds.width * currentCanvasState.zoom).toBeLessThan(currentCanvasState.width)
      expect(montageBounds.height * currentCanvasState.zoom).toBeLessThan(currentCanvasState.height)
    })
  })
})
