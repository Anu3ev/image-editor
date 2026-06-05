import { Rect } from 'fabric'
import type { ImageEditor } from '../../../../src/editor'
import type { CropSession } from '../../../../src/editor/crop-manager/types'
import { CropFrame } from '../../../../src/editor/crop-manager/domain/crop-frame'
import CropManager from '../../../../src/editor/crop-manager'
import { createEditorStub } from '../../../test-utils/editor/editor-stub'

/** Активный CropManager с минимальной runtime-сессией. */
type ActiveCropManagerFixture = {
  cropManager: CropManager
  session: CropSession
}

/** Создаёт минимальную runtime-сессию crop manager для unit-проверок. */
const createMinimalSession = ({
  preserveAspectRatio = true
}: {
  preserveAspectRatio?: boolean
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
      cancelOnSelectionClear: true
    },
    previousActiveObject: null,
    interactivity: [],
    sourceBoundFrameState: null,
    effectivePreserveAspectRatio: preserveAspectRatio
  }
}

/** Создаёт CropManager с активной минимальной runtime-сессией. */
const createActiveCropManager = ({
  preserveAspectRatio = true
}: {
  preserveAspectRatio?: boolean
} = {}): ActiveCropManagerFixture => {
  const editor = createEditorStub() as ImageEditor
  const cropManager = new CropManager({ editor })
  const session = createMinimalSession({ preserveAspectRatio })

  cropManager['_session'] = session

  return {
    cropManager,
    session
  }
}

describe('CropManager', () => {
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
})
