import { test, expect } from '../../fixtures/editor.fixture'
import { SNAPPING_TOLERANCE } from '../../fixtures/data/snapping.data'

test.describe('Горизонтальный ресайз текстового объекта с прилипаниями', () => {
  test('при сужении справа текстовый объект прилипает правой границей к направляющей', async({
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

    const referenceSnapshot = await test.step('Получить границы опорной фигуры', async() => {
      return snapping.getObjectSnapshot({ id: 'reference-shape' })
    })

    await test.step('Сузить текст почти до направляющей справа', async() => {
      await text.resizeFromRightToGuide({
        objectIndex: 1,
        x: referenceSnapshot.boundsLeft
      })
    })

    await test.step('Проверить что правая граница текста прилипла к опорной направляющей', async() => {
      const snapshot = await text.getResizeSnapshot({ objectIndex: 1 })
      const guideState = await snapping.getGuideState()

      expect(Math.abs(snapshot.boundsRight - referenceSnapshot.boundsLeft))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(guideState.guides).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'vertical',
          position: referenceSnapshot.boundsLeft
        })
      ]))
    })
  })

  test('при сужении слева текстовый объект прилипает левой границей к направляющей', async({
    editorModel,
    text,
    snapping
  }) => {
    const montageArea = await editorModel.getMontageArea()

    await test.step('Добавить текстовый объект рядом с левым краем монтажной области', async() => {
      const textObject = await text.addRegressionText({
        left: montageArea.left + 24,
        top: 352
      })

      text.checkCreation({ textObject })
    })

    await test.step('Сузить текст слева почти до направляющей монтажной области', async() => {
      await text.resizeFromLeftToGuide({
        objectIndex: 0,
        x: montageArea.left
      })
    })

    await test.step('Проверить что левая граница текста прилипла к левому краю монтажной области', async() => {
      const snapshot = await text.getResizeSnapshot({ objectIndex: 0 })
      const guideState = await snapping.getGuideState()

      expect(Math.abs(snapshot.boundsLeft - montageArea.left)).toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(guideState.guides).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'vertical',
          position: montageArea.left
        })
      ]))
    })
  })

  test('при сужении текста с прилипаниями объект не смещается по вертикали', async({
    shapes,
    text,
    snapping
  }) => {
    await test.step('Добавить опорную фигуру и текстовый объект, который будет переноситься на новые строки', async() => {
      const reference = await shapes.add({
        presetKey: 'square',
        options: {
          id: 'reference-shape',
          left: 420,
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

    const initialState = await test.step('Получить исходное состояние текста и опорной фигуры', async() => {
      const reference = await snapping.getObjectSnapshot({ id: 'reference-shape' })
      const textSnapshot = await text.getResizeSnapshot({ objectIndex: 1 })

      return {
        reference,
        textSnapshot
      }
    })

    await test.step('Сузить текст до состояния с переносом строк и прилипания к направляющей', async() => {
      await text.resizeFromRightToGuide({
        objectIndex: 1,
        x: initialState.reference.boundsLeft
      })
    })

    await test.step('Проверить что верхняя точка объекта осталась на месте по Y', async() => {
      const snapshot = await text.getResizeSnapshot({ objectIndex: 1 })

      expect(snapshot.width).toBeLessThan(initialState.textSnapshot.width)
      expect(Math.abs(snapshot.leftTopY - initialState.textSnapshot.leftTopY))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
    })
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
    await test.step('Добавить опорную фигуру, прямой текстовый объект и объект из шаблона', async() => {
      const reference = await shapes.add({
        presetKey: 'square',
        options: {
          id: 'reference-shape',
          left: 340,
          top: 220,
          width: 80,
          height: 80,
          text: ''
        }
      })
      const directTextObject = await text.addRegressionText({
        left: 281,
        top: 352
      })
      const templateTextObject = await text.applyRegressionTemplate()

      shapes.checkCreation({ shape: reference, presetKey: 'square' })
      text.checkCreation({ textObject: directTextObject })
      text.checkCreation({ textObject: templateTextObject })
    })

    const referenceSnapshot = await test.step('Получить положение опорной фигуры', async() => {
      return snapping.getObjectSnapshot({ id: 'reference-shape' })
    })

    const directSnappedSnapshot = await test.step('Сузить прямой текст почти до направляющей справа', async() => {
      return text.resizeFromRightToGuide({
        objectIndex: 1,
        x: referenceSnapshot.boundsLeft
      })
    })

    await test.step('Завершить сужение прямого текста перед переходом ко второму объекту', async() => {
      await text.finishResize({ objectIndex: 1 })
    })

    const templateSnappedSnapshot = await test.step('Сузить текст из шаблона почти до той же направляющей справа', async() => {
      return text.resizeFromRightToGuide({
        objectIndex: 2,
        x: referenceSnapshot.boundsLeft
      })
    })

    await test.step('Завершить сужение текста из шаблона', async() => {
      await text.finishResize({ objectIndex: 2 })
    })

    await test.step('Проверить что оба текста одинаково прилипли к одной и той же направляющей', async() => {
      expect(Math.abs(directSnappedSnapshot.boundsRight - referenceSnapshot.boundsLeft))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(Math.abs(templateSnappedSnapshot.boundsRight - referenceSnapshot.boundsLeft))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(Math.abs(directSnappedSnapshot.boundsRight - templateSnappedSnapshot.boundsRight))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
    })
  })
})
