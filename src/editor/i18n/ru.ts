/** Built-in Russian translations for the user interface. */
const ru = {
  image: {
    filenames: {
      defaultPng: 'изображение.png',
      defaultSvg: 'изображение.svg',
      defaultWithFormat: 'изображение.{{format}}'
    }
  },
  notifications: {
    background: {
      colorFailed: 'Не удалось установить цвет фона.',
      gradientFailed: 'Не удалось установить градиент фона.',
      imageFailed: 'Не удалось установить фоновое изображение.',
      removeFailed: 'Не удалось удалить фон.'
    },
    clipboard: {
      copyFailed: 'Не удалось скопировать объект.',
      cutFailed: 'Не удалось вырезать объект.',
      duplicateFailed: 'Не удалось создать копию объекта.',
      pasteFailed: 'Не удалось вставить объект.',
      pasteImageCanceled: 'Вставка изображения отменена или завершилась ошибкой.',
      pasteImageFailed: 'Не удалось вставить изображение.',
      systemCopyFailed: 'Не удалось скопировать объект в системный буфер обмена.',
      unavailable: 'Системный буфер обмена недоступен в этом браузере.'
    },
    crop: {
      invalidTarget: 'Выберите растровое изображение для обрезки.',
      lockedTarget: 'Разблокируйте изображение перед обрезкой.'
    },
    history: {
      redoFailed: 'Не удалось повторить действие.',
      undoFailed: 'Не удалось отменить действие.'
    },
    image: {
      exportFailed: 'Не удалось экспортировать изображение.',
      importFailed: 'Не удалось импортировать изображение.',
      noSelection: 'Выберите объект для экспорта.',
      resizeMax: 'Изображение будет уменьшено до {{width}}×{{height}} с сохранением пропорций.',
      resizeMin: 'Изображение будет увеличено как минимум до {{width}}×{{height}} с сохранением пропорций.',
      unsupportedFormat: 'Этот формат изображения не поддерживается.'
    },
    template: {
      applyFailed: 'Не удалось применить шаблон.',
      empty: 'В шаблоне нет объектов.',
      noSelection: 'Выберите объекты для сохранения в шаблон.'
    }
  },
  text: {
    defaults: {
      newText: 'Новый текст'
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
  }
}

export default ru
