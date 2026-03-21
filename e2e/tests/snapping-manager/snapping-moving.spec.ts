import { test, expect } from '../../fixtures/editor.fixture'
import { SNAPPING_TOLERANCE } from '../../fixtures/data/snapping.data'

test.describe('Перетаскивание объекта с прилипаниями', () => {
  test('при перетаскивании к левому краю монтажной области объект прилипает к нему', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()
    const shapeWidth = 80
    const shapeHeight = 80
    const initialBoundsLeft = montageBounds.left + 160
    const initialBoundsTop = montageBounds.top + 140

    await test.step('Добавить объект для перетаскивания', async() => {
      const shape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: initialBoundsLeft,
          top: initialBoundsTop,
          width: shapeWidth,
          height: shapeHeight,
          text: ''
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    const initialSnapshot = await test.step('Получить исходные границы объекта перед перетаскиванием', async() => {
      return snapping.getObjectSnapshot({ id: 'active-shape' })
    })
    let dragStartSnapshot = initialSnapshot

    await test.step('Подвести объект почти вплотную к левому краю монтажной области', async() => {
      dragStartSnapshot = await snapping.startObjectDrag({ id: 'active-shape' })
      await snapping.dragObjectBoundsTo({
        id: 'active-shape',
        left: montageBounds.left + 3,
        top: dragStartSnapshot.boundsTop
      })
    })

    await test.step('Проверить что объект встал ровно по левому краю и появилась вертикальная направляющая', async() => {
      const snapshot = await snapping.getObjectSnapshot({ id: 'active-shape' })
      const guideState = await snapping.getGuideState()
      const horizontalGuides = guideState.guides.filter((guide) => guide.type === 'horizontal')

      expect(snapshot.boundsLeft).toBeCloseTo(montageBounds.left, 1)
      expect(snapshot.top).toBeCloseTo(dragStartSnapshot.top, 1)
      expect(horizontalGuides).toHaveLength(0)
      expect(guideState.guides).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'vertical',
          position: montageBounds.left
        })
      ]))
    })
  })

  test('при перетаскивании к вертикальному центру монтажной области объект выравнивается по центру', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()
    const shapeWidth = 80
    const shapeHeight = 80
    const initialBoundsLeft = montageBounds.left + 100
    const initialBoundsTop = montageBounds.top + 140

    await test.step('Добавить объект для проверки центрирования', async() => {
      const shape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'centered-shape',
          left: initialBoundsLeft,
          top: initialBoundsTop,
          width: shapeWidth,
          height: shapeHeight,
          text: ''
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    const initialSnapshot = await test.step('Получить размеры объекта перед перетаскиванием', async() => {
      return snapping.getObjectSnapshot({ id: 'centered-shape' })
    })
    let dragStartSnapshot = initialSnapshot

    await test.step('Подвести объект почти к вертикальному центру монтажной области', async() => {
      dragStartSnapshot = await snapping.startObjectDrag({ id: 'centered-shape' })
      await snapping.dragObjectCenterTo({
        id: 'centered-shape',
        centerX: montageBounds.centerX + 3,
        centerY: dragStartSnapshot.centerY
      })
    })

    await test.step('Проверить что объект выровнялся по центру и появилась центральная направляющая', async() => {
      const snapshot = await snapping.getObjectSnapshot({ id: 'centered-shape' })
      const guideState = await snapping.getGuideState()
      const horizontalGuides = guideState.guides.filter((guide) => guide.type === 'horizontal')

      expect(snapshot.centerX).toBeCloseTo(montageBounds.centerX, 1)
      expect(snapshot.top).toBeCloseTo(dragStartSnapshot.top, 1)
      expect(horizontalGuides).toHaveLength(0)
      expect(guideState.guides).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'vertical',
          position: montageBounds.centerX
        })
      ]))
    })
  })

  test('при перетаскивании рядом с другим объектом объект прилипает к его левому краю', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()

    await test.step('Добавить опорный и перетаскиваемый объекты', async() => {
      const reference = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'reference-shape',
          left: montageBounds.left + 80,
          top: montageBounds.top + 120,
          width: 100,
          height: 100,
          text: ''
        }
      })
      const active = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: montageBounds.left + 280,
          top: montageBounds.top + 120,
          width: 100,
          height: 100,
          text: ''
        }
      })

      shapes.checkCreation({ shape: reference, presetKey: 'square' })
      shapes.checkCreation({ shape: active, presetKey: 'square' })
    })

    const referenceSnapshot = await test.step('Получить границы опорного объекта', async() => {
      return snapping.getObjectSnapshot({ id: 'reference-shape' })
    })

    await test.step('Подвести объект почти к левому краю опорного объекта', async() => {
      await snapping.startObjectDrag({ id: 'active-shape' })
      await snapping.dragObjectBoundsTo({
        id: 'active-shape',
        left: referenceSnapshot.boundsLeft + 3,
        top: referenceSnapshot.boundsTop
      })
    })

    await test.step('Проверить что объект выровнялся по левому краю опорного объекта', async() => {
      const snapshot = await snapping.getObjectSnapshot({ id: 'active-shape' })
      const guideState = await snapping.getGuideState()

      expect(snapshot.boundsLeft).toBeCloseTo(referenceSnapshot.boundsLeft, 1)
      expect(guideState.guides).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'vertical',
          position: referenceSnapshot.boundsLeft
        })
      ]))
    })
  })

  test('при перетаскивании рядом с другим объектом объект выравнивается по его центру', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()

    await test.step('Добавить опорный и перетаскиваемый объекты разной ширины', async() => {
      const reference = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'reference-shape',
          left: montageBounds.left + 80,
          top: montageBounds.top + 220,
          width: 100,
          height: 100,
          text: ''
        }
      })
      const active = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: montageBounds.left + 300,
          top: montageBounds.top + 220,
          width: 60,
          height: 60,
          text: ''
        }
      })

      shapes.checkCreation({ shape: reference, presetKey: 'square' })
      shapes.checkCreation({ shape: active, presetKey: 'square' })
    })

    const referenceSnapshot = await test.step('Получить границы опорного объекта', async() => {
      return snapping.getObjectSnapshot({ id: 'reference-shape' })
    })
    const activeSnapshot = await test.step('Получить размеры перетаскиваемого объекта', async() => {
      return snapping.getObjectSnapshot({ id: 'active-shape' })
    })

    await test.step('Подвести объект почти к вертикальному центру опорного объекта', async() => {
      await snapping.startObjectDrag({ id: 'active-shape' })
      await snapping.dragObjectCenterTo({
        id: 'active-shape',
        centerX: referenceSnapshot.centerX + 2,
        centerY: activeSnapshot.centerY
      })
    })

    await test.step('Проверить что объект выровнялся по центру опорного объекта', async() => {
      const snapshot = await snapping.getObjectSnapshot({ id: 'active-shape' })
      const guideState = await snapping.getGuideState()

      expect(snapshot.centerX).toBeCloseTo(referenceSnapshot.centerX, 1)
      expect(guideState.guides).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'vertical',
          position: referenceSnapshot.centerX
        })
      ]))
    })
  })

  test('между двумя объектами появляется равноудалённость и объект встаёт на одинаковое расстояние от обоих', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()

    await test.step('Добавить левый, правый и перемещаемый объекты', async() => {
      const left = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'left-shape',
          left: montageBounds.left + 60,
          top: montageBounds.top + 300,
          width: 60,
          height: 60,
          text: ''
        }
      })
      const right = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'right-shape',
          left: montageBounds.left + 280,
          top: montageBounds.top + 300,
          width: 60,
          height: 60,
          text: ''
        }
      })
      const active = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: montageBounds.left + 210,
          top: montageBounds.top + 300,
          width: 40,
          height: 40,
          text: ''
        }
      })

      shapes.checkCreation({ shape: left, presetKey: 'square' })
      shapes.checkCreation({ shape: right, presetKey: 'square' })
      shapes.checkCreation({ shape: active, presetKey: 'square' })
    })

    const leftSnapshot = await snapping.getObjectSnapshot({ id: 'left-shape' })
    const rightSnapshot = await snapping.getObjectSnapshot({ id: 'right-shape' })
    const activeSnapshot = await snapping.getObjectSnapshot({ id: 'active-shape' })
    const expectedLeft = leftSnapshot.boundsRight
      + ((rightSnapshot.boundsLeft - leftSnapshot.boundsRight - activeSnapshot.boundsWidth) / 2)

    await test.step('Подвести объект почти к позиции равноудалённости', async() => {
      await snapping.startObjectDrag({ id: 'active-shape' })
      await snapping.dragObjectBoundsTo({
        id: 'active-shape',
        left: expectedLeft + 3,
        top: activeSnapshot.boundsTop
      })
    })

    await test.step('Проверить что объект стоит на одинаковом расстоянии от обоих и появились spacing-гайды', async() => {
      const snapshot = await snapping.getObjectSnapshot({ id: 'active-shape' })
      const guideState = await snapping.getGuideState()
      const leftGap = snapshot.boundsLeft - leftSnapshot.boundsRight
      const rightGap = rightSnapshot.boundsLeft - snapshot.boundsRight

      expect(snapshot.boundsLeft).toBeCloseTo(expectedLeft, 1)
      expect(leftGap).toBeCloseTo(rightGap, 1)
      expect(guideState.spacingGuides.length).toBeGreaterThan(0)
    })
  })

  test('после небольшого продолжения перетаскивания равноудалённость удерживается', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()

    await test.step('Подготовить три объекта в одну линию', async() => {
      const left = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'left-shape',
          left: montageBounds.left + 60,
          top: montageBounds.top + 360,
          width: 60,
          height: 60,
          text: ''
        }
      })
      const right = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'right-shape',
          left: montageBounds.left + 280,
          top: montageBounds.top + 360,
          width: 60,
          height: 60,
          text: ''
        }
      })
      const active = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: montageBounds.left + 210,
          top: montageBounds.top + 360,
          width: 40,
          height: 40,
          text: ''
        }
      })

      shapes.checkCreation({ shape: left, presetKey: 'square' })
      shapes.checkCreation({ shape: right, presetKey: 'square' })
      shapes.checkCreation({ shape: active, presetKey: 'square' })
    })

    const leftSnapshot = await snapping.getObjectSnapshot({ id: 'left-shape' })
    const rightSnapshot = await snapping.getObjectSnapshot({ id: 'right-shape' })
    const activeSnapshot = await snapping.getObjectSnapshot({ id: 'active-shape' })
    const expectedLeft = leftSnapshot.boundsRight
      + ((rightSnapshot.boundsLeft - leftSnapshot.boundsRight - activeSnapshot.boundsWidth) / 2)

    const snappedSnapshot = await test.step('Сначала поставить объект на равноудалённость', async() => {
      await snapping.startObjectDrag({ id: 'active-shape' })
      return snapping.dragObjectBoundsTo({
        id: 'active-shape',
        left: expectedLeft + 3,
        top: activeSnapshot.boundsTop
      })
    })

    await test.step('Сместить объект немного дальше и проверить удержание равноудалённости', async() => {
      const holdSnapshot = await snapping.dragObjectBoundsTo({
        id: 'active-shape',
        left: snappedSnapshot.boundsLeft + 4,
        top: snappedSnapshot.boundsTop
      })
      const guideState = await snapping.getGuideState()

      expect(holdSnapshot.boundsLeft).toBeCloseTo(snappedSnapshot.boundsLeft, 1)
      expect(guideState.spacingGuides.length).toBeGreaterThan(0)
    })
  })

  test('после выхода за пределы удержания равноудалённость отпускается', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()

    await test.step('Подготовить три объекта в одну линию', async() => {
      const left = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'left-shape',
          left: montageBounds.left + 60,
          top: montageBounds.top + 420,
          width: 60,
          height: 60,
          text: ''
        }
      })
      const right = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'right-shape',
          left: montageBounds.left + 280,
          top: montageBounds.top + 420,
          width: 60,
          height: 60,
          text: ''
        }
      })
      const active = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: montageBounds.left + 210,
          top: montageBounds.top + 420,
          width: 40,
          height: 40,
          text: ''
        }
      })

      shapes.checkCreation({ shape: left, presetKey: 'square' })
      shapes.checkCreation({ shape: right, presetKey: 'square' })
      shapes.checkCreation({ shape: active, presetKey: 'square' })
    })

    const leftSnapshot = await snapping.getObjectSnapshot({ id: 'left-shape' })
    const rightSnapshot = await snapping.getObjectSnapshot({ id: 'right-shape' })
    const activeSnapshot = await snapping.getObjectSnapshot({ id: 'active-shape' })
    const expectedLeft = leftSnapshot.boundsRight
      + ((rightSnapshot.boundsLeft - leftSnapshot.boundsRight - activeSnapshot.boundsWidth) / 2)

    await test.step('Сначала поставить объект на равноудалённость', async() => {
      await snapping.startObjectDrag({ id: 'active-shape' })
      await snapping.dragObjectBoundsTo({
        id: 'active-shape',
        left: expectedLeft + 3,
        top: activeSnapshot.boundsTop
      })
    })

    await test.step('Увести объект достаточно далеко, чтобы равноудалённость отпустилась', async() => {
      await snapping.dragObjectBoundsTo({
        id: 'active-shape',
        left: expectedLeft + 20,
        top: activeSnapshot.boundsTop
      })
    })

    await test.step('Проверить что spacing-гайды исчезли и объект больше не стоит в равном промежутке', async() => {
      const snapshot = await snapping.getObjectSnapshot({ id: 'active-shape' })
      const guideState = await snapping.getGuideState()
      const leftGap = snapshot.boundsLeft - leftSnapshot.boundsRight
      const rightGap = rightSnapshot.boundsLeft - snapshot.boundsRight

      expect(guideState.spacingGuides).toHaveLength(0)
      expect(Math.abs(leftGap - rightGap)).toBeGreaterThan(SNAPPING_TOLERANCE.position)
    })
  })

  test('после завершения перетаскивания направляющие исчезают, а объект остаётся в новой позиции', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()

    await test.step('Добавить опорный и перетаскиваемый объекты', async() => {
      const reference = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'reference-shape',
          left: montageBounds.left + 80,
          top: montageBounds.top + 220,
          width: 100,
          height: 100,
          text: ''
        }
      })
      const active = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: montageBounds.left + 280,
          top: montageBounds.top + 220,
          width: 100,
          height: 100,
          text: ''
        }
      })

      shapes.checkCreation({ shape: reference, presetKey: 'square' })
      shapes.checkCreation({ shape: active, presetKey: 'square' })
    })

    const referenceSnapshot = await snapping.getObjectSnapshot({ id: 'reference-shape' })

    await test.step('Прилипнуть к опорному объекту перед завершением перетаскивания', async() => {
      await snapping.startObjectDrag({ id: 'active-shape' })
      await snapping.dragObjectBoundsTo({
        id: 'active-shape',
        left: referenceSnapshot.boundsLeft + 3,
        top: referenceSnapshot.boundsTop
      })
    })

    await test.step('Завершить перетаскивание и проверить очистку направляющих', async() => {
      const guideState = await snapping.finishPointerInteraction()
      const snapshot = await snapping.getObjectSnapshot({ id: 'active-shape' })

      expect(guideState.guides).toHaveLength(0)
      expect(guideState.spacingGuides).toHaveLength(0)
      expect(snapshot.boundsLeft).toBeCloseTo(referenceSnapshot.boundsLeft, 1)
    })
  })

  test('при перетаскивании с Ctrl объект не прилипает к направляющим', async({
    editorModel,
    shapes,
    snapping
  }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()

    await test.step('Добавить опорный и перетаскиваемый объекты', async() => {
      const reference = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'reference-shape',
          left: montageBounds.left + 80,
          top: montageBounds.top + 220,
          width: 100,
          height: 100,
          text: ''
        }
      })
      const active = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'active-shape',
          left: montageBounds.left + 280,
          top: montageBounds.top + 220,
          width: 100,
          height: 100,
          text: ''
        }
      })

      shapes.checkCreation({ shape: reference, presetKey: 'square' })
      shapes.checkCreation({ shape: active, presetKey: 'square' })
    })

    const referenceSnapshot = await snapping.getObjectSnapshot({ id: 'reference-shape' })
    const requestedLeft = referenceSnapshot.boundsLeft + 3

    await test.step('Подвести объект к опорной линии с зажатым Ctrl', async() => {
      await snapping.startObjectDrag({ id: 'active-shape' })
      await snapping.dragObjectBoundsTo({
        id: 'active-shape',
        left: requestedLeft,
        top: referenceSnapshot.boundsTop,
        ctrlKey: true
      })
    })

    await test.step('Проверить что объект остался в запрошенной позиции без направляющих', async() => {
      const snapshot = await snapping.getObjectSnapshot({ id: 'active-shape' })
      const guideState = await snapping.getGuideState()

      expect(Math.abs(snapshot.boundsLeft - requestedLeft)).toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
      expect(snapshot.boundsLeft).not.toBe(referenceSnapshot.boundsLeft)
      expect(guideState.guides).toHaveLength(0)
      expect(guideState.spacingGuides).toHaveLength(0)
    })
  })
})
