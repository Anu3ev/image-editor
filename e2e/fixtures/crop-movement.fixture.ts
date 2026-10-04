import { test as cropTest, expect } from './crop-scaling.fixture'
import type { CropImageSourceInfo, CropStateInfo, HistoryPosition } from '../types'

/** Подготовленная область crop и состояние изображения до входа в неё. */
interface CropMovementFixtures {
  cropMovement: {
    imageId: string
    frameId: string
    initial: CropStateInfo
    source: CropImageSourceInfo
    history: HistoryPosition
    serializedHistory: string
  }
}

/** Небольшая crop-область для перемещения; каждое действие выполняет сам тест. */
export const test = cropTest.extend<CropMovementFixtures>({
  cropMovement: async({ crop, cropScalingImage, history }, use) => {
    const imageId = cropScalingImage.id
    const source = await crop.getImageSourceInfo({ id: imageId })
    const historyPosition = await history.getPosition()
    const serializedHistory = await history.getSerializedStateText()
    const initial = await crop.startImageCrop({
      id: imageId, size: { width: 200, height: 150 }, allowFrameOverflow: false
    })
    const frameId = initial.frame.id
    expect(frameId).not.toBeNull()
    expect(initial.rect).toMatchObject({ width: 200, height: 150 })
    if (!frameId) throw new Error('Активная crop-область должна иметь id')

    await use({ imageId, frameId, initial, source, history: historyPosition, serializedHistory })
  }
})

export { expect }
