import { test, expect } from '../../fixtures/editor.fixture'
import { SNAPPING_TOLERANCE } from '../../fixtures/data/snapping.data'

test.describe('Масштабирование объекта с прилипаниями', () => {
  // TODO: Этот и другие кейсы из этого файла работают неправильно, потому что за пределами монтажной области появляются направляюшие, которых вообще не должно быть. Нужно понять почему так происходит.
  test('при растяжении вправо объект прилипает правой границей к вертикальной направляющей', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageArea = await editorModel.getMontageArea()

    await test.step('Добавить объект для горизонтального масштабирования', async() => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: montageArea.left + 180,
          top: montageArea.top + 180,
          width: 80,
          height: 80,
          text: ''
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    const initialSnapshot = await test.step('Получить исходный snapshot shape', async() => {
      return shapes.getScaleSnapshot({ id: 'active-shape' })
    })

    const desiredWidth = montageArea.left + montageArea.width - initialSnapshot.groupBoundsLeft
    const requestedScaleX = (desiredWidth - 3) / initialSnapshot.groupBoundsWidth

    await test.step('Растянуть объект почти до правой границы монтажной области', async() => {
      await shapes.scaleHorizontallyFromRight({
        id: 'active-shape',
        scaleX: requestedScaleX
      })
    })

    await test.step('Проверить что правая граница прилипла к направляющей', async() => {
      const snapshot = await shapes.getScaleSnapshot({ id: 'active-shape' })
      const guideState = await snapping.getGuideState()
      const montageRight = montageArea.left + montageArea.width

      expect(Math.abs(snapshot.groupBoundsRight - montageRight)).toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(guideState.guides).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'vertical',
          position: montageRight
        })
      ]))
    })
  })

  test('при растяжении вниз объект прилипает нижней границей к горизонтальной направляющей', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageArea = await editorModel.getMontageArea()

    await test.step('Добавить объект для вертикального масштабирования', async() => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: montageArea.left + 180,
          top: montageArea.top + 180,
          width: 80,
          height: 80,
          text: ''
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    const initialSnapshot = await test.step('Получить исходный snapshot shape', async() => {
      return shapes.getScaleSnapshot({ id: 'active-shape' })
    })

    const desiredHeight = montageArea.top + montageArea.height - initialSnapshot.groupBoundsTop
    const requestedScaleY = (desiredHeight - 3) / initialSnapshot.groupBoundsHeight

    await test.step('Растянуть объект почти до нижней границы монтажной области', async() => {
      await shapes.scaleVerticallyFromBottom({
        id: 'active-shape',
        scaleY: requestedScaleY
      })
    })

    await test.step('Проверить что нижняя граница прилипла к направляющей', async() => {
      const snapshot = await shapes.getScaleSnapshot({ id: 'active-shape' })
      const guideState = await snapping.getGuideState()
      const montageBottom = montageArea.top + montageArea.height

      expect(Math.abs(snapshot.groupBoundsBottom - montageBottom)).toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(guideState.guides).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'horizontal',
          position: montageBottom
        })
      ]))
    })
  })

  test('при растяжении за угол объект сохраняет фиксированную точку и прилипает по ближайшей оси', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageArea = await editorModel.getMontageArea()

    await test.step('Добавить объект для диагонального масштабирования', async() => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: montageArea.left + 180,
          top: montageArea.top + 180,
          width: 80,
          height: 80,
          text: ''
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    const initialSnapshot = await test.step('Получить исходный snapshot shape', async() => {
      return shapes.getScaleSnapshot({ id: 'active-shape' })
    })

    const desiredWidth = montageArea.left + montageArea.width - initialSnapshot.groupBoundsLeft
    const requestedScale = (desiredWidth - 3) / initialSnapshot.groupBoundsWidth

    await test.step('Растянуть объект за правый нижний угол почти до вертикальной направляющей', async() => {
      await shapes.scaleDiagonally({
        id: 'active-shape',
        corner: 'br',
        scaleX: requestedScale,
        scaleY: requestedScale
      })
    })

    await test.step('Проверить что верхний левый угол остался на месте, а правая граница прилипла', async() => {
      const snapshot = await shapes.getScaleSnapshot({ id: 'active-shape' })
      const guideState = await snapping.getGuideState()
      const montageRight = montageArea.left + montageArea.width

      expect(Math.abs(snapshot.groupBoundsLeft - initialSnapshot.groupBoundsLeft))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(Math.abs(snapshot.groupBoundsTop - initialSnapshot.groupBoundsTop))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(Math.abs(snapshot.groupBoundsRight - montageRight)).toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(guideState.guides).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'vertical',
          position: montageRight
        })
      ]))
    })
  })

  test('при масштабировании с Ctrl объект не прилипает к направляющим', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageArea = await editorModel.getMontageArea()

    await test.step('Добавить объект для проверки масштабирования с Ctrl', async() => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: montageArea.left + 180,
          top: montageArea.top + 180,
          width: 80,
          height: 80,
          text: ''
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    const initialSnapshot = await test.step('Получить исходный snapshot shape', async() => {
      return shapes.getScaleSnapshot({ id: 'active-shape' })
    })

    const desiredWidth = montageArea.left + montageArea.width - initialSnapshot.groupBoundsLeft
    const requestedScaleX = (desiredWidth - 3) / initialSnapshot.groupBoundsWidth
    const expectedRightBeforeSnap = initialSnapshot.groupBoundsLeft
      + (initialSnapshot.groupBoundsWidth * requestedScaleX)

    await test.step('Растянуть объект почти до направляющей с зажатым Ctrl', async() => {
      await shapes.scaleHorizontallyFromRight({
        id: 'active-shape',
        scaleX: requestedScaleX,
        ctrlKey: true
      })
    })

    await test.step('Проверить что объект не прилип к направляющей и направляющие не показаны', async() => {
      const snapshot = await shapes.getScaleSnapshot({ id: 'active-shape' })
      const guideState = await snapping.getGuideState()
      const montageRight = montageArea.left + montageArea.width

      expect(Math.abs(snapshot.groupBoundsRight - expectedRightBeforeSnap))
        .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(Math.abs(snapshot.groupBoundsRight - montageRight))
        .toBeGreaterThan(SNAPPING_TOLERANCE.position)
      expect(guideState.guides).toHaveLength(0)
      expect(guideState.spacingGuides).toHaveLength(0)
    })
  })

  test('после завершения масштабирования направляющие исчезают', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageArea = await editorModel.getMontageArea()

    await test.step('Добавить объект для масштабирования', async() => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: montageArea.left + 180,
          top: montageArea.top + 180,
          width: 80,
          height: 80,
          text: ''
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    const initialSnapshot = await test.step('Получить исходный snapshot shape', async() => {
      return shapes.getScaleSnapshot({ id: 'active-shape' })
    })

    const desiredWidth = montageArea.left + montageArea.width - initialSnapshot.groupBoundsLeft
    const requestedScaleX = (desiredWidth - 3) / initialSnapshot.groupBoundsWidth

    await test.step('Растянуть объект до прилипания по правой границе', async() => {
      await shapes.scaleHorizontallyFromRight({
        id: 'active-shape',
        scaleX: requestedScaleX
      })
    })

    await test.step('Завершить масштабирование и проверить очистку направляющих', async() => {
      await shapes.finishScale({ id: 'active-shape' })
      const guideState = await snapping.finishPointerInteraction()
      const snapshot = await shapes.getScaleSnapshot({ id: 'active-shape' })
      const montageRight = montageArea.left + montageArea.width

      expect(guideState.guides).toHaveLength(0)
      expect(guideState.spacingGuides).toHaveLength(0)
      expect(Math.abs(snapshot.groupBoundsRight - montageRight)).toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
    })
  })
})
