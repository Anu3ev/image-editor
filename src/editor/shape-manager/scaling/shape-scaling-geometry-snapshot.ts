import {
  Rect,
  util,
  type FabricObject
} from 'fabric'
import { english, type Translate } from '../../i18n'

import { getShapeNodes } from '../domain/shape-nodes'
import type {
  ShapeGroup,
  ShapeNode,
  ShapeTextNode
} from '../types'

/** Fabric-object geometry and transform before layout changes. */
type FabricGeometrySnapshot = Readonly<{
  height: number
  originX: FabricObject['originX']
  originY: FabricObject['originY']
  transform: Readonly<ReturnType<typeof util.saveObjectTransform>>
  width: number
}>

/** Group-layout properties changed when committing scaling. */
type ShapeGroupLayoutSnapshot = Readonly<{
  shapeAlignHorizontal: ShapeGroup['shapeAlignHorizontal']
  shapeAlignVertical: ShapeGroup['shapeAlignVertical']
  shapeBaseHeight: ShapeGroup['shapeBaseHeight']
  shapeBaseWidth: ShapeGroup['shapeBaseWidth']
  shapeLayoutSignature: ShapeGroup['shapeLayoutSignature']
  shapeManualBaseHeight: ShapeGroup['shapeManualBaseHeight']
  shapeManualBaseWidth: ShapeGroup['shapeManualBaseWidth']
  shapePaddingBottom: ShapeGroup['shapePaddingBottom']
  shapePaddingLeft: ShapeGroup['shapePaddingLeft']
  shapePaddingRight: ShapeGroup['shapePaddingRight']
  shapePaddingTop: ShapeGroup['shapePaddingTop']
  shapeReplaceBoxHeight: ShapeGroup['shapeReplaceBoxHeight']
  shapeReplaceBoxWidth: ShapeGroup['shapeReplaceBoxWidth']
  shapeTextAutoExpand: ShapeGroup['shapeTextAutoExpand']
}>

/** Rectangle rounding transferred to the shape node during resizing. */
type ShapeNodeRoundingSnapshot = Readonly<{
  rx: number
  ry: number
}> | null

/** Text-layout properties that may change when committing dimensions. */
type ShapeTextLayoutSnapshot = Readonly<{
  autoExpand: ShapeTextNode['autoExpand']
  splitByGrapheme: ShapeTextNode['splitByGrapheme']
  textAlign: ShapeTextNode['textAlign']
}>

/** Complete snapshot of mutable shape-composition geometry for an atomic operation. */
export type ShapeScalingGeometrySnapshot = Readonly<{
  group: ShapeGroup
  groupGeometry: FabricGeometrySnapshot
  groupLayout: ShapeGroupLayoutSnapshot
  shape: ShapeNode
  shapeGeometry: FabricGeometrySnapshot
  shapeRounding: ShapeNodeRoundingSnapshot
  text: ShapeTextNode
  textGeometry: FabricGeometrySnapshot
  textLayout: ShapeTextLayoutSnapshot
}>

/** Saves Fabric-object geometry through its standard transform properties. */
function captureFabricGeometry({
  object
}: {
  object: FabricObject
}): FabricGeometrySnapshot {
  return Object.freeze({
    height: object.height,
    originX: object.originX,
    originY: object.originY,
    transform: Object.freeze({ ...util.saveObjectTransform(object) }),
    width: object.width
  })
}

/** Restores Fabric-object geometry without replacing the object. */
function restoreFabricGeometry({
  object,
  snapshot
}: {
  object: FabricObject
  snapshot: FabricGeometrySnapshot
}): void {
  object.set({
    ...snapshot.transform,
    height: snapshot.height,
    originX: snapshot.originX,
    originY: snapshot.originY,
    width: snapshot.width,
    dirty: true
  })
  object.setCoords()
}

/** Saves group-layout properties changed when committing scaling. */
function captureGroupLayout({
  group
}: {
  group: ShapeGroup
}): ShapeGroupLayoutSnapshot {
  return Object.freeze({
    shapeAlignHorizontal: group.shapeAlignHorizontal,
    shapeAlignVertical: group.shapeAlignVertical,
    shapeBaseHeight: group.shapeBaseHeight,
    shapeBaseWidth: group.shapeBaseWidth,
    shapeLayoutSignature: group.shapeLayoutSignature,
    shapeManualBaseHeight: group.shapeManualBaseHeight,
    shapeManualBaseWidth: group.shapeManualBaseWidth,
    shapePaddingBottom: group.shapePaddingBottom,
    shapePaddingLeft: group.shapePaddingLeft,
    shapePaddingRight: group.shapePaddingRight,
    shapePaddingTop: group.shapePaddingTop,
    shapeReplaceBoxHeight: group.shapeReplaceBoxHeight,
    shapeReplaceBoxWidth: group.shapeReplaceBoxWidth,
    shapeTextAutoExpand: group.shapeTextAutoExpand
  })
}

/** Saves the shape node's rectangle rounding, if present. */
function captureShapeRounding({
  shape
}: {
  shape: ShapeNode
}): ShapeNodeRoundingSnapshot {
  if (!(shape instanceof Rect)) return null

  return Object.freeze({
    rx: shape.rx,
    ry: shape.ry
  })
}

/** Restores rounding on a rectangular shape node. */
function restoreShapeRounding({
  t = english,
  shape,
  snapshot
}: {
  t?: Translate
  shape: ShapeNode
  snapshot: ShapeNodeRoundingSnapshot
}): void {
  if (!snapshot) return
  if (!(shape instanceof Rect)) throw new Error(t('shape.errors.roundingRestoreRequiresRectangle'))

  shape.set(snapshot)
}

/** Saves inner-text properties changed by shape layout. */
function captureTextLayout({
  text
}: {
  text: ShapeTextNode
}): ShapeTextLayoutSnapshot {
  return Object.freeze({
    autoExpand: text.autoExpand,
    splitByGrapheme: text.splitByGrapheme,
    textAlign: text.textAlign
  })
}

/** Restores the internal text measurement for the saved width. */
function restoreTextGeometry({
  geometry,
  layout,
  text
}: {
  geometry: FabricGeometrySnapshot
  layout: ShapeTextLayoutSnapshot
  text: ShapeTextNode
}): void {
  text.set({
    autoExpand: layout.autoExpand,
    splitByGrapheme: layout.splitByGrapheme,
    textAlign: layout.textAlign,
    width: geometry.width
  })
  text.initDimensions()
  restoreFabricGeometry({ object: text, snapshot: geometry })
}

/** Saves mutable group, shape, and text geometry before an atomic scaling step. */
export function captureShapeScalingGeometry({
  t = english,
  group
}: {
  t?: Translate
  group: ShapeGroup
}): ShapeScalingGeometrySnapshot {
  const { shape, text } = getShapeNodes({ group })
  if (!shape || !text) throw new Error(t('shape.errors.snapshotRequiresCompleteComposition'))

  return Object.freeze({
    group,
    groupGeometry: captureFabricGeometry({ object: group }),
    groupLayout: captureGroupLayout({ group }),
    shape,
    shapeGeometry: captureFabricGeometry({ object: shape }),
    shapeRounding: captureShapeRounding({ shape }),
    text,
    textGeometry: captureFabricGeometry({ object: text }),
    textLayout: captureTextLayout({ text })
  })
}

/** Fully restores the shape composition after an incomplete atomic operation. */
export function restoreShapeScalingGeometry({
  t = english,
  snapshot
}: {
  t?: Translate
  snapshot: ShapeScalingGeometrySnapshot
}): void {
  const failures: unknown[] = []

  try {
    snapshot.group.set({ ...snapshot.groupLayout })
  } catch (error) {
    failures.push(error)
  }
  try {
    restoreFabricGeometry({ object: snapshot.shape, snapshot: snapshot.shapeGeometry })
    restoreShapeRounding({ t, shape: snapshot.shape, snapshot: snapshot.shapeRounding })
  } catch (error) {
    failures.push(error)
  }
  try {
    restoreTextGeometry({
      geometry: snapshot.textGeometry,
      layout: snapshot.textLayout,
      text: snapshot.text
    })
  } catch (error) {
    failures.push(error)
  }
  try {
    restoreFabricGeometry({ object: snapshot.group, snapshot: snapshot.groupGeometry })
  } catch (error) {
    failures.push(error)
  }

  const [firstFailure] = failures
  if (failures.length > 0) throw firstFailure
}

/** Attempts to restore every shape and throws the first error only after a complete pass. */
export function restoreShapeScalingSnapshots({
  t = english,
  snapshots
}: {
  t?: Translate
  snapshots: readonly ShapeScalingGeometrySnapshot[]
}): void {
  const failures: unknown[] = []

  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    const snapshot = snapshots[index]
    if (!snapshot) {
      failures.push(new Error(t('shape.errors.missingGeometrySnapshot')))
      continue
    }

    try {
      restoreShapeScalingGeometry({ t, snapshot })
    } catch (error) {
      failures.push(error)
    }
  }

  const [firstFailure] = failures
  if (failures.length > 0) throw firstFailure
}
