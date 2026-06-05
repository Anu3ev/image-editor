import { Rect } from 'fabric'
import type { ImageEditor } from '../../../../src/editor'
import type { CropSession } from '../../../../src/editor/crop-manager/types'
import { CropFrame } from '../../../../src/editor/crop-manager/domain/crop-frame'
import CropManager from '../../../../src/editor/crop-manager'
import { createEditorStub } from '../../../test-utils/editor/editor-stub'

const createMinimalSession = ({
  preserveAspectRatio = true
}: {
  preserveAspectRatio?: boolean
} = {}): CropSession => {
  const source = new Rect({ width: 100, height: 100 })
  const frame = new CropFrame({ width: 50, height: 50, showGrid: false })

  source.calcTransformMatrix = jest.fn().mockReturnValue([1, 0, 0, 1, 0, 0])
  frame.calcTransformMatrix = jest.fn().mockReturnValue([1, 0, 0, 1, 0, 0])

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
  } as CropSession
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
      const editor = createEditorStub() as ImageEditor
      const cropManager = new CropManager({ editor })
      const session = createMinimalSession({ preserveAspectRatio: false });
      (cropManager as any)._session = session

      expect(cropManager.effectivePreserveAspectRatio).toBe(false)
      expect(cropManager.isActive).toBe(true)
    })

    it('обновляется на false после setPreserveAspectRatio(false)', () => {
      const editor = createEditorStub() as ImageEditor
      const cropManager = new CropManager({ editor })
      const session = createMinimalSession({ preserveAspectRatio: true });
      (cropManager as any)._session = session
      cropManager.setPreserveAspectRatio({ preserveAspectRatio: false })

      expect(cropManager.effectivePreserveAspectRatio).toBe(false)
      expect(session.options.preserveAspectRatio).toBe(false)
    })
  })

  describe('_getEffectivePreserveAspectRatio', () => {
    it('возвращает базовое значение без зажатого Shift', () => {
      const editor = createEditorStub() as ImageEditor
      const cropManager = new CropManager({ editor })
      const session = createMinimalSession({ preserveAspectRatio: true });
      (cropManager as any)._session = session

      const result = (cropManager as any)._getEffectivePreserveAspectRatio({
        e: { shiftKey: false }
      })

      expect(result).toBe(true)
      expect(session.options.preserveAspectRatio).toBe(true)
    })

    it('инвертирует базовое значение при зажатом Shift', () => {
      const editor = createEditorStub() as ImageEditor
      const cropManager = new CropManager({ editor })
      const session = createMinimalSession({ preserveAspectRatio: true });
      (cropManager as any)._session = session

      const result = (cropManager as any)._getEffectivePreserveAspectRatio({
        e: { shiftKey: true }
      })

      expect(result).toBe(false)
      expect(session.options.preserveAspectRatio).toBe(true)
    })

    it('возвращает true при source-clamped transform без явного флага', () => {
      const editor = createEditorStub() as ImageEditor
      const cropManager = new CropManager({ editor })
      const session = createMinimalSession({ preserveAspectRatio: false });
      (cropManager as any)._session = session

      const result = (cropManager as any)._getEffectivePreserveAspectRatio({
        transform: { cropSourceScaleClamped: true }
      })

      expect(result).toBe(true)
      expect(session.options.preserveAspectRatio).toBe(false)
    })

    it('возвращает true, когда crop mode не активен', () => {
      const editor = createEditorStub() as ImageEditor
      const cropManager = new CropManager({ editor })

      const result = (cropManager as any)._getEffectivePreserveAspectRatio()

      expect(result).toBe(true)
      expect(cropManager.isActive).toBe(false)
    })
  })
})
