import {
  createNestedLockGroupTarget,
  createObjectLockManagerSetup,
  createShapeGroupLockTarget
} from '../../../test-utils/managers/object-lock'

describe('ObjectLockManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('блокирует владеющую shape-группу, когда активным объектом является внутренний textbox в режиме редактирования', () => {
    const {
      manager,
      canvas,
      historyManager
    } = createObjectLockManagerSetup()
    const {
      group,
      shape,
      text
    } = createShapeGroupLockTarget()

    text.isEditing = true
    canvas.getActiveObject.mockReturnValue(text)

    manager.lockObject()

    expect(text.exitEditing).toHaveBeenCalledTimes(1)
    expect(text.isEditing).toBe(false)
    expect(text.exitEditing.mock.invocationCallOrder[0]).toBeLessThan(text.set.mock.invocationCallOrder[0])
    expect(group.locked).toBe(true)
    expect(shape.locked).toBe(true)
    expect(text.locked).toBe(true)
    expect(text.editable).toBe(false)
    expect(canvas.renderAll).toHaveBeenCalledTimes(1)
    expect(historyManager.saveState).toHaveBeenCalledTimes(1)
    expect(canvas.fire).toHaveBeenCalledWith('editor:object-locked', {
      object: group,
      skipInnerObjects: undefined,
      withoutSave: undefined
    })
  })

  it('разблокирует всю shape-группу, когда разблокировка запрошена от внутреннего textbox', () => {
    const {
      manager,
      canvas,
      historyManager
    } = createObjectLockManagerSetup()
    const {
      group,
      shape,
      text
    } = createShapeGroupLockTarget()

    group.locked = true
    shape.locked = true
    text.locked = true
    text.editable = false
    canvas.getActiveObject.mockReturnValue(text)

    manager.unlockObject()

    expect(group.locked).toBe(false)
    expect(shape.locked).toBe(false)
    expect(text.locked).toBe(false)
    expect(text.editable).toBe(true)
    expect(canvas.renderAll).toHaveBeenCalledTimes(1)
    expect(historyManager.saveState).toHaveBeenCalledTimes(1)
    expect(canvas.fire).toHaveBeenCalledWith('editor:object-unlocked', {
      object: group,
      withoutSave: undefined
    })
  })

  it('рекурсивно блокирует вложенные группы и их дочерние объекты', () => {
    const {
      manager,
      historyManager
    } = createObjectLockManagerSetup()
    const {
      rootGroup,
      nestedGroup,
      outerLeaf,
      innerLeaf
    } = createNestedLockGroupTarget()

    manager.lockObject({
      object: rootGroup as never
    })

    expect(rootGroup.locked).toBe(true)
    expect(nestedGroup.locked).toBe(true)
    expect(outerLeaf.locked).toBe(true)
    expect(innerLeaf.locked).toBe(true)
    expect(historyManager.saveState).toHaveBeenCalledTimes(1)
  })

  it('при skipInnerObjects блокирует только сам target и не трогает вложенные объекты', () => {
    const {
      manager,
      historyManager
    } = createObjectLockManagerSetup()
    const {
      rootGroup,
      nestedGroup,
      outerLeaf,
      innerLeaf
    } = createNestedLockGroupTarget()

    manager.lockObject({
      object: rootGroup as never,
      skipInnerObjects: true,
      withoutSave: true
    })

    expect(rootGroup.locked).toBe(true)
    expect(nestedGroup.locked).toBeUndefined()
    expect(outerLeaf.locked).toBe(false)
    expect(innerLeaf.locked).toBe(false)
    expect(outerLeaf.set).not.toHaveBeenCalled()
    expect(innerLeaf.set).not.toHaveBeenCalled()
    expect(historyManager.saveState).not.toHaveBeenCalled()
  })
})
