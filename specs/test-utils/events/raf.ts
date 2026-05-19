export const mockRaf = () => {
  const originalRequest = window.requestAnimationFrame
  const originalCancel = window.cancelAnimationFrame
  const rafMock = jest.fn((cb: FrameRequestCallback) => {
    cb(0)
    return 1
  })
  const cancelMock = jest.fn()
  window.requestAnimationFrame = rafMock
  window.cancelAnimationFrame = cancelMock

  const restore = () => {
    window.requestAnimationFrame = originalRequest
    window.cancelAnimationFrame = originalCancel
  }

  return { rafMock, cancelMock, restore }
}
