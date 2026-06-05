declare global {
  interface Window {
    /** Инстансы редактора доступны на window по id контейнера из src/main.ts. */
    [key: string]: unknown
  }
}

export {}
