import type { TPointerEventInfo, TPointerEvent } from 'fabric'

export const ptr = <T extends TPointerEvent>(e: T): TPointerEventInfo<T> => ({ e } as unknown as TPointerEventInfo<T>)

export const fabricPtrWithTarget = (target: unknown, e: Event = new Event('dummy')): TPointerEventInfo<TPointerEvent> => (
  { e, target } as unknown as TPointerEventInfo<TPointerEvent>
)
