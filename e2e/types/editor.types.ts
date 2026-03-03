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

/** Параметры для идентификации целевого объекта в моделях */
export interface ObjectTargetParams {
  objectIndex?: number
  id?: string
}
