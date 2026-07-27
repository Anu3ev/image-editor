import type {
  ShapeGroupLike,
  ShapeTextNode
} from '../types'

/** Версия persisted-подписи входов shape layout. */
const SHAPE_LAYOUT_SIGNATURE_VERSION = 'v1'

/** Модули двух независимых компактных хешей layout-подписи. */
const SHAPE_LAYOUT_SIGNATURE_PRIMARY_MODULUS = 4294967291
const SHAPE_LAYOUT_SIGNATURE_SECONDARY_MODULUS = 4294967279

/**
 * Сериализует только те persisted-входы, изменение которых требует повторного text layout.
 */
function serializeShapeLayoutInputs({
  group,
  text
}: {
  group: ShapeGroupLike
  text: ShapeTextNode
}): string {
  return JSON.stringify([
    text.textCaseRaw,
    text.text,
    text.uppercase,
    text.fontFamily,
    text.fontSize,
    text.fontWeight,
    text.fontStyle,
    text.lineHeight,
    text.charSpacing,
    text.stroke,
    text.strokeWidth,
    text.styles,
    text.lineFontDefaults,
    group.shapePresetKey,
    group.shapeTextAutoExpand,
    group.shapePaddingTop,
    group.shapePaddingRight,
    group.shapePaddingBottom,
    group.shapePaddingLeft,
    group.shapeStrokeWidth,
    group.shapeRounding
  ])
}

/**
 * Возвращает компактный стабильный хеш сериализованных layout-входов.
 */
function hashShapeLayoutInputs({ source }: { source: string }): string {
  let primaryHash = 17
  let secondaryHash = 23

  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index)

    primaryHash = ((primaryHash * 31) + code) % SHAPE_LAYOUT_SIGNATURE_PRIMARY_MODULUS
    secondaryHash = ((secondaryHash * 131) + code) % SHAPE_LAYOUT_SIGNATURE_SECONDARY_MODULUS
  }

  return [
    SHAPE_LAYOUT_SIGNATURE_VERSION,
    source.length.toString(36),
    primaryHash.toString(36),
    secondaryHash.toString(36)
  ].join(':')
}

/**
 * Возвращает persisted-подпись content/layout-входов текущей shape-группы.
 */
export function resolveShapeLayoutSignature({
  group,
  text
}: {
  group: ShapeGroupLike
  text: ShapeTextNode
}): string {
  const source = serializeShapeLayoutInputs({
    group,
    text
  })

  return hashShapeLayoutInputs({ source })
}

/**
 * Проверяет, менялись ли persisted layout-входы после последнего полного расчёта.
 * Legacy-группа без подписи считается уже materialized и сохраняет свои visual bounds.
 */
export function hasShapeLayoutInputsChanged({
  group,
  text
}: {
  group: ShapeGroupLike
  text: ShapeTextNode
}): boolean {
  if (group.shapeLayoutSignature === undefined) return false

  return group.shapeLayoutSignature !== resolveShapeLayoutSignature({
    group,
    text
  })
}
