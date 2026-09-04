import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'

test('для выделения из изображения, шейпа и текста оставляет только доступные тексту ручки', async({
  activeSelectionMixedScaleSetup: setup,
  selection
}) => {
  const capability = await selection.scaling.getCapability()

  expect(capability.targetType).toBe('activeselection')
  expect(capability.targetId).toBeNull()
  expect([...capability.childIds].sort()).toEqual([
    setup.imageId,
    setup.shapeId,
    setup.textId
  ].sort())
  expect(capability.availableScaleHandles).toEqual(['tl', 'tr', 'br', 'bl', 'ml', 'mr'])
})
