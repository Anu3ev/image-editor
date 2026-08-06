/** Явный идентификатор одного объекта, участвующего в измерении. */
export type MeasurementObjectTarget = Readonly<
  | { id: string; objectIndex?: never }
  | { id?: never; objectIndex: number }
>

/** Параметры измерения расстояния между активным объектом и объектом под указателем. */
export type MeasurementBetweenObjectsParams = Readonly<{
  active: MeasurementObjectTarget
  target: MeasurementObjectTarget
}>

/** Точная направляющая измерения и расстояние, которое отображается пользователю. */
export type MeasurementGuideInfo = Readonly<{
  type: 'vertical' | 'horizontal'
  axis: number
  start: number
  end: number
  distance: number
  displayDistance: number
}>

/** Состояние направляющих во время реального Alt-измерения. */
export type MeasurementGuideState = Readonly<{
  guides: readonly MeasurementGuideInfo[]
  isTargetMontageArea: boolean
}>
