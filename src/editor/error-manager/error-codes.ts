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
  },

  /**
   * Коды ошибок и предупреждений для ClipboardManager.
   */
  CLIPBOARD_MANAGER: {
    /**
     * Буфер обмена не поддерживается в браузере или отсутствует HTTPS-соединение.
     */
    CLIPBOARD_NOT_SUPPORTED: 'CLIPBOARD_NOT_SUPPORTED',

    /**
     * Ошибка записи текстового объекта в буфер обмена.
     */
    CLIPBOARD_WRITE_TEXT_FAILED: 'CLIPBOARD_WRITE_TEXT_FAILED',

    /**
     * Ошибка записи изображения в буфер обмена.
     */
    CLIPBOARD_WRITE_IMAGE_FAILED: 'CLIPBOARD_WRITE_IMAGE_FAILED',

    /**
     * Ошибка клонирования объекта.
     */
    CLONE_FAILED: 'CLONE_FAILED'
  },

  /**
   * Коды ошибок и предупреждений для CanvasManager.
   */
  CANVAS_MANAGER: {
    /**
     * Ошибка при получении активного объекта.
     */
    NO_ACTIVE_OBJECT: 'NO_ACTIVE_OBJECT',
  }
}
