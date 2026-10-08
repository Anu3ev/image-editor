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
      colorFailed: 'The background color could not be set.',
      gradientFailed: 'The background gradient could not be set.',
      imageFailed: 'The background image could not be set.',
      removeFailed: 'The background could not be removed.'
    },
    clipboard: {
      copyFailed: 'The object could not be copied.',
      cutFailed: 'The object could not be cut.',
      duplicateFailed: 'The object could not be duplicated.',
      pasteFailed: 'The object could not be pasted.',
      pasteImageCanceled: 'Pasting the image was canceled or failed.',
      pasteImageFailed: 'The image could not be pasted.',
      systemCopyFailed: 'The object could not be copied to the system clipboard.',
      unavailable: 'The system clipboard is unavailable in this browser.'
    },
    crop: {
      invalidTarget: 'Select a raster image to crop.',
      lockedTarget: 'Unlock the image before cropping.'
    },
    history: {
      redoFailed: 'The action could not be redone.',
      undoFailed: 'The action could not be undone.'
    },
    image: {
      exportFailed: 'The image could not be exported.',
      importFailed: 'The image could not be imported.',
      noSelection: 'Select an object to export.',
      resizeMax: 'The image will be reduced to fit {{width}}×{{height}} while preserving its aspect ratio.',
      resizeMin: 'The image will be enlarged to at least {{width}}×{{height}} while preserving its aspect ratio.',
      unsupportedFormat: 'This image format is not supported.'
    },
    template: {
      applyFailed: 'The template could not be applied.',
      empty: 'The template contains no objects.',
      noSelection: 'Select objects to save as a template.'
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
