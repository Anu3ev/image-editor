import { ActiveSelection } from 'fabric'

import { BackgroundTextbox } from '../../../src/editor/text-manager/background-textbox'
import { createMockFabricImage } from '../managers/image'
import {
  createShapeEventRoutingHarness,
  type ShapeEventRoutingHarness
} from './event-routing'

/** Commit event for a complete mixed selection. */
type MixedSelectionModifiedEvent = Readonly<{
  target: ActiveSelection
  transform: Readonly<{
    action: 'scaleX'
    target: ActiveSelection
  }>
}>

/** Observable environment for an early ShapeManager event in a mixed composition. */
export type MixedSelectionShapeEventRoutingHarness = Readonly<{
  event: MixedSelectionModifiedEvent
  routing: ShapeEventRoutingHarness
  selection: ActiveSelection
}>

/** Creates a complete mixed composition for testing manager commit order. */
export function createMixedSelectionShapeEventRoutingHarness(): MixedSelectionShapeEventRoutingHarness {
  const routing = createShapeEventRoutingHarness()
  const image = createMockFabricImage({ height: 70, width: 90 })
  const text = new BackgroundTextbox('Отдельный текст', {
    fontSize: 24,
    strokeWidth: 0,
    width: 120
  })
  text.initDimensions()
  text.set({ width: 120 })

  const selection = new ActiveSelection([routing.group, image, text])
  const event = Object.freeze({
    target: selection,
    transform: Object.freeze({ action: 'scaleX' as const, target: selection })
  })
  routing.shouldSkipShapeSelectionScaleCommitMock.mockReturnValue(true)

  if (selection.getObjects().length !== 3) {
    throw new Error('Тестовое выделение должно содержать изображение, шейп и отдельный текст')
  }
  if (!selection.getObjects().includes(routing.group)) {
    throw new Error('Тестовый шейп должен входить в смешанное выделение')
  }

  return Object.freeze({ event, routing, selection })
}
