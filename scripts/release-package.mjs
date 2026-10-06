import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { SHA_PATTERN, validateArtifact } from './validate-artifact.mjs'
import { validateEvidence } from './validate-gate.mjs'

export const REPOSITORY = 'Anu3ev/image-editor'
const REGISTRY = 'https://registry.npmjs.org'
const API = 'https://api.github.com'
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

export function checkRegistryVersion({ remote, manifest }) {
  if (remote === null) return false
  if (remote.name !== manifest.name || remote.version !== manifest.version || remote.dist?.integrity !== manifest.integrity) {
    throw new Error(`Registry ${manifest.name}@${manifest.version} already exists with different identity or bytes; choose a new version. Never overwrite or delete it.`)
  }
  return true
}

export async function readRegistryVersion({ manifest, fetcher = fetch }) {
  const response = await fetcher(`${REGISTRY}/${encodeURIComponent(manifest.name)}/${encodeURIComponent(manifest.version)}`, {
    headers: { accept: 'application/json', 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(20_000)
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Registry lookup failed (${response.status}); publication was not retried`)
  return response.json()
}

export function githubClient({ token, fetcher = fetch }) {
  return async ({ route, method, body, allowMissing = false }) => {
    const response = await fetcher(`${API}/repos/${REPOSITORY}${route}`, {
      method: method ?? 'GET',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
        ...(body ? { 'content-type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20_000)
    })
    if (response.status === 404 && allowMissing) return null
    if (!response.ok) throw new Error(`GitHub ${method ?? 'GET'} ${route} failed (${response.status})`)
    return response.json()
  }
}

export async function inspectTag({ manifest, api }) {
  const tag = `v${manifest.version}`
  const ref = await api({ route: `/git/ref/tags/${encodeURIComponent(tag)}`, allowMissing: true })
  if (ref === null) return null
  let object = ref.object
  // Both lightweight and annotated tags must ultimately identify the tested commit.
  for (let depth = 0; object?.type === 'tag' && depth < 8; depth += 1) {
    object = (await api({ route: `/git/tags/${object.sha}` })).object
  }
  if (object?.type !== 'commit' || object.sha !== manifest.sha) {
    throw new Error(`Existing tag ${tag} does not point to validated commit ${manifest.sha}; no tag or release will be deleted`)
  }
  return ref
}

export async function publishVerifiedPackage({ manifest, lookup, publish, wait = sleep, attempts = 12 }) {
  if (checkRegistryVersion({ remote: await lookup(), manifest })) return { publishedNow: false, integrity: manifest.integrity }
  // Exactly one publication attempt. A failed command can still mean npm accepted it.
  const status = await publish()
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (checkRegistryVersion({ remote: await lookup(), manifest })) return { publishedNow: true, publishExitCode: status, integrity: manifest.integrity }
    if (attempt + 1 < attempts) await wait(5_000)
  }
  throw new Error(`npm publish exited ${status}, but registry identity could not be verified. Inspect npm before rerunning this workflow; no automatic retry was made.`)
}

export async function recordRelease({ manifest, api, validationUrl }) {
  // This function only runs after registry verification in main().
  const tag = `v${manifest.version}`
  if (await inspectTag({ manifest, api }) === null) {
    try {
      await api({ route: '/git/refs', method: 'POST', body: { ref: `refs/tags/${tag}`, sha: manifest.sha } })
    } catch (error) {
      // Another recovery run may have created the identical tag. Do not overwrite it.
      if (await inspectTag({ manifest, api }) === null) throw error
    }
  }
  await inspectTag({ manifest, api })
  const existing = await api({ route: `/releases/tags/${encodeURIComponent(tag)}`, allowMissing: true })
  if (existing) {
    if (existing.tag_name !== tag || existing.draft) throw new Error('Existing release is not the expected published release; review it manually')
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
      body: `Validated commit: ${manifest.sha}\n\nPackage: ${manifest.name}@${manifest.version}\n\nTarball SHA-256: ${manifest.sha256}\n\nRegistry integrity: ${manifest.integrity}\n\nValidation: ${validationUrl}`
    }
  })
}

async function main() {
  const [command] = process.argv.slice(2)
  const sha = process.env.VALIDATED_SHA
  if (process.env.GITHUB_REPOSITORY !== REPOSITORY || process.env.GITHUB_REF !== 'refs/heads/master' || process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || !SHA_PATTERN.test(sha)) {
    throw new Error('Release authority requires an explicit master dispatch in the trusted repository')
  }
  const manifest = await validateArtifact({ directory: 'package-artifacts', expectedSha: sha })
  const evidence = validateEvidence({
    evidence: JSON.parse(await readFile('validation-evidence/validation.json', 'utf8')),
    manifest,
    expectedSha: sha,
    full: true
  })
  const api = githubClient({ token: process.env.GH_TOKEN ?? '' })
  await inspectTag({ manifest, api })
  const validationUrl = `https://github.com/${REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  if (command === 'publish') {
    const npmVersion = spawnSync('npm', ['--version'], { encoding: 'utf8' })
    const [major, minor, patch] = npmVersion.stdout.trim().split('.').map(Number)
    if (npmVersion.status !== 0 || !(major > 11 || (major === 11 && (minor > 5 || (minor === 5 && patch >= 1))))) {
      throw new Error('npm trusted publishing requires npm >= 11.5.1')
    }
    const tarball = path.resolve('package-artifacts', manifest.filename)
    // Empty cwd prevents repository .npmrc files and package lifecycle hooks from running with OIDC authority.
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'image-editor-publish-'))
    const publication = await publishVerifiedPackage({
      manifest,
      lookup: () => readRegistryVersion({ manifest }),
      publish: () => spawnSync('npm', ['publish', tarball, '--ignore-scripts', '--access', 'public', '--provenance', '--registry', REGISTRY], { cwd, stdio: 'inherit' }).status ?? 1
    })
    await mkdir('release-evidence', { recursive: true })
    await writeFile('release-evidence/release.json', `${JSON.stringify({ ...evidence, publication, validationUrl }, null, 2)}\n`)
  } else if (command === 'record') {
    const released = JSON.parse(await readFile('release-evidence/release.json', 'utf8'))
    validateEvidence({ evidence: released, manifest, expectedSha: sha, full: true })
    if (!checkRegistryVersion({ remote: await readRegistryVersion({ manifest }), manifest }) || released.publication?.integrity !== manifest.integrity) {
      throw new Error('Do not create a tag or release before registry publication is verified')
    }
    const release = await recordRelease({ manifest, api, validationUrl })
    console.log(`Verified npm package and GitHub release: ${release.html_url}`)
  } else {
    throw new Error('Expected publish or record subcommand')
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main()
