import 'fabric'
import type { FabricObject as FabricObjectInstance } from 'fabric'
import type { EditorFontDefinition } from './font'
import type { ImageEditor } from '..'
import type { ImportImageOptions } from '../image-manager/types'
import type { ToolbarConfig } from '../ui/toolbar-manager'

export interface EditorCanvasOptions {
  /**
   * Width of the editor workspace.
   */
  montageAreaWidth: number
  /**
   * Height of the editor workspace.
   */
  montageAreaHeight: number
  /**
   * Canvas backstore width.
   * Can be specified in pixels or as 'auto' for automatic adjustment.
   */
  canvasBackstoreWidth: string | number
  /**
   * Canvas backstore height.
   * Can be specified in pixels or as 'auto' for automatic adjustment.
   */
  canvasBackstoreHeight: string | number
  /**
   * CSS width of the canvas.
   * Can be specified in pixels or as '100%' to fill the container width.
   */
  canvasCSSWidth: string
  /**
   * CSS height of the canvas.
   * Can be specified in pixels or as '100%' to fill the container height.
   */
  canvasCSSHeight: string
  /**
   * CSS width of the canvas wrapper.
   * Can be specified in pixels or as '100%' to fill the container width.
   */
  canvasWrapperWidth: string
  /**
   * CSS height of the canvas wrapper.
   * Can be specified in pixels or as '100%' to fill the container height.
   */
  canvasWrapperHeight: string
  /**
   * Width of the editor container.
   * Can be specified in pixels or as 'fit-content' for automatic adjustment.
   */
  editorContainerWidth: string
  /**
   * Height of the editor container.
   * Can be specified in pixels or as '100%' to fill the parent element's height.
   */
  editorContainerHeight: string

  /**
   * Maximum action-history length in the editor.
   * Used to limit the history size and prevent memory overflow.
   * If the value is less than 1, history will not be saved.
   */
  maxHistoryLength: number

  /**
   * Scaling mode for objects.
   * 'contain' - preserves the image's aspect ratio while scaling it to fit entirely within the workspace.
   * 'cover' - preserves the image's aspect ratio while scaling it to fill the entire workspace.
   */
  scaleType: 'contain' | 'cover'
  /**
   * Show the toolbar for the selected object.
   */
  showToolbar: boolean
  /**
   * Toolbar settings for the selected object.
   * Accepts partial settings, custom icons, and handlers.
   * All available settings can be found here: ui/toolbar-manager/default-config
   */
  toolbar: ToolbarConfig
  /**
   * JSON object containing the initial editor state.
   */
  initialState: object | null
  /**
   * Image object used to initialize the editor.
   * May contain:
   *  - {File | String} source - image file or URL (required)
   *  - {String} scale - Scaling mode (image-contain/image-cover/scale-montage).
   * image-contain - preserves the image's aspect ratio while scaling it to fit entirely within the workspace.
   * image-cover - preserves the image's aspect ratio while scaling it to cover the workspace.
   * scale-montage - scales the artboard to the image dimensions.
   *  - {Boolean} withoutSave - Do not save the editor state (false by default)
   *  - {Object} customData - Arbitrary data to be stored on the image object.
   */
  initialImage: ImportImageOptions | null
  /**
   * Default scale for the editor.
   * Used when initializing the canvas.
   */
  defaultScale: number
  /**
   * Minimum scale for the editor.
   * Used to limit zoom.
   */
  minZoom: number
  /**
   * Maximum scale for the editor.
   * Used to limit zoom.
   */
  maxZoom: number
  /**
   * Zoom increment for zooming in/out.
   * Used when zooming with the mouse wheel or buttons.
   */
  zoomRatio: number
  /**
   * Array of image formats allowed for loading into the editor.
   */
  acceptContentTypes: string[]
  /**
   * Overlay mask color when the editor is locked.
   * Used to dim the workspace while it is locked.
   * For example, 'rgba(136, 136, 136, 0.6)'.
   */
  overlayMaskColor: string

  /**
   * Editor container in which the canvas will be created.
   * Used to adapt the canvas dimensions to the container dimensions.
   */
  editorContainer?: HTMLElement

  /**
   * Show the selected object's rotation angle while it is being rotated.
   */
  showRotationAngle: boolean
  /**
   * Show the object's current width and height next to the pointer while scaling.
   */
  showObjectSizeOnScale: boolean
  /**
   * Show custom viewport scrollbars for panning when the canvas is zoomed in.
   */
  showViewportScrollbars: boolean
  /**
   * Checks whether an object can be deleted through editor operations.
   * If not provided, any object can be deleted except locked objects.
   */
  canDeleteObject?: (object: FabricObjectInstance) => boolean
  /**
   * Prepares an object clone before saving it to the clipboard or adding it to the canvas.
   * The callback receives only the clone and must not modify the original object.
   */
  prepareObjectClone?: (object: FabricObjectInstance) => void
  /**
   * Callback invoked when the editor is ready.
   * Used to perform actions after the editor is fully initialized.
   */
  _onReadyCallback?: (editor: ImageEditor) => void

  /**
   * Event listener settings.
   */

  /**
   * Adapt the canvas when the container is resized (for example, when the browser window is resized).
   */
  adaptCanvasToContainerOnResize: boolean
  /**
   * Zoom using CTRL + mouse wheel.
   */
  mouseWheelZooming: boolean
  /**
   * Canvas panning mode while the spacebar is held down.
   */
  canvasDragging: boolean
  /**
   * Copy objects using the Ctrl + C keyboard shortcut.
   */
  copyObjectsByHotkey: boolean
  /**
   * Cut objects using the Ctrl + X keyboard shortcut.
   */
  cutObjectsByHotkey: boolean
  /**
   * Duplicate objects using the Ctrl + D keyboard shortcut.
   */
  duplicateObjectsByHotkey: boolean
  /**
   * Paste an image from the clipboard by pressing Ctrl + V.
   */
  pasteImageFromClipboard: boolean
  /**
   * Undo/redo an action using the Ctrl + Z / Ctrl + Y keyboard shortcuts.
   */
  undoRedoByHotKeys: boolean
  /**
   * Select all objects using the Ctrl + A keyboard shortcut.
   */
  selectAllByHotkey: boolean
  /**
   * Delete objects using the Delete key.
   */
  deleteObjectsByHotkey: boolean
  /**
   * Reset object properties on double-click.
   * If true, double-clicking an object resets its rotation angle and dimensions and fits it to the workspace.
   */
  resetObjectFitByDoubleClick: boolean

  /**
   * CSS class for the editor container.
   * Used to style the editor container.
   */
  containerClass?: string

  /**
   * Selectors for elements whose keyboard events should be ignored
   */
  keyboardIgnoreSelectors: string[]

  /**
   * List of fonts to preload and make available in the editor.
   */
  fonts?: EditorFontDefinition[]
}

declare module 'fabric' {
  interface Canvas {
    /**
     * Editor container in which the canvas will be created.
     */
    editorContainer: HTMLElement
    /**
     * Unique editor identifier.
     */
    editorId?: string
    /**
     * ID of the HTML container holding the canvas.
     */
    containerId: string
  }

  // Editor options are optional for a regular Fabric canvas.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CanvasOptions extends Partial<EditorCanvasOptions> {}

  interface FabricObject {
    /**
     * Unique object identifier.
     */
    id?: string;
    /**
     * Object lock flag.
     * If true, the object cannot be modified or deleted.
     */
    locked?: boolean;
    /**
     * Object format, if the object is an image.
     */
    format?: string;

    /**
     * Background type
     */
    backgroundType?: 'color' | 'gradient' | 'image' | null;

    /**
     * Background identifier
     */
    backgroundId?: string | null;

    /**
     * Arbitrary user data associated with the object.
     */
    customData?: object;

    /**
     * Serialized user data as a JSON string.
     */
    _serializedCustomData?: string;

    /**
     * Flag for a composite shape + text object.
     */
    shapeComposite?: boolean;

    /**
     * Shape preset key.
     */
    shapePresetKey?: string;

    /**
     * Base shape width in the group's local coordinates.
     */
    shapeBaseWidth?: number;

    /**
     * Base shape height in the group's local coordinates.
     */
    shapeBaseHeight?: number;

    /**
     * Base shape width set manually by the user.
     */
    shapeManualBaseWidth?: number;

    /**
     * Base shape height set manually by the user.
     */
    shapeManualBaseHeight?: number;

    /**
     * Stable width of the sizing box used when replacing the shape.
     */
    shapeReplaceBoxWidth?: number;

    /**
     * Stable height of the sizing box used when replacing the shape.
     */
    shapeReplaceBoxHeight?: number;

    /**
     * Mode for automatically expanding the width of text inside the shape.
     */
    shapeTextAutoExpand?: boolean;

    /**
     * Signature of the persisted inputs used to calculate the current shape layout.
     */
    shapeLayoutSignature?: string;

    /**
     * Horizontal alignment of text inside the shape.
     */
    shapeAlignHorizontal?: 'left' | 'center' | 'right' | 'justify';

    /**
     * Vertical alignment of text inside the shape.
     */
    shapeAlignVertical?: 'top' | 'middle' | 'bottom';

    /**
     * Top padding of the text area inside the shape, in integer pixels.
     */
    shapePaddingTop?: number;

    /**
     * Right padding of the text area inside the shape, in integer pixels.
     */
    shapePaddingRight?: number;

    /**
     * Bottom padding of the text area inside the shape, in integer pixels.
     */
    shapePaddingBottom?: number;

    /**
     * Left padding of the text area inside the shape, in integer pixels.
     */
    shapePaddingLeft?: number;

    /**
     * Shape fill color.
     */
    shapeFill?: string;

    /**
     * Shape stroke color.
     */
    shapeStroke?: string | null;

    /**
     * Shape stroke width.
     */
    shapeStrokeWidth?: number;

    /**
     * Shape stroke dash pattern.
     */
    shapeStrokeDashArray?: number[] | null;

    /**
     * Shape opacity.
     */
    shapeOpacity?: number;

    /**
     * Shape corner-rounding amount in the range 0..100 (not supported for all shape types).
     */
    shapeRounding?: number;

    /**
     * Flag indicating whether the shape supports corner rounding.
     */
    shapeCanRound?: boolean;

    /**
     * Object's role within the shape group.
     */
    shapeNodeType?: 'shape' | 'text';

    /**
     * Returns the object's current domain dimensions in editor pixels.
     * Used by objects whose final domain dimensions differ from their visual bbox.
     */
    getObjectDisplaySize?(): { width: number; height: number };

    /**
     * Returns object bounds for snapping/measurement when the visual bbox differs from the domain geometry.
     */
    getObjectSnappingBounds?(): {
      left: number;
      right: number;
      top: number;
      bottom: number;
      centerX: number;
      centerY: number;
    };
  }

  interface RectProps {
    /**
     * Unique identifier.
     */
    id?: string;

    /**
     * Background type
     */
    backgroundType?: 'color' | 'gradient' | 'image' | null;

    /**
     * Background identifier
     */
    backgroundId?: string | null;
  }
  interface CircleProps {
    /**
     * Unique identifier.
     */
    id?: string;
  }

  interface GroupProps {
    /**
     * Unique group identifier.
     */
    id?: string;
  }

  interface EditorTextboxPaddingProperties {
    /**
     * Top padding of the text block in editor pixels.
     */
    paddingTop?: number;

    /**
     * Right padding of the text block in editor pixels.
     */
    paddingRight?: number;

    /**
     * Bottom padding of the text block in editor pixels.
     */
    paddingBottom?: number;

    /**
     * Left padding of the text block in editor pixels.
     */
    paddingLeft?: number;
  }

  interface TextboxProps extends EditorTextboxPaddingProperties {
    /**
     * Original text value without case conversion.
     */
    textCaseRaw?: string;
    /**
     * Flag indicating that the text is displayed in uppercase.
     */
    uppercase?: boolean;
    /**
     * Flag indicating that the text is displayed in uppercase.
     */
    textCaseUppercase?: boolean;
    /**
     * Enables automatic expansion of the text block's width.
     */
    autoExpand?: boolean;
  }

  interface Textbox extends EditorTextboxPaddingProperties {
    /**
     * Original text value without case conversion.
     */
    textCaseRaw?: string;
    /**
     * Flag indicating that the text is displayed in uppercase.
     */
    uppercase?: boolean;
    /**
     * Flag indicating that the text is displayed in uppercase.
     */
    textCaseUppercase?: boolean;
    /**
     * Enables automatic expansion of the text block's width.
     */
    autoExpand?: boolean;
  }
}
