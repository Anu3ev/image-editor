import { OBJECT_STATE_SERIALIZATION_PROPS } from '../object-serialization'

/**
 * Дополнительные свойства Fabric-объектов, которые нужно включать в history snapshot.
 */
export const OBJECT_SERIALIZATION_PROPS = [
  'id',
  'backgroundId',
  ...OBJECT_STATE_SERIALIZATION_PROPS
] as const
