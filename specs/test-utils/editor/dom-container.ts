export const createMockContainer = (width = 800, height = 600): HTMLElement => {
  const container = document.createElement('div')
  Object.defineProperty(container, 'clientWidth', { value: width, writable: true })
  Object.defineProperty(container, 'clientHeight', { value: height, writable: true })
  return container
}
