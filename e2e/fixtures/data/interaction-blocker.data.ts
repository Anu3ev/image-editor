/** Фигура для сценариев блокировки редактора. */
export const BLOCKER_SHAPE_OPTIONS = {
  id: 'interaction-blocker-shape',
  left: 132,
  top: 108,
  originX: 'left',
  originY: 'top',
  width: 168,
  height: 116,
  fill: '#d4d8e8'
} as const

/** Новый цвет фигуры для проверки редактирования после разблокировки. */
export const BLOCKER_UPDATED_FILL = '#2f8f63'

/** Размер монтажной области для проверки синхронизации маски блокировки. */
export const BLOCKER_UPDATED_RESOLUTION = {
  width: 688,
  height: 392
} as const
