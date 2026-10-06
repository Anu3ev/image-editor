import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { appendFile, mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { REPOSITORY, SHA_PATTERN, validateArtifact } from './build-artifact.mjs'

const REGISTRY = 'https://registry.npmjs.org'
const sleep = (milliseconds) => new Promise((resolve) => { setTimeout(resolve, milliseconds) })

/** Accept only the successful master-push producer, never a PR or manual smoke run. */
export function selectBuildArtifact({ run, artifacts }) {
  assert.equal(run.repository?.full_name, REPOSITORY)
  assert.equal(run.head_repository?.full_name, REPOSITORY)
  assert.equal(run.path, '.github/workflows/deploy-demo.yml')
  assert.equal(run.event, 'push')
  assert.equal(run.head_branch, 'master')
  assert.equal(run.conclusion, 'success')
  assert(SHA_PATTERN.test(run.head_sha))
  const candidates = artifacts.flatMap((artifact) => {
    const match = artifact.name.match(/^package-(\d+)-(\d+)$/)
    if (!match || match[1] !== String(run.id)) return []
    const attempt = Number(match[2])
    if (artifact.expired || attempt < 1 || attempt > run.run_attempt) return []
    assert.equal(artifact.workflow_run?.id, run.id, 'Artifact belongs to another run')
    assert.equal(artifact.workflow_run?.head_sha, run.head_sha, 'Artifact belongs to another commit')
    return [{ id: artifact.id, attempt }]
  }).sort((a, b) => b.attempt - a.attempt)
  assert(candidates.length > 0, 'No retained package artifact; rerun Build and Deploy on the same commit')
  assert(candidates.length === 1 || candidates[0].attempt !== candidates[1].attempt, 'Ambiguous producer artifact')
  return { artifact_id: candidates[0].id, producer_attempt: candidates[0].attempt, sha: run.head_sha, run_id: run.id }
}

/** Read only the official registry; an outage is not evidence that a version is absent. */
export async function readRegistryVersion({ manifest, fetcher = fetch }) {
  const url = `${REGISTRY}/${encodeURIComponent(manifest.name)}/${encodeURIComponent(manifest.version)}`
  const response = await fetcher(url, {
    headers: { accept: 'application/json', 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(20_000)
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Registry lookup failed (${response.status}); no publication retry`)
  return response.json()
}

export function checkRegistryVersion({ remote, manifest }) {
  if (remote === null) return false
  assert(
    remote.name === manifest.name
    && remote.version === manifest.version
    && remote.dist?.integrity === manifest.integrity,
    'Version already exists with different identity or bytes; choose a new version, never overwrite or delete it'
  )
  return true
}

/** Publish at most once, including when the command fails after npm accepted the bytes. */
export async function publishVerifiedPackage({ manifest, currentSha, lookup, publish, wait = sleep, attempts = 12 }) {
  if (checkRegistryVersion({ remote: await lookup(), manifest })) return false
  assert.equal(currentSha, manifest.sha, 'A newer master exists; only an already published version may be recovered')
  const status = await publish()
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (checkRegistryVersion({ remote: await lookup(), manifest })) return true
    if (attempt + 1 < attempts) await wait(5_000)
  }
  throw new Error(`npm publish exited ${status}, but registry bytes could not be verified. `
    + 'Inspect npm before retrying; nothing was deleted.')
}

export function githubClient({ token, fetcher = fetch }) {
  return async({ route, method = 'GET', body, allowMissing = false }) => {
    const response = await fetcher(`https://api.github.com/repos/${REPOSITORY}${route}`, {
      method,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
        ...body ? { 'content-type': 'application/json' } : {}
      },
      ...body ? { body: JSON.stringify(body) } : {},
      signal: AbortSignal.timeout(20_000)
    })
    if (response.status === 404 && allowMissing) return null
    if (!response.ok) throw new Error(`GitHub ${method} ${route} failed (${response.status})`)
    return response.json()
  }
}

/** Lightweight and annotated tags must resolve to the validated source commit. */
export async function inspectTag({ manifest, api }) {
  const ref = await api({ route: `/git/ref/tags/v${manifest.version}`, allowMissing: true })
  if (ref === null) return null
  let { object } = ref
  for (let depth = 0; object?.type === 'tag' && depth < 8; depth += 1) {
    object = (await api({ route: `/git/tags/${object.sha}` })).object
  }
  assert(
    object?.type === 'commit' && object.sha === manifest.sha,
    'Tag points to another commit; nothing will be overwritten or deleted'
  )
  return ref
}

/** Idempotent recovery after npm succeeds but GitHub recording fails. */
export async function recordRelease({ manifest, api }) {
  const tag = `v${manifest.version}`
  if (await inspectTag({ manifest, api }) === null) {
    try {
      await api({ route: '/git/refs', method: 'POST', body: { ref: `refs/tags/${tag}`, sha: manifest.sha } })
    } catch (error) {
      if (await inspectTag({ manifest, api }) === null) throw error
    }
  }
  await inspectTag({ manifest, api })
  const existing = await api({ route: `/releases/tags/${tag}`, allowMissing: true })
  if (existing) {
    assert(existing.tag_name === tag && !existing.draft, 'Existing release needs manual review')
    return existing
  }
  return api({
    route: '/releases',
    method: 'POST',
    body: {
      tag_name: tag,
      target_commitish: manifest.sha,
      name: tag,
      draft: false,
      prerelease: manifest.version.includes('-'),
      generate_release_notes: true,
      body: [
        `Validated commit: ${manifest.sha}`, `Tarball SHA-256: ${manifest.sha256}`,
        `Build: https://github.com/${REPOSITORY}/actions/runs/${manifest.source.runId}`
      ].join('\n\n')
    }
  })
}

async function main() {
  assert.equal(process.env.GITHUB_REPOSITORY, REPOSITORY)
  assert.equal(process.env.GITHUB_REF, 'refs/heads/master')
  assert(['workflow_dispatch', 'workflow_run'].includes(process.env.GITHUB_EVENT_NAME))
  assert(/^\d+$/.test(process.env.BUILD_RUN_ID), 'Expected a numeric Build and Deploy run ID')
  const api = githubClient({ token: process.env.GH_TOKEN })
  const command = process.argv[2]
  if (command === 'select') {
    const run = await api({ route: `/actions/runs/${process.env.BUILD_RUN_ID}` })
    const artifacts = []
    for (let page = 1; ; page += 1) {
      const result = await api({ route: `/actions/runs/${run.id}/artifacts?per_page=100&page=${page}` })
      artifacts.push(...result.artifacts)
      if (result.artifacts.length < 100) break
    }
    const selected = selectBuildArtifact({ run, artifacts })
    const outputs = Object.entries(selected).map(([key, value]) => `${key}=${value}\n`).join('')
    await appendFile(process.env.GITHUB_OUTPUT, outputs)
    return
  }
  assert(['publish', 'record'].includes(command), 'Expected select, publish or record')
  const manifest = await validateArtifact({
    expectedSha: process.env.VALIDATED_SHA,
    runId: process.env.BUILD_RUN_ID,
    producerAttempt: process.env.PRODUCER_ATTEMPT
  })
  if (!manifest.source.versionChanged) {
    console.log('The package version did not change in this push; publication is unnecessary')
    return
  }
  await inspectTag({ manifest, api })
  const lookup = () => readRegistryVersion({ manifest })
  if (command === 'publish') {
    const npm = spawnSync('npm', ['--version'], { encoding: 'utf8' })
    const [major, minor, patch] = npm.stdout.trim().split('.').map(Number)
    const trustedPublishing = major > 11 || (major === 11 && (minor > 5 || (minor === 5 && patch >= 1)))
    assert(npm.status === 0 && trustedPublishing, 'Trusted publishing requires npm >= 11.5.1')
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'editor-publish-'))
    await publishVerifiedPackage({
      manifest,
      currentSha: (await api({ route: '/branches/master' })).commit.sha,
      lookup,
      publish: () => spawnSync('npm', [
        'publish', path.resolve('package-artifacts', manifest.filename),
        '--ignore-scripts', '--access', 'public', '--provenance', '--registry', REGISTRY
      ], { cwd, stdio: 'inherit' }).status ?? 1
    })
    await appendFile(process.env.GITHUB_OUTPUT, 'published=true\n')
  } else {
    const published = checkRegistryVersion({ remote: await lookup(), manifest })
    assert(published, 'Verify npm publication before recording a release')
    console.log((await recordRelease({ manifest, api })).html_url)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main()
