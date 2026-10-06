import test from 'node:test'
import assert from 'node:assert/strict'
import { focusedTests } from './check-focused-tests.mjs'
for (const source of ["it.only('x', () => {})", "test.only.each([1])('x', () => {})", "describe.only('x', () => {})", "fit('x', () => {})", "fdescribe.each([1])('x', () => {})", "test['only']('x', () => {})"]) {
  test(`reject focused test: ${source}`, () => assert(focusedTests(source).length > 0))
}
test('normal tests and inert strings/comments are allowed', () => assert.deepEqual(focusedTests("// test.only('no')\nconst text = 'fit()'; test('ok', () => {})"), []))
