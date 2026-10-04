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

/** Способ расчёта границ объектов, доступных для прилипания. */
export type SnapTargetBoundsMode = 'exact' | 'rounded'

/** Объект и его границы в одном снимке целей прилипания. */
export type ResolvedSnapTarget = Readonly<{
  bounds: Bounds
  object: FabricObject
  snapshotIndex: number
}>

/** Объект и точная граница, которую домен использует вместо его внешнего оформления. */
export interface SnapDomainBoundary {
  object: FabricObject
  bounds: Bounds
}

/** Выбирает объекты для прилипания и рассчитывает их границы в заданном режиме. */
export class SnapTargetResolver {
  /** Холст с объектами, доступными для текущего снимка. */
  private readonly canvas: Canvas

  /** Создаёт resolver целей прилипания для холста редактора. */
  constructor({ canvas }: { canvas: Canvas }) {
    this.canvas = canvas
  }

  /** Возвращает подходящие объекты и рассчитанные границы в порядке холста. */
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

  /** Собирает точный снимок целей для расчёта скейлинга или перемещения. */
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

  /** Рассчитывает обычные границы цели в выбранном режиме. */
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
