import { ImageEditor } from './initEditor'

declare global {
  interface Window {
    [key: string]: ImageEditor
  }
}
