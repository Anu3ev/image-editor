import type { Canvas, FabricObject } from 'fabric'

import {
  getObjectBounds,
  getObjectExactBounds
} from '../../utils/geometry'
import {
  collectExcludedObjects,
  shouldIgnoreObject
} from '../../utils/object-filter'
import type { Bounds } from '../types'
import type { MovementSnapCandidateSource } from '../movement/movement-snap-candidates'

/** How to calculate the bounds of available snap targets. */
export type SnapTargetBoundsMode = 'exact' | 'rounded'

/** An object and its bounds in a single snapshot of snap targets. */
export type ResolvedSnapTarget = Readonly<{
  bounds: Bounds
  object: FabricObject
  snapshotIndex: number
}>

/** An object and the exact boundary used by the domain instead of its outer decoration. */
export interface SnapDomainBoundary {
  object: FabricObject
  bounds: Bounds
}

/** Selects snap targets and calculates their bounds in the given mode. */
export class SnapTargetResolver {
  /** Canvas containing the objects available for the current snapshot. */
  private readonly canvas: Canvas

  /** Creates a snap target resolver for the editor canvas. */
  constructor({ canvas }: { canvas: Canvas }) {
    this.canvas = canvas
  }

  /** Returns eligible objects and their calculated bounds in canvas order. */
  public resolve({
    activeObject,
    mode,
    domainBoundary
  }: {
    activeObject?: FabricObject | null
    mode: SnapTargetBoundsMode
    domainBoundary?: SnapDomainBoundary
  }): ResolvedSnapTarget[] {
    const excluded = collectExcludedObjects({ activeObject })
    const objects: FabricObject[] = []
    const targets: ResolvedSnapTarget[] = []

    this.canvas.forEachObject((object) => {
      if (!shouldIgnoreObject({ object, excluded })) objects.push(object)
    })

    for (let snapshotIndex = 0; snapshotIndex < objects.length; snapshotIndex += 1) {
      const object = objects[snapshotIndex]
      const bounds = object === domainBoundary?.object
        ? domainBoundary.bounds
        : this._resolveBounds({ mode, object })
      if (!bounds) continue

      targets.push({ bounds, object, snapshotIndex })
    }

    return targets
  }

  /** Collects an exact snapshot of targets for scaling or movement calculations. */
  public resolveSources({
    activeObject,
    domainBoundary,
    montageArea
  }: {
    activeObject: FabricObject
    domainBoundary?: SnapDomainBoundary
    montageArea: FabricObject
  }): MovementSnapCandidateSource[] {
    const sources = this.resolve({ activeObject, mode: 'exact', domainBoundary }).map<MovementSnapCandidateSource>(({
      bounds, object, snapshotIndex
    }) => ({
      id: `object:${snapshotIndex}:${object.id ?? object.type}`,
      bounds,
      edgeCategory: object === domainBoundary?.object ? 'domain-boundary' : 'edge',
      useForSpacing: object !== domainBoundary?.object
    }))
    const montageBounds = domainBoundary?.object === montageArea
      ? domainBoundary.bounds
      : getObjectExactBounds({ object: montageArea })
    if (montageBounds) {
      sources.push({ id: 'montage-area', bounds: montageBounds, edgeCategory: 'domain-boundary' })
    }

    return sources
  }

  /** Calculates the target's regular bounds in the selected mode. */
  private _resolveBounds({
    mode,
    object
  }: {
    mode: SnapTargetBoundsMode
    object: FabricObject
  }): Bounds | null {
    if (mode === 'exact') return getObjectExactBounds({ object })

    return getObjectBounds({ object })
  }
}
