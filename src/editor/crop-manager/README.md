# CropManager

`CropManager` управляет временным crop mode для монтажной области и изображения. Его главная задача не в том, чтобы хранить итоговый crop, а в том, чтобы безопасно провести live-сессию: создать `CropFrame`, ограничить его source-границами, отдать наружу текущее состояние и затем либо применить результат, либо отменить сессию.

## Что здесь считается source of truth

- Активная сессия живёт в `CropManager._session`. Это transient runtime-state: он не сериализуется, не попадает в history и не должен утекать в persisted model.
- Публичное состояние crop mode возвращает `getState()`. Итоговый прямоугольник считается не из сырой геометрии Fabric frame, а через `getCropSessionResultRect()`.
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
  `cropSourceScaleClamped`, `cropSourceBoundScale`, `cropSourceScalePreserveAspectRatio`.
- Эти поля существуют только внутри live resize-сессии.
  Их нельзя рассматривать как persisted state и нельзя переносить в доменную модель.
- `CropManager._handleCropFrameChanged()` сначала пытается восстановить geometry предыдущего source-bound step, потом делает clamp, потом при необходимости запоминает первое состояние на границе source.
  Это нужно для “удержания” frame на source-boundary после materialization Fabric.

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
