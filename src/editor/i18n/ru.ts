/* eslint-disable max-len -- Keep each translation on one line for catalog review. */
import type en from './en'

/** Built-in Russian translations. */
const ru = {
  background: {
    errors: {
      imageLoadFailed: 'Не удалось загрузить изображение',
      removeFailed: 'Не удалось удалить фон',
      setColorFailed: 'Не удалось установить цветовой фон',
      setGradientFailed: 'Не удалось установить градиентный фон',
      setImageFailed: 'Не удалось установить изображение в качестве фона',
      setPreparedImageFailed: 'Не удалось установить подготовленное изображение в качестве фона'
    }
  },
  clipboard: {
    errors: {
      cloneObjectCountMismatch: 'Количество объектов внутри клона должно совпадать с количеством объектов внутри исходного объекта',
      cloneSourceMissing: 'Исходный объект должен существовать до клонирования',
      cloneStructureMismatch: 'Структура клона должна совпадать со структурой исходного объекта',
      copyFailed: 'Не удалось скопировать объект',
      cutFailed: 'Не удалось вырезать объект',
      deferredPasteRejected: 'Вставка изображения из буфера обмена была отменена или завершилась ошибкой',
      duplicateFailed: 'Не удалось создать копию объекта',
      internalCloneFailed: 'Не удалось клонировать объект для внутреннего буфера обмена',
      pasteFailed: 'Не удалось вставить объект',
      pasteHtmlImageFailed: 'Не удалось вставить изображение из HTML',
      pasteImageFailed: 'Не удалось вставить изображение из буфера обмена'
    },
    logs: {
      imageCopied: 'Изображение успешно скопировано в буфер обмена',
      textCopied: 'Текст успешно скопирован в буфер обмена'
    },
    warnings: {
      imageWriteFallback: 'Не удалось записать изображение в буфер обмена, выполняется копирование в текстовом формате: {{error}}',
      notSupported: 'navigator.clipboard не поддерживается в этом браузере или отсутствует HTTPS-соединение.',
      systemCopyFailed: 'Не удалось скопировать объект в системный буфер обмена',
      textWriteFailed: 'Не удалось записать текст в буфер обмена: {{error}}'
    }
  },
  crop: {
    errors: {
      interactionFrameRequired: 'Для взаимодействия при обрезке требуется CropFrame',
      invalidImageTarget: 'Для обрезки изображения нужно выбрать объект растрового изображения.',
      lockedImageTarget: 'Заблокированное изображение нельзя обрезать.',
      resizeSourceLost: 'При изменении размера области обрезки потерян источник',
      sessionFrameType: 'Рамка сеанса обрезки должна быть экземпляром CropFrame'
    }
  },
  editor: {
    errors: {
      canvasAlreadyExists: 'Канвас «{{canvasId}}» уже существует. Уничтожьте предыдущий экземпляр редактора перед повторной инициализацией.',
      containerNotFound: 'Контейнер с ID «{{containerId}}» не найден.',
      destroyed: 'ImageEditor уже уничтожен',
      initialStateLoadFailed: 'Не удалось загрузить состояние редактора. Попытка импортировать начальное изображение.',
      resourceCleanupFailed: 'Не удалось освободить ресурс ImageEditor'
    },
    logs: {
      ready: 'Редактор готов'
    },
    warnings: {
      selectionContainerCheckFailed: 'Ошибка при проверке контейнера выделения по селектору «{{selector}}»:'
    }
  },
  errors: {
    logFormat: '{{origin}}. {{method}}. {{code}}. {{message}}',
    unknownErrorCode: 'Неизвестный код ошибки: ',
    unknownMethod: 'Неизвестный метод',
    unknownWarningCode: 'Неизвестный код предупреждения: '
  },
  fonts: {
    warnings: {
      fontFaceLoadFailed: 'Не удалось загрузить шрифт «{{family}}» через FontFace API',
      fontFaceSetCheckFailed: 'Не удалось проверить, был ли шрифт уже загружен через FontFaceSet'
    }
  },
  geometry: {
    errors: {
      nonFiniteDisplayDistance: 'Отображаемое расстояние должно быть конечным числом',
      nonFiniteEdges: 'Некорректные {{source}}: координаты границ должны быть конечными числами',
      unorderedEdges: 'Некорректные {{source}}: координаты границ должны быть упорядочены'
    },
    labels: {
      customSnappingBounds: 'пользовательские границы прилипания',
      visualBounds: 'визуальные границы'
    }
  },
  history: {
    errors: {
      redoFailed: 'Не удалось повторить действие',
      undoFailed: 'Не удалось отменить действие'
    },
    logs: {
      baseState: 'Базовое состояние (baseState)',
      baseStateSaved: 'Базовое состояние сохранено.',
      diff: 'Различия состояний (diff)',
      fullState: 'Полное состояние (fullState)',
      getFullState: 'Состояние из getFullState',
      loadFullState: 'Полное состояние (fullState) для loadStateFromFullState',
      noChanges: 'Нет изменений для сохранения.',
      noRedoStates: 'Нет состояний для повтора.',
      noUndoStates: 'Нет предыдущих состояний для отмены.',
      normalizedCurrentState: 'Нормализованное текущее состояние (normalizedCurrentState)',
      normalizedPreviousState: 'Нормализованное предыдущее состояние (normalizedPrevState)',
      redoCompleted: 'Повтор выполнен. Текущий индекс истории:',
      saveState: 'Сохранение состояния (saveState)',
      stateSaved: 'Состояние сохранено. Текущий индекс истории:',
      statesEqual: 'statesEqual. Нет изменений для сохранения.',
      undoCompleted: 'Отмена выполнена. Текущий индекс истории:'
    }
  },
  image: {
    errors: {
      canvasBlobCreationFailed: 'Не удалось создать Blob из канваса',
      exportFailed: 'Не удалось экспортировать изображение: {{error}}',
      importFailed: 'Не удалось импортировать изображение: {{error}}',
      invalidContentType: 'Неверный тип содержимого изображения: {{contentType}}. Ожидается один из: {{acceptedContentTypes}}.',
      invalidSourceType: 'Неверный тип источника изображения. Ожидается URL или объект File.',
      managerDestroyed: 'ImageManager уничтожен',
      noObjectSelected: 'Не выбран объект для экспорта',
      objectExportFailed: 'Не удалось экспортировать объект: {{error}}',
      pdfDataUriExpected: 'jsPDF должен вернуть строку data URI',
      resizeSourceUnavailable: 'Не удалось получить источник изображения для изменения размера',
      urlLoadFailed: 'Не удалось загрузить изображение по URL',
      workerDataUrlStringExpected: 'Воркер toDataURL должен вернуть строку',
      workerResizeBlobExpected: 'Воркер resizeImage должен вернуть Blob'
    },
    filenames: {
      defaultPng: 'изображение.png',
      defaultSvg: 'изображение.svg',
      defaultWithFormat: 'изображение.{{format}}'
    },
    warnings: {
      blobMimeTypeDetectionFailed: 'Не удалось определить MIME-тип blob URL:',
      enlargeToMinimumSize: 'Изображение меньше минимального размера канваса и будет увеличено, чтобы достичь минимальных размеров {{minWidth}}×{{minHeight}} с сохранением пропорций.',
      headRequestFailed: 'HEAD-запрос завершился ошибкой, тип определяется по расширению файла:',
      shrinkToMaximumSize: 'Изображение превышает максимальный размер канваса и будет уменьшено, чтобы вписаться в {{maxWidth}}×{{maxHeight}} с сохранением пропорций.',
      urlExtensionDetectionFailed: 'Не удалось определить расширение файла из URL:'
    }
  },
  modules: {
    errors: {
      unknownModule: 'Неизвестный модуль «{{name}}»'
    }
  },
  selection: {
    errors: {
      commitFinalizationFailed: 'Не удалось полностью завершить фиксацию общего выделения',
      commitFinishFailed: 'Не удалось завершить фиксацию общего выделения',
      commitOwnedByAnotherDomain: 'Фиксация общего выделения уже выполняется другим доменом',
      confirmedTextStateNotRestored: 'TextManager должен восстановить подтверждённое состояние',
      duplicateStepRequiresVerification: 'Повторный шаг ActiveSelection не может завершиться до проверки результата',
      earlyFinishDidNotRestoreTextStep: 'Досрочное завершение должно восстановить последний текстовый шаг',
      earlyTextScaleFinishNotCommitted: 'Досрочное завершение масштабирования текста должно зафиксировать активную сессию',
      measuredTextGeometryNotCommitted: 'TextManager должен зафиксировать измеренную геометрию текста',
      mixedCompositionShapeSessionNotStarted: 'Полный смешанный состав должен начать сессию ShapeManager',
      planMissingCanonicalState: 'План выделения с текстами должен содержать измеренное каноническое состояние',
      rollbackOrderMismatch: 'Откат должен восстановить исходный порядок объектов',
      shapeCommitAlreadyInProgress: 'Фиксация общего выделения из фигур уже выполняется',
      shapeManagerScaleMismatch: 'Масштаб выделения должен совпадать с результатом ShapeManager',
      shapeScaleSessionNotFinished: 'Сессия масштабирования фигур должна завершиться после фиксации',
      shapeSelectionRejectedScale: 'Поддерживаемое выделение из фигур должно принять рассчитанный масштаб',
      skewTransitionRequiresSession: 'Переход к наклону требует активной сессии общего выделения',
      stepBecameDuplicate: 'Шаг ActiveSelection стал повторным после начальной проверки сессии',
      textCommitRequiresProtectedSession: 'Для фиксации текстового состава требуется защищённая сессия',
      textCompositionRequiresTextboxes: 'Текстовый состав должен содержать только объекты Textbox',
      textSelectionSessionNotStarted: 'Поддерживаемое выделение с текстами должно начать сессию TextManager',
      textSessionNotFinished: 'Общая текстовая сессия должна завершиться после фиксации',
      verifiedTextStepNotConfirmed: 'Проверенный текстовый шаг должен стать подтверждённым'
    }
  },
  shape: {
    errors: {
      applicationMissingMeasuredShapes: 'Применение должно охватывать все измеренные фигуры',
      applicationOrderMismatch: 'Порядок применяемых фигур должен совпадать с порядком измерения',
      cleanupRequiresChild: 'Для очистки состояния масштабирования общего выделения нужна хотя бы одна дочерняя фигура',
      cleanupRequiresShapeGroups: 'Доменную сессию фигур можно очистить только для объектов типа shape-group',
      domainMeasurementRequiresShape: 'Доменное измерение требует хотя бы одной фигуры',
      domainScaleSessionNotStarted: 'Для поддерживаемых фигур должна начаться доменная сессия масштабирования',
      emptyMeasurementCache: 'Кеш измерений фигур не должен быть пустым',
      invalidChildMatrix: 'Матрица дочернего объекта должна содержать конечные значения',
      invalidCompensatedFrameScale: 'Компенсируемая рамка фигуры должна иметь положительный масштаб',
      invalidFinalRotatedShapeCenter: 'Итоговый центр повёрнутой фигуры должен иметь конечные координаты',
      invalidProjectionEdgeCoefficients: 'Проекция режима масштабирования фигуры содержит некорректные коэффициенты границ',
      invalidRestoredSelectionCenter: 'Центр восстановленной рамки общего выделения должен иметь конечные координаты',
      invalidRestoredSelectionSize: 'Восстановленная рамка общего выделения должна иметь положительные конечные размеры',
      invalidRotatedShapeAngle: 'Угол повёрнутой фигуры должен быть конечным',
      invalidRotatedShapeCenter: 'Центр повёрнутой фигуры должен иметь конечные координаты',
      invalidRotatedShapeCompensationMatrix: 'Компенсирующая матрица повёрнутой фигуры должна содержать конечные значения',
      invalidSelectionScale: 'ShapeManager должен применить положительный конечный масштаб общего выделения',
      measuredDimensionsNotCommitted: 'Для каждой измеренной фигуры должны быть зафиксированы рассчитанные размеры',
      measurementRequiredBeforeApplication: 'Перед применением фигуры должны быть измерены в той же сессии',
      missingExactBoundsAfterScale: 'После масштабирования фигура должна иметь точные границы',
      missingGeometrySnapshot: 'Каждой фигуре должен соответствовать снимок геометрии',
      missingSavedChildMatrix: 'Для каждого дочернего объекта должна существовать сохранённая матрица',
      missingScaleSessionState: 'Для фигуры должно существовать состояние текущей сессии масштабирования',
      missingSessionConstraints: 'Для фигуры должны быть рассчитаны ограничения текущей сессии',
      mixedCommitRequiresShape: 'Для фиксации смешанного состава нужна хотя бы одна фигура',
      mixedCommitRequiresShapes: 'Фиксация смешанного состава принимает только фигуры',
      mixedCompositionRequiresShape: 'Смешанный состав должен содержать хотя бы одну фигуру',
      mixedMeasurementRequiresUnrotatedShape: 'Измерение смешанного состава поддерживает только неповёрнутые канонические фигуры',
      positiveFiniteNumberRequired: '{{name}}: требуется положительное конечное число',
      roundingRestoreRequiresRectangle: 'Скругление углов можно восстановить только для прямоугольной фигуры',
      savedMatrixCountMismatch: 'Количество сохранённых матриц должно совпадать с количеством дочерних объектов',
      scaleSessionRequiresSelection: 'Для сессии масштабирования фигур требуется непустое общее выделение',
      snapshotRequiresCompleteComposition: 'Для снимка масштабирования требуется полная композиция фигуры',
      textManagerNotInitialized: 'Для операций с текстом фигуры требуется инициализированный TextManager',
      uniformScaleRequiresEqualMultipliers: 'Пропорциональное масштабирование фигуры требует одинаковых множителей по осям x и y',
      unsupportedControlScaleMode: 'Элемент управления "{{controlKey}}" не поддерживает режим масштабирования фигуры "{{mode}}"'
    },
    labels: {
      initialScaleHeight: 'Исходная высота фигуры',
      initialScaleWidth: 'Исходная ширина фигуры',
      scaleMultiplierX: 'Множитель масштабирования фигуры по оси x',
      scaleMultiplierY: 'Множитель масштабирования фигуры по оси y'
    }
  },
  snapping: {
    imageScale: {
      duplicateStepVerificationRequired: 'Повторный шаг масштабирования изображения не может завершиться до проверки результата',
      stepBecameDuplicate: 'Шаг масштабирования изображения стал повторным после начальной проверки сессии'
    },
    movement: {
      bounds: {
        centersMustMatchEdges: 'Координаты центра границ для прилипания при перемещении должны вычисляться по координатам их сторон',
        mustBeFiniteAndOrdered: 'Границы для прилипания при перемещении должны содержать конечные упорядоченные значения'
      },
      duplicateStepVerificationRequired: 'Повторный шаг перемещения нельзя обработать до проверки',
      exactFinalBoundsRequired: 'Для прилипания при перемещении объекта нужны точные итоговые границы',
      exactRawBoundsRequired: 'Для прилипания при перемещении объекта нужны точные исходные границы',
      exactTargetBoundsRequired: 'Для прилипания при перемещении объекта нужны точные границы целевого объекта',
      hold: {
        candidateNotInBaseline: 'Кандидат в состоянии удержания прилипания при перемещении не принадлежит активному базовому состоянию',
        invalidConstraint: 'Состояние удержания прилипания при перемещении содержит недопустимое ограничение по оси {{axis}}',
        invalidSpacingConstraint: 'Состояние удержания прилипания при перемещении содержит недопустимое ограничение интервала по оси {{axis}}'
      },
      rawIntent: {
        mustTranslateBaseline: 'Исходные параметры перемещения должны описывать параллельный перенос базового состояния жеста'
      },
      runtime: {
        foreignPlanToken: 'Посторонний токен плана перемещения',
        noActiveSession: 'В механизме прилипания при перемещении нет активной сессии',
        noPointerStepToVerify: 'В механизме прилипания при перемещении нет шага указателя для проверки',
        planTokenAlreadyUsed: 'Токен плана перемещения уже использован',
        planTokenPointerStepMismatch: 'Токен плана перемещения не принадлежит текущему шагу указателя',
        pointerMarkerRawIntentMismatch: 'Маркер исходного события указателя при перемещении повторно использован с другими исходными параметрами',
        previousPlanVerificationRequired: 'Токен предыдущего плана перемещения должен быть проверен до следующего маркера указателя',
        sessionAlreadyActive: 'В механизме прилипания при перемещении уже есть активная сессия'
      },
      source: {
        boundsMustBeFiniteAndOrdered: 'Границы источника прилипания при перемещении должны содержать конечные упорядоченные значения',
        centersMustMatchEdges: 'Координаты центра источника прилипания при перемещении должны вычисляться по координатам его сторон',
        idMustBeUniqueAndNonEmpty: 'Идентификатор источника прилипания при перемещении «{{sourceId}}» должен быть непустым и уникальным'
      },
      spacing: {
        centeringRequiresExactNeighbors: 'Для центрирования по интервалам при перемещении нужны оба точно определённых соседних объекта',
        contextRequired: 'Результат прилипания по интервалам при перемещении должен содержать контекст',
        primaryIntervalMustBePreserved: 'Ограничение интервала при перемещении должно сохранять основной интервал',
        referenceRequiresExactPattern: 'Для прилипания по эталонному интервалу при перемещении нужен точный образец',
        referenceRequiresSelectedExactNeighbor: 'Для прилипания по эталонному интервалу при перемещении нужен выбранный точно определённый соседний объект',
        selectedIntervalsRequired: 'Результат прилипания по интервалам при перемещении должен описывать выбранные интервалы',
        singlePrimaryIntervalRequired: 'Результат прилипания по интервалам при перемещении должен определять ровно один основной интервал'
      },
      targetPosition: {
        coordinatesMustBeFinite: 'Координаты целевого объекта для прилипания при перемещении должны быть конечными'
      },
      targetPositionMustBeFinite: 'Для прилипания при перемещении объекта нужны конечные координаты целевого объекта',
      zoomMustBePositiveFinite: 'Коэффициент увеличения для прилипания при перемещении должен быть конечным положительным числом'
    },
    rectangularScale: {
      appliedMultipliersMustBePositive: 'При прямоугольном масштабировании применённые множители должны быть положительными',
      exactFinalBoundsRequired: 'Для прямоугольного масштабирования нужны точные итоговые границы',
      firstMultiplierMustBeFinite: 'Значения прямоугольного масштабирования должны содержать конечный первый множитель',
      freeScalingRequiresTwoFiniteMultipliers: 'Для свободного прямоугольного масштабирования нужны два конечных множителя',
      missingSupportedProjectionMode: 'В проекции прямоугольного масштабирования отсутствует поддерживаемый режим «{{mode}}»',
      movingEdgeRequired: 'Жест прямоугольного масштабирования должен содержать хотя бы одну перемещаемую сторону',
      plan: {
        multipliersMustBePositive: 'План прямоугольного масштабирования должен содержать положительные множители'
      },
      point: {
        coordinatesMustBeFinite: 'Точка прямоугольного масштабирования должна содержать конечные координаты'
      },
      unsupportedProjectionMode: 'Неподдерживаемый режим проекции прямоугольного масштабирования «{{projectionMode}}»'
    },
    scale: {
      bounds: {
        centersMustBeFinite: 'Границы для прилипания при масштабировании должны содержать конечные координаты центра',
        centersMustMatchEdges: 'Координаты центра границ для прилипания при масштабировании должны вычисляться по координатам их сторон',
        edgesMustBeFiniteAndOrdered: 'Границы для прилипания при масштабировании должны содержать конечные упорядоченные координаты сторон'
      },
      candidate: {
        edgeAxisMismatch: 'Сторона кандидата прилипания при масштабировании «{{candidateId}}» не принадлежит оси {{axis}}',
        edgeMustMove: 'Сторона кандидата прилипания при масштабировании «{{candidateId}}» не перемещается ни в одном режиме проекции',
        idMustBeUniqueAndNonEmpty: 'Идентификатор кандидата прилипания при масштабировании «{{candidateId}}» должен быть непустым и уникальным',
        positionMustBeFinite: 'Координата кандидата прилипания при масштабировании «{{candidateId}}» должна быть конечной'
      },
      constraint: {
        projectionSolutionRequired: 'Ограничение масштабирования для стороны {{edge}} должно иметь решение проекции'
      },
      gestureBaseline: {
        projectionModeRequired: 'Базовое состояние жеста масштабирования должно содержать хотя бы один режим проекции'
      },
      hold: {
        candidateAxisMismatch: 'Удерживаемый кандидат масштабирования принадлежит оси {{candidateAxis}}, а не {{axis}}',
        candidateNotInBaseline: 'Удерживаемый кандидат масштабирования «{{candidateId}}» не принадлежит снимку базового состояния'
      },
      plan: {
        constraintNotReached: 'План масштабирования не достигает ограничения для стороны {{edge}}'
      },
      point: {
        coordinatesMustBeFinite: 'Прилипание при масштабировании, {{name}}: координаты должны быть конечными'
      },
      pointLabels: {
        finalFixedAnchor: 'итоговая неподвижная опорная точка',
        fixedAnchor: 'неподвижная опорная точка'
      },
      projection: {
        baselineValueCountMismatch: 'Количество переменных проекции масштабирования и базовых значений должно совпадать',
        baselineValuesMustBeFinite: 'Базовые значения проекции масштабирования должны быть конечными',
        coefficientsMustBeFinite: 'Коэффициенты проекции масштабирования для стороны {{edge}} должны быть конечными',
        constraintCannotBeProjected: 'Ограничение масштабирования для стороны {{edge}} невозможно спроецировать',
        constraintMustBeFinite: 'Ограничение проекции масштабирования для стороны {{edge}} должно быть конечным',
        constraintsMustUseDifferentAxes: 'Ограничения проекции масштабирования должны использовать разные оси сцены',
        duplicateEdge: 'Проекция масштабирования содержит повторяющуюся сторону {{edge}}',
        edgeMissing: 'Проекция масштабирования не содержит сторону {{edge}}',
        edgeMissingOnAxis: 'Проекция масштабирования не содержит сторону {{edge}} по оси {{axis}}',
        edgePositionUnresolved: 'Проекция масштабирования не определила положение стороны {{edge}}',
        epsilonMustBeNonNegativeFinite: 'Допуск epsilon проекции масштабирования должен быть конечным неотрицательным числом',
        invalidCoefficientCount: 'Неверное количество коэффициентов проекции масштабирования для стороны {{edge}}',
        invalidValueCount: 'Проекция масштабирования содержит неверное количество значений',
        movingSceneEdgeRequired: 'Проекция масштабирования должна содержать хотя бы одну перемещаемую сторону в координатах сцены',
        oneOrTwoVariablesRequired: 'Проекция масштабирования должна содержать одну или две переменные',
        sceneWeightCountMismatch: 'Количество переменных проекции масштабирования и весов в координатах сцены должно совпадать',
        sceneWeightsMustBePositiveFinite: 'Веса проекции масштабирования в координатах сцены должны быть конечными положительными числами',
        tooManySceneConstraints: 'Проекция масштабирования поддерживает не более двух ограничений в координатах сцены',
        valuesMustBeFinite: 'Значения проекции масштабирования должны быть конечными',
        variableMustAffectEdge: 'Переменная проекции масштабирования «{{variable}}» должна влиять хотя бы на одну сторону',
        variablesMustBeUnique: 'Переменные проекции масштабирования должны быть уникальными'
      },
      projectionMode: {
        idMustBeUniqueAndNonEmpty: 'Идентификатор режима проекции масштабирования «{{id}}» должен быть непустым и уникальным',
        unknown: 'Неизвестный режим проекции масштабирования «{{modeId}}»'
      },
      rawIntent: {
        invalidValueCount: 'Исходные параметры масштабирования содержат неверное количество значений',
        modifiersMustBeBoolean: 'Модификаторы исходных параметров масштабирования должны быть логическими значениями',
        projectionSolutionRequired: 'Исходные параметры масштабирования должны иметь решение проекции',
        valuesMustBeFinite: 'Значения исходных параметров масштабирования должны быть конечными'
      },
      refinement: {
        constraintNotInCandidates: 'Уточнённое ограничение по оси {{axis}} не принадлежит кандидатам плана масштабирования',
        constraintNotReached: 'Уточнённый план масштабирования не достигает ограничения для стороны {{edge}}',
        invalidValueCount: 'Уточнение масштабирования содержит неверное количество значений',
        valuesMustBeFinite: 'Значения уточнения масштабирования должны быть конечными'
      },
      runtime: {
        foreignPlanToken: 'Посторонний токен плана масштабирования',
        noActiveSession: 'В механизме прилипания при масштабировании нет активной сессии',
        noPointerStepToRefine: 'В механизме прилипания при масштабировании нет шага указателя для уточнения',
        noPointerStepToVerify: 'В механизме прилипания при масштабировании нет шага указателя для проверки',
        planTokenAlreadyUsed: 'Токен плана масштабирования уже использован',
        planTokenPointerStepMismatch: 'Токен плана масштабирования не принадлежит текущему шагу указателя',
        pointerMarkerModifiersMismatch: 'Маркер исходного события указателя при масштабировании повторно использован с другими модификаторами',
        pointerMarkerProjectionModeMismatch: 'Маркер исходного события указателя при масштабировании повторно использован с другим режимом проекции',
        pointerMarkerTransformMismatch: 'Маркер исходного события указателя при масштабировании повторно использован с другими значениями трансформации',
        previousPlanVerificationRequired: 'Токен предыдущего плана масштабирования должен быть проверен до следующего маркера указателя',
        sessionAlreadyActive: 'В механизме прилипания при масштабировании уже есть активная сессия'
      },
      source: {
        boundsMustBeFinite: 'Координаты границ источника прилипания при масштабировании «{{sourceId}}» должны быть конечными',
        boundsMustBeOrdered: 'Координаты границ источника прилипания при масштабировании «{{sourceId}}» должны быть упорядочены',
        centersMustMatchEdges: 'Координаты центра источника прилипания при масштабировании «{{sourceId}}» должны вычисляться по координатам его сторон',
        idMustBeUniqueAndNonEmpty: 'Идентификатор источника прилипания при масштабировании «{{sourceId}}» должен быть непустым и уникальным'
      },
      stepProjection: {
        edgesMustBePreserved: 'Проекция шага масштабирования должна сохранять стороны жеста',
        variablesMustBePreserved: 'Проекция шага масштабирования должна сохранять переменные жеста'
      },
      targetEdges: {
        edgeRequired: 'Для прилипания при масштабировании нужна хотя бы одна целевая сторона',
        mustBeUnique: 'Целевые стороны прилипания при масштабировании должны быть уникальными'
      },
      zoomMustBePositiveFinite: 'Коэффициент увеличения для прилипания при масштабировании должен быть конечным положительным числом'
    }
  },
  template: {
    errors: {
      applyFailed: 'Не удалось применить шаблон'
    },
    warnings: {
      backgroundApplyFailed: 'Не удалось применить фон из шаблона',
      montageBoundsUnavailable: 'Не удалось определить границы монтажной области',
      noObjects: 'Шаблон не содержит объектов',
      noObjectsToSerialize: 'Нет объектов для сериализации шаблона',
      objectCreationFailed: 'Не удалось создать объекты шаблона'
    }
  },
  text: {
    defaults: {
      newText: 'Новый текст'
    },
    errors: {
      affineChildGeometryMismatch: 'Дочерний объект с аффинным преобразованием должен совпадать с измеренной геометрией',
      affineGeometryOrderMismatch: 'Аффинная геометрия должна соответствовать исходному порядку объектов',
      compositionScaleRequiresText: 'Масштабирование состава с текстом требует хотя бы одного текстового объекта',
      cornerScaleRequiresInitialState: 'Масштабирование текста за угол должно начинаться с исходного состояния',
      domainGeometryMultiplierMismatch: 'Доменная геометрия должна соответствовать уже выбранным множителям',
      domainMeasurementMissingObjects: 'Доменное измерение должно содержать все заявленные объекты',
      domainObjectOrderMismatch: 'Порядок доменных объектов должен совпадать с их порядком в начале сессии',
      domainWeakenedTextConstraints: 'Доменный источник не должен ослаблять уже применённые ограничения текста',
      emptyGeometryCache: 'Кеш геометрии текстов не должен быть пустым',
      emptyMeasurementCache: 'Кеш измерений текста не должен быть пустым',
      emptySelectionMeasurementCache: 'Кеш измерений выделения с текстами не должен быть пустым',
      finalSizeNotSaved: 'Итоговый размер текста должен сохраниться через общий механизм обновления',
      geometryConfirmationRequiresSource: 'Для подтверждения доменной геометрии требуется её источник',
      horizontalScaleChangedVerticalMultiplier: 'Горизонтальное масштабирование не должно менять вертикальный множитель',
      invalidAffineChildSize: 'Дочерний объект с аффинным преобразованием должен иметь положительные конечные размеры',
      invalidCornerScalePlanMultiplier: 'План масштабирования текста за угол должен содержать конечный множитель',
      invalidDomainMultipliers: 'Доменный источник должен вернуть положительные конечные множители',
      invalidMeasuredSelectionSize: 'Измеренные границы выделения с текстами должны иметь положительные конечные размеры',
      invalidSelectionMatrix: 'Матрица выделения с текстами должна содержать конечные значения',
      invalidSelectionScaleDegreesOfFreedom: 'Масштабирование выделения с текстами должно иметь одну или две степени свободы',
      invalidTextboxWidth: 'Ширина Textbox должна быть конечным числом',
      legacyCommitRequiresActiveScale: 'Для перехода к прежнему механизму фиксации требуется активное масштабирование текста',
      liveCanonicalStateMismatch: 'Текущий текстовый объект должен совпадать с измеренным каноническим состоянием',
      measuredGeometryRequiresApplicationSource: 'Измеренная доменная геометрия должна иметь источник для её применения',
      measuredTextOrderMismatch: 'Измеренное состояние должно соответствовать исходному порядку текстов',
      missingExactBoundsAfterScale: 'После масштабирования текст должен иметь точные границы',
      missingNeighborMeasurement: 'Каждой переменной масштабирования текста должно соответствовать соседнее измерение',
      missingSelectedScaleProjection: 'Для масштабирования текста должна существовать выбранная проекция',
      neighborMultiplierSetMismatch: 'Соседние измерения текста должны использовать одинаковый набор множителей',
      neighborSampleMustChangeMultiplier: 'Соседнее измерение текста должно менять выбранный множитель',
      noDistinctCornerScaleGeometry: 'Не удалось найти различимую геометрию масштабирования текста за угол',
      noDistinctSelectionScaleGeometry: 'Не удалось найти различимую геометрию масштабирования выделения с текстами',
      noncanonicalAffineChildTransform: 'Дочерний объект с аффинным преобразованием должен иметь каноническую трансформацию',
      noncanonicalTransformAfterCommit: 'После фиксации каждый текстовый объект должен иметь каноническое преобразование',
      nonpositiveScaleMultiplier: 'Множитель масштабирования текста должен быть положительным',
      scaleProjectionCreationFailed: 'Не удалось построить проекцию масштабирования текста',
      scaledGeometryMeasurementFailed: 'Не удалось измерить геометрию текста после масштабирования',
      selectionCommitRequiresConfirmedState: 'Фиксации выделения с текстами должно предшествовать подтверждённое состояние',
      selectionFrameMeasurementMismatch: 'Рамка выделения должна совпадать с измеренной геометрией',
      selectionMeasurementRequiresTwoObjects: 'Измерение общего выделения требует как минимум двух объектов',
      selectionScaleRequiresOriginalSession: 'Масштабирование выделения с текстом должно начинаться с исходной сессии',
      selectionScaleRequiresTwoObjects: 'Масштабирование общего выделения требует как минимум двух объектов',
      selectionScaleSessionAlreadyStarted: 'Сессия масштабирования выделения с текстом уже начата',
      temporaryFrameNotRemovedBeforeCommit: 'SelectionManager должен снять временную рамку до фиксации текстовых объектов',
      uniformScaleMultiplierMismatch: 'Пропорциональное масштабирование должно сохранять одинаковые множители',
      unsupportedSelectionScaleAnchor: 'Масштабирование выделения с текстами требует поддерживаемой неподвижной точки',
      verticalSelectionControlsHidden: 'Верхняя и нижняя боковые ручки скрыты для выделения с текстами',
      visibleChildBoundsMismatch: 'Видимые границы дочерних объектов должны совпадать с измеренной рамкой',
      widthResizePlanVerificationFailed: 'Не удалось применить и проверить план изменения ширины текста',
      widthStepBecameDuplicate: 'Шаг изменения ширины не должен становиться дубликатом после начальной проверки',
      wrappedTextboxMeasurementFailed: 'Не удалось измерить геометрию Textbox после переноса строк'
    }
  },
  ui: {
    indicators: {
      objectSize: 'Ширина: {{width}} Высота: {{height}}',
      rotationAngle: '{{angle}}°'
    },
    toolbar: {
      bringForward: 'На один уровень вверх',
      bringToFront: 'На передний план',
      delete: 'Удалить',
      duplicate: 'Создать копию',
      lock: 'Заблокировать',
      sendBackward: 'На один уровень вниз',
      sendToBack: 'На задний план',
      unlock: 'Разблокировать'
    }
  },
  worker: {
    errors: {
      failed: 'Произошёл сбой воркера',
      imageBlobReadAborted: 'Чтение Blob изображения было прервано',
      imageBlobReadFailed: 'Не удалось прочитать Blob изображения',
      imageDataUrlReadFailed: 'Не удалось прочитать изображение как data URL',
      invalidResponse: 'Некорректный ответ воркера',
      offscreenContextUnavailable: 'Не удалось получить 2D-контекст OffscreenCanvas',
      requestFailed: 'Запрос к воркеру завершился ошибкой',
      responseDeserializationFailed: 'Не удалось десериализовать ответ воркера',
      terminated: 'Работа воркера завершена',
      unknownAction: 'Неизвестное действие {{action}}'
    }
  }
} satisfies typeof en

export default ru
