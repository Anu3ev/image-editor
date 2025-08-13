// Мок для jsondiffpatch
export const create = jest.fn(() => ({
  diff: jest.fn(),
  patch: jest.fn(),
  unpatch: jest.fn(),
  clone: jest.fn()
}))

export default { create }
