import type { TranslationKey } from '../i18n'

/** Keys that the built-in worker may send to the main thread. */
export const workerErrorKeys = [
  'worker.errors.offscreenContextUnavailable',
  'worker.errors.imageDataUrlReadFailed',
  'worker.errors.imageBlobReadFailed',
  'worker.errors.imageBlobReadAborted',
  'worker.errors.unknownAction'
] as const satisfies readonly TranslationKey[]

/** Built-in worker failures cross the worker boundary without choosing a language. */
export class WorkerOperationError extends Error {
  constructor(
    public readonly key: typeof workerErrorKeys[number],
    public readonly params?: Record<string, unknown>
  ) {
    super(key)
  }
}
