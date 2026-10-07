export interface EditorFontFaceDescriptors extends FontFaceDescriptors {
  /**
   * The CSS font-variant descriptor is supported in @font-face but is missing
   * from the current TypeScript DOM typings.
   */
  variant?: string
}

export interface EditorFontDefinition {
  /**
   * Font family name to use in the editor.
   */
  family: string
  /**
   * Path or data URL to the font file.
   */
  source: string
  /**
   * Additional font descriptors from the FontFace API.
   */
  descriptors?: EditorFontFaceDescriptors
}
