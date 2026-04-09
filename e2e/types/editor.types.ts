/** Сериализованное представление объекта canvas для assertions в тестах */
export interface EditorObjectInfo {
  id?: string
  type: string
  left: number
  top: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  angle: number
  fill: string | null
  stroke: string | null
  strokeWidth: number
  opacity: number
  visible: boolean
  selectable: boolean
  locked: boolean
  flipX: boolean
  flipY: boolean
}

/** Снимок состояния canvas */
export interface CanvasStateInfo {
  width: number
  height: number
  zoom: number
  objectCount: number
}

/** Информация о montage area */
export interface MontageAreaInfo {
  width: number
  height: number
  left: number
  top: number
}

/** Базовые границы элемента в viewport-координатах canvas. */
export interface ViewportBoundsInfo {
  left: number
  top: number
  width: number
  height: number
  right: number
  bottom: number
  centerX: number
  centerY: number
}

/** Границы montage area в координатах canvas-сцены. */
export interface MontageAreaBoundsInfo {
  left: number
  top: number
  width: number
  height: number
  right: number
  bottom: number
  centerX: number
  centerY: number
}

/** Границы монтажной области и canvas-вьюпорта в клиентских координатах браузера. */
export interface MontageAreaViewportBoundsInfo {
  montageLeft: number
  montageTop: number
  montageWidth: number
  montageHeight: number
  montageRight: number
  montageBottom: number
  montageCenterX: number
  montageCenterY: number
  viewportLeft: number
  viewportTop: number
  viewportWidth: number
  viewportHeight: number
  viewportRight: number
  viewportBottom: number
  viewportCenterX: number
  viewportCenterY: number
}

/** Параметры для идентификации целевого объекта в моделях */
export interface ObjectTargetParams {
  objectIndex?: number
  id?: string
}

/** Параметры сериализации шаблона из текущего выделения */
export interface SerializeTemplateParams {
  templateId?: string
  previewId?: string
  withBackground?: boolean
}

/** Минимальное описание объекта шаблона для e2e */
export interface TemplateObjectData {
  [key: string]: unknown
}

/** Минимальное описание шаблона для e2e */
export interface TemplateDefinition {
  id: string
  meta: Record<string, unknown>
  objects: TemplateObjectData[]
}
