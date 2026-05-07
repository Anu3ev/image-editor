import type { ShapeScaleSnapshot } from '../types'

export interface StableMinimumGeometry {
  groupWidth: number
  groupHeight: number
  shapeOffsetLeft: number
  shapeOffsetTop: number
  shapeWidth: number
  shapeHeight: number
  textOffsetLeft: number
  textOffsetTop: number
  textWidth: number
  textHeight: number
}

function requireSnapshotNumber(params: {
  value: number | null
  phase: string
  fieldLabel: string
}): number {
  const {
    value,
    phase,
    fieldLabel
  } = params

  if (typeof value !== 'number') {
    throw new Error(`${phase}: ${fieldLabel} должна существовать`)
  }

  return value
}

export function readStableMinimumGeometry(params: {
  snapshot: ShapeScaleSnapshot
  phase: string
}): StableMinimumGeometry {
  const {
    snapshot,
    phase
  } = params

  const shapeBoundsLeft = requireSnapshotNumber({
    value: snapshot.shapeBoundsLeft,
    phase,
    fieldLabel: 'левая граница шейпа'
  })
  const shapeBoundsTop = requireSnapshotNumber({
    value: snapshot.shapeBoundsTop,
    phase,
    fieldLabel: 'верхняя граница шейпа'
  })
  const shapeBoundsWidth = requireSnapshotNumber({
    value: snapshot.shapeBoundsWidth,
    phase,
    fieldLabel: 'ширина шейпа'
  })
  const shapeBoundsHeight = requireSnapshotNumber({
    value: snapshot.shapeBoundsHeight,
    phase,
    fieldLabel: 'высота шейпа'
  })
  const textBoundsLeft = requireSnapshotNumber({
    value: snapshot.textBoundsLeft,
    phase,
    fieldLabel: 'левая граница текста'
  })
  const textBoundsTop = requireSnapshotNumber({
    value: snapshot.textBoundsTop,
    phase,
    fieldLabel: 'верхняя граница текста'
  })
  const textBoundsWidth = requireSnapshotNumber({
    value: snapshot.textBoundsWidth,
    phase,
    fieldLabel: 'ширина текста'
  })
  const textBoundsHeight = requireSnapshotNumber({
    value: snapshot.textBoundsHeight,
    phase,
    fieldLabel: 'высота текста'
  })

  return {
    groupWidth: snapshot.groupBoundsWidth,
    groupHeight: snapshot.groupBoundsHeight,
    shapeOffsetLeft: shapeBoundsLeft - snapshot.groupBoundsLeft,
    shapeOffsetTop: shapeBoundsTop - snapshot.groupBoundsTop,
    shapeWidth: shapeBoundsWidth,
    shapeHeight: shapeBoundsHeight,
    textOffsetLeft: textBoundsLeft - snapshot.groupBoundsLeft,
    textOffsetTop: textBoundsTop - snapshot.groupBoundsTop,
    textWidth: textBoundsWidth,
    textHeight: textBoundsHeight
  }
}
