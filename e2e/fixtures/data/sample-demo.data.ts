/** Размеры экранов, на которых все основные действия помещаются без прокрутки. */
export const SAMPLE_DESKTOP_VIEWPORTS = [
  { width: 1180, height: 757 },
  { width: 1440, height: 900 }
]

/** Узкий экран для проверки мобильной компоновки. */
export const SAMPLE_MOBILE_VIEWPORT = { width: 390, height: 844 }

/** Локальная иллюстрация, загрузкой которой управляют сценарии восстановления. */
export const SAMPLE_ARTWORK_ROUTE = '**/samples/makers-table.png'

/** Ответ недоступного сервера иллюстрации. */
export const SAMPLE_ARTWORK_FAILURE = {
  url: SAMPLE_ARTWORK_ROUTE,
  status: 503,
  body: 'Unavailable',
  contentType: 'text/plain'
}

/** Проверяемые свойства готового PNG без зависимости от полного растрового снимка. */
export const SAMPLE_EXPORT = {
  fileName: 'weekend-makers.png',
  signature: '89504e470d0a1a0a',
  size: { width: 512, height: 512 },
  backgroundPoint: { x: 5, y: 5 },
  artworkPoint: { x: 256, y: 330 },
  background: { red: 248, green: 241, blue: 223, alpha: 255 }
}
