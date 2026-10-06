import test from 'node:test'
import assert from 'node:assert/strict'
import { required, validateReport } from './validate-browser.mjs'
const report = () => ({ errors: [], suites: [{ specs: required.map(([file, title]) => ({ file, title, tests: [{ status: 'expected', expectedStatus: 'passed', results: [{ status: 'passed' }] }] })) }] })
test('complete mandatory browser evidence passes', () => assert.equal(validateReport(report()), required.length))
test('empty browser run fails', () => assert.throws(() => validateReport({ suites: [] }), /No browser tests/))
test('omitted mandatory scenario fails', () => { const value = report(); value.suites[0].specs.pop(); assert.throws(() => validateReport(value), /Missing mandatory/) })
for (const status of ['skipped', 'unexpected', 'flaky']) {
  test(`${status} browser outcome fails`, () => { const value = report(); value.suites[0].specs[0].tests[0].status = status; assert.throws(() => validateReport(value)) })
}
test('initial failure followed by passing retry fails', () => { const value = report(); value.suites[0].specs[0].tests[0].results.unshift({ status: 'failed' }); assert.throws(() => validateReport(value), /flaky/) })
test('expected failure cannot count as passing', () => { const value = report(); value.suites[0].specs[0].tests[0].expectedStatus = 'failed'; assert.throws(() => validateReport(value), /Expected failures/) })
