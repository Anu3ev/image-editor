import {
  util,
  type ActiveSelection,
  type FabricObject,
  type Transform
} from 'fabric'

import { cloneLineFontDefaults } from '../line-defaults'
import type {
  EditorTextbox,
  TextScaleBaseState,
  TextboxStyles
} from '../types'
import { captureTextScaleBase } from './text-scaling-materialization'

/** Exact Fabric-object geometry before modifying the selection. */
type ActiveSelectionChildGeometryState = Readonly<{
  height: number
  originX: FabricObject['originX']
  originY: FabricObject['originY']
  target: FabricObject
  transform: Readonly<ReturnType<typeof util.saveObjectTransform>>
  width: number
}>

/** Canonical standalone-text properties modified during scaling. */
type ActiveSelectionTextLiveState = Readonly<{
  autoExpand: EditorTextbox['autoExpand']
  base: TextScaleBaseState
  geometry: ActiveSelectionChildGeometryState
  preserveExactTextGeometry: boolean
  splitByGrapheme: EditorTextbox['splitByGrapheme']
  target: EditorTextbox
}>

/** Confirmed live state of the text portion of the selection. */
export type ActiveSelectionScaleLiveState = Readonly<{
  affineChildren: readonly ActiveSelectionChildGeometryState[]
  selection: ActiveSelectionChildGeometryState
  texts: readonly ActiveSelectionTextLiveState[]
  transform: Transform
  transformScaleX: number
  transformScaleY: number
}>

/** Creates an independent copy of per-character text styles. */
function cloneTextboxStyles({ styles }: { styles: TextboxStyles }): TextboxStyles {
  return JSON.parse(JSON.stringify(styles)) as TextboxStyles
}

/** Saves the transform and exact dimensions of a live Fabric object. */
function captureObjectGeometry({
  target
}: {
  target: FabricObject
}): ActiveSelectionChildGeometryState {
  return Object.freeze({
    height: target.height,
    originX: target.originX,
    originY: target.originY,
    target,
    transform: Object.freeze({ ...util.saveObjectTransform(target) }),
    width: target.width
  })
}

/** Restores the transform and dimensions without replacing the live Fabric object. */
function restoreObjectGeometry({
  state
}: {
  state: ActiveSelectionChildGeometryState
}): void {
  const { target } = state

  target.set({
    ...state.transform,
    originX: state.originX,
    originY: state.originY
  })
  target.width = state.width
  target.height = state.height
  target.dirty = true
  target.setCoords()
}

/** Saves the canonical properties and geometry of one standalone text object. */
function captureTextLiveState({
  target
}: {
  target: EditorTextbox
}): ActiveSelectionTextLiveState {
  return Object.freeze({
    autoExpand: target.autoExpand,
    base: captureTextScaleBase({ textbox: target }),
    geometry: captureObjectGeometry({ target }),
    preserveExactTextGeometry: target.preserveExactTextGeometry === true,
    splitByGrapheme: target.splitByGrapheme,
    target
  })
}

/** Restores text directly from the confirmed snapshot without recalculating scale. */
function restoreTextLiveState({
  state
}: {
  state: ActiveSelectionTextLiveState
}): void {
  const { base, target } = state

  target.set({
    autoExpand: state.autoExpand,
    fontSize: base.fontSize,
    lineFontDefaults: cloneLineFontDefaults({ lineFontDefaults: base.lineFontDefaults }),
    paddingBottom: base.padding.bottom,
    paddingLeft: base.padding.left,
    paddingRight: base.padding.right,
    paddingTop: base.padding.top,
    preserveExactTextGeometry: state.preserveExactTextGeometry,
    radiusBottomLeft: base.radii.bottomLeft,
    radiusBottomRight: base.radii.bottomRight,
    radiusTopLeft: base.radii.topLeft,
    radiusTopRight: base.radii.topRight,
    splitByGrapheme: state.splitByGrapheme,
    styles: cloneTextboxStyles({ styles: base.styles }),
    width: base.width
  })
  target.initDimensions()
  restoreObjectGeometry({ state: state.geometry })
}

/** Saves live state that can be advanced only after validating the overall step. */
export function captureActiveSelectionScaleLiveState({
  affineChildren,
  selection,
  texts,
  transform
}: {
  affineChildren: readonly FabricObject[]
  selection: ActiveSelection
  texts: readonly EditorTextbox[]
  transform: Transform
}): ActiveSelectionScaleLiveState {
  return Object.freeze({
    affineChildren: Object.freeze(affineChildren.map((target) => captureObjectGeometry({ target }))),
    selection: captureObjectGeometry({ target: selection }),
    texts: Object.freeze(texts.map((target) => captureTextLiveState({ target }))),
    transform,
    transformScaleX: transform.scaleX,
    transformScaleY: transform.scaleY
  })
}

/** Restores the entire selection to the last confirmed live state. */
export function restoreActiveSelectionScaleLiveState({
  state
}: {
  state: ActiveSelectionScaleLiveState
}): void {
  const failures: unknown[] = []

  for (const textState of state.texts) {
    try {
      restoreTextLiveState({ state: textState })
    } catch (error) {
      failures.push(error)
    }
  }
  for (const childState of state.affineChildren) {
    try {
      restoreObjectGeometry({ state: childState })
    } catch (error) {
      failures.push(error)
    }
  }

  try {
    restoreObjectGeometry({ state: state.selection })
  } catch (error) {
    failures.push(error)
  }
  state.transform.scaleX = state.transformScaleX
  state.transform.scaleY = state.transformScaleY

  const [firstFailure] = failures
  if (failures.length > 0) throw firstFailure
}
