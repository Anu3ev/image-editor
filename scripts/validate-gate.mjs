import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SHA_PATTERN, validateArtifact, validateManifest } from './validate-artifact.mjs'

// Keep these mandatory job IDs in sync with validate.yml. Missing is never success.
export const REQUIRED_JOBS = ['lint', 'typecheck', 'unit', 'package', 'source-browser', 'demo']

export function assertRequiredJobs(needs) {
  for (const name of REQUIRED_JOBS) {
    if (!Object.hasOwn(needs, name) || needs[name]?.result !== 'success') {
      throw new Error(`Mandatory job ${name}: ${needs[name]?.result ?? 'missing'}`)
    }
  }
  return Object.fromEntries(REQUIRED_JOBS.map(name => [name, needs[name].result]))
}

export function assertBuildIdentity({ identity, expectedSha, expectedBuildId, expectedVersion }) {
  if (!SHA_PATTERN.test(expectedSha) || identity.sha !== expectedSha || identity.buildId !== expectedBuildId || identity.version !== expectedVersion) {
    throw new Error('Demo build identity does not match its validated SHA, run, and package version')
  }
}

export function validateEvidence({ evidence, manifest, expectedSha, full = false }) {
  validateManifest({ manifest, expectedSha })
  if (evidence.schemaVersion !== 1 || evidence.sha !== expectedSha || !['smoke', 'full'].includes(evidence.browserMode)) {
    throw new Error('Missing or invalid validation evidence')
  }
  if (full && evidence.browserMode !== 'full') throw new Error('Publication requires the full Chromium suite')
  assertRequiredJobs(Object.fromEntries(Object.entries(evidence.requiredResults ?? {}).map(([name, result]) => [name, { result }])))
  for (const key of ['name', 'version', 'filename', 'sha', 'sha256', 'integrity']) {
    if (evidence.package?.[key] !== manifest[key]) throw new Error(`Validation package ${key} differs from the artifact`)
  }
  if (!/^\d+-\d+$/.test(evidence.buildId)) throw new Error('Invalid workflow build identity')
  return evidence
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [command = 'jobs'] = process.argv.slice(2)
  const requiredResults = assertRequiredJobs(JSON.parse(process.env.NEEDS_JSON ?? '{}'))
  if (command === 'record') {
    const sha = process.env.VALIDATED_SHA
    const browserMode = process.env.BROWSER_MODE
    const buildId = process.env.BUILD_ID
    const manifest = await validateArtifact({ directory: 'package-artifacts', expectedSha: sha })
    const identity = JSON.parse(await readFile('validated-pages/build-info.json', 'utf8'))
    assertBuildIdentity({ identity, expectedSha: sha, expectedBuildId: buildId, expectedVersion: manifest.version })
    const evidence = { schemaVersion: 1, sha, browserMode, buildId, requiredResults, package: manifest }
    validateEvidence({ evidence, manifest, expectedSha: sha })
    await mkdir('validation-evidence', { recursive: true })
    await writeFile('validation-evidence/validation.json', `${JSON.stringify(evidence, null, 2)}\n`)
  } else if (command !== 'jobs') {
    throw new Error(`Unknown gate command: ${command}`)
  }
  console.log('Every mandatory validation job succeeded')
}
