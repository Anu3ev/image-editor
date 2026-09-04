import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'

test('после скейлинга копия общего выделения сохраняет размеры и оформление обоих текстов', async({
  activeSelectionTextScaleSetup: setup,
  clipboard,
  selection
}) => {
  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.initial.selection.centerY }
  })
  await selection.scaling.finish()

  const source = await selection.getTextCompositionSnapshot()

  expect(source.selection.boundsRight).toBeCloseTo(setup.guides.right, 2)
  expect(source.selection.boundsLeft).toBeCloseTo(setup.initial.selection.boundsLeft, 5)

  await clipboard.copy()
  await clipboard.waitForClipboardReady()

  expect(await clipboard.paste()).toBe(true)

  const copied = await selection.getTextCompositionSnapshot()
  const offsetX = copied.selection.boundsLeft - source.selection.boundsLeft
  const offsetY = copied.selection.boundsTop - source.selection.boundsTop

  expect(copied.children).toHaveLength(source.children.length)
  expect(Math.abs(offsetX) + Math.abs(offsetY)).toBeGreaterThan(0)
  expect(copied.selection.boundsWidth).toBeCloseTo(source.selection.boundsWidth, 3)
  expect(copied.selection.boundsHeight).toBeCloseTo(source.selection.boundsHeight, 3)

  for (const sourceText of source.children) {
    const copiedText = copied.children.find(({ text }) => text === sourceText.text)

    expect(copiedText, `должна существовать копия текста «${sourceText.text}»`).toBeDefined()
    if (!copiedText) throw new Error('Не удалось получить состояние скопированного текста')

    for (const field of [
      'width',
      'height',
      'fontSize',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'radiusTopLeft',
      'radiusTopRight',
      'radiusBottomRight',
      'radiusBottomLeft',
      'scaleX',
      'scaleY',
      'angle'
    ] as const) {
      expect(copiedText[field]).toBeCloseTo(sourceText[field], 3)
    }
    expect(copiedText.boundsLeft).toBeCloseTo(sourceText.boundsLeft + offsetX, 3)
    expect(copiedText.boundsTop).toBeCloseTo(sourceText.boundsTop + offsetY, 3)
    expect(copiedText.boundsWidth).toBeCloseTo(sourceText.boundsWidth, 3)
    expect(copiedText.boundsHeight).toBeCloseTo(sourceText.boundsHeight, 3)
    expect(copiedText.text).toBe(sourceText.text)
    expect(copiedText.lineCount).toBe(sourceText.lineCount)
  }
})

test('после поворота и скейлинга шаблон сохраняет положение, размеры и оформление обоих текстов', async({
  activeSelectionTextScaleSetup: setup,
  editorModel,
  selection,
  shapes,
  template
}) => {
  for (const id of ['active-selection-scale-top-reference', 'active-selection-scale-bottom-reference']) {
    expect(await shapes.remove({ id })).toBe(true)
  }

  await selection.setAngle({ angle: 30 })
  await selection.scaling.scaleUniformlyFromBottomRightToBoundsRight({
    right: setup.guides.right
  })

  const source = await selection.getTextCompositionSnapshot()
  const serializedTemplate = await template.serializeSelection()

  expect(serializedTemplate, 'общее выделение должно сохраниться в шаблон').not.toBeNull()
  expect(serializedTemplate?.objects).toHaveLength(source.children.length)
  if (!serializedTemplate) throw new Error('Не удалось сохранить общее выделение в шаблон')

  for (const object of serializedTemplate.objects) {
    expect(object.angle).toBeCloseTo(30, 5)
    expect(object.type).toBe('background-textbox')
  }

  await editorModel.deleteSelectedObject()

  expect(await template.applyTemplate({ template: serializedTemplate })).toBe(source.children.length)

  const restored = await selection.getTextCompositionSnapshot()

  expect(restored.children).toHaveLength(source.children.length)
  expect(restored.selection.type).toBe('activeselection')

  for (const sourceText of source.children) {
    const restoredText = restored.children.find(({ text }) => text === sourceText.text)

    expect(restoredText, `должен восстановиться текст «${sourceText.text}»`).toBeDefined()
    if (!restoredText) throw new Error('Не удалось получить состояние текста из шаблона')

    for (const field of [
      'width',
      'height',
      'fontSize',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'radiusTopLeft',
      'radiusTopRight',
      'radiusBottomRight',
      'radiusBottomLeft',
      'scaleX',
      'scaleY'
    ] as const) {
      expect(restoredText[field]).toBeCloseTo(sourceText[field], 3)
    }
    for (const field of ['boundsLeft', 'boundsTop', 'boundsWidth', 'boundsHeight'] as const) {
      expect(restoredText[field]).toBeCloseTo(sourceText[field], 3)
    }
    expect(restoredText.angle).toBeCloseTo(30, 5)
    expect(restoredText.text).toBe(sourceText.text)
    expect(restoredText.lineCount).toBe(sourceText.lineCount)
  }
})
