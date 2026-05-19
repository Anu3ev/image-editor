export const attachToolbarMock = (editor: any) => {
  const toolbar = {
    hideTemporarily: jest.fn(),
    showAfterTemporary: jest.fn()
  }
  editor.toolbar = toolbar
  return toolbar
}
