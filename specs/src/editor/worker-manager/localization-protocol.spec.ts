/* eslint-disable no-restricted-globals -- The worker entrypoint installs its handler on self. */
describe('Image worker localization protocol', () => {
  it('returns a key and interpolation data without selecting a language', async() => {
    const previousHandler = self.onmessage
    const send = jest.spyOn(self, 'postMessage').mockImplementation(() => {})
    try {
      jest.isolateModules(() => {
        jest.requireActual('../../../../src/editor/worker-manager/worker')
      })
      await self.onmessage?.call(self, new MessageEvent('message', {
        data: { action: '<custom-action>', requestId: 'test-request', payload: {} }
      }))
      expect(send).toHaveBeenCalledWith({
        requestId: 'test-request',
        action: '<custom-action>',
        success: false,
        error: 'worker.errors.unknownAction',
        errorKey: 'worker.errors.unknownAction',
        errorParams: { action: '<custom-action>' }
      })
    } finally {
      self.onmessage = previousHandler
      send.mockRestore()
    }
  })
})
