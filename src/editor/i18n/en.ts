/* eslint-disable max-len -- Keep each translation on one line for catalog review. */
/** Built-in English fallback translations. */
const en = {
  background: {
    errors: {
      imageLoadFailed: 'Failed to load the image',
      removeFailed: 'Failed to remove the background',
      setColorFailed: 'Failed to set the background color',
      setGradientFailed: 'Failed to set the background gradient',
      setImageFailed: 'Failed to set the background image',
      setPreparedImageFailed: 'Failed to set the prepared image as the background'
    }
  },
  clipboard: {
    errors: {
      cloneObjectCountMismatch: 'The number of objects inside the clone must match the number of objects inside the source object',
      cloneSourceMissing: 'The source object must exist before cloning',
      cloneStructureMismatch: 'The clone’s structure must match the source object’s structure',
      copyFailed: 'Failed to copy the object',
      cutFailed: 'Failed to cut the object',
      deferredPasteRejected: 'Pasting the image from the clipboard was canceled or failed',
      duplicateFailed: 'Failed to create a copy of the object',
      internalCloneFailed: 'Failed to clone the object for the internal clipboard',
      pasteFailed: 'Failed to paste the object',
      pasteHtmlImageFailed: 'Failed to paste the image from HTML',
      pasteImageFailed: 'Failed to paste the image from the clipboard'
    },
    logs: {
      imageCopied: 'Image copied to clipboard successfully',
      textCopied: 'Text copied to clipboard successfully'
    },
    warnings: {
      imageWriteFallback: 'Failed to write the image to the clipboard; falling back to copying text: {{error}}',
      notSupported: 'navigator.clipboard is not supported in this browser or an HTTPS connection is unavailable.',
      systemCopyFailed: 'Failed to copy the object to the system clipboard',
      textWriteFailed: 'Failed to write text to the clipboard: {{error}}'
    }
  },
  crop: {
    errors: {
      interactionFrameRequired: 'Crop interaction requires a CropFrame',
      invalidImageTarget: 'Select a raster image object to crop an image.',
      lockedImageTarget: 'A locked image cannot be cropped.',
      resizeSourceLost: 'The crop resize operation lost its source',
      sessionFrameType: 'The crop session frame must be a CropFrame'
    }
  },
  editor: {
    errors: {
      canvasAlreadyExists: 'Canvas "{{canvasId}}" already exists. Destroy the previous editor before initializing again.',
      containerNotFound: 'Container with ID "{{containerId}}" was not found.',
      destroyed: 'ImageEditor has been destroyed',
      initialStateLoadFailed: 'Failed to load the editor state. Attempting to import the initial image.',
      resourceCleanupFailed: 'Failed to clean up an ImageEditor resource'
    },
    logs: {
      ready: 'Editor ready'
    },
    warnings: {
      selectionContainerCheckFailed: 'Error checking the selection container with selector "{{selector}}":'
    }
  },
  errors: {
    logFormat: '{{origin}}. {{method}}. {{code}}. {{message}}',
    unknownErrorCode: 'Unknown error code: ',
    unknownMethod: 'Unknown method',
    unknownWarningCode: 'Unknown warning code: '
  },
  fonts: {
    warnings: {
      fontFaceLoadFailed: 'Failed to load font "{{family}}" using the FontFace API',
      fontFaceSetCheckFailed: 'Failed to check whether the font was already loaded through FontFaceSet'
    }
  },
  geometry: {
    errors: {
      nonFiniteDisplayDistance: 'Display distance must be finite',
      nonFiniteEdges: 'Invalid {{source}}: edge coordinates must be finite',
      unorderedEdges: 'Invalid {{source}}: edge coordinates must be ordered'
    },
    labels: {
      customSnappingBounds: 'custom snapping bounds',
      visualBounds: 'visual bounds'
    }
  },
  history: {
    errors: {
      redoFailed: 'Failed to redo the action',
      undoFailed: 'Failed to undo the action'
    },
    logs: {
      baseState: 'Base state (baseState)',
      baseStateSaved: 'Base state saved.',
      diff: 'State differences (diff)',
      fullState: 'Full state (fullState)',
      getFullState: 'State from getFullState',
      loadFullState: 'Full state (fullState) for loadStateFromFullState',
      noChanges: 'No changes to save.',
      noRedoStates: 'No states to redo.',
      noUndoStates: 'No previous states to undo.',
      normalizedCurrentState: 'Normalized current state (normalizedCurrentState)',
      normalizedPreviousState: 'Normalized previous state (normalizedPrevState)',
      redoCompleted: 'Redo completed. Current history index:',
      saveState: 'Saving state (saveState)',
      stateSaved: 'State saved. Current history index:',
      statesEqual: 'statesEqual. No changes to save.',
      undoCompleted: 'Undo completed. Current history index:'
    }
  },
  image: {
    errors: {
      canvasBlobCreationFailed: 'Failed to create a Blob from the canvas',
      exportFailed: 'Failed to export the image: {{error}}',
      importFailed: 'Failed to import the image: {{error}}',
      invalidContentType: 'Invalid image content type: {{contentType}}. Expected one of: {{acceptedContentTypes}}.',
      invalidSourceType: 'Invalid image source type. Expected a URL or a File object.',
      managerDestroyed: 'ImageManager has been destroyed',
      noObjectSelected: 'No object selected for export',
      objectExportFailed: 'Failed to export the object: {{error}}',
      pdfDataUriExpected: 'jsPDF must return a data URI string',
      resizeSourceUnavailable: 'Failed to get the image source for resizing',
      urlLoadFailed: 'Failed to load the image from the URL',
      workerDataUrlStringExpected: 'The toDataURL worker must return a string',
      workerResizeBlobExpected: 'The resizeImage worker must return a Blob'
    },
    filenames: {
      defaultPng: 'image.png',
      defaultSvg: 'image.svg',
      defaultWithFormat: 'image.{{format}}'
    },
    warnings: {
      blobMimeTypeDetectionFailed: 'Failed to determine the MIME type of the blob URL:',
      enlargeToMinimumSize: 'The image is smaller than the minimum canvas size and will be enlarged to meet {{minWidth}}×{{minHeight}} while preserving its aspect ratio.',
      headRequestFailed: 'The HEAD request failed; determining the type from the file extension:',
      shrinkToMaximumSize: 'The image exceeds the maximum canvas size and will be reduced to fit {{maxWidth}}×{{maxHeight}} while preserving its aspect ratio.',
      urlExtensionDetectionFailed: 'Failed to determine the file extension from the URL:'
    }
  },
  modules: {
    errors: {
      unknownModule: 'Unknown module "{{name}}"'
    }
  },
  selection: {
    errors: {
      commitFinalizationFailed: 'Could not fully finalize the selection commit',
      commitFinishFailed: 'Could not finish committing the selection',
      commitOwnedByAnotherDomain: 'Another domain is already committing the selection',
      confirmedTextStateNotRestored: 'TextManager must restore the confirmed state',
      duplicateStepRequiresVerification: 'A duplicate ActiveSelection step cannot finish before its result is verified',
      earlyFinishDidNotRestoreTextStep: 'Early termination must restore the last text step',
      earlyTextScaleFinishNotCommitted: 'Early termination of text scaling must commit the active session',
      measuredTextGeometryNotCommitted: 'TextManager must commit the measured text geometry',
      mixedCompositionShapeSessionNotStarted: 'The full mixed composition must start a ShapeManager session',
      planMissingCanonicalState: 'The plan for a selection containing text must contain the measured canonical state',
      rollbackOrderMismatch: 'Rollback must restore the original object order',
      shapeCommitAlreadyInProgress: 'A shape selection commit is already in progress',
      shapeManagerScaleMismatch: 'The selection scale must match the ShapeManager result',
      shapeScaleSessionNotFinished: 'The shape scaling session must finish after commit',
      shapeSelectionRejectedScale: 'A supported shape selection must accept the calculated scale',
      skewTransitionRequiresSession: 'Switching to skew requires an active selection session',
      stepBecameDuplicate: 'The ActiveSelection step became a duplicate after the initial session check',
      textCommitRequiresProtectedSession: 'Committing a text composition requires a protected session',
      textCompositionRequiresTextboxes: 'A text composition must contain only Textbox objects',
      textSelectionSessionNotStarted: 'A supported selection containing text must start a TextManager session',
      textSessionNotFinished: 'The shared text session must finish after commit',
      verifiedTextStepNotConfirmed: 'A verified text step must become confirmed'
    }
  },
  shape: {
    errors: {
      applicationMissingMeasuredShapes: 'Application must include all measured shapes',
      applicationOrderMismatch: 'The order of applied shapes must match the measurement order',
      cleanupRequiresChild: 'Clearing selection scaling state requires at least one child shape',
      cleanupRequiresShapeGroups: 'The shape domain session can only be cleared for shape-group objects',
      domainMeasurementRequiresShape: 'Domain measurement requires at least one shape',
      domainScaleSessionNotStarted: 'Supported shapes must start a domain scaling session',
      emptyMeasurementCache: 'The shape measurement cache must not be empty',
      invalidChildMatrix: 'The child object matrix must contain finite values',
      invalidCompensatedFrameScale: 'The compensated shape frame must have a positive scale',
      invalidFinalRotatedShapeCenter: 'The final center of the rotated shape must have finite coordinates',
      invalidProjectionEdgeCoefficients: 'The shape scale mode projection contains invalid edge coefficients',
      invalidRestoredSelectionCenter: 'The restored selection frame center must have finite coordinates',
      invalidRestoredSelectionSize: 'The restored selection frame must have positive finite dimensions',
      invalidRotatedShapeAngle: 'The rotated shape angle must be finite',
      invalidRotatedShapeCenter: 'The rotated shape center must have finite coordinates',
      invalidRotatedShapeCompensationMatrix: 'The rotated shape compensation matrix must contain finite values',
      invalidSelectionScale: 'ShapeManager must apply a positive finite scale to the selection',
      measuredDimensionsNotCommitted: 'Each measured shape must commit its calculated dimensions',
      measurementRequiredBeforeApplication: 'Shapes must be measured in the same session before they are applied',
      missingExactBoundsAfterScale: 'The shape must have exact bounds after scaling',
      missingGeometrySnapshot: 'Each shape must have a geometry snapshot',
      missingSavedChildMatrix: 'Each child object must have a saved matrix',
      missingScaleSessionState: 'The shape must have state in the current scaling session',
      missingSessionConstraints: 'Constraints for the shape must be calculated for the current session',
      mixedCommitRequiresShape: 'Committing a mixed composition requires at least one shape',
      mixedCommitRequiresShapes: 'Committing a mixed composition accepts only shapes',
      mixedCompositionRequiresShape: 'A mixed composition must contain at least one shape',
      mixedMeasurementRequiresUnrotatedShape: 'Mixed-composition measurement only supports unrotated canonical shapes',
      positiveFiniteNumberRequired: '{{name}} must be a positive finite number',
      roundingRestoreRequiresRectangle: 'Corner rounding can only be restored for a rectangular shape',
      savedMatrixCountMismatch: 'The number of saved matrices must match the number of child objects',
      scaleSessionRequiresSelection: 'A shape scaling session requires a non-empty selection',
      snapshotRequiresCompleteComposition: 'A scaling snapshot requires a complete shape composition',
      textManagerNotInitialized: 'Shape text operations require an initialized TextManager',
      uniformScaleRequiresEqualMultipliers: 'Uniform shape scaling requires equal x and y multipliers',
      unsupportedControlScaleMode: 'Shape scale mode "{{mode}}" is not supported by control "{{controlKey}}"'
    },
    labels: {
      initialScaleHeight: 'Initial shape height',
      initialScaleWidth: 'Initial shape width',
      scaleMultiplierX: 'Shape scale multiplier x',
      scaleMultiplierY: 'Shape scale multiplier y'
    }
  },
  snapping: {
    imageScale: {
      duplicateStepVerificationRequired: 'A duplicate image scaling step cannot finish before the result is verified',
      stepBecameDuplicate: 'The image scaling step became a duplicate after the initial session check'
    },
    movement: {
      bounds: {
        centersMustMatchEdges: 'Movement snapping bounds must derive their center coordinates from their edges',
        mustBeFiniteAndOrdered: 'Movement snapping bounds must contain finite, ordered values'
      },
      duplicateStepVerificationRequired: 'Duplicate movement step cannot be handled before verification',
      exactFinalBoundsRequired: 'Object movement snapping requires exact final bounds',
      exactRawBoundsRequired: 'Object movement snapping requires exact raw bounds',
      exactTargetBoundsRequired: 'Object movement snapping requires exact target bounds',
      hold: {
        candidateNotInBaseline: 'The movement hold state candidate does not belong to the active baseline',
        invalidConstraint: 'Movement hold state contains an invalid {{axis}} constraint',
        invalidSpacingConstraint: 'Movement hold state contains an invalid {{axis}} spacing constraint'
      },
      rawIntent: {
        mustTranslateBaseline: 'Movement raw intent must be a translation of the gesture baseline'
      },
      runtime: {
        foreignPlanToken: 'Foreign movement plan token',
        noActiveSession: 'Movement snapping runtime has no active session',
        noPointerStepToVerify: 'Movement snapping runtime has no pointer step to verify',
        planTokenAlreadyUsed: 'Movement plan token has already been used',
        planTokenPointerStepMismatch: 'Movement plan token does not belong to the current pointer step',
        pointerMarkerRawIntentMismatch: 'Native movement pointer marker was reused with a different raw intent',
        previousPlanVerificationRequired: 'Previous movement plan token must be verified before the next pointer marker',
        sessionAlreadyActive: 'Movement snapping runtime already has an active session'
      },
      source: {
        boundsMustBeFiniteAndOrdered: 'Movement snap source bounds must contain finite, ordered values',
        centersMustMatchEdges: 'Movement snap sources must derive their center coordinates from their edges',
        idMustBeUniqueAndNonEmpty: 'Movement snap source ID "{{sourceId}}" must be non-empty and unique'
      },
      spacing: {
        centeringRequiresExactNeighbors: 'Centered movement spacing requires both exact neighbours',
        contextRequired: 'Movement spacing result must contain a context',
        primaryIntervalMustBePreserved: 'Movement spacing constraint must keep its primary interval',
        referenceRequiresExactPattern: 'Reference movement spacing requires an exact pattern',
        referenceRequiresSelectedExactNeighbor: 'Reference movement spacing requires the selected exact neighbour',
        selectedIntervalsRequired: 'Movement spacing result must describe its selected intervals',
        singlePrimaryIntervalRequired: 'Movement spacing result must identify exactly one primary interval'
      },
      targetPosition: {
        coordinatesMustBeFinite: 'Movement snapping target position must contain finite coordinates'
      },
      targetPositionMustBeFinite: 'Object movement snapping requires a finite target position',
      zoomMustBePositiveFinite: 'Movement snapping zoom must be a finite positive number'
    },
    rectangularScale: {
      appliedMultipliersMustBePositive: 'Rectangular scaling must contain positive applied multipliers',
      exactFinalBoundsRequired: 'Rectangular scaling requires exact final bounds',
      firstMultiplierMustBeFinite: 'Rectangular scale values must contain a finite first multiplier',
      freeScalingRequiresTwoFiniteMultipliers: 'Free rectangular scale requires two finite multipliers',
      missingSupportedProjectionMode: 'Rectangular scale projection is missing supported mode "{{mode}}"',
      movingEdgeRequired: 'Rectangular scale gesture must contain at least one moving edge',
      plan: {
        multipliersMustBePositive: 'The rectangular scaling plan must contain positive multipliers'
      },
      point: {
        coordinatesMustBeFinite: 'The rectangular scaling point must contain finite coordinates'
      },
      unsupportedProjectionMode: 'Unsupported rectangular scale projection mode "{{projectionMode}}"'
    },
    scale: {
      bounds: {
        centersMustBeFinite: 'Scale snapping bounds must contain finite center coordinates',
        centersMustMatchEdges: 'Scale snapping bounds must derive their center coordinates from their edges',
        edgesMustBeFiniteAndOrdered: 'Scale snapping bounds must contain finite, ordered edge coordinates'
      },
      candidate: {
        edgeAxisMismatch: 'The edge of scale snap candidate "{{candidateId}}" does not belong to the {{axis}} axis',
        edgeMustMove: 'The edge of scale snap candidate "{{candidateId}}" is not moved by any projection mode',
        idMustBeUniqueAndNonEmpty: 'Scale snap candidate ID "{{candidateId}}" must be non-empty and unique',
        positionMustBeFinite: 'The position of scale snap candidate "{{candidateId}}" must be finite'
      },
      constraint: {
        projectionSolutionRequired: 'The scale constraint for the {{edge}} edge must have a projection solution'
      },
      gestureBaseline: {
        projectionModeRequired: 'Scale gesture baseline must contain at least one projection mode'
      },
      hold: {
        candidateAxisMismatch: 'The held scale candidate belongs to the {{candidateAxis}} axis, not the {{axis}} axis',
        candidateNotInBaseline: 'Held scale candidate "{{candidateId}}" does not belong to the baseline snapshot'
      },
      plan: {
        constraintNotReached: 'The scale plan does not reach the {{edge}} constraint'
      },
      point: {
        coordinatesMustBeFinite: 'The scale snapping {{name}} must have finite coordinates'
      },
      pointLabels: {
        finalFixedAnchor: 'final fixed anchor',
        fixedAnchor: 'fixed anchor'
      },
      projection: {
        baselineValueCountMismatch: 'The scale projection must contain the same number of variables and baseline values',
        baselineValuesMustBeFinite: 'Scale projection baseline values must be finite',
        coefficientsMustBeFinite: 'Scale projection coefficients for the {{edge}} edge must be finite',
        constraintCannotBeProjected: 'The scale constraint for the {{edge}} edge cannot be projected',
        constraintMustBeFinite: 'The scale projection constraint for the {{edge}} edge must be finite',
        constraintsMustUseDifferentAxes: 'Scale projection constraints must use different scene axes',
        duplicateEdge: 'The scale projection contains a duplicate {{edge}} edge',
        edgeMissing: 'The scale projection does not contain the {{edge}} edge',
        edgeMissingOnAxis: 'The scale projection does not contain the {{edge}} edge on the {{axis}} axis',
        edgePositionUnresolved: 'The scale projection did not resolve the position of the {{edge}} edge',
        epsilonMustBeNonNegativeFinite: 'Scale projection epsilon must be a finite non-negative number',
        invalidCoefficientCount: 'The scale projection has an invalid number of coefficients for the {{edge}} edge',
        invalidValueCount: 'The scale projection has an invalid number of values',
        movingSceneEdgeRequired: 'Scale projection must contain at least one moving scene edge',
        oneOrTwoVariablesRequired: 'Scale projection must contain one or two variables',
        sceneWeightCountMismatch: 'The scale projection must contain the same number of variables and scene weights',
        sceneWeightsMustBePositiveFinite: 'Scale projection scene weights must be finite positive numbers',
        tooManySceneConstraints: 'Scale projection supports at most two scene constraints',
        valuesMustBeFinite: 'Scale projection values must be finite',
        variableMustAffectEdge: 'Scale projection variable "{{variable}}" must affect at least one edge',
        variablesMustBeUnique: 'Scale projection variables must be unique'
      },
      projectionMode: {
        idMustBeUniqueAndNonEmpty: 'Scale projection mode ID "{{id}}" must be non-empty and unique',
        unknown: 'Unknown scale projection mode "{{modeId}}"'
      },
      rawIntent: {
        invalidValueCount: 'The raw scale intent has an invalid number of values',
        modifiersMustBeBoolean: 'Scale raw intent modifiers must be boolean',
        projectionSolutionRequired: 'The raw scale intent must have a projection solution',
        valuesMustBeFinite: 'Scale raw intent values must be finite'
      },
      refinement: {
        constraintNotInCandidates: 'The refined {{axis}} constraint does not belong to the scale plan candidates',
        constraintNotReached: 'The refined scale plan does not reach the {{edge}} constraint',
        invalidValueCount: 'The scale refinement has an invalid number of values',
        valuesMustBeFinite: 'Scale refinement values must be finite'
      },
      runtime: {
        foreignPlanToken: 'Foreign scale plan token',
        noActiveSession: 'Scale snapping runtime has no active session',
        noPointerStepToRefine: 'Scale snapping runtime has no pointer step to refine',
        noPointerStepToVerify: 'Scale snapping runtime has no pointer step to verify',
        planTokenAlreadyUsed: 'Scale plan token has already been used',
        planTokenPointerStepMismatch: 'Scale plan token does not belong to the current pointer step',
        pointerMarkerModifiersMismatch: 'Native scale pointer marker was reused with different modifiers',
        pointerMarkerProjectionModeMismatch: 'Native scale pointer marker was reused with a different projection mode',
        pointerMarkerTransformMismatch: 'Native scale pointer marker was reused with different transform values',
        previousPlanVerificationRequired: 'Previous scale plan token must be verified before the next pointer marker',
        sessionAlreadyActive: 'Scale snapping runtime already has an active session'
      },
      source: {
        boundsMustBeFinite: 'The bounds of scale snap source "{{sourceId}}" must be finite',
        boundsMustBeOrdered: 'The bounds of scale snap source "{{sourceId}}" must be ordered',
        centersMustMatchEdges: 'Scale snap source "{{sourceId}}" must derive its center coordinates from its edges',
        idMustBeUniqueAndNonEmpty: 'Scale snap source ID "{{sourceId}}" must be non-empty and unique'
      },
      stepProjection: {
        edgesMustBePreserved: 'Scale step projection must preserve gesture edges',
        variablesMustBePreserved: 'Scale step projection must preserve gesture variables'
      },
      targetEdges: {
        edgeRequired: 'Scale snapping must have at least one target edge',
        mustBeUnique: 'Scale snap target edges must be unique'
      },
      zoomMustBePositiveFinite: 'Scale snapping zoom must be a finite positive number'
    }
  },
  template: {
    errors: {
      applyFailed: 'Failed to apply the template'
    },
    warnings: {
      backgroundApplyFailed: 'Failed to apply the background from the template',
      montageBoundsUnavailable: 'Failed to determine the montage area bounds',
      noObjects: 'The template contains no objects',
      noObjectsToSerialize: 'No objects to serialize into a template',
      objectCreationFailed: 'Failed to create the template objects'
    }
  },
  text: {
    defaults: {
      newText: 'New text'
    },
    errors: {
      affineChildGeometryMismatch: 'An affine child must match the measured geometry',
      affineGeometryOrderMismatch: 'Affine geometry must match the original object order',
      compositionScaleRequiresText: 'Scaling a composition containing text requires at least one text object',
      cornerScaleRequiresInitialState: 'Text corner scaling must start from the initial state',
      domainGeometryMultiplierMismatch: 'Domain geometry must match the already selected multipliers',
      domainMeasurementMissingObjects: 'The domain measurement must contain all declared objects',
      domainObjectOrderMismatch: 'The order of domain objects must match their order at session start',
      domainWeakenedTextConstraints: 'The domain source must not relax text constraints that have already been applied',
      emptyGeometryCache: 'The text geometry cache must not be empty',
      emptyMeasurementCache: 'The text measurement cache must not be empty',
      emptySelectionMeasurementCache: 'The measurement cache for a selection containing text must not be empty',
      finalSizeNotSaved: 'The final text size must be saved through the shared update mechanism',
      geometryConfirmationRequiresSource: 'Confirming domain geometry requires its source',
      horizontalScaleChangedVerticalMultiplier: 'Horizontal scaling must not change the vertical multiplier',
      invalidAffineChildSize: 'An affine child must have positive finite dimensions',
      invalidCornerScalePlanMultiplier: 'The text corner scaling plan must contain a finite multiplier',
      invalidDomainMultipliers: 'The domain source must return positive finite multipliers',
      invalidMeasuredSelectionSize: 'The measured bounds of a selection containing text must have positive finite dimensions',
      invalidSelectionMatrix: 'The matrix of a selection containing text must contain finite values',
      invalidSelectionScaleDegreesOfFreedom: 'Scaling a selection containing text must have one or two degrees of freedom',
      invalidTextboxWidth: 'Textbox width must be a finite number',
      legacyCommitRequiresActiveScale: 'Switching to legacy commit behavior requires active text scaling',
      liveCanonicalStateMismatch: 'The live text must match the measured canonical state',
      measuredGeometryRequiresApplicationSource: 'Measured domain geometry must have a source through which it can be applied',
      measuredTextOrderMismatch: 'The measured state must match the original text order',
      missingExactBoundsAfterScale: 'The text must have exact bounds after scaling',
      missingNeighborMeasurement: 'Each text scaling variable must have a neighboring measurement',
      missingSelectedScaleProjection: 'The selected projection must exist for text scaling',
      neighborMultiplierSetMismatch: 'Neighboring text measurements must use the same set of multipliers',
      neighborSampleMustChangeMultiplier: 'A neighboring text measurement must change the selected multiplier',
      noDistinctCornerScaleGeometry: 'Could not find distinguishable text corner scaling geometry',
      noDistinctSelectionScaleGeometry: 'Could not find distinguishable scaling geometry for a selection containing text',
      noncanonicalAffineChildTransform: 'An affine child must have a canonical transform',
      noncanonicalTransformAfterCommit: 'Each text object must have a canonical transform after commit',
      nonpositiveScaleMultiplier: 'The text scaling multiplier must be positive',
      scaleProjectionCreationFailed: 'Could not build the text scaling projection',
      scaledGeometryMeasurementFailed: 'Could not measure the text geometry after scaling',
      selectionCommitRequiresConfirmedState: 'Committing a selection containing text requires a previously confirmed state',
      selectionFrameMeasurementMismatch: 'The selection frame must match the measured geometry',
      selectionMeasurementRequiresTwoObjects: 'Measuring a selection requires at least two objects',
      selectionScaleRequiresOriginalSession: 'Scaling a selection containing text must start from the original session',
      selectionScaleRequiresTwoObjects: 'Scaling a selection requires at least two objects',
      selectionScaleSessionAlreadyStarted: 'A scaling session for the selection containing text has already started',
      temporaryFrameNotRemovedBeforeCommit: 'SelectionManager must remove the temporary frame before committing text objects',
      uniformScaleMultiplierMismatch: 'Uniform scaling must preserve equal multipliers',
      unsupportedSelectionScaleAnchor: 'Scaling a selection containing text requires a supported fixed point',
      verticalSelectionControlsHidden: 'Top and bottom side handles are hidden for selections containing text',
      visibleChildBoundsMismatch: 'The visible child bounds must match the measured frame',
      widthResizePlanVerificationFailed: 'Could not apply and verify the text width resize plan',
      widthStepBecameDuplicate: 'The width resize step must not become a duplicate after the initial check',
      wrappedTextboxMeasurementFailed: 'Could not measure the Textbox geometry after text wrapping'
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
  },
  worker: {
    errors: {
      failed: 'Worker failed',
      imageBlobReadAborted: 'Reading the image Blob was aborted',
      imageBlobReadFailed: 'Failed to read the image Blob',
      imageDataUrlReadFailed: 'Failed to read the image as a data URL',
      invalidResponse: 'Invalid worker response',
      offscreenContextUnavailable: 'Failed to get a 2D context from OffscreenCanvas',
      requestFailed: 'Worker request failed',
      responseDeserializationFailed: 'Failed to deserialize the worker response',
      terminated: 'Worker has been terminated',
      unknownAction: 'Unknown action {{action}}'
    }
  }
}

export default en
