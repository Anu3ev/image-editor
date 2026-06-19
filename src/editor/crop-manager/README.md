# CropManager

`CropManager` управляет временным crop mode для монтажной области и изображения. Его главная задача не в том, чтобы хранить итоговый crop, а в том, чтобы безопасно провести сессию редактирования: создать `CropFrame`, ограничить его границами исходного изображения, отдать наружу текущее состояние и затем либо применить результат, либо отменить сессию.

## Где хранится состояние

- Активная сессия живёт в `CropManager._session`. Это временное состояние во время редактирования: оно не сериализуется, не попадает в history и не должно утекать в сохраняемую модель.
- Публичное состояние crop mode возвращает `getState()`. Итоговый прямоугольник считается не из сырой геометрии Fabric frame:
  во время resize используется неокруглённый `getCropSessionResultRect()`, наружу `getState()` отдаёт округлённый результат через `getRoundedCropRect()`.
- Округлённый результат crop приводит `width/height` к целым пикселям и ограничивает `left/top` внутри исходного изображения только при `allowFrameOverflow = false`.
  При разрешённом overflow отрицательные `left/top` остаются валидным результатом для прозрачных полей.
- `CropFrame` тоже существует только внутри активной crop session. Он помечен `excludeFromExport` и не должен попадать в экспорт.

## Важные контракты во время crop

- `CropFrame` хранит `cropSource`, `cropAllowFrameOverflow`, `cropSourceScaleX`, `cropSourceScaleY` и `preserveAspectRatio`.
  Эти поля определяют не только UI, но и то, как resize/snap должны интерпретировать размер frame.
- `CropFrame.scaleX/scaleY` на старте совпадают со scale исходного изображения.
  Поэтому обычный Fabric bounds показывает геометрию frame на canvas, а `frame.getObjectDisplaySize()` возвращает размер crop-результата в пикселях исходного изображения.
- `frame.getObjectSnappingBounds()` намеренно исключает stroke.
  Snapping должен работать по геометрии crop-результата, а не по визуальной обводке frame.
- При переносе crop frame к guide исходной точкой для последующего resize становится фактическое положение frame.
  Если соседняя подсистема уже сдвинула зафиксированную грань с guide, resize с ограничением по исходному изображению не должен “угадывать” потерянный пиксель обратно.
  Такой баг нужно чинить в `SnappingManager`, а не в clamp-математике `CropManager`.
- Canvas crop тоже проходит через `CropFrame`, но обычно имеет `cropSourceScaleX/Y = 1`.
  В этом режиме размер индикатора и геометрия frame на canvas совпадают, но удержание грани на guide всё равно остаётся ответственностью `SnappingManager`.
  Округление до целых пикселей после расчёта guide не должно сдвигать эту грань.
- `allowFrameOverflow = false` включает ограничение crop frame границами исходного изображения.
  В этом режиме clamp и scale-limit должны опираться на `getCropRectInSource()` и `getSourceSize()`, а не на сырой bounding box на canvas.
- `preserveAspectRatio` по умолчанию включён. `Shift` не “добавляет” пропорции, а инвертирует текущее правило.
  Этот контракт должен совпадать с `crop-controls` и `snapping-manager`.

## Resize и clamp

- `crop-controls` вычисляет ограничения scale по исходному изображению и помечает текущий `Transform` служебными флагами:
  `cropSourceScaleBounds`, `cropSourceScaleAnchorX/Y`, `cropSourceScaleClamped`, `cropSourceBoundScale`,
  `cropSourceScalePreserveAspectRatio`.
- Эти поля существуют только внутри текущей resize-сессии.
  Их нельзя рассматривать как сохраняемое состояние и нельзя переносить в доменную модель.
- Resize с ограничением по исходному изображению держит две системы координат отдельно:
  `getCropRectInSource()` возвращает rect в координатах исходного изображения, `getCropSessionResultRect()` возвращает неокруглённый crop-result,
  а публичный `getState().rect` отдаёт округлённый результат.
  Нельзя использовать публичный result-rect как входные координаты для размещения frame при восстановлении из координат исходного изображения.
- `CropManager._handleCropFrameChanged()` сначала собирает состояние ограничения по исходному изображению из текущего `Transform`, затем делает общий clamp по исходнику и после него восстанавливает фиксированную опорную точку через `startRect + anchors + итоговый размер`.
  Это нужно, потому что общий clamp может поменять размер, но не должен сдвигать противоположный угол crop-области.
- Во время Fabric resize у frame может временно измениться `originX/originY`.
  При обратном переводе source-rect в frame state нужно переводить центр rect в текущий Fabric origin через `translateToOriginPoint()`, а не записывать центр как сырой `left/top`.

## Что здесь легко сломать

- Смешать пиксели исходного изображения и координаты canvas в одном сравнении.
- Перенести временные поля `Transform` в session/model “для удобства”.
- Починить только один путь resize и забыть про `apply`, `cancel`, повторный `start*Crop()` и восстановление geometry после clamp.
- Изменить правило `Shift` только в одном месте.

## Перед правкой

- Сначала определяй, где живёт проблема: в жизненном цикле сессии, геометрии/clamp или snapping.
- Если меняется поведение `CropFrame`, проверяй оба контракта:
  размер индикатора через `getObjectDisplaySize()` и snapping bounds через `getObjectSnappingBounds()`.
- Если меняется resize с ограничением по исходному изображению, сразу перечитывай:
  [`domain/crop-frame.ts`](./domain/crop-frame.ts),
  [`interaction/crop-controls.ts`](./interaction/crop-controls.ts),
  [`index.ts`](./index.ts).
