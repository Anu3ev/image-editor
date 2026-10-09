import { Rect } from 'fabric'
import { BackgroundTextbox } from '../../../../src/editor/text-manager/background-textbox'
import { applyCanonicalTextboxWidth } from '../../../../src/editor/text-manager/scaling/text-width-materialization'
import { setCropFrameActiveResizePreserveAspectRatio } from '../../../../src/editor/crop-manager/domain/crop-frame'
import { stabilizeShapeScaleMultipliers } from '../../../../src/editor/shape-manager/scaling/shape-scale-stabilization'
import {
  createRectangularScaleGestureProjection
} from '../../../../src/editor/snapping-manager/scaling/rectangular-scale-gesture-projection'
import { createRectangularScaleProjectionFixture } from '../../../test-utils/snapping/rectangular-scale-gesture-projection'

it('reports English text validation without changing user-authored text', () => {
  const textbox = new BackgroundTextbox('Текст пользователя', { width: 120 })

  expect(() => applyCanonicalTextboxWidth({ textbox, width: Number.NaN }))
    .toThrow('Textbox width must be a finite number')
  expect(textbox.text).toBe('Текст пользователя')
})

it('reports an English error for an invalid crop frame', () => {
  const frame = new Rect()

  expect(() => setCropFrameActiveResizePreserveAspectRatio({ frame, preserveAspectRatio: true }))
    .toThrow('The crop session frame must be a CropFrame')
})

it('reports the invalid axis in an English nested shape validation error', () => {
  const fixture = createRectangularScaleProjectionFixture({ controlKey: 'br', width: 100, height: 80 })
  const projection = createRectangularScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })
  if (!projection) throw new Error('The test requires a valid scale projection')

  expect(() => stabilizeShapeScaleMultipliers({
    projection,
    mode: 'free',
    multipliers: { x: 0, y: 1 },
    protectedEdges: []
  })).toThrow('Shape scale multiplier x must be a positive finite number')
})
