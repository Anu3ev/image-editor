/* eslint-disable no-use-before-define -- Подготовка Fabric-жеста расположена перед фабрикой transform. */
import { Canvas, Point, type CanvasEvents, type FabricObject, type Transform } from 'fabric'
import type { CropFrame } from '../../../src/editor/crop-manager/domain/crop-frame'

/** Перегрузка Fabric-подписки, которую доставляет тестовое окружение. */
interface CropCanvasSubscription {
  on<K extends keyof CanvasEvents>(name: K, listener: (event: CanvasEvents[K]) => void): VoidFunction
}

/** Подготавливает transform, события начала/удаления и наблюдаемые мутации crop. */
export function createCropGestureHarness({ frame, action }: { frame: CropFrame; action: 'scale' | 'drag' }) {
  const transform = createCropTransform({ frame, action })
  const originalHandler = transform.actionHandler
  const canvas = new Canvas(document.createElement('canvas'))
  const subscriptions: CropCanvasSubscription = canvas
  const on = jest.spyOn(subscriptions, 'on')
  const endTransform = jest.fn()
  canvas.endCurrentTransform = endTransform
  const set = jest.spyOn(frame, 'set')

  /** Доставляет начало жеста через настоящую подписку владельца. */
  const start = () => {
    const callback = on.mock.calls.find(([name]) => name === 'mouse:down')?.[1]
    if (!callback) throw new Error('Нет подписки начала crop-жеста')
    callback({
      transform,
      target: frame,
      e: new MouseEvent('mousedown'),
      scenePoint: new Point(transform.ex, transform.ey),
      viewportPoint: new Point(transform.ex, transform.ey)
    })
  }
  /** Доставляет удаление объекта через подписку владельца. */
  const remove = (target: FabricObject) => {
    const callback = on.mock.calls.find(([name]) => name === 'object:removed')?.[1]
    if (!callback) throw new Error('Нет подписки удаления crop')
    callback({ target })
  }

  return { canvas, transform, originalHandler, set, start, remove, endTransform }
}

/** Создаёт полный контракт верхней правой ручки или обычного перетаскивания Fabric. */
export function createCropTransform({ frame, action }: { frame: CropFrame; action: 'scale' | 'drag' }): Transform {
  const isScale = action === 'scale'
  const ex = isScale ? (frame.width * frame.scaleX) / 2 : 0
  const ey = isScale ? -(frame.height * frame.scaleY) / 2 : 0

  return {
    target: frame,
    action,
    actionHandler: jest.fn(() => true),
    corner: isScale ? 'tr' : '',
    scaleX: frame.scaleX,
    scaleY: frame.scaleY,
    skewX: 0,
    skewY: 0,
    offsetX: 0,
    offsetY: 0,
    originX: isScale ? 'left' : 'center',
    originY: isScale ? 'bottom' : 'center',
    ex,
    ey,
    lastX: ex,
    lastY: ey,
    theta: 0,
    width: frame.width,
    height: frame.height,
    shiftKey: false,
    altKey: false,
    original: {
      scaleX: frame.scaleX,
      scaleY: frame.scaleY,
      skewX: 0,
      skewY: 0,
      angle: 0,
      left: frame.left,
      top: frame.top,
      flipX: false,
      flipY: false,
      originX: frame.originX,
      originY: frame.originY
    },
    actionPerformed: false
  }
}
