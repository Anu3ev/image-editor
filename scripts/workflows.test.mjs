import test from 'node:test'
import assert from 'node:assert/strict'
import { runInNewContext } from 'node:vm'
import { readFile } from 'node:fs/promises'

const build = await readFile('.github/workflows/deploy-demo.yml', 'utf8')
const publish = await readFile('.github/workflows/publish-on-version-bump.yml', 'utf8')
const pkg = JSON.parse(await readFile('package.json', 'utf8'))

test('Контекст Node20 соответствует настоящему runtime', () => {
  assert.match(build, /name: 🔬 Test on Node\.js 20/)
  assert.match(build, /node-version: 20\.20\.2/)
  assert.doesNotMatch(build, /node-version: 24/)
})
test('Успешные проверки не подменяются разбором логов и выполняются один раз', () => {
  assert.equal((build.match(/npm run test:ci --/g) ?? []).length, 1)
  assert.doesNotMatch(build, /continue-on-error|createCommitStatus|test:coverage|statuses: write/)
  assert.match(build, /run: npm run typecheck/)
  assert.match(build, /run: npm run check:docs/)
})
test('Smoke содержит существующие файлы, full не ограничен grep', async() => {
  const files = pkg.scripts['test:e2e:smoke'].match(/e2e\/\S+\.spec\.ts/g)
  assert.equal(files.length, 6)
  for (const file of files) assert((await readFile(file, 'utf8')).length > 0)
  assert.match(build, /env\.BROWSER_SUITE == 'full'[\s\S]*?run: npm run test:e2e -- --project=chromium --workers=2/)
  assert.doesNotMatch(pkg.scripts['test:e2e'], /grep|sample-demo/)
})
test('Повтор deploy использует имя producer, а Publish скачивает неизменяемый ID', () => {
  assert.match(build, /artifact_name: \$\{\{ needs\.test\.outputs\.pages_artifact \}\}/)
  assert.equal((publish.match(/artifact-ids: \$\{\{ needs\.select\.outputs\.artifact_id \}\}/g) ?? []).length, 2)
  assert.doesNotMatch(publish, /github\.run_attempt|npm run build|npm ci/)
})
test('Публикация и запись release имеют разные минимальные разрешения', () => {
  const publication = publish.split('\n  publish:')[1].split('\n  record:')[0]
  const recording = publish.split('\n  record:')[1]
  assert.match(publication, /id-token: write/)
  assert.doesNotMatch(publication, /contents: write/)
  assert.match(recording, /contents: write/)
  assert.doesNotMatch(recording, /id-token: write/)
  assert.equal(pkg.scripts.prebuild, undefined)
})

test('Повтор старого deploy не заменяет Pages после нового master', async() => {
  const script = build.match(/ {10}script: \|\n((?: {12}.*\n)+)/)[1]
  const outputs = []
  const core = { setOutput: (name, value) => outputs.push([name, value]), notice: () => {} }
  const context = { repo: { owner: 'Anu3ev', repo: 'image-editor' }, sha: 'old-sha' }
  const github = { rest: { repos: { getBranch: async() => ({ data: { commit: { sha: 'new-sha' } } }) } } }
  await runInNewContext(`(async() => { ${script} })()`, { github, context, core })
  assert.deepEqual(outputs, [['current', 'false']])
  assert.match(build, /if: steps\.master\.outputs\.current == 'true'/)
  context.sha = 'new-sha'
  outputs.length = 0
  await runInNewContext(`(async() => { ${script} })()`, { github, context, core })
  assert.deepEqual(outputs, [['current', 'true']])
})

test('Проверка установленного пакета использует один tarball до загрузки артефактов', () => {
  const pack = build.indexOf('run: node scripts/build-artifact.mjs pack')
  const gate = build.indexOf('run: node scripts/build-artifact.mjs check-package')
  assert(pack > build.indexOf('run: npx playwright install --with-deps chromium'))
  assert(gate > pack)
  assert(gate < build.indexOf('name: Upload validated package'))
  assert(gate < build.indexOf('name: Upload validated Pages build'))
  assert.equal((build.match(/run: node scripts\/build-artifact\.mjs pack/g) ?? []).length, 1)
  assert.doesNotMatch(build, /continue-on-error/)
})
