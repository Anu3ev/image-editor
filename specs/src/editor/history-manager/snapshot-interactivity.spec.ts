import {
  collectSnapshotObjects,
  withNormalizedInteractivityForSnapshot
} from '../../../../src/editor/history-manager/snapshot-interactivity'
import {
  createSnapshotCanvas,
  createSnapshotShapeGroup,
  createSnapshotTextObject
} from '../../../test-utils/history-helpers'

describe('history-manager/snapshot-interactivity', () => {
  it('collectSnapshotObjects возвращает и shape-группу, и её дочерний текст', () => {
    const text = createSnapshotTextObject({
      id: 'shape-text-1'
    })
    const group = createSnapshotShapeGroup({
      id: 'shape-1',
      childObjects: [text]
    })
    const canvas = createSnapshotCanvas({
      objects: [group]
    })

    const snapshotObjects = collectSnapshotObjects({ canvas })

    expect(snapshotObjects).toEqual([group, text])
  })

  it('withNormalizedInteractivityForSnapshot временно нормализует shape-группу и текст в режиме редактирования', () => {
    const text = createSnapshotTextObject({
      id: 'shape-text-1',
      isEditing: true,
      selectable: false,
      evented: false,
      lockMovementX: true,
      lockMovementY: true
    })
    const group = createSnapshotShapeGroup({
      id: 'shape-1',
      childObjects: [text],
      selectable: false,
      evented: true,
      lockMovementX: true,
      lockMovementY: true
    })
    const canvas = createSnapshotCanvas({
      objects: [group]
    })

    const inspectNormalizedState = () => {
      expect(group.selectable).toBe(true)
      expect(group.lockMovementX).toBe(false)
      expect(group.lockMovementY).toBe(false)
      expect(text.selectable).toBe(false)
      expect(text.evented).toBe(false)
      expect(text.lockMovementX).toBe(false)
      expect(text.lockMovementY).toBe(false)

      return 'normalized'
    }

    const result = withNormalizedInteractivityForSnapshot({
      canvas,
      callback: inspectNormalizedState
    })

    expect(result).toBe('normalized')
    expect(group.selectable).toBe(false)
    expect(group.lockMovementX).toBe(true)
    expect(group.lockMovementY).toBe(true)
    expect(text.selectable).toBe(false)
    expect(text.evented).toBe(false)
    expect(text.lockMovementX).toBe(true)
    expect(text.lockMovementY).toBe(true)
  })

  it('withNormalizedInteractivityForSnapshot временно снимает lockMovement у обычного текста и потом восстанавливает его', () => {
    const text = createSnapshotTextObject({
      id: 'plain-text-1',
      lockMovementX: true,
      lockMovementY: true,
      selectable: false
    })
    const canvas = createSnapshotCanvas({
      objects: [text]
    })

    const inspectNormalizedState = () => {
      expect(text.lockMovementX).toBe(false)
      expect(text.lockMovementY).toBe(false)
      expect(text.selectable).toBe(true)
    }

    withNormalizedInteractivityForSnapshot({
      canvas,
      callback: inspectNormalizedState
    })

    expect(text.lockMovementX).toBe(true)
    expect(text.lockMovementY).toBe(true)
    expect(text.selectable).toBe(false)
  })

  it('withNormalizedInteractivityForSnapshot не изменяет действительно заблокированный текст', () => {
    const text = createSnapshotTextObject({
      id: 'locked-text-1',
      locked: true,
      lockMovementX: true,
      lockMovementY: true,
      selectable: false
    })
    const canvas = createSnapshotCanvas({
      objects: [text]
    })

    const inspectState = () => {
      expect(text.lockMovementX).toBe(true)
      expect(text.lockMovementY).toBe(true)
      expect(text.selectable).toBe(false)
    }

    withNormalizedInteractivityForSnapshot({
      canvas,
      callback: inspectState
    })

    expect(text.lockMovementX).toBe(true)
    expect(text.lockMovementY).toBe(true)
    expect(text.selectable).toBe(false)
  })

  it('withNormalizedInteractivityForSnapshot восстанавливает интерактивность даже если callback бросает ошибку', () => {
    const text = createSnapshotTextObject({
      id: 'shape-text-1',
      isEditing: true,
      selectable: false,
      evented: false,
      lockMovementX: true,
      lockMovementY: true
    })
    const group = createSnapshotShapeGroup({
      id: 'shape-1',
      childObjects: [text],
      selectable: false,
      evented: true,
      lockMovementX: true,
      lockMovementY: true
    })
    const canvas = createSnapshotCanvas({
      objects: [group]
    })

    const throwError = () => {
      throw new Error('snapshot error')
    }

    expect(() => withNormalizedInteractivityForSnapshot({
      canvas,
      callback: throwError
    })).toThrow('snapshot error')

    expect(group.selectable).toBe(false)
    expect(group.lockMovementX).toBe(true)
    expect(group.lockMovementY).toBe(true)
    expect(text.selectable).toBe(false)
    expect(text.evented).toBe(false)
    expect(text.lockMovementX).toBe(true)
    expect(text.lockMovementY).toBe(true)
  })
})
