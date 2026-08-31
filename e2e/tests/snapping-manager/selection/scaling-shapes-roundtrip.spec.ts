import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'

test('после скейлинга копия общего выделения сохраняет размеры и текст обоих шейпов', async({
  activeSelectionShapeScaleSetup: setup,
  clipboard,
  selection
}) => {
  await test.step('Изменить размеры общего выделения за правый нижний угол', async() => {
    await selection.scaling.startFromControl({ control: 'br' })
    await selection.scaling.dragControlToScenePoint({
      point: { x: setup.guides.right, y: setup.guides.bottom }
    })
    await selection.scaling.finish()
  })

  const source = await selection.getShapeCompositionSnapshot()

  await test.step('Скопировать и вставить общее выделение', async() => {
    await clipboard.copy()
    await clipboard.waitForClipboardReady()

    expect(await clipboard.paste()).toBe(true)
  })

  const copied = await selection.getShapeCompositionSnapshot()
  const offsetX = copied.selection.boundsLeft - source.selection.boundsLeft
  const offsetY = copied.selection.boundsTop - source.selection.boundsTop

  expect(copied.children).toHaveLength(source.children.length)
  expect(Math.abs(offsetX) + Math.abs(offsetY)).toBeGreaterThan(0)

  for (const sourceShape of source.children) {
    const copiedShape = copied.children.find(({ text }) => text.text === sourceShape.text.text)

    expect(copiedShape, `должна существовать копия шейпа с текстом «${sourceShape.text.text}»`).toBeDefined()
    if (!copiedShape) throw new Error('Не удалось получить состояние скопированного шейпа')

    for (const field of ['left', 'top', 'width', 'height', 'scaleX', 'scaleY', 'angle'] as const) {
      expect(copiedShape.shape[field]).toBeCloseTo(sourceShape.shape[field], 3)
    }
    expect(copiedShape.shape.boundsLeft).toBeCloseTo(sourceShape.shape.boundsLeft + offsetX, 3)
    expect(copiedShape.shape.boundsTop).toBeCloseTo(sourceShape.shape.boundsTop + offsetY, 3)
    expect(copiedShape.shape.boundsWidth).toBeCloseTo(sourceShape.shape.boundsWidth, 3)
    expect(copiedShape.shape.boundsHeight).toBeCloseTo(sourceShape.shape.boundsHeight, 3)
    expect(copiedShape.text.text).toBe(sourceShape.text.text)
    expect(copiedShape.text.fontSize).toBe(sourceShape.text.fontSize)
    expect(copiedShape.text.lineCount).toBe(sourceShape.text.lineCount)
  }
})

test('после поворота и скейлинга шаблон сохраняет положение, угол и текст обоих шейпов', async({
  activeSelectionShapeScaleSetup: setup,
  editorModel,
  selection,
  template
}) => {
  const source = await test.step('Повернуть общее выделение и изменить его размеры', async() => {
    await selection.setAngle({ angle: 30 })
    await selection.scaling.scaleUniformlyFromBottomRightToBoundsRight({
      right: setup.guides.right
    })

    return selection.getShapeCompositionSnapshot()
  })

  const serializedTemplate = await test.step('Сохранить общее выделение в шаблон', async() => {
    const result = await template.serializeSelection()

    expect(result, 'общее выделение должно сохраниться в шаблон').not.toBeNull()
    expect(result?.objects).toHaveLength(source.children.length)
    if (!result) throw new Error('Не удалось сохранить общее выделение в шаблон')

    for (const object of result.objects) {
      expect(object.angle).toBeCloseTo(30, 5)
    }

    return result
  })

  await test.step('Удалить исходные шейпы и применить шаблон', async() => {
    await editorModel.deleteSelectedObject()

    expect(await template.applyTemplate({ template: serializedTemplate })).toBe(source.children.length)
  })

  const restored = await selection.getShapeCompositionSnapshot()

  expect(restored.children).toHaveLength(source.children.length)

  for (const sourceShape of source.children) {
    const restoredShape = restored.children.find(({ text }) => text.text === sourceShape.text.text)

    expect(restoredShape, `должен восстановиться шейп с текстом «${sourceShape.text.text}»`).toBeDefined()
    if (!restoredShape) throw new Error('Не удалось получить состояние шейпа из шаблона')

    expect(restoredShape.shape.angle).toBeCloseTo(30, 5)
    for (const field of ['width', 'height', 'scaleX', 'scaleY'] as const) {
      expect(restoredShape.shape[field]).toBeCloseTo(sourceShape.shape[field], 3)
    }
    for (const field of ['boundsLeft', 'boundsTop', 'boundsWidth', 'boundsHeight'] as const) {
      expect(restoredShape.shape[field]).toBeCloseTo(sourceShape.shape[field], 3)
    }
    expect(restoredShape.text.text).toBe(sourceShape.text.text)
    expect(restoredShape.text.fontSize).toBe(sourceShape.text.fontSize)
    expect(restoredShape.text.lineCount).toBe(sourceShape.text.lineCount)
  }
})
