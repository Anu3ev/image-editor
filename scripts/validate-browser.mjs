import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Keep named mandatory scenarios explicit so an empty grep, renamed test or skip
// cannot accidentally authorize a package release.
export const required = [
  ['sample-demo.spec.ts', 'изменённый образец сохраняется в PNG после кадрирования, отмены и повтора'],
  ['editor.spec.ts', 'canvas создан и доступен'],
  ['text-manager/text-editing.spec.ts', 'после undo и redo восстановленный из шаблона текст не сдвигается при следующем увеличении отступа после скейлинга по диагонали'],
  ['crop-manager/crop-move-lifecycle.spec.ts', 'при отмене переноса за границу изображения не сохраняет crop и ложные направляющие'],
  ['crop-manager/crop-move-lifecycle.spec.ts', 'при применении переноса к границе изображения сохраняет один шаг и восстанавливает undo/redo'],
  ['crop-manager/crop-move-lifecycle.spec.ts', 'после отмены указателя crop сохраняет положение и начинает новое перемещение без прежнего удержания'],
  ['crop-manager/crop-resize-lifecycle.spec.ts', 'не сдвигает пропорциональный crop после прилипания к середине изображения и сохраняет undo/redo'],
  ['snapping-manager/selection/scaling-mixed-roundtrip.spec.ts', 'после скейлинга шаблон сохраняет геометрию изображения, шейпа и отдельного текста'],
  ['template-manager/index.spec.ts', 'после undo и redo готовый шаблон возвращается на те же места']
]

function collect(suites) {
  return suites.flatMap(suite => [...(suite.specs ?? []), ...collect(suite.suites ?? [])])
}
export function validateReport(report) {
  assert.equal(report.errors?.length ?? 0, 0, 'Playwright reported global errors')
  const specs = collect(report.suites ?? [])
  assert(specs.length > 0, 'No browser tests executed')
  for (const [file, title] of required) {
    assert(specs.some(spec => spec.file.replaceAll('\\', '/').endsWith(file) && spec.title === title), `Missing mandatory browser scenario: ${file}: ${title}`)
  }
  for (const spec of specs) {
    assert(spec.tests?.length > 0, `Scenario has no test result: ${spec.title}`)
    for (const test of spec.tests) {
      assert.equal(test.status, 'expected', `Unexpected/flaky/skipped result: ${spec.title}`)
      assert.equal(test.expectedStatus, 'passed', `Expected failures cannot satisfy quality: ${spec.title}`)
      assert(test.results?.length > 0, `No execution recorded: ${spec.title}`)
      assert(test.results.every(result => result.status === 'passed'), `Failed, flaky or skipped execution: ${spec.title}`)
    }
  }
  return specs.length
}
async function main() {
  const mode = process.argv[2]
  assert(['smoke', 'full'].includes(mode), 'Choose smoke or full')
  await mkdir('test-results', { recursive: true })
  const report = path.resolve('test-results/results.json')
  await rm(report, { force: true })
  const files = mode === 'smoke' ? [...new Set(required.map(([file]) => `e2e/tests/${file}`))] : []
  const run = spawnSync('npx', ['--no-install', 'playwright', 'test', '--workers=2', ...files], {
    stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: report }
  })
  if (run.error) throw run.error
  assert.equal(run.status, 0, 'Browser command failed')
  const count = validateReport(JSON.parse(await readFile(report, 'utf8')))
  console.log(`Validated ${count} browser scenarios (${mode}), with no skips or flakes`)
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main()
