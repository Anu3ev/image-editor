export interface EditorFontFaceDescriptors extends FontFaceDescriptors {
  /**
   * CSS font-variant descriptor поддерживается в @font-face, но отсутствует
   * в текущих DOM typings TypeScript.
   */
  variant?: string
}

export interface EditorFontDefinition {
  /**
   * Имя семейства шрифта, которое будет использоваться в редакторе.
   */
  family: string
  /**
   * Путь или data URL до файла шрифта.
   */
  source: string
  /**
   * Дополнительные дескрипторы шрифта из FontFace API.
   */
  descriptors?: EditorFontFaceDescriptors
}
