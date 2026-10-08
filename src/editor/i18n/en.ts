/** Built-in English fallback translations for the user interface. */
const en = {
  image: {
    filenames: {
      defaultPng: 'image.png',
      defaultSvg: 'image.svg',
      defaultWithFormat: 'image.{{format}}'
    }
  },
  notifications: {
    background: {
      colorFailed: 'Couldn\'t finish changing the background color.',
      gradientFailed: 'Couldn\'t finish changing the background gradient.',
      imageFailed: 'Couldn\'t finish setting the image as the background.',
      removeFailed: 'Couldn\'t finish removing the background.'
    },
    clipboard: {
      copyFailed: 'Couldn\'t finish copying the object to the editor\'s clipboard.',
      cutFailed: 'Couldn\'t finish cutting the object. Check whether it\'s still on the canvas.',
      duplicateFailed: 'Couldn\'t finish duplicating the object. Check the canvas for a new copy.',
      pasteFailed: 'Couldn\'t finish pasting the object. Check whether it appeared on the canvas.',
      pasteImageCanceled: 'Pasting the image was interrupted.',
      pasteImageFailed: 'Couldn\'t finish pasting the image from the clipboard.',
      systemCopyFailed: 'Couldn\'t copy to the system clipboard. The object was copied to the editor\'s clipboard.',
      unavailable: 'The system clipboard isn\'t available here. The object was copied to the editor\'s clipboard.'
    },
    crop: {
      invalidTarget: 'Select a raster image to crop.',
      lockedTarget: 'Unlock the image before cropping.'
    },
    history: {
      redoFailed: 'Couldn\'t finish redoing the change. Check the canvas before continuing.',
      undoFailed: 'Couldn\'t finish undoing the last change. Check the canvas before continuing.'
    },
    image: {
      exportFailed: 'Couldn\'t finish exporting the image.',
      importFailed: 'Couldn\'t finish importing the image.',
      noSelection: 'Select the object you want to export as an image.',
      resizeMax: 'Resizing the image to fit within {{width}} × {{height}} pixels, keeping its proportions.',
      resizeMin: 'Resizing the image proportionally. Minimum target size: {{width}} × {{height}} pixels.',
      unsupportedFormat: 'This image\'s format isn\'t supported or couldn\'t be identified. Choose another image.'
    },
    template: {
      applyFailed: 'Couldn\'t finish applying the template. Check the canvas before continuing.',
      empty: 'This template has no objects to add. Choose another template.',
      noSelection: 'Select the objects you want to include in the template.'
    }
  },
  text: {
    defaults: {
      newText: 'New text'
    }
  },
  ui: {
    indicators: {
      objectSize: 'Width: {{width}} Height: {{height}}',
      rotationAngle: '{{angle}}°'
    },
    toolbar: {
      bringForward: 'Bring forward',
      bringToFront: 'Bring to front',
      delete: 'Delete',
      duplicate: 'Duplicate',
      lock: 'Lock',
      sendBackward: 'Send backward',
      sendToBack: 'Send to back',
      unlock: 'Unlock'
    }
  }
}

export default en
