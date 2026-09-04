import { Group, Rect } from 'fabric'

import { setupBrowserMocks } from '../../../test-utils/browser/clipboard-globals'
import { createManagerTestMocks } from '../../../test-utils/editor/manager-test-mocks'
import ClipboardManager from '../../../../src/editor/clipboard-manager'

describe('ClipboardManager: точная геометрия клона', () => {
  it('сохраняет дробную геометрию корня и вложенного объекта', async() => {
    setupBrowserMocks()

    const { mockCanvas, mockEditor } = createManagerTestMocks()
    const sourceChild = new Rect()
    const sourceGroup = new Group([sourceChild])
    const clonedChild = new Rect()
    const clonedGroup = new Group([clonedChild])
    const exactGeometry = {
      angle: 12.345678,
      height: 180.654321,
      left: 101.123456,
      scaleX: 1.234567,
      scaleY: 0.876543,
      skewX: 3.456789,
      skewY: -2.345678,
      strokeWidth: 0.123456,
      top: 76.654321,
      width: 220.123456
    }
    const roundedGeometry = {
      angle: 12.3457,
      height: 180.6543,
      left: 101.1235,
      scaleX: 1.2346,
      scaleY: 0.8765,
      skewX: 3.4568,
      skewY: -2.3457,
      strokeWidth: 0.1235,
      top: 76.6543,
      width: 220.1235
    }

    sourceGroup.set(exactGeometry)
    sourceChild.set(exactGeometry)
    clonedGroup.set(roundedGeometry)
    clonedChild.set(roundedGeometry)
    jest.spyOn(sourceGroup, 'clone').mockResolvedValue(clonedGroup as typeof sourceGroup)
    mockCanvas.getActiveObject.mockReturnValue(sourceGroup)

    const clipboardManager = new ClipboardManager({ editor: mockEditor })

    clipboardManager.copy()
    await new Promise(process.nextTick)

    expect(clipboardManager.clipboard).toBe(clonedGroup)
    expect(clonedGroup).toMatchObject(exactGeometry)
    expect(clonedChild).toMatchObject(exactGeometry)
    expect(sourceGroup.clone).toHaveBeenCalledTimes(1)
  })
})
