import type { ShapeAddParams, ShapePresetKey } from '../../types'

/** Базовые опции для e2e-сценариев добавления фигуры с сохранением пропорций. */
export const SHAPE_PRESERVE_ASPECT_BASE_OPTIONS: NonNullable<ShapeAddParams['options']> = {
  id: 'shape-preserve-aspect',
  width: 220,
  height: 320,
  preserveAspectRatio: true,
  text: 'TEST',
  textStyle: {
    fontSize: 72
  }
}

/** Короткий следующий ввод после добавления, который не должен схлопывать фигуру. */
export const SHAPE_PRESERVE_ASPECT_FOLLOW_UP_TEXT = 'TEST!'

/** Новый пресет для проверки replace-path после роста фигуры под текст. */
export const SHAPE_PRESERVE_ASPECT_REPLACEMENT_PRESET: ShapePresetKey = 'arrow-right'

/** Допуск для сравнений размеров после add/edit/replace-path. */
export const SHAPE_PRESERVE_ASPECT_TOLERANCE = 2
