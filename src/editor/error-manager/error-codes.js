/**
 * Коды ошибок, которые может эмитить редактор
 */
export const errorCodes = {
  IMAGE_MANAGER: {
    /**
     * Некорректный Content-Type изображения
     */
    INVALID_CONTENT_TYPE: 'INVALID_CONTENT_TYPE',
    /**
     * Некорректный тип источника изображения
     */
    INVALID_SOURCE_TYPE: 'INVALID_SOURCE_TYPE',
    /**
     * Ошибка при загрузке изображения
     */
    IMPORT_FAILED: 'IMPORT_FAILED',
    /**
     * Предупреждение, что изображение слишком большое, и оно будет уменьшено
     */
    IMAGE_RESIZE_WARNING: 'IMAGE_RESIZE_WARNING',
    /**
     * Не выбран объект для экспорта
     */
    NO_OBJECT_SELECTED: 'NO_OBJECT_SELECTED',
    /**
     * Ошибка при экспорте изображения
     */
    IMAGE_EXPORT_FAILED: 'IMAGE_EXPORT_FAILED'
  }
}
