import { Group, Textbox } from 'fabric'
import {
  applyGroupInteractivity,
  getShapeNode,
  getShapeNodes,
  getShapeTextNode,
  isShapeGroup,
  resolveShapeGroupFromTarget
} from '../../../../src/editor/shape-manager/shape-utils'

describe('shape-utils', () => {
  it('isShapeGroup возвращает true только для shapeComposite Group', () => {
    const group = new Group([], {
      shapeComposite: true
    }) as Group & {
      shapeComposite?: boolean
    }
    const regularGroup = new Group([], {})

    expect(isShapeGroup(group)).toBe(true)
    expect(isShapeGroup(regularGroup)).toBe(false)
  })

  it('resolveShapeGroupFromTarget находит группу по target и subTargets', () => {
    const group = new Group([], {
      shapeComposite: true
    }) as Group & {
      shapeComposite?: boolean
    }

    const child = new Textbox('text', {})
    const childWithGroup = child as Textbox & { group?: Group }
    childWithGroup.group = group

    const byTarget = resolveShapeGroupFromTarget({
      target: group
    })
    const byNestedTarget = resolveShapeGroupFromTarget({
      target: child
    })
    const bySubTarget = resolveShapeGroupFromTarget({
      subTargets: [child]
    })

    expect(byTarget).toBe(group)
    expect(byNestedTarget).toBe(group)
    expect(bySubTarget).toBe(group)
  })

  it('getShapeNode/getShapeTextNode находят узлы по shapeNodeType', () => {
    const shapeNode = {
      shapeNodeType: 'shape'
    }
    const textNode = new Textbox('text', {
      shapeNodeType: 'text'
    })
    const group = new Group([shapeNode, textNode], {
      shapeComposite: true
    })

    expect(getShapeNode({
      group
    })).toBe(shapeNode)

    expect(getShapeTextNode({
      group
    })).toBe(textNode)

    const pair = getShapeNodes({
      group
    })

    expect(pair).toEqual({
      shape: shapeNode,
      text: textNode
    })
  })

  it('applyGroupInteractivity включает interactive/subTargetCheck и вызывает setInteractive при наличии', () => {
    const group = new Group([], {
      shapeComposite: true
    }) as Group & {
      setInteractive?: jest.Mock
      interactive?: boolean
      subTargetCheck?: boolean
    }

    group.setInteractive = jest.fn()

    applyGroupInteractivity({
      group
    })

    expect(group.setInteractive).toHaveBeenCalledWith(true)
    expect(group.interactive).toBe(true)
    expect(group.subTargetCheck).toBe(true)
  })
})
