/** Data substitution marker in a template object. */
export type TemplatePlaceholder = {
  id: string
  label?: string
  type: 'text' | 'image'
}

/** Source dimensions defining the coordinate system in which the crop area is saved. */
export type TemplateImageCrop = {
  source: string
  sourceWidth: number
  sourceHeight: number
}

/** Method for fitting a new image source into the saved area. */
export type TemplateImageFit = 'contain' | 'stretch'

/** User and internal data for a template object. */
export interface TemplateCustomData {
  [key: string]: unknown
  templateField?: string
  text?: string
  imageCrop?: TemplateImageCrop
  imageFit?: TemplateImageFit
}

/** Metadata for the template and its base artboard. */
export interface TemplateMeta {
  [key: string]: unknown
  baseWidth: number
  baseHeight: number
  previewId?: string
  requiredFonts?: string[]
  placeholders?: TemplatePlaceholder[]
  positionsNormalized?: boolean
}

/** Object position relative to one of the template boundaries. */
export type TemplateAnchor = 'start' | 'center' | 'end'

/** Serialized description of a single template object. */
export interface TemplateObjectData {
  [key: string]: unknown
  id?: unknown
  type?: unknown
  src?: unknown
  left?: number
  top?: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  cropX?: number
  cropY?: number
  svgMarkup?: string
  customData?: TemplateCustomData
  objects?: unknown[]
  _templateAnchorX?: TemplateAnchor
  _templateAnchorY?: TemplateAnchor
}

/** Full serialized template description. */
export type TemplateDefinition = {
  id: string
  meta: TemplateMeta
  objects: TemplateObjectData[]
}

/** Options for creating a template from the current selection. */
export type SerializeTemplateOptions = {
  templateId?: string
  previewId?: string
  meta?: Partial<Omit<TemplateMeta, 'baseWidth' | 'baseHeight'>>
  withBackground?: boolean
}

/** Options for applying a template to the editor. */
export type ApplyTemplateOptions = {
  template: TemplateDefinition
  data?: Record<string, string>
}
