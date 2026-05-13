import { AiGenerationOverlay } from '../../../../src/editor/interaction-blocker/ai-generation-overlay'
import { addRectangleToCanvasMock, createInteractionBlockerTestSetup, mockAnimationFrame, type AnimationFrameTestMocks } from './test-setup'

jest.mock('../../../../src/editor/utils/primitive-shapes', () => ({
  addRectangleToCanvas: jest.fn()
}))

describe('InteractionBlocker', () => {
  let animationFrameMocks: AnimationFrameTestMocks | null = null

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    animationFrameMocks?.restore()
    animationFrameMocks = null
  })

  it('объект overlay повторяет размеры и позицию монтажной области', () => {
    const { interactionBlocker } = createInteractionBlockerTestSetup()

    interactionBlocker.ensureOverlay()

    expect(interactionBlocker.overlayMask?.set).toHaveBeenCalledWith(expect.objectContaining({
      width: 400,
      height: 300,
      left: 200,
      top: 150,
      originX: 'center',
      originY: 'center',
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false
    }))
    expect(interactionBlocker.overlayMask?.visible).toBe(false)
    expect(interactionBlocker.overlayMask?.setCoords).toHaveBeenCalled()
  })

  it('по умолчанию создаёт старую маску через прямоугольник Fabric', () => {
    const { interactionBlocker, mockEditor, overlayMask } = createInteractionBlockerTestSetup({
      withOverlay: false
    })

    interactionBlocker.block()

    expect(addRectangleToCanvasMock).toHaveBeenCalledWith(expect.objectContaining({
      canvas: mockEditor.canvas,
      options: expect.objectContaining({
        id: 'overlay-mask',
        fill: mockEditor.options.overlayMaskColor,
        excludeFromExport: true
      })
    }))
    expect(interactionBlocker.overlayMask).toBe(overlayMask)
    expect(mockEditor.canvas.add).not.toHaveBeenCalled()
  })

  it('для AI-блокировки создаёт AI overlay внутри библиотеки', () => {
    animationFrameMocks = mockAnimationFrame()
    const { interactionBlocker, mockEditor } = createInteractionBlockerTestSetup({
      withOverlay: false
    })

    interactionBlocker.block({ overlay: 'ai-generation' })

    expect(addRectangleToCanvasMock).not.toHaveBeenCalled()
    expect(interactionBlocker.overlayMask).toBeInstanceOf(AiGenerationOverlay)
    expect(mockEditor.canvas.add).toHaveBeenCalledWith(interactionBlocker.overlayMask)
    expect(mockEditor.layerManager.bringToFront).toHaveBeenCalledWith(interactionBlocker.overlayMask, { withoutSave: true })
    expect(animationFrameMocks.requestAnimationFrameMock).toHaveBeenCalledTimes(1)
  })

  it('при блокировке редактора объект overlay появляется поверх монтажной области и отключает интерактивность', () => {
    const { canvasObjects, interactionBlocker, mockEditor } = createInteractionBlockerTestSetup()

    interactionBlocker.block()

    expect(interactionBlocker.isBlocked).toBe(true)
    expect(interactionBlocker.overlayMask?.visible).toBe(true)
    expect(mockEditor.canvas.selection).toBe(false)
    expect(mockEditor.canvas.skipTargetFind).toBe(true)
    expect(mockEditor.canvas.upperCanvasEl.style.pointerEvents).toBe('none')
    expect(mockEditor.canvas.lowerCanvasEl.style.pointerEvents).toBe('none')
    expect(canvasObjects.every((object) => !object.evented && !object.selectable)).toBe(true)
    expect(mockEditor.layerManager.bringToFront).toHaveBeenCalledWith(interactionBlocker.overlayMask, { withoutSave: true })
  })

  it('при разблокировке AI-блокировки останавливает animation frame', () => {
    animationFrameMocks = mockAnimationFrame()
    const { interactionBlocker, mockEditor } = createInteractionBlockerTestSetup({
      withOverlay: false
    })

    interactionBlocker.block({ overlay: 'ai-generation' })
    interactionBlocker.unblock()

    expect(animationFrameMocks.cancelAnimationFrameMock).toHaveBeenCalledWith(42)
    expect(interactionBlocker.isBlocked).toBe(false)
    expect(interactionBlocker.overlayMask?.visible).toBe(false)
    expect(mockEditor.historyManager.flushDeferredSaveAfterUnblock).toHaveBeenCalledTimes(1)
  })

  it('после AI-блокировки обычный block снова показывает старую маску', () => {
    animationFrameMocks = mockAnimationFrame()
    const { interactionBlocker, mockEditor, overlayMask } = createInteractionBlockerTestSetup({
      withOverlay: false
    })

    interactionBlocker.block({ overlay: 'ai-generation' })
    const aiOverlay = interactionBlocker.overlayMask

    interactionBlocker.unblock()
    addRectangleToCanvasMock.mockClear()
    mockEditor.canvas.remove.mockClear()

    interactionBlocker.block()

    expect(mockEditor.canvas.remove).toHaveBeenCalledWith(aiOverlay)
    expect(addRectangleToCanvasMock).toHaveBeenCalledTimes(1)
    expect(interactionBlocker.overlayMask).toBe(overlayMask)
    expect(interactionBlocker.overlayMask).not.toBeInstanceOf(AiGenerationOverlay)
  })

  it('вызывает flushDeferredSaveAfterUnblock после unblock', () => {
    const { interactionBlocker, mockEditor } = createInteractionBlockerTestSetup()
    jest.clearAllMocks()

    interactionBlocker.isBlocked = true
    interactionBlocker.unblock()

    expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalledTimes(1)
    expect(mockEditor.historyManager.resumeHistory).toHaveBeenCalledTimes(1)
    expect(mockEditor.historyManager.flushDeferredSaveAfterUnblock).toHaveBeenCalledTimes(1)
  })

  it('не вызывает flushDeferredSaveAfterUnblock если unblock не выполнился', () => {
    const { interactionBlocker, mockEditor } = createInteractionBlockerTestSetup()

    interactionBlocker.unblock()

    expect(mockEditor.historyManager.flushDeferredSaveAfterUnblock).not.toHaveBeenCalled()
  })
})
