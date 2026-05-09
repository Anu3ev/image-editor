import { Group, Rect, Textbox } from 'fabric'
import { ShapeGroupObject } from '../../../../src/editor/shape-manager/domain/shape-group'
import {
  getShapeNode,
  getShapeNodes,
  getShapeTextNode
} from '../../../../src/editor/shape-manager/domain/shape-nodes'
import {
  isShapeGroup,
  resolveShapeGroupFromTarget
} from '../../../../src/editor/shape-manager/domain/shape-reference'

describe('shape domain', () => {
  it('isShapeGroup возвращает true для ShapeGroupObject и legacy shapeComposite Group', () => {
    const shapeGroupObject = new ShapeGroupObject([], {})
    const group = new Group([], {}) as Group & {
      shapeComposite?: boolean
    }
    const regularGroup = new Group([], {})

    group.shapeComposite = true

    expect(isShapeGroup(shapeGroupObject)).toBe(true)
    expect(isShapeGroup(group)).toBe(true)
    expect(isShapeGroup(regularGroup)).toBe(false)
  })

  it('resolveShapeGroupFromTarget находит группу по target и subTargets', () => {
    const group = new Group([], {}) as Group & {
      shapeComposite?: boolean
    }

    group.shapeComposite = true

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
    const shapeNode = new Rect({
      shapeNodeType: 'shape'
    })
    const textNode = new Textbox('text', {
      shapeNodeType: 'text'
    })
    const group = new Group([shapeNode, textNode], {}) as Group & {
      shapeComposite?: boolean
    }

    group.shapeComposite = true

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
})
