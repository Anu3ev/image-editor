/** Маркер подстановки данных в объект шаблона. */
export type TemplatePlaceholder = {
  id: string
  label?: string
  type: 'text' | 'image'
}

/** Размер исходника, в системе координат которого сохранена crop-область. */
export type TemplateImageCrop = {
  source: string
  sourceWidth: number
  sourceHeight: number
}

/** Способ вписывания нового источника изображения в сохранённую область. */
export type TemplateImageFit = 'contain' | 'stretch'

/** Пользовательские и служебные данные объекта шаблона. */
export interface TemplateCustomData {
  [key: string]: unknown
  templateField?: string
  text?: string
  imageCrop?: TemplateImageCrop
  imageFit?: TemplateImageFit
}

/** Метаданные шаблона и его базовой монтажной области. */
export interface TemplateMeta {
  [key: string]: unknown
  baseWidth: number
  baseHeight: number
  previewId?: string
  requiredFonts?: string[]
  placeholders?: TemplatePlaceholder[]
  positionsNormalized?: boolean
}

/** Положение объекта относительно одной из границ шаблона. */
export type TemplateAnchor = 'start' | 'center' | 'end'

/** Сериализованное описание одного объекта шаблона. */
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

/** Полное сериализованное описание шаблона. */
export type TemplateDefinition = {
  id: string
  meta: TemplateMeta
  objects: TemplateObjectData[]
}

/** Параметры создания шаблона из текущего выделения. */
export type SerializeTemplateOptions = {
  templateId?: string
  previewId?: string
  meta?: Partial<Omit<TemplateMeta, 'baseWidth' | 'baseHeight'>>
  withBackground?: boolean
}

/** Параметры применения шаблона к редактору. */
export type ApplyTemplateOptions = {
  template: TemplateDefinition
  data?: Record<string, string>
}
