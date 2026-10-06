/** Explicit ID or index of one object involved in measurement. */
export type MeasurementObjectTarget = Readonly<
  | { id: string; objectIndex?: never }
  | { id?: never; objectIndex: number }
>

/** Options for measuring the distance between the active object and the object under the pointer. */
export type MeasurementBetweenObjectsParams = Readonly<{
  active: MeasurementObjectTarget
  target: MeasurementObjectTarget
}>

/** Exact measurement guide and the distance displayed to the user. */
export type MeasurementGuideInfo = Readonly<{
  type: 'vertical' | 'horizontal'
  axis: number
  start: number
  end: number
  distance: number
  displayDistance: number
}>

/** Guide state during a real Alt measurement. */
export type MeasurementGuideState = Readonly<{
  guides: readonly MeasurementGuideInfo[]
  isTargetMontageArea: boolean
}>
