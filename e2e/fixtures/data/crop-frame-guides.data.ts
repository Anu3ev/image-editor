import type { CropControlKey } from '../../types'

export const BLOCKED_CROP_IMAGE_SIZE = {
  width: 160,
  height: 160
} as const

export const BLOCKED_CROP_REFERENCE_SHAPE_SIZE = {
  width: 60,
  height: 60
} as const

export const BLOCKED_CROP_DRAG_OFFSET = {
  deltaX: 24,
  deltaY: 0
} as const

export const BLOCKED_CROP_DRAG_SHAPE_POSITION = {
  left: 24,
  top: 20
} as const

export const BLOCKED_CROP_SCALE_CASES = [
  {
    // eslint-disable-next-line max-len
    title: 'не показывает направляющие при попытке растянуть полную crop-область из правого нижнего угла за пределы изображения',
    control: 'br',
    size: {
      width: 184,
      height: 184
    },
    shapePosition: {
      leftFrom: 'right',
      topFrom: 'bottom',
      left: 24,
      top: 24
    }
  },
  {
    title: 'не показывает направляющие при попытке растянуть полную crop-область вправо за пределы изображения',
    control: 'mr',
    size: {
      width: 184,
      height: 160
    },
    shapePosition: {
      leftFrom: 'right',
      topFrom: 'top',
      left: 24,
      top: 20
    }
  },
  {
    title: 'не показывает направляющие при попытке растянуть полную crop-область вниз за пределы изображения',
    control: 'mb',
    size: {
      width: 160,
      height: 184
    },
    shapePosition: {
      leftFrom: 'left',
      topFrom: 'bottom',
      left: 20,
      top: 24
    }
  }
] as const satisfies ReadonlyArray<{
  title: string
  control: CropControlKey
  size: {
    width: number
    height: number
  }
  shapePosition: {
    leftFrom: 'left' | 'right'
    topFrom: 'top' | 'bottom'
    left: number
    top: number
  }
}>
