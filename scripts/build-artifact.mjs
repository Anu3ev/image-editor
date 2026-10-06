import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPOSITORY = 'Anu3ev/image-editor'
export const PACKAGE_NAME = '@anu3ev/fabric-image-editor'
export const SHA_PATTERN = /^[a-f0-9]{40}$/
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

/** Bind bytes to the producing build, independently of a later consumer's attempt. */
export function validateManifest({ manifest, expectedSha, runId, producerAttempt }) {
  assert(SHA_PATTERN.test(expectedSha) && manifest.sha === expectedSha, 'Unexpected source commit')
  assert.equal(manifest.name, PACKAGE_NAME)
  assert(VERSION_PATTERN.test(manifest.version), 'Invalid package version')
  assert(/^[\w.-]+\.tgz$/.test(manifest.filename) && !manifest.filename.startsWith('.'), 'Unsafe tarball filename')
  assert(/^[a-f0-9]{64}$/.test(manifest.sha256), 'Invalid SHA-256')
  assert(/^sha512-[A-Za-z0-9+/]{86}==$/.test(manifest.integrity), 'Invalid npm integrity')
  if (runId !== undefined) {
    assert.equal(manifest.source?.runId, String(runId), 'Unexpected producing run')
    assert.equal(manifest.source?.attempt, Number(producerAttempt), 'Unexpected producing attempt')
    assert.equal(manifest.source?.repository, REPOSITORY)
    assert.equal(manifest.source?.event, 'push', 'Only master pushes can release')
    assert.equal(manifest.source?.ref, 'refs/heads/master')
    assert.equal(manifest.source?.browserSuite, 'full', 'Publication requires the full browser suite')
    assert(SHA_PATTERN.test(manifest.source?.previousSha), 'Missing push base commit')
    assert.equal(typeof manifest.source?.versionChanged, 'boolean')
  }
  return manifest
}

/** Verify the downloaded tarball instead of rebuilding or publishing the checkout. */
export async function validateArtifact({ directory = 'package-artifacts', ...identity }) {
  const manifest = validateManifest({
    manifest: JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8')),
    ...identity
  })
  const tarballs = (await readdir(directory)).filter((name) => name.endsWith('.tgz'))
  assert.deepEqual(tarballs, [manifest.filename], 'Expected exactly one validated tarball')
  const tarball = path.join(directory, manifest.filename)
  const bytes = await readFile(tarball)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sha256, 'Tarball SHA-256 changed')
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`
  assert.equal(integrity, manifest.integrity, 'Tarball integrity changed')
  const packaged = JSON.parse(execFileSync('tar', ['-xOf', tarball, 'package/package.json'], { encoding: 'utf8' }))
  assert.equal(packaged.name, manifest.name)
  assert.equal(packaged.version, manifest.version)
  const entries = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' }).trim().split('\n')
  assert(entries.includes('package/dist/main.js'), 'Library entrypoint is missing')
  assert(entries.some((entry) => /^package\/dist\/assets\/worker[^/]*\.js$/.test(entry)), 'Worker bundle is missing')
  return manifest
}

/** Pack only after validation; npm lifecycle scripts never run while packing. */
async function pack() {
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  if (process.env.GITHUB_SHA) assert.equal(sha, process.env.GITHUB_SHA)
  const source = {
    repository: process.env.GITHUB_REPOSITORY ?? REPOSITORY,
    runId: process.env.GITHUB_RUN_ID ?? 'local',
    attempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? 1),
    event: process.env.GITHUB_EVENT_NAME ?? 'local',
    ref: process.env.GITHUB_REF ?? '',
    browserSuite: process.env.BROWSER_SUITE ?? 'smoke',
    previousSha: null,
    versionChanged: false
  }
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))
  if (source.event === 'push' && source.ref === 'refs/heads/master') {
    const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'))
    assert(SHA_PATTERN.test(event.before) && !/^0+$/.test(event.before), 'Cannot establish the push base version')
    source.previousSha = event.before
    const previous = JSON.parse(execFileSync('git', ['show', `${event.before}:package.json`], { encoding: 'utf8' }))
    source.versionChanged = previous.version !== pkg.version
  }
  await mkdir('package-artifacts', { recursive: true })
  const [packed] = JSON.parse(execFileSync('npm', [
    'pack', '--ignore-scripts', '--json', '--pack-destination', 'package-artifacts'
  ], { encoding: 'utf8' }))
  const bytes = await readFile(path.join('package-artifacts', packed.filename))
  const manifest = {
    name: pkg.name,
    version: pkg.version,
    filename: packed.filename,
    sha,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
    source
  }
  await writeFile('package-artifacts/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`)
  await validateArtifact({ expectedSha: sha })
  console.log(`Packed ${manifest.name}@${manifest.version} from ${sha}`)
}

/** Check the optional package contract against exactly the already validated bytes. */
async function checkPackageContract() {
  const expectedSha = process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const manifest = await validateArtifact({ expectedSha })
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))
  const command = pkg.scripts?.['check:package']
  const hasPackageContract = pkg.types || pkg.exports?.['.']?.types
    || existsSync('fixtures/package-consumer/package.json')
  if (command === undefined && !hasPackageContract) {
    console.log('No installed-package contract is present; existing build artifact verified')
    return
  }
  assert.equal(
    command,
    'node scripts/check-package.mjs',
    'Package types/consumer require the exact built-tarball check:package command'
  )
  const tarball = path.resolve('package-artifacts', manifest.filename)
  const checked = spawnSync('npm', ['run', 'check:package', '--', '--tarball', tarball], { stdio: 'inherit' })
  if (checked.error) throw checked.error
  assert.equal(checked.status, 0, 'Installed-package contract failed; artifacts must not be uploaded')
  const after = await validateArtifact({ expectedSha })
  assert.deepEqual(after, manifest, 'Package check changed the validated artifact manifest')
  console.log(`Installed-package contract passed without changing ${manifest.sha256}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const command = process.argv[2]
  assert(['pack', 'check-package'].includes(command), 'Expected pack or check-package subcommand')
  if (command === 'pack') {
    await pack()
  } else {
    await checkPackageContract()
  }
}
