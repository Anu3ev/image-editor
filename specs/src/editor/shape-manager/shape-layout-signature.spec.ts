import '../../../test-utils/shape/manager-module-mocks'
import { CLIPBOARD_CLONE_OBJECT_KEYS } from '../../../../src/editor/constants'
import { OBJECT_SERIALIZATION_PROPS } from '../../../../src/editor/history-manager'
import ShapeManager from '../../../../src/editor/shape-manager'
import {
  hasShapeLayoutInputsChanged,
  resolveShapeLayoutSignature
} from '../../../../src/editor/shape-manager/domain/shape-layout-signature'
import {
  createShapeManagerEditorStub,
  createShapeRehydrationTarget,
  getShapeManagerUnitMocks,
  resetShapeManagerUnitMocks
} from '../../../test-utils/shape/manager-spec-helpers'

const mocks = getShapeManagerUnitMocks()

beforeEach(() => {
  resetShapeManagerUnitMocks(mocks)
})

it('отличает изменение layout-входов от transient scale и legacy-состояния', () => {
  const { group, text } = createShapeRehydrationTarget()

  group.shapeLayoutSignature = resolveShapeLayoutSignature({
    group,
    text
  })

  expect(hasShapeLayoutInputsChanged({ group, text })).toBe(false)

  group.scaleX = 1.5
  group.scaleY = 0.75

  expect(hasShapeLayoutInputsChanged({ group, text })).toBe(false)

  text.set({ text: 'изменённый отображаемый текст' })

  expect(hasShapeLayoutInputsChanged({ group, text })).toBe(true)

  group.shapeLayoutSignature = undefined

  expect(hasShapeLayoutInputsChanged({ group, text })).toBe(false)
})

it('после внешнего изменения serialized text повторно применяет auto-expand', () => {
  const editor = createShapeManagerEditorStub()
  const manager = new ShapeManager({
    editor: editor as never
  })
  const { group, text } = createShapeRehydrationTarget({
    width: 200,
    height: 100,
    manualWidth: 180,
    manualHeight: 90
  })

  group.shapeLayoutSignature = resolveShapeLayoutSignature({
    group,
    text
  })
  text.set({ text: 'изменённый длинный текст' })
  text.textCaseRaw = 'изменённый длинный текст'
  mocks.resolveShapeTextAutoExpandWidthForTextMock.mockReturnValue(360)

  const result = manager.commitRehydratedShapeLayout({
    target: group
  })
  const layoutCalls = mocks.applyShapeTextLayoutMock.mock.calls
  const layoutCall = layoutCalls[layoutCalls.length - 1]?.[0]

  expect(result).toBe(true)
  expect(mocks.resolveShapeTextAutoExpandWidthForTextMock).toHaveBeenCalledWith(
    expect.objectContaining({
      currentWidth: 200,
      minimumWidth: 180
    })
  )
  expect(layoutCall).toEqual(expect.objectContaining({
    width: 360,
    height: 100,
    expandShapeHeightToFitText: true
  }))
})

it('сохраняет layout-подпись в history, template и clipboard payload', () => {
  expect(OBJECT_SERIALIZATION_PROPS).toContain('shapeLayoutSignature')
  expect(CLIPBOARD_CLONE_OBJECT_KEYS).toContain('shapeLayoutSignature')
})
