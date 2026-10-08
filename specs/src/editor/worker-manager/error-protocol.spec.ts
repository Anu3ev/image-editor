/* eslint-disable no-restricted-globals -- The worker entrypoint installs its handler on self. */
describe('Image worker error protocol', () => {
  it('returns an English message with the action and original error', async() => {
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
        error: 'Unknown action <custom-action>',
        cause: expect.objectContaining({ message: 'Unknown action <custom-action>' })
      })
    } finally {
      self.onmessage = previousHandler
      send.mockRestore()
    }
  })
})
