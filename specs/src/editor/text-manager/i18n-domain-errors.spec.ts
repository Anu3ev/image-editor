import { Rect } from 'fabric'
import { createTranslator } from '../../../../src/editor/i18n'
import { BackgroundTextbox } from '../../../../src/editor/text-manager/background-textbox'
import { applyCanonicalTextboxWidth } from '../../../../src/editor/text-manager/scaling/text-width-materialization'
import { setCropFrameActiveResizePreserveAspectRatio } from '../../../../src/editor/crop-manager/domain/crop-frame'
import { stabilizeShapeScaleMultipliers } from '../../../../src/editor/shape-manager/scaling/shape-scale-stabilization'
import {
  createRectangularScaleGestureProjection
} from '../../../../src/editor/snapping-manager/scaling/rectangular-scale-gesture-projection'
import { createRectangularScaleProjectionFixture } from '../../../test-utils/snapping/rectangular-scale-gesture-projection'

it('localizes text validation without changing user-authored text', () => {
  const textbox = new BackgroundTextbox('Текст пользователя', { width: 120 })
  const ru = createTranslator({ language: 'ru' })

  expect(() => applyCanonicalTextboxWidth({ textbox, width: Number.NaN, t: ru }))
    .toThrow('Ширина Textbox должна быть конечным числом')
  expect(() => applyCanonicalTextboxWidth({ textbox, width: Number.NaN }))
    .toThrow('Textbox width must be a finite number')
  expect(textbox.text).toBe('Текст пользователя')
})

it('keeps independent crop validators in their selected language', () => {
  const frame = new Rect()
  const en = createTranslator({ language: 'en' })
  const ru = createTranslator({ language: 'ru' })

  expect(() => setCropFrameActiveResizePreserveAspectRatio({ frame, preserveAspectRatio: true, t: ru }))
    .toThrow('Рамка сеанса обрезки должна быть экземпляром CropFrame')
  expect(() => setCropFrameActiveResizePreserveAspectRatio({ frame, preserveAspectRatio: true, t: en }))
    .toThrow('The crop session frame must be a CropFrame')
})

it('passes the selected language into nested shape validation and interpolation', () => {
  const fixture = createRectangularScaleProjectionFixture({ controlKey: 'br', width: 100, height: 80 })
  const projection = createRectangularScaleGestureProjection({
    transform: fixture.transform,
    pointerStart: fixture.pointerStart
  })
  if (!projection) throw new Error('The test requires a valid scale projection')

  const t = createTranslator({ language: 'ru' })
  expect(() => stabilizeShapeScaleMultipliers({
    t,
    projection,
    mode: 'free',
    multipliers: { x: 0, y: 1 },
    protectedEdges: []
  })).toThrow('Множитель масштабирования фигуры по оси x: требуется положительное конечное число')
})
