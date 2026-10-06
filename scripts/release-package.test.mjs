import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { REPOSITORY, validateArtifact, validateManifest } from './build-artifact.mjs'
import { fixtureManifest, writeArtifact } from './test-support/artifact.mjs'
import {
  checkRegistryVersion, inspectTag, publishVerifiedPackage, readRegistryVersion, recordRelease, selectBuildArtifact
} from './release-package.mjs'

const manifest = fixtureManifest
const { sha, source } = manifest
const remote = { name: manifest.name, version: manifest.version, dist: { integrity: manifest.integrity } }
const run = {
  id: 100,
  run_attempt: 2,
  path: '.github/workflows/deploy-demo.yml',
  event: 'push',
  head_branch: 'master',
  head_sha: sha,
  conclusion: 'success',
  repository: { full_name: REPOSITORY },
  head_repository: { full_name: REPOSITORY }
}
const artifact = { id: 701, name: 'package-100-1', expired: false, workflow_run: { id: 100, head_sha: sha } }

test('Повтор только упавшего задания использует артефакт успешного первого запуска', () => {
  assert.deepEqual(selectBuildArtifact({ run, artifacts: [artifact] }), {
    artifact_id: 701, producer_attempt: 1, sha, run_id: 100
  })
  assert.equal(validateManifest({ manifest, expectedSha: sha, runId: 100, producerAttempt: 1 }), manifest)
})
test('Полный повтор выбирает новый неизменяемый артефакт', () => {
  const selected = selectBuildArtifact({
    run, artifacts: [artifact, { ...artifact, id: 702, name: 'package-100-2' }]
  })
  assert.equal(selected.artifact_id, 702)
})
for (const patch of [
  { event: 'pull_request' }, { event: 'workflow_dispatch' }, { head_branch: 'feature' },
  { conclusion: 'failure' }, { path: '.github/workflows/other.yml' },
  { repository: { full_name: 'foreign/repo' } }, { head_repository: { full_name: 'foreign/fork' } }
]) {
  test(`Чужой или недостаточно проверенный запуск отклонён: ${JSON.stringify(patch)}`, () => {
    assert.throws(() => selectBuildArtifact({ run: { ...run, ...patch }, artifacts: [artifact] }))
  })
}
for (const patch of [
  { expired: true }, { name: 'package-101-1' }, { name: 'package-100-3' },
  { workflow_run: { id: 100, head_sha: 'd'.repeat(40) } }, { workflow_run: { id: 99, head_sha: sha } }
]) {
  test(`Неверное происхождение артефакта отклонено: ${JSON.stringify(patch)}`, () => {
    assert.throws(() => selectBuildArtifact({ run, artifacts: [{ ...artifact, ...patch }] }))
  })
}
test('Два артефакта одного producer attempt не выбираются наугад', () => {
  assert.throws(() => selectBuildArtifact({ run, artifacts: [artifact, { ...artifact, id: 702 }] }), /Ambiguous/)
})
for (const patch of [
  { filename: '../bad.tgz' }, { sha: 'e'.repeat(40) }, { name: '@other/package' },
  { source: { ...source, browserSuite: 'smoke' } }, { source: { ...source, event: 'pull_request' } },
  { source: { ...source, attempt: 2 } }, { source: { ...source, runId: '101' } }
]) {
  test(`Неподходящий manifest отклонён: ${JSON.stringify(patch)}`, () => {
    assert.throws(() => validateManifest({
      manifest: { ...manifest, ...patch }, expectedSha: sha, runId: 100, producerAttempt: 1
    }))
  })
}

test('Проверены содержимое tarball, идентичность manifest и порча байтов', async() => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'editor-artifact-test-'))
  try {
    await writeArtifact(directory)
    const tarball = path.join(directory, manifest.filename)
    const bytes = await readFile(tarball)
    assert.equal((await validateArtifact({ directory, expectedSha: sha })).version, manifest.version)
    await writeFile(tarball, Buffer.concat([bytes, Buffer.from('changed')]))
    await assert.rejects(validateArtifact({ directory, expectedSha: sha }), /SHA-256 changed/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('Повтор после успешной публикации не вызывает npm publish', async() => {
  let calls = 0
  const publishedNow = await publishVerifiedPackage({
    manifest, currentSha: sha, lookup: async() => remote, publish: async() => { calls += 1 }
  })
  assert.equal(publishedNow, false)
  assert.equal(calls, 0)
})
test('Ошибка команды после принятия npm не приводит к повторной публикации', async() => {
  let reads = 0
  let publishes = 0
  assert.equal(await publishVerifiedPackage({
    manifest,
    currentSha: sha,
    lookup: async() => { reads += 1; return reads < 3 ? null : remote },
    publish: async() => { publishes += 1; return 1 },
    wait: async() => {},
    attempts: 3
  }), true)
  assert.equal(publishes, 1)
})
test('Неизвестный результат останавливается без повторной публикации', async() => {
  let publishes = 0
  await assert.rejects(publishVerifiedPackage({
    manifest,
    currentSha: sha,
    lookup: async() => null,
    publish: async() => { publishes += 1; return 0 },
    wait: async() => {},
    attempts: 2
  }), /could not be verified/)
  assert.equal(publishes, 1)
})
test('Существующая версия с другими байтами не перезаписывается', async() => {
  const conflict = { ...remote, dist: { integrity: 'different' } }
  assert.throws(() => checkRegistryVersion({ manifest, remote: conflict }), /different/)
  await assert.rejects(publishVerifiedPackage({
    manifest, currentSha: sha, lookup: async() => conflict, publish: async() => assert.fail('must not publish')
  }), /different/)
})
test('Только 404 реестра означает отсутствие версии', async() => {
  assert.equal(await readRegistryVersion({ manifest, fetcher: async() => ({ status: 404 }) }), null)
  await assert.rejects(readRegistryVersion({
    manifest, fetcher: async() => ({ status: 503, ok: false })
  }), /lookup failed/)
})

test('Annotated tag проверяется до исходного commit', async() => {
  const api = async({ route }) => (route.startsWith('/git/ref/')
    ? { object: { type: 'tag', sha: 'tag-sha' } } : { object: { type: 'commit', sha } })
  assert(await inspectTag({ manifest, api }))
})
test('Чужой tag не перезаписывается и не удаляется', async() => {
  await assert.rejects(recordRelease({ manifest,
    api: async({ method }) => {
      assert.equal(method, undefined)
      return { object: { type: 'commit', sha: 'other' } }
    } }), /another commit/)
})
test('Повтор записи уже существующего release ничего не меняет', async() => {
  const release = { tag_name: 'v1.2.3', draft: false, html_url: 'https://example.test/release' }
  const api = async({ route, method }) => {
    assert.equal(method, undefined)
    return route.startsWith('/git/') ? { object: { type: 'commit', sha } } : release
  }
  assert.equal(await recordRelease({ manifest, api }), release)
})
test('После сбоя записи release сохраняет tag и завершает повтор без удаления', async() => {
  let tagExists = false
  let releaseAttempts = 0
  const writes = []
  const api = async({ route, method, body }) => {
    if (method) writes.push([method, route])
    if (route.startsWith('/git/ref/tags/')) return tagExists ? { object: { type: 'commit', sha } } : null
    if (route === '/git/refs') { tagExists = true; return body }
    if (route.startsWith('/releases/tags/')) return null
    if (route === '/releases') releaseAttempts += 1
    if (route === '/releases' && releaseAttempts === 1) throw new Error('temporary recording failure')
    return { ...body, html_url: 'https://example.test/release' }
  }
  await assert.rejects(recordRelease({ manifest, api }), /temporary/)
  assert.equal(tagExists, true)
  assert.equal((await recordRelease({ manifest, api })).tag_name, 'v1.2.3')
  assert.deepEqual(writes, [['POST', '/git/refs'], ['POST', '/releases'], ['POST', '/releases']])
})

test('Старый запуск не публикует новую версию поверх более свежего master', async() => {
  await assert.rejects(publishVerifiedPackage({
    manifest,
    currentSha: 'd'.repeat(40),
    lookup: async() => null,
    publish: async() => assert.fail('stale run must not publish')
  }), /newer master/)
})
test('Старый запуск может восстановить запись уже опубликованных идентичных байтов', async() => {
  assert.equal(await publishVerifiedPackage({
    manifest,
    currentSha: 'd'.repeat(40),
    lookup: async() => remote,
    publish: async() => assert.fail('recovery must not republish')
  }), false)
})
