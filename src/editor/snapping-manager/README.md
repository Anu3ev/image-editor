# SnappingManager

`SnappingManager` отвечает за live snap во время перемещения и scale. Для crop-сценариев важно помнить, что он работает сразу в двух плоскостях: scene-пиксели для направляющих и bounds, и source-пиксели для display-size crop frame.

## Как разделена ответственность

- [`scaling.ts`](./scaling.ts) решает, к каким guide можно приклеиться на текущем live-step, и должен ли scale быть uniform.
- [`pixel-grid.ts`](./pixel-grid.ts) запускается после snap и квантует scale так, чтобы итоговый display-size был пиксельным и уже приклеенный edge не перелетел через guide.
- [`index.ts`](./index.ts) оркестрирует общий flow и вызывает pixel-step только там, где это входит в контракт target.

## Ключевые контракты

- `snapGuards` описывают уже приклеенный active edge.
  Для отладки важно смотреть не на направление курсора, а на то, какая грань реально удерживается guide.
- В movement flow `pixel-grid` может округлять координаты до `MOVE_SNAP_STEP`, но только пока эта ось не приклеена к guide.
  После `calculateSnap()` guide-координата считается более сильным контрактом: финальное округление не должно сдвигать уже snapped edge.
- Для обычных объектов bounds и display-size живут в одной scene-плоскости.
  Для crop frame это не так: `getObjectSnappingBounds()` остаётся в scene-пикселях, а `getObjectDisplaySize()` может жить в source-пикселях через `cropSourceScaleX/Y`.
- `shouldUseUniformScaleSnap()` для crop frame обязан зеркалить правило `preserveAspectRatio` из `CropManager`, включая инверсию по `Shift`.
- Pixel rounding не должен менять нецелевую ось и не должен переносить snapped edge за его guide.

## Source-scaled crop frame

- Если active snap axis использует `getObjectDisplaySize()` в source-пикселях, `pixel-grid` не может обращаться с ним как с обычным scene-size.
- Для внутренних guide у source-scaled crop frame приоритет у inside-candidate.
  Это удерживает geometry “внутри” guide, а display-size сравнивает с округлённой source-частью guide.
  Для нечётного source половина `667 / 2` показывается как `334`, потому что indicator округляет source display-size до ближайшего пикселя.
- Но `inside-candidate` не должен быть просто первым ближайшим к raw pointer scale.
  Если `on-guide` уже даёт целый source display-size и не превышает source-часть по внутреннюю сторону guide, нужно оставить `on-guide`; иначе микродвижение внутри snap-порога может съесть лишний пиксель.
- Если uniform scale начался уже около внутреннего guide, исходный scale из Fabric transform считается удерживаемым кандидатом.
  Raw scale текущего pointer-step может уже быть чуть меньше из-за guide/ratio пересчёта, поэтому его нельзя автоматически принимать как новый размер.
- Для внешней границы source правило другое: приоритет у on-guide candidate.
  Иначе snap на границе source съедает 1 пиксель и индикатор показывает `666` вместо `667`.
- Одних `round/floor/ceil` для display-size недостаточно.
  В guarded rounding нужно рассматривать и соседние пиксельные размеры, иначе корректный кандидат около guide может вообще не попасть в перебор.
- Если snap scale-plan для active crop frame выходит за source, `SnappingManager` не должен отключать guides или применять generic scale как для обычного объекта.
  Он отдаёт plan в `CropManager.applyFrameSourceBoundScalePlan()`, а после generic snap/pixel-grid вызывает `restoreFrameScaleAnchorAfterSnap()`.
  Так crop остаётся внутри source, а противоположный угол не участвует в resize.
- `applyFrameSourceBoundScalePlan()` применяет **пропорциональный** source-bound limit. Поэтому его нужно вызывать только при uniform/proportional scale snap (`shouldUseUniformScaleSnap === true`).
  Для свободного (free) resize за ограничение отвечает per-axis clamp в `crop-controls.ts`, а финальная подгонка происходит в `CropManager._clampFrameIfNeeded()`.

## Что здесь легко сломать

- Сравнить source-size с scene-guide без явного преобразования.
- Привязать логику к направлению pointer вместо active edge из `snapGuards`.
- Округлить `left/top` после guide snap и тем самым получить fixed edge на `499`, хотя guide стоит на `500`.
- Починить boundary-case и случайно сломать middle-guide-case, или наоборот.
- Убрать source-bound bridge к `CropManager` и получить борьбу между source-границей и внутренними guide во время live resize.
- Считать, что green e2e уже доказал корневой контракт.
  Для source-scaled rounding надёжнее держать отдельный unit-regression на уровне `pixel-grid`.

## Перед правкой

- Сначала фиксируй, где именно баг:
  в поиске guide, в выборе uniform snap, в guarded pixel rounding или в browser-side interaction protocol.
- Если правка касается crop frame, сразу перечитывай:
  [`scaling.ts`](./scaling.ts),
  [`pixel-grid.ts`](./pixel-grid.ts),
  [`../crop-manager/domain/crop-frame.ts`](../crop-manager/domain/crop-frame.ts).
- Для регрессий вокруг source boundary опирайся на unit-контракты в:
  [`../../../specs/src/editor/snapping-manager/scaling.spec.ts`](../../../specs/src/editor/snapping-manager/scaling.spec.ts),
  [`../../../specs/src/editor/snapping-manager/pixel-grid.spec.ts`](../../../specs/src/editor/snapping-manager/pixel-grid.spec.ts).
