import { Control } from 'fabric'
import TextCornerScaleMeasurer from '../../../../../src/editor/text-manager/scaling/text-corner-scale-measurer'
import * as TextCornerScalePlan from '../../../../../src/editor/text-manager/scaling/text-corner-scale-plan'
import {
  createTextCornerScaleBeginEvent,
  createTextCornerScaleCanonicalState,
  createTextCornerScaleInteractionHarness,
  createTextCornerScaleInteractionMeasurement,
  createTextCornerScaleRightGuide,
  createTextCornerScaleStepEvent,
  getRequiredTextCornerScaleBounds,
  materializeTextCornerScale,
  setTextCornerScaleEnvironment,
  type TextCornerScaleInteractionHarness
} from '../../../../test-utils/text/corner-scale-interaction'

let harness: TextCornerScaleInteractionHarness | null = null

beforeEach(() => {
  jest.spyOn(TextCornerScaleMeasurer.prototype, 'dispose').mockImplementation(() => {})
})

afterEach(() => {
  harness?.controller.finishGesture()
  harness = null
  jest.restoreAllMocks()
})

/** Неподдерживаемое состояние текста и его естественное описание в названии теста. */
type UnsupportedTextCornerScaleCase = Readonly<{
  targetState: Readonly<Record<string, unknown>>
  title: string
}>

/** Состояния, которые должны использовать прежнюю логику углового скейлинга. */
const UNSUPPORTED_TEXT_CORNER_SCALE_CASES = [
  { title: 'вложенный текст', targetState: { group: {} } },
  { title: 'текст внутри шейпа', targetState: { shapeNodeType: 'text' } },
  { title: 'текст по контуру', targetState: { path: {} } },
  { title: 'текст в режиме редактирования', targetState: { isEditing: true } },
  { title: 'текст с отражением по горизонтали', targetState: { flipX: true } },
  { title: 'текст с отражением по вертикали', targetState: { flipY: true } },
  { title: 'текст с наклоном по X', targetState: { skewX: 1 } },
  { title: 'текст с наклоном по Y', targetState: { skewY: 1 } },
  { title: 'заблокированный текст', targetState: { locked: true } },
  { title: 'текст с заблокированным скейлингом по X', targetState: { lockScalingX: true } },
  { title: 'текст с заблокированным скейлингом по Y', targetState: { lockScalingY: true } },
  { title: 'текст с незавершённым скейлингом по X', targetState: { scaleX: 1.1 } },
  { title: 'текст с незавершённым скейлингом по Y', targetState: { scaleY: 1.1 } }
] satisfies readonly UnsupportedTextCornerScaleCase[]

it.each(UNSUPPORTED_TEXT_CORNER_SCALE_CASES)(
  '$title масштабируется по прежним правилам',
  ({ targetState }) => {
    const interaction = createTextCornerScaleInteractionHarness()
    harness = interaction
    Object.assign(interaction.target, targetState)

    const didBegin = interaction.controller.beginGesture(
      createTextCornerScaleBeginEvent({ harness: interaction })
    )

    expect(didBegin).toBe(false)
    expect(interaction.captureEnvironmentMock).not.toHaveBeenCalled()
    expect(interaction.beginScaleMock).not.toHaveBeenCalled()
    expect(interaction.applyScaleMock).not.toHaveBeenCalled()
  }
)

it('при угловом скейлинге сохраняет запрет переворота объекта', () => {
  const interaction = createTextCornerScaleInteractionHarness()
  harness = interaction
  interaction.target.lockScalingFlip = true
  jest.spyOn(TextCornerScaleMeasurer.prototype, 'measure').mockImplementation(({ scale }) => {
    return createTextCornerScaleInteractionMeasurement({ harness: interaction, scale })
  })

  const didBegin = interaction.controller.beginGesture(createTextCornerScaleBeginEvent({ harness: interaction }))
  const didHandle = interaction.controller.handleObjectScaling(createTextCornerScaleStepEvent({
    harness: interaction,
    marker: new MouseEvent('pointermove'),
    scale: 1.08
  }))

  expect(didBegin).toBe(true)
  expect(didHandle).toBe(true)
  expect(interaction.target.lockScalingFlip).toBe(true)
  expect(interaction.applyScaleMock).toHaveBeenCalledTimes(1)
})

it('очищает исходное состояние, если сессия прилипания не была создана', () => {
  const interaction = createTextCornerScaleInteractionHarness()
  harness = interaction
  const expectedError = new Error('Не удалось подготовить окружение прилипания')
  interaction.captureEnvironmentMock.mockImplementation(() => {
    throw expectedError
  })

  expect(() => {
    interaction.controller.beginGesture(createTextCornerScaleBeginEvent({ harness: interaction }))
  }).toThrow(expectedError)

  expect(interaction.beginScaleMock).toHaveBeenCalledTimes(1)
  expect(interaction.clearScaleMock).toHaveBeenCalledTimes(1)
  expect(interaction.clearScaleMock).toHaveBeenCalledWith({ target: interaction.target })
  expect(interaction.controller.finishGesture()).toBe(false)
})

it('выбирает направляющую по точной геометрии текста', () => {
  const interaction = createTextCornerScaleInteractionHarness()
  harness = interaction
  const rawScale = 1.1
  const guide = createTextCornerScaleRightGuide({ harness: interaction, scale: 1.04 })
  const canonicalState = Object.freeze({
    ...createTextCornerScaleCanonicalState({ harness: interaction, scale: rawScale }),
    width: interaction.baselineCanonicalState.width * 1.04
  })
  setTextCornerScaleEnvironment({
    harness: interaction,
    environment: Object.freeze({ candidates: [guide], zoom: 1 })
  })
  jest.spyOn(TextCornerScaleMeasurer.prototype, 'measure').mockImplementation(({ scale }) => {
    const measurement = createTextCornerScaleInteractionMeasurement({
      harness: interaction,
      right: guide.position,
      scale
    })

    return Object.freeze({ ...measurement, canonicalState })
  })
  interaction.applyScaleMock.mockImplementation(({ scale }) => {
    return materializeTextCornerScale({ canonicalState, harness: interaction, scale })
  })

  expect(interaction.controller.beginGesture(createTextCornerScaleBeginEvent({ harness: interaction }))).toBe(true)
  expect(interaction.controller.handleObjectScaling(createTextCornerScaleStepEvent({
    harness: interaction,
    marker: new MouseEvent('pointermove'),
    scale: rawScale
  }))).toBe(true)

  expect(getRequiredTextCornerScaleBounds({ target: interaction.target }).right).toBeCloseTo(guide.position, 5)
  expect(interaction.applyScaleMock).toHaveBeenCalledTimes(1)
  expect(interaction.publishGuidesMock).toHaveBeenCalledWith({
    guides: [expect.objectContaining({ axis: 'x', position: guide.position })]
  })
})

it('не выбирает направляющую, если фактическая грань вышла за порог прилипания', () => {
  const interaction = createTextCornerScaleInteractionHarness()
  harness = interaction
  const rawScale = 1.04
  const guide = createTextCornerScaleRightGuide({ harness: interaction, scale: rawScale })
  setTextCornerScaleEnvironment({
    harness: interaction,
    environment: Object.freeze({ candidates: [guide], zoom: 1 })
  })
  jest.spyOn(TextCornerScaleMeasurer.prototype, 'measure').mockImplementation(({ scale }) => {
    return createTextCornerScaleInteractionMeasurement({
      harness: interaction,
      right: guide.position + 6,
      scale
    })
  })

  expect(interaction.controller.beginGesture(createTextCornerScaleBeginEvent({ harness: interaction }))).toBe(true)
  expect(interaction.controller.handleObjectScaling(createTextCornerScaleStepEvent({
    harness: interaction,
    marker: new MouseEvent('pointermove'),
    scale: rawScale
  }))).toBe(true)

  expect(interaction.applyScaleMock).toHaveBeenCalledTimes(1)
  expect(interaction.applyScaleMock).toHaveBeenCalledWith(expect.objectContaining({ scale: rawScale }))
  expect(interaction.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
})

it.each([
  { strokeUniform: true, strokeWidth: 0.5 },
  { strokeUniform: false, strokeWidth: 2 }
])('текст с обводкой $strokeWidth масштабируется по прежним правилам', ({ strokeUniform, strokeWidth }) => {
  const interaction = createTextCornerScaleInteractionHarness({ strokeUniform, strokeWidth })
  harness = interaction

  const didBegin = interaction.controller.beginGesture(createTextCornerScaleBeginEvent({ harness: interaction }))

  expect(didBegin).toBe(false)
  expect(interaction.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(interaction.beginScaleMock).not.toHaveBeenCalled()
  expect(interaction.applyScaleMock).not.toHaveBeenCalled()
})

it('текст с переопределённой угловой ручкой масштабируется по прежним правилам', () => {
  const interaction = createTextCornerScaleInteractionHarness()
  harness = interaction
  const bottomRightControl = interaction.target.controls.br
  const customScaleHandler = jest.fn(() => true)

  expect(bottomRightControl).toBeDefined()
  if (!bottomRightControl) throw new Error('Тестовый текст должен иметь нижнюю правую ручку')

  interaction.target.controls = {
    ...interaction.target.controls,
    br: new Control({
      ...bottomRightControl,
      actionHandler: customScaleHandler
    })
  }

  const didBegin = interaction.controller.beginGesture(createTextCornerScaleBeginEvent({ harness: interaction }))

  expect(interaction.transform.action).toBe('scale')
  expect(didBegin).toBe(false)
  expect(interaction.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(interaction.beginScaleMock).not.toHaveBeenCalled()
  expect(interaction.applyScaleMock).not.toHaveBeenCalled()
  expect(customScaleHandler).not.toHaveBeenCalled()
})

it('после неудачного уточнения применяет размер по указателю без удержания', () => {
  const interaction = createTextCornerScaleInteractionHarness()
  harness = interaction
  const rawScale = 1.02
  const snappedScale = 1.04
  const width = interaction.baselineBounds.right - interaction.baselineBounds.left
  const cycleScale = snappedScale + (1 / width)
  const guide = createTextCornerScaleRightGuide({ harness: interaction, scale: snappedScale })
  setTextCornerScaleEnvironment({
    harness: interaction,
    environment: Object.freeze({ candidates: [guide], zoom: 1 })
  })
  jest.spyOn(TextCornerScaleMeasurer.prototype, 'measure').mockImplementation(({ scale }) => {
    let right: number | undefined

    if (Math.abs(scale - snappedScale) < 0.0000001) {
      right = guide.position - 1
    }
    if (Math.abs(scale - cycleScale) < 0.0000001) {
      right = guide.position + 1
    }

    return createTextCornerScaleInteractionMeasurement({ harness: interaction, right, scale })
  })

  expect(interaction.controller.beginGesture(createTextCornerScaleBeginEvent({ harness: interaction }))).toBe(true)
  expect(interaction.controller.handleObjectScaling(createTextCornerScaleStepEvent({
    harness: interaction,
    marker: new MouseEvent('pointermove'),
    scale: rawScale
  }))).toBe(true)
  expect(interaction.controller.handleObjectScaling(createTextCornerScaleStepEvent({
    harness: interaction,
    marker: new MouseEvent('pointermove'),
    scale: rawScale
  }))).toBe(true)

  expect(interaction.applyScaleMock).toHaveBeenCalledTimes(2)
  expect(interaction.applyScaleMock.mock.calls[0]?.[0].scale).toBeCloseTo(rawScale, 9)
  expect(interaction.applyScaleMock.mock.calls[1]?.[0].scale).toBeCloseTo(rawScale, 9)
  expect(interaction.publishGuidesMock).toHaveBeenNthCalledWith(1, { guides: [] })
  expect(interaction.publishGuidesMock).toHaveBeenNthCalledWith(2, { guides: [] })
})

it('сохраняет направляющую, которую достиг итоговый размер после неудачного уточнения', () => {
  const interaction = createTextCornerScaleInteractionHarness()
  harness = interaction
  const rawScale = 1.04
  const guide = createTextCornerScaleRightGuide({ harness: interaction, scale: rawScale })
  setTextCornerScaleEnvironment({
    harness: interaction,
    environment: Object.freeze({ candidates: [guide], zoom: 1 })
  })
  jest.spyOn(TextCornerScaleMeasurer.prototype, 'measure').mockImplementation(({ scale }) => {
    return createTextCornerScaleInteractionMeasurement({ harness: interaction, scale })
  })
  jest.spyOn(TextCornerScalePlan, 'resolveTextCornerScaleSnapMeasurement').mockReturnValue(null)

  expect(interaction.controller.beginGesture(createTextCornerScaleBeginEvent({ harness: interaction }))).toBe(true)
  expect(interaction.controller.handleObjectScaling(createTextCornerScaleStepEvent({
    harness: interaction,
    marker: new MouseEvent('pointermove'),
    scale: rawScale
  }))).toBe(true)

  const finalBounds = getRequiredTextCornerScaleBounds({ target: interaction.target })
  expect(finalBounds.right).toBeCloseTo(guide.position, 5)
  expect(interaction.applyScaleMock).toHaveBeenCalledTimes(1)
  expect(interaction.publishGuidesMock).toHaveBeenCalledWith({
    guides: [expect.objectContaining({
      axis: 'x',
      edge: 'right',
      position: guide.position
    })]
  })
})

it('сохраняет обе направляющие, достигнутые размером по указателю после неудачного уточнения', () => {
  const interaction = createTextCornerScaleInteractionHarness()
  harness = interaction
  const rawScale = 1.04
  const xGuide = createTextCornerScaleRightGuide({ harness: interaction, scale: rawScale })
  const baselineHeight = interaction.baselineBounds.bottom - interaction.baselineBounds.top
  const yGuide = {
    id: 'bottom-guide',
    axis: 'y' as const,
    edge: 'bottom' as const,
    position: interaction.baselineBounds.top + (baselineHeight * rawScale),
    category: 'edge' as const
  }
  setTextCornerScaleEnvironment({
    harness: interaction,
    environment: Object.freeze({ candidates: [xGuide, yGuide], zoom: 1 })
  })
  jest.spyOn(TextCornerScaleMeasurer.prototype, 'measure').mockImplementation(({ scale }) => {
    return createTextCornerScaleInteractionMeasurement({ harness: interaction, scale })
  })
  jest.spyOn(TextCornerScalePlan, 'resolveTextCornerScaleSnapMeasurement').mockReturnValue(null)

  expect(interaction.controller.beginGesture(createTextCornerScaleBeginEvent({ harness: interaction }))).toBe(true)
  expect(interaction.controller.handleObjectScaling(createTextCornerScaleStepEvent({
    harness: interaction,
    marker: new MouseEvent('pointermove'),
    scale: rawScale
  }))).toBe(true)

  expect(interaction.applyScaleMock).toHaveBeenCalledTimes(1)
  expect(interaction.publishGuidesMock).toHaveBeenCalledWith({
    guides: expect.arrayContaining([
      expect.objectContaining({ axis: 'x', position: xGuide.position }),
      expect.objectContaining({ axis: 'y', position: yGuide.position })
    ])
  })
})

it('не публикует направляющую при расхождении канонического состояния', () => {
  const interaction = createTextCornerScaleInteractionHarness()
  harness = interaction
  const rawScale = 1.02
  const snappedScale = 1.04
  const guide = createTextCornerScaleRightGuide({ harness: interaction, scale: snappedScale })
  setTextCornerScaleEnvironment({
    harness: interaction,
    environment: Object.freeze({ candidates: [guide], zoom: 1 })
  })
  jest.spyOn(TextCornerScaleMeasurer.prototype, 'measure').mockImplementation(({ scale }) => {
    return createTextCornerScaleInteractionMeasurement({ harness: interaction, scale })
  })
  interaction.applyScaleMock.mockImplementation(({ scale }) => {
    const canonicalState = createTextCornerScaleCanonicalState({ harness: interaction, scale })

    return materializeTextCornerScale({
      harness: interaction,
      scale,
      canonicalState: Object.freeze({
        ...canonicalState,
        fontSize: canonicalState.fontSize + 1
      })
    })
  })

  expect(interaction.controller.beginGesture(createTextCornerScaleBeginEvent({ harness: interaction }))).toBe(true)
  expect(interaction.controller.handleObjectScaling(createTextCornerScaleStepEvent({
    harness: interaction,
    marker: new MouseEvent('pointermove'),
    scale: rawScale
  }))).toBe(true)

  const finalBounds = getRequiredTextCornerScaleBounds({ target: interaction.target })
  expect(interaction.applyScaleMock.mock.calls[0]?.[0].scale).toBeCloseTo(snappedScale, 9)
  expect(finalBounds.right).toBeCloseTo(guide.position, 5)
  expect(interaction.publishGuidesMock).toHaveBeenCalledTimes(1)
  expect(interaction.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
})

it('не применяет каноническое состояние повторно для одного события указателя', () => {
  const interaction = createTextCornerScaleInteractionHarness()
  harness = interaction
  const rawScale = 1.08
  const marker = new MouseEvent('pointermove')
  jest.spyOn(TextCornerScaleMeasurer.prototype, 'measure').mockImplementation(({ scale }) => {
    return createTextCornerScaleInteractionMeasurement({ harness: interaction, scale })
  })
  const event = createTextCornerScaleStepEvent({ harness: interaction, marker, scale: rawScale })

  expect(interaction.controller.beginGesture(createTextCornerScaleBeginEvent({ harness: interaction }))).toBe(true)
  expect(interaction.controller.handleObjectScaling(event)).toBe(true)
  expect(interaction.controller.handleCanvasMouseMove(event)).toBe(true)

  expect(interaction.applyScaleMock).toHaveBeenCalledTimes(1)
  expect(interaction.markStepMock).toHaveBeenCalledTimes(1)
  expect(interaction.markStepMock).toHaveBeenCalledWith({ marker })
  expect(interaction.publishGuidesMock).toHaveBeenCalledTimes(1)
})

it('применяет скейлинг по mouse:move, если Fabric не отправил object:scaling', () => {
  const interaction = createTextCornerScaleInteractionHarness()
  harness = interaction
  const rawScale = 1.08
  const marker = new MouseEvent('pointermove')
  jest.spyOn(TextCornerScaleMeasurer.prototype, 'measure').mockImplementation(({ scale }) => {
    return createTextCornerScaleInteractionMeasurement({ harness: interaction, scale })
  })
  const event = createTextCornerScaleStepEvent({ harness: interaction, marker, scale: rawScale })

  expect(interaction.controller.beginGesture(createTextCornerScaleBeginEvent({ harness: interaction }))).toBe(true)
  expect(interaction.controller.handleCanvasMouseMove(event)).toBe(true)

  expect(interaction.applyScaleMock).toHaveBeenCalledTimes(1)
  expect(interaction.applyScaleMock.mock.calls[0]?.[0].scale).toBeCloseTo(rawScale, 9)
  expect(interaction.markStepMock).toHaveBeenCalledWith({ marker })
  expect(interaction.publishGuidesMock).toHaveBeenCalledTimes(1)
})

it('при потере условий общей логики продолжает тот же жест с прежним округлением', () => {
  const interaction = createTextCornerScaleInteractionHarness()
  harness = interaction
  jest.spyOn(TextCornerScaleMeasurer.prototype, 'measure').mockImplementation(({ scale }) => {
    return createTextCornerScaleInteractionMeasurement({ harness: interaction, scale })
  })

  expect(interaction.controller.beginGesture(createTextCornerScaleBeginEvent({ harness: interaction }))).toBe(true)
  expect(interaction.controller.handleObjectScaling(createTextCornerScaleStepEvent({
    harness: interaction,
    marker: new MouseEvent('pointermove'),
    scale: 1.08
  }))).toBe(true)

  interaction.transform.corner = 'tr'
  const continuedByExistingScaling = interaction.controller.handleObjectScaling(createTextCornerScaleStepEvent({
    harness: interaction,
    marker: new MouseEvent('pointermove'),
    scale: 1.1
  }))

  expect(continuedByExistingScaling).toBe(false)
  expect(interaction.prepareLegacyCommitMock).toHaveBeenCalledWith({ target: interaction.target })
  expect(interaction.clearScaleMock).not.toHaveBeenCalled()
  expect(interaction.applyScaleMock).toHaveBeenCalledTimes(1)
})
