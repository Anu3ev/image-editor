/**
 * Error codes that the editor can emit
 */
export const errorCodes = {
  IMAGE_MANAGER: {
    /**
     * Invalid image Content-Type
     */
    INVALID_CONTENT_TYPE: 'INVALID_CONTENT_TYPE',
    /**
     * Invalid image source type
     */
    INVALID_SOURCE_TYPE: 'INVALID_SOURCE_TYPE',
    /**
     * Error loading an image
     */
    IMPORT_FAILED: 'IMPORT_FAILED',
    /**
     * Warning that the image is too large and will be resized
     */
    IMAGE_RESIZE_WARNING: 'IMAGE_RESIZE_WARNING',
    /**
     * No object selected for export
     */
    NO_OBJECT_SELECTED: 'NO_OBJECT_SELECTED',
    /**
     * Error exporting an image
     */
    IMAGE_EXPORT_FAILED: 'IMAGE_EXPORT_FAILED',

    /**
     * Error loading the initial editor state
     */
    INITIAL_STATE_LOAD_FAILED: 'INITIAL_STATE_LOAD_FAILED'
  },

  /**
   * Error and warning codes for ClipboardManager.
   */
  CLIPBOARD_MANAGER: {
    /**
     * The browser does not support the clipboard, or the connection is not HTTPS.
     */
    CLIPBOARD_NOT_SUPPORTED: 'CLIPBOARD_NOT_SUPPORTED',

    /**
     * Error writing a text object to the clipboard.
     */
    CLIPBOARD_WRITE_TEXT_FAILED: 'CLIPBOARD_WRITE_TEXT_FAILED',

    /**
     * Error writing an image to the clipboard.
     */
    CLIPBOARD_WRITE_IMAGE_FAILED: 'CLIPBOARD_WRITE_IMAGE_FAILED',

    /**
     * Error cloning an object.
     */
    CLONE_FAILED: 'CLONE_FAILED',

    /**
     * Error copying an object.
     */
    COPY_FAILED: 'COPY_FAILED',

    /**
     * Error cutting an object.
     */
    CUT_FAILED: 'CUT_FAILED',

    /**
     * Error pasting an image from the clipboard.
     */
    PASTE_IMAGE_FAILED: 'PASTE_IMAGE_FAILED',

    /**
     * Error pasting an image from the clipboard after the operation was deferred and then rejected (for example, because the user denied clipboard access).
     */
    EXTERNAL_PASTE_DEFERRED_REJECTED: 'EXTERNAL_PASTE_DEFERRED_REJECTED',

    /**
     * Error pasting an HTML image from the clipboard.
     */
    PASTE_HTML_IMAGE_FAILED: 'PASTE_HTML_IMAGE_FAILED',

    /**
     * Error pasting an object from the clipboard.
     */
    PASTE_FAILED: 'PASTE_FAILED'
  },

  /**
   * Error and warning codes for CanvasManager.
   */
  CANVAS_MANAGER: {
    /**
     * Error getting the active object.
     */
    NO_ACTIVE_OBJECT: 'NO_ACTIVE_OBJECT'
  },

  /**
   * Error codes for CropManager.
   */
  CROP_MANAGER: {
    /**
     * Error starting an image crop without a raster image target.
     */
    INVALID_IMAGE_TARGET: 'CROP_INVALID_IMAGE_TARGET',

    /**
     * Error starting a crop on a locked image.
     */
    LOCKED_IMAGE_TARGET: 'CROP_LOCKED_IMAGE_TARGET'
  },

  HISTORY_MANAGER: {
    UNDO_ERROR: 'UNDO_ERROR',
    REDO_ERROR: 'REDO_ERROR'
  },

  /**
   * Error codes for SelectionManager.
   */
  SELECTION_MANAGER: {
    /**
     * Error in final cleanup or a lifecycle event after committing the selection's geometry.
     */
    SCALE_COMMIT_FINALIZATION_FAILED: 'SELECTION_SCALE_COMMIT_FINALIZATION_FAILED'
  },

  /**
   * Error and warning codes for BackgroundManager.
   */
  BACKGROUND_MANAGER: {
    /**
     * Error creating a background.
     */
    BACKGROUND_CREATION_FAILED: 'BACKGROUND_CREATION_FAILED',
    /**
     * Error removing a background.
     */
    BACKGROUND_REMOVAL_FAILED: 'BACKGROUND_REMOVAL_FAILED',
    /**
     * Warning that there is no background to remove.
     */
    NO_BACKGROUND_TO_REMOVE: 'NO_BACKGROUND_TO_REMOVE',
    /**
     * Error parsing a gradient.
     */
    INVALID_GRADIENT_FORMAT: 'INVALID_GRADIENT_FORMAT'
  },

  TEMPLATE_MANAGER: {
    NO_OBJECTS_SELECTED: 'TEMPLATE_NO_OBJECTS_SELECTED',
    INVALID_TEMPLATE: 'TEMPLATE_INVALID_TEMPLATE',
    INVALID_TARGET: 'TEMPLATE_INVALID_TARGET',
    APPLY_FAILED: 'TEMPLATE_APPLY_FAILED'
  }
}
