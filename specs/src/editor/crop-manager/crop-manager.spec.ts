import {
  Rect,
  type Canvas,
  type FabricObject
} from 'fabric'
import type { ImageEditor } from '../../../../src/editor'
import type {
  CropSession,
  StartCanvasCropOptions,
  StartImageCropOptions
} from '../../../../src/editor/crop-manager/types'
import {
  CropDimmingOverlay,
  installCropDimmingOverlay
} from '../../../../src/editor/crop-manager/domain/crop-dimming-overlay'
import { CropFrame } from '../../../../src/editor/crop-manager/domain/crop-frame'
import CropManager from '../../../../src/editor/crop-manager'
import { createCropImageTarget } from '../../../test-utils/crop/image-crop'
import { createEditorStub } from '../../../test-utils/editor/editor-stub'

/** Активный CropManager с минимальной runtime-сессией. */
type ActiveCropManagerFixture = {
  cropManager: CropManager
  editor: ImageEditor
  session: CropSession
}

/** Создаёт минимальную runtime-сессию crop manager для unit-проверок. */
const createMinimalSession = ({
  preserveAspectRatio = true,
  showDimmedArea = true
}: {
  preserveAspectRatio?: boolean
  showDimmedArea?: boolean
} = {}): CropSession => {
  const source = new Rect({ width: 100, height: 100 })
  const frame = new CropFrame({
    width: 50,
    height: 50,
    showGrid: false,
    preserveAspectRatio
  })

  source.calcTransformMatrix = jest.fn().mockReturnValue([1, 0, 0, 1, 0, 0])
  frame.calcTransformMatrix = jest.fn().mockReturnValue([1, 0, 0, 1, 0, 0])
  frame.on = jest.fn()
  frame.off = jest.fn()

  return {
    mode: 'canvas',
    source,
    target: null,
    frame,
    options: {
      preserveAspectRatio,
      allowFrameOverflow: true,
      showGrid: true,
      cancelOnSelectionClear: true,
      showDimmedArea
    },
    previousActiveObject: null,
    interactivity: [],
    sourceBoundFrameState: null,
    effectivePreserveAspectRatio: preserveAspectRatio
  }
}

/** Устанавливает исходные canvas-настройки, которые должен восстановить crop overlay. */
const prepareCanvasOverlayState = ({
  canvas,
  overlayImage
}: {
  canvas: Canvas
  overlayImage: FabricObject
}): void => {
  canvas.overlayImage = overlayImage
  canvas.overlayVpt = true
  canvas.controlsAboveOverlay = false
}

/** Создаёт CropManager с активной минимальной runtime-сессией. */
const createActiveCropManager = ({
  preserveAspectRatio = true,
  showDimmedArea = true
}: {
  preserveAspectRatio?: boolean
  showDimmedArea?: boolean
} = {}): ActiveCropManagerFixture => {
  const editor = createEditorStub() as ImageEditor
  const cropManager = new CropManager({ editor })
  const session = createMinimalSession({
    preserveAspectRatio,
    showDimmedArea
  })

  cropManager['_session'] = session

  return {
    cropManager,
    editor,
    session
  }
}

describe('CropManager', () => {
  describe('showDimmedArea', () => {
    it('по умолчанию включает затемнение вне crop-области для canvas и image crop', () => {
      const editor = createEditorStub() as ImageEditor
      const cropManager = new CropManager({ editor })
      const canvasOptions = cropManager['_resolveSessionOptions']({
        options: {} satisfies StartCanvasCropOptions
      })
      const imageOptions = cropManager['_resolveSessionOptions']({
        options: {} satisfies StartImageCropOptions
      })

      expect(canvasOptions.showDimmedArea).toBe(true)
      expect(imageOptions.showDimmedArea).toBe(true)
    })

    it('сохраняет явное отключение затемнения для canvas и image crop', () => {
      const editor = createEditorStub() as ImageEditor
      const cropManager = new CropManager({ editor })
      const canvasOptions = cropManager['_resolveSessionOptions']({
        options: { showDimmedArea: false } satisfies StartCanvasCropOptions
      })
      const imageOptions = cropManager['_resolveSessionOptions']({
        options: { showDimmedArea: false } satisfies StartImageCropOptions
      })

      expect(canvasOptions.showDimmedArea).toBe(false)
      expect(imageOptions.showDimmedArea).toBe(false)
    })

    it('отдаёт настройку затемнения в публичном состоянии активного crop mode', () => {
      const { cropManager, session } = createActiveCropManager({
        showDimmedArea: false
      })
      const state = cropManager.getState()

      expect(session.options.showDimmedArea).toBe(false)
      expect(state?.options.showDimmedArea).toBe(false)
    })

    it('не заменяет существующий canvas overlay при выключенном затемнении', () => {
      const editor = createEditorStub() as ImageEditor
      const cropManager = new CropManager({ editor })
      const session = createMinimalSession({ showDimmedArea: false })
      const previousOverlay = new Rect({ width: 10, height: 10 })
      const canvas = editor.canvas as Canvas

      prepareCanvasOverlayState({
        canvas,
        overlayImage: previousOverlay
      })
      cropManager['_createCanvasSession'] = jest.fn().mockReturnValue(session)

      const state = cropManager.startCanvasCrop({ showDimmedArea: false })

      expect(state?.options.showDimmedArea).toBe(false)
      expect(canvas.overlayImage).toBe(previousOverlay)
      expect(canvas.overlayVpt).toBe(true)
    })
  })

  describe('dimming overlay lifecycle', () => {
    it('восстанавливает предыдущие canvas overlay-настройки после cancel', () => {
      const { cropManager, editor, session } = createActiveCropManager()
      const previousOverlay = new Rect({ width: 10, height: 10 })
      const canvas = editor.canvas as Canvas

      prepareCanvasOverlayState({
        canvas,
        overlayImage: previousOverlay
      })
      installCropDimmingOverlay({
        canvas,
        frame: session.frame
      })

      const cancelled = cropManager.cancel()

      expect(cancelled).toBe(true)
      expect(canvas.overlayImage).toBe(previousOverlay)
      expect(canvas.overlayVpt).toBe(true)
      expect(canvas.controlsAboveOverlay).toBe(false)
    })

    it('восстанавливает предыдущие canvas overlay-настройки после apply', () => {
      const { cropManager, editor, session } = createActiveCropManager()
      const previousOverlay = new Rect({ width: 10, height: 10 })
      const canvas = editor.canvas as Canvas

      prepareCanvasOverlayState({
        canvas,
        overlayImage: previousOverlay
      })
      installCropDimmingOverlay({
        canvas,
        frame: session.frame
      })
      cropManager['_applySessionCrop'] = jest.fn().mockReturnValue({
        mode: 'canvas',
        target: null,
        rect: {
          left: 0,
          top: 0,
          width: 100,
          height: 100
        }
      })

      const result = cropManager.apply()

      expect(result?.mode).toBe('canvas')
      expect(canvas.overlayImage).toBe(previousOverlay)
      expect(canvas.overlayVpt).toBe(true)
      expect(canvas.controlsAboveOverlay).toBe(false)
    })

    it('восстанавливает предыдущие canvas overlay-настройки при destroy', () => {
      const { cropManager, editor, session } = createActiveCropManager()
      const previousOverlay = new Rect({ width: 10, height: 10 })
      const canvas = editor.canvas as Canvas

      prepareCanvasOverlayState({
        canvas,
        overlayImage: previousOverlay
      })
      installCropDimmingOverlay({
        canvas,
        frame: session.frame
      })

      cropManager.destroy()

      expect(cropManager.isActive).toBe(false)
      expect(canvas.overlayImage).toBe(previousOverlay)
      expect(canvas.overlayVpt).toBe(true)
      expect(canvas.controlsAboveOverlay).toBe(false)
    })

    it('не теряет предыдущие canvas overlay-настройки при повторном входе в crop mode', () => {
      const editor = createEditorStub() as ImageEditor
      const cropManager = new CropManager({ editor })
      const firstSession = createMinimalSession()
      const secondSession = createMinimalSession()
      const previousOverlay = new Rect({ width: 10, height: 10 })
      const canvas = editor.canvas as Canvas

      prepareCanvasOverlayState({
        canvas,
        overlayImage: previousOverlay
      })
      jest.spyOn(editor.canvasManager, 'getObjects').mockReturnValue([])
      const sessions = [firstSession, secondSession]
      let nextSessionIndex = 0

      cropManager['_createCanvasSession'] = jest.fn(() => {
        const session = sessions[nextSessionIndex]

        if (!session) {
          throw new Error('Повторный вход в crop mode не должен создавать третью session')
        }

        nextSessionIndex += 1

        return session
      })

      cropManager.startCanvasCrop()
      const firstOverlay = canvas.overlayImage
      cropManager.startCanvasCrop()
      const secondOverlay = canvas.overlayImage
      cropManager.cancel()

      expect(firstOverlay).toBeInstanceOf(CropDimmingOverlay)
      expect(secondOverlay).toBeInstanceOf(CropDimmingOverlay)
      expect(secondOverlay).not.toBe(firstOverlay)
      expect(canvas.overlayImage).toBe(previousOverlay)
      expect(canvas.overlayVpt).toBe(true)
      expect(canvas.controlsAboveOverlay).toBe(false)
    })
  })

  describe('effectivePreserveAspectRatio', () => {
    it('возвращает true, когда crop mode не активен', () => {
      const editor = createEditorStub() as ImageEditor
      const cropManager = new CropManager({ editor })

      expect(cropManager.effectivePreserveAspectRatio).toBe(true)
      expect(cropManager.isActive).toBe(false)
    })

    it('возвращает кэшированное значение из активной сессии', () => {
      const { cropManager } = createActiveCropManager({
        preserveAspectRatio: false
      })

      expect(cropManager.effectivePreserveAspectRatio).toBe(false)
      expect(cropManager.getState()?.effectivePreserveAspectRatio).toBe(false)
      expect(cropManager.isActive).toBe(true)
    })

    it('обновляется на false после setPreserveAspectRatio(false)', () => {
      const { cropManager, session } = createActiveCropManager({
        preserveAspectRatio: true
      })

      cropManager.setPreserveAspectRatio({ preserveAspectRatio: false })

      expect(cropManager.effectivePreserveAspectRatio).toBe(false)
      expect(session.options.preserveAspectRatio).toBe(false)
    })

    it('сохраняет текущий resize-режим при keepCurrentResizeMode во время active resize', () => {
      const {
        cropManager,
        session
      } = createActiveCropManager({
        preserveAspectRatio: true
      })

      session.effectivePreserveAspectRatio = false
      cropManager['_activeResizePreserveAspectRatio'] = false
      cropManager.setPreserveAspectRatio({
        preserveAspectRatio: false,
        keepCurrentResizeMode: true
      })

      expect(session.options.preserveAspectRatio).toBe(false)
      expect(cropManager.effectivePreserveAspectRatio).toBe(false)
      expect(cropManager['_activeResizePreserveAspectRatio']).toBe(false)
      expect((session.frame as CropFrame).cropActiveResizePreserveAspectRatio).toBe(false)
    })

    it('игнорирует keepCurrentResizeMode вне live resize change', () => {
      const { cropManager, session } = createActiveCropManager({
        preserveAspectRatio: false
      })

      session.effectivePreserveAspectRatio = true
      cropManager.setPreserveAspectRatio({
        preserveAspectRatio: false,
        keepCurrentResizeMode: true
      })

      expect(session.options.preserveAspectRatio).toBe(false)
      expect(cropManager.effectivePreserveAspectRatio).toBe(false)
      expect((session.frame as CropFrame).cropActiveResizePreserveAspectRatio).toBeNull()
    })

    it('очищает текущий resize-режим после cancel', () => {
      const { cropManager } = createActiveCropManager({
        preserveAspectRatio: true
      })

      cropManager['_activeResizePreserveAspectRatio'] = false

      expect(cropManager.cancel()).toBe(true)
      expect(cropManager['_activeResizePreserveAspectRatio']).toBeNull()
      expect(cropManager.isActive).toBe(false)
    })
  })

  describe('_getEffectivePreserveAspectRatio', () => {
    it('возвращает базовое значение без зажатого Shift', () => {
      const { cropManager, session } = createActiveCropManager({
        preserveAspectRatio: true
      })

      const result = cropManager['_getEffectivePreserveAspectRatio']({
        e: { shiftKey: false }
      })

      expect(result).toBe(true)
      expect(session.options.preserveAspectRatio).toBe(true)
    })

    it('инвертирует базовое значение при зажатом Shift', () => {
      const { cropManager, session } = createActiveCropManager({
        preserveAspectRatio: true
      })

      const result = cropManager['_getEffectivePreserveAspectRatio']({
        e: { shiftKey: true }
      })

      expect(result).toBe(false)
      expect(session.options.preserveAspectRatio).toBe(true)
    })

    it('включает сохранение пропорций по Shift при базовом свободном resize', () => {
      const { cropManager, session } = createActiveCropManager({
        preserveAspectRatio: false
      })

      const result = cropManager['_getEffectivePreserveAspectRatio']({
        e: { shiftKey: true }
      })

      expect(result).toBe(true)
      expect(session.options.preserveAspectRatio).toBe(false)
    })

    it('возвращает true при source-clamped transform без явного флага', () => {
      const { cropManager, session } = createActiveCropManager({
        preserveAspectRatio: false
      })

      const result = cropManager['_getEffectivePreserveAspectRatio']({
        transform: { cropSourceScaleClamped: true }
      })

      expect(result).toBe(true)
      expect(session.options.preserveAspectRatio).toBe(false)
    })

    it('возвращает true, когда crop mode не активен', () => {
      const editor = createEditorStub() as ImageEditor
      const cropManager = new CropManager({ editor })

      const result = cropManager['_getEffectivePreserveAspectRatio']()

      expect(result).toBe(true)
      expect(cropManager.isActive).toBe(false)
    })
  })

  describe('isFrameOverflowingSource', () => {
    it('сообщает о выходе только по X, когда crop frame пересёк правую границу source', () => {
      const { cropManager, session } = createActiveCropManager()
      session.options.allowFrameOverflow = false
      session.frame.calcTransformMatrix = jest.fn().mockReturnValue([1, 0, 0, 1, 26, 0])

      expect(cropManager.isFrameOverflowingSource({ target: session.frame })).toBe(true)
      expect(cropManager.isFrameOverflowingSource({ target: session.frame, axis: 'x' })).toBe(true)
      expect(cropManager.isFrameOverflowingSource({ target: session.frame, axis: 'y' })).toBe(false)
    })

    it('сообщает о выходе только по Y, когда crop frame пересёк верхнюю границу source', () => {
      const { cropManager, session } = createActiveCropManager()
      session.options.allowFrameOverflow = false
      session.frame.calcTransformMatrix = jest.fn().mockReturnValue([1, 0, 0, 1, 0, -26])

      expect(cropManager.isFrameOverflowingSource({ target: session.frame })).toBe(true)
      expect(cropManager.isFrameOverflowingSource({ target: session.frame, axis: 'x' })).toBe(false)
      expect(cropManager.isFrameOverflowingSource({ target: session.frame, axis: 'y' })).toBe(true)
    })
  })

  describe('resetFrameToSource', () => {
    it('разворачивает frame до максимального размера с текущими пропорциями, когда keep ratio включён', () => {
      const { cropManager, session } = createActiveCropManager({
        preserveAspectRatio: true
      })

      session.source.set({ width: 1000, height: 667 })
      session.frame.set({ width: 300, height: 300 })

      const state = cropManager.resetFrameToSource({ target: session.frame })

      expect(state).not.toBeNull()
      expect(session.frame.width).toBeCloseTo(667, 5)
      expect(session.frame.height).toBeCloseTo(667, 5)
    })

    it('разворачивает frame до полного размера source, когда keep ratio выключен', () => {
      const { cropManager, session } = createActiveCropManager({
        preserveAspectRatio: false
      })

      session.source.set({ width: 1000, height: 667 })
      session.frame.set({ width: 300, height: 300 })

      const state = cropManager.resetFrameToSource({ target: session.frame })

      expect(state).not.toBeNull()
      expect(session.frame.width).toBeCloseTo(1000, 5)
      expect(session.frame.height).toBeCloseTo(667, 5)
    })

    it('разворачивает image crop без target, используя source активной сессии', () => {
      const { cropManager } = createActiveCropManager()
      const image = createCropImageTarget({ width: 1000, height: 667 })
      image.calcTransformMatrix = jest.fn().mockReturnValue([1, 0, 0, 1, 0, 0])
      const imageSession = {
        ...createMinimalSession(),
        mode: 'image',
        source: image,
        target: image
      } satisfies CropSession

      cropManager['_session'] = imageSession

      const state = cropManager.resetFrameToSource()

      expect(state).not.toBeNull()
      expect(state?.target).toBe(image)
      expect(imageSession.frame.width).toBeCloseTo(667, 5)
      expect(imageSession.frame.height).toBeCloseTo(667, 5)
    })

    it('не сбрасывает image crop по явному null target', () => {
      const { cropManager } = createActiveCropManager()
      const image = createCropImageTarget({ width: 1000, height: 667 })
      const imageSession = {
        ...createMinimalSession(),
        mode: 'image',
        source: image,
        target: image
      } satisfies CropSession

      cropManager['_session'] = imageSession

      const state = cropManager.resetFrameToSource({ target: null })

      expect(state).toBeNull()
      expect(imageSession.frame.width).toBe(50)
      expect(imageSession.frame.height).toBe(50)
    })

    it('не сбрасывает canvas crop без target', () => {
      const { cropManager, session } = createActiveCropManager()

      const state = cropManager.resetFrameToSource()

      expect(state).toBeNull()
      expect(session.frame.width).toBe(50)
      expect(session.frame.height).toBe(50)
    })
  })

  describe('fitFrame', () => {
    it('масштабирует active crop с разрешённым overflow через transformManager и возвращает crop state', () => {
      const {
        cropManager,
        editor,
        session
      } = createActiveCropManager()

      const state = cropManager.fitFrame({ type: 'cover' })

      expect(editor.transformManager.fitObject).toHaveBeenCalledWith({
        object: session.frame,
        type: 'cover',
        withoutSave: true,
        fitAsOneObject: true
      })
      expect(state?.frame).toBe(session.frame)
      expect(editor.canvas.requestRenderAll).toHaveBeenCalled()
    })

    it.each([
      {
        name: 'contain',
        type: 'contain'
      },
      {
        name: 'cover',
        type: 'cover'
      }
    ] as const)('при выключенном Allow outside source $name разворачивает crop-область до source', ({ type }) => {
      const {
        cropManager,
        editor,
        session
      } = createActiveCropManager()

      session.options.allowFrameOverflow = false
      session.source.set({ width: 1000, height: 667 })
      session.frame.set({ width: 300, height: 300 })

      const state = cropManager.fitFrame({ type })

      expect(state).not.toBeNull()
      expect(session.frame.width).toBeCloseTo(667, 5)
      expect(session.frame.height).toBeCloseTo(667, 5)
      expect(editor.transformManager.fitObject).not.toHaveBeenCalled()
    })

    it('возвращает null без active crop mode', () => {
      const editor = createEditorStub() as ImageEditor
      const cropManager = new CropManager({ editor })

      const state = cropManager.fitFrame({ type: 'contain' })

      expect(state).toBeNull()
      expect(editor.transformManager.fitObject).not.toHaveBeenCalled()
    })
  })
})
