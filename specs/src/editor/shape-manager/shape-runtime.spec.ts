import { Group, Textbox } from 'fabric'
import {
  applyShapeGroupInteractivity,
  detachShapeGroupAutoLayout,
  getShapeRuntimeTextNode,
  prepareShapeTextNode
} from '../../../../src/editor/shape-manager/shape-runtime'
import {
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox
} from '../../../test-utils/shape-helpers'

describe('shape-runtime', () => {
  it('applyShapeGroupInteractivity включает interactive и subTargetCheck', () => {
    const shape = createMockShapeNode()
    const text = createMockShapeTextbox()
    const group = createMockShapeGroup({ shape, text }) as Group & {
      interactive?: boolean
      subTargetCheck?: boolean
      setInteractive?: jest.Mock
    }

    group.setInteractive = jest.fn()

    applyShapeGroupInteractivity({ group })

    expect(group.setInteractive).toHaveBeenCalledWith(true)
    expect(group.interactive).toBe(true)
    expect(group.subTargetCheck).toBe(true)
  })

  it('prepareShapeTextNode переводит textbox в базовый неинтерактивный режим', () => {
    const text = createMockShapeTextbox({ text: 'hello' })

    prepareShapeTextNode({ text })

    expect(text.hasBorders).toBe(false)
    expect(text.hasControls).toBe(false)
    expect(text.evented).toBe(false)
    expect(text.selectable).toBe(false)
    expect(text.editable).toBe(true)
    expect(text.shapeNodeType).toBe('text')
    expect(text.setCoords).toHaveBeenCalled()
  })

  it('detachShapeGroupAutoLayout отписывает все target objects от layout manager', () => {
    const shape = createMockShapeNode()
    const text = createMockShapeTextbox({ text: 'hello' })
    const group = createMockShapeGroup({ shape, text }) as Group & {
      layoutManager?: {
        unsubscribeTargets?: jest.Mock
      }
    }
    group.layoutManager = {
      unsubscribeTargets: jest.fn()
    }

    detachShapeGroupAutoLayout({ group })

    expect(group.layoutManager.unsubscribeTargets).toHaveBeenCalledWith({
      target: group,
      targets: group.getObjects()
    })
  })

  it('getShapeRuntimeTextNode предпочитает textbox с shapeNodeType=text', () => {
    const fallbackText = new Textbox('fallback', {})
    const preferredText = createMockShapeTextbox({ text: 'preferred' })
    const shape = createMockShapeNode()
    const group = new Group([shape, fallbackText, preferredText])

    const textNode = getShapeRuntimeTextNode({
      group
    })

    expect(textNode).toBe(preferredText)
  })

  it('getShapeRuntimeTextNode возвращает null если textbox отсутствует', () => {
    const shape = createMockShapeNode()
    const group = new Group([shape])

    expect(getShapeRuntimeTextNode({ group })).toBeNull()
  })
})
