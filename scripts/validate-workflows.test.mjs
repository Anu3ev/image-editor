import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { PACKAGE_NAME, validateArtifact, validateManifest } from './validate-artifact.mjs'
import { REQUIRED_JOBS, assertBuildIdentity, assertRequiredJobs, validateEvidence } from './validate-gate.mjs'
import { REPOSITORY, checkRegistryVersion, githubClient, inspectTag, publishVerifiedPackage, readRegistryVersion, recordRelease } from './release-package.mjs'
import { assertCurrentMaster, validateSourceRun, verifyLiveIdentity } from './validate-pages.mjs'

const sha = 'a'.repeat(40)
const manifest = {
  name: PACKAGE_NAME, version: '0.11.1', sha, filename: 'fabric-image-editor-0.11.1.tgz',
  sha256: 'b'.repeat(64), integrity: `sha512-${Buffer.alloc(64).toString('base64')}`
}
const allSuccess = () => Object.fromEntries(REQUIRED_JOBS.map(name => [name, { result: 'success' }]))
const evidence = () => ({
  schemaVersion: 1,
  sha,
  browserMode: 'full',
  buildId: '123-1',
  requiredResults: Object.fromEntries(REQUIRED_JOBS.map(name => [name, 'success'])),
  package: { ...manifest }
})
const remote = () => ({ name: PACKAGE_NAME, version: manifest.version, dist: { integrity: manifest.integrity } })
const sourceRun = () => ({
  repository: { full_name: REPOSITORY },
  head_repository: { full_name: REPOSITORY },
  path: '.github/workflows/test.yml',
  event: 'push',
  head_branch: 'master',
  conclusion: 'success',
  status: 'completed',
  head_sha: sha,
  id: 123,
  run_attempt: 1
})

test('Проверка проходит только после успеха всех обязательных задач', () => {
  assert.equal(Object.keys(assertRequiredJobs(allSuccess())).length, REQUIRED_JOBS.length)
})
for (const name of REQUIRED_JOBS) {
  for (const result of ['failure', 'cancelled', 'skipped', 'pending', undefined]) {
    test(`Проверка отклоняет результат ${String(result)} обязательной задачи ${name}`, () => {
      const needs = allSuccess()
      if (result === undefined) delete needs[name]
      else needs[name].result = result
      assert.throws(() => assertRequiredJobs(needs), /Mandatory job/)
    })
  }
}
test('Успех посторонней задачи не заменяет отсутствующую обязательную задачу', () => {
  const needs = allSuccess()
  delete needs.package
  needs['other-build'] = { result: 'success' }
  assert.throws(() => assertRequiredJobs(needs), /package/)
})
test('Подтверждение релиза отклоняет другой SHA, хеш пакета и неполный прогон Chromium', () => {
  assert.throws(() => validateEvidence({ evidence: evidence(), manifest, expectedSha: 'c'.repeat(40), full: true }), /SHA/)
  assert.throws(() => validateEvidence({ evidence: { ...evidence(), package: { ...manifest, sha256: 'f'.repeat(64) } }, manifest, expectedSha: sha }), /sha256/)
  assert.throws(() => validateEvidence({ evidence: { ...evidence(), browserMode: 'smoke' }, manifest, expectedSha: sha, full: true }), /full Chromium/)
  assert.doesNotThrow(() => validateEvidence({ evidence: evidence(), manifest, expectedSha: sha, full: true }))
})
test('Манифест отклоняет некорректную версию и выход пути за каталог', () => {
  for (const version of ['1.2', '01.2.3', '1.2.3-01', 'v1.2.3', '1.2.3; rm -rf /']) {
    assert.throws(() => validateManifest({ manifest: { ...manifest, version }, expectedSha: sha }), /semantic version/)
  }
  assert.throws(() => validateManifest({ manifest: { ...manifest, filename: '../package.tgz' }, expectedSha: sha }), /basename/)
})
test('Артефакт проверяется по байтам архива и данным вложенного пакета', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'image-editor-artifact-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const input = path.join(directory, 'input')
  await mkdir(path.join(input, 'package'), { recursive: true })
  await writeFile(path.join(input, 'package/package.json'), JSON.stringify({ name: PACKAGE_NAME, version: manifest.version }))
  const tarball = path.join(directory, manifest.filename)
  execFileSync('tar', ['-czf', tarball, '-C', input, 'package'])
  const bytes = await readFile(tarball)
  const actual = { ...manifest, sha256: createHash('sha256').update(bytes).digest('hex'), integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}` }
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(actual))
  assert.deepEqual(await validateArtifact({ directory, expectedSha: sha }), actual)
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ ...actual, version: '0.11.2' }))
  await assert.rejects(validateArtifact({ directory, expectedSha: sha }), /inside the tarball/)
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(actual))
  await writeFile(tarball, Buffer.concat([bytes, Buffer.from('tampered')]))
  await assert.rejects(validateArtifact({ directory, expectedSha: sha }), /bytes differ/)
})
test('Опубликованная версия с другими байтами останавливает публикацию', () => {
  assert.equal(checkRegistryVersion({ remote: null, manifest }), false)
  assert.equal(checkRegistryVersion({ remote: remote(), manifest }), true)
  assert.throws(() => checkRegistryVersion({ remote: { ...remote(), dist: { integrity: 'different' } }, manifest }), /different identity or bytes/)
})
test('Совпадающая опубликованная версия подтверждается без повторной публикации', async () => {
  let calls = 0
  const outcome = await publishVerifiedPackage({
    manifest,
    lookup: async () => remote(),
    publish: async () => { calls += 1 },
    wait: async () => {}
  })
  assert.equal(calls, 0)
  assert.equal(outcome.publishedNow, false)
})
test('После неоднозначной ошибки публикации проверяется реестр без повторной отправки', async () => {
  let lookups = 0
  let publishes = 0
  const outcome = await publishVerifiedPackage({
    manifest,
    lookup: async () => (++lookups < 3 ? null : remote()),
    publish: async () => {
      publishes += 1
      return 1
    },
    wait: async () => {}
  })
  assert.equal(publishes, 1)
  assert.equal(outcome.publishExitCode, 1)
})
test('Неподтверждённая публикация завершается ошибкой без повторной отправки', async () => {
  let publishes = 0
  await assert.rejects(publishVerifiedPackage({
    manifest,
    lookup: async () => null,
    publish: async () => {
      publishes += 1
      return 1
    },
    wait: async () => {},
    attempts: 2
  }), /no automatic retry/)
  assert.equal(publishes, 1)
})
test('Ошибка реестра не считается отсутствием пакета', async () => {
  await assert.rejects(readRegistryVersion({ manifest, fetcher: async () => ({ ok: false, status: 503 }) }), /503/)
})
test('GitHub-клиент отправляет чтение и JSON-запись с заданными параметрами', async () => {
  const requests = []
  const api = githubClient({
    token: 'test-token',
    fetcher: async (url, options) => {
      requests.push({ url, options })
      return { ok: true, json: async () => ({ id: 123 }) }
    }
  })
  assert.deepEqual(await api({ route: '/git/ref/tags/v0.11.1' }), { id: 123 })
  const body = { ref: 'refs/tags/v0.11.1', sha }
  await api({ route: '/git/refs', method: 'POST', body })
  assert.equal(requests[0].url, `https://api.github.com/repos/${REPOSITORY}/git/ref/tags/v0.11.1`)
  assert.equal(requests[0].options.method, 'GET')
  assert.equal(requests[0].options.body, undefined)
  assert.equal(requests[1].options.method, 'POST')
  assert.equal(requests[1].options.headers.authorization, 'Bearer test-token')
  assert.equal(requests[1].options.headers['content-type'], 'application/json')
  assert.deepEqual(JSON.parse(requests[1].options.body), body)
})
test('GitHub-клиент допускает отсутствие ресурса только по явному разрешению', async () => {
  const api = githubClient({
    token: 'test-token',
    fetcher: async () => ({ ok: false, status: 404 })
  })
  assert.equal(await api({ route: '/releases/tags/v0.11.1', allowMissing: true }), null)
  await assert.rejects(api({ route: '/releases/tags/v0.11.1' }), /failed \(404\)/)
})
test('Существующий тег другого коммита не заменяется', async () => {
  await assert.rejects(inspectTag({ manifest, api: async () => ({ object: { type: 'commit', sha: 'b'.repeat(40) } }) }), /does not point/)
})
test('Аннотированный тег проверяется по конечному коммиту', async () => {
  const calls = []
  await inspectTag({
    manifest,
    api: async ({ route }) => {
      calls.push(route)
      return { object: route.startsWith('/git/ref/') ? { type: 'tag', sha: 'b'.repeat(40) } : { type: 'commit', sha } }
    }
  })
  assert.equal(calls.length, 2)
})
test('Тег создаётся перед релизом без удаления существующих данных', async () => {
  let tagExists = false
  const writes = []
  const api = async ({ route, method }) => {
    if (method === 'POST') {
      writes.push(route)
      if (route === '/git/refs') tagExists = true
      return { html_url: 'https://github.com/Anu3ev/image-editor/releases/tag/v0.11.1' }
    }
    if (route.startsWith('/git/ref/')) return tagExists ? { object: { type: 'commit', sha } } : null
    if (route.startsWith('/releases/tags/')) return null
    throw new Error(`Unexpected operation: ${route}`)
  }
  await recordRelease({ manifest, api, validationUrl: 'https://github.com/Anu3ev/image-editor/actions/runs/123' })
  assert.deepEqual(writes, ['/git/refs', '/releases'])
})
test('Pages отклоняет посторонние, неуспешные прогоны и прогоны вне master', () => {
  for (const patch of [{ event: 'pull_request' }, { conclusion: 'failure' }, { head_branch: 'feature' }, { path: '.github/workflows/playwright.yml' }, { head_repository: { full_name: 'someone/fork' } }]) {
    assert.throws(() => validateSourceRun({ ...sourceRun(), ...patch }), /trusted repository/)
  }
  assert.deepEqual(validateSourceRun(sourceRun()), { sha, runId: '123', buildId: '123-1' })
})
test('Устаревший прогон не может заменить развёртывание текущего master', () => {
  assert.throws(() => assertCurrentMaster({ expectedSha: sha, actualSha: 'b'.repeat(40) }), /Stale Pages candidate/)
  assert.doesNotThrow(() => assertCurrentMaster({ expectedSha: sha, actualSha: sha }))
})
test('Pages требует совпадения версии, полного SHA и идентификатора сборки', () => {
  const identity = { version: manifest.version, sha, buildId: '123-1' }
  for (const patch of [{ version: '0.10.0' }, { sha: 'b'.repeat(40) }, { buildId: '122-1' }]) {
    assert.throws(() => assertBuildIdentity({ identity: { ...identity, ...patch }, expectedSha: sha, expectedBuildId: '123-1', expectedVersion: manifest.version }), /build identity/)
  }
})
test('Проверка Pages ждёт обновления CDN и отклоняет устойчивое несовпадение сборки', async () => {
  const good = { sha, version: manifest.version, buildId: '123-1' }
  let requests = 0
  await verifyLiveIdentity({
    url: 'https://anu3ev.github.io/image-editor/',
    evidence: evidence(),
    fetcher: async url => {
      assert.equal(url.pathname, '/image-editor/build-info.json')
      return { ok: true, json: async () => (++requests === 1 ? { ...good, sha: 'b'.repeat(40) } : good) }
    },
    wait: async () => {},
    attempts: 2
  })
  assert.equal(requests, 2)
  await assert.rejects(verifyLiveIdentity({
    url: 'https://anu3ev.github.io/image-editor/',
    evidence: evidence(),
    fetcher: async () => ({ ok: true, json: async () => ({ ...good, buildId: '122-1' }) }),
    wait: async () => {},
    attempts: 1
  }), /could not be verified/)
})

test('Схема проверок блокирует неполный результат, ограничивает права и проверяет все пути', async () => {
  // js-yaml is already part of the locked Jest/ESLint development toolchain.
  const { load } = createRequire(import.meta.url)('js-yaml')
  const loadWorkflow = async name => load(await readFile(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8'))
  const validation = await loadWorkflow('validate')
  assert.deepEqual(validation.jobs.gate.needs, REQUIRED_JOBS)
  assert.equal(validation.jobs.gate.if, 'always()')
  assert.deepEqual(validation.permissions, { contents: 'read' })
  for (const name of REQUIRED_JOBS) assert.ok(validation.jobs[name], `Missing job ${name}`)
  for (const job of Object.values(validation.jobs)) {
    for (const step of job.steps ?? []) assert.equal(step['continue-on-error'], undefined)
  }
  const tests = await loadWorkflow('test')
  assert.deepEqual(tests.on.push.branches, ['**'])
  assert.equal(tests.on.push.paths, undefined)
  assert.equal(tests.on.pull_request, null)
  const release = await loadWorkflow('publish-on-version-bump')
  assert.deepEqual(Object.keys(release.on), ['workflow_dispatch'])
  assert.equal(release.jobs.validation.with['browser-mode'], 'full')
  assert.equal(release.jobs.publish.permissions['id-token'], 'write')
  assert.equal(release.jobs['record-release'].permissions['id-token'], undefined)
  const pages = await loadWorkflow('deploy-demo')
  assert.deepEqual(pages.on.workflow_run.workflows, ['Validate'])
  assert.equal(pages.concurrency['cancel-in-progress'], false)
  assert.deepEqual(pages.jobs.deploy.needs, ['select', 'prepare'])
})
