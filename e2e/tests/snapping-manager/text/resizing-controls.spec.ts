import { test, expect } from '../../../fixtures/editor.fixture'
import { SNAPPING_TOLERANCE } from '../../../fixtures/data/snapping.data'
import { TEXT_SIDE_RESIZE_CONTROL_CASES } from '../../../fixtures/data/text-resizing.data'
import {
  createTextResizeCreationSetup,
  createTextWidthResizeSetup,
  createTextWrapSnapCorrectionSetup
} from '../../../fixtures/text-width-resizing.fixture'

/** Ширина, при которой regression-текст гарантированно переносится ещё на одну строку. */
const TEXT_WRAP_RESIZE_WIDTH = 90

test.describe('Изменение ширины отдельного текста с прилипаниями', () => {
  for (const controlCase of TEXT_SIDE_RESIZE_CONTROL_CASES) {
    test(controlCase.title, async({ editorModel, shapes, text, snapping }) => {
      const setup = await createTextWidthResizeSetup({
        angle: controlCase.angle,
        axis: controlCase.axis,
        editorModel,
        shapes,
        side: controlCase.side,
        snapping,
        text
      })

      const live = await test.step('Подвести выбранную ручку к направляющей', async() => {
        return text.resizeSideToGuide({
          axis: controlCase.axis,
          position: setup.guidePosition,
          side: controlCase.side,
          id: setup.textId
        })
      })

      await test.step('Проверить геометрию текста и направляющую', async() => {
        const guideState = await snapping.getGuideState()

        expect(live[setup.movingEdge]).toBeCloseTo(setup.guidePosition, 5)
        expect(live.fontSize).toBe(setup.initial.fontSize)
        expect(live.paddingTop).toBe(setup.initial.paddingTop)
        expect(live.paddingRight).toBe(setup.initial.paddingRight)
        expect(live.paddingBottom).toBe(setup.initial.paddingBottom)
        expect(live.paddingLeft).toBe(setup.initial.paddingLeft)
        expect(live.radiusTopLeft).toBe(setup.initial.radiusTopLeft)
        expect(live.radiusTopRight).toBe(setup.initial.radiusTopRight)
        expect(live.radiusBottomRight).toBe(setup.initial.radiusBottomRight)
        expect(live.radiusBottomLeft).toBe(setup.initial.radiusBottomLeft)
        expect(live.scaleX).toBe(setup.initial.scaleX)
        expect(live.scaleY).toBe(setup.initial.scaleY)
        expect(live.angle).toBe(setup.initial.angle)
        expect(guideState.guides).toEqual(expect.arrayContaining([
          expect.objectContaining({
            type: controlCase.guideType,
            position: setup.guidePosition
          })
        ]))

        if (controlCase.side === 'right') {
          expect(live.leftCenterX).toBeCloseTo(setup.initial.leftCenterX, 5)
          expect(live.leftCenterY).toBeCloseTo(setup.initial.leftCenterY, 5)
        } else {
          expect(live.rightCenterX).toBeCloseTo(setup.initial.rightCenterX, 5)
          expect(live.rightCenterY).toBeCloseTo(setup.initial.rightCenterY, 5)
        }
      })
    })
  }

  test('при изменении ширины относительно центра обе стороны текста сдвигаются симметрично', async({
    editorModel,
    shapes,
    text,
    snapping
  }) => {
    const setup = await createTextWidthResizeSetup({
      angle: 30,
      axis: 'x',
      editorModel,
      shapes,
      side: 'right',
      snapping,
      text
    })
    const initialCenter = {
      x: (setup.initial.leftCenterX + setup.initial.rightCenterX) / 2,
      y: (setup.initial.leftCenterY + setup.initial.rightCenterY) / 2
    }

    const live = await text.resizeSideToGuide({
      axis: 'x',
      centered: true,
      position: setup.guidePosition,
      side: 'right',
      id: setup.textId
    })
    const guideState = await snapping.getGuideState()
    const liveCenter = {
      x: (live.leftCenterX + live.rightCenterX) / 2,
      y: (live.leftCenterY + live.rightCenterY) / 2
    }

    expect(live[setup.movingEdge]).toBeCloseTo(setup.guidePosition, 5)
    expect(liveCenter.x).toBeCloseTo(initialCenter.x, 5)
    expect(liveCenter.y).toBeCloseTo(initialCenter.y, 5)
    expect(live.leftCenterX).not.toBeCloseTo(setup.initial.leftCenterX, 5)
    expect(live.rightCenterX).not.toBeCloseTo(setup.initial.rightCenterX, 5)
    expect(guideState.guides).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'vertical', position: setup.guidePosition })
    ]))

    await text.finishResize({ id: setup.textId })
  })

  test('левая ручка при изменении ширины относительно центра сохраняет центр текста', async({
    editorModel,
    shapes,
    text,
    snapping
  }) => {
    const setup = await createTextWidthResizeSetup({
      angle: 30,
      axis: 'x',
      editorModel,
      shapes,
      side: 'left',
      snapping,
      text
    })
    const initialCenterX = (setup.initial.leftCenterX + setup.initial.rightCenterX) / 2
    const initialCenterY = (setup.initial.leftCenterY + setup.initial.rightCenterY) / 2

    const live = await text.resizeSideToGuide({
      axis: 'x',
      centered: true,
      position: setup.guidePosition,
      side: 'left',
      id: setup.textId
    })
    const guideState = await snapping.getGuideState()

    expect(live[setup.movingEdge]).toBeCloseTo(setup.guidePosition, 5)
    expect((live.leftCenterX + live.rightCenterX) / 2).toBeCloseTo(initialCenterX, 5)
    expect((live.leftCenterY + live.rightCenterY) / 2).toBeCloseTo(initialCenterY, 5)
    expect(live.leftCenterX).not.toBeCloseTo(setup.initial.leftCenterX, 5)
    expect(live.rightCenterX).not.toBeCloseTo(setup.initial.rightCenterX, 5)
    expect(guideState.guides).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'vertical', position: setup.guidePosition })
    ]))

    await text.finishResize({ id: setup.textId })
  })

  test('после изменения масштаба и положения холста повёрнутый текст прилипает к направляющей', async({
    editorModel,
    shapes,
    text,
    snapping
  }) => {
    const setup = await createTextWidthResizeSetup({
      angle: 30,
      axis: 'x',
      editorModel,
      shapes,
      side: 'right',
      snapping,
      text
    })
    const viewportBefore = await editorModel.getCanvasViewportTransform()

    await editorModel.zoomInUntilViewportCanMove()
    await editorModel.dragViewportBySpaceMouse({ deltaX: -24, deltaY: -18 })

    const viewportAfter = await editorModel.getCanvasViewportTransform()
    const live = await text.resizeSideToGuide({
      axis: 'x',
      position: setup.guidePosition,
      side: 'right',
      id: setup.textId
    })
    const guideState = await snapping.getGuideState()

    expect(viewportAfter.zoom).toBeGreaterThan(viewportBefore.zoom)
    expect(viewportAfter.x).not.toBeCloseTo(viewportBefore.x, 5)
    expect(viewportAfter.y).not.toBeCloseTo(viewportBefore.y, 5)
    expect(live[setup.movingEdge]).toBeCloseTo(setup.guidePosition, 5)
    expect(live.leftCenterX).toBeCloseTo(setup.initial.leftCenterX, 5)
    expect(live.leftCenterY).toBeCloseTo(setup.initial.leftCenterY, 5)
    expect(guideState.guides).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'vertical', position: setup.guidePosition })
    ]))

    await text.finishResize({ id: setup.textId })

    const clearedGuides = await snapping.getGuideState()
    expect(clearedGuides.guides).toHaveLength(0)
    expect(clearedGuides.spacingGuides).toHaveLength(0)
  })

  test('при сужении текста до переноса строк левая сторона остаётся на месте', async({
    shapes,
    text,
    snapping
  }) => {
    const textObject = await text.addRegressionText({ left: 281, top: 352 })
    text.checkCreation({ textObject })

    const initial = await text.getResizeSnapshot({ objectIndex: 0 })
    const guidePosition = initial.boundsRight - (initial.width - TEXT_WRAP_RESIZE_WIDTH)
    const reference = await shapes.addAtBounds({
      presetKey: 'square',
      options: {
        id: 'reference-shape',
        left: guidePosition,
        top: initial.boundsTop - 120,
        width: 80,
        height: 80,
        text: ''
      }
    })

    shapes.checkCreation({ shape: reference, presetKey: 'square' })

    const referenceSnapshot = await snapping.getObjectSnapshot({ id: 'reference-shape' })
    const live = await text.resizeFromRightToGuide({
      objectIndex: 0,
      x: referenceSnapshot.boundsLeft
    })
    const liveGuides = await snapping.getGuideState()

    expect(live.width).toBeLessThan(initial.width)
    expect(live.lineCount).toBeGreaterThan(initial.lineCount)
    expect(live.boundsRight).toBeCloseTo(referenceSnapshot.boundsLeft, 5)
    expect(live.leftCenterX).toBeCloseTo(initial.leftCenterX, 5)
    expect(live.leftCenterY).toBeCloseTo(initial.leftCenterY, 5)
    expect(live.fontSize).toBe(initial.fontSize)
    expect(liveGuides.guides).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'vertical', position: referenceSnapshot.boundsLeft })
    ]))

    const committed = await text.finishResize({ objectIndex: 0 })
    const clearedGuides = await snapping.getGuideState()

    expect(committed).toEqual(live)
    expect(clearedGuides.guides).toHaveLength(0)
    expect(clearedGuides.spacingGuides).toHaveLength(0)
  })

  test('текст точно прилипает к направляющей, даже если при этом меняется перенос строк', async({
    editorModel,
    shapes,
    text,
    snapping
  }) => {
    const setup = await createTextWrapSnapCorrectionSetup({
      editorModel,
      shapes,
      snapping,
      text
    })
    expect(setup.wrappedProbe.lineCount).toBeGreaterThan(setup.probeInitial.lineCount)
    expect(setup.wrappedProbe.width).toBeLessThan(setup.probeInitial.width)

    const free = await text.resizeFromRightToWidth({
      id: setup.targetId,
      width: setup.rawWidth,
      ctrlKey: true
    })
    const freeGuides = await snapping.getGuideState()
    expect(free.lineCount).toBeGreaterThan(setup.initial.lineCount)
    expect(Math.abs(free.boundsRight - setup.reference.boundsLeft)).toBeGreaterThan(2)
    expect(freeGuides.guides).toHaveLength(0)

    const snapped = await text.resizeFromRightToWidth({
      id: setup.targetId,
      width: setup.rawWidth + 0.01
    })
    const snappedGuides = await snapping.getGuideState()
    expect(snapped.lineCount).toBeLessThan(free.lineCount)
    expect(snapped.boundsRight).toBeCloseTo(setup.reference.boundsLeft, 5)
    expect(snappedGuides.guides).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'vertical', position: setup.reference.boundsLeft })
    ]))

    await text.finishResize({ id: setup.targetId })
  })

  test('при сужении текста с Ctrl направляющая не появляется и текст не прилипает', async({
    shapes,
    text,
    snapping
  }) => {
    await test.step('Добавить опорную фигуру и текстовый объект, созданный напрямую', async() => {
      const reference = await shapes.add({
        presetKey: 'square',
        options: {
          id: 'reference-shape',
          left: 470,
          top: 220,
          width: 80,
          height: 80,
          text: ''
        }
      })
      const textObject = await text.addRegressionText({
        left: 281,
        top: 352
      })

      shapes.checkCreation({ shape: reference, presetKey: 'square' })
      text.checkCreation({ textObject })
    })

    const referenceSnapshot = await snapping.getObjectSnapshot({ id: 'reference-shape' })
    const initialSnapshot = await text.getResizeSnapshot({ objectIndex: 1 })
    const requestedWidth = referenceSnapshot.boundsLeft
      - initialSnapshot.boundsLeft
      - initialSnapshot.paddingLeft
      - initialSnapshot.paddingRight
      - 3

    await test.step('Сузить текст почти до направляющей с зажатым Ctrl', async() => {
      await text.resizeFromRightToWidth({
        objectIndex: 1,
        width: requestedWidth,
        ctrlKey: true
      })
    })

    await test.step('Проверить что текст не прилип и направляющие не показаны', async() => {
      const snapshot = await text.getResizeSnapshot({ objectIndex: 1 })
      const guideState = await snapping.getGuideState()

      expect(Math.abs(snapshot.boundsRight - referenceSnapshot.boundsLeft))
        .toBeGreaterThan(SNAPPING_TOLERANCE.position)
      expect(guideState.guides).toHaveLength(0)
      expect(guideState.spacingGuides).toHaveLength(0)
    })
  })

  test('объект из шаблона и объект, созданный напрямую, одинаково прилипают при сужении справа', async({
    shapes,
    text,
    snapping
  }) => {
    const setup = await test.step('Добавить опорную фигуру, текст напрямую и такой же текст из шаблона', () => {
      return createTextResizeCreationSetup({ shapes, snapping, text })
    })
    expect(setup.directTextId).not.toBe(setup.templateTextId)
    expect(setup.reference.boundsLeft).toBeGreaterThan(0)

    const directSnappedSnapshot = await test.step('Сузить текст, созданный напрямую, почти до направляющей справа', async() => {
      return text.resizeFromRightToGuide({
        id: setup.directTextId,
        x: setup.reference.boundsLeft
      })
    })

    await test.step(
      'Завершить сужение текста, созданного напрямую, перед переходом ко второму объекту',
      () => text.finishResize({ id: setup.directTextId })
    )

    const templateSnappedSnapshot = await test.step('Сузить текст из шаблона почти до той же направляющей справа', async() => {
      return text.resizeFromRightToGuide({
        id: setup.templateTextId,
        x: setup.reference.boundsLeft
      })
    })

    await test.step('Завершить сужение текста из шаблона', () => {
      return text.finishResize({ id: setup.templateTextId })
    })

    await test.step('Проверить что оба текста одинаково прилипли к одной и той же направляющей', async() => {
      expect(Math.abs(directSnappedSnapshot.boundsRight - setup.reference.boundsLeft))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(Math.abs(templateSnappedSnapshot.boundsRight - setup.reference.boundsLeft))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(Math.abs(directSnappedSnapshot.boundsRight - templateSnappedSnapshot.boundsRight))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
    })
  })
})
