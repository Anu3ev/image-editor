import { test, expect } from '../../../fixtures/editor.fixture'

test('при перетаскивании к левому краю монтажной области шейп прилипает к нему', async({
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

  const dragStartSnapshot = await test.step('Подвести объект почти вплотную к левому краю монтажной области', async() => {
    const snapshot = await snapping.startObjectDrag({ id: 'active-shape' })
    await snapping.dragObjectBoundsTo({
      id: 'active-shape',
      left: montageBounds.left + 3,
      top: snapshot.boundsTop
    })

    return snapshot
  })

  await test.step('Проверить что объект встал ровно по левому краю и появилась вертикальная направляющая', async() => {
    const snapshot = await snapping.getObjectSnapshot({ id: 'active-shape' })
    const guideState = await snapping.getGuideState()
    const horizontalGuides = guideState.guides.filter((guide) => guide.type === 'horizontal')

    expect(snapshot.boundsLeft).toBeCloseTo(montageBounds.left, 1)
    expect(snapshot.top).toBeCloseTo(dragStartSnapshot.top, 1)
    expect(horizontalGuides).toHaveLength(0)
    expect(guideState.guides).toEqual([{
      type: 'vertical',
      position: montageBounds.left
    }])
    expect(guideState.spacingGuides).toHaveLength(0)
  })
})

test('при перетаскивании к вертикальному центру монтажной области шейп выравнивается по центру', async({
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

  const dragStartSnapshot = await test.step('Подвести объект почти к вертикальному центру монтажной области', async() => {
    const snapshot = await snapping.startObjectDrag({ id: 'centered-shape' })
    await snapping.dragObjectCenterTo({
      id: 'centered-shape',
      centerX: montageBounds.centerX + 3,
      centerY: snapshot.centerY
    })

    return snapshot
  })

  await test.step('Проверить что объект выровнялся по центру и появилась центральная направляющая', async() => {
    const snapshot = await snapping.getObjectSnapshot({ id: 'centered-shape' })
    const guideState = await snapping.getGuideState()
    const horizontalGuides = guideState.guides.filter((guide) => guide.type === 'horizontal')

    expect(snapshot.centerX).toBeCloseTo(montageBounds.centerX, 1)
    expect(snapshot.top).toBeCloseTo(dragStartSnapshot.top, 1)
    expect(horizontalGuides).toHaveLength(0)
    expect(guideState.guides).toEqual([{
      type: 'vertical',
      position: montageBounds.centerX
    }])
    expect(guideState.spacingGuides).toHaveLength(0)
  })
})

test('при перетаскивании рядом с другим объектом шейп прилипает к его левому краю', async({
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
        top: montageBounds.top + 300,
        width: 100,
        height: 100,
        text: ''
      }
    })

    shapes.checkCreation({ shape: reference, presetKey: 'square' })
    shapes.checkCreation({ shape: active, presetKey: 'square' })
  })

  const referenceSnapshot = await snapping.getObjectSnapshot({ id: 'reference-shape' })

  await test.step('Подвести объект почти к левому краю опорного объекта', async() => {
    const activeSnapshot = await snapping.startObjectDrag({ id: 'active-shape' })
    await snapping.dragObjectBoundsTo({
      id: 'active-shape',
      left: referenceSnapshot.boundsLeft + 3,
      top: activeSnapshot.boundsTop
    })
  })

  await test.step('Проверить что объект выровнялся по левому краю опорного объекта', async() => {
    const snapshot = await snapping.getObjectSnapshot({ id: 'active-shape' })
    const guideState = await snapping.getGuideState()

    expect(snapshot.boundsLeft).toBeCloseTo(referenceSnapshot.boundsLeft, 1)
    expect(guideState.guides).toEqual([{
      type: 'vertical',
      position: referenceSnapshot.boundsLeft
    }])
    expect(guideState.spacingGuides).toHaveLength(0)
  })
})

test('при перетаскивании рядом с другим объектом шейп выравнивается по его центру', async({
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
        top: montageBounds.top + 100,
        width: 60,
        height: 60,
        text: ''
      }
    })

    shapes.checkCreation({ shape: reference, presetKey: 'square' })
    shapes.checkCreation({ shape: active, presetKey: 'square' })
  })

  const referenceSnapshot = await snapping.getObjectSnapshot({ id: 'reference-shape' })

  await test.step('Подвести объект почти к вертикальному центру опорного объекта', async() => {
    const activeSnapshot = await snapping.startObjectDrag({ id: 'active-shape' })
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
    expect(guideState.guides).toEqual([{
      type: 'vertical',
      position: referenceSnapshot.centerX
    }])
    expect(guideState.spacingGuides).toHaveLength(0)
  })
})
