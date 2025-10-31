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
  descriptors?: FontFaceDescriptors
}
