# CropManager

`CropManager` управляет временным crop mode для монтажной области и изображения. Его главная задача не в том, чтобы хранить итоговый crop, а в том, чтобы безопасно провести live-сессию: создать `CropFrame`, ограничить его source-границами, отдать наружу текущее состояние и затем либо применить результат, либо отменить сессию.

## Что здесь считается source of truth

- Активная сессия живёт в `CropManager._session`. Это transient runtime-state: он не сериализуется, не попадает в history и не должен утекать в persisted model.
- Публичное состояние crop mode возвращает `getState()`. Итоговый прямоугольник считается не из сырой геометрии Fabric frame:
  внутри live-логики используется raw `getCropSessionResultRect()`, наружу `getState()` отдаёт rounded crop-result через `getRoundedCropRect()`.
- Rounded crop-result округляет `width/height` как display-size и clamp-ит `left/top` внутри source только в source-bound режиме.
  `CropManager` передаёт `sourceSize` в `getRoundedCropRect()` при `allowFrameOverflow = false`; при разрешённом overflow отрицательные `left/top` остаются валидным результатом для прозрачных полей.
- `CropFrame` тоже runtime-объект. Он помечен `excludeFromExport` и существует только внутри активной crop session.

## Важные runtime-контракты

- `CropFrame` хранит `cropSource`, `cropAllowFrameOverflow`, `cropSourceScaleX`, `cropSourceScaleY` и `preserveAspectRatio`.
  Эти поля определяют не только UI, но и то, как resize/snap должны интерпретировать размер frame.
- `CropFrame.scaleX/scaleY` на старте совпадают со scale source.
  Поэтому обычный Fabric bounds живёт в scene-пикселях, а `frame.getObjectDisplaySize()` возвращает размер crop-результата в source-пикселях.
- `frame.getObjectSnappingBounds()` намеренно исключает stroke.
  Snapping должен работать по геометрии crop-результата, а не по визуальной обводке frame.
- `allowFrameOverflow = false` включает source-bound поведение.
  В этом режиме clamp и scale-limit должны опираться на `getCropRectInSource()` и `getSourceSize()`, а не на сырой bounding box на canvas.
- `preserveAspectRatio` по умолчанию включён. `Shift` не “добавляет” пропорции, а инвертирует текущее правило.
  Этот контракт должен совпадать с `crop-controls` и `snapping-manager`.

## Live resize и clamp

- `crop-controls` вычисляет source-scale bounds и помечает текущий `Transform` служебными флагами:
  `cropSourceScaleBounds`, `cropSourceScaleAnchorX/Y`, `cropSourceScaleClamped`, `cropSourceBoundScale`,
  `cropSourceScalePreserveAspectRatio`.
- Эти поля существуют только внутри live resize-сессии.
  Их нельзя рассматривать как persisted state и нельзя переносить в доменную модель.
- Source-bound resize держит две координатные плоскости отдельно:
  `getCropRectInSource()` возвращает rect во внутренней source-plane, `getCropSessionResultRect()` возвращает raw crop-result,
  а публичный `getState().rect` отдаёт rounded crop-result.
  Нельзя использовать публичный result-rect как входные координаты для размещения frame внутри source-bound materialization.
- `CropManager._handleCropFrameChanged()` сначала собирает source-bound state из текущего `Transform`, затем делает общий clamp по source и после него восстанавливает фиксированный anchor через `startRect + anchors + итоговый размер`.
  Это нужно, потому что общий clamp может поменять размер, но не должен сдвигать противоположный угол crop-области.
- Во время Fabric resize у frame может временно измениться `originX/originY`.
  При обратном переводе source-rect в frame state нужно переводить центр rect в текущий Fabric origin через `translateToOriginPoint()`, а не записывать центр как сырой `left/top`.

## Что здесь легко сломать

- Смешать source-пиксели и scene-пиксели в одном сравнении.
- Перенести transient transform metadata в session/model “для удобства”.
- Починить только один live-path и забыть про `apply`, `cancel`, повторный `start*Crop()` и восстановление geometry после clamp.
- Изменить правило `Shift` только в одном месте.

## Перед правкой

- Сначала определяй, где живёт проблема: в session lifecycle, в geometry/clamp или в snapping.
- Если меняется поведение `CropFrame`, проверяй оба контракта:
  размер индикатора через `getObjectDisplaySize()` и snapping bounds через `getObjectSnappingBounds()`.
- Если меняется source-bound resize, сразу перечитывай:
  [`domain/crop-frame.ts`](./domain/crop-frame.ts),
  [`interaction/crop-controls.ts`](./interaction/crop-controls.ts),
  [`index.ts`](./index.ts).
