declare global {
  interface Window {
    /** Editor instances are available on window by the container ID from src/main.ts. */
    [key: string]: unknown
  }
}

export {}
