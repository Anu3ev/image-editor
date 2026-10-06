import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fixtureManifest, writeArtifact } from './test-support/artifact.mjs'
import { githubClient } from './release-package.mjs'

const entrypoint = path.resolve('scripts/release-package.mjs')
const apiURL = `https://api.github.com/repos/${fixtureManifest.source.repository}`
const registryURL = `https://registry.npmjs.org/${encodeURIComponent(fixtureManifest.name)}/${fixtureManifest.version}`
// The real CLI runs in a child process. Every fetch is mocked and unknown requests fail closed.
const networkStub = `import { appendFileSync, readFileSync } from 'node:fs'
const routes = JSON.parse(readFileSync(process.env.MOCK_ROUTES))
globalThis.fetch = async (url, options = {}) => {
  const key = (options.method ?? 'GET') + ' ' + url
  appendFileSync(process.env.MOCK_REQUESTS, key + '\\n')
  if (!Object.hasOwn(routes, key)) throw new Error('Unmocked network request blocked: ' + key)
  const response = routes[key]
  return new Response(JSON.stringify(response.body), { status: response.status ?? 200 })
}
`

/** Exercise dispatch and environment guards without network or npm publication authority. */
async function runCLI({ command, routesFor = () => ({}), manifest = fixtureManifest, environment = {} }) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'editor-release-cli-'))
  try {
    const packed = await writeArtifact(path.join(directory, 'package-artifacts'), manifest)
    await writeFile(path.join(directory, 'routes.json'), JSON.stringify(routesFor(packed)))
    await writeFile(path.join(directory, 'requests.log'), '')
    await writeFile(path.join(directory, 'outputs'), '')
    await writeFile(path.join(directory, 'network.mjs'), networkStub)
    await mkdir(path.join(directory, 'bin'))
    const npmBlocked = '#!/bin/sh\necho "Unexpected npm invocation blocked" >&2\nexit 97\n'
    await writeFile(path.join(directory, 'bin/npm'), npmBlocked, { mode: 0o755 })
    const result = spawnSync(process.execPath, ['--import', path.join(directory, 'network.mjs'), entrypoint, command], {
      cwd: directory,
      encoding: 'utf8',
      timeout: 10000,
      env: {
        ...process.env,
        PATH: `${path.join(directory, 'bin')}:${process.env.PATH}`,
        GITHUB_REPOSITORY: manifest.source.repository,
        GITHUB_REF: 'refs/heads/master',
        GITHUB_EVENT_NAME: 'workflow_dispatch',
        BUILD_RUN_ID: manifest.source.runId,
        PRODUCER_ATTEMPT: String(manifest.source.attempt),
        VALIDATED_SHA: manifest.sha,
        GH_TOKEN: 'local-test-only',
        GITHUB_OUTPUT: path.join(directory, 'outputs'),
        MOCK_ROUTES: path.join(directory, 'routes.json'),
        MOCK_REQUESTS: path.join(directory, 'requests.log'),
        ...environment
      }
    })
    return {
      ...result,
      outputs: await readFile(path.join(directory, 'outputs'), 'utf8'),
      requests: await readFile(path.join(directory, 'requests.log'), 'utf8')
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('CLI выбирает неизменяемый артефакт предыдущего успешного producer attempt', async() => {
  const result = await runCLI({ command: 'select',
    routesFor: (manifest) => ({
      [`GET ${apiURL}/actions/runs/100`]: { body: {
        id: 100,
        run_attempt: 2,
        path: '.github/workflows/deploy-demo.yml',
        event: 'push',
        head_branch: 'master',
        head_sha: manifest.sha,
        conclusion: 'success',
        repository: { full_name: manifest.source.repository },
        head_repository: { full_name: manifest.source.repository }
      } },
      [`GET ${apiURL}/actions/runs/100/artifacts?per_page=100&page=1`]: { body: { artifacts: [{
        id: 701, name: 'package-100-1', expired: false, workflow_run: { id: 100, head_sha: manifest.sha }
      }] } }
    }) })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.outputs, /artifact_id=701\nproducer_attempt=1\n/)
})
test('CLI завершает запись существующей публикации без повторного npm publish', async() => {
  const result = await runCLI({ command: 'record',
    routesFor: (manifest) => ({
      [`GET ${apiURL}/git/ref/tags/v1.2.3`]: { body: { object: { type: 'commit', sha: manifest.sha } } },
      [`GET ${registryURL}`]: { body: {
        name: manifest.name, version: manifest.version, dist: { integrity: manifest.integrity }
      } },
      [`GET ${apiURL}/releases/tags/v1.2.3`]: { body: {
        tag_name: 'v1.2.3', draft: false, html_url: 'https://example.test/release'
      } }
    }) })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /https:\/\/example.test\/release/)
  assert(result.requests.trim().split('\n').every((request) => request.startsWith('GET ')))
})
test('CLI без изменения версии не обращается к registry или GitHub', async() => {
  const result = await runCLI({
    command: 'record', manifest: { ...fixtureManifest, source: { ...fixtureManifest.source, versionChanged: false } }
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.requests, '')
})
test('CLI отклоняет чужую ветку до любого запроса', async() => {
  const result = await runCLI({ command: 'select', environment: { GITHUB_REF: 'refs/heads/feature' } })
  assert.equal(result.status, 1)
  assert.equal(result.requests, '')
})
test('GitHub client сохраняет метод, токен и JSON, различает 404 и ошибки сервиса', async() => {
  const requests = []
  const client = githubClient({ token: 'test-token',
    fetcher: async(url, options) => {
      requests.push({ url, options })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    } })
  const result = await client({ route: '/git/refs', method: 'POST', body: { ref: 'refs/tags/v1.2.3' } })
  assert.deepEqual(result, { ok: true })
  assert.equal(requests[0].options.method, 'POST')
  assert.equal(requests[0].options.headers.authorization, 'Bearer test-token')
  assert.deepEqual(JSON.parse(requests[0].options.body), { ref: 'refs/tags/v1.2.3' })
  const missing = githubClient({ token: '', fetcher: async() => new Response('', { status: 404 }) })
  assert.equal(await missing({ route: '/missing', allowMissing: true }), null)
  await assert.rejects(missing({ route: '/missing' }), /failed \(404\)/)
  const unavailable = githubClient({ token: '', fetcher: async() => new Response('', { status: 503 }) })
  await assert.rejects(unavailable({ route: '/unavailable', allowMissing: true }), /failed \(503\)/)
})
