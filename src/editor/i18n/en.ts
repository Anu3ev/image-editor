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
      colorFailed: 'Couldn\'t change the background color.',
      gradientFailed: 'Couldn\'t change the background gradient.',
      imageFailed: 'Couldn\'t use this image as the background.',
      removeFailed: 'Couldn\'t remove the background.'
    },
    clipboard: {
      copyFailed: 'Couldn\'t copy the object.',
      cutFailed: 'Couldn\'t cut the object. Check whether it\'s still on the canvas before trying again.',
      duplicateFailed: 'Couldn\'t duplicate the object. Check for a new copy on the canvas before trying again.',
      pasteFailed: 'Couldn\'t paste the object. Check whether it appeared on the canvas before trying again.',
      pasteImageCanceled: 'Image pasting was interrupted.',
      pasteImageFailed: 'Couldn\'t paste the image from the clipboard.',
      systemCopyFailed: 'The object is in the editor\'s clipboard, but copying it to the system clipboard '
        + 'didn\'t work.',
      unavailable: 'The system clipboard isn\'t available here. The object is in the editor\'s clipboard.'
    },
    crop: {
      invalidTarget: 'Choose a raster image to crop.',
      lockedTarget: 'Unlock this image to crop it.'
    },
    history: {
      redoFailed: 'Couldn\'t redo the change. Check the result on the canvas before using Redo again.',
      undoFailed: 'Couldn\'t undo the last change. Check the result on the canvas before using Undo again.'
    },
    image: {
      exportFailed: 'Couldn\'t export the image.',
      importFailed: 'Couldn\'t import the image.',
      noSelection: 'Select an object to export as an image.',
      resizeMax: 'Resizing the image to fit within {{width}} × {{height}} pixels while keeping its proportions.',
      resizeMin: 'Resizing the image proportionally. Minimum size: {{width}} × {{height}} pixels.',
      unsupportedFormat: 'The editor can\'t read this image format. Choose another image.'
    },
    template: {
      applyFailed: 'Couldn\'t apply the template. Check the result on the canvas before adding it again.',
      empty: 'This template has no objects. Choose another template.',
      noSelection: 'Select the objects to include in your template.'
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
