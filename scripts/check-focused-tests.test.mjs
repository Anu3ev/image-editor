import test from 'node:test'
import assert from 'node:assert/strict'
import { focusedTests } from './check-focused-tests.mjs'

for (const source of [
  "it.only('x', () => {})",
  "test.only.each([1])('x', () => {})",
  "describe.only('x', () => {})",
  "fit('x', () => {})",
  "fdescribe.each([1])('x', () => {})",
  "test['only']('x', () => {})",
  "test.describe.only('x', () => {})",
  "test.only.each`a | b`('x', () => {})",
  "import { test as scenario } from '@playwright/test'; scenario.only('x', () => {})",
  "import { fit as focused } from '@jest/globals'; focused('x', () => {})"
]) {
  test(`Отклонён сфокусированный вызов: ${source}`, () => assert(focusedTests(source).length > 0))
}
for (const source of [
  "// test.only('x')\nconst value = 'fit()'; test('ok', () => {})",
  'const fit = true; const options = { fit, fdescribe: false }',
  'image.fit(); image.only(); image.fdescribe()',
  'function fitToCanvas(fit) { return fit }',
  'const settings = { only: true }; const fdescribe = false',
  "test.each([1])('ok', () => {}); describe('normal', () => {})"
]) {
  test(`Разрешены обычные имена и несфокусированные тесты: ${source}`, () => assert.deepEqual(focusedTests(source), []))
}
test('Номера строк указывают на реальные вызовы', () => {
  assert.deepEqual(focusedTests("const fit = true\n\nit.only('x', () => {})\nfdescribe('y', () => {})"), [3, 4])
})
