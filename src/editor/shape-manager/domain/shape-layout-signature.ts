import type {
  ShapeGroupLike,
  ShapeTextNode
} from '../types'

/** Version of the persisted shape-layout input signature. */
const SHAPE_LAYOUT_SIGNATURE_VERSION = 'v1'

/** Moduli of two independent compact layout-signature hashes. */
const SHAPE_LAYOUT_SIGNATURE_PRIMARY_MODULUS = 4294967291
const SHAPE_LAYOUT_SIGNATURE_SECONDARY_MODULUS = 4294967279

/**
 * Serializes only the persisted inputs whose changes require text layout to run again.
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
 * Returns a compact, stable hash of the serialized layout inputs.
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
 * Returns the persisted signature of the current shape group's content/layout inputs.
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
 * Checks whether persisted layout inputs have changed since the last full calculation.
 * A legacy group without a signature is considered already materialized and retains its visual bounds.
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
