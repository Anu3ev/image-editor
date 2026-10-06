import { OBJECT_STATE_SERIALIZATION_PROPS } from '../object-serialization'

/**
 * Additional Fabric object properties to include in a history snapshot.
 */
export const OBJECT_SERIALIZATION_PROPS = [
  'id',
  'backgroundId',
  ...OBJECT_STATE_SERIALIZATION_PROPS
] as const
