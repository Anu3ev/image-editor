import type { BasicTransformEvent, ModifiedEvent, TPointerEvent, Transform } from 'fabric'

/** Crop area change with the current temporary Fabric transform. */
export type CropFrameChangeEvent = (BasicTransformEvent<TPointerEvent> | ModifiedEvent<TPointerEvent>) & {
  transform?: Transform
}
